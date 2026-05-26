import { NextResponse } from "next/server";
import { caseStore } from "@/lib/store/cases";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ cases: caseStore.list() });
}
