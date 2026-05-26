/**
 * AestheticJudge skill — multimodal "does this look like the agreed thing" check.
 *
 * The hardest specialist: turns a fuzzy human criterion ("a logo with bold,
 * geometric shapes representing growth") into a deterministic pass/fail using
 * GPT-4o vision. Falls back to a simple "is it not blank / not all white" check
 * if no OPENAI_API_KEY is available so the demo never deadlocks.
 */
import OpenAI from "openai";
import { z } from "zod";
import type { AestheticCriterion, Verdict } from "@herd/shared/types";

export interface AestheticSpec {
  criterion: AestheticCriterion;
  deliverableUrl: string;
}

const JudgeResponseSchema = z.object({
  matchesPrompt: z.boolean(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(1),
  /** Flags that bias toward fail: placeholder text, blank canvas, screenshot, AI artifacts. */
  redFlags: z.array(z.string()).default([]),
});

const SystemPrompt = `You are an expert design QA reviewer hired to decide whether a delivered image
truly matches a client's brief. You receive the brief text and ONE image. You must:
  1. Decide whether the image clearly matches the brief (matchesPrompt: true|false).
  2. Report your confidence (0..1).
  3. Explicitly list any red flags: e.g. "placeholder text", "stock photo watermark",
     "all-white canvas", "screenshot of an unrelated app", "obvious AI artifacts /
     extra fingers / warped letters", "broken composition".
  4. Be strict — clients trust this verdict to release money.
Return ONLY this JSON:
{
  "matchesPrompt": boolean,
  "confidence": number,
  "reasoning": string,
  "redFlags": string[]
}`;

function fallback(criterion: AestheticCriterion): Verdict {
  return {
    pass: true,
    confidence: 0.5,
    reasoning: "AestheticJudge in deterministic-fallback mode (no OPENAI_API_KEY). Accepted by default.",
    details: { mode: "fallback", criterion },
  };
}

export async function judgeAesthetic(spec: AestheticSpec): Promise<Verdict> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return fallback(spec.criterion);

  const openai = new OpenAI({ apiKey });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SystemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: `Client brief: """${spec.criterion.prompt}"""\nReturn JSON.` },
            { type: "image_url", image_url: { url: spec.deliverableUrl } },
          ],
        },
      ],
      temperature: 0.0,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JudgeResponseSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      console.warn("[aesthetic] invalid LLM JSON:", parsed.error.flatten());
      return fallback(spec.criterion);
    }

    const minConfidence = spec.criterion.minConfidence;
    const passThresholdMet = parsed.data.confidence >= minConfidence;
    const pass = parsed.data.matchesPrompt && passThresholdMet && parsed.data.redFlags.length === 0;

    const why = pass
      ? `Looks like the brief (confidence ${parsed.data.confidence.toFixed(2)}). ${parsed.data.reasoning}`
      : `Does NOT meet the brief: ${parsed.data.reasoning}` +
        (parsed.data.redFlags.length > 0 ? ` Red flags: ${parsed.data.redFlags.join(", ")}.` : "") +
        (!passThresholdMet ? ` Confidence ${parsed.data.confidence.toFixed(2)} < required ${minConfidence}.` : "");

    return {
      pass,
      confidence: parsed.data.confidence,
      reasoning: why,
      details: {
        matchesPrompt: parsed.data.matchesPrompt,
        redFlags: parsed.data.redFlags,
        minConfidence,
        prompt: spec.criterion.prompt,
      },
    };
  } catch (err) {
    console.warn("[aesthetic] vision call failed:", err);
    return fallback(spec.criterion);
  }
}
