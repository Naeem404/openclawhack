/**
 * POST /api/escrow/fund
 *
 * Synthesises an escrow funding event for the demo. In `X402_MODE=mock` (the
 * default), this just returns a fresh job id + fake tx hash so the dashboard
 * can advance the demo without on-chain interaction. In `local` mode the
 * dashboard ought to be wired to a real wallet — that path is left as a TODO
 * because it requires a browser wallet integration outside the MVP scope.
 *
 * The Lead Verifier is the only wallet authorised to release escrow, so this
 * route deliberately does NOT need a deployer key; it's purely a UX shim.
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
  amountUsdc?: string;
  criteria?: unknown[];
}

/** A small in-process counter so escrowJobId increments across demo runs. */
let nextEscrowJobId = 1;

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as Body;

  if (!body.amountUsdc || !Array.isArray(body.criteria) || body.criteria.length === 0) {
    return NextResponse.json(
      { error: "invalid_body", message: "amountUsdc + criteria[] required" },
      { status: 400 },
    );
  }

  // TODO(real-chain mode): wire viem + CLIENT_PRIVATE_KEY to call
  //   Escrow.createJob(freelancer, amount, criteriaURI, deadline, verifierAgentId)
  //   ERC20.approve(escrow, amount)
  //   Escrow.fund(jobId)
  // and return the actual receipt. For MVP demo we synthesise the receipt:
  const escrowJobId = String(nextEscrowJobId++);
  const txHash = fakeTxHash(`fund:${escrowJobId}:${body.amountUsdc}`);

  return NextResponse.json({
    escrowJobId,
    amountUsdc: body.amountUsdc,
    txHash,
    network: process.env.CHAIN_TARGET ?? "localhost",
  });
}
