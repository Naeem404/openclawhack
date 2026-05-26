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
import "@herd/shared/env";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { PORTS, SKILLS, DEFAULT_PRICES } from "@herd/shared/constants";
import { type Bid } from "@herd/shared/types";
import {
  build402Body,
  verifyPayment,
  encodeSettlementHeader,
  getX402Mode,
} from "@herd/shared/x402";
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
    agentAddress: (process.env.RESEARCHER_WALLET_ADDRESS || "0x0000000000000000000000000000000000000001") as `0x${string}`,
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
 * Verifies payment via X-PAYMENT header, then performs research.
 */
const WorkBodySchema = z.object({
  spec: z.object({
    topic: z.string().min(3),
    sources: z.number().int().min(1).max(10).default(3),
    _inputs: z.record(z.unknown()).optional(),
  }),
});

app.post("/work", async (c) => {
  const mode = getX402Mode();
  const envPayTo = process.env.RESEARCHER_WALLET_ADDRESS || undefined;
  if (!envPayTo && mode !== "mock") {
    return c.json({ error: "agent_not_configured", code: "NO_PAYTO" }, 500);
  }
  const payTo = envPayTo ?? "0x0000000000000000000000000000000000000001";
  const requirement = build402Body(
    payTo,
    DEFAULT_PRICES.research_web,
    "HERD researcher · research.web skill",
  );

  const header = c.req.header("x-payment");
  if (!header) {
    c.header("X-PAYMENT-REQUIRED", "1");
    return c.json(requirement, 402);
  }

  const verify = await verifyPayment(mode, header, requirement);
  if (!verify.ok) {
    console.warn(`[researcher] payment rejected: ${verify.error}`);
    return c.json(
      { error: "payment_verification_failed", code: "INVALID_PAYMENT", details: verify.error },
      402,
    );
  }

  const parsed = WorkBodySchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ error: "invalid_spec", code: "BAD_SPEC", details: parsed.error.flatten() }, 400);
  }

  console.log(
    `[researcher] paid work tx=${verify.settlement.txHash} topic="${parsed.data.spec.topic}"`,
  );
  const artifact = await performResearch(parsed.data.spec);
  c.header("X-PAYMENT-RESPONSE", encodeSettlementHeader(verify.settlement, requirement.network));
  return c.json({ artifact });
});

const port = PORTS.researcher;
serve({ fetch: app.fetch, port });
console.log(`[researcher] listening on http://localhost:${port}`);
