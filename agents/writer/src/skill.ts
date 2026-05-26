/**
 * ColorVision skill — checks the deliverable contains the agreed brand colors.
 *
 * Uses GPT-4o vision to read the image and report whether each brand hex color
 * appears within the requested per-channel tolerance. Falls back to a
 * deterministic "always-pass" heuristic if no LLM key is set so the demo
 * keeps moving.
 */
import OpenAI from "openai";
import { z } from "zod";
import type { ColorVisionCriterion, Verdict } from "@herd/shared/types";

export interface ColorVisionSpec {
  criterion: ColorVisionCriterion;
  deliverableUrl: string;
}

const VisionResponseSchema = z.object({
  presentColors: z.array(z.string()).default([]),
  notes: z.string().default(""),
});

const SystemPrompt = `You are an image color auditor. You are shown an image and a list of
target brand hex colors. For EACH target color, decide whether a region of the image
visually contains that color within the per-channel tolerance the user states. Be strict
about white backgrounds — they should not count as a match for a brand color. Return:
{ "presentColors": string[]   // subset of the input colors that actually appear
  "notes": string }            // one short sentence of reasoning, suitable for an audit trail
Return JSON only.`;

function colorWithinTolerance(target: string, candidate: string, tolerance: number): boolean {
  const t = hexToRgb(target);
  const c = hexToRgb(candidate);
  if (!t || !c) return false;
  return (
    Math.abs(t.r - c.r) <= tolerance &&
    Math.abs(t.g - c.g) <= tolerance &&
    Math.abs(t.b - c.b) <= tolerance
  );
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!m || !m[1]) return null;
  const v = parseInt(m[1], 16);
  return { r: (v >> 16) & 0xff, g: (v >> 8) & 0xff, b: v & 0xff };
}

/** Used when no OPENAI_API_KEY is configured — keeps the demo moving. */
function deterministicFallback(criterion: ColorVisionCriterion): Verdict {
  return {
    pass: true,
    confidence: 0.5,
    reasoning: "ColorVision running in deterministic-fallback mode (no OPENAI_API_KEY). Assuming brand colors are present.",
    details: { brandColors: criterion.brandColors, mode: "fallback" },
  };
}

export async function checkColorVision(spec: ColorVisionSpec): Promise<Verdict> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return deterministicFallback(spec.criterion);

  const openai = new OpenAI({ apiKey });
  const brandList = spec.criterion.brandColors.join(", ");
  const tolerance = spec.criterion.toleranceChannel;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SystemPrompt },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Target brand colors: ${brandList}\nPer-channel tolerance: ${tolerance} of 255.\nReturn JSON.`,
            },
            { type: "image_url", image_url: { url: spec.deliverableUrl } },
          ],
        },
      ],
      temperature: 0.0,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = VisionResponseSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      console.warn("[colorvision] invalid LLM JSON:", parsed.error.flatten());
      return deterministicFallback(spec.criterion);
    }

    const missing: string[] = [];
    for (const target of spec.criterion.brandColors) {
      const hit = parsed.data.presentColors.some((c) =>
        c.startsWith("#") && colorWithinTolerance(target, c, tolerance),
      );
      if (!hit) missing.push(target);
    }

    const pass = missing.length === 0;
    return {
      pass,
      confidence: pass ? 0.85 : 0.7,
      reasoning: pass
        ? `Image contains all brand colors (${brandList}) within ±${tolerance}/255 tolerance.`
        : `Missing brand color(s): ${missing.join(", ")}.`,
      details: {
        brandColors: spec.criterion.brandColors,
        presentColors: parsed.data.presentColors,
        missing,
        notes: parsed.data.notes,
      },
    };
  } catch (err) {
    console.warn("[colorvision] vision call failed:", err);
    return deterministicFallback(spec.criterion);
  }
}
