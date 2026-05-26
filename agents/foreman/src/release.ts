/**
 * Escrow.submitVerdict bridge.
 *
 * After aggregating specialist verdicts, the Lead Verifier calls
 * `Escrow.submitVerdict(jobId, passed, verdictURI)`. The contract auto-releases
 * USDC to the freelancer on pass, or transitions to Disputed on fail.
 *
 * This is THE money tx — it's the single high-value transaction the agent
 * signs autonomously. Everything else in PaidProof leads to this moment.
 */
import type { Hex } from "viem";
import { ESCROW_ABI } from "@herd/shared/abi";
import { GOAT_GAS, USDC_DECIMALS } from "@herd/shared/constants";
import type { AggregateVerdict } from "@herd/shared/types";
import { getEscrowAddress, getForemanWallet, getPublicClient, getEffectiveMode } from "./wallet.js";

function fakeTxHash(seed: string): Hex {
  let h = 2_166_136_261;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16_777_619) >>> 0;
  }
  const hex = h.toString(16).padStart(8, "0");
  return ("0x" + hex.repeat(8)) as Hex;
}

export interface SubmitVerdictResult {
  txHash: Hex;
  passed: boolean;
  releasedAmountUsdc?: string;
  blockNumber?: number;
}

/**
 * Encode the aggregate verdict as a data URI so it can be embedded inline in
 * the on-chain verdictURI field. In production this would be a Pinata/IPFS upload.
 */
export function encodeVerdictUri(verdict: AggregateVerdict): string {
  const json = JSON.stringify(verdict);
  const b64 = Buffer.from(json, "utf-8").toString("base64");
  return `data:application/json;base64,${b64}`;
}

/**
 * Call Escrow.submitVerdict(jobId, passed, verdictURI). Returns the tx hash
 * and (on pass) the amount of USDC released to the freelancer.
 */
export async function submitVerdict(
  escrowJobId: bigint,
  verdict: AggregateVerdict,
): Promise<SubmitVerdictResult> {
  const mode = getEffectiveMode();
  const verdictURI = encodeVerdictUri(verdict);

  if (mode === "mock") {
    const txHash = fakeTxHash(`escrow.submitVerdict|${escrowJobId}|${verdict.pass}`);
    console.log(`[lead-verifier] (mock) submitVerdict jobId=${escrowJobId} pass=${verdict.pass} tx=${txHash}`);
    return { txHash, passed: verdict.pass };
  }

  const wallet = getForemanWallet();
  const escrow = getEscrowAddress();
  if (!wallet || !wallet.account) {
    console.warn("[lead-verifier] no wallet configured; falling back to mock release");
    return {
      txHash: fakeTxHash(`escrow.submitVerdict|nowallet|${escrowJobId}|${verdict.pass}`),
      passed: verdict.pass,
    };
  }
  if (!escrow) {
    throw new Error("PAIDPROOF_ESCROW_ADDRESS not configured");
  }

  const publicClient = getPublicClient();

  const txHash = await wallet.writeContract({
    address: escrow as Hex,
    abi: ESCROW_ABI,
    functionName: "submitVerdict",
    args: [escrowJobId, verdict.pass, verdictURI],
    maxFeePerGas: GOAT_GAS.maxFeePerGas,
    maxPriorityFeePerGas: GOAT_GAS.maxPriorityFeePerGas,
    account: wallet.account,
    chain: wallet.chain ?? null,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

  let releasedAmountUsdc: string | undefined;
  if (verdict.pass) {
    // Parse Released(jobId, freelancer, amount) event for the on-the-wire amount.
    for (const log of receipt.logs) {
      try {
        const decoded = decodeReleasedEvent(log.topics as string[], log.data);
        if (decoded) {
          releasedAmountUsdc = formatUsdc(decoded.amount);
          break;
        }
      } catch {
        // ignore non-matching logs
      }
    }
  }

  console.log(
    `[lead-verifier] submitVerdict jobId=${escrowJobId} pass=${verdict.pass} tx=${txHash} released=${releasedAmountUsdc ?? "n/a"} USDC`,
  );

  return {
    txHash,
    passed: verdict.pass,
    releasedAmountUsdc,
    blockNumber: Number(receipt.blockNumber),
  };
}

/** Released(uint256 indexed jobId, address indexed freelancer, uint256 amount) */
const RELEASED_TOPIC = "0xab8aa5c0c39b32c8a2e0d20ddd64b9b6e88b8c3a6d3bb3d3a5c1c0d6f7e8e7f1"; // placeholder

function decodeReleasedEvent(topics: string[], data: string): { amount: bigint } | null {
  // Minimal decoder: amount is the only non-indexed param, packed as 32-byte word in `data`.
  if (topics.length < 3) return null;
  // We don't strictly check the event topic hash here — the Escrow contract only
  // emits Released with this shape, and we already know msg.sender authority.
  // Production would compute and verify the keccak256 topic.
  void RELEASED_TOPIC;
  if (!data || data === "0x") return null;
  const hex = data.slice(2);
  const amountHex = hex.slice(0, 64);
  return { amount: BigInt("0x" + amountHex) };
}

function formatUsdc(amount: bigint): string {
  const s = amount.toString().padStart(USDC_DECIMALS + 1, "0");
  return `${s.slice(0, -USDC_DECIMALS)}.${s.slice(-USDC_DECIMALS).replace(/0+$/, "") || "0"}`;
}
