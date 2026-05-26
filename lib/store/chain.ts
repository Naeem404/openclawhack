import { nanoid } from "nanoid";
import type { ChainEvent, WalletState } from "@/lib/types";
import { config } from "@/lib/config";

class ChainStore {
  private events: ChainEvent[] = [];
  private wallet: WalletState;
  private nextBlock = 12_560_316;

  constructor() {
    this.wallet = {
      address: "0x7679E1f285335addBADE42fd44559F51c4B42123",
      erc8004Id: 14,
      network: "GOAT Mainnet",
      chainId: config.goat.chainId,
      balances: {
        native: { symbol: "BTC", amount: 0.00031 },
        usdc: { symbol: "USDC", amount: 8.42 },
        usdt: { symbol: "USDT", amount: 12.0 },
      },
      txCount: 7,
      registered: true,
    };
  }

  getWallet() {
    return this.wallet;
  }

  setWallet(patch: Partial<WalletState>) {
    this.wallet = { ...this.wallet, ...patch };
    return this.wallet;
  }

  bumpUsdc(delta: number) {
    this.wallet.balances.usdc.amount = Math.max(
      0,
      +(this.wallet.balances.usdc.amount + delta).toFixed(6),
    );
    this.wallet.txCount += 1;
    return this.wallet;
  }

  listEvents(n = 100): ChainEvent[] {
    return this.events.slice(-n).reverse();
  }

  push(ev: Omit<ChainEvent, "block" | "ts" | "explorerUrl"> & Partial<Pick<ChainEvent, "block" | "ts" | "explorerUrl">>): ChainEvent {
    const block = ev.block ?? this.nextBlock++;
    const full: ChainEvent = {
      hash: ev.hash,
      block,
      ts: ev.ts ?? new Date().toISOString(),
      type: ev.type,
      from: ev.from,
      to: ev.to,
      amount: ev.amount,
      token: ev.token,
      caseId: ev.caseId,
      status: ev.status,
      explorerUrl: ev.explorerUrl ?? `${config.goat.explorer}/tx/${ev.hash}`,
    };
    this.events.push(full);
    if (this.events.length > 500) this.events.shift();
    return full;
  }

  /** Mark a previously pending tx as confirmed by hash. */
  confirm(hash: string) {
    const ev = this.events.find((e) => e.hash === hash);
    if (ev) ev.status = "confirmed";
    return ev;
  }

  reset() {
    this.events = [];
    this.wallet.txCount = 7;
    this.wallet.balances.usdc.amount = 8.42;
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __refundrex_chain: ChainStore | undefined;
}

export const chainStore: ChainStore =
  globalThis.__refundrex_chain ??
  (globalThis.__refundrex_chain = new ChainStore());
