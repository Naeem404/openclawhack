/**
 * Public agent manifest. The ERC-8004 URI registered for RefundRex points
 * at this endpoint so any on-chain reader can resolve the agent's
 * capabilities, wallet, and x402 settings.
 */
import { NextResponse } from "next/server";
import { erc8004 } from "@/lib/chain/erc8004";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(erc8004.buildManifest(), {
    headers: { "cache-control": "no-store" },
  });
}
