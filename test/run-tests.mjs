import assert from "node:assert/strict";
import {
  BRIDGE_ALLOWED_TARGETS,
  CROSSVM_PRECOMPILE,
  CROSSVM_SELECTOR,
  CW20_INSTANCES,
  TARGET_NATIVE_VM,
  buildAtomicCallSpec,
  buildCounterPayload,
  buildCrossVMCall,
  buildCw20TransferPayload,
  buildVestingRegistrationPayload,
  createSchedule,
  encodeCrossVMCalldata,
  isBridgeAllowlisted,
  releasableAmount,
  releaseSchedule
} from "../src/lib/crossvm.mjs";

let passed = 0;
let total = 0;
function check(name, fn) {
  total = total + 1;
  try {
    fn();
    passed = passed + 1;
    console.log("PASS " + name);
  } catch (err) {
    console.log("FAIL " + name + ": " + err.message);
    process.exitCode = 1;
  }
}

const bridgeTarget = BRIDGE_ALLOWED_TARGETS[0].address;
const cw20Target = CW20_INSTANCES[0];
const beneficiary = "qor1testbeneficiary0000000000000000000000000";
const start = 1000000;

check("precompile address is 0x0000000000000000000000000000000000000901", function () {
  assert.equal(CROSSVM_PRECOMPILE, "0x0000000000000000000000000000000000000901");
});

check("targetVM for Native is 1", function () {
  assert.equal(TARGET_NATIVE_VM, 1);
});

check("bridge allowlist has 3 live targets read 2026-11-14", function () {
  assert.equal(BRIDGE_ALLOWED_TARGETS.length, 3);
  assert.equal(isBridgeAllowlisted(bridgeTarget), true);
  assert.equal(isBridgeAllowlisted(cw20Target), false);
});

check("cw20 code 859 has 7 live instances", function () {
  assert.equal(CW20_INSTANCES.length, 7);
});

check("lock payment creates a vesting schedule", function () {
  const payload = buildVestingRegistrationPayload(beneficiary, 1200, 86400, 864000);
  const call = buildCrossVMCall(bridgeTarget, payload, "vesting_registration");
  const s = createSchedule({
    id: 0, payer: "0x0000000000000000000000000000000000000001", beneficiary: "0x0000000000000000000000000000000000000002",
    nativeBeneficiary: beneficiary, nativeTarget: bridgeTarget, total: 1200, cliffSeconds: 86400, durationSeconds: 864000, start: start, crossVM: call
  });
  assert.equal(s.total, 1200);
  assert.equal(s.status, "locked");
  assert.equal(s.released, 0);
  assert.equal(s.crossVM.targetVM, 1);
});

check("release before schedule is blocked", function () {
  const s = createSchedule({
    id: 1, payer: "0x0000000000000000000000000000000000000001", beneficiary: "0x0000000000000000000000000000000000000002",
    nativeBeneficiary: beneficiary, nativeTarget: bridgeTarget, total: 1200, cliffSeconds: 86400, durationSeconds: 864000, start: start
  });
  assert.equal(releasableAmount(s, start + 100), 0);
  assert.throws(function () { releaseSchedule(s, start + 100); }, /nothing vested/i);
  assert.equal(releasableAmount(s, start + 86400 - 1), 0);
});

check("release on schedule passes in the local harness", function () {
  const s = createSchedule({
    id: 2, payer: "0x0000000000000000000000000000000000000001", beneficiary: "0x0000000000000000000000000000000000000002",
    nativeBeneficiary: beneficiary, nativeTarget: bridgeTarget, total: 1200, cliffSeconds: 86400, durationSeconds: 864000, start: start
  });
  assert.equal(releasableAmount(s, start + 86400 + 432000), 600);
  const mid = releaseSchedule(s, start + 86400 + 432000);
  assert.equal(mid.amount, 600);
  assert.equal(mid.schedule.released, 600);
  assert.equal(mid.schedule.status, "partially_released");
  const end = releaseSchedule(mid.schedule, start + 86400 + 864000);
  assert.equal(end.amount, 600);
  assert.equal(end.schedule.status, "fully_released");
});

check("CrossVM call payload is built with targetVM 1 and the correct precompile address", function () {
  const payload = buildCw20TransferPayload(beneficiary, 500);
  const call = buildCrossVMCall(bridgeTarget, payload, "cw20_transfer");
  assert.equal(call.targetVM, 1);
  assert.equal(call.precompile, CROSSVM_PRECOMPILE);
  assert.equal(call.selector, CROSSVM_SELECTOR);
  assert.equal(call.calldata.slice(0, 10), CROSSVM_SELECTOR);
  assert.ok(call.payloadJson.includes("transfer"));
  assert.ok(call.payloadJson.includes("500"));
});

check("calldata encodes targetVM 1 as a 32 byte word", function () {
  const calldata = encodeCrossVMCalldata(bridgeTarget, buildCounterPayload());
  assert.equal(calldata.slice(0, 10), "0x3c11078c");
  const word = calldata.slice(10, 74);
  assert.equal(word, "0000000000000000000000000000000000000000000000000000000000000001");
});

check("calldata contains the target address text and the payload JSON text", function () {
  const payload = buildCounterPayload();
  const calldata = encodeCrossVMCalldata(bridgeTarget, payload);
  const targetHex = Buffer.from(bridgeTarget, "utf8").toString("hex");
  const payloadHex = Buffer.from(payload, "utf8").toString("hex");
  assert.ok(calldata.includes(targetHex));
  assert.ok(calldata.includes(payloadHex));
});

check("atomic SDK spec uses targetVm cosmwasm and the Native target", function () {
  const spec = buildAtomicCallSpec(bridgeTarget, { increment: {} });
  assert.equal(spec.length, 1);
  assert.equal(spec[0].targetVm, "cosmwasm");
  assert.equal(spec[0].sourceVm, "evm");
  assert.equal(spec[0].targetContract, bridgeTarget);
  assert.deepEqual(spec[0].cosmwasm, { increment: {} });
});

check("unknown Native target is rejected when creating a schedule", function () {
  assert.throws(function () {
    createSchedule({
      id: 3, payer: "0x0000000000000000000000000000000000000001", beneficiary: "0x0000000000000000000000000000000000000002",
      nativeBeneficiary: beneficiary, nativeTarget: "qor1unknown0000000000000000000000000000000", total: 100, cliffSeconds: 0, durationSeconds: 100, start: start
    });
  }, /not in the known approved list/);
});

check("vesting registration payload carries beneficiary, total, cliff and duration", function () {
  const payload = buildVestingRegistrationPayload(beneficiary, 900, 3600, 7200);
  const parsed = JSON.parse(payload);
  assert.equal(parsed.register_vesting.beneficiary, beneficiary);
  assert.equal(parsed.register_vesting.total, "900");
  assert.equal(parsed.register_vesting.cliff_seconds, 3600);
  assert.equal(parsed.register_vesting.duration_seconds, 7200);
});

console.log("Tests: " + passed + " passed out of " + total);
if (passed !== total) process.exitCode = 1;
