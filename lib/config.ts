export const config = {
  appName: "RefundRex",
  agentName: "refundrex_bot",
  tagline: "Autonomous Refund & Dispute Agent",
  goat: {
    rpc: process.env.GOAT_RPC_URL ?? "https://rpc.goat.network",
    chainId: Number(process.env.GOAT_CHAIN_ID ?? 2345),
    explorer:
      process.env.GOAT_EXPLORER_URL ?? "https://explorer.goat.network",
  },
  erc8004: {
    registry:
      process.env.ERC8004_REGISTRY_ADDRESS ??
      "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",
    agentUri:
      process.env.ERC8004_AGENT_URI ?? "https://refundrex.xyz/agent.json",
    scanUrl: "https://8004scan.io/agents?chain=2345",
  },
  x402: {
    apiUrl:
      process.env.GOATX402_API_URL ??
      "https://x402-merchant.goat.network/api",
    merchantId: process.env.GOATX402_MERCHANT_ID ?? "refundrex",
    token: (process.env.GOATX402_TOKEN ?? "USDC") as "USDC" | "USDT",
    amount: Number(process.env.GOATX402_AMOUNT ?? "0.10"),
    usdc:
      process.env.GOATX402_USDC_CONTRACT ??
      "0x3022b87ac063DE95b1570F46f5e470F8B53112D8",
  },
  demo: {
    enabled:
      (process.env.DEMO_MODE ?? "true").toLowerCase() === "true" ||
      process.env.NODE_ENV !== "production",
    // visual cadence
    actionDelayMs: [600, 1400] as const,
    txDelayMs: [800, 2200] as const,
  },
  llm: {
    provider: (process.env.LLM_PROVIDER ?? "mock") as
      | "mock"
      | "openai"
      | "anthropic",
    model: process.env.LLM_MODEL ?? "deepseek/deepseek-chat",
  },
};

export type AppConfig = typeof config;
