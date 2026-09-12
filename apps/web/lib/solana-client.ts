"use client";

import { createClient } from "@solana/kit";
import { rpcAirdrop, solanaRpc } from "@solana/kit-plugin-rpc";
import { walletSigner } from "@solana/kit-plugin-wallet";
import { systemProgram } from "@solana-program/system";

export const DEVNET_RPC_URL = "https://api.devnet.solana.com";

/**
 * This client is deliberately Devnet-only. A wallet signs locally and is the
 * fee payer; TxTruth never receives a key, seed phrase, or signing authority.
 */
export const devnetClient = createClient()
  .use(walletSigner({ chain: "solana:devnet" }))
  .use(solanaRpc({ rpcUrl: DEVNET_RPC_URL }))
  .use(rpcAirdrop())
  .use(systemProgram());

export type DevnetClient = typeof devnetClient;
