import { describe, it, expect } from "vitest";
import { computeSkillDemand } from "../src/counts.js";
import { buildResolver } from "../src/aliases.js";
import type { Doc, JobFM, SkillFM } from "../src/types.js";

const skills: Doc<SkillFM>[] = [
  { file: "s1", name: "ROS 2", body: "", fm: { type: "skill", slug: "ros2", aliases: ["ROS2"], have: false } },
  { file: "s2", name: "C and C++", body: "", fm: { type: "skill", slug: "cpp", aliases: ["C++"], have: true } },
  { file: "s3", name: "Python", body: "", fm: { type: "skill", slug: "python", aliases: [], have: true } },
];

function job(over: Partial<JobFM>): Doc<JobFM> {
  return { file: over.title + ".md", name: over.title!, body: "", fm: {
    type: "job", title: "t", company: "c", geo: "boston-metro", track: ["robotics"],
    level: "early", ingested: "2026-06-01", status: "active", "app-status": "none", skills: [], ...over,
  } as JobFM };
}

describe("computeSkillDemand", () => {
  const jobs = [
    job({ title: "A", skills: ["ros2", "cpp"], track: ["robotics", "software"], keywords: ["perception"] }),
    job({ title: "B", skills: ["ros2"], geo: "ct-commutable", level: "mid" }),
    job({ title: "C", skills: ["python"], status: "stale" }),       // excluded: stale
    job({ title: "D", skills: ["mystery"] }),                        // unresolvable
  ];
  const r = buildResolver(skills);

  it("counts active jobs per resolved slug with faceting", () => {
    const { stats, warnings } = computeSkillDemand(jobs, r, { highDemand: 0.25, common: 0.10, occasional: 0.03 });
    const ros2 = stats.find(s => s.slug === "ros2")!;
    expect(ros2.count).toBe(2);
    expect(ros2.share).toBeCloseTo(2 / 3);          // 3 active jobs (A, B, D)
    expect(ros2.tier).toBe("high-demand");
    expect(ros2.byTrack.robotics).toBe(2);
    expect(ros2.byTrack.software).toBe(1);
    expect(ros2.byGeo["ct-commutable"]).toBe(1);
    expect(stats.find(s => s.slug === "python")!.count).toBe(0);   // stale excluded
    expect(warnings.some(w => w.includes("mystery"))).toBe(true);
  });
});
