import { describe, it, expect, beforeAll } from "vitest";
import { cp, mkdtemp, readFile, writeFile, access, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runIndexer } from "../src/index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureRoot = path.join(here, "fixtures", "wiki");
const NOW = new Date("2026-06-11T12:00:00Z");

describe("runIndexer (integration)", () => {
  let root: string;
  beforeAll(async () => {
    root = await mkdtemp(path.join(tmpdir(), "ccint-"));
    await cp(fixtureRoot, root, { recursive: true });
    await runIndexer(root, NOW);
  });

  it("emits all data files", async () => {
    for (const f of ["jobs.json", "skills.json", "companies.json", "gap.json", "map.json", "timeline.json", "meta.json", "errors.json"]) {
      await access(path.join(root, "data", f)); // throws if missing
    }
  });
  it("computes correct counts after staleness", async () => {
    const skills = JSON.parse(await readFile(path.join(root, "data", "skills.json"), "utf8"));
    const ros2 = skills.find((s: { slug: string }) => s.slug === "ros2");
    expect(ros2.count).toBe(1);                      // Acme only; Beta flipped stale; Gamma has unknown skill
    const meta = JSON.parse(await readFile(path.join(root, "data", "meta.json"), "utf8"));
    expect(meta.activeJobs).toBe(2);                 // Acme + Gamma (Beta stale)
    expect(meta.staleFlipped).toEqual(["Beta — Old Job.md"]);
    expect(meta.warnings.some((w: string) => w.includes("unknownskill"))).toBe(true);
  });
  it("writes analytics pages and the gap block, preserving commentary", async () => {
    const cloud = await readFile(path.join(root, "analytics", "Skill Cloud.md"), "utf8");
    expect(cloud).toContain("[[ROS 2]]");
    const gapPage = await readFile(path.join(root, "coach", "Skill Gap Analysis.md"), "utf8");
    expect(gapPage).toContain("Human prose that must survive regeneration.");
    expect(gapPage).toContain("[[ROS 2]]");
    expect(gapPage).toContain("[[Arm Migration]]");
  });
  it("records the malformed page in errors.json without failing the run", async () => {
    const errors = JSON.parse(await readFile(path.join(root, "data", "errors.json"), "utf8"));
    expect(errors).toHaveLength(1);
    expect(errors[0].file).toContain("Broken.md");
  });
  it("skips the gap-file write when content is unchanged (watcher loop guard)", async () => {
    const gapFile = path.join(root, "coach", "Skill Gap Analysis.md");
    const before = await stat(gapFile);
    await new Promise(r => setTimeout(r, 25));
    await runIndexer(root, NOW);                     // same inputs → same gap block
    const after = await stat(gapFile);
    expect(after.mtimeMs).toBe(before.mtimeMs);      // file not rewritten
  });
  it("emits stable ids and POSIX file paths in jobs.json", async () => {
    const jobs = JSON.parse(await readFile(path.join(root, "data", "jobs.json"), "utf8"));
    const acme = jobs.find((j: { name: string }) => j.name === "Acme — Robot Dev");
    expect(acme.id).toBe("acme-robot-dev");
    expect(acme.file).toBe("jobs/Acme — Robot Dev.md");   // forward slashes
  });
  it("emits the user vocab block into meta.json", async () => {
    const meta = JSON.parse(await readFile(path.join(root, "data", "meta.json"), "utf8"));
    expect(meta.user.name).toBe("Test User");
    expect(meta.user.tracks).toContain("robotics");
    expect(meta.user.geoZones.find((z: { slug: string }) => z.slug === "boston-metro")).toBeTruthy();
  });
});

describe("runIndexer with missing coach/ dir", () => {
  it("creates Skill Gap Analysis.md from scratch", async () => {
    const bare = await mkdtemp(path.join(tmpdir(), "ccbare-"));
    await cp(fixtureRoot, bare, { recursive: true });
    await rm(path.join(bare, "coach"), { recursive: true, force: true });
    await runIndexer(bare, NOW);
    const gap = await readFile(path.join(bare, "coach", "Skill Gap Analysis.md"), "utf8");
    expect(gap).toContain("<!-- gap:begin -->");
    expect(gap).toContain("## Commentary");
  });
});

describe("runIndexer rejects scalar track/skills", () => {
  let scalarRoot: string;
  beforeAll(async () => {
    scalarRoot = await mkdtemp(path.join(tmpdir(), "ccscalar-"));
    await cp(fixtureRoot, scalarRoot, { recursive: true });
    // Write a job page with scalar track and skills (should be arrays)
    const badJob = `---
type: job
title: Bad Arrays
company: Acme
location: Boston, MA
geo: boston-metro
track: robotics
level: early
url: https://acme.example/jobs/scalar
ingested: 2026-06-01
status: active
app-status: none
skills: python
created: 2026-06-01
updated: 2026-06-01
---
# Scalar — Bad Arrays
> Fixture with scalar track/skills.

## Fit notes
Should be rejected.
`;
    const { mkdir } = await import("node:fs/promises");
    await mkdir(path.join(scalarRoot, "jobs"), { recursive: true });
    await writeFile(path.join(scalarRoot, "jobs", "Scalar — Bad Arrays.md"), badJob, "utf8");
    await runIndexer(scalarRoot, NOW);
  });

  it("records the scalar page in errors.json mentioning array", async () => {
    const errors = JSON.parse(await readFile(path.join(scalarRoot, "data", "errors.json"), "utf8"));
    const entry = errors.find((e: { file: string; reason: string }) => e.file.includes("Scalar — Bad Arrays"));
    expect(entry).toBeDefined();
    expect(entry.reason).toMatch(/array/i);
  });

  it("excludes the scalar page from jobs.json", async () => {
    const jobs = JSON.parse(await readFile(path.join(scalarRoot, "data", "jobs.json"), "utf8"));
    const found = jobs.find((j: { name: string }) => j.name === "Scalar — Bad Arrays");
    expect(found).toBeUndefined();
  });
});

describe("runIndexer duplicate job ids", () => {
  it("suffixes colliding slugs and records a warning", async () => {
    const dup = await mkdtemp(path.join(tmpdir(), "ccdup-"));
    await cp(fixtureRoot, dup, { recursive: true });
    const src = await readFile(path.join(dup, "jobs", "Acme — Robot Dev.md"), "utf8");
    await writeFile(path.join(dup, "jobs", "Acme -- Robot Dev.md"), src, "utf8");
    await runIndexer(dup, NOW);
    const jobs = JSON.parse(await readFile(path.join(dup, "data", "jobs.json"), "utf8"));
    const ids = jobs.filter((j: { id: string }) => j.id.startsWith("acme-robot-dev")).map((j: { id: string }) => j.id).sort();
    expect(ids).toEqual(["acme-robot-dev", "acme-robot-dev-2"]);
    const meta = JSON.parse(await readFile(path.join(dup, "data", "meta.json"), "utf8"));
    expect(meta.warnings.some((w: string) => w.includes("duplicate job id"))).toBe(true);
  });
});
