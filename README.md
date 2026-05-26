# RefundRex 🦖

**Autonomous Refund & Dispute Agent · ERC-8004 · GOAT Mainnet · x402 · OpenClaw**

RefundRex owns an on-chain identity, runs its own wallet on GOAT Network,
and resolves shipment disputes autonomously. It tracks shipments, classifies
issues, contacts merchants (email *or* signed agent-to-agent payloads),
negotiates, escalates when ignored, and settles its success fee via x402
USDC — anchoring every step on-chain.

Built for the **Open Claw Hack — Toronto Tech Week 2026**.

---

## ✨ Highlights

- **Owns its identity**: registers as a Trustless Agent on the live ERC-8004
  registry (`0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`).
- **Runs its own wallet**: GOAT Mainnet (chain 2345), signs every action.
- **Agent-native payments**: settles fees via x402 — USDC/USDT, no card rails.
- **Autonomous loop**: planner → classifier → negotiator → escalator → settler.
- **Agent-to-agent**: signed dispute payloads to merchant agents when available.
- **Anti-fraud**: claim-velocity, amount-skew, and tracking-pattern checks.
- **On-chain reputation**: companion `RefundRexReputation` contract appends
  per-resolution receipts.
- **Cinematic demo mode**: scripted scenarios that always work locally with
  realistic blockchain confirmations.

---

## 🚀 Quickstart

```bash
npm install --legacy-peer-deps
cp .env.example .env.local        # demo mode is on by default
npm run dev
```

Open **http://localhost:3000**.

### Demo flow (5 min)

1. **`/`** — landing.
2. **`/demo`** — pick a scenario (damaged item / lost package / delayed
   shipment), click **Run scenario**.
3. Watch the terminal log: classify → contact → parse → escalate → settle.
4. **`/cases/{id}`** — drill into the timeline and on-chain anchors.
5. **`/pitch`** — KPI deck + judge mode (fires all three scenarios at once).

### Headless demo

```bash
npx tsx scripts/demo.ts damaged-headphones
```

---

## 🏗️ Architecture

```
                                ┌──────────────────────────┐
                                │  Next.js 15 / App Router │
                                │     dashboard · demo     │
                                │  pitch mode · case view  │
                                └────────────┬─────────────┘
                                             │  REST + SSE
                                             ▼
                              ┌──────────────────────────────┐
                              │   Orchestrator (autonomous)  │
                              │  planner / classifier / mem  │
                              │  fraud / negotiator / esc.   │
                              └──────────────┬───────────────┘
                                             │ dispatches
                                             ▼
   ┌─────────────────────┐     ┌─────────────────────────────┐     ┌──────────────────────┐
   │  OpenClaw runtime   │ ◄── │      Skill registry         │ ──► │ ClawUp · Telegram    │
   └─────────────────────┘     └─────────────────────────────┘     └──────────────────────┘
                                             │
                ┌────────────────────────────┼────────────────────────────┐
                ▼                            ▼                            ▼
        ┌───────────────┐           ┌────────────────┐           ┌──────────────────┐
        │ Chain wrappers│           │  Merchant API  │           │   AgentKit       │
        │  GOAT · 8004  │           │  email · A2A   │           │  read-only reads │
        │  x402 · wallet│           │  reply parser  │           │                  │
        └───────┬───────┘           └────────────────┘           └──────────────────┘
                │
                ▼
   GOAT Mainnet · ERC-8004 registry · x402 settlement
```

### Folder map

| Path | What lives here |
| --- | --- |
| `app/` | Next.js 15 app router pages + API routes |
| `app/api/*` | REST endpoints + SSE stream for live logs |
| `components/` | shadcn primitives + feature components (dashboard, case, pitch) |
| `lib/agent/` | Orchestrator, planner, classifier, memory, fraud |
| `lib/chain/` | GOAT, wallet, ERC-8004, x402, AgentKit adapters |
| `lib/openclaw/` | OpenClaw runtime shim + skill registry |
| `lib/merchant/` | Email, mock APIs, A2A, reply parser |
| `lib/store/` | In-memory cases, chain events, reputation, event bus |
| `lib/demo/` | Scripted scenario runner |
| `data/` | Seed cases, merchants, demo scenarios |
| `contracts/` | ERC-8004 reference + RefundRex reputation companion |
| `scripts/` | seed · demo · deploy CLIs |
| `.skill/refundrex/` | OpenClaw skill manifest for ClawUp integration |

### Demo vs production

| Layer | Demo mode (default) | Production swap-in |
| --- | --- | --- |
| GOAT RPC | local stub w/ realistic txHashes | viem/ethers against `https://rpc.goat.network` |
| Wallet | deterministic address | env-loaded `ethers.Wallet(AGENT_WALLET_PRIVATE_KEY)` |
| ERC-8004 | simulated `register()` | real on-chain `register(name)` |
| x402 | local capture | `POST {GOATX402_API_URL}/payments` w/ HMAC |
| Merchant comms | local mock with friendliness probabilities | Postmark/SES + Shopify/Amazon support APIs |
| LLM | template-driven | OpenAI / Anthropic via `LLM_PROVIDER` |

Every adapter has the same public surface, so flipping `DEMO_MODE=false` and
filling in real keys swaps each one transparently.

---

## 🧠 Agent loop

```
intake → track_shipment → classify_issue → fraud_check →
contact_merchant → await_response → parse_merchant_reply →
{ negotiate | escalate | settle } → x402_settle → reputation_update
```

The planner is a pure function of `(case, state)`. Each step:

1. Asks the planner what's next.
2. Dispatches the matching OpenClaw skill.
3. Records an `AgentAction` + timeline event + emits a live log line.
4. Persists structured facts into per-case memory.

Escalation is automatic on partial offers and on merchant silence after N
attempts. Fraud-flagged cases are blocked before any outbound action.

---

## 🔗 GOAT / OpenClaw integration

- **ERC-8004 registry**: `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`
- **GOAT mainnet RPC**: `https://rpc.goat.network` · chain id `2345`
- **x402 portal**: `https://x402-merchant.goat.network/`
- **Skill manifest**: `.skill/refundrex/SKILL.md`
- **8004scan**: https://8004scan.io/agents?chain=2345

---

## 🧪 Scripts

```bash
npm run dev               # next dev
npm run build && npm run start
npm run seed              # reset in-memory store
npm run demo              # headless cinematic demo (defaults to damaged-headphones)
npm run deploy:contracts  # prints forge deploy command for RefundRexReputation
```

---

## 🚢 Deploy

### Vercel (frontend / agent backend)

```bash
vercel --prod
```

Set env vars per `.env.example`. The agent runtime lives in the API routes
(`app/api/*`) — no separate backend needed for the MVP. The SSE stream is
served from `/api/agent/stream`.

### Railway / Fly / Docker

```bash
docker compose up --build
```

Or build the image directly:

```bash
docker build -t refundrex .
docker run --rm -p 3000:3000 --env-file .env.local refundrex
```

### Contracts

```bash
npm run deploy:contracts  # prints the forge command
```

---

## 🏆 Judging strategy

| Criterion | How RefundRex addresses it |
| --- | --- |
| Built via ClawUp · ERC-8004 registered | `.skill/refundrex/SKILL.md` ships as an OpenClaw skill; `erc8004.register()` anchors identity at first boot. Verifiable on [8004scan](https://8004scan.io/agents?chain=2345). |
| Market & earning potential | Clear B2B2C revenue model — agents take a % of recovered refunds via x402. ROI strip on `/pitch` quantifies it ($0.10 vs $42 human cost). |
| Usability & self-disclosure | Ask the agent "what do you do" — it explains the SKILL surface and points at the dashboard. |
| 402 protocol integrity | Live `/api/x402/charge` route + visible payment in chain feed on every resolved case. |
| Human-in-the-loop guardrails | Fraud module blocks before contact; high-amount cases auto-flag as critical; `/cases/{id}` step button supports human-driven progression. |
| Post-hackathon plan | `/pitch` roadmap section: A2A marketplace → auto-chargeback bridge → multi-agent pools → dispute insurance. |

---

## 🛣️ Roadmap

- **Q3 2026** — Publish the dispute payload spec as an open A2A standard.
- **Q4 2026** — Card-network chargeback bridge for non-crypto merchants.
- **Q1 2027** — Multi-agent dispatcher with reputation-weighted routing.
- **Q2 2027** — On-chain dispute prediction market / insurance primitives.

---

## License

MIT. Built with care during Toronto Tech Week 2026.
