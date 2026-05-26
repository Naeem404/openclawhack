import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Register the 4 agent identities (ERC-8004) used by PaidProof:
//   - Lead Verifier (signs escrow releases)
//   - FileSpecAgent
//   - ColorVisionAgent
//   - AestheticJudgeAgent
//
// On localhost we use Hardhat's pre-funded accounts.
// On GOAT mainnet, signer keys are read from .env and MUST already hold a small gas balance.

async function buildUri(name, description, wallet) {
  return JSON.stringify({
    name,
    description,
    url: "https://paidproof.app",
    wallet,
    schema: "ERC-8004",
    network: "GOAT",
  });
}

async function ensureRegistered(registry, signer, name, role, description) {
  const connected = registry.connect(signer);
  const existing = await registry.walletToAgentId(signer.address);
  if (existing > 0n) {
    console.log(`  ✓ ${name} already registered (id=${existing.toString()})`);
    return Number(existing);
  }
  const uri = await buildUri(name, description, signer.address);
  const tx = await connected.register(name, uri, role);
  const receipt = await tx.wait();
  const event = receipt.logs
    .map((l) => {
      try { return registry.interface.parseLog(l); } catch { return null; }
    })
    .find((e) => e && e.name === "AgentRegistered");
  const id = Number(event.args.agentId);
  console.log(`  ✓ Registered ${name} as agent #${id} -> ${signer.address}`);
  return id;
}

async function main() {
  const network = hre.network.name;
  const deploymentPath = path.join(__dirname, "..", "deployments", `${network}.json`);
  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`Deployment not found for ${network}. Run npm run deploy:${network === "goat" ? "goat" : "local"} first.`);
  }
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const Registry = await hre.ethers.getContractFactory("AgentRegistry");
  const registry = Registry.attach(deployment.registry);

  const signers = await hre.ethers.getSigners();

  // Role enum: 0=Freelancer, 1=Client, 2=Verifier, 3=Specialist
  console.log("\nRegistering agents on ERC-8004 registry:", deployment.registry);

  const leadId = await ensureRegistered(
    registry, signers[1],
    "paidproof_lead_verifier",
    2,
    "Lead Verifier — orchestrates specialist agents and signs escrow releases."
  );

  const fileSpecId = await ensureRegistered(
    registry, signers[2],
    "paidproof_file_spec",
    3,
    "Specialist — verifies file type, dimensions, size against criteria."
  );

  const colorVisionId = await ensureRegistered(
    registry, signers[3],
    "paidproof_color_vision",
    3,
    "Specialist — verifies brand colors are present in delivered artwork."
  );

  const aestheticId = await ensureRegistered(
    registry, signers[4],
    "paidproof_aesthetic_judge",
    3,
    "Specialist — judges whether the deliverable is a real artifact vs. placeholder."
  );

  // Demo participants — register a freelancer + client identity so reputation flows.
  const freelancerId = await ensureRegistered(
    registry, signers[5],
    "sarah_designer_lagos",
    0,
    "Freelance designer with portable reputation."
  );

  const clientId = await ensureRegistered(
    registry, signers[6],
    "marcus_startup_toronto",
    1,
    "Startup founder hiring via PaidProof."
  );

  const agents = {
    network,
    chainId: deployment.chainId,
    registry: deployment.registry,
    escrow: deployment.escrow,
    usdc: deployment.usdc,
    leadVerifier: { id: leadId, wallet: signers[1].address, privateKey: signers[1].privateKey || null },
    fileSpec: { id: fileSpecId, wallet: signers[2].address, privateKey: signers[2].privateKey || null },
    colorVision: { id: colorVisionId, wallet: signers[3].address, privateKey: signers[3].privateKey || null },
    aestheticJudge: { id: aestheticId, wallet: signers[4].address, privateKey: signers[4].privateKey || null },
    freelancer: { id: freelancerId, wallet: signers[5].address, privateKey: signers[5].privateKey || null },
    client: { id: clientId, wallet: signers[6].address, privateKey: signers[6].privateKey || null },
  };

  // On localhost we know all private keys (deterministic Hardhat mnemonic).
  if (network === "localhost" || network === "hardhat") {
    const hardhatPks = [
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
      "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
      "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
      "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
      "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
      "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba",
      "0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e",
    ];
    agents.leadVerifier.privateKey = hardhatPks[1];
    agents.fileSpec.privateKey = hardhatPks[2];
    agents.colorVision.privateKey = hardhatPks[3];
    agents.aestheticJudge.privateKey = hardhatPks[4];
    agents.freelancer.privateKey = hardhatPks[5];
    agents.client.privateKey = hardhatPks[6];
  }

  const outDir = path.join(__dirname, "..", "deployments");
  fs.writeFileSync(path.join(outDir, "agents.json"), JSON.stringify(agents, null, 2));
  console.log("\nAgent registry saved to deployments/agents.json");

  // Fund client with mock USDC if on local network so the demo can run immediately.
  if (network === "localhost" || network === "hardhat") {
    const Usdc = await hre.ethers.getContractFactory("MockUSDC");
    const usdc = Usdc.attach(deployment.usdc);
    const tx = await usdc.mint(signers[6].address, 1_000_000_000n); // 1000 USDC (6 decimals)
    await tx.wait();
    console.log("Minted 1000 mock USDC to client wallet for demo.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
