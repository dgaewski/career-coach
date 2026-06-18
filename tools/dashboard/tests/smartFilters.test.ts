import { describe, it, expect } from "vitest";
import { havePct, applySmartFilters } from "../src/lib/smartFilters.js";
import { JOBS, JOB_A, JOB_B } from "./fixtures.js";

// Unit coverage for the shared filtering helpers (relocated from jobs.test.tsx
// when the Jobs view test was rewritten in Phase 4c B1 — the logic still ships).
describe("smartFilters", () => {
  it("computes have-% from fit reasons (skill reasons only)", () => {
    expect(havePct(JOB_A as never)).toBe(0.5);   // has ros2, missing cpp
    expect(havePct(JOB_B as never)).toBe(0);     // missing c
  });
  it("salary filter keeps unparseable salaries with a flag", () => {
    const out = applySmartFilters(JOBS as never, { salaryMin: 100000 });
    expect(out.map(o => o.job.id)).toEqual(["acme-robot-dev", "beta-firmware-eng"]);
    expect(out[0].salaryUnverified).toBe(false);
    expect(out[1].salaryUnverified).toBe(true);  // null midpoint included, flagged
  });
  it("havePctMin and missingMax filter", () => {
    expect(applySmartFilters(JOBS as never, { havePctMin: 0.5 }).length).toBe(1);
    expect(applySmartFilters(JOBS as never, { missingMax: 0 }).length).toBe(0);
  });
});
