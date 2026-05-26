/**
 * Lazy-instantiated viem clients for the Lead Verifier.
 * Shared between `pay.ts` (USDC transfers via x402), `release.ts`
 * (Escrow.submitVerdict), and `feedback.ts` (reputation writes).
 *
 * Chain target is selected via CHAIN_TARGET env var:
 *   localhost     → http://127.0.0.1:8545  (hardhat node)
 *   goat-testnet3 → https://rpc.testnet3.goat.network
 *   goat-mainnet  → https://rpc.goat.network
 */
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  type Chain,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { GOAT_TESTNET3, GOAT_MAINNET, HARDHAT_LOCAL } from "@herd/shared";

let cachedWallet: WalletClient | null = null;
let cachedPublic: PublicClient | null = null;
let cachedChain: Chain | null = null;

function resolveChain(): Chain {
  if (cachedChain) return cachedChain;
  const target = (process.env.CHAIN_TARGET ?? "localhost").toLowerCase();
  const spec =
    target === "goat-mainnet" ? GOAT_MAINNET :
    target === "goat-testnet3" || target === "goat" ? GOAT_TESTNET3 :
    HARDHAT_LOCAL;

  cachedChain = defineChain({
    id: spec.chainId,
    name: spec.name,
    nativeCurrency: spec.nativeCurrency,
    rpcUrls: { default: { http: [spec.rpcUrl] } },
    blockExplorers: spec.explorerUrl
      ? { default: { name: `${spec.name} Explorer`, url: spec.explorerUrl } }
      : undefined,
  });
  return cachedChain;
}

/** Returns the Lead Verifier's WalletClient if a private key is configured, else null. */
export function getForemanWallet(): WalletClient | null {
  if (cachedWallet) return cachedWallet;
  const pk = process.env.FOREMAN_PRIVATE_KEY;
  if (!pk) return null;
  const account = privateKeyToAccount(pk as Hex);
  const chain = resolveChain();
  cachedWallet = createWalletClient({
    account,
    chain,
    transport: http(chain.rpcUrls.default.http[0]),
  });
  return cachedWallet;
}

export function getPublicClient(): PublicClient {
  if (cachedPublic) return cachedPublic;
  const chain = resolveChain();
  cachedPublic = createPublicClient({
    chain,
    transport: http(chain.rpcUrls.default.http[0]),
  }) as PublicClient;
  return cachedPublic;
}

/** PaidProof Escrow contract address (from .env). */
export function getEscrowAddress(): Hex | null {
  const a = process.env.PAIDPROOF_ESCROW_ADDRESS;
  return a ? (a as Hex) : null;
}

/** PaidProof AgentRegistry contract address (from .env). */
export function getRegistryAddress(): Hex | null {
  const a = process.env.PAIDPROOF_REGISTRY_ADDRESS;
  return a ? (a as Hex) : null;
}

/** Effective USDC contract address (from .env, falls back to TOKENS.USDC). */
export function getUsdcAddress(): Hex {
  return (process.env.PAIDPROOF_USDC_ADDRESS ?? "0x29d1ee93e9ecf6e50f309f498e40a6b42d352fa1") as Hex;
}

/**
 * Effective execution mode. Downgrades to `mock` if the Lead Verifier has
 * no private key configured — so demos always work without on-chain funding.
 */
export function getEffectiveMode(): "mock" | "local" | "facilitator" {
  const m = (process.env.X402_MODE ?? "").toLowerCase();
  const hasWallet = !!process.env.FOREMAN_PRIVATE_KEY;
  if (!hasWallet) return "mock";
  if (m === "facilitator") return "facilitator";
  if (m === "local") return "local";
  return "mock";
}
