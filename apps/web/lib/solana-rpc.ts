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

const devnetEndpoint = process.env.SOLANA_DEVNET_RPC_URL ?? "https://api.devnet.solana.com";

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

  const status = statuses.value[0];
  if (!status) {
    recorder.record({ type: "confirmation_timed_out", at: now() });
  } else {
    const transactionError = transaction?.meta?.err ?? status.err;
    recorder.record({
      type: "signature_observed",
      at: now(),
      signature,
      commitment: status.confirmationStatus ?? "processed",
      slot: BigInt(transaction?.slot ?? status.slot),
      ...(transaction?.meta?.fee === undefined
        ? {}
        : { feeLamports: BigInt(transaction.meta.fee) }),
      ...(transactionError === null
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
