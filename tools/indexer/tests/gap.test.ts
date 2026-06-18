import { describe, it, expect } from "vitest";
import { computeGap } from "../src/gap.js";
import type { SkillStats, Doc, ProjectFM } from "../src/types.js";

function stat(slug: string, have: boolean, count: number, share: number, trend: "rising" | "stable" | "declining"): SkillStats {
  return { slug, name: slug, have, count, share, tier: "common", byTrack: {}, byGeo: {}, byLevel: {}, keywordCount: 0, trend };
}
const projects: Doc<ProjectFM>[] = [
  { file: "p", name: "Arm Migration", body: "", fm: { type: "project", status: "idea", closes: ["ros2"] } },
];

describe("computeGap", () => {
  it("ranks missing skills by ROI with momentum factor and links closing projects", () => {
    const gaps = computeGap(
      [stat("ros2", false, 4, 0.4, "rising"), stat("aws", false, 4, 0.4, "declining"), stat("cpp", true, 9, 0.9, "stable")],
      projects, 0.5,
    );
    expect(gaps.map(g => g.slug)).toEqual(["ros2", "aws"]);     // cpp excluded (have)
    expect(gaps[0].roi).toBe(100);                               // top scaled to 100
    expect(gaps[1].roi).toBe(Math.round(100 * (0.4 * 0.8) / (0.4 * 1.25)));  // 64
    expect(gaps[0].closedBy).toEqual(["Arm Migration"]);
    expect(gaps[1].closedBy).toEqual([]);
  });
  it("returns empty when nothing is missing", () => {
    expect(computeGap([stat("cpp", true, 1, 0.1, "stable")], [], 0.5)).toEqual([]);
  });
});

function statT(slug: string, count: number, share: number, byTrack: Record<string, number>): SkillStats {
  return { slug, name: slug, have: false, count, share, tier: "common", byTrack, byGeo: {}, byLevel: {}, keywordCount: 0, trend: "stable" };
}

describe("computeGap per-track facet", () => {
  it("ranks ros2 top for robotics even when global ROI is dominated by aws", () => {
    const trackTotals = { robotics: 10, software: 30 };
    const gaps = computeGap(
      [
        statT("aws", 12, 0.3, { software: 12 }),       // big global share, software-only
        statT("ros2", 6, 0.15, { robotics: 6 }),       // smaller global, robotics-only
      ],
      [], 0.5, trackTotals,
    );
    // global: aws first
    expect(gaps[0].slug).toBe("aws");
    // per-track robotics: ros2 leads (share 6/10 = .6 vs aws robotics share 0)
    const roboticsRanked = [...gaps].sort((a, b) => (b.byTrack?.robotics?.roi ?? 0) - (a.byTrack?.robotics?.roi ?? 0));
    expect(roboticsRanked[0].slug).toBe("ros2");
    expect(gaps.find(g => g.slug === "ros2")!.byTrack!.robotics.roi).toBe(100);
  });
  it("omits byTrack entries cleanly when trackTotals is absent (back-compat)", () => {
    const gaps = computeGap([statT("aws", 4, 0.4, {})], [], 0.5);
    expect(gaps[0].byTrack).toEqual({});
  });
});

describe("computeGap pivot boost", () => {
  it("boosts a skill demanded in a pivot.into track above an equal-demand skill outside it", () => {
    const gaps = computeGap(
      [statT("react", 6, 0.3, { software: 6 }), statT("ros2", 6, 0.3, { robotics: 6 })],
      [], 0.5, { robotics: 10, software: 10 }, ["robotics"], 1.2,
    );
    expect(gaps[0].slug).toBe("ros2");   // robotics ∈ pivot.into → ×1.2 → ranks first
    expect(gaps[1].slug).toBe("react");
  });
  it("leaves ordering unchanged when pivotInto is empty", () => {
    const noPivot = computeGap(
      [statT("react", 6, 0.3, { software: 6 }), statT("ros2", 6, 0.3, { robotics: 6 })],
      [], 0.5, { robotics: 10, software: 10 },
    );
    expect(noPivot.map(g => g.slug)).toEqual(["react", "ros2"]);  // equal ROI → stable input order
  });
});
