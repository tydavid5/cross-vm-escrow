import { useEffect, useState } from "react";
import {
  BRIDGE_ALLOWED_TARGETS,
  CROSSVM_PRECOMPILE,
  CROSSVM_SELECTOR,
  CW20_CODE_ID,
  CW20_INSTANCES,
  EVM_CHAIN_ID,
  FAUCET_URL,
  NATIVE_CHAIN_ID,
  SDK_VERSION,
  TARGET_NATIVE_VM,
  buildCounterPayload,
  buildCrossVMCall,
  buildCw20TransferPayload,
  buildVestingRegistrationPayload,
  createSchedule,
  fetchLiveAllowlist,
  isBridgeAllowlisted,
  releasableAmount,
  releaseSchedule
} from "./lib/crossvm.mjs";

const teal = "#0f766e";
const tealDark = "#115e59";
const tealLight = "#5eead4";
const tealPale = "#ccfbf1";
const charcoal = "#1f2937";
const ink = "#111827";
const muted = "#4b5563";
const paper = "#f0fdfa";
const card = "#ffffff";
const amber = "#b45309";
const amberBg = "#fef3c7";
const line = "#99f6e4";

const motionCss = [
  "@keyframes rollIn {",
  "  0% { opacity: 0; filter: blur(8px); transform: translateY(14px) scale(0.96); }",
  "  60% { opacity: 1; filter: blur(2px); transform: translateY(2px) scale(1.01); }",
  "  100% { opacity: 1; filter: blur(0); transform: translateY(0) scale(1); }",
  "}",
  "@keyframes slideUp {",
  "  0% { opacity: 0; transform: translateY(18px); }",
  "  100% { opacity: 1; transform: translateY(0); }",
  "}",
  "@keyframes pushIn {",
  "  0% { opacity: 0; transform: translateX(28px) scale(0.96); }",
  "  100% { opacity: 1; transform: translateX(0) scale(1); }",
  "}",
  "@keyframes wordIn {",
  "  0% { opacity: 0; transform: translateY(10px); }",
  "  100% { opacity: 1; transform: translateY(0); }",
  "}",
  "@keyframes popIn {",
  "  0% { opacity: 0; transform: scale(0.96); }",
  "  100% { opacity: 1; transform: scale(1); }",
  "}"
].join("\n");

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  marginTop: 6,
  border: "1px solid #d1d5db",
  borderRadius: 8,
  fontSize: 14,
  boxSizing: "border-box" as const,
  background: "#fff"
};

const labelStyle = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: muted
};

const buttonStyle = {
  background: teal,
  color: "#fff",
  border: "none",
  padding: "12px 18px",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: 16,
  fontWeight: 700
};

const ghostButtonStyle = {
  padding: "8px 12px",
  cursor: "pointer",
  borderRadius: 8,
  border: "1px solid #d1d5db",
  background: "#fff",
  fontSize: 14
};

type Schedule = any;

function RollingNumber(props: { value: number }): JSX.Element {
  return (
    <span
      key={String(props.value)}
      style={{
        display: "inline-block",
        animation: "rollIn 0.5s cubic-bezier(0.2, 0.9, 0.3, 1.1) both"
      }}
    >
      {props.value.toLocaleString("en-US")}
    </span>
  );
}

export function App(): JSX.Element {
  const [mode, setMode] = useState("demo");
  const [tab, setTab] = useState("bridge");
  const [payer, setPayer] = useState("0xB5b7328A3981431BE72bF1282c0F08A7905fC827");
  const [beneficiary, setBeneficiary] = useState("0xB5b7328A3981431BE72bF1282c0F08A7905fC827");
  const [nativeBeneficiary, setNativeBeneficiary] = useState("qor1kkmn9z3es9p3heet7y5zcrcg57g9ljp8909r5u");
  const [amount, setAmount] = useState("1200");
  const [cliffDays, setCliffDays] = useState("1");
  const [durationDays, setDurationDays] = useState("10");
  const [target, setTarget] = useState(BRIDGE_ALLOWED_TARGETS[0].address);
  const [kind, setKind] = useState("vesting_registration");
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [simNow, setSimNow] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [pillKey, setPillKey] = useState(0);
  const [liveList, setLiveList] = useState<string[] | null>(null);
  const [liveError, setLiveError] = useState("");

  useEffect(function () {
    fetchLiveAllowlist()
      .then(function (list) { setLiveList(list); })
      .catch(function (e) { setLiveError(e instanceof Error ? e.message : String(e)); });
  }, []);

  const now = simNow === null ? Math.floor(Date.now() / 1000) : simNow;
  const releasable = schedule ? releasableAmount(schedule, now) : 0;
  const heroValue = schedule ? releasable : (Number(amount) || 0);
  const heroLabel = schedule ? "Releasable now, demo units" : "Amount to lock, demo units";
  const heroSub = schedule
    ? "Released " + schedule.released + " of " + schedule.total + ", status " + schedule.status
    : "Set the amount below, then lock it on the Lock tab";

  function payloadFor(): string {
    const total = Number(amount);
    const cliff = Number(cliffDays) * 86400;
    const duration = Number(durationDays) * 86400;
    if (kind === "cw20_transfer") return buildCw20TransferPayload(nativeBeneficiary, total);
    if (kind === "counter_increment") return buildCounterPayload();
    return buildVestingRegistrationPayload(nativeBeneficiary, total, cliff, duration);
  }

  function doLock(): void {
    setError("");
    setNote("");
    try {
      if (!payer.startsWith("0x") || payer.length < 10) throw new Error("Enter a payer EVM address starting 0x");
      if (!beneficiary.startsWith("0x") || beneficiary.length < 10) throw new Error("Enter a beneficiary EVM address starting 0x");
      if (!nativeBeneficiary.startsWith("qor1")) throw new Error("Enter a Native beneficiary address starting qor1");
      const total = Number(amount);
      if (!(total > 0)) throw new Error("Amount must be above zero");
      const payload = payloadFor();
      const call = buildCrossVMCall(target, payload, kind);
      const created = createSchedule({
        id: 0,
        payer: payer,
        beneficiary: beneficiary,
        nativeBeneficiary: nativeBeneficiary,
        nativeTarget: target,
        total: total,
        cliffSeconds: Number(cliffDays) * 86400,
        durationSeconds: Number(durationDays) * 86400,
        start: Math.floor(Date.now() / 1000),
        crossVM: call
      });
      setSchedule(created);
      setSimNow(created.start);
      setPillKey(function (k) { return k + 1; });
      if (mode === "demo") {
        setNote("Demo lock recorded locally. No chain transaction was sent. The atomic call below is the exact calldata the contract would send to the precompile.");
      } else {
        setNote("Live flow is complete on testnet. Contract CrossVMescrowLive 0x2aae26e2a1d8397ac9341e5a936af1ae340b0c2b is deployed, lock tx 0x15728accc8a06dcee8e03bf819814afdcdc48b43a9818675816fe49273ef1e8f sent 0.005 QOR, release done about 03:00 WAT Nov 15. This page still sends no transaction, demo locks stay local.");
      }
      setTab("vesting");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function doRelease(): void {
    setError("");
    if (!schedule) return;
    try {
      const result = releaseSchedule(schedule, now);
      setSchedule(result.schedule);
      setPillKey(function (k) { return k + 1; });
      setNote("Released " + result.amount + " in demo mode. Released total is now " + result.schedule.released + " of " + result.schedule.total + ".");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function advance(days: number): void {
    if (schedule) setSimNow(now + days * 86400);
  }

  const targetIsBridge = isBridgeAllowlisted(target);
  const targetIsCw20 = CW20_INSTANCES.includes(target);

  function tabButton(id: string, label: string): JSX.Element {
    const active = tab === id;
    return (
      <button
        key={id}
        onClick={function () { setTab(id); }}
        style={{
          padding: "10px 18px",
          borderRadius: 999,
          border: active ? "none" : "1px solid #d1d5db",
          background: active ? teal : "#fff",
          color: active ? "#fff" : ink,
          cursor: "pointer",
          fontSize: 14,
          fontWeight: 700
        }}
      >
        {label}
      </button>
    );
  }

  const taglineWords = ["Lock", "once.", "Call", "Native.", "Release", "on", "schedule."];

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", background: paper, color: ink, minHeight: "100vh", margin: 0 }}>
      <style>{motionCss}</style>
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 16px 48px" }}>
        <nav style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 0" }}>
          <span style={{ background: teal, color: "#fff", fontWeight: 800, fontSize: 15, padding: "8px 10px", borderRadius: 10, letterSpacing: 0.5 }}>XVM</span>
          <span style={{ fontWeight: 800, fontSize: 17 }}>Cross-VM Escrow</span>
          <span style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ background: charcoal, color: tealLight, padding: "6px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>QORECHAIN TESTNET ONLY</span>
            <span style={{ background: teal, color: "#fff", padding: "6px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>Mode: {mode === "demo" ? "Demo, no chain transaction" : "Live, verified on testnet Nov 15"}</span>
            <button onClick={function () { setMode(mode === "demo" ? "live" : "demo"); }} style={{ padding: "6px 10px", borderRadius: 999, border: "1px solid " + teal, background: "transparent", color: tealDark, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Switch to {mode === "demo" ? "live" : "demo"}</button>
          </span>
        </nav>

        <header style={{ background: charcoal, color: "#fff", borderRadius: 16, padding: "28px 28px 24px" }}>
          <h1 style={{ margin: "0 0 8px", fontSize: 36, lineHeight: 1.1 }}>An EVM payment and Native vesting live in separate worlds.</h1>
          <p style={{ margin: 0, color: "#d1d5db", fontSize: 16, maxWidth: 720 }}>This escrow locks on EVM, calls Native in the same atomic step, and releases on schedule.</p>
        </header>

        <section aria-label="Live testnet flow" style={{ background: "#ecfdf5", border: "1px solid " + teal, borderRadius: 16, padding: "18px 24px", marginTop: 16 }}>
          <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 800, letterSpacing: 1, color: tealDark }}>LIVE ON TESTNET, COMPLETE NOV 15</p>
          <p style={{ margin: "0 0 6px", fontSize: 14 }}>Contract CrossVMescrowLive <code>0x2aae26e2a1d8397ac9341e5a936af1ae340b0c2b</code>, deploy tx <code>0x9cdb7e6877f8170314e323faf7b9c46eebed6b224c3221283fbbc1dfcd7b20c4</code>, block 10107189.</p>
          <p style={{ margin: "0 0 6px", fontSize: 14 }}>Lock tx <code>0x15728accc8a06dcee8e03bf819814afdcdc48b43a9818675816fe49273ef1e8f</code>, block 10107289, value 0.005 QOR, schedule 0, beneficiary coin 118 EVM <code>0xB5b7328A3981431BE72bF1282c0F08A7905fC827</code>, Native target allowlisted WDT cw20 <code>qor14hj2tavq8fpesdwxxcu44rty3hh90vhujrvcmstl4zr3txmfvw9s93uuqt</code>, cliff 60 seconds, duration 3600 seconds, start 1794707804.</p>
          <p style={{ margin: 0, fontSize: 14 }}>Release done about 03:00 WAT Nov 15, 0.000208333333333333 QOR released, contract balance 0.004791666666666667 QOR, the rest still vesting over 3600 seconds. Testnet qorechain-diana, EVM chain 9800.</p>
        </section>

        <section aria-label="Dashboard" style={{ background: card, borderRadius: 16, padding: 24, marginTop: 16, border: "1px solid " + line, display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 24, animation: "popIn 0.4s ease-out both" }}>
          <div>
            <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, letterSpacing: 1, color: muted }}>{heroLabel.toUpperCase()}</p>
            <p style={{ margin: 0, fontSize: 64, lineHeight: 1, fontWeight: 800, color: teal }}>
              <RollingNumber value={heroValue} />
            </p>
            <p style={{ margin: "10px 0 0", color: muted, fontSize: 14 }}>{heroSub}</p>
            <p style={{ margin: "8px 0 0", fontSize: 13, color: muted }}>Demo mode, simulated clock. No live transaction is sent from this page. The live flow is complete on testnet, see the live panel above and the Status tab.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ background: paper, borderRadius: 12, padding: 14 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: muted }}>WALLET BALANCE</p>
              <p style={{ margin: "6px 0 0", fontSize: 22, fontWeight: 800, color: tealDark }}>70.770208 QOR</p>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: muted }}>Verified Nov 15 about 03:00 WAT, account 15585</p>
            </div>
            <div style={{ background: paper, borderRadius: 12, padding: 14 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: muted }}>ML-DSA-87 KEY</p>
              <p style={{ margin: "6px 0 0", fontSize: 22, fontWeight: 800, color: tealDark }}>Registered</p>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: muted }}>Possession proven, Nov 15</p>
            </div>
            <div style={{ background: paper, borderRadius: 12, padding: 14 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: muted }}>EVM WINDOW</p>
              <p style={{ margin: "6px 0 0", fontSize: 22, fontWeight: 800, color: tealDark }}>Opened</p>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: muted }}>Live deploy, lock and release done Nov 15</p>
            </div>
            <div style={{ background: paper, borderRadius: 12, padding: 14 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: muted }}>BRIDGE ALLOWLIST</p>
              <p style={{ margin: "6px 0 0", fontSize: 22, fontWeight: 800, color: tealDark }}>3 targets</p>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: muted }}>cw20 code 859, 0 allowlisted</p>
            </div>
          </div>
        </section>

        <div role="tablist" aria-label="Product tour" style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
          {tabButton("bridge", "1. Bridge")}
          {tabButton("lock", "2. Lock")}
          {tabButton("vesting", "3. Vesting")}
          {tabButton("status", "4. Status")}
        </div>

        {tab === "bridge" && (
          <section aria-label="Bridge diagram" style={{ display: "grid", gridTemplateColumns: "1fr 220px 1fr", gap: 12, marginTop: 16, animation: "popIn 0.35s ease-out both" }}>
            <div style={{ background: card, border: "2px solid " + teal, borderRadius: 12, padding: 20 }}>
              <h2 style={{ marginTop: 0, color: tealDark }}>EVM side</h2>
              <p>Chain id {EVM_CHAIN_ID}, qorechain-diana testnet</p>
              <p>Escrow contract locks payment in fUSD or fETH, records the vesting schedule, and pays the beneficiary only as it vests.</p>
              <p><strong>Step 1:</strong> lock payment</p>
              <p><strong>Step 3:</strong> release on schedule</p>
            </div>
            <div key={schedule ? "locked" : "idle"} style={{ background: teal, color: "#fff", borderRadius: 12, padding: 20, textAlign: "center", animation: schedule ? "pushIn 0.45s cubic-bezier(0.2, 0.9, 0.3, 1.2) both" : undefined }}>
              <h2 style={{ marginTop: 0 }}>Atomic step</h2>
              <p style={{ fontSize: 28, margin: "8px 0" }}>EVM &rarr; Native</p>
              <p>One transaction, or nothing lands.</p>
              <p>Precompile<br /><code style={{ fontSize: 11 }}>{CROSSVM_PRECOMPILE}</code></p>
              <p>targetVM {TARGET_NATIVE_VM} for Native<br />selector {CROSSVM_SELECTOR}</p>
            </div>
            <div style={{ background: charcoal, color: "#fff", borderRadius: 12, padding: 20 }}>
              <h2 style={{ marginTop: 0, color: tealLight }}>Native side</h2>
              <p>QoreChain Native, CosmWasm, chain {NATIVE_CHAIN_ID}</p>
              <p>Approved target receives the atomic call in the same transaction as the EVM lock. Vesting is registered with beneficiary, total, cliff and duration.</p>
              <p><strong>Step 2:</strong> atomic call to the approved Native contract</p>
            </div>
          </section>
        )}

        {tab === "lock" && (
          <section style={{ background: card, borderRadius: 12, padding: 24, marginTop: 16, border: "1px solid " + line, animation: "popIn 0.35s ease-out both" }}>
            <h2 style={{ marginTop: 0 }}>Lock a payment</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <label style={labelStyle}>Payer EVM address<br /><input value={payer} onChange={function (e) { setPayer(e.target.value); }} placeholder="0x..." style={inputStyle} /></label>
              <label style={labelStyle}>Beneficiary EVM address<br /><input value={beneficiary} onChange={function (e) { setBeneficiary(e.target.value); }} placeholder="0x..." style={inputStyle} /></label>
              <label style={labelStyle}>Native beneficiary (qor1)<br /><input value={nativeBeneficiary} onChange={function (e) { setNativeBeneficiary(e.target.value); }} placeholder="qor1..." style={inputStyle} /></label>
              <label style={labelStyle}>Amount, demo units<br /><input value={amount} onChange={function (e) { setAmount(e.target.value); }} inputMode="numeric" style={inputStyle} /></label>
              <label style={labelStyle}>Cliff, days<br /><input value={cliffDays} onChange={function (e) { setCliffDays(e.target.value); }} inputMode="numeric" style={inputStyle} /></label>
              <label style={labelStyle}>Duration after cliff, days<br /><input value={durationDays} onChange={function (e) { setDurationDays(e.target.value); }} inputMode="numeric" style={inputStyle} /></label>
              <label style={labelStyle}>Native target<br />
                <select value={target} onChange={function (e) { setTarget(e.target.value); }} style={inputStyle}>
                  {BRIDGE_ALLOWED_TARGETS.map(function (t: any) { return <option key={t.address} value={t.address}>Bridge allowlisted, code {t.codeId}, {t.label}</option>; })}
                  {CW20_INSTANCES.map(function (a: string, i: number) { return <option key={a} value={a}>cw20 code 859 instance {i + 1}, not bridge allowlisted</option>; })}
                </select>
              </label>
              <label style={labelStyle}>Native payload kind<br />
                <select value={kind} onChange={function (e) { setKind(e.target.value); }} style={inputStyle}>
                  <option value="vesting_registration">Vesting registration JSON</option>
                  <option value="cw20_transfer">cw20 transfer JSON</option>
                  <option value="counter_increment">Counter increment JSON</option>
                </select>
              </label>
            </div>
            <p style={{ color: targetIsBridge ? tealDark : amber, background: targetIsBridge ? "#ecfdf5" : amberBg, padding: "10px 12px", borderRadius: 8 }}>
              {targetIsBridge ? "This target is on the live bridge allowlist read 2026-11-14." : targetIsCw20 ? "This is a live cw20 instance, code 859, but it is NOT on the bridge allowlist, so a live precompile call to it will be refused as not allowlisted." : "Unknown target."}
            </p>
            <button onClick={doLock} style={buttonStyle}>Lock payment and build atomic call</button>
            {mode === "live" && <p style={{ color: tealDark }}>Live flow is complete on testnet. Contract CrossVMescrowLive 0x2aae26e2a1d8397ac9341e5a936af1ae340b0c2b, deploy tx 0x9cdb7e6877f8170314e323faf7b9c46eebed6b224c3221283fbbc1dfcd7b20c4, lock tx 0x15728accc8a06dcee8e03bf819814afdcdc48b43a9818675816fe49273ef1e8f. No wallet is connected in this build, and no transaction is sent from this page.</p>}
          </section>
        )}

        {tab === "vesting" && (
          <section style={{ background: card, borderRadius: 12, padding: 24, marginTop: 16, border: "1px solid " + line, animation: "popIn 0.35s ease-out both" }}>
            <h2 style={{ marginTop: 0 }}>Vesting schedule</h2>
            {schedule ? (
              <div>
                <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, letterSpacing: 1, color: muted }}>RELEASABLE NOW, DEMO UNITS</p>
                <p style={{ margin: 0, fontSize: 56, lineHeight: 1, fontWeight: 800, color: teal }}>
                  <RollingNumber value={releasable} />
                </p>
                <p style={{ marginTop: 12 }}>Total: <strong>{schedule.total}</strong> demo units, released: <strong>{schedule.released}</strong>, status: <strong>{schedule.status}</strong></p>
                <p>Cliff: {schedule.cliffSeconds / 86400} days, duration after cliff: {schedule.durationSeconds / 86400} days, start: {new Date(schedule.start * 1000).toISOString()}</p>
                <p>Simulated time: {new Date(now * 1000).toISOString()}</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={function () { advance(1); }} style={ghostButtonStyle}>Advance 1 day</button>
                  <button onClick={function () { advance(5); }} style={ghostButtonStyle}>Advance 5 days</button>
                  <button onClick={function () { if (schedule) setSimNow(schedule.start + schedule.cliffSeconds + schedule.durationSeconds); }} style={ghostButtonStyle}>Jump to end of vesting</button>
                  <button onClick={doRelease} style={{ background: tealDark, color: "#fff", border: "none", padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontWeight: 700 }}>Release vested amount</button>
                </div>
                <h3>Atomic call built for this lock</h3>
                <p>Precompile: <code>{schedule.crossVM.precompile}</code><br />targetVM: <code>{schedule.crossVM.targetVM}</code>, selector: <code>{schedule.crossVM.selector}</code><br />Target: <code>{schedule.crossVM.targetContract}</code></p>
                <p>Payload JSON:</p>
                <pre style={{ background: charcoal, color: "#a7f3d0", padding: 12, overflowX: "auto", borderRadius: 8 }}>{schedule.crossVM.payloadJson}</pre>
                <p>Calldata:</p>
                <pre style={{ background: "#f3f4f6", padding: 12, overflowX: "auto", borderRadius: 8, wordBreak: "break-all", whiteSpace: "pre-wrap" }}>{schedule.crossVM.calldata}</pre>
                <p>{schedule.crossVM.note}</p>
              </div>
            ) : (
              <div>
                <p>No lock yet. The vesting schedule appears here after a lock lands.</p>
                <button onClick={function () { setTab("lock"); }} style={buttonStyle}>Go to Lock</button>
              </div>
            )}
          </section>
        )}

        {tab === "status" && (
          <section style={{ background: card, borderRadius: 12, padding: 24, marginTop: 16, animation: "popIn 0.35s ease-out both" }}>
            <h2 style={{ marginTop: 0 }}>Live testnet status, wallet verified Nov 15</h2>
            <p>Network: {NATIVE_CHAIN_ID}, EVM chain id {EVM_CHAIN_ID}, SDK {SDK_VERSION}. Faucet: <a href={FAUCET_URL}>{FAUCET_URL}</a></p>
            <h3>Five QoreX wallet, read only</h3>
            <p>Native: <code>qor1kkmn9z3es9p3heet7y5zcrcg57g9ljp8909r5u</code><br />EVM: <code>0xB5b7328A3981431BE72bF1282c0F08A7905fC827</code></p>
            <p>Balance: <strong>70.770208 QOR</strong> as of Nov 15 about 03:00 WAT, account number 15585. Faucet claimed Nov 15 01:00 WAT at 100 QOR, 0.15 QOR paid in fees for key registration.</p>
            <p>ML-DSA-87 key: <strong>registered</strong>, possession proven true, created at height 10102839, Nov 15 01:13 WAT.</p>
            <p>EVM window: <strong>opened, live flow complete</strong>. Deploy, lock and release all done on testnet Nov 15.</p>
            <h3>Live testnet flow, Nov 15</h3>
            <p>Contract CrossVMescrowLive: <code>0x2aae26e2a1d8397ac9341e5a936af1ae340b0c2b</code><br />Deploy tx: <code>0x9cdb7e6877f8170314e323faf7b9c46eebed6b224c3221283fbbc1dfcd7b20c4</code>, block 10107189<br />Lock tx: <code>0x15728accc8a06dcee8e03bf819814afdcdc48b43a9818675816fe49273ef1e8f</code>, block 10107289, value 0.005 QOR</p>
            <p>Schedule 0: beneficiary coin 118 EVM <code>0xB5b7328A3981431BE72bF1282c0F08A7905fC827</code>, Native target allowlisted WDT cw20 <code>qor14hj2tavq8fpesdwxxcu44rty3hh90vhujrvcmstl4zr3txmfvw9s93uuqt</code>, cliff 60 seconds, duration 3600 seconds, start 1794707804. The lock succeeding proves the live EVM to Native CrossVM call to the allowlisted WDT contract worked.</p>
            <p>Release done about 03:00 WAT Nov 15: 0.000208333333333333 QOR released, contract balance 0.004791666666666667 QOR, the rest still vesting over 3600 seconds.</p>
            <h3>Bridge allowlist</h3>
            <p>Bridge allowlist, live read: {liveList ? liveList.join(", ") : "loading, fallback is the baked in list read 2026-11-14 at 22:29 UTC"}</p>
            {liveError && <p>Live allowlist read failed in the browser: {liveError}. The baked in list above is the last verified read.</p>}
            <p>cw20 code {CW20_CODE_ID} has 7 live instances, but none is on the bridge allowlist. The live lock used the allowlisted WDT cw20 contract and succeeded, so no new allowlist step was needed for this flow.</p>
            <p>Contract in this repo: contracts/CrossVMescrow.sol, live contract deployed on testnet is contracts/CrossVMescrowLive.sol at 0x2aae26e2a1d8397ac9341e5a936af1ae340b0c2b. Live transaction hashes are in the live panel above.</p>
          </section>
        )}

        {note && (
          <div key={pillKey} style={{ position: "sticky", bottom: 16, marginTop: 16, animation: "slideUp 0.4s cubic-bezier(0.2, 0.9, 0.3, 1.2) both" }}>
            <p style={{ background: tealDark, color: "#fff", border: "1px solid " + tealLight, padding: "14px 16px", borderRadius: 12, margin: 0, fontWeight: 600, boxShadow: "0 8px 24px rgba(17, 94, 89, 0.35)" }}>
              <span style={{ color: tealLight, marginRight: 8 }}>&#10003;</span>{note}
            </p>
          </div>
        )}
        {error && <p role="alert" style={{ background: "#fef2f2", border: "1px solid #fca5a5", padding: 12, borderRadius: 8 }}>{error}</p>}

        <footer style={{ background: charcoal, color: "#fff", borderRadius: 16, padding: "32px 28px", marginTop: 24, textAlign: "center" }}>
          <p style={{ margin: 0 }}>
            <span style={{ background: teal, color: "#fff", fontWeight: 800, fontSize: 15, padding: "8px 10px", borderRadius: 10, letterSpacing: 0.5 }}>XVM</span>
            <span style={{ fontWeight: 800, fontSize: 28, marginLeft: 12 }}>Cross-VM Escrow</span>
          </p>
          <p style={{ margin: "16px 0 0", fontSize: 18, color: "#d1d5db" }}>
            {taglineWords.map(function (w, i) {
              return (
                <span key={w + i} style={{ display: "inline-block", animation: "wordIn 0.4s ease-out both", animationDelay: (0.2 + i * 0.35) + "s", marginRight: 6 }}>
                  {w}
                </span>
              );
            })}
          </p>
          <p style={{ margin: "16px 0 0", fontSize: 13, color: "#9ca3af" }}>Demo mode, simulated clock. No live transaction is sent from this page. Testnet only.</p>
        </footer>
      </div>
    </main>
  );
}
