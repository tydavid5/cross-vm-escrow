An EVM payment and Native vesting live in separate worlds.

## Live testnet status, Nov 15 2026

LIVE, complete. Contract CrossVMescrowLive 0x2aae26e2a1d8397ac9341e5a936af1ae340b0c2b, on testnet qorechain-diana, EVM chain 9800. Deploy tx 0x9cdb7e6877f8170314e323faf7b9c46eebed6b224c3221283fbbc1dfcd7b20c4, block 10107189, success, gas 1,746,226. Lock tx 0x15728accc8a06dcee8e03bf819814afdcdc48b43a9818675816fe49273ef1e8f, block 10107289, success, value 0.005 QOR, gas 1,131,482. Schedule 0: beneficiary coin 118, Native target allowlisted WDT cw20 qor14hj2tavq8fpesdwxxcu44rty3hh90vhujrvcmstl4zr3txmfvw9s93uuqt, amount 0.005 QOR, cliff 60 seconds, duration 3600 seconds, start 1794707804. The lock succeeding proves the live EVM to Native CrossVM call to the allowlisted WDT contract worked. Release: the first attempt at 02:57 WAT failed at gas estimate because it was before the 60 second cliff, releasable 0, NothingVested, no tx sent, no fee. Release done about 03:00 WAT, schedule 0 released 0.000208333333333333 QOR, contract balance 0.004791666666666667 QOR, coin 118 up 0.000208 QOR. The rest vests over the 3600 second duration, only the vested part releases at a time. The original CrossVMescrow contract was not deployed. Live demo: https://cross-vm-escrow.vercel.app

# Cross-VM Escrow

Cross-VM Escrow is project 5 of 5 for QoreChain Build Before Q-Day, solo, Advanced Cross-VM, testnet only. It locks a payment on EVM, calls an approved Native contract in the same atomic step, and releases the payment on a vesting schedule.

## How it works

1. A payer locks payment in the EVM escrow contract, contracts/CrossVMescrow.sol, with a beneficiary, a Native beneficiary, a cliff, and a duration.
2. In the same transaction, the escrow contract calls the CrossVM Bridge precompile at 0x0000000000000000000000000000000000000901, using executeCrossVMCall with targetVM 1 for QoreChain Native. The selector is 0x3c11078c. If the Native call fails, the whole transaction reverts, so the lock and the Native call land together or not at all.
3. The app also shows the SDK message path, createCrossVMClient and callAtomic from @qorechain/sdk 0.14.0, with targetVm cosmwasm, for a signed atomic call from a Native account. That path needs a hybrid ML-DSA-87 signature, SDK 0.9.0 or later, and a registered PQC key.
4. The vesting schedule vests linearly after the cliff. Release before the cliff is blocked. Release on schedule pays the vested amount to the EVM beneficiary.
5. Demo mode runs the whole flow locally with a simulated clock, and labels it demo. No chain transaction is sent in demo mode.

## What it does

1. Lock payment on EVM in demo mode.
2. Show the atomic call to the Native contract, with precompile address, targetVM 1, selector, payload JSON, and full calldata.
3. Show the vesting schedule, with total, released, cliff, duration, and start.
4. Show a release on schedule, with advance day controls and a jump to end of vesting control.
5. Read the live bridge allowlist from testnet, with a baked in fallback list from the last verified read.
6. Warn plainly when a chosen Native target is a live cw20 instance but is not on the bridge allowlist.

## How to run it

1. Install dependencies: npm install
2. Run tests: npm test
3. Build: npm run build
4. Run locally: npm run dev, then open http://localhost:5173
5. Preview the production build: npm run preview
6. Regenerate the featured image: npm run image

Node 20 or later is needed. No wallet is needed for demo mode. Live mode is done, see Live testnet status, Nov 15 2026 above. The ML-DSA-87 key is registered.

## QoreChain kits used

1. create-qorechain-dapp, CLI 0.14.0, fullstack-web template, TypeScript plus Vite plus React.
2. @qorechain/sdk 0.14.0, createClient, createCrossVMClient, callAtomic, connectTx with pqcKeypair.
3. CrossVM Bridge precompile 0x0000000000000000000000000000000000000901, executeCrossVMCall, targetVM 1.
4. x/crossvm module, MsgCrossVMCall, type URL /qorechain.crossvm.v1.MsgCrossVMCall, testnet only. MsgCrossVMCall is switched off on mainnet.
5. Docs used: docs.qorechain.io/sdk/quickstart, docs.qorechain.io/sdk/guides/cross-vm, docs.qorechain.io/developer-guide/cross-vm-interoperability, docs.qorechain.io/developer-guide/cosmwasm-development.

## Testnet contracts and addresses

Testnet: qorechain-diana. EVM chain id 9800. REST: https://api-testnet.qore.host. EVM RPC: https://evm-testnet.qore.host. Faucet: https://dashboard.qorechain.io/faucet, fest tokens fUSD, fETH and fBTC once every 24 hours.

EVM escrow contract address on testnet: 0x2aae26e2a1d8397ac9341e5a936af1ae340b0c2b, CrossVMescrowLive, see Live testnet status, Nov 15 2026 above. Payer and deployer wallet: qor1kkmn9z3es9p3heet7y5zcrcg57g9ljp8909r5u (Native) and 0xB5b7328A3981431BE72bF1282c0F08A7905fC827 (EVM form, same identity). Verified live Nov 15 with qore-cli on testnet qorechain-diana chain 9800: fresh account at first check, exists false, balances empty, 0 QOR, staked 0 QOR, ML-DSA-87 key not registered yet. Faucet claimed Nov 15 01:00 WAT: exists true, account number 15585, sequence 0, 100 QOR. Key registration completed Nov 15 01:13 WAT by Five in QoreX: ML-DSA-87 key registered true, sequence 2, balance 99.85 QOR (100 minus 0.15 in fees), possession proven true, created at height 10102839. The EVM window was opened on the coin 60 account, used 12 of 20 as of about 03:00 WAT, 8 left, expiry height 10111245. Live transaction hashes are in Live testnet status, Nov 15 2026 above. Do not invent one.

Bridge allowlist, read live 2026-11-14 at 22:29 UTC from GET /qorechain/crossvm/v1/params, enabled true, max_message_size 65536, max_queue_size 1000, queue_timeout_blocks 100:

1. qor14hj2tavq8fpesdwxxcu44rty3hh90vhujrvcmstl4zr3txmfvw9s93uuqt, code id 1, label wdt-test.
2. qor1ufs3tlq4umljk0qfe8k5ya0x6hpavn897u2cnf9k0en9jr7qarqqmjalsd, code id 5, label aegis-flight-diana-v1.
3. qor1nc5tatafv6eyq7llkr2gv50ff9e22mnf70qgjlv737ktmt4eswrqfye7zd, code id 6, label aegis-flight-diana-v1.

Reviewed Native code ids, read live from GET /cosmwasm/wasm/v1/code, docs order cw20-base, cw721-base, cw4-group, cw3-fixed-multisig, counter:

1. Code 859, cw20-base, token, instantiate permission Everybody, 7 live instances listed in src/lib/crossvm.mjs.
2. Code 860, cw721-base, NFT collection, 1 live instance.
3. Code 861, cw4-group, group, 1 live instance.
4. Code 862, cw3-fixed-multisig, multisig, no live instance found on 2026-11-14.
5. Code 863, counter, small counter contract, 7 live instances.

Important gap, read live and stated plainly: none of the 7 cw20 code 859 instances is on the bridge allowlist. The allowlist holds only the 3 addresses above, code ids 1, 5 and 6. A live precompile call to a cw20 instance will be refused as not allowlisted. A live cw20 vesting call needs a cw20 instance added to the bridge allowlist, or a vesting wrapper deployed at an allowlisted address. The public smart query endpoint returned 403 Forbidden for those contracts on 2026-11-14, so their exact contract type could not be confirmed by a smart query, only by code id, label, and docs order. The demo therefore uses the allowlisted target for the atomic call, with a vesting registration payload, a cw20 transfer payload, and a counter increment payload available. The live lock used the allowlisted WDT cw20 contract and succeeded, see Live testnet status, Nov 15 2026 above.

## Files

1. src/App.tsx, teal and charcoal dashboard UI in the Swiper fintech style, hero number with rolling motion, tabbed product tour (Bridge, Lock, Vesting, Status), wallet status cards, bridge diagram, lock form, schedule, release, live status, Baheet motion in app: rolling hero number, atomic card push in, confirmation pill sliding up, footer tagline word by word.
2. src/lib/crossvm.mjs, CrossVM client module, calldata encoder, vesting math, live allowlist read, SDK atomic call helper.
3. contracts/CrossVMescrow.sol, Solidity escrow, lockPayment, release, releasable, approved targets, precompile call.
4. test/run-tests.mjs, local test harness, run with npm test.
5. scripts/make_featured.py, featured image generator.
6. featured.png, 1600 by 900 featured image.
7. BUILD-REPORT.md, build checks, live reads, gaps, and what needs Five.
8. STORYBOARD.md, demo video storyboard, no video recorded.

## Style

Teal and charcoal, bridge diagram, two chains side by side with a clear atomic step in the middle. Framer Marketplace free template Swiper (fintech SaaS, $0) was used only as inspiration for layout, type, spacing and components: real dashboard layout, stat cards, tabbed product tour, light and dark surfaces. No paid template was bought, no template code or assets were copied. Baheet motion is applied in the app: one hero number per screen in teal, rolling with blur then snapping sharp, atomic card pushing in, confirmation pill sliding up on lock and release, footer tagline word by word. No other QoreChain project structure was reused.

## License

MIT, see LICENSE.
