/**
 * ERC-8004 — Trustless Agent Identity Registry on GOAT Network.
 *
 * Real contract: 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432 (chain 2345)
 * Minimal ABI used:
 *    function register(string name) external
 *    function setUri(uint256 agentId, string uri) external
 *    function getAgentWallet(uint256) view returns (address)
 *
 * The demo path simulates registration with a deterministic agent ID and a
 * realistic tx hash so the dashboard always has something to render.
 */
import { config } from "@/lib/config";
import { goat } from "@/lib/chain/goat";
import { wallet } from "@/lib/chain/wallet";
import { chainStore } from "@/lib/store/chain";
import { log } from "@/lib/store/events";

export interface AgentManifest {
  name: string;
  description: string;
  url: string;
  wallet: string;
  capabilities: string[];
  x402?: {
    merchantId: string;
    receiveType: "DIRECT" | "ESCROW";
    token: string;
  };
}

export const erc8004 = {
  registry: config.erc8004.registry,

  buildManifest(extra?: Partial<AgentManifest>): AgentManifest {
    return {
      name: "refundrex_bot",
      description:
        "Autonomous refund & dispute resolution agent (RefundRex). Handles delivery problems, negotiates with merchants, settles refunds on x402.",
      url: "https://refundrex.xyz",
      wallet: wallet.address(),
      capabilities: [
        "track_shipment",
        "classify_issue",
        "negotiate_refund",
        "escalate_dispute",
        "agent_to_agent",
        "x402_settlement",
      ],
      x402: {
        merchantId: config.x402.merchantId,
        receiveType: "DIRECT",
        token: config.x402.token,
      },
      ...extra,
    };
  },

  /** Returns the public URI/manifest the registry should pin. */
  manifestUri(): string {
    return config.erc8004.agentUri;
  },

  async register(): Promise<{ agentId: number; txHash: string; explorerUrl: string }> {
    log("erc8004", "info", "📜  Submitting register(name) to ERC-8004 registry…");
    const tx = await goat.sendTransaction({
      to: erc8004.registry,
      label: "ERC-8004 register",
      type: "erc8004_register",
    });

    const agentId = 14 + Math.floor(Math.random() * 4);
    chainStore.setWallet({ erc8004Id: agentId, registered: true });
    log(
      "erc8004",
      "success",
      `🆔  Registered as agentId #${agentId} on ERC-8004`,
    );
    return { agentId, txHash: tx.hash, explorerUrl: tx.explorerUrl };
  },

  async updateUri(agentId: number, uri: string) {
    log("erc8004", "info", `🔁  Updating URI for #${agentId} → ${uri}`);
    return goat.sendTransaction({
      to: erc8004.registry,
      label: "ERC-8004 setUri",
      type: "erc8004_uri_update",
    });
  },

  /** Read-only "view" call. Demo returns the current agent wallet. */
  async getAgentWallet(agentId: number): Promise<string> {
    void agentId;
    return wallet.address();
  },

  scanUrl(): string {
    return config.erc8004.scanUrl;
  },
};
