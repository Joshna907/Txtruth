# Troubleshooting

## No wallet appears

Install or unlock a Wallet Standard wallet such as Phantom or Solflare, enable Devnet in the wallet, and refresh the page. The app never asks for a seed phrase.

## The airdrop fails

Public Devnet RPC airdrops are rate-limited. Use the linked official Solana faucet, paste the connected Devnet address, wait for confirmation, then select **Refresh** in TxTruth.

## The wallet rejects the request

No transaction was signed or submitted, and no fee was charged. You may safely start again.

## A signature is shown but the verdict is indeterminate

Do not submit a second transfer yet. Open the preserved Devnet Explorer link or paste the signature into the inspector again. RPC nodes can take time to expose a newly confirmed transaction.

## The inspector reports an RPC error

The transaction may still be valid. Keep the signature and retry the read-only inspection later. For deployment, configure a trusted server-side `SOLANA_DEVNET_RPC_URL` that points to Devnet.

## Local setup

Use Node.js 20 or newer and pnpm 10, then run:

```bash
pnpm install
pnpm build
pnpm test
pnpm typecheck
```
