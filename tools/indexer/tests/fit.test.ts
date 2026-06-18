import { describe, it, expect } from "vitest";
import { computeFit, freshness, compareJobs, type FitContext } from "../src/fit.js";
import { buildResolver } from "../src/aliases.js";
import { loadConfig } from "../src/config.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Doc, JobFM, SkillFM, DemandTier } from "../src/types.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const cfg = loadConfig(path.join(here, "fixtures", "wiki", "tools"));
const skills: Doc<SkillFM>[] = [
  { file: "s", name: "ROS 2", body: "", fm: { type: "skill", slug: "ros2", aliases: [], have: false } },
  { file: "s2", name: "C and C++", body: "", fm: { type: "skill", slug: "cpp", aliases: [], have: true } },
  { file: "s3", name: "ROS", body: "", fm: { type: "skill", slug: "ros", aliases: [], have: true } },
  { file: "s4", name: "Python", body: "", fm: { type: "skill", slug: "python", aliases: [], have: true } },
  { file: "s5", name: "AWS", body: "", fm: { type: "skill", slug: "aws", aliases: [], have: true } },
];
const r = buildResolver(skills);

function job(over: Partial<JobFM>): Doc<JobFM> {
  return { file: "j.md", name: "j", body: "", fm: {
    type: "job", title: "t", company: "c", geo: "boston-metro", track: ["robotics"],
    level: "early", ingested: "2026-06-01", status: "active", "app-status": "none", skills: [], ...over,
  } as JobFM };
}
// "other" is intentionally omitted so geo: "other" exercises the 0.3 fallback (see legacy test 3).
const FIXTURE_GEO: Record<string, number> = {
  "ct-commutable": 1.0, "boston-metro": 1.0, "new-england": 1.0, "remote": 1.0,
};
const FIXTURE_TRACKS = new Set(["robotics", "software", "ai-ml", "ee-hardware"]);

// Base ctx mirrors the old defaultCtx (tierOf → "common") plus the new geo/track fields.
const baseCtx = (over: Partial<FitContext> = {}): FitContext => ({
  tierOf: () => "common",
  relatedHave: cfg.relatedHave ?? {},
  geoScores: FIXTURE_GEO,
  targetTracks: FIXTURE_TRACKS,
  ...over,
});
const ctxTier = (tier: DemandTier): FitContext => baseCtx({ tierOf: () => tier });

describe("computeFit v2", () => {
  it("legacy: half-match NE early robotics job (default ctx)", () => {
    const f = computeFit(job({ skills: ["ros2", "cpp"] }), r, cfg, baseCtx());
    expect(f.score).toBe(82);
    expect(f.reasons.some(x => x.startsWith("partial ros2"))).toBe(true);
  });
  it("legacy: single-skill posting no longer snaps to 100 (confidence shrink)", () => {
    const f = computeFit(job({ skills: ["cpp"] }), r, cfg, baseCtx());
    expect(f.score).toBe(83);              // was 100 pre-v2
    expect(f.score).toBeLessThan(100);     // the declumping invariant
  });
  it("legacy: neutral credit when none resolvable, with geo/level penalties", () => {
    const f = computeFit(job({ skills: ["nope"], geo: "other", level: "senior" }), r, cfg, baseCtx());
    expect(f.score).toBe(49);
  });

  it("a deep match outranks a thin match", () => {
    const deep = computeFit(job({ skills: ["cpp", "python", "aws"] }), r, cfg, ctxTier("common"));
    const thin = computeFit(job({ skills: ["cpp"] }), r, cfg, ctxTier("common"));
    expect(deep.score).toBeGreaterThan(thin.score);
  });
  it("high-demand matches outscore rare matches at equal depth", () => {
    const hi = computeFit(job({ skills: ["cpp", "python"] }), r, cfg, ctxTier("high-demand"));
    const lo = computeFit(job({ skills: ["cpp", "python"] }), r, cfg, ctxTier("rare"));
    expect(hi.score).toBeGreaterThan(lo.score);
  });
  it("gives partial credit for a related have (ros -> ros2) and reports it", () => {
    const withRel = computeFit(job({ skills: ["ros2"] }), r, cfg, ctxTier("common"));
    expect(withRel.reasons.some(x => x.startsWith("partial ros2"))).toBe(true);
    const noRel = computeFit(job({ skills: ["ros2"] }), r, cfg, baseCtx({ relatedHave: {} }));
    expect(withRel.score).toBeGreaterThan(noRel.score);
  });
  it("reports matched count", () => {
    const f = computeFit(job({ skills: ["cpp", "python", "ros2"] }), r, cfg, ctxTier("common"));
    expect(f.matched).toBe(2);   // cpp + python fully; ros2 partial does not count as a full match
  });
});

describe("compareJobs (tie-breaker)", () => {
  const mk = (score: number, fresh: string, level: string, company: string, matched = 0) =>
    ({ fit: { score, matched }, freshness: fresh, fm: { level, company } });
  it("orders by score, then freshness, then level, then matched, then company", () => {
    const a = mk(90, "high", "early", "Acme");
    const b = mk(90, "low", "early", "Zeta");
    expect(compareJobs(a, b)).toBeLessThan(0);            // a fresher → first
    const c = mk(90, "high", "senior", "Acme");
    expect(compareJobs(a, c)).toBeLessThan(0);            // a better level → first
    const d = mk(80, "high", "early", "Acme");
    expect(compareJobs(a, d)).toBeLessThan(0);            // a higher score → first
  });
  it("is deterministic and total (stable sort key)", () => {
    const xs = [mk(90, "high", "early", "B"), mk(90, "high", "early", "A")];
    expect([...xs].sort(compareJobs).map(x => x.fm.company)).toEqual(["A", "B"]);
  });
});

describe("computeFit comp-floor signal", () => {
  it("penalizes + flags a below-floor role, exact 10% off the base", () => {
    const below = computeFit(job({ skills: ["cpp"], salary: "$70k" }), r, cfg, baseCtx({ compFloor: 95000 }));
    expect(below.flags).toContain("below-floor");
    expect(below.score).toBe(75);                       // base ≈ 83.48 (unrounded) × 0.90 = 75.13 → 75
    expect(below.reasons.some(x => x.startsWith("below floor"))).toBe(true);
  });
  it("does not penalize an at/above-floor role", () => {
    const above = computeFit(job({ skills: ["cpp"], salary: "$120k" }), r, cfg, baseCtx({ compFloor: 95000 }));
    expect(above.flags).not.toContain("below-floor");
    expect(above.score).toBe(83);
  });
  it("never penalizes a role with unknown salary", () => {
    const unknown = computeFit(job({ skills: ["cpp"] }), r, cfg, baseCtx({ compFloor: 95000 }));  // no salary
    expect(unknown.flags).not.toContain("below-floor");
    expect(unknown.score).toBe(83);
  });
  it("is a no-op when compFloor is unset (even for a low-salary role)", () => {
    const f = computeFit(job({ skills: ["cpp"], salary: "$70k" }), r, cfg, baseCtx());
    expect(f.flags).toEqual([]);
    expect(f.score).toBe(83);
  });
});

describe("computeFit clearance signal", () => {
  const clearedBody = "This role requires an active secret clearance.";
  const mk = (over = {}) => ({ file: "j", name: "j", body: clearedBody, fm: job({ skills: ["cpp"], ...over }).fm });

  it("penalizes + flags a clearance role when user clearance is not active", () => {
    const f = computeFit(mk(), r, cfg, baseCtx({ userClearance: "eligible" }));
    expect(f.flags).toContain("clearance-risk");
    expect(f.score).toBe(73);     // 83 base × (1 − 0.12) = 73.04 → 73
  });
  it("does not penalize when user clearance is active", () => {
    const f = computeFit(mk(), r, cfg, baseCtx({ userClearance: "active" }));
    expect(f.flags).not.toContain("clearance-risk");
    expect(f.score).toBe(83);
  });
  it("work-auth: penalizes + flags a citizenship role when user needs sponsorship (not a clearance flag)", () => {
    const j = { file: "j", name: "j", body: "Must hold U.S. citizenship.", fm: job({ skills: ["cpp"] }).fm };
    const f = computeFit(j, r, cfg, baseCtx({ userWorkAuth: "needs-sponsorship" }));
    expect(f.flags).toContain("work-auth-risk");
    expect(f.flags).not.toContain("clearance-risk");
  });
  it("a citizen (work-auth citizen) is NOT work-auth-flagged on a citizenship role", () => {
    const j = { file: "j", name: "j", body: "Must hold U.S. citizenship.", fm: job({ skills: ["cpp"] }).fm };
    const f = computeFit(j, r, cfg, baseCtx({ userWorkAuth: "citizen", userClearance: "eligible" }));
    expect(f.flags).toEqual([]);
    expect(f.score).toBe(83);
  });
  it("is a no-op when both clearance and workAuth are unset", () => {
    const f = computeFit(mk(), r, cfg, baseCtx());
    expect(f.flags).toEqual([]);
    expect(f.score).toBe(83);
  });
  it("treats an empty-string clearance as unset (no penalty)", () => {
    const f = computeFit(mk(), r, cfg, baseCtx({ userClearance: "" }));
    expect(f.flags).toEqual([]);
    expect(f.score).toBe(83);
  });
  it("both barriers stack when a role needs clearance AND citizenship and the user lacks both", () => {
    const j = { file: "j", name: "j", body: "Active secret clearance and U.S. citizenship required.", fm: job({ skills: ["cpp"] }).fm };
    const f = computeFit(j, r, cfg, baseCtx({ userClearance: "eligible", userWorkAuth: "needs-sponsorship" }));
    expect(f.flags).toEqual(expect.arrayContaining(["clearance-risk", "work-auth-risk"]));
    expect(f.score).toBe(63);   // 83 × (1 − 0.12 − 0.12) = 63.08 → 63
  });
});

describe("calibration is a strict no-op when all optional fields are unset", () => {
  it("a low-salary, clearance-keyword, robotics role is unflagged + unpenalized under baseCtx()", () => {
    const j = { file: "j", name: "j", body: "Requires an active secret clearance.", fm: job({ skills: ["cpp"], salary: "$50k", track: ["robotics"] }).fm };
    const f = computeFit(j, r, cfg, baseCtx());   // no compFloor / userClearance / userWorkAuth
    expect(f.flags).toEqual([]);
    expect(f.score).toBe(83);                      // identical to the legacy single-skill base
  });
});

describe("freshness", () => {
  const NOW = new Date("2026-06-11T00:00:00Z");
  it("classifies by age and status", () => {
    expect(freshness(job({ ingested: "2026-06-08" }), NOW)).toBe("high");
    expect(freshness(job({ ingested: "2026-05-01" }), NOW)).toBe("medium");
    expect(freshness(job({ ingested: "2026-03-01" }), NOW)).toBe("low");
    expect(freshness(job({ ingested: "2026-06-08", status: "closed" }), NOW)).toBe("low");
    expect(freshness(job({ posted: "2026-03-01", ingested: "2026-06-10" }), NOW)).toBe("low"); // posted wins
  });
});
