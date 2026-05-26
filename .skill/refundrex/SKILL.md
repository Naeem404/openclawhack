# refundrex — OpenClaw skill

`refundrex` is a reusable OpenClaw skill that wires this repo into any
ClawUp-deployed agent. Drop the folder into your agent's workspace under
`~/.openclaw/workspace/skills/refundrex/` and register it.

## Capabilities

| Skill (programmatic name) | Description |
| --- | --- |
| `track_shipment` | Pulls latest carrier status. |
| `classify_issue` | Maps a customer note + order + shipment → IssueCategory + severity + confidence. |
| `draft_support_email` | Tone-aware email drafting; auto-escalates tone on retries. |
| `send_support_email` | Outbound email to merchant support, stores thread. |
| `agent_to_agent` | POSTs a signed dispute payload to a merchant agent endpoint. |
| `parse_merchant_reply` | Parses merchant reply for decision + amount. |
| `erc8004_register` | Registers the agent on GOAT Mainnet ERC-8004. |
| `x402_settle` | Captures an x402 payment for a resolved dispute. |
| `wallet_report` | Read-only AgentKit wallet activity report. |

## Wiring into ClawUp

1. Pair your agent through the Telegram bot per the hackathon onboarding guide.
2. Send `/skill_creator` to your clawbot.
3. Point it at this repo as context — it will copy the `refundrex` skill
   folder into `~/.openclaw/workspace/skills/`.
4. Confirm the skill is listed via `/list_skills`.

## Local development

This skill is the same code that drives the Next.js dashboard. To exercise
it from a script:

```bash
npx tsx scripts/demo.ts damaged-headphones
```
