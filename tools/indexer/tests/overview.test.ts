import { describe, it, expect } from "vitest";
import { computeOverview } from "../src/overview.js";

describe("computeOverview", () => {
  const jr = (id: string, score: number, track: string[], fresh: string, app = "none", status = "active", tier = "good") =>
    ({ id, name: id, file: `jobs/${id}.md`,
       fm: { title: id, company: "Acme", track, geo: "remote", level: "early", status,
             "app-status": app, ingested: "2026-06-01", skills: [] } as any,
       fit: { score, tier, reasons: [] }, freshness: fresh, salaryMidpoint: null });
  it("computes hero, pipeline, freshness buckets, demand-by-track (active-only aggregates)", () => {
    const jobs = [
      jr("a", 90, ["robotics"], "high", "applied", "active", "excellent"),  // active, excellent tier
      jr("b", 70, ["software"], "medium", "interview"),   // active
      jr("c", 40, ["ee-hardware"], "low"),                // active but old -> stale freshness bucket
      jr("d", 30, ["robotics"], "low", "none", "stale"),  // status stale -> excluded from active aggregates
    ];
    const ov = computeOverview(jobs as any, [], { changes: { newRoles: [], fitImproved: [], fitDeclined: [], staleFlipped: [] } } as any, new Date("2026-06-11T00:00:00Z"));
    expect(ov.hero.activeRoles).toBe(3);
    expect(ov.hero.strongFits).toBe(1);          // tier-based (excellent count)
    expect(ov.hero.topMatch).toBe(90);
    expect(ov.hero.inPipeline).toBe(2);          // applied + interview
    expect(ov.pipeline.applied).toBe(1);
    expect(ov.freshness).toEqual({ fresh: 1, recent: 1, stale: 1 });   // active only; d excluded -> sum == activeRoles
    expect(ov.demandByTrack.robotics).toBe(1);   // active only -> a; the stale robotics job d is excluded
  });
});

describe("overview fitSpread + topMatchId", () => {
  const now = new Date("2026-06-14T00:00:00Z");
  const rec = (id: string, score: number, tier: string) =>
    ({ id, fm: { title: id, track: ["software"], status: "active", "app-status": "none", ingested: "2026-06-10" },
       fit: { score, tier }, freshness: "high" });
  it("counts active roles by tier and names the top match", () => {
    const ov = computeOverview(
      [rec("a", 92, "excellent"), rec("b", 70, "good"), rec("c", 50, "stretch"), rec("d", 30, "poor")] as any,
      [], { changes: { newRoles: [], fitImproved: [], fitDeclined: [], staleFlipped: [] } }, now);
    expect(ov.fitSpread).toEqual({ excellent: 1, good: 1, stretch: 1, poor: 1 });
    expect(ov.hero.strongFits).toBe(1);          // tier-based, not hardcoded >=80
    expect(ov.hero.topMatchId).toBe("a");
  });
});

const EMPTY_CHANGES = { newRoles: [], fitImproved: [], fitDeclined: [], staleFlipped: [] };
function stat(slug: string, have: boolean, byTrack: Record<string, number>) {
  return { slug, name: slug, have, count: Object.values(byTrack).reduce((a,b)=>a+b,0), share: 0,
    tier: "common" as const, byTrack, byGeo: {}, byLevel: {}, keywordCount: 0, trend: "stable" as const };
}
it("trackReadiness = demand-weighted have-share per track", () => {
  const jobs = [{ id: "a", fm: { title: "A", track: ["robotics"], status: "active", "app-status": "none", ingested: "2026-06-01" }, fit: { score: 80, tier: "good" }, freshness: "high" }];
  const stats = [stat("have1", true, { robotics: 3 }), stat("gap1", false, { robotics: 1 }), stat("sw", false, { software: 2 })];
  const ov = computeOverview(jobs as any, stats as any, { changes: EMPTY_CHANGES }, new Date("2026-06-14T00:00:00Z"), ["robotics", "software", "ai-ml", "ee-hardware"]);
  expect(ov.trackReadiness!.robotics).toBeCloseTo(0.75);   // 3 have / (3+1) total
  expect(ov.trackReadiness!.software).toBeCloseTo(0);       // 0 have / 2 total
  expect(ov.trackReadiness!["ai-ml"]).toBe(0);             // no demand → 0
});

it("trackReadiness only contains keys from the passed tracks list", () => {
  const jobs = [{ id: "a", fm: { title: "A", track: ["robotics"], status: "active", "app-status": "none", ingested: "2026-06-01" }, fit: { score: 80, tier: "good" }, freshness: "high" }];
  const stats = [stat("have1", true, { robotics: 3, "ee-hardware": 1 }), stat("sw", false, { software: 2 })];
  const ov = computeOverview(jobs as any, stats as any, { changes: EMPTY_CHANGES }, new Date("2026-06-14T00:00:00Z"), ["robotics"]);
  expect(Object.keys(ov.trackReadiness!)).toEqual(["robotics"]);
  expect("software" in ov.trackReadiness!).toBe(false);
  expect("ee-hardware" in ov.trackReadiness!).toBe(false);
});
