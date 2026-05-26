/**
 * GOAT Testnet3 chain constants and HERD protocol parameters.
 * Single source of truth — every workspace imports from here.
 * Source: https://github.com/GOATNetwork/GOAT-Hackathon-2026
 */

export const GOAT_TESTNET3 = {
  chainId: 48816,
  name: "GOAT Testnet3",
  rpcUrl: "https://rpc.testnet3.goat.network",
  explorerUrl: "https://explorer.testnet3.goat.network",
  nativeCurrency: { name: "Bitcoin", symbol: "BTC", decimals: 18 },
} as const;

/** ERC-20 token addresses on GOAT Testnet3. */
export const TOKENS = {
  USDC: "0x29d1ee93e9ecf6e50f309f498e40a6b42d352fa1",
  USDT: "0xdce0af57e8f2ce957b3838cd2a2f3f3677965dd3",
} as const;

export const USDC_DECIMALS = 6;

/** ERC-8004 deployments on GOAT Testnet3. */
export const ERC8004 = {
  identityRegistry: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",
  reputationRegistry: "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63",
  /** CAIP-10 style registry identifier embedded in agent cards. */
  registryNamespace: "eip155:48816:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",
} as const;

/** Default agent ports for local dev. */
export const PORTS = {
  dashboard: 3000,
  foreman: 3100,
  researcher: 3101,
  writer: 3102,
} as const;

/** Bid ranking: score = reputation - RANKING_PRICE_WEIGHT * priceUsdc. */
export const RANKING_PRICE_WEIGHT = 0.5;

/** Default per-call prices in base USDC units (6 decimals). */
export const DEFAULT_PRICES = {
  /** 0.05 USDC */
  research_web: 50_000n,
  /** 0.08 USDC */
  write_brief: 80_000n,
} as const;

/** Hackathon-defined skill ids. Specialists advertise these in their cards. */
export const SKILLS = {
  RESEARCH_WEB: "research.web",
  WRITE_BRIEF: "write.brief",
} as const;

export type SkillId = (typeof SKILLS)[keyof typeof SKILLS];

/** Reputation Registry tag bytes32 helpers (kept as string literals; agents convert at call site). */
export const REPUTATION_TAGS = {
  SUBTASK: "herd.subtask",
} as const;

/** GOAT requires explicit non-default gas pricing per the demo. */
export const GOAT_GAS = {
  maxPriorityFeePerGas: 130_000n,
  maxFeePerGas: 1_000_000n,
} as const;

/** x402 mode toggle. */
export type X402Mode = "facilitator" | "local";
