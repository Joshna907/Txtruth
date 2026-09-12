# Conformance Rules

1. A wallet rejection is cancellation, not network failure.
2. A preflight failure occurs before submission and charges no transaction fee.
3. An RPC error after signing must preserve the local signature and check status before retry.
4. A confirmation timeout is uncertainty, not terminal failure.
5. An unobserved transaction past its last valid block height requires rebuilding.
6. An observed execution failure rolls back program state but still charges the network fee.
7. Success is shown only after the configured commitment is observed without an error.

TxTruth does not assert that “funds did not move” for indeterminate outcomes.
