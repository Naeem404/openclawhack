# HERD — Agent Delegation Plan

> Procedural task packets for sub-agents. Each packet is self-contained. Open one, complete it, mark it done.
> The Mastermind owns `PROJECT_BLUEPRINT.md`. Sub-agents own these packets.
> Read `PROJECT_BLUEPRINT.md` § 4 (Architecture) and § 6 (Repo Layout) **before starting any packet**.

---

## How To Use This Document

1. Pick the lowest-numbered packet that is `STATUS: TODO`.
2. Read its **Inputs**, **Outputs**, **Acceptance Criteria**, and **Dependencies**.
3. Execute. Do **not** invent scope outside the packet.
4. When done, change `STATUS: TODO` → `STATUS: DONE` and append a one-line note in `PROGRESS.md`.
5. If blocked, change to `STATUS: BLOCKED` and explain in `PROGRESS.md`. Move to the next unblocked packet.

**Rules for all packets:**
- Use TypeScript strict mode. No `any` without a comment justifying it.
- All chain-related constants come from `shared/src/constants.ts`. Never inline an address.
- All env vars come from `.env`. Add new ones to `.env.example` in the same edit.
- All HTTP errors return JSON: `{ error: string, code: string }`.
- Every agent server must log to stdout: `[<agent-name>] <event>` so the orchestrator can grep logs.
- Do not commit secrets. `.env` is in `.gitignore`.

---

## Packet Index

| ID | Title | Owner role | Est. | Status |
|---|---|---|---|---|
| P00 | Bootstrap: root tooling + shared types | Bootstrapper | 30 min | TODO |
| P01 | Specialist server template (Researcher) | SpecialistBuilder | 45 min | TODO |
| P02 | Specialist server template (Writer) | SpecialistBuilder | 20 min | TODO |
| P03 | ERC-8004 registration script | Onboarder | 30 min | TODO |
| P04 | Foreman: brief decomposition | ForemanBuilder | 30 min | TODO |
| P05 | Foreman: bid solicitation + ranking | ForemanBuilder | 30 min | TODO |
| P06 | Foreman: x402 client + dispatch loop | ForemanBuilder | 45 min | TODO |
| P07 | Foreman: reputation feedback | ReputationWeaver | 20 min | TODO |
| P08 | Foreman: SSE event stream | ForemanBuilder | 20 min | TODO |
| P09 | Dashboard: Next.js scaffold + Tailwind | UIBuilder | 30 min | TODO |
| P10 | Dashboard: JobForm + SwarmTimeline | UIBuilder | 45 min | TODO |
| P11 | Dashboard: SSE consumer + TxToast | UIBuilder | 30 min | TODO |
| P12 | End-to-end dry run + fixes | Mastermind | 30 min | TODO |
| P13 | Demo polish + fallback video | Polisher | 30 min | TODO |
| P14 | (stretch) JobEscrow.sol | ContractDev | 60 min | OPTIONAL |
| P15 | (stretch) On-chain BidBoard discovery | ContractDev | 60 min | OPTIONAL |

**Critical path:** P00 → P01 → P03 → P04 → P05 → P06 → P08 → P09 → P10 → P11 → P12
**Parallelizable:** P02 ‖ P01, P07 ‖ P06, P09 ‖ P04

---

## P00 — Bootstrap: root tooling + shared types

**Owner:** Bootstrapper
**Goal:** Make `pnpm install && pnpm typecheck` succeed.

**Inputs**
- `PROJECT_BLUEPRINT.md` § 5 (Tech Stack — Pinned), § 6 (Repo Layout), § 5 (constants table)

**Outputs (files)**
- `package.json` (root, with pnpm workspaces)
- `pnpm-workspace.yaml`
- `tsconfig.base.json`
- `.env.example`
- `.gitignore`
- `shared/package.json`
- `shared/tsconfig.json`
- `shared/src/constants.ts` — chain ID, RPC, contract addresses, USDC, USDT
- `shared/src/types.ts` — `Job`, `Subtask`, `Bid`, `Artifact`, `AgentCard`, `SwarmEvent`
- `shared/src/abi.ts` — minimal ABIs for ERC-8004 Identity + Reputation registries, ERC-20 (USDC)

**Acceptance criteria**
- `pnpm install` succeeds at root.
- `pnpm -r typecheck` (which calls `tsc --noEmit` per package) passes.
- `shared` package builds and is importable from other workspaces as `@herd/shared`.

**Implementation notes**
- Use pnpm workspaces with packages: `shared`, `agents/foreman`, `agents/researcher`, `agents/writer`, `apps/dashboard`, `scripts`.
- `tsconfig.base.json` should set `"strict": true`, `"module": "NodeNext"`, `"moduleResolution": "NodeNext"`, `"target": "ES2022"`.
- Root `package.json` exposes scripts:
  - `dev` — `concurrently "pnpm -F foreman dev" "pnpm -F researcher dev" "pnpm -F writer dev" "pnpm -F dashboard dev"`
  - `typecheck` — `pnpm -r typecheck`
  - `register` — `pnpm -F scripts register`
- `.env.example` must list every env var that ANY workspace reads. See appendix A below.

---

## P01 — Specialist server template (Researcher)

**Owner:** SpecialistBuilder
**Goal:** A Hono server that answers `GET /` with an agent card, `GET /bid?spec=…` with a bid, and `POST /work` with HTTP 402 → on payment → returns research artifact.

**Inputs**
- P00 outputs complete.
- LLM env: `OPENAI_API_KEY` (or `ANTHROPIC_API_KEY` fallback).
- Wallet env: `RESEARCHER_PRIVATE_KEY`, `RESEARCHER_AGENT_ID` (may be empty at first; populated by P03).

**Outputs**
- `agents/researcher/package.json` (deps: `hono`, `@hono/node-server`, `viem`, `openai`, `x402-hono` or fallback, `dotenv`, `@herd/shared`)
- `agents/researcher/tsconfig.json`
- `agents/researcher/src/index.ts`
- `agents/researcher/src/card.ts`
- `agents/researcher/src/skill.ts`
- `agents/researcher/.env.example` link (just references the root `.env`)
- `agents/researcher/agent-card.json` (the static JSON uploaded during registration)

**Behavior contract**

| Endpoint | Method | Behavior |
|---|---|---|
| `/` | GET | returns `agent-card.json` |
| `/identity` | GET | returns `{ agentId, address, network, txHash }` from env |
| `/bid` | GET | query `?spec=<urlencoded>` → returns `{ priceUsdc: "0.05", etaSec: 30, agentId, signature }` signed with researcher key |
| `/work` | POST | x402-gated. Body `{ spec: { topic, sources?: number } }`. On success: `{ artifact: { bullets: string[], sources: string[] } }` |

**Acceptance criteria**
- `pnpm -F researcher dev` boots on port `3101`.
- `curl http://localhost:3101/` returns valid JSON matching `AgentCard` type.
- `curl -X POST http://localhost:3101/work -d '{}' -H 'content-type: application/json'` returns **HTTP 402** with `PAYMENT-REQUIRED` header.
- With a valid `X-PAYMENT` header (mocked in dev), returns 200 + non-empty `artifact.bullets`.

**Implementation notes**
- `skill.ts`: call OpenAI Chat Completions with a tight prompt: *"Return strictly JSON `{ bullets: string[], sources: string[] }`. 3–5 bullets, 2–3 sources."*. Validate with zod before returning.
- If x402 facilitator is unreachable, fall back to local signature verification using viem's `verifyTypedData`. Add an env flag `X402_MODE=facilitator|local` (default `facilitator`).
- Default price: `0.05` USDC (50000 base units).
- Use `@hono/node-server` to serve.

---

## P02 — Specialist server template (Writer)

**Owner:** SpecialistBuilder
**Goal:** Clone of P01 with skill = "write a brief from research bullets".

**Differences from P01**
- Port `3102`.
- Skill input: `{ topic, bullets: string[], targetWords: number }`.
- Skill output: `{ artifact: { markdown: string, wordCount: number } }`.
- Price: `0.08` USDC (80000 base units).
- Card name: `"Writer (HERD)"`, skill id: `"write.brief"`.

**Acceptance criteria** — same as P01, on port 3102, returns a markdown string of ≥ `targetWords * 0.8` words.

---

## P03 — ERC-8004 registration script

**Owner:** Onboarder
**Goal:** A single command that registers all three agents (Foreman, Researcher, Writer) on ERC-8004 Identity Registry and writes their `agentId`s to `.env`.

**Inputs**
- P00 outputs complete.
- `.env` populated with three private keys: `FOREMAN_PRIVATE_KEY`, `RESEARCHER_PRIVATE_KEY`, `WRITER_PRIVATE_KEY`.
- Each agent's `agent-card.json` exists (from P01/P02 plus Foreman card to be created here).

**Outputs**
- `scripts/package.json`
- `scripts/src/register-agent.ts`
- `scripts/src/lib/uploadCard.ts` (uses `data:application/json;base64,…` URI for MVP; pluggable for IPFS later)
- `scripts/src/lib/registry.ts`
- `agents/foreman/agent-card.json` (created if missing)

**Behavior**

```
pnpm register --agent foreman
pnpm register --agent researcher
pnpm register --agent writer
pnpm register --all     # registers all three sequentially
```

For each:
1. Compute `dataUri = "data:application/json;base64," + base64(card)`.
2. Call `IdentityRegistry.register(dataUri)` from agent's wallet using viem.
3. Parse `Transfer` event → extract `tokenId` = `agentId`.
4. Append/update `<AGENT>_AGENT_ID=<id>` in `.env` (idempotent: replace if exists).
5. Print: `[register] foreman → agentId=42 tx=0x…  https://explorer.testnet3.goat.network/tx/0x…`.

**Acceptance criteria**
- After `pnpm register --all`, `.env` has three populated `*_AGENT_ID` lines.
- Each tx hash resolves on the GOAT testnet3 explorer.
- Script is idempotent: re-running it does NOT re-register; it detects existing `agentURI` ownership and exits cleanly.

**Implementation notes**
- Minimal ABI for `register(string uri)` returns `uint256 tokenId`.
- Detect existing registration: if agent's wallet already owns an NFT in the registry, skip. Use `balanceOf(address)` + `tokenOfOwnerByIndex` if available; else event scan.
- Gas: GOAT requires explicit pricing per the demo (`--priority-gas-price 130000 --gas-price 1000000`). Configure viem with `maxFeePerGas` and `maxPriorityFeePerGas` accordingly.

---

## P04 — Foreman: brief decomposition

**Owner:** ForemanBuilder
**Goal:** `decompose(brief, budgetUsdc)` returns an ordered list of `Subtask` objects.

**Inputs**
- P00 outputs complete.
- `OPENAI_API_KEY` in env.

**Outputs**
- `agents/foreman/package.json`
- `agents/foreman/tsconfig.json`
- `agents/foreman/src/decompose.ts`
- `agents/foreman/src/index.ts` (stub: Hono server listening on `3100`, with `POST /jobs` calling `decompose` and returning the plan)

**Function signature**

```ts
// agents/foreman/src/decompose.ts
export async function decompose(
  brief: string,
  budgetUsdc: string,
): Promise<Subtask[]>;
```

**Prompt template (locked, do not edit lightly)**

```
You are a project foreman. Decompose the user's brief into the SMALLEST ordered
list of subtasks needed to deliver it. Use only these skill types:
  - research.web   : gather sourced bullet points from the web
  - write.brief    : write a markdown brief from supplied bullets
Return strictly JSON: { subtasks: [{ id, skill, spec, dependsOn }] }
- id: short kebab-case
- skill: one of the listed types
- spec: object passed verbatim to the specialist
- dependsOn: array of earlier subtask ids whose artifacts feed this one's spec
Keep the plan to at most 3 subtasks. Budget hint: $<BUDGET_USDC>.
Brief: """<BRIEF>"""
```

**Acceptance criteria**
- Calling `decompose("Write a 300-word brief on BTC L2 trade-offs with 3 sources", "0.20")` returns exactly 2 subtasks: one `research.web` then one `write.brief` with `dependsOn=[research-id]`.
- Returned JSON validates against `Subtask` zod schema.
- LLM call timeout: 15 seconds. On timeout: return a deterministic fallback plan (research → write).

---

## P05 — Foreman: bid solicitation + ranking

**Owner:** ForemanBuilder
**Goal:** Given a `Subtask`, find Specialists whose `skills[]` contain that skill id, request bids, rank by `score = rep − k * price`, return winner.

**Inputs**
- P04 outputs complete.
- Specialists registered (P01, P02). For MVP, Specialist endpoints are statically configured via env: `RESEARCHER_URL`, `WRITER_URL`.

**Outputs**
- `agents/foreman/src/dispatch.ts`
- `agents/foreman/src/reputation.ts` (read-only helper: `getReputation(agentId)` → average decimal score)

**Function signatures**

```ts
export async function solicitBids(subtask: Subtask): Promise<Bid[]>;
export async function rankBids(bids: Bid[]): Promise<Bid>;     // returns winner
```

**Acceptance criteria**
- `solicitBids` returns ≥ 1 bid for `research.web` and `write.brief` when both specialists are up.
- `rankBids` deterministically picks the higher reputation when prices are equal, and the lower price when reputations are equal.
- Failure mode: if a specialist times out (3 s), drop it from candidates but log a warning. If zero candidates remain, throw `NoBidsError`.

**Implementation notes**
- Specialist discovery for MVP: read `SPECIALIST_REGISTRY` env var = JSON array of `{ url, skills: string[] }`. Document this in `.env.example`.
- `getReputation`: call `ReputationRegistry.getSummary(agentId, [], 0, 0)` → `(count, summaryValue, summaryValueDecimals)` → normalize to a 0–100 float. If `count == 0`, return `50.0` (neutral).
- Constant `k = 0.5` lives in `shared/src/constants.ts` as `RANKING_PRICE_WEIGHT`.

---

## P06 — Foreman: x402 client + dispatch loop

**Owner:** ForemanBuilder
**Goal:** Run subtasks in dependency order, paying each Specialist via x402, threading artifacts forward.

**Inputs**
- P04, P05 outputs complete.

**Outputs**
- `agents/foreman/src/pay.ts` — x402 client (signs EIP-712, retries with payment header)
- `agents/foreman/src/run.ts` — `runJob(brief, budgetUsdc): Promise<JobResult>`
- `agents/foreman/src/index.ts` updated: `POST /jobs` calls `runJob` and streams events to SSE channel (P08 finishes the SSE part)

**`pay.ts` contract**

```ts
export async function paidPost<T>(
  url: string,
  body: unknown,
  opts: { maxPriceUsdc: string; wallet: WalletClient },
): Promise<{ data: T; settlement: SettlementResponse }>;
```

- First POST without `X-PAYMENT`.
- On 402: decode `PAYMENT-REQUIRED`, assert `amount ≤ maxPriceUsdc`, build `PaymentPayload`, sign EIP-712, retry once with `X-PAYMENT`.
- On 200: decode `X-PAYMENT-RESPONSE` into `settlement`.
- On any other status: throw with status + body.

**`runJob` behavior**
1. Call `decompose` → subtasks.
2. Topologically sort by `dependsOn`.
3. For each subtask:
   a. `solicitBids` → `rankBids` → winner.
   b. Build `spec` by merging subtask's `spec` + parent artifacts.
   c. `paidPost(winner.endpoint + "/work", { spec }, { maxPriceUsdc: winner.priceUsdc, wallet })`.
   d. Store `{ subtaskId, agentId, artifact, settlement }` in an in-memory ledger.
4. Compile final deliverable: last subtask's artifact + metadata.
5. Return `{ deliverable, ledger, totalSpentUsdc }`.

**Acceptance criteria**
- `curl -X POST http://localhost:3100/jobs -d '{"brief":"…","budgetUsdc":"0.20"}'` returns a JSON deliverable within 60 seconds on local mock mode.
- On testnet3, each subtask produces a real USDC transfer tx visible on the explorer.
- `totalSpentUsdc` never exceeds `budgetUsdc` — enforce a hard guard before dispatching the final subtask.

---

## P07 — Foreman: reputation feedback

**Owner:** ReputationWeaver
**Goal:** After a successful job, post on-chain feedback for each Specialist.

**Inputs**
- P06 complete.

**Outputs**
- `agents/foreman/src/feedback.ts`
- Wired into `runJob` after deliverable is built.

**Function signature**

```ts
export async function postFeedback(
  specialistAgentId: bigint,
  subtaskType: string,
  success: boolean,
  durationMs: number,
): Promise<{ txHash: `0x${string}` }>;
```

- Map outcome → `value` (int128) and tags:
  - success: `value = 100, valueDecimals = 0, tag1 = bytes32("herd.subtask"), tag2 = bytes32(subtaskType)`
  - failure: `value = -50` (negative, signals dispute)
- Call `ReputationRegistry.giveFeedback(agentId, value, valueDecimals, tag1, tag2, "", "", 0x000…0)`.

**Acceptance criteria**
- After a successful run, two feedback events emitted on-chain (one per Specialist).
- `reputationRegistry.getSummary(specialistAgentId, [], 0, 0)` count increments by 1.
- Idempotent per `(foremanAgentId → specialistAgentId → subtaskId)`: tracked in-memory ledger.

---

## P08 — Foreman: SSE event stream

**Owner:** ForemanBuilder
**Goal:** Stream every meaningful event from a job run to subscribers.

**Inputs**
- P06 complete.

**Outputs**
- `agents/foreman/src/sse.ts` — minimal pub/sub keyed by `jobId`.
- `agents/foreman/src/index.ts` adds: `GET /jobs/:id/events` SSE endpoint.

**Event types emitted (from `SwarmEvent` union in `shared/src/types.ts`)**

- `job.created` `{ jobId, brief, budgetUsdc }`
- `job.decomposed` `{ jobId, subtasks: Subtask[] }`
- `bid.received` `{ subtaskId, bid: Bid }`
- `bid.selected` `{ subtaskId, winner: Bid }`
- `payment.required` `{ subtaskId, amountUsdc }`
- `payment.settled` `{ subtaskId, txHash, blockNumber }`
- `artifact.produced` `{ subtaskId, artifact }`
- `feedback.posted` `{ specialistAgentId, txHash, value }`
- `job.completed` `{ jobId, deliverable, totalSpentUsdc }`
- `job.failed` `{ jobId, error }`

**Acceptance criteria**
- A client doing `eventsource.addEventListener` receives every event in order for one job.
- Backpressure-safe: if no subscribers, events are dropped (not buffered indefinitely).
- Connection closes cleanly on `job.completed` or `job.failed`.

---

## P09 — Dashboard: Next.js scaffold + Tailwind

**Owner:** UIBuilder
**Goal:** A Next.js 14 App-Router project that builds and serves a blank styled page at `http://localhost:3000`.

**Outputs**
- `apps/dashboard/package.json`
- `apps/dashboard/next.config.mjs`
- `apps/dashboard/tailwind.config.ts`
- `apps/dashboard/postcss.config.mjs`
- `apps/dashboard/tsconfig.json`
- `apps/dashboard/src/app/layout.tsx`
- `apps/dashboard/src/app/page.tsx` (placeholder hero)
- `apps/dashboard/src/app/globals.css` (Tailwind directives + 1 brand variable)

**Acceptance criteria**
- `pnpm -F dashboard dev` serves a styled hero page (dark theme, brand color #FFB400 "GOAT gold" accent, project name HERD, tagline).
- No console errors.
- Builds with `pnpm -F dashboard build`.

---

## P10 — Dashboard: JobForm + SwarmTimeline

**Owner:** UIBuilder
**Goal:** Build the two main interactive components. Use `lucide-react` icons.

**Outputs**
- `apps/dashboard/src/components/JobForm.tsx` — textarea for brief, numeric budget input, "Run swarm" button. On submit: `POST /api/jobs` (Next.js route proxies to Foreman).
- `apps/dashboard/src/components/SwarmTimeline.tsx` — vertical timeline component that accepts `events: SwarmEvent[]` and renders cards with icon + label + payload + tx-explorer link.
- `apps/dashboard/src/components/AgentCard.tsx` — small badge showing agent name, ERC-8004 id, current rep score.
- `apps/dashboard/src/components/TxToast.tsx` — toast triggered on `payment.settled` events.
- `apps/dashboard/src/app/api/jobs/route.ts` — POST proxy to `FOREMAN_URL` env (default `http://localhost:3100`).
- `apps/dashboard/src/app/page.tsx` updated to compose JobForm + SwarmTimeline.

**Visual spec**
- Dark canvas (`bg-zinc-950`, text `zinc-100`).
- Brand accent `#FFB400` (gold) for primary CTA + active states.
- Cards: `rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur p-5`.
- Timeline connector: 2px vertical line in `zinc-800` with dots in accent color.
- Use `clsx` for conditionals. Import only the icons used.

**Acceptance criteria**
- Submitting the form posts to Foreman and immediately shows a "Job created" timeline entry.
- Empty state of timeline reads: *"Awaiting prompt. The swarm sleeps."*
- Mobile breakpoint: form stacks vertically; timeline scrolls naturally.

---

## P11 — Dashboard: SSE consumer + TxToast

**Owner:** UIBuilder
**Goal:** Open an `EventSource` against `/api/stream/:id` on job creation; pipe events into timeline.

**Outputs**
- `apps/dashboard/src/app/api/stream/[id]/route.ts` — Next.js route that proxies SSE from Foreman (set `Content-Type: text/event-stream`, `Cache-Control: no-store`, `Connection: keep-alive`).
- `apps/dashboard/src/hooks/useJobStream.ts` — `useJobStream(jobId)` → `{ events, status }`.
- `apps/dashboard/src/components/TxToast.tsx` — listens to events; renders auto-dismissing toasts with explorer link.

**Acceptance criteria**
- Submitting a brief produces 6+ timeline events live on testnet3.
- Each `payment.settled` event triggers a TxToast with a working link to `https://explorer.testnet3.goat.network/tx/<hash>`.
- Stream auto-closes when `job.completed` is received.
- Disconnect handling: if the SSE drops, dashboard shows a "Reconnecting…" pill.

---

## P12 — End-to-end dry run + fixes

**Owner:** Mastermind
**Goal:** Run the full demo loop 3× successfully. Fix anything broken.

**Inputs**
- All P00–P11 done.

**Procedure**
1. Kill all servers. Restart `pnpm dev`.
2. Open `http://localhost:3000`.
3. Paste demo brief: *"Write a 300-word brief on Bitcoin L2 trade-offs with three sources."*. Budget `0.20`.
4. Click Run. Watch timeline.
5. After completion, verify:
   - 2 USDC transfer txs on testnet3 explorer
   - 2 feedback events on testnet3 explorer
   - Final markdown renders in dashboard
6. Repeat steps 3–5 twice more.

**Acceptance criteria**
- Three back-to-back successes with < 90 s wall time each.
- Zero console errors in browser.
- Zero unhandled rejections in any agent log.

---

## P13 — Demo polish + fallback video

**Owner:** Polisher
**Goal:** Make the live demo feel inevitable.

**Tasks**
- Record a 90-second screencap of a clean run. Save to `apps/dashboard/public/demo.mp4`.
- Add a "Play recorded demo" button bottom-right of the dashboard that pauses live stream and plays the video.
- Pre-warm: load the Foreman + Specialist servers and hit `/identity` on each from dashboard mount, so first interactive run skips cold-start.
- Add one ambient detail: a small "Bitcoin block height: <n>" pill in the header, polled every 10s from `bitcoin.latest_height` (via AgentKit if available, else dropped silently).
- Final README pass.

**Acceptance criteria**
- Recorded video plays inline without breaking layout.
- Pre-warm is invisible (no flashes).
- README "Run in 60 seconds" steps are accurate from a fresh clone.

---

## P14 — (stretch) JobEscrow.sol

**Status: OPTIONAL** — only if all P00–P13 done by 4:00 PM.

Custom contract that holds Buyer's USDC in escrow, releases per milestone signed by Foreman, refunds remainder on completion.

Files: `contracts/JobEscrow.sol`, `contracts/test/JobEscrow.t.sol`, `scripts/deploy-escrow.ts`.

Acceptance: deployed to testnet3, Foreman integrated; 1 demo run uses escrow path.

---

## P15 — (stretch) On-chain BidBoard discovery

**Status: OPTIONAL** — only if P14 done.

`BidBoard.sol`: Foreman emits `JobOpen(jobId, skillTag, deadline)`. Specialists listen to events, reply via off-chain x402. Adds the "open marketplace" narrative.

---

## Appendix A — `.env.example` master list

```dotenv
# === LLM ===
OPENAI_API_KEY=
ANTHROPIC_API_KEY=          # optional fallback

# === GOAT Testnet3 ===
GOAT_RPC_URL=https://rpc.testnet3.goat.network
GOAT_CHAIN_ID=48816
GOAT_EXPLORER=https://explorer.testnet3.goat.network

# === Wallets (one per agent) ===
FOREMAN_PRIVATE_KEY=
RESEARCHER_PRIVATE_KEY=
WRITER_PRIVATE_KEY=

# === ERC-8004 Agent IDs (populated by `pnpm register`) ===
FOREMAN_AGENT_ID=
RESEARCHER_AGENT_ID=
WRITER_AGENT_ID=

# === Service URLs (local dev) ===
FOREMAN_URL=http://localhost:3100
RESEARCHER_URL=http://localhost:3101
WRITER_URL=http://localhost:3102
DASHBOARD_URL=http://localhost:3000

# === Specialist registry seen by Foreman ===
# JSON array. Each entry: { "url": "...", "skills": ["..."] }
SPECIALIST_REGISTRY=[{"url":"http://localhost:3101","skills":["research.web"]},{"url":"http://localhost:3102","skills":["write.brief"]}]

# === x402 ===
X402_FACILITATOR_URL=https://x402.org/facilitator
X402_MODE=local                 # facilitator | local
X402_NETWORK=goat-testnet3

# === Optional GOAT x402 merchant credentials (from GOATBot) ===
GOATX402_API_URL=
GOATX402_MERCHANT_ID=
GOATX402_API_KEY=
GOATX402_API_SECRET=

# === Misc ===
LOG_LEVEL=info
NODE_ENV=development
```

---

## Appendix B — Definition of Done (every packet)

- All listed output files exist.
- Acceptance criteria pass manually.
- `pnpm -r typecheck` is green.
- No new ESLint errors (if linter configured later).
- `.env.example` reflects any new vars introduced.
- One-line entry appended to `PROGRESS.md` (format: `YYYY-MM-DD HH:MM  P0X  done  short note`).
