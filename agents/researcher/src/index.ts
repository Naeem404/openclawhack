/**
 * Researcher Agent — specialist server.
 * Implements packet P01.
 *
 * Endpoints:
 *   GET  /                 → agent card JSON
 *   GET  /identity         → { agentId, address, network }
 *   GET  /bid?spec=…       → quote a price for the given spec
 *   POST /work             → x402-gated; on payment, performs research
 */
import "dotenv/config";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { PORTS, SKILLS, DEFAULT_PRICES } from "@herd/shared/constants";
import { type Bid } from "@herd/shared/types";
import { performResearch } from "./skill.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const card = JSON.parse(readFileSync(join(__dirname, "..", "agent-card.json"), "utf-8"));

const app = new Hono();

app.get("/", (c) => c.json(card));

app.get("/identity", (c) =>
  c.json({
    agentId: process.env.RESEARCHER_AGENT_ID ?? null,
    address: process.env.RESEARCHER_WALLET_ADDRESS ?? null,
    network: "goat-testnet3",
    skill: SKILLS.RESEARCH_WEB,
  }),
);

app.get("/bid", (c) => {
  // For MVP every spec gets the same price. v2 can scale price by spec complexity.
  const bid: Bid = {
    agentId: process.env.RESEARCHER_AGENT_ID ?? "0",
    agentAddress: (process.env.RESEARCHER_WALLET_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
    endpoint: `http://localhost:${PORTS.researcher}`,
    skill: SKILLS.RESEARCH_WEB,
    priceUsdc: "0.05",
    etaSec: 30,
  };
  return c.json(bid);
});

/**
 * POST /work — x402-gated.
 *
 * TODO(sub-agent P01):
 *   1. Wrap this route in x402-hono middleware so unpaid requests return 402.
 *      Config: { scheme: "exact", network: "goat-testnet3", asset: TOKENS.USDC,
 *                amount: DEFAULT_PRICES.research_web.toString(),
 *                payTo: process.env.RESEARCHER_WALLET_ADDRESS,
 *                facilitator: process.env.X402_FACILITATOR_URL }
 *   2. On X402_MODE=local, swap the facilitator out for a local-verify shim.
 *   3. After verifySettlement, call performResearch(body.spec).
 */
const WorkBodySchema = z.object({
  spec: z.object({
    topic: z.string().min(3),
    sources: z.number().int().min(1).max(10).default(3),
    _inputs: z.record(z.unknown()).optional(),
  }),
});

app.post("/work", async (c) => {
  // TODO: gate behind x402 middleware once SDK wiring is in.
  const parsed = WorkBodySchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ error: "invalid_spec", details: parsed.error.flatten() }, 400);
  }
  const artifact = await performResearch(parsed.data.spec);
  return c.json({ artifact });
});

const port = PORTS.researcher;
serve({ fetch: app.fetch, port });
console.log(`[researcher] listening on http://localhost:${port}`);
