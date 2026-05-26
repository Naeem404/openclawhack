/**
 * Criteria → Subtask plan.
 *
 * Each verification job carries a list of `Criterion` objects (FileSpec / ColorVision
 * / Aesthetic). The Lead Verifier produces exactly one subtask per criterion bucket,
 * routed to the correct specialist via its skill id. No LLM call needed — the
 * mapping is deterministic and that's a feature (the agent's decisions are
 * inspectable on-chain).
 */
import type { Criterion, Subtask } from "@herd/shared/types";
import { SKILLS } from "@herd/shared/constants";

interface DecomposeInput {
  escrowJobId: string;
  deliverableUrl: string;
  deliverableHash?: string;
  criteria: Criterion[];
}

function skillFor(criterion: Criterion): string {
  switch (criterion.kind) {
    case "filespec":     return SKILLS.VERIFY_FILESPEC;
    case "colorvision":  return SKILLS.VERIFY_COLORVISION;
    case "aesthetic":    return SKILLS.VERIFY_AESTHETIC;
  }
}

/**
 * Build one subtask per criterion. Order is preserved so the dashboard
 * timeline reads top-to-bottom in the order the human wrote them.
 */
export async function decompose(input: DecomposeInput): Promise<Subtask[]> {
  return input.criteria.map((criterion, i) => ({
    id: `${criterion.kind}-${i + 1}`,
    skill: skillFor(criterion),
    spec: {
      criterion,
      deliverableUrl: input.deliverableUrl,
      deliverableHash: input.deliverableHash,
      escrowJobId: input.escrowJobId,
    },
    dependsOn: [],
  }));
}
