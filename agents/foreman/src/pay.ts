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
import type { Address, WalletClient } from "viem";
import type { SettlementResponse } from "@herd/shared/types";
import { USDC_DECIMALS } from "@herd/shared/constants";

export interface PaidPostOptions {
  /** Max price the client is willing to pay, as a human decimal USDC string (e.g. "0.10"). */
  maxPriceUsdc: string;
  wallet: WalletClient;
  /** Optional override for facilitator URL. */
  facilitatorUrl?: string;
}

export interface PaidPostResult<T> {
  data: T;
  settlement: SettlementResponse;
}

/**
 * POST a JSON body to `url`, automatically handling the x402 402 → pay → retry loop.
 * TODO(sub-agent P06): implement per the contract above.
 */
export async function paidPost<T = unknown>(
  _url: string,
  _body: unknown,
  _opts: PaidPostOptions,
): Promise<PaidPostResult<T>> {
  throw new Error("paidPost not yet implemented — see packet P06 in AGENT_DELEGATION.md");
}

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
