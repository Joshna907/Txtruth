import { describe, expect, it } from "vitest";
import {
  createTxTruthRecorder,
  deriveTxTruthPresentation,
  serializeTxTruthReport,
  validateTxTruthReport,
} from "./index.js";

const signature = "test-signature";

function submittedRecorder() {
  const recorder = createTxTruthRecorder({
    cluster: "devnet",
    requiredCommitment: "confirmed",
  });
  recorder.record({ type: "transaction_created", at: 1, messageHash: "hash" });
  recorder.record({
    type: "blockhash_obtained",
    at: 2,
    blockhash: "blockhash",
    lastValidBlockHeight: 100n,
    commitment: "confirmed",
  });
  recorder.record({ type: "simulation_started", at: 3 });
  recorder.record({ type: "simulation_succeeded", at: 4, logs: [] });
  recorder.record({ type: "wallet_requested", at: 5 });
  recorder.record({ type: "wallet_signed", at: 6, signature });
  recorder.record({ type: "submission_started", at: 7 });
  recorder.record({ type: "submission_accepted", at: 8, signature });
  return recorder;
}

describe("TxTruth recorder and presentation", () => {
  it("requires transaction_created to be the first event", () => {
    const recorder = createTxTruthRecorder({
      cluster: "devnet",
      requiredCommitment: "confirmed",
    });
    expect(() =>
      recorder.record({ type: "simulation_started", at: 1 }),
    ).toThrow(/first TxTruth event/);
  });

  it("rejects mixed transaction signatures", () => {
    const recorder = submittedRecorder();
    expect(() =>
      recorder.record({
        type: "signature_observed",
        at: 9,
        signature: "different-signature",
        commitment: "confirmed",
      }),
    ).toThrow(/different signatures/);
  });

  it("does not treat a confirmation timeout as failure", () => {
    const recorder = submittedRecorder();
    recorder.record({ type: "confirmation_timed_out", at: 9 });
    const presentation = deriveTxTruthPresentation(recorder.snapshot());
    expect(presentation.outcome).toBe("indeterminate");
    expect(presentation.retryPolicy).toBe("check_status_first");
  });

  it("allows observed success to resolve a previous timeout", () => {
    const recorder = submittedRecorder();
    recorder.record({ type: "confirmation_timed_out", at: 9 });
    recorder.record({
      type: "signature_observed",
      at: 10,
      signature,
      commitment: "confirmed",
    });
    const presentation = deriveTxTruthPresentation(recorder.snapshot());
    expect(presentation.outcome).toBe("confirmed_success");
    expect(presentation.certainty).toBe("observed");
  });

  it("derives expiry only after the last valid block height", () => {
    const recorder = submittedRecorder();
    recorder.record({ type: "block_height_observed", at: 9, blockHeight: 101n });
    const presentation = deriveTxTruthPresentation(recorder.snapshot());
    expect(presentation.outcome).toBe("expired_not_observed");
    expect(presentation.retryPolicy).toBe("rebuild_required");
  });

  it("reports execution failure and fee impact", () => {
    const recorder = submittedRecorder();
    recorder.record({
      type: "signature_observed",
      at: 9,
      signature,
      commitment: "processed",
      error: { code: "instruction_error", message: "Instruction failed" },
    });
    const presentation = deriveTxTruthPresentation(recorder.snapshot());
    expect(presentation.outcome).toBe("confirmed_execution_failure");
    expect(presentation.feeImpact).toBe("fee_charged");
  });

  it("creates deterministic privacy-safe shareable reports", () => {
    const recorder = submittedRecorder();
    recorder.record({ type: "confirmation_timed_out", at: 9 });
    const report = serializeTxTruthReport(recorder.snapshot(), {
      shareable: true,
      generatedAt: 123,
    });
    expect(report.generatedAt).toBe(123);
    expect(report.redacted).toBe(true);
    expect(report.presentation.signature).toBe("[redacted]");
    expect(report.presentation.explorerUrl).toBeUndefined();
    expect(validateTxTruthReport(report)).toBe(true);
    expect(() => JSON.stringify(report)).not.toThrow();
  });

  it("derives a live tracked signature with its exact network fee", () => {
    const recorder = createTxTruthRecorder({
      cluster: "devnet",
      requiredCommitment: "confirmed",
    });
    recorder.record({ type: "transaction_created", at: 1, messageHash: "external" });
    recorder.record({ type: "signature_tracked", at: 2, signature });
    recorder.record({
      type: "signature_observed",
      at: 3,
      signature,
      commitment: "finalized",
      slot: 42n,
      feeLamports: 5_000n,
    });
    const presentation = deriveTxTruthPresentation(recorder.snapshot());
    expect(presentation.outcome).toBe("confirmed_success");
    expect(presentation.signature).toBe(signature);
    expect(presentation.feeLamports).toBe(5_000n);
  });

  it("retains earlier exact fee evidence when commitment advances", () => {
    const recorder = submittedRecorder();
    recorder.record({
      type: "signature_observed",
      at: 9,
      signature,
      commitment: "processed",
      feeLamports: 5_000n,
    });
    recorder.record({
      type: "signature_observed",
      at: 10,
      signature,
      commitment: "confirmed",
    });
    expect(deriveTxTruthPresentation(recorder.snapshot()).feeLamports).toBe(5_000n);
  });
});
