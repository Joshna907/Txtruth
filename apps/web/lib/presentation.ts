import type {
  RetryPolicy,
  TxTruthOutcome,
  TxTruthPresentation,
} from "@txtruth/core";

export type OutcomeTone = "mint" | "amber" | "red" | "muted";

export type OutcomeMeta = {
  label: string;
  shortLabel: string;
  tone: OutcomeTone;
};

export function outcomeMeta(outcome: TxTruthOutcome): OutcomeMeta {
  switch (outcome) {
    case "in_progress":
      return { label: "Transaction in progress", shortLabel: "In progress", tone: "amber" };
    case "cancelled_by_user":
      return { label: "Cancelled by user", shortLabel: "Cancelled", tone: "muted" };
    case "preflight_failed":
      return { label: "Preflight failed", shortLabel: "Preflight failed", tone: "red" };
    case "confirmed_success":
      return { label: "Confirmed success", shortLabel: "Confirmed", tone: "mint" };
    case "confirmed_execution_failure":
      return { label: "Confirmed execution failure", shortLabel: "Execution failed", tone: "red" };
    case "expired_not_observed":
      return { label: "Expired, not observed", shortLabel: "Expired", tone: "amber" };
    case "indeterminate":
      return { label: "Outcome unknown", shortLabel: "Indeterminate", tone: "amber" };
    default: {
      const exhaustive: never = outcome;
      return exhaustive;
    }
  }
}

export function certaintyLabel(certainty: TxTruthPresentation["certainty"]): string {
  switch (certainty) {
    case "observed":
      return "Observed on-chain";
    case "derived":
      return "Derived from evidence";
    case "unknown":
      return "Not yet provable";
  }
}

export function feeLabel(fee: TxTruthPresentation["feeImpact"]): string {
  switch (fee) {
    case "none":
      return "No network fee";
    case "fee_may_apply":
      return "Fee may apply";
    case "fee_charged":
      return "Fee charged";
    case "unknown":
      return "Fee unknown";
  }
}

export function retryLabel(policy: RetryPolicy): string {
  switch (policy) {
    case "none":
      return "No retry needed";
    case "user_may_restart":
      return "User may restart";
    case "fix_input_then_rebuild":
      return "Fix input, then rebuild";
    case "rebuild_required":
      return "Rebuild required";
    case "check_status_first":
      return "Check status first";
    case "manual_review":
      return "Review manually";
  }
}

export function naiveClaim(outcome: TxTruthOutcome): { title: string; detail: string } {
  switch (outcome) {
    case "confirmed_success":
      return { title: "Transaction failed", detail: "The confirmation request timed out." };
    case "cancelled_by_user":
      return { title: "Transaction failed", detail: "The wallet request was rejected." };
    case "preflight_failed":
      return { title: "Something went wrong", detail: "Please try again." };
    case "confirmed_execution_failure":
      return { title: "Transaction failed", detail: "No fee was charged." };
    case "expired_not_observed":
      return { title: "Try again", detail: "Resubmit the same transaction." };
    case "indeterminate":
      return { title: "Transaction failed", detail: "The RPC request did not complete." };
    case "in_progress":
      return { title: "Still loading", detail: "There is no safe next step yet." };
    default: {
      const exhaustive: never = outcome;
      return exhaustive;
    }
  }
}

export function safeJson(value: unknown): string {
  return JSON.stringify(value, (_key, item) => (typeof item === "bigint" ? item.toString() : item), 2);
}
