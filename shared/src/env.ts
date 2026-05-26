/**
 * Loads the repo-root `.env` regardless of the cwd a workspace was launched
 * from. Each agent imports this once at the top of its entry point.
 */
import { config as dotenvConfig } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

let loaded = false;

export function loadRepoEnv(): void {
  if (loaded) return;
  loaded = true;
  // shared/src/env.ts is at <repo>/shared/src/, so go up 3 levels for the repo root.
  const here = dirname(fileURLToPath(import.meta.url));
  const repoRoot = resolve(here, "..", "..");
  dotenvConfig({ path: resolve(repoRoot, ".env") });
}

// Auto-load on import for "import '@herd/shared/env'" ergonomics.
loadRepoEnv();
