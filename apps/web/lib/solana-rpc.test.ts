import { describe, expect, it, vi } from "vitest";
import { inspectSolanaSignature, isSolanaSignature } from "./solana-rpc";

const signature = "4ReKprwf3WdLHRrzp4ctPWNBsQDPL3VZz3zMmoZfcGJMJCHh5Vq937mPdyxhCbw54wNnA6hZ7KfNpQdpt13yY7A9";

function response(result: unknown): Response {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("live Solana signature inspection", () => {
  it("validates base58 transaction signatures", () => {
    expect(isSolanaSignature(signature)).toBe(true);
    expect(isSolanaSignature("not-a-signature")).toBe(false);
  });

  it("derives a confirmed verdict and exact fee from RPC evidence", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response({
        value: [{ slot: 42, err: null, confirmationStatus: "finalized" }],
      }))
      .mockResolvedValueOnce(response({ slot: 42, meta: { err: null, fee: 5000 } }));

    const result = await inspectSolanaSignature({
      signature,
      cluster: "devnet",
      fetcher,
      now: () => 100,
    });

    expect(result.presentation.outcome).toBe("confirmed_success");
    expect(result.presentation.certainty).toBe("observed");
    expect(result.presentation.feeLamports).toBe(5000n);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("keeps an unobserved signature indeterminate", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response({ value: [null] }))
      .mockResolvedValueOnce(response(null));
    const result = await inspectSolanaSignature({
      signature,
      cluster: "devnet",
      fetcher,
      now: () => 100,
    });
    expect(result.presentation.outcome).toBe("indeterminate");
    expect(result.presentation.retryPolicy).toBe("check_status_first");
  });
});
