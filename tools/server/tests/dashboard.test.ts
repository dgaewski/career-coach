import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { dashboardState } from "../src/dashboard.js";

// Build a throwaway wiki root with a tools/dashboard source tree.
function scaffold(): { root: string; dash: string } {
  const root = mkdtempSync(path.join(tmpdir(), "cc-dash-"));
  const dash = path.join(root, "tools", "dashboard");
  mkdirSync(path.join(dash, "src"), { recursive: true });
  writeFileSync(path.join(dash, "index.html"), "<html>");
  writeFileSync(path.join(dash, "src", "main.tsx"), "x");
  return { root, dash };
}
const touch = (p: string, sec: number) => utimesSync(p, sec, sec);

function buildBundle(dash: string): string {
  mkdirSync(path.join(dash, "dist"));
  const built = path.join(dash, "dist", "index.html");
  writeFileSync(built, "built");
  return built;
}

describe("dashboardState", () => {
  it("reports missing when no dist bundle exists", () => {
    const { root } = scaffold();
    expect(dashboardState(root)).toBe("missing");
  });

  it("reports stale when any source file is newer than the built bundle", () => {
    const { root, dash } = scaffold();
    const built = buildBundle(dash);
    touch(built, 1000);
    touch(path.join(dash, "index.html"), 1500);
    touch(path.join(dash, "src", "main.tsx"), 2000); // edited after the build
    expect(dashboardState(root)).toBe("stale");
  });

  it("reports fresh when the bundle is newer than all source", () => {
    const { root, dash } = scaffold();
    const built = buildBundle(dash);
    touch(path.join(dash, "index.html"), 1000);
    touch(path.join(dash, "src", "main.tsx"), 1000);
    touch(built, 2000);
    expect(dashboardState(root)).toBe("fresh");
  });

  it("ignores the tests/ dir so a test edit alone doesn't force a rebuild", () => {
    const { root, dash } = scaffold();
    const built = buildBundle(dash);
    touch(path.join(dash, "index.html"), 1000);
    touch(path.join(dash, "src", "main.tsx"), 1000);
    touch(built, 2000);
    mkdirSync(path.join(dash, "tests"));
    const testFile = path.join(dash, "tests", "foo.test.ts");
    writeFileSync(testFile, "t");
    touch(testFile, 3000); // newer than the bundle, but must not count
    expect(dashboardState(root)).toBe("fresh");
  });
});
