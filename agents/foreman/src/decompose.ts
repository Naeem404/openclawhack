/**
 * Brief → Subtask plan via LLM.
 * Implements packet P04.
 */
import OpenAI from "openai";
import { z } from "zod";
import { SubtaskSchema, type Subtask, SKILLS } from "@herd/shared/types";

const PromptTemplate = (brief: string, budgetUsdc: string): string => `
You are a project foreman. Decompose the user's brief into the SMALLEST ordered
list of subtasks needed to deliver it. Use only these skill types:
  - ${SKILLS.RESEARCH_WEB}   : gather sourced bullet points from the web
  - ${SKILLS.WRITE_BRIEF}    : write a markdown brief from supplied bullets

Return strictly JSON: { "subtasks": [{ "id", "skill", "spec", "dependsOn" }] }
- id: short kebab-case
- skill: one of the listed types
- spec: object passed verbatim to the specialist
- dependsOn: array of earlier subtask ids whose artifacts feed this one's spec

Keep the plan to at most 3 subtasks. Budget hint: $${budgetUsdc}.
Brief: """${brief}"""
`;

const PlanSchema = z.object({ subtasks: z.array(SubtaskSchema).min(1).max(3) });

const FallbackPlan = (brief: string, _budgetUsdc: string): Subtask[] => [
  {
    id: "research-1",
    skill: SKILLS.RESEARCH_WEB,
    spec: { topic: brief, sources: 3 },
    dependsOn: [],
  },
  {
    id: "write-1",
    skill: SKILLS.WRITE_BRIEF,
    spec: { topic: brief, targetWords: 300 },
    dependsOn: ["research-1"],
  },
];

export async function decompose(brief: string, budgetUsdc: string): Promise<Subtask[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("[foreman] OPENAI_API_KEY missing; using fallback plan");
    return FallbackPlan(brief, budgetUsdc);
  }

  const openai = new OpenAI({ apiKey });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const completion = await openai.chat.completions.create(
      {
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: PromptTemplate(brief, budgetUsdc) }],
        temperature: 0.1,
      },
      { signal: controller.signal },
    );

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = PlanSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      console.warn("[foreman] LLM returned invalid plan; using fallback", parsed.error.flatten());
      return FallbackPlan(brief, budgetUsdc);
    }
    return parsed.data.subtasks;
  } catch (err) {
    console.warn("[foreman] decompose failed:", err);
    return FallbackPlan(brief, budgetUsdc);
  } finally {
    clearTimeout(timeout);
  }
}
