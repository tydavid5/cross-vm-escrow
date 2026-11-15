export const CROSSVM_PRECOMPILE = "0x0000000000000000000000000000000000000901";
export const CROSSVM_SELECTOR = "0x3c11078c";
export const TARGET_NATIVE_VM = 1;
export const TARGET_EVM_VM = 0;
export const EVM_CHAIN_ID = 9800;
export const NATIVE_CHAIN_ID = "qorechain-diana";
export const REST_URL = "https://api-testnet.qore.host";
export const EVM_RPC_URL = "https://evm-testnet.qore.host";
export const FAUCET_URL = "https://dashboard.qorechain.io/faucet";
export const SDK_VERSION = "0.14.0";
export const CROSSVM_TYPE_URL = "/qorechain.crossvm.v1.MsgCrossVMCall";
export const BRIDGE_GAS_BASE = 50000;

export const BRIDGE_ALLOWED_TARGETS = [
  { address: "qor14hj2tavq8fpesdwxxcu44rty3hh90vhujrvcmstl4zr3txmfvw9s93uuqt", codeId: 1, label: "wdt-test" },
  { address: "qor1ufs3tlq4umljk0qfe8k5ya0x6hpavn897u2cnf9k0en9jr7qarqqmjalsd", codeId: 5, label: "aegis-flight-diana-v1" },
  { address: "qor1nc5tatafv6eyq7llkr2gv50ff9e22mnf70qgjlv737ktmt4eswrqfye7zd", codeId: 6, label: "aegis-flight-diana-v1" }
];

export const REVIEWED_NATIVE_CODES = [
  { codeId: 859, kind: "cw20-base", note: "token" },
  { codeId: 860, kind: "cw721-base", note: "NFT collection" },
  { codeId: 861, kind: "cw4-group", note: "group" },
  { codeId: 862, kind: "cw3-fixed-multisig", note: "multisig, no instance found on 2026-11-14" },
  { codeId: 863, kind: "counter", note: "small counter contract" }
];

export const CW20_CODE_ID = 859;
export const CW20_INSTANCES = [
  "qor1gs8mnq0mzulqu602n84yqu5tyqkrusm3l8a3j4rdtnv2fqhjkzeq3pytr0",
  "qor12jvcqns55ty40es346clsaq9cttmjywau395tgtgcsz4xmepg9tq8l50dl",
  "qor1vm3vs0hr30e95eph75ql6yc9m5ads22ext527l6a6rc4unn8mftqldfssp",
  "qor148q3nh7r3sl7cjz7gygeqaw8rf6xld9m70knqc6pqzdkr6dtxsls8cd98x",
  "qor1jk7nmwdjeaxf20uqf02qjzw83wdx47x5ntdzf3nf53yqhdmh6jhq99qv6y",
  "qor1fj8pwvlxnf52n4ae62fqh260q5wptyplt89rayawstx48nnf79kqaq2eeh",
  "qor1yez5xd0n5mk74lmdkfj46030l5awlcrnvrz544tcrqcetn5yqmuqhxf6xr"
];

export function isBridgeAllowlisted(address) {
  return BRIDGE_ALLOWED_TARGETS.some(function (t) { return t.address === address; });
}

export function isCw20Instance(address) {
  return CW20_INSTANCES.includes(address);
}

export function buildVestingRegistrationPayload(nativeBeneficiary, total, cliffSeconds, durationSeconds) {
  if (!nativeBeneficiary || !nativeBeneficiary.startsWith("qor1")) {
    throw new Error("Native beneficiary must be a qor1 address");
  }
  if (!(total > 0)) throw new Error("Total must be above zero");
  if (cliffSeconds < 0 || durationSeconds <= 0) throw new Error("Cliff must be zero or more and duration must be above zero");
  return JSON.stringify({
    register_vesting: {
      beneficiary: nativeBeneficiary,
      total: String(total),
      cliff_seconds: cliffSeconds,
      duration_seconds: durationSeconds
    }
  });
}

export function buildCw20TransferPayload(recipient, amount) {
  if (!recipient || !recipient.startsWith("qor1")) {
    throw new Error("Recipient must be a qor1 address");
  }
  if (!(amount > 0)) throw new Error("Amount must be above zero");
  return JSON.stringify({ transfer: { recipient: recipient, amount: String(amount) } });
}

export function buildCounterPayload() {
  return JSON.stringify({ increment: {} });
}

function padRight(bytes, size) {
  const out = new Uint8Array(size);
  out.set(bytes.subarray(0, size));
  return out;
}

function uint256Bytes(value) {
  const out = new Uint8Array(32);
  let v = BigInt(value);
  for (let i = 31; i >= 0; i = i - 1) {
    out[i] = Number(v & 255n);
    v = v >> 8n;
  }
  return out;
}

function concatBytes(parts) {
  let total = 0;
  for (const p of parts) total = total + p.length;
  const out = new Uint8Array(total);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at = at + p.length;
  }
  return out;
}

export function bytesToHex(bytes) {
  return "0x" + Array.from(bytes).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
}

export function encodeCrossVMCalldata(targetContract, payload) {
  const payloadBytes = typeof payload === "string" ? new TextEncoder().encode(payload) : payload;
  const targetBytes = new TextEncoder().encode(targetContract);
  const stringHead = 96;
  const stringDataLen = Math.ceil(targetBytes.length / 32) * 32;
  const bytesHead = stringHead + 32 + stringDataLen;
  const selector = new Uint8Array([0x3c, 0x11, 0x07, 0x8c]);
  const parts = [
    selector,
    uint256Bytes(TARGET_NATIVE_VM),
    uint256Bytes(stringHead),
    uint256Bytes(bytesHead),
    uint256Bytes(targetBytes.length),
    padRight(targetBytes, stringDataLen),
    uint256Bytes(payloadBytes.length),
    padRight(payloadBytes, Math.ceil(payloadBytes.length / 32) * 32)
  ];
  return bytesToHex(concatBytes(parts));
}

export function buildCrossVMCall(targetContract, payload, kind) {
  if (!targetContract || !targetContract.startsWith("qor1")) {
    throw new Error("Target contract must be a qor1 Native address");
  }
  const payloadJson = typeof payload === "string" ? payload : JSON.stringify(payload);
  if (!payloadJson || payloadJson.length < 2) throw new Error("Payload must not be empty");
  const payloadBytes = new TextEncoder().encode(payloadJson);
  return {
    kind: kind || "vesting_registration",
    precompile: CROSSVM_PRECOMPILE,
    selector: CROSSVM_SELECTOR,
    targetVM: TARGET_NATIVE_VM,
    targetContract: targetContract,
    payloadJson: payloadJson,
    payloadHex: bytesToHex(payloadBytes),
    calldata: encodeCrossVMCalldata(targetContract, payloadBytes),
    atomic: true,
    note: "One EVM transaction. If the Native call fails, the whole transaction reverts, so lock and Native call land together or not at all."
  };
}

export function buildAtomicCallSpec(targetContract, payloadObject) {
  return [
    {
      sourceVm: "evm",
      targetVm: "cosmwasm",
      targetContract: targetContract,
      cosmwasm: payloadObject
    }
  ];
}

export async function sdkAtomicCall(txClient, targetContract, payloadObject) {
  const sdk = await import("@qorechain/sdk");
  if (!sdk.createCrossVMClient) throw new Error("SDK in use has no createCrossVMClient export");
  const xvm = sdk.createCrossVMClient(txClient);
  return xvm.callAtomic(buildAtomicCallSpec(targetContract, payloadObject));
}

export async function fetchLiveAllowlist(restBase) {
  const base = restBase || REST_URL;
  const res = await fetch(base + "/qorechain/crossvm/v1/params");
  if (!res.ok) throw new Error("Live crossvm params read failed with HTTP " + res.status);
  const data = await res.json();
  const raw = data.bridge_allowed_targets || data.params && data.params.bridge_allowed_targets || [];
  return raw.map(function (entry) { return String(entry).replace("cosmwasm:", ""); });
}

export function createSchedule(input) {
  if (!(input.total > 0)) throw new Error("Total must be above zero");
  if (input.durationSeconds <= 0) throw new Error("Duration must be above zero");
  if (input.cliffSeconds < 0) throw new Error("Cliff must be zero or more");
  if (!isBridgeAllowlisted(input.nativeTarget) && !isCw20Instance(input.nativeTarget)) {
    throw new Error("Native target is not in the known approved list");
  }
  return {
    id: input.id,
    payer: input.payer,
    beneficiary: input.beneficiary,
    nativeBeneficiary: input.nativeBeneficiary,
    nativeTarget: input.nativeTarget,
    total: input.total,
    cliffSeconds: input.cliffSeconds,
    durationSeconds: input.durationSeconds,
    start: input.start,
    released: 0,
    status: "locked",
    crossVM: input.crossVM || null
  };
}

export function releasableAmount(schedule, nowSeconds) {
  const cliffEnd = schedule.start + schedule.cliffSeconds;
  if (nowSeconds < cliffEnd) return 0;
  const vestEnd = cliffEnd + schedule.durationSeconds;
  if (nowSeconds >= vestEnd) return schedule.total - schedule.released;
  const elapsed = nowSeconds - cliffEnd;
  const vested = Math.floor((schedule.total * elapsed) / schedule.durationSeconds);
  return Math.max(0, vested - schedule.released);
}

export function releaseSchedule(schedule, nowSeconds) {
  const amount = releasableAmount(schedule, nowSeconds);
  if (amount <= 0) {
    throw new Error("Release blocked: nothing vested yet at this time");
  }
  const next = Object.assign({}, schedule, { released: schedule.released + amount });
  next.status = next.released >= next.total ? "fully_released" : "partially_released";
  return { schedule: next, amount: amount };
}
