import type {
  Commitment,
  EvidenceItem,
  TxTruthEventV1,
  TxTruthPresentation,
  TxTruthSnapshot,
} from "./types.js";

const commitmentRank: Record<Commitment, number> = {
  processed: 0,
  confirmed: 1,
  finalized: 2,
};

const findLast = <T extends TxTruthEventV1["type"]>(
  events: readonly TxTruthEventV1[],
  type: T,
): Extract<TxTruthEventV1, { type: T }> | undefined =>
  [...events].reverse().find((event) => event.type === type) as
    | Extract<TxTruthEventV1, { type: T }>
    | undefined;

function evidenceSummary(event: TxTruthEventV1): string {
  switch (event.type) {
    case "transaction_created":
      return "Transaction lifecycle recording started.";
    case "blockhash_obtained":
      return `Recent blockhash is valid through block height ${event.lastValidBlockHeight}.`;
    case "simulation_started":
      return "Preflight simulation started.";
    case "simulation_succeeded":
      return "Preflight simulation succeeded.";
    case "simulation_failed":
      return `Preflight simulation failed: ${event.error.message}`;
    case "wallet_requested":
      return "Wallet authorization requested.";
    case "wallet_rejected":
      return "Wallet authorization was declined.";
    case "wallet_signed":
      return "Wallet produced a signed transaction.";
    case "signature_tracked":
      return "A transaction signature was supplied for on-chain inspection.";
    case "submission_started":
      return "RPC submission started.";
    case "submission_accepted":
      return "RPC returned a transaction signature.";
    case "submission_failed":
      return `RPC submission did not return acceptance: ${event.error.message}`;
    case "signature_observed":
      return event.error
        ? `The transaction was observed with an execution error at ${event.commitment}.`
        : `The transaction was observed at ${event.commitment}.`;
    case "block_height_observed":
      return `Observed block height ${event.blockHeight}.`;
    case "confirmation_timed_out":
      return "The client stopped waiting before a terminal result was observed.";
  }
}

const toEvidence = (events: readonly TxTruthEventV1[]): EvidenceItem[] =>
  events.map((event) => ({
    at: event.at,
    event: event.type,
    summary: evidenceSummary(event),
  }));

function explorerUrl(snapshot: TxTruthSnapshot, signature: string): string {
  if (snapshot.config.explorerBaseUrl) {
    return `${snapshot.config.explorerBaseUrl.replace(/\/$/, "")}/tx/${signature}`;
  }
  const suffix =
    snapshot.config.cluster === "mainnet-beta"
      ? ""
      : `?cluster=${encodeURIComponent(snapshot.config.cluster)}`;
  return `https://explorer.solana.com/tx/${signature}${suffix}`;
}

export function deriveTxTruthPresentation(
  snapshot: TxTruthSnapshot,
): TxTruthPresentation {
  const { events } = snapshot;
  const evidence = toEvidence(events);
  const signed = findLast(events, "wallet_signed");
  const tracked = findLast(events, "signature_tracked");
  const accepted = findLast(events, "submission_accepted");
  const signature = accepted?.signature ?? signed?.signature ?? tracked?.signature;
  const observedEvents = events.filter(
    (event): event is Extract<TxTruthEventV1, { type: "signature_observed" }> =>
      event.type === "signature_observed",
  );
  const observedFailure = [...observedEvents].reverse().find((event) => event.error);
  const observedSuccess = [...observedEvents]
    .reverse()
    .find(
      (event) =>
        !event.error &&
        commitmentRank[event.commitment] >=
          commitmentRank[snapshot.config.requiredCommitment],
    );

  if (observedFailure) {
    return {
      outcome: "confirmed_execution_failure",
      certainty: "observed",
      title: "Transaction failed during execution",
      message:
        "The transaction landed, but a program returned an error. Program state changes were rolled back; the network fee was still charged.",
      feeImpact: "fee_charged",
      ...(observedFailure.feeLamports === undefined
        ? {}
        : { feeLamports: observedFailure.feeLamports }),
      retryPolicy: "fix_input_then_rebuild",
      signature: observedFailure.signature,
      explorerUrl: explorerUrl(snapshot, observedFailure.signature),
      evidence,
    };
  }

  if (observedSuccess) {
    return {
      outcome: "confirmed_success",
      certainty: "observed",
      title: "Transaction confirmed",
      message: `The transaction reached ${observedSuccess.commitment} commitment without an execution error.`,
      feeImpact: "fee_charged",
      ...(observedSuccess.feeLamports === undefined
        ? {}
        : { feeLamports: observedSuccess.feeLamports }),
      retryPolicy: "none",
      signature: observedSuccess.signature,
      explorerUrl: explorerUrl(snapshot, observedSuccess.signature),
      evidence,
    };
  }

  const walletRejected = findLast(events, "wallet_rejected");
  if (walletRejected) {
    return {
      outcome: "cancelled_by_user",
      certainty: "observed",
      title: "Request cancelled",
      message: "The wallet did not sign the transaction, so nothing was submitted.",
      feeImpact: "none",
      retryPolicy: "user_may_restart",
      evidence,
    };
  }

  const simulationFailed = findLast(events, "simulation_failed");
  if (simulationFailed) {
    return {
      outcome: "preflight_failed",
      certainty: "observed",
      title: "Transaction did not pass preflight",
      message: `Simulation failed before submission: ${simulationFailed.error.message}`,
      feeImpact: "none",
      retryPolicy: "fix_input_then_rebuild",
      evidence,
    };
  }

  const lifetime = findLast(events, "blockhash_obtained");
  const height = findLast(events, "block_height_observed");
  if (
    signature &&
    lifetime &&
    height &&
    observedEvents.length === 0 &&
    height.blockHeight > lifetime.lastValidBlockHeight
  ) {
    return {
      outcome: "expired_not_observed",
      certainty: "derived",
      title: "Transaction expired and was not observed",
      message:
        "No on-chain status was observed before the recent blockhash lifetime ended. A new attempt must rebuild the transaction.",
      feeImpact: "unknown",
      retryPolicy: "rebuild_required",
      signature,
      explorerUrl: explorerUrl(snapshot, signature),
      evidence,
    };
  }

  if (
    findLast(events, "confirmation_timed_out") ||
    findLast(events, "submission_failed")
  ) {
    return {
      outcome: "indeterminate",
      certainty: "unknown",
      title: "Transaction outcome is not yet known",
      message:
        "The available evidence cannot prove success or failure. Check the known signature before attempting another transaction.",
      feeImpact: "unknown",
      retryPolicy: signature ? "check_status_first" : "manual_review",
      ...(signature
        ? { signature, explorerUrl: explorerUrl(snapshot, signature) }
        : {}),
      evidence,
    };
  }

  return {
    outcome: "in_progress",
    certainty: "unknown",
    title: "Transaction in progress",
    message: "A terminal transaction outcome has not been observed yet.",
    feeImpact: signature ? "fee_may_apply" : "none",
    retryPolicy: "none",
    ...(signature
      ? { signature, explorerUrl: explorerUrl(snapshot, signature) }
      : {}),
    evidence,
  };
}
