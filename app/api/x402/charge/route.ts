import { NextResponse } from "next/server";
import { x402 } from "@/lib/chain/x402";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    caseId?: string;
    amount?: number;
  };
  if (!body.caseId || typeof body.amount !== "number") {
    return NextResponse.json(
      { error: "caseId and amount required" },
      { status: 400 },
    );
  }
  const receipt = await x402.charge({
    caseId: body.caseId,
    amount: body.amount,
  });
  return NextResponse.json(receipt);
}
