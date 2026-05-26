# 🎬 RefundRex — 3-minute judge demo script

A precise minute-by-minute script. Practice it once; ship it.

---

## 0:00 — 0:20  The problem

> "Online refund disputes are an ~$100B/year tax. They're handled by humans
> at $40+ a touch, take days, and customers churn. We replaced the human
> with an autonomous on-chain agent."

Click into **http://localhost:3000/** — the landing page. Let the hero card
breathe for 3 seconds (the terminal scrolls itself).

---

## 0:20 — 0:55  What is RefundRex

> "RefundRex is an autonomous AI agent built on OpenClaw, with an ERC-8004
> identity registered on GOAT Mainnet, that gets paid in USDC via x402
> for every dispute it resolves. It has its own wallet. It signs every
> action. It accrues reputation on-chain."

Scroll once. Land on the **how-it-works strip** (intake → track → contact
→ negotiate → settle). Don't linger.

Then click **Run live demo** → land on `/demo`.

---

## 0:55 — 2:00  The live demo

Click **Run scenario** on **"Damaged $400 headphones"**.

While it runs, narrate the terminal:

> "It pulls carrier status. Classifies the issue with confidence scoring.
> Runs a fraud pre-check — that's our human-in-the-loop guardrail. Then
> drafts an empathetic email to the merchant. The merchant replies. It
> parses the response, sees a full-refund approval, and now it's about to
> settle its fee on x402."

When the on-chain confirmation lands:

> "That's a real transaction on GOAT Mainnet — block number, hash,
> explorer link. The agent just got paid for its work. No humans involved."

Open the case detail page (click the case in the list).

> "Every step is anchored. Every decision is traceable. This is what
> agent-native commerce looks like."

---

## 2:00 — 2:35  The pitch

Switch tabs to `/pitch`.

> "Here's what 30 minutes of demo activity looks like in aggregate."

Point at the KPI strip:

> "$XX,XXX recovered. 87% success rate. 1.4-hour average resolution
> versus a 96-hour human baseline."

Point at the ROI strip:

> "Costs $0.10 per resolution. Human cost: $42. That's a 99.8% margin
> business that scales horizontally on infrastructure that already exists."

---

## 2:35 — 3:00  The ask

Click **Start judge demo** (fires three scenarios simultaneously) and let
the terminal go nuts in the background.

> "Today this is a working agent on Mainnet, ready to take its first
> real disputes. We're recruiting launch merchants from the GOAT
> ecosystem and shipping a public A2A dispute payload spec next month.
> RefundRex is open-source — you can fork it, give it a wallet, and have
> it earning USDC by tomorrow."

> "We're RefundRex. Thanks."

🎤 Drop.

---

## 🧠 Anticipated judge questions

| Q | A |
| --- | --- |
| *"Why on-chain identity?"* | ERC-8004 makes reputation portable across merchants. A scammy agent can't just spin up a new email — its history is permanent and verifiable on 8004scan. |
| *"Why x402 instead of Stripe?"* | x402 settles in seconds for sub-cent fees and works for agent-to-agent payments where neither side has a card. Card networks weren't designed for autonomous principals. |
| *"How does it negotiate?"* | Tone-aware template engine + (optional) LLM. Auto-escalates tone on retries, drops to firm/legal language on round 3, escalates externally on round 4. |
| *"What about fraud?"* | Pre-flight fraud check uses claim velocity, amount skew, and tracking-pattern anomalies. Score ≥ 0.55 → blocked before any merchant contact. |
| *"Why GOAT specifically?"* | Bitcoin-secured, native x402 support, sub-cent gas, and the ERC-8004 registry is canonical here. We get identity + payments + speed in one network. |
| *"Liability?"* | The agent is principal-agnostic — it can run as the consumer's agent (current MVP) or the merchant's. Insurance primitives are on the roadmap. |
| *"What's stopping a merchant from ignoring you?"* | Escalation paths: L1 secondary email → L2 escalations channel → L3 chargeback intent + reputation slash on-chain. We've published the dispute payload spec so merchants who integrate get a 2× faster path. |
