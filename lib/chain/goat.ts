/**
 * GOAT Network client adapter.
 *
 * In production this would wrap viem/ethers against the real RPC. For the
 * hackathon demo we run a deterministic, latency-aware mock that always
 * produces realistic-looking transaction hashes, block numbers, and events.
 *
 * The public surface mirrors what an "ethers.Provider"-style client would
 * expose, so swapping to the real RPC is a one-line change.
 */
import { config } from "@/lib/config";
import { chainStore } from "@/lib/store/chain";
import { log } from "@/lib/store/events";
import { fakeTxHash, randomBetween, sleep } from "@/lib/utils";
import type { ChainEvent } from "@/lib/types";

export interface SendTxArgs {
  to: string;
  data?: string;
  value?: number;
  caseId?: string;
  label: string;
  type: ChainEvent["type"];
  token?: string;
  amount?: number;
}

export interface SendTxResult {
  hash: string;
  block: number;
  status: "pending" | "confirmed";
  explorerUrl: string;
}

class GoatClient {
  readonly chainId = config.goat.chainId;
  readonly rpc = config.goat.rpc;
  readonly explorer = config.goat.explorer;

  async getBlockNumber(): Promise<number> {
    return 12_560_000 + Math.floor(Math.random() * 10_000);
  }

  /**
   * Simulate (or in prod, actually send) a signed transaction.
   * Returns immediately with a pending event, then asynchronously confirms.
   */
  async sendTransaction(args: SendTxArgs): Promise<SendTxResult> {
    const hash = fakeTxHash(args.label + args.to + Date.now());
    const wallet = chainStore.getWallet();

    const pending = chainStore.push({
      hash,
      type: args.type,
      from: wallet.address,
      to: args.to,
      amount: args.amount,
      token: args.token,
      caseId: args.caseId,
      status: "pending",
    });

    log(
      "chain",
      "info",
      `📡  Broadcasting ${args.label} → ${args.to.slice(0, 10)}…  tx=${hash.slice(0, 12)}…`,
      args.caseId,
    );

    // Confirm after a realistic delay
    const delay = randomBetween(
      config.demo.txDelayMs[0],
      config.demo.txDelayMs[1],
    );
    setTimeout(() => {
      chainStore.confirm(hash);
      log(
        "chain",
        "success",
        `✅  Confirmed in block #${pending.block.toLocaleString()}  (${args.label})`,
        args.caseId,
      );
    }, delay);

    return {
      hash,
      block: pending.block,
      status: "pending",
      explorerUrl: pending.explorerUrl,
    };
  }

  async waitForReceipt(hash: string, timeoutMs = 5000): Promise<ChainEvent> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const ev = chainStore.listEvents(500).find((e) => e.hash === hash);
      if (ev && ev.status === "confirmed") return ev;
      await sleep(150);
    }
    // Time out — return whatever we have, marked confirmed (demo mode)
    chainStore.confirm(hash);
    return (
      chainStore.listEvents(500).find((e) => e.hash === hash) ?? {
        hash,
        block: 0,
        ts: new Date().toISOString(),
        type: "transfer",
        from: "0x",
        to: "0x",
        status: "confirmed",
        explorerUrl: `${this.explorer}/tx/${hash}`,
      }
    );
  }

  explorerTx(hash: string) {
    return `${this.explorer}/tx/${hash}`;
  }

  explorerAddress(addr: string) {
    return `${this.explorer}/address/${addr}`;
  }
}

export const goat = new GoatClient();
