# Integration

TxTruth separates evidence collection from presentation. Your application records facts from its Solana transaction flow, then renders the single presentation returned by the core engine.

```ts
import {
  createTxTruthRecorder,
  deriveTxTruthPresentation,
} from "@txtruth/core";

const recorder = createTxTruthRecorder({
  cluster: "devnet",
  requiredCommitment: "confirmed",
});

recorder.record({
  type: "transaction_created",
  at: Date.now(),
  messageHash: "your-stable-message-hash",
});

// Record wallet, simulation, submission, status, and block-height facts here.
const presentation = deriveTxTruthPresentation(recorder.snapshot());
```

For an orchestrated transaction, use `runTrackedTransaction` from `@txtruth/kit` and provide callbacks for simulation, wallet signing, submission, signature status, and block height. TxTruth does not require a specific RPC or wallet library.

When a submitted transaction times out, persist its recorder and call `reconcileTrackedTransaction` with the same signature. Reconciliation only checks the existing attempt. It never rebuilds or resubmits the transaction.

Render `TxTruthPresentation` directly. In particular, do not translate `indeterminate` into failure, and do not offer a fresh transaction while `retryPolicy` is `check_status_first`.

The included web application demonstrates a Devnet-only Wallet Standard transaction and an independent signature inspection. Set `SOLANA_DEVNET_RPC_URL` only on the server if you need a dedicated Devnet provider.
