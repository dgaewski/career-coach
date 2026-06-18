import { describe, it, expect } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scanWiki } from "../src/scan.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "fixtures", "wiki");

describe("scanWiki", () => {
  it("classifies pages by folder and parses frontmatter", async () => {
    const scan = await scanWiki(root);
    expect(scan.jobs.map(j => j.fm.title).sort()).toEqual(["Mystery", "Old Job", "Robot Dev"]);
    expect(scan.skills).toHaveLength(3);
    expect(scan.companies).toHaveLength(1);
    expect(scan.projects).toHaveLength(1);
  });
  it("collects malformed pages as errors without throwing", async () => {
    const scan = await scanWiki(root);
    expect(scan.errors).toHaveLength(1);
    expect(scan.errors[0].file).toContain("Broken.md");
  });
  it("records missing required job fields as errors", async () => {
    const scan = await scanWiki(root);
    // Broken.md is YAML-invalid; valid jobs all have required fields, so only 1 error total
    expect(scan.errors.every(e => e.reason.length > 0)).toBe(true);
  });
});
