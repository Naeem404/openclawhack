/**
 * Research skill — produces sourced bullet points from a topic.
 * Implements packet P01 skill body.
 */
import OpenAI from "openai";
import { ResearchArtifactSchema, type ResearchArtifact } from "@herd/shared/types";

const SystemPrompt = `You are a precise research analyst. Return strictly JSON matching:
{ "bullets": string[],   // 3-5 short factual bullets, each 1 sentence
  "sources": string[] }  // 2-3 source URLs supporting the bullets
Bullets must be sourced; if uncertain, omit. Do not invent URLs.`;

export interface ResearchSpec {
  topic: string;
  sources?: number;
  _inputs?: Record<string, unknown>;
}

const FallbackArtifact = (topic: string): ResearchArtifact => ({
  bullets: [
    `${topic}: high-level overview placeholder — LLM unavailable.`,
    `${topic}: trade-offs typically involve security, latency, and cost.`,
    `${topic}: research production halted in fallback mode.`,
  ],
  sources: ["https://docs.goat.network/"],
});

export async function performResearch(spec: ResearchSpec): Promise<ResearchArtifact> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return FallbackArtifact(spec.topic);

  const openai = new OpenAI({ apiKey });
  const userPrompt = `Topic: ${spec.topic}\nDesired source count: ${spec.sources ?? 3}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SystemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
    });
    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = ResearchArtifactSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      console.warn("[researcher] invalid LLM output, falling back:", parsed.error.flatten());
      return FallbackArtifact(spec.topic);
    }
    return parsed.data;
  } catch (err) {
    console.warn("[researcher] research call failed:", err);
    return FallbackArtifact(spec.topic);
  }
}
