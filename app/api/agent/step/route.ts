import { NextResponse } from "next/server";
import { orchestrator } from "@/lib/agent/orchestrator";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const caseId = body?.caseId as string | undefined;
  if (!caseId) return NextResponse.json({ error: "caseId required" }, { status: 400 });
  const result = await orchestrator.step(caseId);
  return NextResponse.json(result);
}
