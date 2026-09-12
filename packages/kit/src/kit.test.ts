import { describe, expect, it } from "vitest";
import { createTxTruthRecorder, deriveTxTruthPresentation } from "@txtruth/core";
import { reconcileTrackedTransaction, runTrackedTransaction } from "./index.js";

const clock = () => {
  let value = 0;
  return () => ++value;
};

const defaults = () => ({
  transaction: { id: "transaction" },
  messageHash: "hash",
  lifetime: { blockhash: "blockhash", lastValidBlockHeight: 100n },
  commitment: "confirmed" as const,
  now: clock(),
  sleep: async () => undefined,
  simulate: async () => ({ ok: true as const, logs: [] }),
  sign: async () => ({
    status: "signed" as const,
    signedTransaction: { bytes: "signed" },
    signature: "signature",
  }),
  send: async () => ({ status: "accepted" as const, signature: "signature" }),
  getBlockHeight: async () => 50n,
});

describe("runTrackedTransaction", () => {
  it("stops before signing after preflight failure", async () => {
    let signed = false;
    const snapshot = await runTrackedTransaction({
      ...defaults(),
      simulate: async () => ({
        ok: false,
        error: { code: "preflight", message: "Simulation failed" },
      }),
      sign: async () => {
        signed = true;
        return {
          status: "rejected" as const,
          error: { code: "unexpected", message: "unexpected" },
        };
      },
      getSignatureStatus: async () => null,
    });
    expect(signed).toBe(false);
    expect(deriveTxTruthPresentation(snapshot).outcome).toBe("preflight_failed");
  });

  it("preserves the local signature after RPC rejection", async () => {
    const snapshot = await runTrackedTransaction({
      ...defaults(),
      send: async () => ({
        status: "rejected",
        error: { code: "rpc_429", message: "Rate limited" },
      }),
      getSignatureStatus: async () => null,
      maxPolls: 1,
    });
    const presentation = deriveTxTruthPresentation(snapshot);
    expect(presentation.signature).toBe("signature");
    expect(presentation.outcome).toBe("indeterminate");
  });

  it("resolves a submitted transaction at required commitment", async () => {
    let polls = 0;
    const snapshot = await runTrackedTransaction({
      ...defaults(),
      getSignatureStatus: async () => {
        polls += 1;
        return polls === 1
          ? { commitment: "processed" as const }
          : { commitment: "confirmed" as const, slot: 42n };
      },
      maxPolls: 3,
    });
    expect(deriveTxTruthPresentation(snapshot).outcome).toBe("confirmed_success");
  });

  it("derives expiry when no signature status is observed", async () => {
    const snapshot = await runTrackedTransaction({
      ...defaults(),
      getSignatureStatus: async () => null,
      getBlockHeight: async () => 101n,
      maxPolls: 2,
    });
    expect(deriveTxTruthPresentation(snapshot).outcome).toBe(
      "expired_not_observed",
    );
  });

  it("reconciles a timed-out signature with later fee evidence", async () => {
    const initial = await runTrackedTransaction({
      ...defaults(),
      getSignatureStatus: async () => null,
      maxPolls: 1,
    });
    // Reconstruct the event stream through the public recorder to model a persisted report.
    const persisted = createTxTruthRecorder(initial.config);
    initial.events.forEach((event) => persisted.record(event));
    const snapshot = await reconcileTrackedTransaction({
      recorder: persisted,
      signature: "signature",
      commitment: "confirmed",
      getSignatureStatus: async () => ({ commitment: "confirmed", slot: 42n }),
      getFeeLamports: async () => 5_000n,
      now: () => 100,
    });
    const presentation = deriveTxTruthPresentation(snapshot);
    expect(presentation.outcome).toBe("confirmed_success");
    expect(presentation.feeLamports).toBe(5_000n);
  });
});
