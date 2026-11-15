// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title CrossVMescrowLive
/// @notice Live variant of CrossVMescrow for QoreChain testnet.
///         Difference from contracts/CrossVMescrow.sol, stated plainly:
///         the original contract keys its approved Native targets by
///         EVM address, but the real allowlisted Native contracts are
///         32 byte CosmWasm addresses, for example
///         qor14hj2tavq8fpesdwxxcu44rty3hh90vhujrvcmstl4zr3txmfvw9s93uuqt.
///         A 32 byte address has no 20 byte EVM form, so the original
///         contract cannot name a real allowlisted target at all. This
///         variant keys the allowlist by the bech32 string instead, and
///         lockPayment takes only that string. The bridge itself still
///         enforces its own allowlist: the precompile refuses a target
///         that is not on it, so the whole lock reverts.
///         The allowlisted targets, read live Nov 15, are:
///         qor14hj2tavq8fpesdwxxcu44rty3hh90vhujrvcmstl4zr3txmfvw9s93uuqt,
///         code 1, cw20-base, token WDT, 6 decimals, supply 1000.
///         qor1ufs3tlq4umljk0qfe8k5ya0x6hpavn897u2cnf9k0en9jr7qarqqmjalsd,
///         code 5, aegis-flight tournament.
///         qor1nc5tatafv6eyq7llkr2gv50ff9e22mnf70qgjlv737ktmt4eswrqfye7zd,
///         code 6, aegis-flight tournament.
///         No cw20 code 859 instance is allowlisted. A live call to one
///         will be refused by the bridge. The honest live payload for
///         the WDT cw20 contract is a cw20 execute message, for example
///         increase_allowance by 0, not register_vesting, because no
///         allowlisted contract accepts a register_vesting message.
///         The vesting schedule on this contract still vests on EVM.
contract CrossVMescrowLive {
    address constant CROSSVM_PRECOMPILE = 0x0000000000000000000000000000000000000901;
    uint8 constant TARGET_NATIVE_VM = 1;
    uint8 constant TARGET_EVM_VM = 0;

    address public owner;
    uint256 public nextScheduleId;
    mapping(string => bool) public approvedNativeTargets;

    struct Schedule {
        address payer;
        address beneficiary;
        string nativeBeneficiary;
        string nativeTarget;
        uint256 total;
        uint256 cliffSeconds;
        uint256 durationSeconds;
        uint256 start;
        uint256 released;
        bool exists;
    }

    mapping(uint256 => Schedule) public schedules;

    event Locked(uint256 indexed id, address indexed payer, address indexed beneficiary, uint256 total, string nativeTarget);
    event CrossVMCalled(uint256 indexed id, string nativeTarget, bytes payload, bytes response);
    event Released(uint256 indexed id, address indexed beneficiary, uint256 amount);

    error NotOwner();
    error NotApprovedTarget();
    error BadSchedule();
    error NothingVested();
    error CrossVMFailed();
    error EmptyCrossVMReply();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(string[] memory initialTargets) {
        owner = msg.sender;
        for (uint256 i = 0; i < initialTargets.length; i = i + 1) {
            approvedNativeTargets[initialTargets[i]] = true;
        }
    }

    function setApprovedTarget(string calldata target, bool approved) external onlyOwner {
        approvedNativeTargets[target] = approved;
    }

    function buildCalldata(string calldata targetContract, bytes calldata payload) public pure returns (bytes memory) {
        return abi.encodeWithSignature(
            "executeCrossVMCall(uint8,string,bytes)",
            TARGET_NATIVE_VM,
            targetContract,
            payload
        );
    }

    function lockPayment(
        address beneficiary,
        string calldata nativeBeneficiary,
        string calldata nativeTargetBech32,
        bytes calldata nativePayload,
        uint256 cliffSeconds,
        uint256 durationSeconds
    ) external payable returns (uint256 id) {
        if (!approvedNativeTargets[nativeTargetBech32]) revert NotApprovedTarget();
        if (beneficiary == address(0) || msg.value == 0 || durationSeconds == 0) revert BadSchedule();
        if (bytes(nativeBeneficiary).length == 0 || bytes(nativeTargetBech32).length == 0) revert BadSchedule();
        if (nativePayload.length == 0) revert BadSchedule();

        id = nextScheduleId;
        nextScheduleId = nextScheduleId + 1;
        schedules[id] = Schedule({
            payer: msg.sender,
            beneficiary: beneficiary,
            nativeBeneficiary: nativeBeneficiary,
            nativeTarget: nativeTargetBech32,
            total: msg.value,
            cliffSeconds: cliffSeconds,
            durationSeconds: durationSeconds,
            start: block.timestamp,
            released: 0,
            exists: true
        });

        bytes memory data = buildCalldata(nativeTargetBech32, nativePayload);
        (bool ok, bytes memory ret) = CROSSVM_PRECOMPILE.call(data);
        if (!ok) revert CrossVMFailed();
        if (ret.length == 0) revert EmptyCrossVMReply();
        emit CrossVMCalled(id, nativeTargetBech32, nativePayload, ret);
        emit Locked(id, msg.sender, beneficiary, msg.value, nativeTargetBech32);
    }

    function releasable(uint256 id, uint256 atTime) public view returns (uint256) {
        Schedule storage s = schedules[id];
        if (!s.exists) return 0;
        uint256 cliffEnd = s.start + s.cliffSeconds;
        if (atTime < cliffEnd) return 0;
        uint256 vestEnd = cliffEnd + s.durationSeconds;
        if (atTime >= vestEnd) return s.total - s.released;
        uint256 elapsed = atTime - cliffEnd;
        uint256 vested = (s.total * elapsed) / s.durationSeconds;
        if (vested <= s.released) return 0;
        return vested - s.released;
    }

    function release(uint256 id) external returns (uint256 amount) {
        Schedule storage s = schedules[id];
        if (!s.exists) revert BadSchedule();
        amount = releasable(id, block.timestamp);
        if (amount == 0) revert NothingVested();
        s.released = s.released + amount;
        (bool sent, ) = s.beneficiary.call{value: amount}("");
        require(sent, "payment transfer failed");
        emit Released(id, s.beneficiary, amount);
    }

    function targetNativeVm() external pure returns (uint8) {
        return TARGET_NATIVE_VM;
    }

    function targetEvmVm() external pure returns (uint8) {
        return TARGET_EVM_VM;
    }

    function crossVMPrecompile() external pure returns (address) {
        return CROSSVM_PRECOMPILE;
    }
}
