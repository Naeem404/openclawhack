/**
 * Cross-package type definitions for PaidProof.
 * All runtime validation uses zod for safety at IO boundaries.
 */
import { z } from "zod";
import type { SkillId } from "./constants.js";

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export const HexAddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "must be a 0x-prefixed 40-char hex address");
export type HexAddress = `0x${string}`;

export const TxHashSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{64}$/, "must be a 0x-prefixed 64-char tx hash");
export type TxHash = `0x${string}`;

/** USDC amount as a human-readable decimal string ("0.05"). */
export const UsdcAmountSchema = z.string().regex(/^\d+(\.\d{1,6})?$/);
export type UsdcAmount = string;

// ---------------------------------------------------------------------------
// Agent card (ERC-8004 registration JSON) — see EIP-8004 spec § Identity
// ---------------------------------------------------------------------------

export const AgentSkillSchema = z.object({
  id: z.string(), // e.g. "research.web"
  priceUsdc: UsdcAmountSchema,
  etaSec: z.number().int().nonnegative(),
});
export type AgentSkill = z.infer<typeof AgentSkillSchema>;

export const AgentCardSchema = z.object({
  type: z.literal("AgentCard/0.8"),
  name: z.string(),
  description: z.string(),
  image: z.string().optional(),
  services: z.array(
    z.object({
      name: z.string(),
      endpoint: z.string().url(),
      version: z.string(),
    }),
  ),
  skills: z.array(AgentSkillSchema),
  registrations: z.array(
    z.object({
      agentId: z.union([z.number(), z.null()]),
      agentRegistry: z.string(), // "eip155:48816:0x8004…"
    }),
  ),
  supportedTrust: z.array(z.string()),
  x402Support: z.boolean(),
});
export type AgentCard = z.infer<typeof AgentCardSchema>;

// ---------------------------------------------------------------------------
// Criteria — what the Client + Freelancer agreed on, fed to Lead Verifier
// ---------------------------------------------------------------------------

/** A single requirement on the deliverable. Discriminated by `kind`. */
export const FileSpecCriterionSchema = z.object({
  kind: z.literal("filespec"),
  mime: z.string().min(3),                // e.g. "image/png"
  widthPx: z.number().int().positive().optional(),
  heightPx: z.number().int().positive().optional(),
  minBytes: z.number().int().positive().optional(),
  maxBytes: z.number().int().positive().optional(),
});
export type FileSpecCriterion = z.infer<typeof FileSpecCriterionSchema>;

export const ColorVisionCriterionSchema = z.object({
  kind: z.literal("colorvision"),
  /** Hex colors that must appear in the image, e.g. ["#FF5733", "#1A1A1A"]. */
  brandColors: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)).min(1),
  /** Tolerance per channel (0-255). Defaults to 24 ≈ 9% slack. */
  toleranceChannel: z.number().int().min(0).max(64).default(24),
});
export type ColorVisionCriterion = z.infer<typeof ColorVisionCriterionSchema>;

export const AestheticCriterionSchema = z.object({
  kind: z.literal("aesthetic"),
  /** Plain-English description of what the deliverable should depict. */
  prompt: z.string().min(3),
  /** Minimum acceptable model confidence (0..1). Default 0.6. */
  minConfidence: z.number().min(0).max(1).default(0.6),
});
export type AestheticCriterion = z.infer<typeof AestheticCriterionSchema>;

export const CriterionSchema = z.discriminatedUnion("kind", [
  FileSpecCriterionSchema,
  ColorVisionCriterionSchema,
  AestheticCriterionSchema,
]);
export type Criterion = z.infer<typeof CriterionSchema>;

// ---------------------------------------------------------------------------
// Job request (POST /jobs body to Lead Verifier)
// ---------------------------------------------------------------------------

export const JobRequestSchema = z.object({
  /** Escrow contract job id (uint256 as decimal string). */
  escrowJobId: z.string().regex(/^\d+$/),
  /** URL or data: URI of the deliverable file. */
  deliverableUrl: z.string().min(5),
  /** Original SHA-256 hash of the file, used by FileSpec for byte-length sanity. */
  deliverableHash: z.string().optional(),
  /** Criteria array — the Lead Verifier dispatches one specialist per kind. */
  criteria: z.array(CriterionSchema).min(1),
});
export type JobRequest = z.infer<typeof JobRequestSchema>;

/**
 * Internal subtask emitted by Lead Verifier decomposition.
 * One per Criterion bucket. Spec field carries the criterion + deliverable url.
 */
export const SubtaskSchema = z.object({
  id: z.string(),
  skill: z.string(), // SkillId at runtime
  spec: z.record(z.unknown()),
  dependsOn: z.array(z.string()).default([]),
});
export type Subtask = z.infer<typeof SubtaskSchema> & { skill: SkillId | string };

export const BidSchema = z.object({
  agentId: z.string(),
  agentAddress: HexAddressSchema,
  endpoint: z.string().url(),
  skill: z.string(),
  priceUsdc: UsdcAmountSchema,
  etaSec: z.number().int().nonnegative(),
  signature: z.string().optional(),
});
export type Bid = z.infer<typeof BidSchema>;

// ---------------------------------------------------------------------------
// Specialist outputs — each returns a Verdict
// ---------------------------------------------------------------------------

export const VerdictSchema = z.object({
  /** True if this specialist's criterion passes. */
  pass: z.boolean(),
  /** Specialist's self-reported confidence 0..1. */
  confidence: z.number().min(0).max(1),
  /** Human-readable explanation surfaced in the dashboard + on-chain verdictURI. */
  reasoning: z.string().min(1),
  /** Optional per-check details (e.g. extracted colors, detected dimensions). */
  details: z.record(z.unknown()).optional(),
});
export type Verdict = z.infer<typeof VerdictSchema>;

// ---------------------------------------------------------------------------
// Final deliverable returned by Lead Verifier
// ---------------------------------------------------------------------------

export interface AggregateVerdict {
  pass: boolean;
  verdicts: Array<{ subtaskId: string; skill: string; verdict: Verdict }>;
  reasoning: string;
}

// ---------------------------------------------------------------------------
// x402 settlement (decoded X-PAYMENT-RESPONSE)
// ---------------------------------------------------------------------------

export const SettlementResponseSchema = z.object({
  success: z.boolean(),
  txHash: TxHashSchema.optional(),
  network: z.string().optional(),
  payer: HexAddressSchema.optional(),
  payee: HexAddressSchema.optional(),
  amountWei: z.string().optional(),
  blockNumber: z.number().int().positive().optional(),
});
export type SettlementResponse = z.infer<typeof SettlementResponseSchema>;

// ---------------------------------------------------------------------------
// SwarmEvent — discriminated union streamed via SSE to dashboard
// Covers the full PaidProof lifecycle:
//   client funds escrow → freelancer delivers → Lead Verifier dispatches →
//   specialists return verdicts → escrow released → reputation posted.
// ---------------------------------------------------------------------------

export type SwarmEvent =
  // Lifecycle
  | { type: "job.created";        jobId: string; escrowJobId: string; criteria: Criterion[]; at: number }
  | { type: "job.decomposed";     jobId: string; subtasks: Subtask[]; at: number }
  | { type: "job.completed";      jobId: string; verdict: AggregateVerdict; escrowTxHash?: TxHash; releasedAmount?: UsdcAmount; at: number }
  | { type: "job.failed";         jobId: string; error: string; at: number }

  // Bidding (kept for forward-compat; MVP uses static specialist routing)
  | { type: "bid.received";       jobId: string; subtaskId: string; bid: Bid; at: number }
  | { type: "bid.selected";       jobId: string; subtaskId: string; winner: Bid; at: number }

  // x402 specialist payments
  | { type: "payment.required";   jobId: string; subtaskId: string; specialist: string; amountUsdc: UsdcAmount; payTo: HexAddress; at: number }
  | { type: "payment.settled";    jobId: string; subtaskId: string; specialist: string; txHash: TxHash; blockNumber?: number; at: number }

  // Specialist verdicts
  | { type: "verdict.received";   jobId: string; subtaskId: string; specialist: string; verdict: Verdict; at: number }

  // Escrow contract events
  | { type: "escrow.funded";      jobId: string; escrowJobId: string; amountUsdc: UsdcAmount; txHash: TxHash; at: number }
  | { type: "escrow.delivered";   jobId: string; escrowJobId: string; deliverableUrl: string; txHash: TxHash; at: number }
  | { type: "escrow.released";    jobId: string; escrowJobId: string; amountUsdc: UsdcAmount; freelancer: HexAddress; txHash: TxHash; at: number }
  | { type: "escrow.disputed";    jobId: string; escrowJobId: string; reason: string; txHash: TxHash; at: number }

  // Reputation
  | { type: "feedback.posted";    jobId: string; agentId: string; role: "specialist" | "freelancer" | "client"; txHash: TxHash; value: number; at: number };

export type SwarmEventType = SwarmEvent["type"];

// ---------------------------------------------------------------------------
// Job result (returned by Lead Verifier POST /jobs)
// ---------------------------------------------------------------------------

export interface JobResult {
  jobId: string;
  escrowJobId: string;
  verdict: AggregateVerdict;
  ledger: Array<{
    subtaskId: string;
    skill: string;
    specialistAgentId: string;
    verdict: Verdict;
    settlement: SettlementResponse;
  }>;
  totalSpecialistFeesUsdc: UsdcAmount;
  /** Tx hash of the on-chain submitVerdict() call (which auto-releases on pass). */
  escrowTxHash?: TxHash;
  /** Amount released to the freelancer (only present on pass). */
  releasedAmountUsdc?: UsdcAmount;
}

// ---------------------------------------------------------------------------
// Escrow job state (mirror of Escrow.sol's Job struct, for dashboard rendering)
// ---------------------------------------------------------------------------

export interface EscrowJob {
  id: string;
  client: HexAddress;
  freelancer: HexAddress;
  freelancerAgentId: string;
  clientAgentId: string;
  verifierAgentId: string;
  amountUsdc: UsdcAmount;
  criteriaURI: string;
  deliverableURI: string;
  verdictURI: string;
  deadline: number;
  status: number; // ESCROW_STATUS enum
  createdAt: number;
}
