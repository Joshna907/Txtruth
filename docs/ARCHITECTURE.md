# Architecture

TxTruth is a local-first library. There is no hosted backend and no telemetry service.

```text
Application callbacks
        |
        v
@txtruth/kit ---- lifecycle events ----> @txtruth/core
                                             |
                                             +--> evidence-backed presentation
                                             +--> privacy-safe report
                                             +--> @txtruth/testkit assertions
```

`@txtruth/core` is pure TypeScript and performs no I/O. `@txtruth/kit` orchestrates caller-supplied simulation, signing, submission, status, and block-height callbacks. `reconcileTrackedTransaction` appends new status evidence to the same recorder after a timeout, allowing a late success or execution failure to resolve an indeterminate verdict. It never owns keys or retries a transaction. `@txtruth/testkit` supplies deterministic evidence histories and compares semantic UI claims rather than exact text.

The web demo is Devnet-only. It uses Wallet Standard and `@solana/kit` in the browser, where the connected wallet retains all private-key and signing control. Solana Kit constructs, simulates, signs, submits, and confirms the live self-transfer. TxTruth then independently inspects the returned signature through a server-side RPC proxy. The proxy calls Solana's `getSignatureStatuses` with transaction-history search enabled and `getTransaction` for execution metadata and exact fee evidence. It defaults to the official Devnet endpoint; operators may provide a server-only `SOLANA_DEVNET_RPC_URL`. The route never accepts an endpoint or non-Devnet cluster from the browser.

## Trust boundary

- Wallets own private keys and signing decisions.
- Applications own RPC endpoints and transaction construction.
- TxTruth owns lifecycle evidence, derivation, and conformance policy.
- An `indeterminate` outcome is preserved whenever evidence cannot prove success or failure.
