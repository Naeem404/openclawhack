/**
 * Print BTC (gas) and USDC balances for all three HERD agent wallets.
 * Useful as a pre-demo sanity check.
 */
import "dotenv/config";
import { createPublicClient, http, defineChain, formatUnits, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { GOAT_TESTNET3, TOKENS, USDC_DECIMALS } from "@herd/shared/constants";
import { ERC20_ABI } from "@herd/shared/abi";

const chain = defineChain({
  id: GOAT_TESTNET3.chainId,
  name: GOAT_TESTNET3.name,
  nativeCurrency: GOAT_TESTNET3.nativeCurrency,
  rpcUrls: { default: { http: [GOAT_TESTNET3.rpcUrl] } },
});

const client = createPublicClient({ chain, transport: http(GOAT_TESTNET3.rpcUrl) });

const AGENTS = [
  { name: "foreman",    pkVar: "FOREMAN_PRIVATE_KEY" },
  { name: "researcher", pkVar: "RESEARCHER_PRIVATE_KEY" },
  { name: "writer",     pkVar: "WRITER_PRIVATE_KEY" },
] as const;

async function main(): Promise<void> {
  console.log(`HERD agent balances on ${GOAT_TESTNET3.name} (chain ${GOAT_TESTNET3.chainId})`);
  console.log("─".repeat(80));

  for (const a of AGENTS) {
    const pk = process.env[a.pkVar];
    if (!pk) {
      console.log(`${a.name.padEnd(12)}  (no key)`);
      continue;
    }
    const acct = privateKeyToAccount(pk as Hex);
    const btc = await client.getBalance({ address: acct.address });
    const usdc = await client.readContract({
      address: TOKENS.USDC as Hex,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [acct.address],
    });
    console.log(
      `${a.name.padEnd(12)}  ${acct.address}  BTC=${formatUnits(btc, 18).padStart(10)}  USDC=${formatUnits(usdc, USDC_DECIMALS).padStart(10)}`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
