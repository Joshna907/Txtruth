import type { NormalizedError } from "./types.js";

export function normalizeError(error: unknown, fallbackCode = "unknown"): NormalizedError {
  if (error && typeof error === "object") {
    const candidate = error as {
      code?: unknown;
      message?: unknown;
      cause?: unknown;
    };
    return {
      code:
        typeof candidate.code === "string" || typeof candidate.code === "number"
          ? String(candidate.code)
          : fallbackCode,
      message:
        typeof candidate.message === "string"
          ? candidate.message
          : "An unknown error occurred.",
      ...(candidate.cause === undefined ? {} : { details: candidate.cause }),
    };
  }
  return {
    code: fallbackCode,
    message: typeof error === "string" ? error : "An unknown error occurred.",
  };
}
