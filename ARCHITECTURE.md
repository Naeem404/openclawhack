# Architecture

A more detailed walkthrough of how RefundRex is wired. For the visual
overview, see [README.md](./README.md).

---

## 1. Layers

### Presentation (`app/`, `components/`)
- Next.js 15 App Router, server components by default, client components
  marked explicitly.
- Tailwind + shadcn primitives in `components/ui/`.
- Feature components in `components/{dashboard,case,shared}/`.
- Live logs delivered via Server-Sent Events from `/api/agent/stream`.

### API surface (`app/api/`)
| Route | Verb | Purpose |
| --- | --- | --- |
| `/api/cases` | GET | list cases |
| `/api/cases/[id]` | GET | one case |
| `/api/agent/step` | POST | advance one tick of the orchestrator |
| `/api/agent/run` | POST | run case to terminal |
| `/api/agent/stream` | GET | SSE feed of all `events` |
| `/api/wallet` | GET/POST | wallet state + generate |
| `/api/chain/events` | GET | recent on-chain events |
| `/api/x402/charge` | POST | trigger an x402 capture |
| `/api/erc8004/register` | POST/GET | register / read manifest |
| `/api/stats` | GET | dashboard KPIs |
| `/api/demo/run` | POST/GET | start / list scenarios |

### Agent runtime (`lib/agent/`, `lib/openclaw/`)
- **`orchestrator.ts`** — the autonomous loop. Idempotent w.r.t. case status.
- **`planner.ts`** — pure function `(case, state) → PlannedAction`.
- **`classifier.ts`** — issue classification with confidence + p(success).
- **`memory.ts`** — per-case structured fact buckets.
- **`fraud.ts`** — pre-flight risk model.
- **`runtime.ts`** — OpenClaw skill dispatch shim.
- **`skills.ts`** — concrete skill handlers.

### Chain adapters (`lib/chain/`)
- **`goat.ts`** — provider/RPC abstraction.
- **`wallet.ts`** — signer abstraction.
- **`erc8004.ts`** — registry wrapper.
- **`x402.ts`** — payment capture wrapper.
- **`agentkit.ts`** — read-only wallet/report helper.

### Merchant comms (`lib/merchant/`)
- **`mock.ts`** — carrier tracking + A2A endpoint simulation.
- **`email.ts`** — outbound + inbound thread store.
- **`parser.ts`** — tone-aware draft + reply parser.

### State (`lib/store/`)
All in-memory, hot-reload-safe singletons.
- **`cases.ts`** — disputes.
- **`chain.ts`** — events + wallet.
- **`events.ts`** — pub/sub log bus that powers SSE.
- **`reputation.ts`** — derived from case data.

---

## 2. The autonomous loop

```ts
async function step(caseId) {
  const c = caseStore.get(caseId);
  const planned = planner.next(c, planner state);   // pure
  log("planner", "think", planned.reason);
  const result = await dispatch(c, planned);        // OpenClaw skill
  caseStore.update(c.id, { status: result.nextStatus });
  caseStore.pushTimeline(c.id, …);
  return { done: result.terminal, action: result.action };
}
```

`planner.next` is the only place the strategy lives. Swapping for an
LLM-based planner is a one-file change.

---

## 3. Skill dispatch

`runtime.dispatch(name, input, caseId)` is the only way the orchestrator
talks to chain/merchant systems. This means:

- **A skill catalog** is the contract. To deploy under ClawUp, we ship the
  same handler signatures and the agent runs the same code.
- **Telemetry is automatic** — every dispatch emits `think` / `success` /
  `error` log lines.
- **Testing is trivial** — register a fake skill, replay scenarios.

---

## 4. On-chain anchoring

```
agent action ──► chain wrapper ──► sendTransaction()
                                       │
                                       ▼
                              chainStore.push(pending)
                                       │
                                       ▼  (delay)
                            chainStore.confirm(hash)
                                       │
                                       ▼
                          UI's chain feed updates
```

Every successful resolution emits two chain events: the **x402 payment**
and (optional) a **reputation update**. Both surface in the live chain
feed component with explorer links.

---

## 5. Why this design

- **Pure planner + impure dispatch** keeps the autonomy logic testable.
- **One adapter per external system** keeps demo-mode toggles localized.
- **SSE everywhere** keeps the UI cheap and the agent feel real.
- **In-memory store** keeps the demo bulletproof — no DB, no migrations,
  no flaky network during a live pitch.

For production: swap stores for Postgres + Redis pub/sub, swap adapters
for real RPC/SDK calls. The signatures already match.
