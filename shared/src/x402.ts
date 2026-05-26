/**
 * x402 helper used by every HERD agent (Specialists verify payments,
 * Foreman builds payment headers).
 *
 * Three modes:
 *   - mock        : no chain calls, any non-empty X-PAYMENT header is accepted.
 *                   Default when X402_MODE is unset.
 *   - local       : real on-chain USDC `transfer` from payer to specialist; the
 *                   specialist verifies the receipt has a matching Transfer log.
 *   - facilitator : reserved for full x402 v2 server flow. Falls back to local
 *                   verification at the moment.
 */
import {
  createPublicClient,
  defineChain,
  http,
  parseEventLogs,
  type Hex,
  type PublicClient,
} from "viem";
import { GOAT_TESTNET3, TOKENS } from "./constants.js";
import { ERC20_ABI } from "./abi.js";

export const goatChain = defineChain({
  id: GOAT_TESTNET3.chainId,
  name: GOAT_TESTNET3.name,
  nativeCurrency: GOAT_TESTNET3.nativeCurrency,
  rpcUrls: { default: { http: [GOAT_TESTNET3.rpcUrl] } },
  blockExplorers: { default: { name: "GOAT Explorer", url: GOAT_TESTNET3.explorerUrl } },
});

let cachedPublic: PublicClient | null = null;
function getPublic(): PublicClient {
  if (cachedPublic) return cachedPublic;
  cachedPublic = createPublicClient({
    chain: goatChain,
    transport: http(GOAT_TESTNET3.rpcUrl),
  }) as PublicClient;
  return cachedPublic;
}

export type X402Mode = "mock" | "local" | "facilitator";

/** Resolve the active mode from env. Default is `mock`. */
export function getX402Mode(): X402Mode {
  const m = (process.env.X402_MODE ?? "").toLowerCase();
  if (m === "facilitator") return "facilitator";
  if (m === "local") return "local";
  return "mock";
}

export interface PaymentRequirement {
  scheme: "exact";
  network: string;
  asset: string; // 0x… USDC
  payTo: string; // 0x… recipient
  amount: string; // base units (USDC, 6 decimals)
  description?: string;
}

/** Build the JSON body returned with HTTP 402. */
export function build402Body(
  payTo: string,
  amountUsdcBaseUnits: bigint,
  description?: string,
): PaymentRequirement {
  return {
    scheme: "exact",
    network: "goat-testnet3",
    asset: TOKENS.USDC,
    payTo,
    amount: amountUsdcBaseUnits.toString(),
    ...(description ? { description } : {}),
  };
}

export interface PaymentHeaderPayload {
  txHash: Hex;
  payer?: string;
  network?: string;
  amount?: string;
}

/** Decode the base64-encoded JSON in `X-PAYMENT`. Returns null if malformed. */
export function decodePaymentHeader(
  header: string | null | undefined,
): PaymentHeaderPayload | null {
  if (!header) return null;
  try {
    const decoded = Buffer.from(header, "base64").toString("utf-8");
    const parsed = JSON.parse(decoded) as PaymentHeaderPayload;
    if (typeof parsed.txHash !== "string" || !/^0x[a-fA-F0-9]{64}$/.test(parsed.txHash)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export interface VerifiedPayment {
  txHash: Hex;
  payer?: string;
  amount: bigint;
  blockNumber?: number;
}

export type VerifyResult =
  | { ok: true; settlement: VerifiedPayment }
  | { ok: false; error: string };

/** Verify an X-PAYMENT header against a requirement. */
export async function verifyPayment(
  mode: X402Mode,
  header: string | null | undefined,
  required: PaymentRequirement,
): Promise<VerifyResult> {
  const decoded = decodePaymentHeader(header);
  if (!decoded) return { ok: false, error: "missing or invalid X-PAYMENT" };

  if (mode === "mock") {
    return {
      ok: true,
      settlement: {
        txHash: decoded.txHash,
        amount: BigInt(required.amount),
      },
    };
  }

  // local + facilitator (until full facilitator support is added) → on-chain verify
  const publicClient = getPublic();
  try {
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: decoded.txHash,
      timeout: 30_000,
    });
    if (receipt.status !== "success") return { ok: false, error: "tx reverted" };

    const transfers = parseEventLogs({
      abi: ERC20_ABI,
      eventName: "Transfer",
      logs: receipt.logs,
    });
    const wanted = BigInt(required.amount);
    const match = transfers.find((l) => {
      const toMatches = String(l.args.to).toLowerCase() === required.payTo.toLowerCase();
      const valueOk = (l.args.value as bigint) >= wanted;
      const assetOk = l.address.toLowerCase() === required.asset.toLowerCase();
      return toMatches && valueOk && assetOk;
    });
    if (!match) return { ok: false, error: "no matching USDC Transfer in receipt" };

    return {
      ok: true,
      settlement: {
        txHash: decoded.txHash,
        payer: String(match.args.from),
        amount: match.args.value as bigint,
        blockNumber: Number(receipt.blockNumber),
      },
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Encode a settlement object into base64 JSON for the X-PAYMENT-RESPONSE header. */
export function encodeSettlementHeader(settlement: VerifiedPayment, network = "goat-testnet3"): string {
  const body = {
    success: true,
    txHash: settlement.txHash,
    network,
    payer: settlement.payer,
    amountWei: settlement.amount.toString(),
    blockNumber: settlement.blockNumber,
  };
  return Buffer.from(JSON.stringify(body), "utf-8").toString("base64");
}
