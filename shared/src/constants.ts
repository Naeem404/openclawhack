/**
 * GOAT chain constants and PaidProof protocol parameters.
 * Single source of truth — every workspace imports from here.
 */

export const GOAT_TESTNET3 = {
  chainId: 48816,
  name: "GOAT Testnet3",
  rpcUrl: "https://rpc.testnet3.goat.network",
  explorerUrl: "https://explorer.testnet3.goat.network",
  nativeCurrency: { name: "Bitcoin", symbol: "BTC", decimals: 18 },
} as const;

export const GOAT_MAINNET = {
  chainId: 2345,
  name: "GOAT Mainnet",
  rpcUrl: "https://rpc.goat.network",
  explorerUrl: "https://explorer.goat.network",
  nativeCurrency: { name: "Bitcoin", symbol: "BTC", decimals: 18 },
} as const;

/** Hardhat local chain (deployer mnemonic — used by `npm run node:local`). */
export const HARDHAT_LOCAL = {
  chainId: 31337,
  name: "Hardhat Localhost",
  rpcUrl: "http://127.0.0.1:8545",
  explorerUrl: "",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
} as const;

/** ERC-20 token addresses on GOAT Testnet3 (overridden per env in dev). */
export const TOKENS = {
  /** Real USDC.e on GOAT mainnet: 0x3022b87ac063DE95b1570F46f5e470F8B53112D8 */
  USDC: "0x29d1ee93e9ecf6e50f309f498e40a6b42d352fa1",
  USDT: "0xdce0af57e8f2ce957b3838cd2a2f3f3677965dd3",
} as const;

export const USDC_DECIMALS = 6;

/**
 * PaidProof's custom contracts. Addresses populated from `deployments/<network>.json`
 * after `npm run deploy:local` or `npm run deploy:goat`. Values here are placeholders;
 * agent code prefers `process.env.PAIDPROOF_*` overrides.
 */
export const PAIDPROOF = {
  agentRegistry: process.env.PAIDPROOF_REGISTRY_ADDRESS ?? "",
  escrow: process.env.PAIDPROOF_ESCROW_ADDRESS ?? "",
  usdc: process.env.PAIDPROOF_USDC_ADDRESS ?? "",
} as const;

/** Legacy ERC-8004 deployments on GOAT Testnet3 (kept for optional discovery). */
export const ERC8004 = {
  identityRegistry: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",
  reputationRegistry: "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63",
  registryNamespace: "eip155:48816:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",
} as const;

/** Default agent ports for local dev. */
export const PORTS = {
  dashboard: 3000,
  foreman: 3100,      // Lead Verifier
  researcher: 3101,   // FileSpec specialist
  writer: 3102,       // ColorVision specialist
  aesthetic: 3103,    // AestheticJudge specialist (NEW)
} as const;

/** Bid ranking: score = reputation - RANKING_PRICE_WEIGHT * priceUsdc. */
export const RANKING_PRICE_WEIGHT = 0.5;

/** Per-specialist x402 price in base USDC units (6 decimals). */
export const DEFAULT_PRICES = {
  /** 0.02 USDC — FileSpec specialist */
  verify_filespec: 20_000n,
  /** 0.03 USDC — ColorVision specialist */
  verify_colorvision: 30_000n,
  /** 0.05 USDC — AestheticJudge specialist */
  verify_aesthetic: 50_000n,
} as const;

/**
 * Skill ids advertised on each specialist's agent card and routed by the Lead Verifier.
 *
 * The Lead Verifier itself does not advertise a paid skill — it is the orchestrator
 * that humans pay (indirectly, via the escrow) rather than via x402.
 */
export const SKILLS = {
  /** Lead Verifier orchestrator (no x402 price, no /work endpoint pricing). */
  VERIFY_LEAD: "verify.lead",
  /** FileSpec specialist — checks file type, dimensions, size. */
  VERIFY_FILESPEC: "verify.filespec",
  /** ColorVision specialist — checks brand color presence. */
  VERIFY_COLORVISION: "verify.colorvision",
  /** AestheticJudge specialist — vision LLM "is this a real logo". */
  VERIFY_AESTHETIC: "verify.aesthetic",
} as const;

export type SkillId = (typeof SKILLS)[keyof typeof SKILLS];

/** Reputation tag literals (string form; agents bytes32-encode at call site). */
export const REPUTATION_TAGS = {
  VERIFICATION: "paidproof.verify",
  DELIVERY: "paidproof.deliver",
  PAYMENT: "paidproof.pay",
} as const;

/** Job lifecycle on the Escrow contract — must match Solidity enum ordering. */
export const ESCROW_STATUS = {
  None: 0,
  Open: 0,
  Funded: 1,
  Delivered: 2,
  Verified: 3,
  Released: 4,
  Disputed: 5,
  Refunded: 6,
} as const;

/** Agent roles on AgentRegistry — must match Solidity enum ordering. */
export const AGENT_ROLES = {
  Freelancer: 0,
  Client: 1,
  Verifier: 2,
  Specialist: 3,
} as const;

/** GOAT requires explicit non-default gas pricing. */
export const GOAT_GAS = {
  maxPriorityFeePerGas: 130_000n,
  maxFeePerGas: 1_000_000n,
} as const;

// X402Mode lives in ./x402.ts — re-exported from the package index.
