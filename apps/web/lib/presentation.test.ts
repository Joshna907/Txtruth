import { describe, expect, it } from "vitest";
import { recommendedScenarios, runScenario } from "@txtruth/testkit";
import { feeLabel, outcomeMeta, retryLabel } from "./presentation";

describe("presentation mapping", () => {
  it("covers every recommended outcome with user-facing guidance", () => {
    for (const scenario of recommendedScenarios) {
      const presentation = runScenario(scenario);
      expect(outcomeMeta(presentation.outcome).label).toBeTruthy();
      expect(feeLabel(presentation.feeImpact)).toBeTruthy();
      expect(retryLabel(presentation.retryPolicy)).toBeTruthy();
    }
  });

  it("marks timeout then success as a verified confirmation", () => {
    const scenario = recommendedScenarios.find((item) => item.id === "timeout-then-success");
    expect(scenario).toBeDefined();
    const presentation = runScenario(scenario!);
    expect(outcomeMeta(presentation.outcome)).toMatchObject({ tone: "mint" });
    expect(presentation.certainty).toBe("observed");
  });
});
