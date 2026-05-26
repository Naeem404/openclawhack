# PaidProof — Project Blueprint

> *Work delivered. Money settled. In 30 seconds.*
> An AI-verified freelance escrow that replaces 30-day waits and 10% middleman fees with Bitcoin-secured instant settlement.

**Hackathon:** OpenClaw Hack Toronto — Tech Week 2026 (May 26, 2026)
**Stack:** OpenClaw · ERC-8004 · x402 · GOAT Network (Bitcoin L2 / BitVM2)
**Slogan:** *"The middleman was the bug."*
**Status:** Blueprint v2.0 — pivot from HERD. Implementation delegated per `AGENT_DELEGATION.md`.

---

## 1. Vision

A designer in Lagos finishes a logo for a startup in Toronto. Today: upload, wait 14 days for approval, 5 days to clear Upwork's 10% fee gauntlet and currency conversion. **63% of freelancers wait over a month to get paid.**

**PaidProof** collapses that loop to 30 seconds:

1. **Client** deposits USDC into a Bitcoin-secured escrow on GOAT.
2. **Freelancer** uploads the deliverable + agreed criteria.
3. **Lead Verifier** — an OpenClaw agent with its own ERC-8004 identity and reputation history — takes the job.
4. Lead Verifier **hires three specialist agents via x402**, paying each one a micro-fee in USDC:
   - **FileSpec** — checks file type / dimensions / size.
   - **ColorVision** — checks the deliverable contains the agreed brand colors.
   - **AestheticJudge** — vision LLM check: "does this actually look like the agreed thing".
5. Each specialist returns a **signed verdict**. Lead Verifier aggregates.
6. If all criteria pass, Lead Verifier calls `Escrow.release()` → funds stream to the freelancer's wallet in one block.
7. ERC-8004 reputation is updated for the freelancer, client, and every agent that judged.

The result is a **Bitcoin-secured rail under the entire $400B freelance economy**, where reputation is portable, judgment is auditable, and settlement is instant.

---

## 2. Why This Wins

| Criterion | PaidProof's edge |
|---|---|
| **Visceral pain** | Every judge has either been ghosted on payment or paid a freelancer late. The pain is universal. |
| **Market size** | $400B+ global freelance economy. 70M+ workers worldwide. Top complaint: payment delays. |
| **Demo narrative** | "Designer in Lagos delivers logo. AI verifies. $200 hits her wallet in 30 seconds — Bitcoin-secured, no middleman." Humanitarian + technical. |
| **Uses every stack piece non-trivially** | OpenClaw runtimes (Lead Verifier + 3 specialists) · ERC-8004 (4 agent identities + portable freelancer/client reputation) · x402 (3 agent→agent micropayments per verification) · GOAT (escrow secured by Bitcoin) |
| **Investor angle** | Wedge under Upwork's 10% take rate. Charge 1% to be the rail. Comparable exits: Deel ($12B), Wise ($11B IPO). |

---

## 3. Hackathon Alignment Matrix

| Hackathon Mandate | How PaidProof satisfies it |
|---|---|
| *"Build an AI agent that doesn't just talk but owns its identity"* | All 4 PaidProof agents (Lead Verifier + FileSpec + ColorVision + AestheticJudge) hold their own ERC-8004 NFTs on GOAT Testnet3 with portable reputation. Freelancers and clients also get reputation tokens. |
| *"Manages its own wallet"* | Each agent process holds a dedicated EVM private key, signs x402 payloads, and pays GOAT gas in BTC. Lead Verifier additionally signs `Escrow.release()` transactions worth real money. |
| *"Transact with other agents"* | Lead Verifier pays each specialist via x402 (3 settled txs per verification). All settlements visible on GOAT explorer. |
| *"High-value transactions with zero human oversight"* | The escrow is real money. Once funded, **no human ever clicks "approve"** — the agent verifies the deliverable and signs the release. This is exactly the hackathon thesis. |
| *"Bitcoin's 99.9% uptime + BitVM2's mathematical security"* | Escrow holds USDC on GOAT Testnet3 — Bitcoin-secured zkRollup. "No operator, no hacker, no government can pull it." Every tx links to the GOAT explorer. |
| *"Leverage OpenClaw"* | All agents are OpenClaw-compatible Node.js runtimes. Lead Verifier deployable as a managed ClawUp Claw. Vision specialists use multimodal LLM access. |

---

## 4. Architecture

```
   ┌──────────────────┐                    ┌──────────────────┐
   │ Client (Marcus)  │                    │ Freelancer       │
   │ wallet: $250 ▼   │                    │ (Sarah) — $0 ▲   │
   └────────┬─────────┘                    └────────▲─────────┘
            │ Escrow.fund($200 USDC)                │ Escrow.release
            ▼                                       │
   ┌─────────────────────────────────────────────────────┐
   │  Escrow.sol on GOAT Testnet3 (Bitcoin-secured)      │
   │  state: {jobId, client, freelancer, amount, status} │
   └────────┬────────────────────────────────────────────┘
            │ release() called only by Lead Verifier
            ▼
   ┌─────────────────────────────────────────────────────┐
   │  LEAD VERIFIER  (agents/foreman → reused)           │ ERC-8004 #LID
   │  - parses criteria JSON                             │ Wallet: 0xLEAD
   │  - dispatches 3 specialists via x402                │
   │  - aggregates verdicts                              │
   │  - signs Escrow.release() on full pass              │
   └────┬───────────────┬──────────────────┬────────────┘
        │POST /work     │POST /work        │POST /work
        │(402 → pay)    │(402 → pay)       │(402 → pay)
        ▼               ▼                  ▼
   ┌──────────┐  ┌────────────────┐  ┌───────────────┐
   │ FileSpec │  │  ColorVision   │  │ AestheticJudge│
   │ (foreman │  │  (writer)      │  │ (NEW)         │
   │ →reused) │  │                │  │               │
   │ #FSID    │  │  #CVID         │  │  #AJID        │
   │ $0.02    │  │  $0.03         │  │  $0.05        │
   └──────────┘  └────────────────┘  └───────────────┘
        │              │                   │
        └──────────────┴───────────────────┘
                       ▼
            ┌──────────────────────────┐
            │   GOAT Testnet3 L2       │
            │   - Escrow USDC          │
            │   - x402 USDC transfers  │
            │   - ERC-8004 Identity    │
            │   - ERC-8004 Reputation  │
            └──────────────┬───────────┘
                           │ BitVM2 + ZK
                           ▼
            ┌──────────────────────────┐
            │   Bitcoin L1 (final)     │
            └──────────────────────────┘
```

### Data flow (happy path)

1. Client + Freelancer agree to a job. Client calls `Escrow.fund(jobId, freelancer, amount)` — USDC locked on-chain.
2. Freelancer uploads the deliverable (PNG file + URL) and posts criteria JSON to Lead Verifier (`POST /jobs`).
3. Lead Verifier parses criteria, derives one subtask per criterion bucket (`verify.filespec`, `verify.colorvision`, `verify.aesthetic`).
4. For each subtask: Lead Verifier calls `POST /work` on the right specialist → receives HTTP 402 + payment requirements.
5. Lead Verifier signs a USDC `transfer` (x402 v2 `exact` scheme), retries with `X-PAYMENT` header.
6. Specialist verifies the payment tx on-chain, runs its check, returns `{ verdict, confidence, reasoning }` + `X-PAYMENT-RESPONSE`.
7. Lead Verifier aggregates: if **all** specialists return `pass`, it calls `Escrow.release(jobId)`. Funds stream to freelancer.
8. If **any** specialist returns `fail`, escrow stays locked and the dashboard surfaces the dispute reason. (Stretch: auto-call a higher-rep second-opinion agent.)
9. Lead Verifier calls `ReputationRegistry.giveFeedback` for each specialist (judgment accuracy) and for the freelancer (delivery quality).
10. Dashboard streams every step via SSE — client wallet, freelancer wallet, escrow balance, x402 txs, final release all visible in real time.

---

## 5. Tech Stack — Pinned

| Layer | Choice | Version | Why |
|---|---|---|---|
| Runtime | Node.js | 20.x LTS | Required by ClawUp + AgentKit |
| Language | TypeScript | ^5.4 | Type safety across agents |
| Smart contracts | Solidity | ^0.8.24 | `Escrow.sol` deployed on GOAT testnet3 |
| Web framework | Hono | ^4.6 | Lean HTTP + x402 friendly |
| EVM client | viem | ^2.21 | Typesafe payments + contract writes |
| LLM (text) | OpenAI GPT-4o-mini | API 2024+ | Cheap, fast, JSON-mode. |
| LLM (vision) | OpenAI GPT-4o | API 2024+ | Multimodal for AestheticJudge specialist. |
| Image probing | `image-size` | ^1.1 | Tiny lib to extract PNG dimensions without ImageMagick. |
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
├── PROGRESS.md               ← running log
├── README.md
├── .env.example
├── package.json
├── tsconfig.base.json
│
├── contracts/                ← NEW: Solidity sources
│   └── Escrow.sol            ← fund / release / refund / dispute
│
├── shared/                   ← cross-package code
│   └── src/
│       ├── constants.ts      ← chain IDs, contract addrs, SKILLS, prices
│       ├── types.ts          ← Criterion, Verdict, EscrowJob, SwarmEvent
│       ├── abi.ts            ← ERC20 + ERC-8004 + Escrow ABIs
│       ├── x402.ts           ← build402Body, verifyPayment, encodeSettlement
│       └── env.ts            ← repo-root .env loader
│
├── agents/
│   ├── foreman/              ← = LEAD VERIFIER (orchestrator)
│   │   └── src/
│   │       ├── index.ts      ← Hono server + SSE + /jobs
│   │       ├── decompose.ts  ← criteria → subtask plan
│   │       ├── dispatch.ts   ← specialist resolution
│   │       ├── pay.ts        ← x402 client (paidPost)
│   │       ├── release.ts    ← NEW: signs Escrow.release()
│   │       ├── run.ts        ← verification job runner
│   │       ├── feedback.ts   ← ERC-8004 reputation writes
│   │       ├── sse.ts
│   │       └── wallet.ts
│   │
│   ├── researcher/           ← = FILESPEC specialist
│   │   └── src/
│   │       ├── index.ts      ← x402-gated /work
│   │       └── skill.ts      ← PNG / dimension / size check
│   │
│   ├── writer/               ← = COLORVISION specialist
│   │   └── src/
│   │       ├── index.ts
│   │       └── skill.ts      ← extract dominant colors, match brand hexes
│   │
│   └── aesthetic/            ← NEW: AESTHETICJUDGE specialist
│       └── src/
│           ├── index.ts
│           └── skill.ts      ← GPT-4o vision: "is this a real logo"
│
├── apps/
│   └── dashboard/            ← Next.js split-screen demo UI
│       └── src/
│           ├── app/
│           │   ├── page.tsx           ← Client | Verifier | Freelancer
│           │   └── api/
│           │       ├── jobs/route.ts
│           │       ├── stream/[id]/route.ts
│           │       └── agents/[name]/route.ts
│           └── components/
│               ├── ClientPanel.tsx     ← fund escrow button
│               ├── FreelancerPanel.tsx ← upload deliverable
│               ├── VerifierPanel.tsx   ← live verdict cards
│               └── TxToast.tsx
│
└── scripts/
    ├── deploy-escrow.ts      ← NEW: deploy Escrow.sol to GOAT testnet3
    ├── register-agent.ts     ← ERC-8004 registration (all 4 agents)
    ├── fund-agents.ts
    └── check-balances.ts
```

---

## 7. Smart Contract Surface

PaidProof deploys **ONE custom contract** (`contracts/Escrow.sol`) plus reuses GOAT's existing ERC-8004 + USDC.

### `Escrow.sol` — the heart of the demo

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transferFrom(address,address,uint256) external returns (bool);
    function transfer(address,uint256) external returns (bool);
}

contract Escrow {
    enum Status { None, Funded, Released, Refunded, Disputed }

    struct Job {
        address client;
        address freelancer;
        uint256 amount;
        Status status;
    }

    IERC20  public immutable token;       // USDC on GOAT
    address public immutable verifier;    // Lead Verifier wallet (only authorised releaser)

    mapping(bytes32 => Job) public jobs;

    event Funded(bytes32 indexed jobId, address client, address freelancer, uint256 amount);
    event Released(bytes32 indexed jobId, address freelancer, uint256 amount);
    event Refunded(bytes32 indexed jobId, address client, uint256 amount);
    event Disputed(bytes32 indexed jobId);

    constructor(address _token, address _verifier) {
        token = IERC20(_token);
        verifier = _verifier;
    }

    function fund(bytes32 jobId, address freelancer, uint256 amount) external {
        require(jobs[jobId].status == Status.None, "job exists");
        require(token.transferFrom(msg.sender, address(this), amount), "xfer fail");
        jobs[jobId] = Job(msg.sender, freelancer, amount, Status.Funded);
        emit Funded(jobId, msg.sender, freelancer, amount);
    }

    function release(bytes32 jobId) external {
        require(msg.sender == verifier, "not verifier");
        Job storage j = jobs[jobId];
        require(j.status == Status.Funded, "not funded");
        j.status = Status.Released;
        require(token.transfer(j.freelancer, j.amount), "xfer fail");
        emit Released(jobId, j.freelancer, j.amount);
    }

    function refund(bytes32 jobId) external {
        require(msg.sender == verifier, "not verifier");
        Job storage j = jobs[jobId];
        require(j.status == Status.Funded || j.status == Status.Disputed, "bad status");
        j.status = Status.Refunded;
        require(token.transfer(j.client, j.amount), "xfer fail");
        emit Refunded(jobId, j.client, j.amount);
    }

    function dispute(bytes32 jobId) external {
        Job storage j = jobs[jobId];
        require(msg.sender == j.client || msg.sender == j.freelancer, "not party");
        require(j.status == Status.Funded, "not funded");
        j.status = Status.Disputed;
        emit Disputed(jobId);
    }
}
```

**Why this design wins the demo:**

- Single "authorised releaser" (Lead Verifier wallet) — makes the autonomous-agent narrative concrete.
- No multi-sig, no oracle dance — the agent's verdict IS the release authority.
- Refund path lets us recover funds in the failure demo without committing to a full DAO arbiter.
- Dispute flag is the hook for the v2 second-opinion agent (mentioned in pitch, not required for MVP).

### Reused on GOAT Testnet3
- ERC-8004 **IdentityRegistry** at `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`
- ERC-8004 **ReputationRegistry** at `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`
- USDC at `0x29d1ee93e9ecf6e50f309f498e40a6b42d352fa1`

---

## 8. Agent Identity & Registration

Four agents, four ERC-8004 NFTs. Each hosts its own `agent-card.json` at `GET /`:

| Agent | Skill ID | Price (USDC) | Folder |
|---|---|---|---|
| Lead Verifier | `verify.lead` | n/a (orchestrator) | `agents/foreman` |
| FileSpec | `verify.filespec` | 0.02 | `agents/researcher` |
| ColorVision | `verify.colorvision` | 0.03 | `agents/writer` |
| AestheticJudge | `verify.aesthetic` | 0.05 | `agents/aesthetic` |

Example agent card (FileSpec):

```json
{
  "type": "AgentCard/0.8",
  "name": "FileSpec (PaidProof)",
  "description": "Verifies file type, dimensions, and size against deliverable criteria.",
  "services": [
    { "name": "x402", "endpoint": "http://localhost:3101/work", "version": "v2" }
  ],
  "skills": [
    { "id": "verify.filespec", "priceUsdc": "0.02", "etaSec": 10 }
  ],
  "registrations": [
    { "agentId": null, "agentRegistry": "eip155:48816:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" }
  ],
  "supportedTrust": ["reputation"],
  "x402Support": true
}
```

`scripts/register-agent.ts` registers all 4 agents in one pass and writes the resulting agent IDs into `.env`.

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

> *Browser at `http://localhost:3000`. Split screen: Marcus (client) on left, Sarah (freelancer) on right, verification flow center. Four agent terminals visible on a second display.*

| Time | Action | What you say |
|---|---|---|
| 0:00 | Agreement card empty; Marcus's wallet shows $250, Sarah's shows $0. | *"Sarah just landed a $200 logo job. Today she'd wait 19 days. Watch this."* |
| 0:10 | Marcus clicks **Fund Escrow** → $200 leaves his wallet → Escrow contract on GOAT shows $200. Tx toast links to explorer. | *"$200 USDC locked on Bitcoin-secured GOAT. Neither side controls it now."* |
| 0:25 | Criteria card lights up: "1024×1024 PNG, brand colors #FF5733 + #1A1A1A, delivered today." | *"An AI helped them write these criteria upfront so there's nothing fuzzy."* |
| 0:40 | Sarah drags `logo.png` onto her panel. | *"Sarah delivers."* |
| 0:48 | Lead Verifier card lights up: *"Dispatching 3 specialists…"* | *"The Lead Verifier is a real OpenClaw agent with its own ERC-8004 identity — 247 of its last 250 verdicts were correct."* |
| 0:52 | Three cards bloom: FileSpec, ColorVision, AestheticJudge — each shows *"Paying via x402… ✓"* then a verdict. | *"Three agent-to-agent x402 payments. Each specialist signs its verdict. ALL ON-CHAIN."* |
| 1:08 | Lead Verifier aggregates: ✓✓✓ → big green **VERIFIED** stamp. | *"All criteria pass. The agent signs a release transaction."* |
| 1:15 | Escrow.release() tx broadcasts → Sarah's wallet jumps $0 → $200. | *"Boom. $200. In Sarah's wallet. From a startup in Canada to a designer in Nigeria. 30 seconds. No middleman."* |
| 1:30 | Switch tab to GOAT explorer; show all 4 txs (3 x402 + 1 release). | *"Real transactions. Bitcoin-secured. Auditable."* |
| 1:45 | Reputation registry tx posts → Sarah's on-chain reputation ticks up. | *"Her reputation is portable. She can take it to her next client on any platform."* |
| 2:00 | Closing line. | *"63% of freelancers wait over a month to get paid. PaidProof makes that 30 seconds. The middleman was the bug."* |

Backup if testnet RPC is slow: dashboard falls back to `X402_MODE=mock` and synthesises tx hashes; narrative is identical.

---

## 12. Risks & Fallbacks

| Risk | Likelihood | Fallback |
|---|---|---|
| Escrow deploy tx fails mid-hackathon | medium | Pre-deploy at 11:30 AM. Hard-code `ESCROW_ADDRESS` in `.env`. Keep deploy script idempotent. |
| GOAT testnet3 RPC down or slow | medium | `X402_MODE=mock` short-circuits all on-chain calls. Demo narrative preserved with synthetic tx hashes. |
| Vision LLM (GPT-4o) flakes on logo verdict | medium | AestheticJudge has a deterministic fallback ("width ≥ 256 AND height ≥ 256 AND not all-white") that still produces a signed verdict. |
| ERC-8004 registration tx fails | low | Pre-register all 4 agents at 11:30 AM. Hard-code `agentId`s into `.env`. |
| Client lacks USDC allowance on Escrow | low | Dashboard's fund button does `approve` then `fund` in one click via viem multicall. |
| Faucet empty / can't get BTC for gas | medium | Reuse master wallet via `scripts/fund-agents.ts` to fan out gas. |
| Time overruns | high | Hard cutoff at 4:30 PM for new code. 4:30–5:30 PM is **demo polish only**. |

---

## 13. Execution Timeline (Hackathon Day)

| Time | Milestone | Owner |
|---|---|---|
| 11:00 | Pivot from HERD locked. PaidProof blueprint v2.0 sealed. | Mastermind |
| 11:15 | `npm install` green across all packages; tsc clean | Bootstrapper |
| 11:30 | Escrow.sol deployed; `ESCROW_ADDRESS` in `.env` | Sub-agent: **EscrowDeployer** |
| 12:00 | All 4 agents register on ERC-8004; agentIds in `.env` | Sub-agent: **Onboarder** |
| 13:00 | FileSpec + ColorVision + AestheticJudge respond 402 then verdict | Sub-agent: **SpecialistBuilder** |
| 14:00 | Lead Verifier parses criteria → dispatches 3 specialists → aggregates | Sub-agent: **VerifierBuilder** |
| 14:30 | Lead Verifier signs `Escrow.release()` on full pass | Sub-agent: **EscrowReleaser** |
| 15:00 | Dashboard split-screen: client fund button, freelancer upload, verifier panel | Sub-agent: **UIBuilder** |
| 15:30 | Reputation feedback posted; portable rep visible | Sub-agent: **ReputationWeaver** |
| 16:30 | End-to-end live run on testnet3 passes 3× in a row | Mastermind |
| 17:00 | Demo polish: copy, animations, fallback video recorded | Sub-agent: **Polisher** |
| 17:30 | Dry-run demo with stopwatch ≤ 110s | Mastermind |
| 17:45 | Submit | Mastermind |

---

## 14. Success Criteria

The project ships if **all** of the following are true at 5:45 PM:

1. ✅ `Escrow.sol` is deployed on GOAT Testnet3 with a `Funded` event and a `Released` event from the demo run.
2. ✅ Four ERC-8004 agent IDs (Lead Verifier + 3 specialists) visible on the GOAT explorer.
3. ✅ At least one full demo produces ≥ 3 on-chain x402 settlements + 1 escrow release tx.
4. ✅ Reputation feedback was written to the Reputation Registry for ≥ 1 specialist + the freelancer.
5. ✅ Dashboard performs the demo in < 120 seconds with zero manual terminal intervention.
6. ✅ `README.md` lets a fresh judge clone + `npm install` + `npm run dev` and hit a working URL in < 5 minutes.

If any item fails, fall back to `X402_MODE=mock` (#12) — narrative is preserved, judges still see the verification logic.

---

## 15. Post-Hackathon Vision (for judge Q&A)

- **v1.1** — Milestone-based escrows (split a $5k retainer into 10 weekly releases gated by AI commit-watcher).
- **v1.2** — Second-opinion agents: if the freelancer disputes, a higher-rep verifier re-judges for an x402 fee.
- **v1.3** — Marketplace of specialist verifiers (e.g. CodeReviewAgent, VideoCutAgent, CopyToneAgent). Open SDK.
- **v2.0** — Be the rail under Fiverr / Upwork / Toptal. 1% take rate vs their 10%. Reputation portability is the moat.

Market: $400B freelance economy, 14% YoY. Comparable exits: Wise IPO $11B, Deel $12B. Revenue model: 1% protocol fee on every released escrow, routed to a PaidProof treasury contract.

---

## 16. Glossary

- **Criterion** — a single requirement on the deliverable, e.g. `{ kind: "filespec", mime: "image/png", widthPx: 1024, heightPx: 1024 }`.
- **Verdict** — `{ pass: boolean, confidence: number, reasoning: string }` returned by a specialist for one criterion bucket.
- **Escrow Job** — the on-chain state for one freelance contract: `{ jobId, client, freelancer, amount, status }`.
- **Lead Verifier** — the OpenClaw orchestrator agent that dispatches specialists and signs `Escrow.release()`.
- **Specialist** — a single-purpose verification agent (FileSpec / ColorVision / AestheticJudge).
- **Settlement receipt** — base64 JSON in `X-PAYMENT-RESPONSE` header containing the on-chain tx hash of the x402 micropayment.
- **Agent card** — ERC-8004 registration JSON resolved from `tokenURI` of the agent's NFT.
