# PaidProof �️

> **Work delivered. Money settled. In 30 seconds.**
> Bitcoin-secured freelance escrow released by AI verifier agents — no 30-day wait, no 10% middleman.

Built at **OpenClaw Hack Toronto** (Tech Week 2026) on the **OpenClaw · ERC-8004 · x402 · GOAT Network** stack.

---

## The Story (3 sentences)

A designer in Lagos finishes a logo for a startup in Toronto. Today: upload, wait 14 days for approval, then 5 more days to clear Upwork's 10% fee gauntlet and currency conversion. With PaidProof: the client funds escrow up front, the AI Lead Verifier hires three specialist agents over x402 to check the deliverable against the agreed criteria, and the moment all checks pass the funds stream straight to the freelancer's wallet — full amount, no middleman, 30-second settlement.

---

## The Demo

```
   ┌───────────────┐                 ┌───────────────┐
   │ Marcus · TO   │                 │ Sarah · Lagos │
   │ wallet $250 ▼ │                 │ wallet $0 ▲   │
   └───────┬───────┘                 └───────▲───────┘
           │ Escrow.fund($200 USDC)          │ release()
           ▼                                 │
   ┌────────────────────────────────────────────────┐
   │  Escrow.sol on GOAT (Bitcoin-secured)          │
   └───────────────────┬────────────────────────────┘
                       │ submitVerdict(passed)
                       ▼
   ┌────────────────────────────────────────────────┐
   │  Lead Verifier · ERC-8004 #LID                 │
   │  hires 3 specialists over x402 …               │
   └──┬──────────────┬────────────────┬─────────────┘
      ▼              ▼                ▼
   FileSpec     ColorVision      AestheticJudge
   $0.02 USDC   $0.03 USDC       $0.05 USDC
   PNG/dim      brand colors     "looks real"
```

Three x402 micro-payments + one escrow release = **four on-chain transactions, zero human clicks after delivery.**

---

## Why It Wins

| Criterion | PaidProof's edge |
|---|---|
| **Visceral pain** | Every judge has either been ghosted on payment or paid a freelancer late. |
| **Market size** | $400B freelance economy. 70M+ workers. Top complaint: payment delay. |
| **Demo narrative** | Designer in Lagos → startup in Toronto → $200 lands in 30 seconds. Humanitarian + technical. |
| **Hackathon mandates** | 4 ERC-8004 identities · 3 agent-to-agent x402 settlements per run · 1 escrow release tx · all on Bitcoin via GOAT. |
| **Investor angle** | Be the rail under Upwork's 10% take rate. Charge 1%. Comparable exits: Wise ($11B IPO), Deel ($12B). |

See `PROJECT_BLUEPRINT.md` for the full design.

---

## Run in 60 Seconds (local Hardhat)

**Prereqs:** Node 20+, an OpenAI API key (optional — the demo works in mock mode without one).

```powershell
git clone <repo>
cd openclawhack
npm install
npm install --prefix shared
npm install --prefix agents/foreman
npm install --prefix agents/researcher
npm install --prefix agents/writer
npm install --prefix agents/aesthetic
npm install --prefix apps/dashboard

cp .env.example .env
# (optional) drop in OPENAI_API_KEY for live LLM verdicts; otherwise mock mode runs

# Terminal 1 — local chain + contracts
npm run node:local       # hardhat node @ http://127.0.0.1:8545
npm run compile          # compiles AgentRegistry / Escrow / MockUSDC
npm run deploy:local     # writes deployments/localhost.json
npm run register:local   # registers all 4 agents on AgentRegistry

# Terminal 2 — agents + dashboard
npm run dev              # Lead Verifier + FileSpec + ColorVision + Aesthetic + Dashboard

# open http://localhost:3000 and run the demo
```

To hit GOAT Testnet3 instead of localhost:

```powershell
# in .env
CHAIN_TARGET=goat-testnet3
DEPLOYER_PRIVATE_KEY=0x…   # a wallet with a few drops of GOAT testnet BTC

npm run deploy:goat
npm run register:goat
npm run dev
```

---

## What's In This Repo

| Path | Purpose |
|---|---|
| `contracts/` | `AgentRegistry.sol` · `Escrow.sol` · `MockUSDC.sol` |
| `shared/` | Cross-package types, ABIs, constants, x402 helpers |
| `agents/foreman/` | **Lead Verifier** orchestrator (port 3100) |
| `agents/researcher/` | **FileSpec** specialist — file type / dimensions / size (port 3101) |
| `agents/writer/` | **ColorVision** specialist — brand-color match via GPT-4o vision (port 3102) |
| `agents/aesthetic/` | **AestheticJudge** specialist — "does this look like the brief" (port 3103) |
| `apps/dashboard/` | Next.js split-screen demo (port 3000) |
| `scripts/` | `deploy.js`, `register-agents.js`, balance/fund helpers |
| `PROJECT_BLUEPRINT.md` | Master design doc |
| `AGENT_DELEGATION.md` | Procedural task packets for sub-agents |
| `PROGRESS.md` | Running build log |

---

## Stack

`OpenClaw` · `ERC-8004` (custom `AgentRegistry.sol`) · `x402` (Hono + viem) · `GOAT Network` (Bitcoin L2 / BitVM2) · `Solidity 0.8.24` · `Hardhat` · `viem` · `Hono` · `Next.js 14` · `TailwindCSS` · `OpenAI GPT-4o-mini` (vision)

---

## Key Contracts

| Contract | Address (after deploy) |
|---|---|
| AgentRegistry | `deployments/<network>.json#registry` |
| Escrow | `deployments/<network>.json#escrow` |
| USDC (local) | `MockUSDC` deployed by `scripts/deploy.js` |
| USDC (GOAT mainnet) | `0x3022b87ac063DE95b1570F46f5e470F8B53112D8` |

---

## Credits

Built at **OpenClaw Hack Toronto** during **Toronto Tech Week 2026** by the PaidProof team.
Powered by **GOAT Network**, **OpenClaw**, **ClawUp**, **CryptoChicks**, **TMU BYTE Club**, **MindFuel**, and the **Metis Foundation**.
