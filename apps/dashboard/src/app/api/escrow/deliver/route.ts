/**
 * POST /api/escrow/deliver
 *
 * Mirrors the freelancer signing `Escrow.markDelivered(jobId, deliverableURI)`.
 * In mock mode it just confirms back with a synthesised tx hash so the UI can
 * surface the event.
 */
import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fakeTxHash(seed: string): string {
  const buf = randomBytes(28).toString("hex");
  return "0x" + Buffer.from(seed).toString("hex").slice(0, 8).padEnd(8, "0") + buf;
}

interface Body {
  escrowJobId?: string;
  deliverableUrl?: string;
}

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as Body;
  if (!body.escrowJobId) {
    return NextResponse.json({ error: "invalid_body", message: "escrowJobId required" }, { status: 400 });
  }
  const txHash = fakeTxHash(`deliver:${body.escrowJobId}`);
  return NextResponse.json({
    escrowJobId: body.escrowJobId,
    txHash,
    network: process.env.CHAIN_TARGET ?? "localhost",
  });
}
