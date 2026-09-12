# Security

TxTruth never requests, receives, or stores a seed phrase or private key. In the web demo, a Wallet Standard wallet owns authorization and signing. The fixed live action is a 1-lamport transfer from the connected address back to the same address on Solana Devnet.

The browser cannot choose an RPC endpoint or cluster for the inspection route. The server accepts only the literal `devnet` cluster, validates the signature format, applies a ten-second RPC timeout, and returns no cached result. A custom `SOLANA_DEVNET_RPC_URL` must be a trusted Devnet HTTP or HTTPS endpoint and must remain server-side.

Devnet SOL has no monetary value. Do not send Mainnet SOL or tokens to a wallet solely for this demo. Review the wallet transaction before approving it, just as you would for any dApp.

Shareable TxTruth reports redact signatures by default and sanitize common credentials and URL query strings. Applications remain responsible for avoiding sensitive data in custom error details and logs.

To report a vulnerability, open a private security advisory once the public GitHub repository is available. Do not include secrets or seed phrases in an issue.
