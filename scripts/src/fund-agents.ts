/**
 * Distribute BTC (for gas) + USDC (for x402 payments) from a master wallet
 * to each HERD agent wallet.
 *
 * Usage:
 *   MASTER_PRIVATE_KEY=0x… pnpm fund
 *
 * Reads target amounts from env (defaults shown):
 *   FUND_BTC_EACH=0.001       BTC per agent
 *   FUND_USDC_EACH=0.50       USDC per agent
 */
import "dotenv/config";
import {
  createPublicClient,
  createWalletClient,
  http,
  defineChain,
  parseEther,
  parseUnits,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { GOAT_TESTNET3, TOKENS, USDC_DECIMALS, GOAT_GAS } from "@herd/shared/constants";
import { ERC20_ABI } from "@herd/shared/abi";

const chain = defineChain({
  id: GOAT_TESTNET3.chainId,
  name: GOAT_TESTNET3.name,
  nativeCurrency: GOAT_TESTNET3.nativeCurrency,
  rpcUrls: { default: { http: [GOAT_TESTNET3.rpcUrl] } },
});

const TARGETS = [
  { name: "foreman",    pkVar: "FOREMAN_PRIVATE_KEY" },
  { name: "researcher", pkVar: "RESEARCHER_PRIVATE_KEY" },
  { name: "writer",     pkVar: "WRITER_PRIVATE_KEY" },
] as const;

async function main(): Promise<void> {
  const masterPk = process.env.MASTER_PRIVATE_KEY;
  if (!masterPk) {
    console.error("MASTER_PRIVATE_KEY required to fund agents.");
    process.exit(1);
  }
  const master = privateKeyToAccount(masterPk as Hex);
  const wallet = createWalletClient({ account: master, chain, transport: http(GOAT_TESTNET3.rpcUrl) });
  const publicClient = createPublicClient({ chain, transport: http(GOAT_TESTNET3.rpcUrl) });

  const btcEach = parseEther(process.env.FUND_BTC_EACH ?? "0.001");
  const usdcEach = parseUnits(process.env.FUND_USDC_EACH ?? "0.50", USDC_DECIMALS);

  for (const t of TARGETS) {
    const pk = process.env[t.pkVar];
    if (!pk) {
      console.log(`[fund] ${t.name}: no key, skipping`);
      continue;
    }
    const recipient = privateKeyToAccount(pk as Hex);

    // BTC (native) transfer
    const btcTx = await wallet.sendTransaction({
      to: recipient.address,
      value: btcEach,
      maxFeePerGas: GOAT_GAS.maxFeePerGas,
      maxPriorityFeePerGas: GOAT_GAS.maxPriorityFeePerGas,
    });
    await publicClient.waitForTransactionReceipt({ hash: btcTx });
    console.log(`[fund] ${t.name}: BTC tx ${btcTx}`);

    // USDC transfer
    const usdcTx = await wallet.writeContract({
      address: TOKENS.USDC as Hex,
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [recipient.address, usdcEach],
      maxFeePerGas: GOAT_GAS.maxFeePerGas,
      maxPriorityFeePerGas: GOAT_GAS.maxPriorityFeePerGas,
    });
    await publicClient.waitForTransactionReceipt({ hash: usdcTx });
    console.log(`[fund] ${t.name}: USDC tx ${usdcTx}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
