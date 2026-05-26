# RefundRex on-chain components

| Contract | Purpose | Where it lives |
| --- | --- | --- |
| `ERC8004TrustlessAgents.sol` | Reference of the **existing** registry already deployed at `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` on GOAT Mainnet. Documented here so judges can audit the surface RefundRex hits. | already deployed |
| `RefundRexReputation.sol` | An append-only reputation ledger keyed off ERC-8004 agent IDs. Each successful resolution is anchored on-chain. Optional companion contract. | deploy via `npm run deploy:contracts` |

## Why both?

`ERC8004TrustlessAgents` already exists and is canonical for identity. Our
companion `RefundRexReputation` adds rich, queryable per-resolution metadata
(recovered amount + x402 settlement hash) without bloating the registry.

The frontend treats both as optional in demo mode — see `lib/chain/erc8004.ts`
and `lib/chain/x402.ts` for the swap-points.

## Deploy notes

```bash
# Compile (use foundry / hardhat — both work)
forge build

# Deploy reputation contract pointing at the live registry
export RPC=https://rpc.goat.network
export PK=$AGENT_WALLET_PRIVATE_KEY
forge create RefundRexReputation \
  --rpc-url $RPC \
  --private-key $PK \
  --constructor-args 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432
```

The deploy tx will appear on the [GOAT explorer](https://explorer.goat.network).
