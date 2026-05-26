import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);
  console.log("Network:", hre.network.name, "Chain ID:", (await hre.ethers.provider.getNetwork()).chainId);

  // 1. AgentRegistry (ERC-8004 minimal)
  const Registry = await hre.ethers.getContractFactory("AgentRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();
  const registryAddr = await registry.getAddress();
  console.log("AgentRegistry deployed:", registryAddr);

  // 2. MockUSDC (on mainnet, swap for real 0x3022b87ac063DE95b1570F46f5e470F8B53112D8)
  let usdcAddr;
  if (hre.network.name === "goat") {
    usdcAddr = process.env.GOAT_USDC || "0x3022b87ac063DE95b1570F46f5e470F8B53112D8";
    console.log("Using GOAT mainnet USDC.e:", usdcAddr);
  } else {
    const USDC = await hre.ethers.getContractFactory("MockUSDC");
    const usdc = await USDC.deploy();
    await usdc.waitForDeployment();
    usdcAddr = await usdc.getAddress();
    console.log("MockUSDC deployed:", usdcAddr);
  }

  // 3. Escrow
  const Escrow = await hre.ethers.getContractFactory("Escrow");
  const escrow = await Escrow.deploy(usdcAddr, registryAddr);
  await escrow.waitForDeployment();
  const escrowAddr = await escrow.getAddress();
  console.log("Escrow deployed:", escrowAddr);

  // Persist deployed addresses for the agent server + frontend.
  const out = {
    network: hre.network.name,
    chainId: Number((await hre.ethers.provider.getNetwork()).chainId),
    registry: registryAddr,
    usdc: usdcAddr,
    escrow: escrowAddr,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
  };

  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, `${hre.network.name}.json`),
    JSON.stringify(out, null, 2)
  );
  fs.writeFileSync(
    path.join(outDir, "latest.json"),
    JSON.stringify(out, null, 2)
  );
  console.log("\nDeployment saved to deployments/" + hre.network.name + ".json");
  console.log("\nNext: npm run register:" + (hre.network.name === "goat" ? "goat" : "local"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
