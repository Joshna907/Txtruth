import { deriveTxTruthPresentation } from "./presentation.js";
import type {
  NormalizedError,
  TxTruthEventV1,
  TxTruthReportV1,
  TxTruthSnapshot,
  SerializedTxTruthEventV1,
} from "./types.js";

export type ReportPrivacyOptions = {
  shareable?: boolean;
  includeSignature?: boolean;
  generatedAt?: number;
};

const stripSecrets = (value: string): string =>
  value
    .replace(/(https?:\/\/[^\s?]+)\?[^\s]+/gi, "$1?[redacted]")
    .replace(/Bearer\s+[A-Za-z0-9._~+\/-]+=*/gi, "Bearer [redacted]")
    .replace(/(api[_-]?key\s*[=:]\s*)[^\s,;]+/gi, "$1[redacted]");

function sanitizeUnknown(value: unknown): unknown {
  if (typeof value === "string") return stripSecrets(value);
  if (Array.isArray(value)) return value.map(sanitizeUnknown);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, sanitizeUnknown(item)]),
    );
  }
  return value;
}

function toJsonSafe(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(toJsonSafe);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, toJsonSafe(item)]),
    );
  }
  return value;
}

function sanitizeError(error: NormalizedError): NormalizedError {
  return {
    code: stripSecrets(error.code),
    message: stripSecrets(error.message),
    ...(error.details === undefined
      ? {}
      : { details: sanitizeUnknown(error.details) }),
  };
}

function sanitizeEvent(
  event: TxTruthEventV1,
  includeSignature: boolean,
): TxTruthEventV1 {
  switch (event.type) {
    case "wallet_signed":
    case "signature_tracked":
    case "submission_accepted":
      return includeSignature ? { ...event } : { ...event, signature: "[redacted]" };
    case "signature_observed":
      return {
        ...event,
        signature: includeSignature ? event.signature : "[redacted]",
        ...(event.error ? { error: sanitizeError(event.error) } : {}),
      };
    case "simulation_failed":
    case "simulation_unavailable":
      return { ...event, error: sanitizeError(event.error) };
    case "wallet_rejected":
    case "submission_failed":
      return { ...event, error: sanitizeError(event.error) };
    default:
      return { ...event };
  }
}

export function serializeTxTruthReport(
  snapshot: TxTruthSnapshot,
  options: ReportPrivacyOptions = {},
): TxTruthReportV1 {
  const includeSignature = options.includeSignature ?? !options.shareable;
  const presentation = deriveTxTruthPresentation(snapshot);
  const events = snapshot.events.map(
    (event) =>
      toJsonSafe(
        sanitizeEvent(event, includeSignature),
      ) as SerializedTxTruthEventV1,
  );
  const { explorerUrl: _explorerUrl, ...presentationWithoutExplorer } = presentation;
  const sanitizedPresentation = {
    ...(presentation.signature && !includeSignature
      ? { ...presentationWithoutExplorer, signature: "[redacted]" }
      : presentation),
    evidence: presentation.evidence.map((item) => ({
      ...item,
      summary: stripSecrets(item.summary),
    })),
  };

  return {
    schemaVersion: 1,
    generatedAt:
      options.generatedAt ?? snapshot.events.at(-1)?.at ?? Date.now(),
    redacted: !includeSignature || Boolean(options.shareable),
    config: {
      ...snapshot.config,
      ...(snapshot.config.explorerBaseUrl
        ? { explorerBaseUrl: stripSecrets(snapshot.config.explorerBaseUrl) }
        : {}),
    },
    presentation: sanitizedPresentation,
    events,
  };
}

export function validateTxTruthReport(value: unknown): value is TxTruthReportV1 {
  if (!value || typeof value !== "object") return false;
  const report = value as Partial<TxTruthReportV1>;
  if (
    report.schemaVersion !== 1 ||
    typeof report.generatedAt !== "number" ||
    typeof report.redacted !== "boolean" ||
    !report.config ||
    !report.presentation ||
    !Array.isArray(report.events)
  ) {
    return false;
  }
  return (
    typeof report.config.cluster === "string" &&
    typeof report.config.requiredCommitment === "string" &&
    typeof report.presentation.outcome === "string" &&
    Array.isArray(report.presentation.evidence) &&
    report.events.every(
      (event) =>
        Boolean(event) &&
        typeof event === "object" &&
        typeof (event as { type?: unknown }).type === "string" &&
        typeof (event as { at?: unknown }).at === "number",
    )
  );
}
