/**
 * Lead Verifier — orchestrator entry point.
 *
 * Endpoints:
 *   GET  /                     → agent card (PaidProof Lead Verifier)
 *   GET  /identity             → { agentId, address, network, role }
 *   POST /jobs                 → submit a verification job (criteria + deliverable URL)
 *   GET  /jobs/:id/events      → SSE stream of SwarmEvents
 *   GET  /jobs/:id             → final JobResult once completed
 *   GET  /escrow               → escrow + registry addresses for dashboard
 */
import "@herd/shared/env";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { PORTS, type JobResult } from "@herd/shared";
import { JobRequestSchema, type SwarmEvent } from "@herd/shared/types";
import { createEventBus } from "./sse.js";
import { runJob } from "./run.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cardPath = join(__dirname, "..", "agent-card.json");
const agentCard = JSON.parse(readFileSync(cardPath, "utf-8"));

const app = new Hono();
const bus = createEventBus();
const jobs = new Map<string, JobResult>(); // completed jobs cache

app.get("/", (c) => c.json(agentCard));

app.get("/identity", (c) =>
  c.json({
    agentId: process.env.FOREMAN_AGENT_ID ?? null,
    address: process.env.FOREMAN_WALLET_ADDRESS ?? null,
    role: "lead-verifier",
    network: process.env.CHAIN_TARGET ?? "localhost",
  }),
);

app.get("/escrow", (c) =>
  c.json({
    network: process.env.CHAIN_TARGET ?? "localhost",
    registry: process.env.PAIDPROOF_REGISTRY_ADDRESS ?? null,
    escrow: process.env.PAIDPROOF_ESCROW_ADDRESS ?? null,
    usdc: process.env.PAIDPROOF_USDC_ADDRESS ?? null,
    verifierAgentId: process.env.FOREMAN_AGENT_ID ?? null,
    verifierAddress: process.env.FOREMAN_WALLET_ADDRESS ?? null,
  }),
);

app.post("/jobs", async (c) => {
  const body = await c.req.json();
  const parsed = JobRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_request", details: parsed.error.flatten() }, 400);
  }
  const jobId = randomUUID();
  const emit = (e: SwarmEvent) => bus.publish(jobId, e);

  // Fire-and-forget; results stream via SSE.
  runJob(jobId, parsed.data, emit)
    .then((result) => {
      jobs.set(jobId, result);
    })
    .catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      emit({ type: "job.failed", jobId, error: msg, at: Date.now() });
    });

  return c.json({ jobId }, 202);
});

app.get("/jobs/:id/events", (c) => {
  const jobId = c.req.param("id");
  c.header("Content-Type", "text/event-stream");
  c.header("Cache-Control", "no-store");
  c.header("Connection", "keep-alive");
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(controller) {
        let closed = false;
        let unsubscribe: (() => void) | undefined;
        unsubscribe = bus.subscribe(jobId, (e) => {
          if (closed) return;
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
          } catch {
            closed = true;
            unsubscribe?.();
            return;
          }
          if (e.type === "job.completed" || e.type === "job.failed") {
            closed = true;
            try {
              controller.close();
            } catch {
              // already closed
            }
            unsubscribe?.();
          }
        });
      },
    }),
    {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-store",
        Connection: "keep-alive",
      },
    },
  );
});

app.get("/jobs/:id", (c) => {
  const jobId = c.req.param("id");
  const result = jobs.get(jobId);
  if (!result) return c.json({ error: "not_found_or_in_progress" }, 404);
  return c.json(result);
});

const port = PORTS.foreman;
serve({ fetch: app.fetch, port });
console.log(`[foreman] listening on http://localhost:${port}`);
