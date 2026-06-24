import { execSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

// Source subdirs that never end up in the built bundle — skip them so a test
// edit or a stale node_modules timestamp doesn't trigger a spurious rebuild.
const SKIP = new Set(["dist", "node_modules", "tests"]);

/** Newest mtime (ms) among the dashboard's *source* files, 0 if none. */
function newestSourceMtime(dir: string): number {
  let newest = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    newest = Math.max(newest, entry.isDirectory() ? newestSourceMtime(full) : statSync(full).mtimeMs);
  }
  return newest;
}

export type DashboardState = "fresh" | "stale" | "missing";

/**
 * Is the built bundle (`tools/dashboard/dist/index.html`) absent or older than
 * any dashboard source file? A stale bundle reads freshly-indexed `data/` whose
 * shape may have changed and crashes the UI, so the server self-heals on boot.
 */
export function dashboardState(root: string): DashboardState {
  const srcDir = path.join(root, "tools", "dashboard");
  const built = path.join(srcDir, "dist", "index.html");
  if (!existsSync(built)) return "missing";
  return newestSourceMtime(srcDir) > statSync(built).mtimeMs ? "stale" : "fresh";
}

/** Build the dashboard bundle (synchronous; throws on failure). */
export function buildDashboard(root: string): void {
  execSync("npm run dash:build", { cwd: path.join(root, "tools"), stdio: "inherit" });
}
