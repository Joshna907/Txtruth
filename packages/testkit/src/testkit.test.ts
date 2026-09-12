import { describe, expect, it } from "vitest";
import {
  recommendedScenarios,
  runCoreConformanceSuite,
  runUiConformanceSuite,
  type TxUiSnapshot,
} from "./index.js";

const truthfulSnapshots: Record<string, TxUiSnapshot> = {
  "wallet-rejection": {
    claim: "cancelled",
    retryAction: "rebuild",
    signatureVisible: false,
    feeDisclosure: "none",
  },
  "preflight-failure": {
    claim: "failure",
    retryAction: "rebuild",
    signatureVisible: false,
    feeDisclosure: "none",
  },
  "rpc-rejection": {
    claim: "unknown",
    retryAction: "check_status",
    signatureVisible: true,
    feeDisclosure: "unknown",
  },
  "timeout-then-success": {
    claim: "success",
    retryAction: "none",
    signatureVisible: true,
    feeDisclosure: "charged",
  },
  "blockhash-expiry": {
    claim: "failure",
    retryAction: "rebuild",
    signatureVisible: true,
    feeDisclosure: "unknown",
  },
  "execution-failure": {
    claim: "failure",
    retryAction: "rebuild",
    signatureVisible: true,
    feeDisclosure: "charged",
  },
  "confirmed-success": {
    claim: "success",
    retryAction: "none",
    signatureVisible: true,
    feeDisclosure: "charged",
  },
};

describe("TxTruth testkit", () => {
  it("passes all seven deterministic core scenarios", () => {
    const report = runCoreConformanceSuite();
    expect(report.results).toHaveLength(7);
    expect(report.passed).toBe(true);
  });

  it("accepts a truthful semantic UI", async () => {
    const report = await runUiConformanceSuite({
      startScenario: () => undefined,
      readUiSnapshot: (scenario) => truthfulSnapshots[scenario.id]!,
    });
    expect(report.passed).toBe(true);
  });

  it("detects a naive UI that labels every non-success as failure", async () => {
    const report = await runUiConformanceSuite({
      scenarios: recommendedScenarios,
      startScenario: () => undefined,
      readUiSnapshot: () => ({
        claim: "failure",
        retryAction: "retry_same",
        signatureVisible: false,
        feeDisclosure: "none",
      }),
    });
    expect(report.passed).toBe(false);
    expect(report.results.filter((result) => !result.passed).length).toBeGreaterThanOrEqual(4);
  });
});
