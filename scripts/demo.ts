/**
 * Headless demo runner. Useful for showing on-stage without the UI.
 *   npx tsx scripts/demo.ts damaged-headphones
 */
import { demoRunner } from "../lib/demo/runner";
import { events } from "../lib/store/events";

const slug = process.argv[2] ?? "damaged-headphones";

events.subscribe((line) => {
  const ts = new Date(line.ts).toLocaleTimeString("en-US", {
    hour12: false,
    second: "2-digit",
    minute: "2-digit",
  });
  const colorByLevel: Record<typeof line.level, string> = {
    info: "\x1b[37m",
    warn: "\x1b[33m",
    error: "\x1b[31m",
    success: "\x1b[32m",
    think: "\x1b[36m",
  };
  const reset = "\x1b[0m";
  console.log(
    `${ts} ${colorByLevel[line.level]}[${line.level.padEnd(7)}]${reset} [${line.source}] ${line.message}`,
  );
});

demoRunner.run(slug).then((c) => {
  console.log("\n────────────  CASE COMPLETE  ────────────");
  console.log(`status:     ${c.status}`);
  console.log(`resolution: ${c.resolution}`);
  console.log(`recovered:  $${c.recoveredAmountUsd.toFixed(2)}`);
  console.log(`fee:        $${c.feeUsd.toFixed(2)}`);
  console.log(`tx hashes:  ${c.txHashes.length}`);
  process.exit(0);
});
