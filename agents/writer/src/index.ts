/**
 * ColorVision Agent — PaidProof specialist server.
 *
 * Endpoints:
 *   GET  /                 → agent card JSON
 *   GET  /identity         → { agentId, address, network, skill }
 *   GET  /bid?spec=…       → quote a price for a verify.colorvision call
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
import { ColorVisionCriterionSchema, type Bid } from "@herd/shared/types";
import {
  build402Body,
  verifyPayment,
  encodeSettlementHeader,
  getX402Mode,
} from "@herd/shared/x402";
import { checkColorVision } from "./skill.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const card = JSON.parse(readFileSync(join(__dirname, "..", "agent-card.json"), "utf-8"));

const app = new Hono();

app.get("/", (c) => c.json(card));

app.get("/identity", (c) =>
  c.json({
    agentId: process.env.WRITER_AGENT_ID ?? null,
    address: process.env.WRITER_WALLET_ADDRESS ?? null,
    role: "specialist",
    network: process.env.CHAIN_TARGET ?? "localhost",
    skill: SKILLS.VERIFY_COLORVISION,
  }),
);

app.get("/bid", (c) => {
  const bid: Bid = {
    agentId: process.env.WRITER_AGENT_ID ?? "0",
    agentAddress: (process.env.WRITER_WALLET_ADDRESS || "0x0000000000000000000000000000000000000002") as `0x${string}`,
    endpoint: `http://localhost:${PORTS.writer}`,
    skill: SKILLS.VERIFY_COLORVISION,
    priceUsdc: "0.03",
    etaSec: 20,
  };
  return c.json(bid);
});

const WorkBodySchema = z.object({
  spec: z.object({
    criterion: ColorVisionCriterionSchema,
    deliverableUrl: z.string().min(5),
    deliverableHash: z.string().optional(),
    escrowJobId: z.string().optional(),
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
    DEFAULT_PRICES.verify_colorvision,
    "PaidProof ColorVision · verify.colorvision skill",
  );

  const header = c.req.header("x-payment");
  if (!header) {
    c.header("X-PAYMENT-REQUIRED", "1");
    return c.json(requirement, 402);
  }

  const verify = await verifyPayment(mode, header, requirement);
  if (!verify.ok) {
    console.warn(`[colorvision] payment rejected: ${verify.error}`);
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
    `[colorvision] paid work tx=${verify.settlement.txHash} colors=${parsed.data.spec.criterion.brandColors.join(",")}`,
  );
  const verdict = await checkColorVision(parsed.data.spec);
  c.header("X-PAYMENT-RESPONSE", encodeSettlementHeader(verify.settlement, requirement.network));
  return c.json({ verdict });
});

const port = PORTS.writer;
serve({ fetch: app.fetch, port });
console.log(`[colorvision] listening on http://localhost:${port}`);
