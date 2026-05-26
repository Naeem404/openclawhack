import { events } from "@/lib/store/events";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Replay recent log lines
      for (const line of events.recent(60)) {
        controller.enqueue(
          encoder.encode(`event: log\ndata: ${JSON.stringify(line)}\n\n`),
        );
      }
      const unsubscribe = events.subscribe((line) => {
        try {
          controller.enqueue(
            encoder.encode(`event: log\ndata: ${JSON.stringify(line)}\n\n`),
          );
        } catch {
          unsubscribe();
        }
      });

      // Heartbeat to keep the connection alive
      const hb = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keep-alive\n\n"));
        } catch {
          clearInterval(hb);
        }
      }, 15_000);
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
