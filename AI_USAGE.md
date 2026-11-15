# AI Usage, Cross-VM Escrow

## Agent used

Muse, called Little 5, Meta's personal AI agent. It worked from the brief and concept pick of the human builder, Five (Taiwo John), in a chat session on Nov 14 to 15, 2026.

## Workflow

1. Five picked the concept, XV-A Cross-VM Escrow, and the Advanced Cross-VM category.
2. Little 5 scaffolded the escrow contract, the demo app, the test suite and the docs, and ran the tests locally.
3. Five did every wallet and chain step himself through MetaMask on the deploy page: contract deploy, lock, and release after the vesting cliff.
4. Little 5 verified each step on chain from the public EVM RPC and explorer, then wrote the live status into the README and build report.
5. Five approved the demo video narration and the final submission.

## What the AI generated

- The CrossVMescrowLive Solidity contract, including the call to the CrossVM Bridge precompile 0x0000000000000000000000000000000000000901 for the atomic EVM to Native call.
- The demo web app (Vite, TypeScript, React).
- The test suite, 13 tests, all passing.
- The deploy helper scripts and the deploy page used to coordinate the live steps.
- The README, BUILD-REPORT and STORYBOARD drafts, and the narration script for the demo video.

## Human contribution

- The concept, the category choice and every design decision, including the vesting schedule: 60 second cliff, 3600 second duration.
- All signing: the deploy, lock and release were sent by Five in MetaMask. Contract 0x2aae26e2a1d8397ac9341e5a936af1ae340b0c2b, deploy tx 0x9cdb7e6877f8170314e323faf7b9c46eebed6b224c3221283fbbc1dfcd7b20c4, lock tx 0x15728accc8a06dcee8e03bf819814afdcdc48b43a9818675816fe49273ef1e8f, 0.005 QOR locked, 0.000208333333333333 QOR released on schedule, the rest vesting.
- Key management and the faucet claim.
- Approval of the demo video and of the final submission.

## Verification

No contract address, transaction hash or vesting figure in this repo was invented. Every live step was read back from the QoreChain testnet by the agent and is checkable on the explorer. The original CrossVMescrow contract was not deployed. The lock succeeding proves the live EVM to Native CrossVM call to the allowlisted WDT contract worked.
