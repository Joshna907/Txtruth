# TxTruth

TxTruth is a local-first Solana transaction-UX conformance engine. It records lifecycle evidence, derives only claims supported by that evidence, and checks whether an application presents transaction outcomes truthfully.

This repository contains the evidence engine, integration kit, conformance testkit, and a working web application:

- `@txtruth/core` — deterministic lifecycle recorder, presentation policy, and privacy-safe reports.
- `@txtruth/kit` — callback-driven transaction runner and reconciliation helper compatible with `@solana/kit` application boundaries.
- `@txtruth/testkit` — seven deterministic scenarios and semantic UI conformance checks.
- `@txtruth/web` — a responsive guided lab, Devnet-only signature inspector, Wallet Standard connection flow, and a real 1-lamport self-transfer demonstration.

The public MVP is deliberately Devnet-only. It uses Wallet Standard with modern `@solana/kit` packages, so a browser wallet owns every signing decision and TxTruth never receives a private key or seed phrase. The live inspector uses `getSignatureStatuses` and `getTransaction` through a server-side route for on-chain status and exact fee evidence.

## Live Devnet demonstration

1. Connect a Devnet-enabled Wallet Standard wallet such as Phantom or Solflare.
2. Request free Devnet SOL in the lab, or use [Solana's Devnet Faucet](https://faucet.solana.com) if the public RPC rate-limits an airdrop.
3. Run the fixed 1-lamport self-transfer. The wallet sends one lamport back to itself, while Devnet SOL covers the network fee.
4. TxTruth inspects the resulting signature and presents the confirmed outcome, evidence, exact fee when available, retry policy, and Devnet Explorer link.

No Mainnet transaction, real asset, or production wallet balance is required for the MVP.

## Commands

```bash
pnpm install
pnpm build
pnpm test
pnpm typecheck
```

No package signs transactions, stores private keys, retries transactions, or sends telemetry.
