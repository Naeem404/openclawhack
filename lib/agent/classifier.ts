/**
 * Issue classifier — maps a free-form customer note + order + shipment state
 * into a structured IssueCategory + severity + confidence.
 *
 * Deterministic keyword model w/ shipment-state overrides. The architecture
 * supports swapping to an LLM by replacing `keywordScore`.
 */
import type {
  IssueCategory,
  Order,
  Severity,
  Shipment,
} from "@/lib/types";

const keywords: Record<IssueCategory, string[]> = {
  delayed_shipment: ["delayed", "late", "still hasn't", "not arrived", "behind", "stuck"],
  damaged_item: ["damaged", "broken", "cracked", "smashed", "torn", "ripped"],
  wrong_item: ["wrong", "incorrect", "different size", "different color", "not what i ordered"],
  missing_item: ["missing", "incomplete", "short", "didn't include"],
  never_delivered: ["never arrived", "never delivered", "lost", "stolen", "porch pirate"],
  defective: ["defective", "doesn't work", "broken on arrival", "won't turn on", "faulty"],
  billing_error: ["charged twice", "double charged", "wrong amount", "billing"],
  other: [],
};

function keywordScore(note: string, words: string[]): number {
  const lower = note.toLowerCase();
  let score = 0;
  for (const w of words) if (lower.includes(w)) score += 1;
  return score;
}

export function classifyIssue(
  note: string,
  order: Order,
  shipment: Shipment,
): {
  category: IssueCategory;
  severity: Severity;
  confidence: number;
  successProbability: number;
  reasoning: string;
} {
  // Shipment-state priors
  let category: IssueCategory = "other";
  let priorReason = "";
  if (shipment.status === "lost") {
    category = "never_delivered";
    priorReason = "carrier marked shipment as lost";
  } else if (shipment.status === "delayed") {
    category = "delayed_shipment";
    priorReason = "carrier reports delay";
  }

  // Override with keyword evidence if the note is strong enough
  let best = { cat: category, score: 0 };
  for (const cat of Object.keys(keywords) as IssueCategory[]) {
    const s = keywordScore(note, keywords[cat]);
    if (s > best.score) best = { cat, score: s };
  }
  if (best.score > 0) category = best.cat;

  // Severity heuristics
  let severity: Severity = "medium";
  if (category === "never_delivered" || category === "defective") severity = "high";
  if (order.amountUsd > 250) severity = severity === "high" ? "critical" : "high";
  if (order.amountUsd < 25 && severity !== "high") severity = "low";

  // Confidence: more keyword hits + clear shipment signal = higher
  const confidence = Math.min(
    0.97,
    0.55 + best.score * 0.08 + (priorReason ? 0.12 : 0),
  );

  // Success probability blends merchant friendliness (unknown here) + signal
  const successProbability =
    category === "delayed_shipment" ? 0.78
    : category === "damaged_item" ? 0.82
    : category === "never_delivered" ? 0.86
    : category === "defective" ? 0.74
    : category === "wrong_item" ? 0.81
    : category === "missing_item" ? 0.79
    : category === "billing_error" ? 0.88
    : 0.6;

  const reasoning = priorReason
    ? `Detected "${category}" from shipment signal (${priorReason}) and customer note.`
    : `Inferred "${category}" from customer language (${best.score} keyword match${best.score === 1 ? "" : "es"}).`;

  return { category, severity, confidence, successProbability, reasoning };
}
