/**
 * x402 client wrapper for the Foreman.
 * Implements packet P06.
 *
 * Sub-agent task list:
 *   1. Build a viem WalletClient from FOREMAN_PRIVATE_KEY against GOAT testnet3.
 *   2. Implement paidPost(url, body, opts):
 *        a. POST without X-PAYMENT.
 *        b. If 200: decode X-PAYMENT-RESPONSE (if present) and return.
 *        c. If 402:
 *             - parse PAYMENT-REQUIRED (base64 JSON)
 *             - assert amount <= maxPriceUsdc * 10^USDC_DECIMALS
 *             - build a PaymentPayload per x402 v2 spec (scheme=exact, network=goat-testnet3)
 *             - sign EIP-712 typed-data with the wallet
 *             - retry with X-PAYMENT header (base64 JSON)
 *             - decode X-PAYMENT-RESPONSE and return
 *        d. Any other status: throw with status + body.
 *   3. Use the official x402 client library (@x402/fetch or x402-fetch) if available;
 *      else implement the loop manually following coinbase/x402 specs/transports-v1/http.md.
 */
import type { Address, Hex, WalletClient } from "viem";
import type { SettlementResponse } from "@herd/shared/types";
import {
  TOKENS,
  USDC_DECIMALS,
  GOAT_GAS,
  decodePaymentHeader,
  type PaymentRequirement,
} from "@herd/shared";
import { ERC20_ABI } from "@herd/shared/abi";
import { getForemanWallet, getPublicClient, getEffectiveMode } from "./wallet.js";

export interface PaidPostOptions {
  /** Max price the client is willing to pay, as a human decimal USDC string (e.g. "0.10"). */
  maxPriceUsdc: string;
  /** Optional explicit wallet override. Falls back to `getForemanWallet()`. */
  wallet?: WalletClient | null;
  /** Optional override for facilitator URL. */
  facilitatorUrl?: string;
}

export interface PaidPostResult<T> {
  data: T;
  settlement: SettlementResponse;
}

function fakeTxHash(seed: string): Hex {
  let h = 2_166_136_261;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16_777_619) >>> 0;
  }
  const hex = h.toString(16).padStart(8, "0");
  return ("0x" + hex.repeat(8)) as Hex;
}

/**
 * POST a JSON body to `url`, automatically handling the x402 402 → pay → retry loop.
 *
 *   1. POST without X-PAYMENT.
 *   2. If 200: decode optional X-PAYMENT-RESPONSE and return.
 *   3. If 402: read JSON body as PaymentRequirement, ensure amount ≤ maxPriceUsdc,
 *      execute payment (real USDC transfer in `local`, fake hash in `mock`),
 *      retry once with X-PAYMENT header.
 *   4. Any other status: throw.
 */
export async function paidPost<T = unknown>(
  url: string,
  body: unknown,
  opts: PaidPostOptions,
): Promise<PaidPostResult<T>> {
  const mode = getEffectiveMode();

  // Round 1: no payment header.
  const first = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (first.status === 200) {
    const data = (await first.json()) as T;
    const settlementHeader = first.headers.get("x-payment-response");
    let settlement: SettlementResponse = { success: true };
    if (settlementHeader) {
      try {
        settlement = JSON.parse(
          Buffer.from(settlementHeader, "base64").toString("utf-8"),
        ) as SettlementResponse;
      } catch {
        // ignore malformed settlement header
      }
    }
    return { data, settlement };
  }

  if (first.status !== 402) {
    const errBody = await first.text().catch(() => "");
    throw new Error(`paidPost: unexpected status ${first.status}: ${errBody.slice(0, 200)}`);
  }

  const required = (await first.json().catch(() => null)) as PaymentRequirement | null;
  if (!required || !required.payTo || !required.amount) {
    throw new Error("paidPost: 402 missing payment requirements");
  }

  const requiredAmount = BigInt(required.amount);
  const maxAmount = toUsdcBaseUnits(opts.maxPriceUsdc);
  if (requiredAmount > maxAmount) {
    throw new Error(
      `paidPost: required ${fromUsdcBaseUnits(requiredAmount)} > max ${opts.maxPriceUsdc} USDC`,
    );
  }

  let txHash: Hex;
  let blockNumber: number | undefined;
  let payer: Address | undefined;

  if (mode === "mock") {
    txHash = fakeTxHash(`${url}|${required.payTo}|${required.amount}|${Date.now()}`);
  } else {
    const wallet = opts.wallet ?? getForemanWallet();
    if (!wallet || !wallet.account) {
      throw new Error("paidPost: no wallet available for non-mock mode");
    }
    const publicClient = getPublicClient();
    txHash = await wallet.writeContract({
      address: (required.asset || TOKENS.USDC) as Hex,
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [required.payTo as Hex, requiredAmount],
      maxFeePerGas: GOAT_GAS.maxFeePerGas,
      maxPriorityFeePerGas: GOAT_GAS.maxPriorityFeePerGas,
      account: wallet.account,
      chain: wallet.chain ?? null,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    blockNumber = Number(receipt.blockNumber);
    payer = wallet.account.address;
  }

  const paymentHeader = Buffer.from(
    JSON.stringify({
      txHash,
      payer,
      network: required.network,
      amount: required.amount,
    }),
    "utf-8",
  ).toString("base64");

  // Round 2: retry with X-PAYMENT.
  const second = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-PAYMENT": paymentHeader,
    },
    body: JSON.stringify(body),
  });

  if (second.status !== 200) {
    const errBody = await second.text().catch(() => "");
    throw new Error(
      `paidPost: post-payment status ${second.status}: ${errBody.slice(0, 200)}`,
    );
  }

  const data = (await second.json()) as T;
  const settlementHeader = second.headers.get("x-payment-response");
  let settlement: SettlementResponse = {
    success: true,
    txHash,
    network: required.network,
    payer,
    payee: required.payTo as Address,
    amountWei: required.amount,
    blockNumber,
  };
  if (settlementHeader) {
    try {
      const parsed = JSON.parse(
        Buffer.from(settlementHeader, "base64").toString("utf-8"),
      ) as Partial<SettlementResponse>;
      settlement = { ...settlement, ...parsed, success: true, txHash };
    } catch {
      // ignore malformed settlement header
    }
  }

  return { data, settlement };
}

// Reference unused symbols for future facilitator-mode work.
void decodePaymentHeader;

/**
 * Convert a USDC decimal string like "0.05" to its base-units bigint (6 decimals).
 */
export function toUsdcBaseUnits(decimal: string): bigint {
  const [whole, frac = ""] = decimal.split(".");
  const fracPadded = (frac + "0".repeat(USDC_DECIMALS)).slice(0, USDC_DECIMALS);
  return BigInt((whole ?? "0") + fracPadded);
}

/**
 * Convert a base-units bigint amount back to a human USDC decimal string.
 */
export function fromUsdcBaseUnits(amount: bigint): string {
  const s = amount.toString().padStart(USDC_DECIMALS + 1, "0");
  return `${s.slice(0, -USDC_DECIMALS)}.${s.slice(-USDC_DECIMALS).replace(/0+$/, "") || "0"}`;
}

export type { Address };
