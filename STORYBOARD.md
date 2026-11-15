# Cross-VM Escrow demo storyboard

True screencast, demo mode labelled on screen, no faked results, no video recorded or uploaded. Total about 15 seconds, five beats, about 3 seconds each, one claim per beat, problem first. Teal and charcoal UI, bridge diagram visible throughout.

Beat 1, problem, about 3 seconds. On screen: title Cross-VM Escrow, with the line An EVM payment and Native vesting live in separate worlds. Voice or caption: An EVM payment and Native vesting live in separate worlds. Visual: EVM panel on the left, Native panel on the right, gap in the middle.

Beat 2, lock, about 3 seconds. On screen: lock form filled in demo mode, amount 1200, cliff 1 day, duration 10 days, then Lock payment and build atomic call is tapped. Voice or caption: Lock the payment on EVM in demo mode. Visual: schedule appears, status locked, released 0 of 1200.

Beat 3, atomic step, about 3 seconds. On screen: middle atomic step highlighted, precompile 0x0000000000000000000000000000000000000901, targetVM 1, selector 0x3c11078c, payload JSON and calldata visible. Voice or caption: One atomic call to Native, targetVM 1, or nothing lands. Visual: arrow from EVM to Native, demo label visible.

Beat 4, schedule, about 3 seconds. On screen: vesting schedule, cliff and duration, simulated clock advances, releasable amount stays 0 before the cliff, then rises after it. Voice or caption: Release before the schedule is blocked. The schedule decides. Visual: Advance 1 day tapped, releasable 0, then jump toward end, releasable rises.

Beat 5, release, about 3 seconds. On screen: Release vested amount tapped, released total rises to 1200 of 1200, status fully_released, end card Cross-VM Escrow, testnet only, demo mode. Voice or caption: Release on schedule, in full, on testnet only. Visual: end card with project name and demo mode label.

Notes for the person recording: record the real app at http://localhost:5173, keep the demo mode label in frame, do not edit in a transaction hash, do not edit in a live result, and stop if a live wallet prompt appears, because live send is pending ML-DSA-87 key registration for Five QoreX address qor1kkmn9z3es9p3heet7y5zcrcg57g9ljp8909r5u, faucet funds are now claimed, 100 QOR.
