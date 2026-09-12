import { NextResponse } from "next/server";
import {
  inspectSolanaSignature,
  type InspectableCluster,
} from "@/lib/solana-rpc";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { signature?: unknown; cluster?: unknown };
    if (body.cluster !== undefined && body.cluster !== "devnet") {
      return NextResponse.json({ error: "TxTruth MVP supports Devnet only." }, { status: 400 });
    }
    const cluster: InspectableCluster = "devnet";
    if (typeof body.signature !== "string") {
      return NextResponse.json({ error: "A transaction signature is required." }, { status: 400 });
    }
    const result = await inspectSolanaSignature({ signature: body.signature, cluster });
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
