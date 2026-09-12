import {
  createTxTruthRecorder,
  normalizeError,
  type Commitment,
  type NormalizedError,
  type RecorderConfig,
  type TxTruthRecorder,
  type TxTruthSnapshot,
} from "@txtruth/core";

export type TransactionLifetime = {
  blockhash: string;
  lastValidBlockHeight: bigint;
};

export type SimulationResult =
  | { ok: true; logs?: string[]; unitsConsumed?: bigint }
  | { ok: false; error: NormalizedError; logs?: string[] };

export type SignResult<TSigned> =
  | { status: "signed"; signedTransaction: TSigned; signature: string }
  | { status: "rejected"; error: NormalizedError };

export type SubmissionResult =
  | { status: "accepted"; signature?: string }
  | { status: "rejected"; error: NormalizedError };

export type SignatureStatus = {
  commitment: Commitment;
  slot?: bigint;
  error?: NormalizedError;
  feeLamports?: bigint;
};

export type RunTrackedTransactionOptions<TTransaction, TSigned> = {
  transaction: TTransaction;
  messageHash: string;
  lifetime: TransactionLifetime;
  commitment: Commitment;
  cluster?: RecorderConfig["cluster"];
  wallet?: string;
  recorder?: TxTruthRecorder;
  simulate(transaction: TTransaction): Promise<SimulationResult>;
  sign(transaction: TTransaction): Promise<SignResult<TSigned>>;
  send(signedTransaction: TSigned): Promise<SubmissionResult>;
  getSignatureStatus(signature: string): Promise<SignatureStatus | null>;
  getBlockHeight(): Promise<bigint>;
  maxPolls?: number;
  pollIntervalMs?: number;
  now?: () => number;
  sleep?: (milliseconds: number) => Promise<void>;
};

export type ReconcileTrackedTransactionOptions = {
  recorder: TxTruthRecorder;
  signature: string;
  commitment: Commitment;
  lifetime?: TransactionLifetime;
  getSignatureStatus(signature: string): Promise<SignatureStatus | null>;
  getBlockHeight?(): Promise<bigint>;
  getFeeLamports?(signature: string): Promise<bigint | undefined>;
  maxPolls?: number;
  pollIntervalMs?: number;
  now?: () => number;
  sleep?: (milliseconds: number) => Promise<void>;
};

const rank: Record<Commitment, number> = {
  processed: 0,
  confirmed: 1,
  finalized: 2,
};

const defaultSleep = async (milliseconds: number): Promise<void> => {
  await new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
};

export async function runTrackedTransaction<TTransaction, TSigned>(
  options: RunTrackedTransactionOptions<TTransaction, TSigned>,
): Promise<TxTruthSnapshot> {
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? defaultSleep;
  const recorder =
    options.recorder ??
    createTxTruthRecorder({
      cluster: options.cluster ?? "devnet",
      requiredCommitment: options.commitment,
    });

  recorder.record({
    type: "transaction_created",
    at: now(),
    messageHash: options.messageHash,
  });
  recorder.record({
    type: "blockhash_obtained",
    at: now(),
    blockhash: options.lifetime.blockhash,
    lastValidBlockHeight: options.lifetime.lastValidBlockHeight,
    commitment: options.commitment,
  });
  recorder.record({ type: "simulation_started", at: now() });

  let simulation: SimulationResult;
  try {
    simulation = await options.simulate(options.transaction);
  } catch (error) {
    simulation = { ok: false, error: normalizeError(error, "simulation_error") };
  }
  if (!simulation.ok) {
    recorder.record({
      type: "simulation_failed",
      at: now(),
      error: simulation.error,
      logs: simulation.logs ?? [],
    });
    return recorder.snapshot();
  }
  recorder.record({
    type: "simulation_succeeded",
    at: now(),
    logs: simulation.logs ?? [],
    ...(simulation.unitsConsumed === undefined
      ? {}
      : { unitsConsumed: simulation.unitsConsumed }),
  });

  recorder.record({
    type: "wallet_requested",
    at: now(),
    ...(options.wallet ? { wallet: options.wallet } : {}),
  });
  let signing: SignResult<TSigned>;
  try {
    signing = await options.sign(options.transaction);
  } catch (error) {
    signing = {
      status: "rejected",
      error: normalizeError(error, "wallet_error"),
    };
  }
  if (signing.status === "rejected") {
    recorder.record({
      type: "wallet_rejected",
      at: now(),
      error: signing.error,
    });
    return recorder.snapshot();
  }

  const localSignature = signing.signature;
  recorder.record({
    type: "wallet_signed",
    at: now(),
    signature: localSignature,
  });
  recorder.record({ type: "submission_started", at: now() });

  let submission: SubmissionResult;
  try {
    submission = await options.send(signing.signedTransaction);
  } catch (error) {
    submission = {
      status: "rejected",
      error: normalizeError(error, "submission_error"),
    };
  }
  if (submission.status === "rejected") {
    recorder.record({
      type: "submission_failed",
      at: now(),
      error: submission.error,
    });
  } else {
    const rpcSignature = submission.signature ?? localSignature;
    if (rpcSignature !== localSignature) {
      throw new Error("RPC signature did not match the locally signed transaction");
    }
    recorder.record({
      type: "submission_accepted",
      at: now(),
      signature: localSignature,
    });
  }

  const maxPolls = options.maxPolls ?? 20;
  for (let poll = 0; poll < maxPolls; poll += 1) {
    let status: SignatureStatus | null = null;
    try {
      status = await options.getSignatureStatus(localSignature);
    } catch {
      status = null;
    }
    if (status) {
      recorder.record({
        type: "signature_observed",
        at: now(),
        signature: localSignature,
        commitment: status.commitment,
        ...(status.slot === undefined ? {} : { slot: status.slot }),
        ...(status.feeLamports === undefined
          ? {}
          : { feeLamports: status.feeLamports }),
        ...(status.error === undefined ? {} : { error: status.error }),
      });
      if (
        status.error ||
        rank[status.commitment]! >= rank[options.commitment]!
      ) {
        return recorder.snapshot();
      }
    }

    try {
      const blockHeight = await options.getBlockHeight();
      recorder.record({
        type: "block_height_observed",
        at: now(),
        blockHeight,
      });
      if (!status && blockHeight > options.lifetime.lastValidBlockHeight) {
        return recorder.snapshot();
      }
    } catch {
      // An unavailable height is evidence absence, not transaction failure.
    }

    if (poll < maxPolls - 1) {
      await sleep(options.pollIntervalMs ?? 1_000);
    }
  }

  recorder.record({ type: "confirmation_timed_out", at: now() });
  return recorder.snapshot();
}

/**
 * Continue observing a known signature without rebuilding or re-submitting it.
 * This intentionally appends to the supplied recorder so a later on-chain result
 * can resolve an earlier indeterminate timeout.
 */
export async function reconcileTrackedTransaction(
  options: ReconcileTrackedTransactionOptions,
): Promise<TxTruthSnapshot> {
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? defaultSleep;
  const maxPolls = options.maxPolls ?? 12;

  for (let poll = 0; poll < maxPolls; poll += 1) {
    let status: SignatureStatus | null = null;
    try {
      status = await options.getSignatureStatus(options.signature);
    } catch {
      status = null;
    }

    if (status) {
      const terminal = Boolean(status.error) || rank[status.commitment] >= rank[options.commitment];
      let feeLamports = status.feeLamports;
      if (terminal && feeLamports === undefined && options.getFeeLamports) {
        try {
          feeLamports = await options.getFeeLamports(options.signature);
        } catch {
          // Fee evidence is optional. Do not turn a known transaction state into an RPC failure.
        }
      }
      options.recorder.record({
        type: "signature_observed",
        at: now(),
        signature: options.signature,
        commitment: status.commitment,
        ...(status.slot === undefined ? {} : { slot: status.slot }),
        ...(feeLamports === undefined ? {} : { feeLamports }),
        ...(status.error === undefined ? {} : { error: status.error }),
      });
      if (terminal) return options.recorder.snapshot();
    }

    if (options.lifetime && options.getBlockHeight) {
      try {
        const blockHeight = await options.getBlockHeight();
        options.recorder.record({
          type: "block_height_observed",
          at: now(),
          blockHeight,
        });
        if (!status && blockHeight > options.lifetime.lastValidBlockHeight) {
          return options.recorder.snapshot();
        }
      } catch {
        // An unavailable height is evidence absence, not transaction failure.
      }
    }

    if (poll < maxPolls - 1) {
      await sleep(options.pollIntervalMs ?? 1_000);
    }
  }

  options.recorder.record({ type: "confirmation_timed_out", at: now() });
  return options.recorder.snapshot();
}

export function createKitEventAdapter(recorder: TxTruthRecorder) {
  return {
    transactionCreated(at: number, messageHash: string) {
      return recorder.record({ type: "transaction_created", at, messageHash });
    },
    walletSigned(at: number, signature: string) {
      return recorder.record({ type: "wallet_signed", at, signature });
    },
    submissionAccepted(at: number, signature: string) {
      return recorder.record({ type: "submission_accepted", at, signature });
    },
    signatureObserved(
      at: number,
      signature: string,
      commitment: Commitment,
      error?: NormalizedError,
    ) {
      return recorder.record({
        type: "signature_observed",
        at,
        signature,
        commitment,
        ...(error ? { error } : {}),
      });
    },
  };
}
