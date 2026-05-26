/**
 * Cross-package type definitions for HERD.
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
// Job / Subtask / Bid
// ---------------------------------------------------------------------------

export const JobRequestSchema = z.object({
  brief: z.string().min(10).max(2000),
  budgetUsdc: UsdcAmountSchema,
});
export type JobRequest = z.infer<typeof JobRequestSchema>;

export const SubtaskSchema = z.object({
  id: z.string(),
  skill: z.string(), // SkillId at runtime, kept as string here to allow future skills
  spec: z.record(z.unknown()),
  dependsOn: z.array(z.string()).default([]),
});
export type Subtask = z.infer<typeof SubtaskSchema> & { skill: SkillId | string };

export const BidSchema = z.object({
  agentId: z.string(), // ERC-8004 token id as decimal string
  agentAddress: HexAddressSchema,
  endpoint: z.string().url(),
  skill: z.string(),
  priceUsdc: UsdcAmountSchema,
  etaSec: z.number().int().nonnegative(),
  /** Optional EIP-191 signature over `keccak256(agentId|skill|priceUsdc|etaSec)`. */
  signature: z.string().optional(),
});
export type Bid = z.infer<typeof BidSchema>;

// ---------------------------------------------------------------------------
// Artifacts (Specialist outputs)
// ---------------------------------------------------------------------------

export const ResearchArtifactSchema = z.object({
  bullets: z.array(z.string()).min(1),
  sources: z.array(z.string().url()).default([]),
});
export type ResearchArtifact = z.infer<typeof ResearchArtifactSchema>;

export const WriteArtifactSchema = z.object({
  markdown: z.string(),
  wordCount: z.number().int().positive(),
});
export type WriteArtifact = z.infer<typeof WriteArtifactSchema>;

export type Artifact = ResearchArtifact | WriteArtifact;

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
// ---------------------------------------------------------------------------

export type SwarmEvent =
  | { type: "job.created";       jobId: string; brief: string; budgetUsdc: UsdcAmount; at: number }
  | { type: "job.decomposed";    jobId: string; subtasks: Subtask[]; at: number }
  | { type: "bid.received";      jobId: string; subtaskId: string; bid: Bid; at: number }
  | { type: "bid.selected";      jobId: string; subtaskId: string; winner: Bid; at: number }
  | { type: "payment.required";  jobId: string; subtaskId: string; amountUsdc: UsdcAmount; payTo: HexAddress; at: number }
  | { type: "payment.settled";   jobId: string; subtaskId: string; txHash: TxHash; blockNumber?: number; at: number }
  | { type: "artifact.produced"; jobId: string; subtaskId: string; artifact: unknown; at: number }
  | { type: "feedback.posted";   jobId: string; specialistAgentId: string; txHash: TxHash; value: number; at: number }
  | { type: "job.completed";     jobId: string; deliverable: unknown; totalSpentUsdc: UsdcAmount; receipts: TxHash[]; at: number }
  | { type: "job.failed";        jobId: string; error: string; at: number };

export type SwarmEventType = SwarmEvent["type"];

// ---------------------------------------------------------------------------
// Job result (returned by Foreman POST /jobs)
// ---------------------------------------------------------------------------

export interface JobResult {
  jobId: string;
  deliverable: unknown;
  ledger: Array<{
    subtaskId: string;
    agentId: string;
    artifact: unknown;
    settlement: SettlementResponse;
  }>;
  totalSpentUsdc: UsdcAmount;
}
