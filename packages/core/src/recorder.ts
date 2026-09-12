import type {
  RecorderConfig,
  TxTruthEventV1,
  TxTruthRecorder,
  TxTruthSnapshot,
} from "./types.js";

const signatureFrom = (event: TxTruthEventV1): string | undefined => {
  if (
    event.type === "wallet_signed" ||
    event.type === "signature_tracked" ||
    event.type === "submission_accepted" ||
    event.type === "signature_observed"
  ) {
    return event.signature;
  }
  return undefined;
};

function validateNext(events: readonly TxTruthEventV1[], event: TxTruthEventV1): void {
  const previous = events.at(-1);
  if (!previous && event.type !== "transaction_created") {
    throw new Error("The first TxTruth event must be transaction_created");
  }
  if (previous && event.at < previous.at) {
    throw new Error("TxTruth event timestamps must be non-decreasing");
  }
  if (event.type === "transaction_created" && events.length > 0) {
    throw new Error("A recorder can contain only one transaction_created event");
  }

  const existingSignature = events.map(signatureFrom).find(Boolean);
  const incomingSignature = signatureFrom(event);
  if (existingSignature && incomingSignature && existingSignature !== incomingSignature) {
    throw new Error("A recorder cannot mix evidence from different signatures");
  }

  const wasRejectedBeforeSubmission = events.some(
    (item) =>
      item.type === "wallet_rejected" ||
      item.type === "simulation_failed" ||
      item.type === "simulation_unavailable",
  );
  if (
    wasRejectedBeforeSubmission &&
    (event.type === "submission_started" ||
      event.type === "submission_accepted" ||
      event.type === "signature_observed")
  ) {
    throw new Error("A rejected pre-submission transaction cannot be submitted");
  }

  const observed = events.filter((item) => item.type === "signature_observed");
  const observedSuccess = observed.some(
    (item) => item.type === "signature_observed" && !item.error,
  );
  const observedFailure = observed.some(
    (item) => item.type === "signature_observed" && Boolean(item.error),
  );
  if (
    event.type === "signature_observed" &&
    ((observedSuccess && event.error) || (observedFailure && !event.error))
  ) {
    throw new Error("Observed on-chain outcomes cannot contradict one another");
  }
}

export function createTxTruthRecorder(config: RecorderConfig): TxTruthRecorder {
  let events: TxTruthEventV1[] = [];

  const snapshot = (): TxTruthSnapshot => ({
    schemaVersion: 1,
    config: { ...config },
    events: events.map((event) => ({ ...event })),
  });

  return {
    record(event) {
      validateNext(events, event);
      events = [...events, { ...event }];
      return snapshot();
    },
    snapshot,
  };
}

export function recordTxTruthEvent(
  recorder: TxTruthRecorder,
  event: TxTruthEventV1,
): TxTruthSnapshot {
  return recorder.record(event);
}
