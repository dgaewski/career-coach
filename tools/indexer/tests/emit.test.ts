import { describe, it, expect, beforeEach } from "vitest";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { injectGapBlock, renderSkillCloud, renderFitRanking } from "../src/emit.js";
import type { SkillStats, GapEntry } from "../src/types.js";

const stats: SkillStats[] = [{
  slug: "ros2", name: "ROS 2", have: false, count: 2, share: 0.5, tier: "high-demand",
  byTrack: { robotics: 2 }, byGeo: {}, byLevel: {}, keywordCount: 0, trend: "rising",
}];
const gaps: GapEntry[] = [{ slug: "ros2", name: "ROS 2", count: 2, share: 0.5, trend: "rising", roi: 100, closedBy: ["Arm Migration"] }];

describe("renderSkillCloud", () => {
  it("renders ranked wikilinked rows with counts, tier, trend arrow", () => {
    const md = renderSkillCloud(stats, new Date("2026-06-11T00:00:00Z"));
    expect(md).toContain("[[ROS 2]]");
    expect(md).toContain("| 2 |");
    expect(md).toContain("↑");
    expect(md).toContain("generated:");
    expect(md).toContain("DO NOT EDIT");
  });
});

describe("injectGapBlock", () => {
  let file: string;
  beforeEach(async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "ccgap-"));
    file = path.join(dir, "Skill Gap Analysis.md");
    await writeFile(file, "# Skill Gap Analysis\n\n<!-- gap:begin -->\nold\n<!-- gap:end -->\n\n## Commentary\nKEEP ME\n", "utf8");
  });
  it("replaces only the marked block, preserving surrounding prose", async () => {
    await injectGapBlock(file, gaps);
    const raw = await readFile(file, "utf8");
    expect(raw).toContain("KEEP ME");
    expect(raw).not.toContain("old");
    expect(raw).toContain("[[ROS 2]]");
    expect(raw).toContain("100");
  });
  it("creates the file with markers if missing", async () => {
    const fresh = file.replace("Skill Gap", "Fresh Gap");
    await injectGapBlock(fresh, gaps);
    const raw = await readFile(fresh, "utf8");
    expect(raw).toContain("<!-- gap:begin -->");
    expect(raw).toContain("## Commentary");
  });
  it("throws when markers are inverted or missing", async () => {
    const bad = file.replace("Skill Gap", "Bad Gap");
    await writeFile(bad, "<!-- gap:end -->\nbackwards\n<!-- gap:begin -->\n", "utf8");
    await expect(injectGapBlock(bad, gaps)).rejects.toThrow();
  });
});

describe("renderFitRanking tie-breaker", () => {
  const now = new Date("2026-06-14T00:00:00Z");
  const mk = (name: string, score: number, fresh: "high" | "low", company: string) =>
    ({ name, fit: { score, tier: "good" as const, reasons: [], matched: 0 }, freshness: fresh, fm: { level: "early", company } });
  it("breaks equal scores by freshness then company", () => {
    const md = renderFitRanking(
      [mk("Stale Role", 90, "low", "Zeta"), mk("Fresh Role", 90, "high", "Acme")] as any, now);
    expect(md.indexOf("Fresh Role")).toBeLessThan(md.indexOf("Stale Role"));
  });
});
