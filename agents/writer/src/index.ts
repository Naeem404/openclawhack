/**
 * Writer Agent — specialist server.
 * Implements packet P02.
 *
 * Endpoints:
 *   GET  /                 → agent card JSON
 *   GET  /identity         → { agentId, address, network }
 *   GET  /bid?spec=…       → quote a price
 *   POST /work             → x402-gated; on payment, writes a markdown brief
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
import { writeBrief } from "./skill.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const card = JSON.parse(readFileSync(join(__dirname, "..", "agent-card.json"), "utf-8"));

const app = new Hono();

app.get("/", (c) => c.json(card));

app.get("/identity", (c) =>
  c.json({
    agentId: process.env.WRITER_AGENT_ID ?? null,
    address: process.env.WRITER_WALLET_ADDRESS ?? null,
    network: "goat-testnet3",
    skill: SKILLS.WRITE_BRIEF,
  }),
);

app.get("/bid", (c) => {
  const bid: Bid = {
    agentId: process.env.WRITER_AGENT_ID ?? "0",
    agentAddress: (process.env.WRITER_WALLET_ADDRESS || "0x0000000000000000000000000000000000000002") as `0x${string}`,
    endpoint: `http://localhost:${PORTS.writer}`,
    skill: SKILLS.WRITE_BRIEF,
    priceUsdc: "0.08",
    etaSec: 30,
  };
  return c.json(bid);
});

const WorkBodySchema = z.object({
  spec: z.object({
    topic: z.string().min(3),
    targetWords: z.number().int().min(50).max(2000).default(300),
    _inputs: z.record(z.unknown()).optional(),
  }),
});

app.post("/work", async (c) => {
  const mode = getX402Mode();
  const envPayTo = process.env.WRITER_WALLET_ADDRESS || undefined;
  if (!envPayTo && mode !== "mock") {
    return c.json({ error: "agent_not_configured", code: "NO_PAYTO" }, 500);
  }
  const payTo = envPayTo ?? "0x0000000000000000000000000000000000000002";
  const requirement = build402Body(
    payTo,
    DEFAULT_PRICES.write_brief,
    "HERD writer · write.brief skill",
  );

  const header = c.req.header("x-payment");
  if (!header) {
    c.header("X-PAYMENT-REQUIRED", "1");
    return c.json(requirement, 402);
  }

  const verify = await verifyPayment(mode, header, requirement);
  if (!verify.ok) {
    console.warn(`[writer] payment rejected: ${verify.error}`);
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
    `[writer] paid work tx=${verify.settlement.txHash} topic="${parsed.data.spec.topic}"`,
  );
  const artifact = await writeBrief(parsed.data.spec);
  c.header("X-PAYMENT-RESPONSE", encodeSettlementHeader(verify.settlement, requirement.network));
  return c.json({ artifact });
});

const port = PORTS.writer;
serve({ fetch: app.fetch, port });
console.log(`[writer] listening on http://localhost:${port}`);
