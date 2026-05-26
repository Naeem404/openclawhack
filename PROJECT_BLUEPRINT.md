# HERD — Project Blueprint

> *Where AI agents earn their keep.*
> An autonomous subcontracting swarm where AI agents hire each other on Bitcoin.

**Hackathon:** OpenClaw Hack Toronto — Tech Week 2026 (May 26, 2026)
**Stack:** OpenClaw · ERC-8004 · x402 · GOAT Network (Bitcoin L2 / BitVM2)
**Author / Mastermind:** Lead engineer (Cascade)
**Status:** Blueprint v1.0 — locked. Implementation delegated per `AGENT_DELEGATION.md`.

---

## 1. Vision

Today's "AI agents" are isolated chatbots. They cannot **discover** each other, **trust** each other, or **pay** each other. The entire promise of the agent economy collapses without a coordination layer.

**HERD** is that layer. It is a live marketplace where:

1. A **Buyer** (human or agent) posts a complex job with a budget.
2. A **Foreman Agent** decomposes the job into typed subtasks.
3. **Specialist Agents** (each ERC-8004 registered) bid in real time.
4. The Foreman ranks bids by `reputation × price` and dispatches work.
5. Every subtask delivery triggers an **x402 micro-payment** between agents.
6. After completion, all parties post **ERC-8004 reputation feedback** — a permanent, on-chain record that affects future hireability.
7. Buyer receives the compiled deliverable with a verifiable on-chain receipt, settled on Bitcoin via GOAT's BitVM2.

The result is a **self-organising labour market for software agents**, where reputation is the moat and Bitcoin is the rails.

---

## 2. Why This Wins

| Criterion | HERD's edge |
|---|---|
| **Unique vs existing demos** | All known reference demos (`julies-claw/goat-agent-demo`, `x402-merchant`) are **single-agent, user→agent**. HERD is the first **multi-agent, agent→agent** marketplace at this event. |
| **Practical / monetizable** | Take a 2–5% protocol fee on every job. Direct B2B value — "agentic Upwork/Fiverr". Clear path from hackathon → seed-stage startup. |
| **Uses every stack piece non-trivially** | OpenClaw runtimes (Foreman + Specialists) · ERC-8004 (identity + reputation + reviewer-as-agent loop) · x402 (true agent→agent, not just user→agent) · GOAT (low-fee, Bitcoin-final settlement) |
| **Demoable in 2 minutes** | One prompt → live swarm activates → on-chain txs stream into dashboard → final deliverable + reputation update. Visceral, screen-friendly. |
| **Bitcoin native** | Settles on Bitcoin via BitVM2 — leans into GOAT Network's positioning rather than treating it as an EVM-of-the-week. |

---

## 3. Hackathon Alignment Matrix

| Hackathon Mandate | How HERD satisfies it |
|---|---|
| *"Build an AI agent that doesn't just talk but owns its identity"* | Every agent in HERD (Foreman + Specialists) holds its own ERC-8004 NFT on GOAT Testnet3 and resolves a portable `agentURI` JSON card. |
| *"Manages its own wallet"* | Each agent process holds a dedicated EVM private key, signs its own x402 payloads (EIP-712), and pays gas in BTC on GOAT. |
| *"Transact with other agents"* | Foreman pays Specialists via x402 401→pay→retry loop. Specialists may pay sub-Specialists recursively. |
| *"High-value transactions with zero human oversight"* | Once the Buyer signs the initial job authorisation, the swarm operates autonomously: subcontracting, paying, validating, reporting. |
| *"Bitcoin's 99.9% uptime + BitVM2's mathematical security"* | All settlement on GOAT Testnet3 (Bitcoin-secured zkRollup). Demo references `https://explorer.testnet3.goat.network` for every tx. |
| *"Leverage OpenClaw"* | All agents run as OpenClaw-compatible runtimes (Node.js / `@goatnetwork/agentkit`). Foreman can be deployed as a managed ClawUp Claw. |

---

## 4. Architecture

```
                       ┌──────────────────────────┐
                       │     Buyer (Browser)      │
                       │  apps/dashboard (Next.js)│
                       └──────────────┬───────────┘
                                      │ POST /jobs  { brief, budget }
                                      ▼
                       ┌──────────────────────────┐
                       │   FOREMAN AGENT          │ ─── ERC-8004 #FID
                       │   apps/foreman (Hono)    │ ─── Wallet: 0xFOREMAN
                       │   - decomposes brief     │
                       │   - solicits bids        │
                       │   - ranks by rep × price │
                       │   - dispatches work      │
                       │   - settles via x402     │
                       └────┬────────────────┬────┘
                            │                │
              GET  /bid?spec=…              GET  /bid?spec=…
              POST /work    (402→pay)       POST /work    (402→pay)
                            │                │
                            ▼                ▼
                ┌────────────────┐  ┌────────────────┐
                │  RESEARCHER    │  │     WRITER     │
                │  agents/       │  │  agents/       │
                │  researcher    │  │  writer        │
                │  ERC-8004 #RID │  │  ERC-8004 #WID │
                └───────┬────────┘  └───────┬────────┘
                        │                   │
                        └──────────┬────────┘
                                   ▼
                       ┌──────────────────────────┐
                       │   GOAT Testnet3 L2       │
                       │   - USDC transfers       │
                       │   - ERC-8004 Identity    │
                       │   - ERC-8004 Reputation  │
                       └──────────────┬───────────┘
                                      │ ZK proofs + BitVM2 challenge
                                      ▼
                       ┌──────────────────────────┐
                       │   Bitcoin L1 (final)     │
                       └──────────────────────────┘
```

### Data flow (happy path)

1. Buyer posts `{ brief, budgetUsdc }` to Foreman.
2. Foreman LLM decomposes brief into N typed subtasks (`research`, `write`, `validate`, …).
3. Foreman broadcasts a bid request to its registered Specialists (in MVP: static list; v2: discovery via ERC-8004 registry scan).
4. Each Specialist replies with `{ priceUsdc, etaSec, agentId }` — signed by its wallet.
5. Foreman picks winner per subtask using `score = reputation_decimal − k × price`.
6. Foreman calls `POST /work` on winner → receives **HTTP 402** + payment requirements.
7. Foreman signs an EIP-712 payment payload, retries `POST /work` with `X-PAYMENT` header.
8. Specialist verifies signature, settles USDC on-chain (or via facilitator), executes work, returns artifact + `X-PAYMENT-RESPONSE`.
9. Foreman assembles artifacts, returns final deliverable + receipt JSON to Buyer.
10. Foreman calls `erc8004.give_feedback(specialistId, value, tag="herd")` for each Specialist; Buyer optionally feedbacks the Foreman.
11. Dashboard streams every step via SSE.

---

## 5. Tech Stack — Pinned

| Layer | Choice | Version | Why |
|---|---|---|---|
| Runtime | Node.js | 20.x LTS | Required by ClawUp + AgentKit |
| Language | TypeScript | ^5.4 | Type safety across agents |
| Web framework | Hono | ^4.6 | First-class `x402-hono` middleware |
| EVM client | viem | ^2.21 | Typesafe, modern; pairs with x402 |
| Legacy EVM (registration script) | ethers | ^6.13 | Matches `julies-claw/goat-agent-demo` patterns |
| Agent SDK | `@goatnetwork/agentkit` | latest | Wallet, ERC-8004, x402 actions |
| x402 middleware | `x402-hono` | latest | HTTP 402 server side |
| x402 client | `@x402/fetch` | latest | Agent-to-agent payment client |
| LLM | OpenAI GPT-4o-mini | API 2024+ | Cheap, fast, function-calling capable. Fallback to Anthropic Claude Haiku. |
| Frontend | Next.js (App Router) | ^14.2 | Fast scaffold, SSE-friendly |
| Styling | Tailwind CSS | ^3.4 | Speed |
| UI primitives | lucide-react icons | latest | Clean iconography |
| Live updates | Server-Sent Events | native | Lower friction than WebSockets for one-way streams |
| Env mgmt | dotenv | ^16 | Standard |
| Concurrency | concurrently | ^9 | Run all 4 services in dev |

### GOAT Testnet3 reference (constants in `shared/constants.ts`)

| Item | Value |
|---|---|
| Chain ID | `48816` |
| RPC | `https://rpc.testnet3.goat.network` |
| Explorer | `https://explorer.testnet3.goat.network` |
| Native gas | BTC |
| USDC | `0x29d1ee93e9ecf6e50f309f498e40a6b42d352fa1` |
| USDT | `0xdce0af57e8f2ce957b3838cd2a2f3f3677965dd3` |
| Identity Registry (ERC-8004) | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` |
| Reputation Registry (ERC-8004) | `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` |
| Faucet | `https://bridge.testnet3.goat.network/faucet` |

---

## 6. Repository Layout

```
openclawhack/
├── PROJECT_BLUEPRINT.md      ← this file (master design)
├── AGENT_DELEGATION.md       ← procedural task packets for sub-agents
├── PROGRESS.md               ← running log (updated per session)
├── README.md                 ← public pitch + 60-second run
├── .env.example              ← all env vars in one place
├── .gitignore
├── package.json              ← root workspaces + dev scripts
├── tsconfig.base.json        ← shared TS config
│
├── shared/                   ← shared types & constants
│   ├── package.json
│   ├── src/
│   │   ├── constants.ts      ← chain IDs, contract addrs
│   │   ├── types.ts          ← Job, Bid, Artifact, FeedbackTag …
│   │   └── abi.ts            ← ERC-8004 + USDC minimal ABIs
│
├── agents/
│   ├── foreman/              ← orchestrator agent
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── index.ts      ← Hono server + SSE stream
│   │   │   ├── decompose.ts  ← LLM brief → subtask plan
│   │   │   ├── dispatch.ts   ← bid solicitation + ranking
│   │   │   ├── pay.ts        ← x402 client wrapper
│   │   │   └── reputation.ts ← post feedback after job
│   │
│   ├── researcher/           ← specialist #1
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── index.ts      ← Hono + x402-hono server
│   │   │   ├── card.ts       ← agent card / registration JSON
│   │   │   └── skill.ts      ← LLM-powered research task
│   │
│   └── writer/               ← specialist #2
│       ├── package.json
│       ├── src/
│       │   ├── index.ts
│       │   ├── card.ts
│       │   └── skill.ts
│
├── apps/
│   └── dashboard/            ← Next.js demo UI
│       ├── package.json
│       ├── next.config.mjs
│       ├── tailwind.config.ts
│       └── src/
│           ├── app/
│           │   ├── layout.tsx
│           │   ├── page.tsx           ← main demo screen
│           │   └── api/stream/route.ts ← SSE proxy to Foreman
│           └── components/
│               ├── JobForm.tsx
│               ├── SwarmTimeline.tsx
│               ├── AgentCard.tsx
│               └── TxToast.tsx
│
└── scripts/
    ├── register-agent.ts     ← one-shot ERC-8004 registration
    ├── fund-agents.ts        ← top up agent wallets from a master key
    └── check-balances.ts
```

---

## 7. Smart Contract Surface

**MVP deploys NO custom contracts.** It reuses:

- ERC-8004 **IdentityRegistry** at `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`
- ERC-8004 **ReputationRegistry** at `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`
- USDC at `0x29d1ee93e9ecf6e50f309f498e40a6b42d352fa1`

**Why no custom contract for MVP:**
- Time: 6h 45min total hacking budget. Solidity work eats 90+ minutes.
- Risk: deploy mistakes are unrecoverable mid-demo.
- Sufficient: x402 + ERC-8004 already give us identity, payment, reputation. Coordination logic lives in the Foreman.

**Post-MVP (stretch goal, only if >2 hours remain at 4:00 PM):**
- `JobEscrow.sol` — Buyer deposits budget; Foreman releases per-subtask; refund if SLA missed.
- `BidBoard.sol` — on-chain task announcement so non-registered Specialists can discover work.

---

## 8. Agent Identity & Registration

Each agent has its own `agent-card.json`, hosted by its own server at `GET /`. Example:

```json
{
  "type": "AgentCard/0.8",
  "name": "Researcher (HERD)",
  "description": "Performs structured web research and returns sourced bullet points.",
  "image": "https://herd.example/researcher.png",
  "services": [
    { "name": "x402", "endpoint": "http://localhost:3101/work", "version": "v2" },
    { "name": "MCP", "endpoint": "http://localhost:3101/mcp", "version": "1" }
  ],
  "skills": [
    { "id": "research.web", "priceUsdc": "0.05", "etaSec": 30 }
  ],
  "registrations": [
    { "agentId": null, "agentRegistry": "eip155:48816:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" }
  ],
  "supportedTrust": ["reputation"],
  "x402Support": true
}
```

`scripts/register-agent.ts` (one-shot per agent):
1. Loads `agent-card.json`.
2. Uploads to a public URL (IPFS via Pinata if available; else `data:` URI baked into tx).
3. Calls `IdentityRegistry.register(agentURI)` — mints ERC-721, returns `agentId`.
4. Writes `agentId` back into the agent's `.env`.

---

## 9. x402 Payment Flow (precise)

Following Coinbase x402 v2 transport-HTTP spec.

**Server side (Specialist)** — `agents/<name>/src/index.ts`:

```ts
import { Hono } from "hono";
import { x402Hono } from "x402-hono"; // pseudo: real import per current SDK

const app = new Hono();
app.use("/work", x402Hono({
  facilitator: "https://x402.org/facilitator",
  scheme: "exact",
  network: "goat-testnet3", // or its accepted alias
  asset: USDC_ADDRESS,
  amount: "50000", // 0.05 USDC (6 decimals)
  payTo: process.env.AGENT_WALLET_ADDRESS!,
}));
app.post("/work", async (c) => {
  const { spec } = await c.req.json();
  const artifact = await performSkill(spec);
  return c.json({ artifact });
});
```

**Client side (Foreman)** — `agents/foreman/src/pay.ts`:

```ts
import { withPaymentInterceptor } from "@x402/fetch";
const paidFetch = withPaymentInterceptor(fetch, { wallet: foremanWallet });

const res = await paidFetch(`${specialist.endpoint}/work`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ spec: subtaskSpec }),
});
const { artifact } = await res.json();
const settlement = decodeSettlement(res.headers.get("X-PAYMENT-RESPONSE"));
```

**Headers (v2):**
- Server → 402 + `PAYMENT-REQUIRED: <base64 JSON>`
- Client retry: `X-PAYMENT: <base64 JSON>`
- Server success: `X-PAYMENT-RESPONSE: <base64 JSON>` (settlement receipt with tx hash)

---

## 10. Reputation Flow

After each completed subtask:

```ts
// In Foreman, after Specialist returns artifact and Buyer accepts overall job:
await reputationRegistry.giveFeedback(
  specialistAgentId,
  value = 100,           // int128
  valueDecimals = 0,
  tag1 = bytes32("herd.subtask"),
  tag2 = bytes32(subtaskType),
  endpoint = "",
  feedbackURI = "",
  feedbackHash = bytes32(0),
);
```

After full job, Buyer can call the same path against the Foreman's agentId.

Specialists' bid-ranking score (in `agents/foreman/src/dispatch.ts`):

```
score = avgReputation(specialistId) − k * priceUsdc
```

where `avgReputation` is fetched via `reputationRegistry.getSummary(agentId, [], 0, 0)` and `k` is a tunable constant (default `0.5`).

---

## 11. Demo Script (2 minutes, no slides)

> *Spoken in present tense. Browser open at `http://localhost:3000`. Three terminal panes showing Foreman + 2 Specialists, each logging.*

| Time | Action | What the audience sees |
|---|---|---|
| 0:00 | "This is **HERD**. AI agents that hire each other on Bitcoin." | Title card on dashboard |
| 0:15 | Type into prompt box: *"Write a 300-word brief on Bitcoin L2 trade-offs with three sources."* Click **Run**. | Brief appears in left pane |
| 0:25 | Foreman decomposes → 2 subtasks pop up: `research.web` + `write.brief` | Subtasks slide in as cards |
| 0:35 | Foreman solicits bids → 2 Specialists respond. Bid table renders. | Bid amounts + reputation scores |
| 0:45 | Foreman dispatches Researcher → HTTP 402 → x402 payment → tx hash appears with link to explorer | Live tx toast with explorer link |
| 1:10 | Researcher returns artifact (3 sourced bullets); Foreman dispatches Writer with researcher's output as context | Second tx toast |
| 1:35 | Writer returns 300-word brief; Foreman compiles → final deliverable shown | Final brief rendered |
| 1:45 | Foreman posts reputation feedback → both Specialists' scores tick up | Reputation numbers animate |
| 1:55 | "All settled on Bitcoin via BitVM2. Three agents, three identities, three payments — zero human clicks after the prompt." | Receipt card with all tx hashes |

Backup if live tx is slow: pre-recorded 30s screencap embedded in `apps/dashboard/public/demo.mp4`.

---

## 12. Risks & Fallbacks

| Risk | Likelihood | Fallback |
|---|---|---|
| `@goatnetwork/agentkit` API changes mid-hackathon | medium | Bypass AgentKit — use `viem` + direct contract ABIs (`shared/src/abi.ts`). The `julies-claw` demo proves this works. |
| x402 facilitator not reachable | low | Implement local verification mode in `x402-hono` config — verify signature client-side and skip facilitator. |
| GOAT testnet3 RPC down or slow | medium | Switch to mock mode: dashboard reads from a recorded fixture; agents log "would settle X USDC". Demoable narrative preserved. |
| ERC-8004 registration tx fails (gas etc.) | low | Pre-register all three agents at 11:30 AM (before noon). Hard-code `agentId`s into `.env`. |
| LLM API quota exhausted | low | Pre-cache 2–3 canned deliverables keyed off prompt hash; fall through on miss. |
| Faucet empty / can't get BTC for gas | medium | Reuse master wallet from `GOATX402_API_KEY` distribution; fan out gas via `scripts/fund-agents.ts`. |
| Time overruns | high | Hard cutoff at 4:30 PM for new code. 4:30–5:30 PM is **demo polish only**. |

---

## 13. Execution Timeline (Hackathon Day)

| Time | Milestone | Owner |
|---|---|---|
| 11:00 | Kickoff. This blueprint locked. | Mastermind |
| 11:15 | Workshop attended; latest credentials grabbed; `.env` finalized | Mastermind |
| 11:30 | Repo scaffolded; `pnpm install` green; constants filled | Sub-agent: **Bootstrapper** |
| 12:00 | All 3 agents register on ERC-8004; agentIds in `.env` | Sub-agent: **Onboarder** |
| 13:00 | Researcher + Writer servers respond 402 then succeed locally | Sub-agent: **SpecialistBuilder** |
| 14:00 | Foreman decomposes brief → bids → dispatch loop works end-to-end | Sub-agent: **ForemanBuilder** |
| 15:00 | Dashboard renders brief input, swarm timeline, tx toasts via SSE | Sub-agent: **UIBuilder** |
| 15:30 | Reputation feedback posted after job; scores visible in dashboard | Sub-agent: **ReputationWeaver** |
| 16:30 | End-to-end live run on testnet3 passes 3× in a row | Mastermind |
| 17:00 | Demo polish: pretty cards, sound effects, fallback video recorded | Sub-agent: **Polisher** |
| 17:30 | Dry-run demo with stopwatch ≤ 110s | Mastermind |
| 17:45 | Submit | Mastermind |

---

## 14. Success Criteria

The project ships if **all** of the following are true at 5:45 PM:

1. ✅ Three distinct ERC-8004 agent IDs are visible on the GOAT explorer.
2. ✅ At least one end-to-end run produces ≥ 2 on-chain x402 settlement txs.
3. ✅ Reputation feedback was successfully written to the Reputation Registry for ≥ 1 specialist.
4. ✅ The dashboard performs the demo flow in < 120 seconds without manual terminal intervention.
5. ✅ `README.md` lets a fresh judge clone + `pnpm dev` and hit a working URL in < 5 minutes.

If any item fails, fall back to mock mode (#12) — narrative is preserved, judges still see the swarm logic.

---

## 15. Post-Hackathon Vision (for judge Q&A)

- **v1.1** — On-chain `BidBoard` so any ERC-8004 agent can discover open jobs.
- **v1.2** — `JobEscrow` with milestone releases and SLA-based slashing.
- **v1.3** — Validator agents (also ERC-8004) that earn fees for arbitrating disputes.
- **v2.0** — Open the marketplace: anyone deploys a Specialist agent; Foreman is a thin client. HERD becomes the **labour layer** of the agent economy.

Revenue model: 2–5% protocol fee on each settled subtask, paid in USDC, routed to a HERD treasury contract.

---

## 16. Glossary

- **Brief** — natural-language job description from the Buyer.
- **Subtask** — typed unit of work emitted by Foreman decomposition (`research.web`, `write.brief`, `validate.fact`, …).
- **Specialist** — an agent that advertises a `skills[]` array on its agent card.
- **Bid** — `{ priceUsdc, etaSec, agentId, signature }` returned in response to `GET /bid?spec=…`.
- **Settlement receipt** — base64 JSON in `X-PAYMENT-RESPONSE` header containing on-chain tx hash.
- **Agent card** — ERC-8004 registration JSON resolved from `tokenURI` of the agent's NFT.
