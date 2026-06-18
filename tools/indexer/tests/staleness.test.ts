import { describe, it, expect, beforeEach } from "vitest";
import { cp, readFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scanWiki } from "../src/scan.js";
import { applyStaleness } from "../src/staleness.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureRoot = path.join(here, "fixtures", "wiki");
const NOW = new Date("2026-06-11T12:00:00Z");

describe("applyStaleness", () => {
  let root: string;
  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "ccwiki-"));
    await cp(fixtureRoot, root, { recursive: true });
  });

  it("flips active jobs older than the window to stale, in-place", async () => {
    const scan = await scanWiki(root);
    const flipped = await applyStaleness(scan.jobs, NOW, 45);
    expect(flipped.map(f => path.basename(f))).toEqual(["Beta — Old Job.md"]);
    const raw = await readFile(path.join(root, "jobs", "Beta — Old Job.md"), "utf8");
    expect(raw).toContain("status: stale");
    expect(raw).not.toContain("status: active");
    expect(raw).toContain("## Fit notes"); // body untouched
  });

  it("does not touch fresh or already-stale jobs", async () => {
    const scan = await scanWiki(root);
    await applyStaleness(scan.jobs, NOW, 45);
    const acme = await readFile(path.join(root, "jobs", "Acme — Robot Dev.md"), "utf8");
    expect(acme).toContain("status: active");
  });
});
