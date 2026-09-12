import {
  createTxTruthRecorder,
  deriveTxTruthPresentation,
  type RecorderConfig,
  type TxTruthEventV1,
  type TxTruthOutcome,
  type TxTruthPresentation,
} from "@txtruth/core";

export type ScenarioId =
  | "wallet-rejection"
  | "preflight-failure"
  | "rpc-rejection"
  | "timeout-then-success"
  | "blockhash-expiry"
  | "execution-failure"
  | "confirmed-success";

export type TxTruthScenario = {
  id: ScenarioId;
  name: string;
  events: readonly TxTruthEventV1[];
  expectedOutcome: TxTruthOutcome;
};

export type TxUiSnapshot = {
  claim: "pending" | "success" | "failure" | "cancelled" | "unknown";
  retryAction: "none" | "retry_same" | "rebuild" | "check_status";
  signatureVisible: boolean;
  feeDisclosure: "none" | "charged" | "possible" | "unknown";
};

export type ConformanceViolation = {
  rule: string;
  expected: string;
  actual: string;
};

export type ScenarioConformanceResult = {
  scenarioId: ScenarioId;
  passed: boolean;
  presentation: TxTruthPresentation;
  violations: ConformanceViolation[];
};

export type ConformanceReportV1 = {
  schemaVersion: 1;
  passed: boolean;
  results: ScenarioConformanceResult[];
};

const error = (code: string, message: string) => ({ code, message });
const signature = "4TxTruthDeterministicSignature111111111111111111111111111111111";
const base = (messageHash: string): TxTruthEventV1[] => [
  { type: "transaction_created", at: 1, messageHash },
  {
    type: "blockhash_obtained",
    at: 2,
    blockhash: "TxTruthBlockhash11111111111111111111111111111",
    lastValidBlockHeight: 150n,
    commitment: "confirmed",
  },
];

export const recommendedScenarios: readonly TxTruthScenario[] = [
  {
    id: "wallet-rejection",
    name: "Wallet rejection",
    events: [
      ...base("wallet-rejection"),
      { type: "simulation_started", at: 3 },
      { type: "simulation_succeeded", at: 4, logs: [] },
      { type: "wallet_requested", at: 5, wallet: "Test Wallet" },
      {
        type: "wallet_rejected",
        at: 6,
        error: error("wallet_rejected", "User rejected the request"),
      },
    ],
    expectedOutcome: "cancelled_by_user",
  },
  {
    id: "preflight-failure",
    name: "Preflight simulation failure",
    events: [
      ...base("preflight-failure"),
      { type: "simulation_started", at: 3 },
      {
        type: "simulation_failed",
        at: 4,
        error: error("custom_program_error", "Instruction 2 failed"),
        logs: ["Program log: Instruction 2 failed"],
      },
    ],
    expectedOutcome: "preflight_failed",
  },
  {
    id: "rpc-rejection",
    name: "RPC rejection with a local signature",
    events: [
      ...base("rpc-rejection"),
      { type: "simulation_started", at: 3 },
      { type: "simulation_succeeded", at: 4, logs: [] },
      { type: "wallet_requested", at: 5 },
      { type: "wallet_signed", at: 6, signature },
      { type: "submission_started", at: 7 },
      {
        type: "submission_failed",
        at: 8,
        error: error("rpc_429", "RPC rate limit exceeded"),
      },
      { type: "confirmation_timed_out", at: 9 },
    ],
    expectedOutcome: "indeterminate",
  },
  {
    id: "timeout-then-success",
    name: "Confirmation timeout followed by success",
    events: [
      ...base("timeout-then-success"),
      { type: "simulation_started", at: 3 },
      { type: "simulation_succeeded", at: 4, logs: [] },
      { type: "wallet_requested", at: 5 },
      { type: "wallet_signed", at: 6, signature },
      { type: "submission_started", at: 7 },
      { type: "submission_accepted", at: 8, signature },
      { type: "confirmation_timed_out", at: 9 },
      {
        type: "signature_observed",
        at: 10,
        signature,
        commitment: "confirmed",
        slot: 42n,
      },
    ],
    expectedOutcome: "confirmed_success",
  },
  {
    id: "blockhash-expiry",
    name: "Blockhash expiry without observed status",
    events: [
      ...base("blockhash-expiry"),
      { type: "simulation_started", at: 3 },
      { type: "simulation_succeeded", at: 4, logs: [] },
      { type: "wallet_requested", at: 5 },
      { type: "wallet_signed", at: 6, signature },
      { type: "submission_started", at: 7 },
      { type: "submission_accepted", at: 8, signature },
      { type: "block_height_observed", at: 9, blockHeight: 151n },
    ],
    expectedOutcome: "expired_not_observed",
  },
  {
    id: "execution-failure",
    name: "Confirmed execution failure",
    events: [
      ...base("execution-failure"),
      { type: "simulation_started", at: 3 },
      { type: "simulation_succeeded", at: 4, logs: [] },
      { type: "wallet_requested", at: 5 },
      { type: "wallet_signed", at: 6, signature },
      { type: "submission_started", at: 7 },
      { type: "submission_accepted", at: 8, signature },
      {
        type: "signature_observed",
        at: 9,
        signature,
        commitment: "confirmed",
        error: error("instruction_error", "Program execution failed"),
      },
    ],
    expectedOutcome: "confirmed_execution_failure",
  },
  {
    id: "confirmed-success",
    name: "Confirmed success",
    events: [
      ...base("confirmed-success"),
      { type: "simulation_started", at: 3 },
      { type: "simulation_succeeded", at: 4, logs: [] },
      { type: "wallet_requested", at: 5 },
      { type: "wallet_signed", at: 6, signature },
      { type: "submission_started", at: 7 },
      { type: "submission_accepted", at: 8, signature },
      {
        type: "signature_observed",
        at: 9,
        signature,
        commitment: "confirmed",
      },
    ],
    expectedOutcome: "confirmed_success",
  },
] as const;

const config: RecorderConfig = {
  cluster: "devnet",
  requiredCommitment: "confirmed",
};

export function runScenario(
  scenario: TxTruthScenario,
  recorderConfig: RecorderConfig = config,
): TxTruthPresentation {
  const recorder = createTxTruthRecorder(recorderConfig);
  for (const event of scenario.events) recorder.record(event);
  return deriveTxTruthPresentation(recorder.snapshot());
}

export function runCoreConformanceSuite(
  scenarios: readonly TxTruthScenario[] = recommendedScenarios,
): ConformanceReportV1 {
  const results = scenarios.map((scenario): ScenarioConformanceResult => {
    const presentation = runScenario(scenario);
    const violations: ConformanceViolation[] = [];
    if (presentation.outcome !== scenario.expectedOutcome) {
      violations.push({
        rule: "expected-outcome",
        expected: scenario.expectedOutcome,
        actual: presentation.outcome,
      });
    }
    return {
      scenarioId: scenario.id,
      passed: violations.length === 0,
      presentation,
      violations,
    };
  });
  return {
    schemaVersion: 1,
    passed: results.every((result) => result.passed),
    results,
  };
}

function expectedUi(presentation: TxTruthPresentation): TxUiSnapshot {
  const claim: TxUiSnapshot["claim"] =
    presentation.outcome === "confirmed_success"
      ? "success"
      : presentation.outcome === "cancelled_by_user"
        ? "cancelled"
        : presentation.outcome === "indeterminate"
          ? "unknown"
          : presentation.outcome === "in_progress"
            ? "pending"
            : "failure";
  const retryAction: TxUiSnapshot["retryAction"] =
    presentation.retryPolicy === "rebuild_required" ||
    presentation.retryPolicy === "fix_input_then_rebuild" ||
    presentation.retryPolicy === "user_may_restart"
      ? "rebuild"
      : presentation.retryPolicy === "check_status_first"
        ? "check_status"
        : "none";
  const feeDisclosure: TxUiSnapshot["feeDisclosure"] =
    presentation.feeImpact === "fee_charged"
      ? "charged"
      : presentation.feeImpact === "fee_may_apply"
        ? "possible"
        : presentation.feeImpact === "unknown"
          ? "unknown"
          : "none";
  return {
    claim,
    retryAction,
    signatureVisible: Boolean(presentation.signature),
    feeDisclosure,
  };
}

export async function runUiConformanceSuite(options: {
  scenarios?: readonly TxTruthScenario[];
  startScenario(scenario: TxTruthScenario): Promise<void> | void;
  readUiSnapshot(scenario: TxTruthScenario): Promise<TxUiSnapshot> | TxUiSnapshot;
}): Promise<ConformanceReportV1> {
  const scenarios = options.scenarios ?? recommendedScenarios;
  const results: ScenarioConformanceResult[] = [];
  for (const scenario of scenarios) {
    await options.startScenario(scenario);
    const actual = await options.readUiSnapshot(scenario);
    const presentation = runScenario(scenario);
    const expected = expectedUi(presentation);
    const violations: ConformanceViolation[] = [];
    for (const key of Object.keys(expected) as (keyof TxUiSnapshot)[]) {
      if (actual[key] !== expected[key]) {
        violations.push({
          rule: `ui-${key}`,
          expected: String(expected[key]),
          actual: String(actual[key]),
        });
      }
    }
    results.push({
      scenarioId: scenario.id,
      passed: violations.length === 0,
      presentation,
      violations,
    });
  }
  return {
    schemaVersion: 1,
    passed: results.every((result) => result.passed),
    results,
  };
}
