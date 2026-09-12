import { NextResponse } from "next/server";
import {
  inspectSolanaSignature,
  type InspectableCluster,
} from "@/lib/solana-rpc";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Request body must be a JSON object." }, { status: 400 });
  }

  try {
    const input = body as { signature?: unknown; cluster?: unknown };
    if (input.cluster !== undefined && input.cluster !== "devnet") {
      return NextResponse.json({ error: "TxTruth MVP supports Devnet only." }, { status: 400 });
    }
    const cluster: InspectableCluster = "devnet";
    if (typeof input.signature !== "string") {
      return NextResponse.json({ error: "A transaction signature is required." }, { status: 400 });
    }
    const result = await inspectSolanaSignature({ signature: input.signature, cluster });
    const jsonSafe = JSON.parse(
      JSON.stringify(result, (_key, value) =>
        typeof value === "bigint" ? value.toString() : value,
      ),
    );
    return NextResponse.json(jsonSafe, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to inspect this transaction.";
    const status = message.startsWith("Enter a valid") ? 400 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
