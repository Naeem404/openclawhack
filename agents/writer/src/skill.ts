/**
 * Writer skill — turns research bullets + topic into a polished markdown brief.
 * Implements packet P02 skill body.
 */
import OpenAI from "openai";
import { WriteArtifactSchema, type WriteArtifact } from "@herd/shared/types";

const SystemPrompt = `You are a senior technical writer. Produce strictly JSON:
{ "markdown": string,    // a polished markdown brief
  "wordCount": number }  // count of words in markdown
Style: clear, factual, hyperlink sources inline using markdown [text](url) syntax
where appropriate. No filler, no marketing fluff.`;

export interface WriteSpec {
  topic: string;
  targetWords?: number;
  _inputs?: Record<string, unknown>;
}

interface ResearchInput {
  bullets?: string[];
  sources?: string[];
}

const Fallback = (topic: string, targetWords: number): WriteArtifact => {
  const md = `# ${topic}\n\nA brief on **${topic}**. Fallback mode active (no LLM available).\n\n- Point one.\n- Point two.\n- Point three.`;
  return { markdown: md, wordCount: md.split(/\s+/).filter(Boolean).length };
};

function extractResearchInputs(spec: WriteSpec): ResearchInput[] {
  const inputs = spec._inputs ?? {};
  const collected: ResearchInput[] = [];
  for (const value of Object.values(inputs)) {
    if (value && typeof value === "object" && "bullets" in value) {
      collected.push(value as ResearchInput);
    }
  }
  return collected;
}

export async function writeBrief(spec: WriteSpec): Promise<WriteArtifact> {
  const apiKey = process.env.OPENAI_API_KEY;
  const targetWords = spec.targetWords ?? 300;
  if (!apiKey) return Fallback(spec.topic, targetWords);

  const research = extractResearchInputs(spec);
  const bullets = research.flatMap((r) => r.bullets ?? []);
  const sources = research.flatMap((r) => r.sources ?? []);

  const userPrompt = [
    `Topic: ${spec.topic}`,
    `Target length: ~${targetWords} words.`,
    `Research bullets (from prior agent):`,
    ...bullets.map((b) => `- ${b}`),
    `Sources to reference:`,
    ...sources.map((s) => `- ${s}`),
  ].join("\n");

  const openai = new OpenAI({ apiKey });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SystemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
    });
    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = WriteArtifactSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      console.warn("[writer] invalid LLM output, falling back:", parsed.error.flatten());
      return Fallback(spec.topic, targetWords);
    }
    return parsed.data;
  } catch (err) {
    console.warn("[writer] write call failed:", err);
    return Fallback(spec.topic, targetWords);
  }
}
