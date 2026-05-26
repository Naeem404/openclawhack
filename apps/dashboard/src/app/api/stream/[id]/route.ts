/**
 * SSE proxy: GET /api/stream/:id  →  Foreman GET /jobs/:id/events.
 * Streams Server-Sent Events through to the browser.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: { id: string } },
): Promise<Response> {
  const foremanUrl = process.env.FOREMAN_URL ?? "http://localhost:3100";
  const upstream = await fetch(`${foremanUrl}/jobs/${ctx.params.id}/events`, {
    headers: { Accept: "text/event-stream" },
  });
  if (!upstream.ok || !upstream.body) {
    return new Response(
      `event: error\ndata: ${JSON.stringify({ error: "foreman_unreachable" })}\n\n`,
      {
        status: 502,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-store",
          Connection: "keep-alive",
        },
      },
    );
  }
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
