/**
 * Reputation Registry feedback poster.
 * Implements packet P07.
 *
 * Posts reputation feedback to ERC-8004 after subtask completion.
 */
import { stringToHex, type Hex } from "viem";
import { ERC8004, REPUTATION_TAGS, GOAT_GAS } from "@herd/shared/constants";
import { REPUTATION_REGISTRY_ABI } from "@herd/shared/abi";
import { getForemanWallet, getEffectiveMode } from "./wallet.js";

const sentFeedback = new Set<string>();

function fakeTxHash(seed: string): Hex {
  let h = 2_166_136_261;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16_777_619) >>> 0;
  }
  const hex = h.toString(16).padStart(8, "0");
  return ("0x" + hex.repeat(8)) as Hex;
}

export async function postFeedback(
  specialistAgentId: bigint,
  subtaskType: string,
  success: boolean,
  _durationMs: number,
): Promise<{ txHash: Hex }> {
  const key = `${process.env.FOREMAN_AGENT_ID ?? "0"}:${specialistAgentId}:${subtaskType}`;
  if (sentFeedback.has(key)) {
    console.log("[foreman] feedback already posted for", key);
    return { txHash: ("0x" + "00".repeat(32)) as Hex };
  }

  const value = BigInt(success ? 100 : -50);
  const tag1 = stringToHex(REPUTATION_TAGS.SUBTASK, { size: 32 });
  const tag2 = stringToHex(subtaskType.slice(0, 31), { size: 32 });

  if (getEffectiveMode() === "mock") {
    sentFeedback.add(key);
    const hash = fakeTxHash(`feedback|${key}|${value}`);
    console.log(`[foreman] feedback (mock) agent=${specialistAgentId} value=${value} tx=${hash}`);
    return { txHash: hash };
  }

  const wallet = getForemanWallet();
  if (!wallet || !wallet.account) {
    sentFeedback.add(key);
    return { txHash: fakeTxHash(`feedback|nowallet|${key}`) };
  }

  const txHash = await wallet.writeContract({
    address: ERC8004.reputationRegistry as Hex,
    abi: REPUTATION_REGISTRY_ABI,
    functionName: "giveFeedback",
    args: [
      specialistAgentId,
      value,
      0,
      tag1,
      tag2,
      "",
      "",
      (`0x${"00".repeat(32)}`) as Hex,
    ],
    maxFeePerGas: GOAT_GAS.maxFeePerGas,
    maxPriorityFeePerGas: GOAT_GAS.maxPriorityFeePerGas,
    account: wallet.account,
    chain: wallet.chain ?? null,
  });

  console.log(`[foreman] feedback agent=${specialistAgentId} value=${value} tx=${txHash}`);
  sentFeedback.add(key);
  return { txHash };
}

export { ERC8004, REPUTATION_REGISTRY_ABI };
