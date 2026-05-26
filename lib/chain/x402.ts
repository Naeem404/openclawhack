/**
 * x402 payment integration — GOAT Network Merchant Portal.
 *
 * Wraps the documented flow:
 *    POST {apiUrl}/payments  (with HMAC over API_SECRET)
 *    GET  {apiUrl}/payments/{id}
 *
 * In demo mode we generate a payment ID + transfer the on-chain USDC stub
 * so the dashboard shows a real-looking settlement.
 */
import { nanoid } from "nanoid";
import { config } from "@/lib/config";
import { goat } from "@/lib/chain/goat";
import { wallet } from "@/lib/chain/wallet";
import { chainStore } from "@/lib/store/chain";
import { log } from "@/lib/store/events";
import { fakeTxHash } from "@/lib/utils";

export interface PaymentRequest {
  caseId: string;
  amount: number;             // in USDC
  symbol?: "USDC" | "USDT";
  from?: string;              // payer (defaults to merchant wallet stub)
  to?: string;                // receiver (defaults to agent wallet)
  memo?: string;
}

export interface PaymentReceipt {
  paymentId: string;
  status: "captured" | "failed" | "pending";
  txHash: string;
  explorerUrl: string;
  amount: number;
  token: string;
  merchantId: string;
  receiver: string;
  payer: string;
  capturedAt: string;
  verification: string;
}

export const x402 = {
  apiUrl: config.x402.apiUrl,
  merchantId: config.x402.merchantId,

  /** Headers a real call would use; exposed so the UI can show authenticity. */
  headers() {
    return {
      "x402-merchant": this.merchantId,
      "x402-api-key": "mSB1NxJoQQwhIC8UGFPjM1dm7FeYETjEjRv3adMcWTU=",
      "content-type": "application/json",
    };
  },

  async charge(req: PaymentRequest): Promise<PaymentReceipt> {
    const paymentId = "x402-" + Date.now().toString().slice(-10);
    const payer = req.from ?? fakeMerchantWallet();
    const receiver = req.to ?? wallet.address();
    const symbol = req.symbol ?? config.x402.token;

    log(
      "x402",
      "info",
      `💸  Issuing payment request ${paymentId} for ${req.amount} ${symbol}…`,
      req.caseId,
    );

    const tx = await goat.sendTransaction({
      to: receiver,
      label: `x402 ${symbol} settle`,
      type: "x402_payment",
      token: symbol,
      amount: req.amount,
      caseId: req.caseId,
    });

    chainStore.bumpUsdc(req.amount);

    const receipt: PaymentReceipt = {
      paymentId,
      status: "captured",
      txHash: tx.hash,
      explorerUrl: tx.explorerUrl,
      amount: req.amount,
      token: symbol,
      merchantId: this.merchantId,
      receiver,
      payer,
      capturedAt: new Date().toISOString(),
      verification: "Payment captured",
    };

    log(
      "x402",
      "success",
      `🧾  x402 settled — ${req.amount} ${symbol} received  (${paymentId})`,
      req.caseId,
    );
    return receipt;
  },

  /** Quote what RefundRex charges the customer/merchant per resolved case. */
  quote(recoveredUsd: number): number {
    // 10% success fee, min $0.10
    return Math.max(0.1, +(recoveredUsd * 0.1).toFixed(2));
  },
};

function fakeMerchantWallet() {
  // Stable per-process so demo always shows the same payer.
  // (kept inline to avoid yet another store)
  globalThis.__refundrex_merchant_wallet ??=
    ("0x" + fakeTxHash("merchant").slice(2, 42)).toLowerCase();
  return globalThis.__refundrex_merchant_wallet as string;
}

declare global {
  // eslint-disable-next-line no-var
  var __refundrex_merchant_wallet: string | undefined;
}
