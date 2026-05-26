/**
 * One-shot ERC-8004 registration for HERD agents.
 * Implements packet P03.
 *
 * Usage:
 *   pnpm register --agent foreman
 *   pnpm register --agent researcher
 *   pnpm register --agent writer
 *   pnpm register --all
 *
 * Behavior:
 *   1. Loads <agent>/agent-card.json.
 *   2. Builds a data: URI of the base64-encoded card (MVP; swap for IPFS later).
 *   3. Calls IdentityRegistry.register(agentURI) from the agent's wallet.
 *   4. Parses the resulting Transfer event → tokenId = agentId.
 *   5. Updates `.env` with <AGENT>_AGENT_ID=<id>.
 *   6. Idempotent: if the wallet already owns an NFT in the registry, skip.
 */
import "dotenv/config";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEventLogs,
  defineChain,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { ERC8004, GOAT_TESTNET3, GOAT_GAS } from "@herd/shared/constants";
import { IDENTITY_REGISTRY_ABI } from "@herd/shared/abi";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..", "..");

const chain = defineChain({
  id: GOAT_TESTNET3.chainId,
  name: GOAT_TESTNET3.name,
  nativeCurrency: GOAT_TESTNET3.nativeCurrency,
  rpcUrls: { default: { http: [GOAT_TESTNET3.rpcUrl] } },
  blockExplorers: { default: { name: "GOAT Explorer", url: GOAT_TESTNET3.explorerUrl } },
});

type AgentName = "foreman" | "researcher" | "writer";

const AGENT_CONFIG: Record<AgentName, { pkVar: string; idVar: string; addrVar: string; cardPath: string }> = {
  foreman:    { pkVar: "FOREMAN_PRIVATE_KEY",    idVar: "FOREMAN_AGENT_ID",    addrVar: "FOREMAN_WALLET_ADDRESS",    cardPath: "agents/foreman/agent-card.json" },
  researcher: { pkVar: "RESEARCHER_PRIVATE_KEY", idVar: "RESEARCHER_AGENT_ID", addrVar: "RESEARCHER_WALLET_ADDRESS", cardPath: "agents/researcher/agent-card.json" },
  writer:     { pkVar: "WRITER_PRIVATE_KEY",     idVar: "WRITER_AGENT_ID",     addrVar: "WRITER_WALLET_ADDRESS",     cardPath: "agents/writer/agent-card.json" },
};

function buildDataUri(cardJsonPath: string): string {
  const json = readFileSync(cardJsonPath, "utf-8");
  const b64 = Buffer.from(json, "utf-8").toString("base64");
  return `data:application/json;base64,${b64}`;
}

async function registerOne(name: AgentName): Promise<void> {
  const cfg = AGENT_CONFIG[name];
  const pk = process.env[cfg.pkVar];
  if (!pk) {
    console.error(`[register] ${name}: missing env ${cfg.pkVar}; skipping`);
    return;
  }
  const account = privateKeyToAccount(pk as Hex);
  const cardPath = join(repoRoot, cfg.cardPath);
  if (!existsSync(cardPath)) {
    console.error(`[register] ${name}: missing agent-card.json at ${cardPath}; skipping`);
    return;
  }

  const publicClient = createPublicClient({ chain, transport: http(GOAT_TESTNET3.rpcUrl) });
  const walletClient = createWalletClient({ account, chain, transport: http(GOAT_TESTNET3.rpcUrl) });

  // Idempotency: if this wallet already owns at least one NFT in the registry, skip.
  const existingBalance = await publicClient.readContract({
    address: ERC8004.identityRegistry as Hex,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: "balanceOf",
    args: [account.address],
  });
  if (existingBalance > 0n) {
    const existingTokenId = await publicClient.readContract({
      address: ERC8004.identityRegistry as Hex,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: "tokenOfOwnerByIndex",
      args: [account.address, 0n],
    });
    console.log(`[register] ${name}: already registered (agentId=${existingTokenId}); writing to .env`);
    writeEnvVars({
      [cfg.idVar]: existingTokenId.toString(),
      [cfg.addrVar]: account.address,
    });
    return;
  }

  const agentURI = buildDataUri(cardPath);

  console.log(`[register] ${name}: submitting register(agentURI) from ${account.address}…`);

  const txHash = await walletClient.writeContract({
    address: ERC8004.identityRegistry as Hex,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: "register",
    args: [agentURI],
    maxFeePerGas: GOAT_GAS.maxFeePerGas,
    maxPriorityFeePerGas: GOAT_GAS.maxPriorityFeePerGas,
  });

  console.log(`[register] ${name}: tx submitted ${txHash}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

  const logs = parseEventLogs({
    abi: IDENTITY_REGISTRY_ABI,
    eventName: "Transfer",
    logs: receipt.logs,
  });
  const transferLog = logs.find(
    (l) => l.args.from === "0x0000000000000000000000000000000000000000" && l.args.to === account.address,
  );
  if (!transferLog) {
    console.error(`[register] ${name}: could not parse mint Transfer event from logs; receipt=${txHash}`);
    return;
  }
  const tokenId = transferLog.args.tokenId;

  console.log(
    `[register] ${name} → agentId=${tokenId}  tx=${txHash}  ${GOAT_TESTNET3.explorerUrl}/tx/${txHash}`,
  );

  writeEnvVars({
    [cfg.idVar]: tokenId.toString(),
    [cfg.addrVar]: account.address,
  });
}

function writeEnvVars(vars: Record<string, string>): void {
  const envPath = join(repoRoot, ".env");
  let body = existsSync(envPath) ? readFileSync(envPath, "utf-8") : "";
  for (const [key, value] of Object.entries(vars)) {
    const line = `${key}=${value}`;
    const re = new RegExp(`^${key}=.*$`, "m");
    body = re.test(body) ? body.replace(re, line) : body + (body.endsWith("\n") || body === "" ? "" : "\n") + line + "\n";
  }
  writeFileSync(envPath, body, "utf-8");
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      agent: { type: "string" },
      all: { type: "boolean", default: false },
    },
  });

  if (values.all) {
    for (const name of ["foreman", "researcher", "writer"] as const) await registerOne(name);
    return;
  }
  if (values.agent && (values.agent in AGENT_CONFIG)) {
    await registerOne(values.agent as AgentName);
    return;
  }
  console.error("Usage: pnpm register --agent <foreman|researcher|writer> | --all");
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
