import { describe, it, expect } from "vitest";
import { computeTimeline } from "../src/timeline.js";
import type { Doc, JobFM } from "../src/types.js";

function job(history: string[]): Doc<JobFM> {
  return { file: "j", name: "j", body: "", fm: {
    type: "job", title: "t", company: "c", geo: "remote", track: ["software"], level: "early",
    ingested: "2026-06-01", status: "active", "app-status": "applied", "app-history": history, skills: [],
  } as JobFM };
}

describe("computeTimeline", () => {
  it("buckets app-history events by month and status", () => {
    const t = computeTimeline([
      job(["2026-05-02 interested", "2026-05-20 applied"]),
      job(["2026-06-01 applied"]),
    ]);
    expect(t).toEqual([
      { month: "2026-05", interested: 1, applied: 1, interview: 0, offer: 0, rejected: 0 },
      { month: "2026-06", interested: 0, applied: 1, interview: 0, offer: 0, rejected: 0 },
    ]);
  });
});
