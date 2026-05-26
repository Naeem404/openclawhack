import { NextResponse } from "next/server";
import { demoRunner } from "@/lib/demo/runner";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { slug?: string };
  if (!body.slug)
    return NextResponse.json({ error: "slug required" }, { status: 400 });

  // Fire & forget — agent loop emits to the SSE stream
  demoRunner.run(body.slug).catch((e) => {
    console.error("demo runner failed", e);
  });

  return NextResponse.json({ ok: true, slug: body.slug });
}

export async function GET() {
  return NextResponse.json({ scenarios: demoRunner.list() });
}
