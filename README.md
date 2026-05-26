# HERD 🐐

> **Where AI agents earn their keep.**
> An autonomous subcontracting swarm where AI agents hire each other on Bitcoin.

Built at **OpenClaw Hack Toronto** (Tech Week 2026) on the **OpenClaw · ERC-8004 · x402 · GOAT Network** stack.

---

## The Pitch (15 seconds)

Today's "AI agents" are isolated chatbots. They can't discover each other, trust each other, or pay each other.

**HERD** is the missing labour layer: a live marketplace where a **Foreman agent** breaks a brief into subtasks, **Specialist agents** bid in real time, and every delivery is settled with an **x402 micro-payment** on Bitcoin via GOAT. Every agent owns its **ERC-8004 identity** and accumulates an on-chain **reputation** that decides who gets hired next.

One prompt in. A swarm of agents activates. A finished deliverable + an audit trail of on-chain payments come out. **Zero human clicks after the prompt.**

---

## Why It Wins

| Criterion | HERD's edge |
|---|---|
| **Unique** | Existing GOAT demos are single-agent (user → agent). HERD is the first **multi-agent, agent → agent** marketplace at this event. |
| **Uses every piece of the stack non-trivially** | OpenClaw runtimes · ERC-8004 identity + reputation · x402 agent-to-agent payments · GOAT Bitcoin-final settlement |
| **Practical** | Direct B2B value — agentic Upwork/Fiverr. 2–5% protocol fee per job. Clear hackathon → seed startup path. |
| **Demoable in 2 minutes** | Prompt → live timeline → on-chain txs → finished brief. Visceral and screen-friendly. |

---

## Architecture

```
   Buyer ──▶ Dashboard ──▶ Foreman ──┬─▶ Researcher (ERC-8004 #R)
   (browser)   (Next.js)   (Hono)    │     x402: 0.05 USDC
                                     │
                                     └─▶ Writer     (ERC-8004 #W)
                                           x402: 0.08 USDC

   Every tx settles on GOAT Network L2, secured by Bitcoin via BitVM2.
   After the job, the Foreman writes reputation feedback to ERC-8004.
```

See `PROJECT_BLUEPRINT.md` for the full design.

---

## Run in 60 Seconds

**Prereqs:** Node 20+, pnpm 9+, an OpenAI API key, a funded EVM key on GOAT Testnet3 (use [the faucet](https://bridge.testnet3.goat.network/faucet)).

```bash
git clone <repo> && cd openclawhack
pnpm install

cp .env.example .env
# fill in OPENAI_API_KEY and 3 private keys

pnpm register --all       # one-shot: registers all 3 agents on ERC-8004
pnpm dev                  # boots Foreman, Researcher, Writer, Dashboard

# open http://localhost:3000 and run the demo
```

---

## What's In This Repo

| Path | Purpose |
|---|---|
| `PROJECT_BLUEPRINT.md` | Master design doc — architecture, stack, demo script, risks |
| `AGENT_DELEGATION.md` | Procedural task packets (P00–P15) for sub-agents to execute |
| `PROGRESS.md` | Running build log |
| `shared/` | Shared types, ABIs, constants |
| `agents/foreman/` | The orchestrator agent (port 3100) |
| `agents/researcher/` | Specialist: web research (port 3101) |
| `agents/writer/` | Specialist: markdown brief writer (port 3102) |
| `apps/dashboard/` | Next.js + Tailwind demo UI (port 3000) |
| `scripts/` | One-shot tooling (registration, funding, balance checks) |

---

## Stack

`OpenClaw` · `@goatnetwork/agentkit` · `ERC-8004` · `x402` (Hono + fetch) · `GOAT Testnet3` (Bitcoin L2 / BitVM2) · `viem` · `ethers v6` · `Hono` · `Next.js 14` · `TailwindCSS` · `OpenAI GPT-4o-mini`

---

## Key Contracts (GOAT Testnet3, chain ID `48816`)

| Contract | Address |
|---|---|
| ERC-8004 Identity Registry | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` |
| ERC-8004 Reputation Registry | `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` |
| USDC | `0x29d1ee93e9ecf6e50f309f498e40a6b42d352fa1` |

RPC: `https://rpc.testnet3.goat.network` · Explorer: `https://explorer.testnet3.goat.network`

---

## Credits

Built at **OpenClaw Hack Toronto** during **Toronto Tech Week 2026** by the HERD team.
Powered by **GOAT Network**, **OpenClaw**, **ClawUp**, **CryptoChicks**, **TMU BYTE club**, **MindFuel**, and the **Metis Foundation**.
