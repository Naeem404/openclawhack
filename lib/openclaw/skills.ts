/**
 * Skill registration for RefundRex.
 * Maps OpenClaw skill names → handlers backed by chain wrappers + merchant API.
 */
import { runtime } from "@/lib/openclaw/runtime";
import { erc8004 } from "@/lib/chain/erc8004";
import { x402 } from "@/lib/chain/x402";
import { agentkit } from "@/lib/chain/agentkit";
import { wallet } from "@/lib/chain/wallet";
import { merchantApi } from "@/lib/merchant/mock";
import { emailService } from "@/lib/merchant/email";
import { classifyIssue } from "@/lib/agent/classifier";
import { draftSupportMessage, parseMerchantReply } from "@/lib/merchant/parser";
import type { IssueCategory, Order, Shipment } from "@/lib/types";

let _registered = false;

export function ensureSkillsRegistered() {
  if (_registered) return;
  _registered = true;

  runtime.register({
    name: "track_shipment",
    description: "Fetch latest shipment status from carrier APIs.",
    version: "1.0.0",
    handler: async (input: { tracking: string; carrier: string }) => {
      return merchantApi.trackShipment(input.tracking, input.carrier);
    },
  });

  runtime.register({
    name: "classify_issue",
    description: "Classify a customer issue into an IssueCategory + severity.",
    version: "1.0.0",
    handler: async (input: { note: string; order: Order; shipment: Shipment }) => {
      return classifyIssue(input.note, input.order, input.shipment);
    },
  });

  runtime.register({
    name: "draft_support_email",
    description: "Generate a tone-aware support email tailored to category.",
    version: "1.0.0",
    handler: async (input: {
      order: Order;
      category: IssueCategory;
      tone?: "professional" | "firm" | "empathetic";
      attempt?: number;
    }) => draftSupportMessage(input.order, input.category, input.tone, input.attempt),
  });

  runtime.register({
    name: "send_support_email",
    description: "Send an outbound email to merchant support and store thread.",
    version: "1.0.0",
    handler: async (input: {
      to: string;
      subject: string;
      body: string;
      orderId: string;
    }) => emailService.send(input),
  });

  runtime.register({
    name: "agent_to_agent",
    description: "POST a structured dispute payload to a merchant agent endpoint.",
    version: "1.0.0",
    handler: async (input: {
      merchantId: string;
      endpoint: string;
      payload: Record<string, unknown>;
    }) => merchantApi.contactAgent(input.merchantId, input.endpoint, input.payload),
  });

  runtime.register({
    name: "parse_merchant_reply",
    description: "Parse a merchant reply for refund decision + amount.",
    version: "1.0.0",
    handler: async (input: { body: string }) => parseMerchantReply(input.body),
  });

  runtime.register({
    name: "erc8004_register",
    description: "Register the agent on the ERC-8004 Trustless Agent registry.",
    version: "1.0.0",
    handler: async () => erc8004.register(),
  });

  runtime.register({
    name: "x402_settle",
    description: "Capture an x402 payment for a resolved dispute.",
    version: "1.0.0",
    handler: async (input: { caseId: string; amount: number; payer?: string }) =>
      x402.charge({
        caseId: input.caseId,
        amount: input.amount,
        from: input.payer,
      }),
  });

  runtime.register({
    name: "wallet_report",
    description: "Read-only wallet activity report via AgentKit.",
    version: "1.0.0",
    handler: async () => agentkit.walletReport(wallet.address()),
  });
}
