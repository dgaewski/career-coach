import { describe, it, expect } from "vitest";
import { computeMomentum } from "../src/momentum.js";
import { buildResolver } from "../src/aliases.js";
import type { Doc, JobFM, SkillFM } from "../src/types.js";

const skills: Doc<SkillFM>[] = [
  { file: "s", name: "ROS 2", body: "", fm: { type: "skill", slug: "ros2", aliases: [], have: false } },
  { file: "s2", name: "Python", body: "", fm: { type: "skill", slug: "python", aliases: [], have: true } },
];
const r = buildResolver(skills);

function job(title: string, ingested: string, jobSkills: string[]): Doc<JobFM> {
  return { file: title, name: title, body: "", fm: {
    type: "job", title, company: "c", geo: "remote", track: ["software"], level: "early",
    ingested, status: "active", "app-status": "none", skills: jobSkills,
  } as JobFM };
}

describe("computeMomentum", () => {
  it("computes monthly share series and classifies trend", () => {
    const jobs = [
      job("a", "2026-04-10", ["python"]),               // Apr: python 1/2, ros2 0/2
      job("b", "2026-04-12", []),
      job("c", "2026-06-01", ["ros2", "python"]),       // Jun: ros2 1/2, python 1/2
      job("d", "2026-06-05", []),
    ];
    const m = computeMomentum(jobs, r);
    expect(m.get("ros2")!.trend).toBe("rising");        // 0 -> 0.5
    expect(m.get("python")!.trend).toBe("stable");      // 0.5 -> 0.5
    expect(m.get("ros2")!.series).toEqual([
      { month: "2026-04", share: 0 }, { month: "2026-06", share: 0.5 },
    ]);
  });
  it("returns stable when under 2 months of data", () => {
    const m = computeMomentum([job("a", "2026-06-01", ["ros2"])], r);
    expect(m.get("ros2")!.trend).toBe("stable");
  });
  it("buckets Date-object ingested values correctly (gray-matter parses YAML dates)", () => {
    const withDate = job("e", "2026-04-10", ["ros2"]);
    (withDate.fm as { ingested: unknown }).ingested = new Date("2026-04-10T00:00:00Z");
    const later = job("f", "2026-06-01", ["ros2"]);
    const m = computeMomentum([withDate, later], r);
    expect(m.get("ros2")!.series.map(p => p.month)).toEqual(["2026-04", "2026-06"]);
  });
});
