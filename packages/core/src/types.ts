export type Commitment = "processed" | "confirmed" | "finalized";

export type NormalizedError = {
  code: string;
  message: string;
  details?: unknown;
};

export type TxTruthEventV1 =
  | { type: "transaction_created"; at: number; messageHash: string }
  | {
      type: "blockhash_obtained";
      at: number;
      blockhash: string;
      lastValidBlockHeight: bigint;
      commitment: Commitment;
    }
  | { type: "simulation_started"; at: number }
  | {
      type: "simulation_succeeded";
      at: number;
      unitsConsumed?: bigint;
      logs: string[];
    }
  | {
      type: "simulation_failed";
      at: number;
      error: NormalizedError;
      logs: string[];
    }
  | { type: "wallet_requested"; at: number; wallet?: string }
  | { type: "wallet_rejected"; at: number; error: NormalizedError }
  | { type: "wallet_signed"; at: number; signature: string }
  | { type: "signature_tracked"; at: number; signature: string }
  | { type: "submission_started"; at: number }
  | { type: "submission_accepted"; at: number; signature: string }
  | { type: "submission_failed"; at: number; error: NormalizedError }
  | {
      type: "signature_observed";
      at: number;
      signature: string;
      commitment: Commitment;
      slot?: bigint;
      error?: NormalizedError;
      feeLamports?: bigint;
    }
  | { type: "block_height_observed"; at: number; blockHeight: bigint }
  | { type: "confirmation_timed_out"; at: number };

export type TxTruthOutcome =
  | "in_progress"
  | "cancelled_by_user"
  | "preflight_failed"
  | "confirmed_success"
  | "confirmed_execution_failure"
  | "expired_not_observed"
  | "indeterminate";

export type EvidenceItem = {
  at: number;
  event: TxTruthEventV1["type"];
  summary: string;
};

export type RetryPolicy =
  | "none"
  | "user_may_restart"
  | "fix_input_then_rebuild"
  | "rebuild_required"
  | "check_status_first"
  | "manual_review";

export type TxTruthPresentation = {
  outcome: TxTruthOutcome;
  certainty: "observed" | "derived" | "unknown";
  title: string;
  message: string;
  feeImpact: "none" | "fee_may_apply" | "fee_charged" | "unknown";
  feeLamports?: bigint;
  retryPolicy: RetryPolicy;
  signature?: string;
  explorerUrl?: string;
  evidence: EvidenceItem[];
};

export type RecorderConfig = {
  cluster: "devnet" | "testnet" | "mainnet-beta" | "custom";
  requiredCommitment: Commitment;
  explorerBaseUrl?: string;
};

export type TxTruthSnapshot = {
  schemaVersion: 1;
  config: RecorderConfig;
  events: readonly TxTruthEventV1[];
};

export type TxTruthRecorder = {
  record(event: TxTruthEventV1): TxTruthSnapshot;
  snapshot(): TxTruthSnapshot;
};

export type JsonSafe<T> = T extends bigint
  ? string
  : T extends readonly (infer U)[]
    ? JsonSafe<U>[]
    : T extends object
      ? { [K in keyof T]: JsonSafe<T[K]> }
      : T;

export type SerializedTxTruthEventV1 = JsonSafe<TxTruthEventV1>;

export type TxTruthReportV1 = {
  schemaVersion: 1;
  generatedAt: number;
  redacted: boolean;
  config: RecorderConfig;
  presentation: TxTruthPresentation;
  events: SerializedTxTruthEventV1[];
};
