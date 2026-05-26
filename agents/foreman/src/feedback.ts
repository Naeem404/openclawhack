/**
 * Reputation Registry feedback poster.
 * Implements packet P07.
 *
 * Sub-agent task list:
 *   1. Build a viem WalletClient from FOREMAN_PRIVATE_KEY.
 *   2. Encode tag1 = bytes32("herd.subtask"), tag2 = bytes32(subtaskType).
 *      Use viem's stringToHex with size=32 (pad right with zeros).
 *   3. Call ReputationRegistry.giveFeedback(agentId, value, 0, tag1, tag2, "", "", 0x00…0).
 *      - success: value = 100
 *      - failure: value = -50
 *   4. Track idempotency in memory: key = `${foremanAgentId}:${specialistAgentId}:${subtaskType}:${jobId}`.
 *   5. Return { txHash }.
 */
import { stringToHex, type Hex } from "viem";
import { ERC8004, REPUTATION_TAGS } from "@herd/shared/constants";
import { REPUTATION_REGISTRY_ABI } from "@herd/shared/abi";

const sentFeedback = new Set<string>();

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

  const _value = success ? 100 : -50;
  const _tag1 = stringToHex(REPUTATION_TAGS.SUBTASK, { size: 32 });
  const _tag2 = stringToHex(subtaskType, { size: 32 });

  // TODO(sub-agent P07): implement using viem walletClient.writeContract({
  //   address: ERC8004.reputationRegistry,
  //   abi: REPUTATION_REGISTRY_ABI,
  //   functionName: "giveFeedback",
  //   args: [specialistAgentId, _value, 0, _tag1, _tag2, "", "", `0x${"00".repeat(32)}`],
  //   ...GOAT_GAS,
  // });
  // For now: return a fake hash so the demo flow still emits a feedback.posted event.

  sentFeedback.add(key);
  return { txHash: ("0x" + "ab".repeat(32)) as Hex };
}

export { ERC8004, REPUTATION_REGISTRY_ABI };
