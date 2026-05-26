// ─────────────────────────────────────────────────────────────────────────────
// RefundRex domain types
// ─────────────────────────────────────────────────────────────────────────────

export type IssueCategory =
  | "delayed_shipment"
  | "damaged_item"
  | "wrong_item"
  | "missing_item"
  | "never_delivered"
  | "defective"
  | "billing_error"
  | "other";

export type CaseStatus =
  | "intake"
  | "investigating"
  | "contacting_merchant"
  | "negotiating"
  | "awaiting_response"
  | "escalating"
  | "resolved_refund"
  | "resolved_replacement"
  | "resolved_partial"
  | "rejected"
  | "fraud_blocked";

export type ResolutionType =
  | "full_refund"
  | "partial_refund"
  | "replacement"
  | "store_credit"
  | "denied"
  | "pending";

export type Severity = "low" | "medium" | "high" | "critical";

export interface Order {
  id: string;
  merchantId: string;
  merchantName: string;
  customerEmail: string;
  customerName: string;
  itemName: string;
  itemSku: string;
  category: string;
  amountUsd: number;
  currency: "USD" | "USDC" | "USDT";
  orderedAt: string; // ISO
  expectedDeliveryAt: string;
  carrier: string;
  trackingNumber: string;
  imageUrl?: string;
}

export interface ShipmentEvent {
  ts: string;
  location: string;
  status: string;
  detail?: string;
}

export interface Shipment {
  trackingNumber: string;
  carrier: string;
  status:
    | "label_created"
    | "in_transit"
    | "out_for_delivery"
    | "delivered"
    | "delayed"
    | "lost"
    | "returned";
  events: ShipmentEvent[];
  lastUpdate: string;
}

export interface MerchantProfile {
  id: string;
  name: string;
  domain: string;
  supportEmail: string;
  apiEndpoint?: string;
  agentEndpoint?: string;            // for agent-to-agent comms
  responsiveness: number;            // 0..1
  refundFriendliness: number;        // 0..1
  averageResponseHours: number;
  trustScore: number;                // 0..100
  acceptsX402?: boolean;
}

export interface AgentAction {
  id: string;
  caseId: string;
  ts: string;
  kind:
    | "intake"
    | "track"
    | "classify"
    | "plan"
    | "draft_email"
    | "send_email"
    | "send_a2a"           // agent-to-agent
    | "await"
    | "parse_response"
    | "negotiate"
    | "escalate"
    | "fraud_check"
    | "settle_payment"
    | "register_identity"
    | "update_reputation"
    | "decide"
    | "complete";
  title: string;
  detail?: string;
  confidence?: number;     // 0..1
  txHash?: string;
  durationMs?: number;
  ok: boolean;
}

export interface CaseTimelineEvent {
  id: string;
  ts: string;
  type:
    | "case_opened"
    | "agent_action"
    | "merchant_message"
    | "customer_message"
    | "chain_event"
    | "payment"
    | "status_change";
  title: string;
  body?: string;
  actorRole: "agent" | "customer" | "merchant" | "chain" | "system";
  meta?: Record<string, unknown>;
}

export interface DisputeCase {
  id: string;
  order: Order;
  shipment: Shipment;
  status: CaseStatus;
  category: IssueCategory;
  severity: Severity;
  openedAt: string;
  updatedAt: string;
  resolution: ResolutionType;
  recoveredAmountUsd: number;
  feeUsd: number;
  confidence: number;          // model self-confidence
  successProbability: number;  // pre-action prediction
  timeline: CaseTimelineEvent[];
  actions: AgentAction[];
  txHashes: string[];          // on-chain hashes for this case
  agentMemoryKey: string;
  customerNote?: string;
}

export interface AgentReputation {
  agentId: string;
  walletAddress: string;
  erc8004Id?: number;
  casesHandled: number;
  refundsRecovered: number;
  totalRecoveredUsd: number;
  successRate: number;       // 0..1
  averageResolutionHours: number;
  stars: number;             // 0..5
  endorsements: number;
  trustScore: number;        // 0..100
}

export interface WalletState {
  address: string;
  erc8004Id?: number;
  network: string;
  chainId: number;
  balances: {
    native: { symbol: "BTC"; amount: number };
    usdc: { symbol: "USDC"; amount: number };
    usdt?: { symbol: "USDT"; amount: number };
  };
  txCount: number;
  registered: boolean;
}

export interface ChainEvent {
  hash: string;
  block: number;
  ts: string;
  type:
    | "erc8004_register"
    | "erc8004_uri_update"
    | "x402_payment"
    | "reputation_update"
    | "settlement"
    | "transfer";
  from: string;
  to: string;
  amount?: number;
  token?: string;
  caseId?: string;
  status: "pending" | "confirmed" | "failed";
  explorerUrl: string;
}

export interface AgentLogLine {
  id: string;
  ts: number;
  level: "info" | "warn" | "error" | "success" | "think";
  source: string;            // "orchestrator" | "planner" | "x402" | …
  message: string;
  caseId?: string;
}
