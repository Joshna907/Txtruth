import {
  createTxTruthRecorder,
  deriveTxTruthPresentation,
  type Commitment,
  type NormalizedError,
  type TxTruthPresentation,
} from "@txtruth/core";

export type InspectableCluster = "devnet";

export type SignatureInspection = {
  cluster: InspectableCluster;
  rpcEndpoint: string;
  presentation: TxTruthPresentation;
};

type Fetcher = typeof fetch;

type RpcEnvelope<T> = {
  result?: T;
  error?: { code?: number; message?: string; data?: unknown };
};

type StatusResult = {
  value: Array<{
    slot: number;
    err: unknown;
    confirmationStatus: Commitment | null;
  } | null>;
};

type TransactionResult = {
  slot: number;
  meta: { err: unknown; fee: number } | null;
} | null;

function resolveDevnetEndpoint(): string {
  const value = process.env.SOLANA_DEVNET_RPC_URL ?? "https://api.devnet.solana.com";
  const endpoint = new URL(value);
  if (endpoint.protocol !== "https:" && endpoint.protocol !== "http:") {
    throw new Error("SOLANA_DEVNET_RPC_URL must use HTTP or HTTPS.");
  }
  if (endpoint.hostname === "api.mainnet-beta.solana.com" || endpoint.hostname === "api.testnet.solana.com") {
    throw new Error("SOLANA_DEVNET_RPC_URL must point to Solana Devnet.");
  }
  return endpoint.toString();
}

const devnetEndpoint = resolveDevnetEndpoint();

export function isSolanaSignature(value: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{64,90}$/.test(value);
}

function normalizeRpcError(value: unknown): NormalizedError | undefined {
  if (value === null || value === undefined) return undefined;
  return {
    code: "transaction_error",
    message: "The transaction was observed with an execution error.",
    details: value,
  };
}

async function rpc<T>(
  endpoint: string,
  method: string,
  params: unknown[],
  fetcher: Fetcher,
): Promise<T> {
  const response = await fetcher(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Solana RPC returned HTTP ${response.status}`);
  const envelope = (await response.json()) as RpcEnvelope<T>;
  if (envelope.error) {
    throw new Error(envelope.error.message ?? `Solana RPC ${method} failed`);
  }
  if (!("result" in envelope)) throw new Error(`Solana RPC ${method} returned no result`);
  return envelope.result as T;
}

export async function inspectSolanaSignature(options: {
  signature: string;
  cluster: InspectableCluster;
  fetcher?: Fetcher;
  now?: () => number;
}): Promise<SignatureInspection> {
  const signature = options.signature.trim();
  if (!isSolanaSignature(signature)) {
    throw new Error("Enter a valid base58 Solana transaction signature.");
  }

  const endpoint = devnetEndpoint;
  const fetcher = options.fetcher ?? fetch;
  const now = options.now ?? Date.now;
  const [statuses, transaction] = await Promise.all([
    rpc<StatusResult>(
      endpoint,
      "getSignatureStatuses",
      [[signature], { searchTransactionHistory: true }],
      fetcher,
    ),
    rpc<TransactionResult>(
      endpoint,
      "getTransaction",
      [signature, { commitment: "confirmed", encoding: "json", maxSupportedTransactionVersion: 0 }],
      fetcher,
    ).catch(() => null),
  ]);

  const recorder = createTxTruthRecorder({
    cluster: options.cluster,
    requiredCommitment: "confirmed",
  });
  recorder.record({ type: "transaction_created", at: now(), messageHash: "external-signature" });
  recorder.record({ type: "signature_tracked", at: now(), signature });

  if (!Array.isArray(statuses.value)) {
    throw new Error("Solana RPC returned an invalid signature-status response.");
  }
  const status = statuses.value[0];
  if (!status) {
    recorder.record({ type: "confirmation_timed_out", at: now() });
  } else {
    const commitment =
      status.confirmationStatus === "confirmed" || status.confirmationStatus === "finalized"
        ? status.confirmationStatus
        : "processed";
    const slot = transaction?.slot ?? status.slot;
    if (!Number.isSafeInteger(slot) || slot < 0) {
      throw new Error("Solana RPC returned an invalid transaction slot.");
    }
    const fee = transaction?.meta?.fee;
    if (fee !== undefined && (!Number.isSafeInteger(fee) || fee < 0)) {
      throw new Error("Solana RPC returned an invalid transaction fee.");
    }
    const transactionError = transaction?.meta?.err ?? status.err;
    recorder.record({
      type: "signature_observed",
      at: now(),
      signature,
      commitment,
      slot: BigInt(slot),
      ...(fee === undefined
        ? {}
        : { feeLamports: BigInt(fee) }),
      ...(transactionError === null || transactionError === undefined
        ? {}
        : { error: normalizeRpcError(transactionError) }),
    });
  }

  return {
    cluster: options.cluster,
    rpcEndpoint: endpoint,
    presentation: deriveTxTruthPresentation(recorder.snapshot()),
  };
}
