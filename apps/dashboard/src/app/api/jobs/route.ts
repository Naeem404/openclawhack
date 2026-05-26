/**
 * Proxy POST /api/jobs → Foreman POST /jobs.
 * Keeps the browser from needing to know the Foreman URL.
 */
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const foremanUrl = process.env.FOREMAN_URL ?? "http://localhost:3100";
  try {
    const body = await req.json();
    const upstream = await fetch(`${foremanUrl}/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({ error: "foreman_unreachable", details: message }, { status: 502 });
  }
}
