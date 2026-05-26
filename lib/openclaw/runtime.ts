/**
 * OpenClaw runtime adapter.
 *
 * The real OpenClaw framework provides:
 *   - Skill registry  (~/.openclaw/workspace/skills/*)
 *   - Channel routing (Telegram / Slack / web chat)
 *   - Pairing layer (`openclaw pairing approve …`)
 *
 * For RefundRex we ship a programmatic shim that:
 *   1. Mirrors the SKILL.md surface so the same code runs locally and inside
 *      a ClawUp-deployed agent.
 *   2. Exposes a `dispatch()` entrypoint the orchestrator uses to invoke
 *      named skills with structured input.
 *
 * Swap `runtime` for an actual OpenClaw client (e.g. via stdio bridge) when
 * deploying behind ClawUp — the rest of the agent code is untouched.
 */
import { log } from "@/lib/store/events";

export interface SkillContext {
  caseId?: string;
  emit: (level: "info" | "warn" | "error" | "success" | "think", msg: string) => void;
}

export type SkillHandler<I = unknown, O = unknown> = (
  input: I,
  ctx: SkillContext,
) => Promise<O>;

export interface SkillDefinition<I = unknown, O = unknown> {
  name: string;
  description: string;
  version: string;
  handler: SkillHandler<I, O>;
}

class OpenClawRuntime {
  private skills = new Map<string, SkillDefinition>();

  register<I, O>(skill: SkillDefinition<I, O>) {
    this.skills.set(skill.name, skill as SkillDefinition);
    log("openclaw", "info", `🧩  Registered skill "${skill.name}" v${skill.version}`);
  }

  list() {
    return [...this.skills.values()].map((s) => ({
      name: s.name,
      description: s.description,
      version: s.version,
    }));
  }

  async dispatch<I, O>(name: string, input: I, caseId?: string): Promise<O> {
    const skill = this.skills.get(name) as SkillDefinition<I, O> | undefined;
    if (!skill) throw new Error(`Unknown skill: ${name}`);
    const ctx: SkillContext = {
      caseId,
      emit: (level, msg) => log(`skill:${name}`, level, msg, caseId),
    };
    ctx.emit("think", `▶  invoking ${name}`);
    const t0 = Date.now();
    try {
      const out = await skill.handler(input, ctx);
      ctx.emit("success", `✓  ${name} completed (${Date.now() - t0}ms)`);
      return out;
    } catch (e) {
      ctx.emit("error", `✗  ${name} failed: ${(e as Error).message}`);
      throw e;
    }
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __refundrex_openclaw: OpenClawRuntime | undefined;
}

export const runtime: OpenClawRuntime =
  globalThis.__refundrex_openclaw ??
  (globalThis.__refundrex_openclaw = new OpenClawRuntime());
