/**
 * Proxy: GET /api/agents/:name  →  <agent>/identity.
 * Allows the dashboard to read each agent's identity without CORS pain.
 */
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AGENT_URLS: Record<string, string> = {
  foreman: process.env.FOREMAN_URL ?? "http://localhost:3100",
  researcher: process.env.RESEARCHER_URL ?? "http://localhost:3101",
  writer: process.env.WRITER_URL ?? "http://localhost:3102",
};

export async function GET(
  _req: Request,
  ctx: { params: { name: string } },
): Promise<Response> {
  const base = AGENT_URLS[ctx.params.name];
  if (!base) {
    return NextResponse.json({ error: "unknown_agent" }, { status: 404 });
  }
  try {
    const r = await fetch(`${base}/identity`, { cache: "no-store" });
    const text = await r.text();
    return new NextResponse(text, {
      status: r.status,
      headers: { "Content-Type": r.headers.get("content-type") ?? "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json(
      { error: "agent_unreachable", details: message },
      { status: 502 },
    );
  }
}
