/**
 * Tone-aware merchant email drafting + reply parsing.
 *
 * Drafting is deterministic and template-driven so the demo doesn't depend
 * on an LLM key. If LLM_PROVIDER is set we route through lib/agent/llm.ts.
 */
import type { IssueCategory, Order } from "@/lib/types";

const subjectByCategory: Record<IssueCategory, string> = {
  delayed_shipment: "Delayed Shipment — Order {orderId}",
  damaged_item: "Damaged Item Reported — Order {orderId}",
  wrong_item: "Wrong Item Received — Order {orderId}",
  missing_item: "Missing Items in Order {orderId}",
  never_delivered: "Non-Delivery Inquiry — Order {orderId}",
  defective: "Defective Product — Order {orderId}",
  billing_error: "Billing Discrepancy — Order {orderId}",
  other: "Customer Support Request — Order {orderId}",
};

const openingByTone = {
  professional:
    "I'm reaching out on behalf of {customerName} regarding order {orderId}.",
  empathetic:
    "Thank you for your patience — I'm contacting you on behalf of {customerName} about their recent purchase (order {orderId}).",
  firm:
    "This is a follow-up regarding order {orderId} for {customerName}. The issue remains unresolved and requires attention.",
} as const;

const issueBlurb: Record<IssueCategory, string> = {
  delayed_shipment:
    "The shipment is significantly past its expected delivery date and carrier tracking shows no progress.",
  damaged_item:
    "The item arrived visibly damaged and is not in saleable condition.",
  wrong_item:
    "The item received does not match what was ordered (incorrect SKU/variant).",
  missing_item: "One or more items from the order are missing.",
  never_delivered:
    "The package was never delivered, despite the carrier marking it as in-transit for an extended period.",
  defective:
    "The product is defective and does not function as advertised.",
  billing_error:
    "There is a discrepancy in the order's billing amount that requires correction.",
  other: "There is an issue with this order that requires your support.",
};

const closeByTone = {
  professional:
    "We're requesting a full refund of {amount} {currency} to the original payment method. Please confirm within 48 hours.",
  empathetic:
    "Could you let us know what resolution options are available? A refund of {amount} {currency} would be ideal but we're open to alternatives.",
  firm:
    "We require a full refund of {amount} {currency} processed within 24 hours. If unresolved, the case will be escalated.",
} as const;

function fill(s: string, vars: Record<string, string | number>) {
  return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

export function draftSupportMessage(
  order: Order,
  category: IssueCategory,
  tone: "professional" | "firm" | "empathetic" = "professional",
  attempt = 1,
) {
  // Escalate tone on retries
  const effTone =
    attempt >= 3 ? "firm" : attempt === 2 ? "professional" : tone;
  const vars = {
    customerName: order.customerName,
    orderId: order.id,
    amount: order.amountUsd.toFixed(2),
    currency: order.currency,
  };
  const subject = fill(subjectByCategory[category], vars);
  const body = [
    `Hello ${order.merchantName} support team,`,
    "",
    fill(openingByTone[effTone], vars),
    "",
    issueBlurb[category],
    "",
    `Order details:`,
    `  • Order ID: ${order.id}`,
    `  • Item: ${order.itemName} (${order.itemSku})`,
    `  • Amount: $${order.amountUsd.toFixed(2)} ${order.currency}`,
    `  • Carrier / Tracking: ${order.carrier} ${order.trackingNumber}`,
    "",
    fill(closeByTone[effTone], vars),
    "",
    "Signed,",
    "RefundRex — autonomous resolution agent",
    "ERC-8004 #14 · GOAT Network · x402 enabled",
    `Verify: https://8004scan.io/agents?chain=2345`,
  ].join("\n");

  return { subject, body, tone: effTone };
}

/**
 * Best-effort regex parser. In production this routes through the LLM,
 * but the demo path produces realistic outcomes.
 */
export function parseMerchantReply(body: string): {
  decision: "refund" | "replacement" | "partial" | "credit" | "denied" | "ambiguous";
  amount?: number;
  rationale: string;
  needsEscalation: boolean;
} {
  const b = body.toLowerCase();
  const moneyMatch = b.match(/\$?\s?(\d{1,4}(?:\.\d{1,2})?)/);
  const amount = moneyMatch ? Number(moneyMatch[1]) : undefined;

  if (b.includes("full refund") || b.match(/refund.{0,15}approved/))
    return {
      decision: "refund",
      amount,
      rationale: "Merchant approved full refund.",
      needsEscalation: false,
    };
  if (b.includes("replacement"))
    return {
      decision: "replacement",
      rationale: "Merchant offered replacement.",
      needsEscalation: false,
    };
  if (b.includes("partial") || b.includes("50%"))
    return {
      decision: "partial",
      amount,
      rationale: "Merchant offered partial refund.",
      needsEscalation: false,
    };
  if (b.includes("store credit") || b.includes("gift card"))
    return {
      decision: "credit",
      amount,
      rationale: "Merchant offered store credit instead of cash.",
      needsEscalation: true,
    };
  if (b.includes("cannot") || b.includes("deny") || b.includes("not eligible"))
    return {
      decision: "denied",
      rationale: "Merchant refused refund.",
      needsEscalation: true,
    };

  return {
    decision: "ambiguous",
    rationale: "Could not confidently parse decision; will follow up.",
    needsEscalation: false,
  };
}
