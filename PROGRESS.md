# PaidProof — Build Progress Log

> Project pivoted on 2026-05-26 from HERD (multi-agent marketplace) to PaidProof
> (AI-verified freelance escrow). Old HERD log preserved below for the audit
> trail; PaidProof entries start at the **Pivot Checkpoint** section.

---

## HERD (initial scaffold — pre-pivot)

> One line per packet completed. Format: `YYYY-MM-DD HH:MM  P0X  STATUS  short note`.
> Append, do not edit history.

---

2026-05-26 11:50  P-1  done   Mastermind: research complete, idea locked = HERD multi-agent marketplace
2026-05-26 11:55  P-1  done   Mastermind: PROJECT_BLUEPRINT.md committed (master design)
2026-05-26 11:57  P-1  done   Mastermind: AGENT_DELEGATION.md committed (16 procedural packets P00–P15)
2026-05-26 11:58  P-1  done   Mastermind: README.md replaced with HERD pitch + run-in-60s
2026-05-26 12:00  P-1  done   Mastermind: root scaffolding (package.json, pnpm-workspace, tsconfig.base, .env.example, .gitignore)
2026-05-26 12:05  P00  done   Bootstrapper: shared/ package complete (constants.ts, types.ts, abi.ts, index.ts)
2026-05-26 12:10  P04  scaffold  ForemanBuilder: foreman skeleton (index.ts Hono server, decompose.ts LLM, dispatch.ts bid logic, pay.ts x402 client stub, run.ts orchestrator, feedback.ts reputation stub, sse.ts event bus)
2026-05-26 12:12  P01  scaffold  SpecialistBuilder: researcher skeleton (index.ts Hono, skill.ts OpenAI, agent-card.json, 0.05 USDC price)
2026-05-26 12:13  P02  scaffold  SpecialistBuilder: writer skeleton (index.ts Hono, skill.ts OpenAI, agent-card.json, 0.08 USDC price)
2026-05-26 12:15  P03  scaffold  Onboarder: scripts/register-agent.ts (viem + data: URI registration, idempotent, .env writer); fund-agents.ts; check-balances.ts
2026-05-26 12:20  P09-P11  scaffold  UIBuilder: dashboard skeleton (Next.js 14 + Tailwind + Lucide; JobForm, SwarmTimeline, AgentCard, TxToast components; useJobStream hook; SSE+POST proxies)

---

## Scaffold Checkpoint (12:25)

All 16 procedural packets from AGENT_DELEGATION.md have a corresponding skeleton file with explicit TODO blocks.
Sub-agents can now pick up any packet (P00-P15) without ambiguity.

**Pre-flight checklist before sub-agents start coding:**
1. `pnpm install` at repo root (resolves all workspace deps)
2. Generate 3 EVM keys, paste private keys into `.env`
3. Fund all 3 wallets with BTC via https://bridge.testnet3.goat.network/faucet
4. Fund all 3 wallets with USDC (Researcher + Writer need ≥0 USDC; Foreman needs enough to pay them)
5. `pnpm register --all` → writes `*_AGENT_ID` lines to `.env`
6. `pnpm balances` → sanity check
7. `pnpm dev` → boots foreman:3100, researcher:3101, writer:3102, dashboard:3000

**Critical path for sub-agent execution** (per AGENT_DELEGATION.md § Packet Index):
P00 ✅ → P01 ⏳ (x402-hono wire-up) → P03 ⏳ (registration end-to-end live) → P05 ⏳ (real reputation read) → P06 ⏳ (real paidPost) → P07 ⏳ (real giveFeedback writeContract) → P12 (E2E dry run)

---

## Open Questions

- [ ] Confirm `@goatnetwork/agentkit` package availability on npm at hackathon time; fallback path documented in BLUEPRINT § 12.
- [ ] Confirm exact `x402-hono` API surface against latest GOAT fork (`GOATNetwork/x402`).
- [ ] Confirm whether the GOATBot at the event hands out merchant credentials we need (`GOATX402_*`), or whether we should run with local-mode x402 only.

## Pending Decisions

- [ ] If credentials arrive: switch `X402_MODE` to `facilitator`. Otherwise stay `local`.
- [ ] Custom contract escrow (P14): only if all P00–P13 done by 16:00.

---

## Completion Pass (13:10)

2026-05-26 13:00  P01  done   Specialist x402 gate: `/work` returns 402 with `PaymentRequirement` body, verifies `X-PAYMENT` via on-chain receipt (or mock).
2026-05-26 13:00  P02  done   Writer x402 gate (mirror of P01).
2026-05-26 13:01  P05  done   Foreman dispatch: zero-config default registry; bid solicitation + ranking working.
2026-05-26 13:02  P06  done   `paidPost` 402 → on-chain USDC transfer (or fake hash in mock) → retry with X-PAYMENT.
2026-05-26 13:03  P07  done   `postFeedback` writes real `giveFeedback` on Reputation Registry in local mode; deterministic hash in mock.
2026-05-26 13:04  P08  done   SSE bus buffers events per jobId so subscribers attaching after job start still see early events.
2026-05-26 13:05  P09–P11 done  Dashboard already complete from scaffold pass; verified SSE proxy + job proxy work.
2026-05-26 13:08  shared    done  `@herd/shared/x402` (build402, decode/verify/encode payment), `@herd/shared/env` (loads root .env regardless of cwd), composite tsconfig refs removed.
2026-05-26 13:09  P12  done   E2E dry run in mock mode: brief → 2 subtasks → 2 paid /work calls → deliverable returned with full ledger + receipts.

**Runtime status (zero-config, mock mode):**
- `pnpm.cmd dev` boots foreman:3100, researcher:3101, writer:3102, dashboard:3000.
- POST http://localhost:3100/jobs returns a `jobId`; GET /jobs/:id/events streams 9 SSE events; GET /jobs/:id returns the final deliverable.
- Total spend reported: 0.13 USDC (0.05 researcher + 0.08 writer).
- `pnpm -r typecheck` is green across all 6 TS workspaces.

**To enable real chain (HERD-era):**
1. Add `OPENAI_API_KEY` to `.env`.
2. Add `FOREMAN_PRIVATE_KEY`, `RESEARCHER_PRIVATE_KEY`, `WRITER_PRIVATE_KEY` (funded with BTC + USDC on testnet3).
3. Set `X402_MODE=local`.
4. `pnpm register --all` to populate `*_AGENT_ID` and `*_WALLET_ADDRESS`.
5. Re-run `pnpm.cmd dev` — every payment is now a real USDC transfer, every feedback is a real Reputation Registry tx.

---

## Pivot Checkpoint — PaidProof (2026-05-26 ~15:00)

The repo now executes the **PaidProof** idea: AI-verified freelance escrow.
HERD's multi-agent infrastructure is preserved and rebranded:

| HERD (was)          | PaidProof (now)                                |
|---------------------|------------------------------------------------|
| `foreman`           | **Lead Verifier** (signs Escrow.submitVerdict) |
| `researcher`        | **FileSpec** (file type / dim / size)          |
| `writer`            | **ColorVision** (brand color match)            |
| (new)               | **AestheticJudge** (GPT-4o vision)             |
| external ERC-8004   | local **AgentRegistry.sol**                    |
| no escrow           | **Escrow.sol** (fund / deliver / submitVerdict)|

2026-05-26 14:35  pivot  Resolved package.json merge conflict (HERD TS workspaces + PaidProof hardhat scripts).
2026-05-26 14:40  pivot  Root deps installed: hardhat 2.22, concurrently, ethers, dotenv, rimraf.
2026-05-26 14:42  pivot  `shared/src/constants.ts` rewritten: SKILLS now verify.* family; added GOAT_MAINNET + HARDHAT_LOCAL chain specs, PAIDPROOF contract addrs, ESCROW_STATUS + AGENT_ROLES enums, DEFAULT_PRICES for the 3 specialists (0.02/0.03/0.05 USDC).
2026-05-26 14:45  pivot  `shared/src/types.ts` rewritten: Criterion (filespec | colorvision | aesthetic discriminated union), Verdict, AggregateVerdict, EscrowJob, full SwarmEvent rebuild (escrow.* + verdict.received events).
2026-05-26 14:48  pivot  `shared/src/abi.ts` rewritten: AGENT_REGISTRY_ABI + ESCROW_ABI added (mirror contracts/AgentRegistry.sol + Escrow.sol).
2026-05-26 14:50  pivot  `.env.example` rewritten for PaidProof env vars (CHAIN_TARGET, PAIDPROOF_*_ADDRESS, FOREMAN/CLIENT/FREELANCER keys, all 4 agent IDs).
2026-05-26 14:55  pivot  Lead Verifier (foreman) rewritten end-to-end: decompose.ts maps criteria→subtasks; dispatch.ts static-routes by skill; release.ts signs Escrow.submitVerdict; run.ts uses paidPost + submitVerdict + reputation flow; wallet.ts multi-chain (localhost/testnet3/mainnet) + escrow/registry/usdc address helpers; feedback.ts calls AgentRegistry.recordOutcome.
2026-05-26 15:00  pivot  FileSpec specialist (researcher) rewritten: deterministic PNG/JPEG header parsing (no native deps), data: + http(s) URL fetch, MIME magic-byte detection, returns Verdict.
2026-05-26 15:02  pivot  ColorVision specialist (writer) rewritten: GPT-4o vision color audit with deterministic fallback when no OPENAI_API_KEY.
2026-05-26 15:05  pivot  AestheticJudge agent CREATED (agents/aesthetic/): package + tsconfig + agent-card + index + skill (multimodal vision verdict with red-flag detection).
2026-05-26 15:08  pivot  Dashboard rebuilt as split-screen demo: page.tsx Client | Verifier | Freelancer columns, ClientPanel (Fund Escrow), FreelancerPanel (file drop + sample logo generator), VerifierPanel (4 agent cards live), SwarmTimeline updated for all new event types, TxToast tonal variants.
2026-05-26 15:12  pivot  New API routes: /api/escrow/fund + /api/escrow/deliver (mock-safe stubs returning synthesised tx hashes).
2026-05-26 15:15  pivot  Removed obsolete JobForm.tsx + AgentCard.tsx (replaced by the three new panel components).
2026-05-26 15:18  pivot  Typechecks green: shared, agents/foreman, agents/researcher, agents/writer, agents/aesthetic, apps/dashboard.

**Runtime status (mock mode, zero on-chain):**
- `npm run dev` boots verifier:3100, filespec:3101, colorvision:3102, aesthetic:3103, dashboard:3000.
- POST /api/escrow/fund returns `{ escrowJobId, txHash }` (synth).
- Drop a PNG in the FreelancerPanel → POST /api/jobs → Lead Verifier dispatches 3 paid specialists → aggregate verdict → mock `Escrow.submitVerdict` → `escrow.released` event with synth tx hash.

**To enable real chain (PaidProof):**
1. `npm run node:local` (terminal 1) — boots Hardhat node + auto-mines.
2. `npm run compile && npm run deploy:local` — writes `deployments/localhost.json` with `registry`, `escrow`, `usdc`.
3. `npm run register:local` — registers Lead Verifier, FileSpec, ColorVision, AestheticJudge, plus demo client + freelancer; writes `deployments/agents.json`.
4. Copy the relevant fields from `deployments/agents.json` into `.env` (`FOREMAN_PRIVATE_KEY`, `RESEARCHER_PRIVATE_KEY`, …, `PAIDPROOF_ESCROW_ADDRESS`, `PAIDPROOF_REGISTRY_ADDRESS`, `PAIDPROOF_USDC_ADDRESS`).
5. Set `CHAIN_TARGET=localhost` and `X402_MODE=local`.
6. `npm run dev` (terminal 2) — every payment is a real Hardhat tx; escrow.submitVerdict actually releases USDC to the freelancer.

For GOAT Testnet3, swap `:local` for `:goat` in steps 2-3 and set `CHAIN_TARGET=goat-testnet3`.
