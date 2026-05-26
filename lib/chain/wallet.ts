/**
 * Agent wallet wrapper.
 *
 * In production this would hold an ethers.Wallet / viem.Account loaded from
 * env (AGENT_WALLET_PRIVATE_KEY) — never logged, never echoed. In demo mode
 * we expose only the public address through the chain store.
 */
import { chainStore } from "@/lib/store/chain";
import { log } from "@/lib/store/events";
import { fakeAddress, fakeTxHash } from "@/lib/utils";

export const wallet = {
  address(): string {
    return chainStore.getWallet().address;
  },

  state() {
    return chainStore.getWallet();
  },

  /** Create a fresh wallet (demo). Returns address + a redacted preview only. */
  generate(): { address: string; privateKeyPreview: string } {
    const address = fakeAddress("agent");
    const pkPreview =
      "0x" + fakeTxHash(address).slice(2, 10) + "…" + fakeTxHash(address).slice(-6);
    chainStore.setWallet({ address, registered: false, erc8004Id: undefined });
    log("wallet", "success", `🔑  Generated agent wallet ${address}`);
    return { address, privateKeyPreview: pkPreview };
  },

  /** Sign + send abstraction is provided through lib/chain/goat. */
  sign(message: string): string {
    const sig = "0x" + fakeTxHash("sig:" + message);
    log("wallet", "info", `✍️   Signed message (${sig.slice(0, 14)}…)`);
    return sig;
  },
};
