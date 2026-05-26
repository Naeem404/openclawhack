/**
 * Reset the in-memory store to the seed cases.
 *
 *   npx tsx scripts/seed.ts
 */
import { caseStore } from "../lib/store/cases";
import { chainStore } from "../lib/store/chain";

caseStore.reset();
chainStore.reset();

console.log(
  `seeded ${caseStore.list().length} cases · wallet ${chainStore.getWallet().address}`,
);
