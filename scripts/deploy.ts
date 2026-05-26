/**
 * Convenience wrapper that documents the deploy flow. The actual deploy
 * uses forge — this just prints the command + sanity-checks env vars.
 */
const required = ["GOAT_RPC_URL", "AGENT_WALLET_PRIVATE_KEY"];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`❌  missing env: ${missing.join(", ")}`);
  process.exit(1);
}

const registry = process.env.ERC8004_REGISTRY_ADDRESS ?? "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432";

console.log("──────────────────────────────────────");
console.log(" RefundRex deploy (RefundRexReputation)");
console.log("──────────────────────────────────────");
console.log(`rpc:      ${process.env.GOAT_RPC_URL}`);
console.log(`registry: ${registry}`);
console.log("");
console.log(`forge create RefundRexReputation \\`);
console.log(`  --rpc-url ${process.env.GOAT_RPC_URL} \\`);
console.log(`  --private-key $AGENT_WALLET_PRIVATE_KEY \\`);
console.log(`  --constructor-args ${registry}`);
console.log("");
console.log("Run the command above with forge installed. The contract source is in contracts/RefundRexReputation.sol.");
