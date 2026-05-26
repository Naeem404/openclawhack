/**
 * Reputation feedback poster.
 *
 * After each specialist returns its verdict, the Lead Verifier writes a
 * reputation outcome to `AgentRegistry.recordOutcome(agentId, success)`. This
 * is PaidProof's portable reputation: it belongs to the agent, not to any
 * platform.
 */
import type { Hex } from "viem";
import { GOAT_GAS } from "@herd/shared/constants";
import { AGENT_REGISTRY_ABI } from "@herd/shared/abi";
import {
  getForemanWallet,
  getRegistryAddress,
  getEffectiveMode,
} from "./wallet.js";

const sentFeedback = new Set<string>();

function fakeTxHash(seed: string): Hex {
  let h = 2_166_136_261;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16_777_619) >>> 0;
  }
  const hex = h.toString(16).padStart(8, "0");
  return ("0x" + hex.repeat(8)) as Hex;
}

/**
 * Record an outcome on the AgentRegistry. Idempotent per (verifier, agent, subtaskType)
 * tuple within the process — the contract itself does NOT dedupe, so the
 * idempotency must live here.
 */
export async function postFeedback(
  specialistAgentId: bigint,
  subtaskType: string,
  success: boolean,
): Promise<{ txHash: Hex }> {
  const key = `${process.env.FOREMAN_AGENT_ID ?? "0"}:${specialistAgentId}:${subtaskType}:${success}`;
  if (sentFeedback.has(key)) {
    return { txHash: ("0x" + "00".repeat(32)) as Hex };
  }

  if (getEffectiveMode() === "mock") {
    sentFeedback.add(key);
    const hash = fakeTxHash(`feedback|${key}`);
    console.log(`[lead-verifier] feedback (mock) agent=${specialistAgentId} success=${success} tx=${hash}`);
    return { txHash: hash };
  }

  const wallet = getForemanWallet();
  const registry = getRegistryAddress();
  if (!wallet || !wallet.account) {
    sentFeedback.add(key);
    return { txHash: fakeTxHash(`feedback|nowallet|${key}`) };
  }
  if (!registry) {
    console.warn("[lead-verifier] PAIDPROOF_REGISTRY_ADDRESS not set; using mock hash");
    sentFeedback.add(key);
    return { txHash: fakeTxHash(`feedback|noregistry|${key}`) };
  }

  const txHash = await wallet.writeContract({
    address: registry as Hex,
    abi: AGENT_REGISTRY_ABI,
    functionName: "recordOutcome",
    args: [specialistAgentId, success],
    maxFeePerGas: GOAT_GAS.maxFeePerGas,
    maxPriorityFeePerGas: GOAT_GAS.maxPriorityFeePerGas,
    account: wallet.account,
    chain: wallet.chain ?? null,
  });

  console.log(`[lead-verifier] feedback agent=${specialistAgentId} success=${success} tx=${txHash}`);
  sentFeedback.add(key);
  return { txHash };
}
