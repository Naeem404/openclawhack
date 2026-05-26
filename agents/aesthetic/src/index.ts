/**
 * AestheticJudge Agent — PaidProof specialist server.
 *
 * Endpoints:
 *   GET  /                 → agent card JSON
 *   GET  /identity         → { agentId, address, network, skill }
 *   GET  /bid?spec=…       → quote a price for a verify.aesthetic call
 *   POST /work             → x402-gated; on payment, returns a signed Verdict
 */
import "@herd/shared/env";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { PORTS, SKILLS, DEFAULT_PRICES } from "@herd/shared/constants";
import { AestheticCriterionSchema, type Bid } from "@herd/shared/types";
import {
  build402Body,
  verifyPayment,
  encodeSettlementHeader,
  getX402Mode,
} from "@herd/shared/x402";
import { judgeAesthetic } from "./skill.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const card = JSON.parse(readFileSync(join(__dirname, "..", "agent-card.json"), "utf-8"));

const app = new Hono();

app.get("/", (c) => c.json(card));

app.get("/identity", (c) =>
  c.json({
    agentId: process.env.AESTHETIC_AGENT_ID ?? null,
    address: process.env.AESTHETIC_WALLET_ADDRESS ?? null,
    role: "specialist",
    network: process.env.CHAIN_TARGET ?? "localhost",
    skill: SKILLS.VERIFY_AESTHETIC,
  }),
);

app.get("/bid", (c) => {
  const bid: Bid = {
    agentId: process.env.AESTHETIC_AGENT_ID ?? "0",
    agentAddress: (process.env.AESTHETIC_WALLET_ADDRESS || "0x0000000000000000000000000000000000000003") as `0x${string}`,
    endpoint: `http://localhost:${PORTS.aesthetic}`,
    skill: SKILLS.VERIFY_AESTHETIC,
    priceUsdc: "0.05",
    etaSec: 30,
  };
  return c.json(bid);
});

const WorkBodySchema = z.object({
  spec: z.object({
    criterion: AestheticCriterionSchema,
    deliverableUrl: z.string().min(5),
    deliverableHash: z.string().optional(),
    escrowJobId: z.string().optional(),
  }),
});

app.post("/work", async (c) => {
  const mode = getX402Mode();
  const envPayTo = process.env.AESTHETIC_WALLET_ADDRESS || undefined;
  if (!envPayTo && mode !== "mock") {
    return c.json({ error: "agent_not_configured", code: "NO_PAYTO" }, 500);
  }
  const payTo = envPayTo ?? "0x0000000000000000000000000000000000000003";
  const requirement = build402Body(
    payTo,
    DEFAULT_PRICES.verify_aesthetic,
    "PaidProof AestheticJudge · verify.aesthetic skill",
  );

  const header = c.req.header("x-payment");
  if (!header) {
    c.header("X-PAYMENT-REQUIRED", "1");
    return c.json(requirement, 402);
  }

  const verify = await verifyPayment(mode, header, requirement);
  if (!verify.ok) {
    console.warn(`[aesthetic] payment rejected: ${verify.error}`);
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
    `[aesthetic] paid work tx=${verify.settlement.txHash} prompt="${parsed.data.spec.criterion.prompt.slice(0, 60)}"`,
  );
  const verdict = await judgeAesthetic(parsed.data.spec);
  c.header("X-PAYMENT-RESPONSE", encodeSettlementHeader(verify.settlement, requirement.network));
  return c.json({ verdict });
});

const port = PORTS.aesthetic;
serve({ fetch: app.fetch, port });
console.log(`[aesthetic] listening on http://localhost:${port}`);
