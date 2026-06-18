import { describe, it, expect } from "vitest";
import { diffSnapshot, buildSnapshot } from "../src/changes.js";

const rec = (id: string, score: number, status = "active") =>
  ({ id, name: id, file: `jobs/${id}.md`, fm: { title: id.toUpperCase(), company: "Acme", status } as any,
     fit: { score, tier: "good", reasons: [] }, freshness: "high", salaryMidpoint: null });

describe("diffSnapshot", () => {
  it("reports new roles, fit up/down, and stale flips vs the prior snapshot", () => {
    const prior = { a: { fit: 70, status: "active" }, b: { fit: 80, status: "active" }, c: { fit: 60, status: "active" } };
    const now = [rec("a", 85), rec("b", 80), rec("c", 60, "stale"), rec("d", 90)];
    const flippedIds = new Set(["c"]);
    const cs = diffSnapshot(prior, now as any, flippedIds);
    expect(cs.newRoles.map(r => r.id)).toEqual(["d"]);
    expect(cs.fitImproved).toEqual([{ id: "a", title: "A", from: 70, to: 85 }]);
    expect(cs.fitDeclined).toEqual([]);
    expect(cs.staleFlipped.map(r => r.id)).toEqual(["c"]);
  });
  it("reports a fit decline, and a single job can both decline and stale-flip", () => {
    const prior = { a: { fit: 90, status: "active" } };
    const cs = diffSnapshot(prior, [rec("a", 60, "stale")] as any, new Set(["a"]));
    expect(cs.fitDeclined).toEqual([{ id: "a", title: "A", from: 90, to: 60 }]);
    expect(cs.fitImproved).toEqual([]);
    expect(cs.staleFlipped.map(r => r.id)).toEqual(["a"]);
  });
  it("treats a job with fit score 0 in prior as existing, not new", () => {
    const cs = diffSnapshot({ a: { fit: 0, status: "active" } }, [rec("a", 0)] as any, new Set());
    expect(cs.newRoles).toEqual([]);   // truthy snapshot object, not a falsy-fit trap
  });
  it("first run (empty prior) reports no new roles, no fit deltas", () => {
    const cs = diffSnapshot({}, [rec("a", 90)] as any, new Set());
    expect(cs.newRoles).toEqual([]);
    expect(cs.fitImproved).toEqual([]);
  });
  it("buildSnapshot maps id -> {fit,status}", () => {
    expect(buildSnapshot([rec("a", 90, "active")] as any)).toEqual({ a: { fit: 90, status: "active" } });
  });
});
