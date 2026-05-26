import { NextResponse } from "next/server";
import { chainStore } from "@/lib/store/chain";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ events: chainStore.listEvents(80) });
}
