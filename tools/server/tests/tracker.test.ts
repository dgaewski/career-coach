import { describe, it, expect, beforeEach } from "vitest";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { applyAppStatus, appendNote } from "../src/tracker.js";
import { makeTempWiki, NOW } from "./helpers.js";

let root: string;
let jobFile: string;
beforeEach(async () => {
  root = await makeTempWiki();
  jobFile = path.join(root, "jobs", "Acme — Robot Dev.md");
});

describe("applyAppStatus", () => {
  it("updates app-status, app-updated, and appends to app-history", async () => {
    await applyAppStatus(jobFile, "interview", NOW);
    const raw = await readFile(jobFile, "utf8");
    expect(raw).toMatch(/^app-status: interview$/m);
    expect(raw).toMatch(/^app-updated: 2026-06-11$/m);
    // Fixture has two existing entries; new one appended as third
    expect(raw).toContain('"2026-06-02 interested", "2026-06-05 applied", "2026-06-11 interview"');
    expect(raw).toContain("## Fit notes");            // body untouched
  });
  it("writes rejection fields only with rejected status", async () => {
    await applyAppStatus(jobFile, "rejected", NOW, { stage: "screening", reason: "ATS filter" });
    const raw = await readFile(jobFile, "utf8");
    expect(raw).toMatch(/^rejection-stage: screening$/m);
    expect(raw).toMatch(/^rejection-reason: "ATS filter"$/m);
  });
  it("rejects invalid status and invalid stage", async () => {
    await expect(applyAppStatus(jobFile, "ghosted", NOW)).rejects.toThrow(/invalid status/);
    await expect(applyAppStatus(jobFile, "rejected", NOW, { stage: "vibes" })).rejects.toThrow(/invalid stage/);
  });
  it("populates an empty app-history array", async () => {
    const gamma = path.join(root, "jobs", "Gamma — Mystery.md");   // app-history: []
    await applyAppStatus(gamma, "interested", NOW);
    const raw = await readFile(gamma, "utf8");
    expect(raw).toContain('app-history: ["2026-06-11 interested"]');
  });
  it("refuses to mutate pages missing app-status or with block-style app-history", async () => {
    const raw = await readFile(jobFile, "utf8");
    await writeFile(jobFile, raw.replace(/^app-status:.*$\n/m, ""), "utf8");
    await expect(applyAppStatus(jobFile, "applied", NOW)).rejects.toThrow(/app-status key missing/);

    const blockStyle = raw.replace(
      /^app-history: \[.*\]$/m,
      'app-history:\n  - "2026-06-05 applied"',
    );
    await writeFile(jobFile, blockStyle, "utf8");
    await expect(applyAppStatus(jobFile, "applied", NOW)).rejects.toThrow(/not a flow-style array/);
    expect(await readFile(jobFile, "utf8")).toBe(blockStyle); // untouched on refusal
  });
  it("sanitizes double quotes in rejection-reason", async () => {
    await applyAppStatus(jobFile, "rejected", NOW, { stage: "phone", reason: 'said "no thanks"' });
    const raw = await readFile(jobFile, "utf8");
    expect(raw).toMatch(/^rejection-reason: "said 'no thanks'"$/m);
  });
});

describe("appendNote", () => {
  it("appends a dated bullet under ## Notes, creating the section if missing", async () => {
    await appendNote(jobFile, "Spoke to recruiter", NOW);
    const raw = await readFile(jobFile, "utf8");
    expect(raw).toContain("## Notes");
    expect(raw).toContain("- 2026-06-11: Spoke to recruiter");
  });
  it("appends inside the section when another section follows", async () => {
    const raw = await readFile(jobFile, "utf8");
    await writeFile(jobFile, raw.trimEnd() + "\n\n## Notes\n- 2026-06-01: Old note\n\n## Postmortem\nKeep me.\n", "utf8");
    await appendNote(jobFile, "New note", NOW);
    const after = await readFile(jobFile, "utf8");
    expect(after).toContain("- 2026-06-01: Old note\n- 2026-06-11: New note\n\n## Postmortem\nKeep me.");
  });
  it("keeps multiple notes in chronological order", async () => {
    await appendNote(jobFile, "First note", NOW);
    await appendNote(jobFile, "Second note", new Date("2026-06-12T12:00:00Z"));
    const raw = await readFile(jobFile, "utf8");
    expect(raw.indexOf("First note")).toBeLessThan(raw.indexOf("Second note"));
    expect(raw).toContain("- 2026-06-12: Second note");
  });
  it("rejects empty notes", async () => {
    await expect(appendNote(jobFile, "   ", NOW)).rejects.toThrow(/empty/);
  });
  it("rejects notes over 2000 characters", async () => {
    await expect(appendNote(jobFile, "x".repeat(2001), NOW)).rejects.toThrow(/too long/);
  });
});
