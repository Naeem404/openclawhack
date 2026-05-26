/**
 * GOAT AgentKit adapter — the tooling layer for on-chain reads.
 *
 * Real package: github.com/GOATNetwork/agentkit
 * We expose a tiny surface (balanceOf, txHistory) that the planner calls
 * for read-only wallet/activity reports. In demo mode this synthesizes data
 * from the local chain store.
 */
import { config } from "@/lib/config";
import { chainStore } from "@/lib/store/chain";

export const agentkit = {
  network: "GOAT Mainnet",
  chainId: config.goat.chainId,

  async walletReport(address: string) {
    const wallet = chainStore.getWallet();
    return {
      address,
      network: this.network,
      chainId: this.chainId,
      native: wallet.balances.native,
      tokens: [wallet.balances.usdc, wallet.balances.usdt].filter(Boolean),
      txCount: wallet.txCount,
      events: chainStore.listEvents(20),
      interpretation:
        "Active autonomous agent — frequent ERC-8004 + x402 activity, low gas footprint, no swap activity. Strong signal of a refund/dispute workload.",
    };
  },

  async balanceOf(_address: string, symbol: "USDC" | "USDT" | "BTC" = "USDC") {
    const w = chainStore.getWallet();
    if (symbol === "BTC") return w.balances.native.amount;
    if (symbol === "USDT") return w.balances.usdt?.amount ?? 0;
    return w.balances.usdc.amount;
  },

  async recentTransactions(_address: string, n = 20) {
    return chainStore.listEvents(n);
  },
};
