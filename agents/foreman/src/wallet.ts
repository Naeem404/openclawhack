/**
 * Lazy-instantiated viem clients for the Foreman.
 * Both `pay.ts` (USDC transfers) and `feedback.ts` (Reputation Registry writes)
 * share these singletons.
 */
import {
  createPublicClient,
  createWalletClient,
  http,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { GOAT_TESTNET3, goatChain } from "@herd/shared";

let cachedWallet: WalletClient | null = null;
let cachedPublic: PublicClient | null = null;

/** Returns the Foreman's WalletClient if a private key is configured, else null. */
export function getForemanWallet(): WalletClient | null {
  if (cachedWallet) return cachedWallet;
  const pk = process.env.FOREMAN_PRIVATE_KEY;
  if (!pk) return null;
  const account = privateKeyToAccount(pk as Hex);
  cachedWallet = createWalletClient({
    account,
    chain: goatChain,
    transport: http(GOAT_TESTNET3.rpcUrl),
  });
  return cachedWallet;
}

export function getPublicClient(): PublicClient {
  if (cachedPublic) return cachedPublic;
  cachedPublic = createPublicClient({
    chain: goatChain,
    transport: http(GOAT_TESTNET3.rpcUrl),
  }) as PublicClient;
  return cachedPublic;
}

/**
 * Effective execution mode: like `getX402Mode()` from shared, but downgrades
 * to `mock` if the foreman has no private key configured (so demos work
 * without on-chain funding).
 */
export function getEffectiveMode(): "mock" | "local" | "facilitator" {
  const m = (process.env.X402_MODE ?? "").toLowerCase();
  const hasWallet = !!process.env.FOREMAN_PRIVATE_KEY;
  if (!hasWallet) return "mock";
  if (m === "facilitator") return "facilitator";
  if (m === "local") return "local";
  return "mock";
}
