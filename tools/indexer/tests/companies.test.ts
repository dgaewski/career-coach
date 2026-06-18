import { describe, it, expect } from "vitest";
import { computeCompanies } from "../src/companies.js";
import type { Doc, JobFM } from "../src/types.js";

function job(company: string, over: Partial<JobFM>): Doc<JobFM> {
  return { file: "j", name: "j", body: "", fm: {
    type: "job", title: "t", company, geo: "boston-metro", track: ["robotics"], level: "early",
    ingested: "2026-06-01", status: "active", "app-status": "none", skills: [], ...over,
  } as JobFM };
}

describe("computeCompanies", () => {
  it("aggregates counts, salary, remote share, levels, repeat flag", () => {
    const out = computeCompanies([
      job("Acme", { salary: "$100k–$120k" }),
      job("Acme", { geo: "remote", level: "mid", status: "stale" }),
      job("Beta", {}),
    ]);
    const acme = out.find(c => c.name === "Acme")!;
    expect(acme.active).toBe(1);
    expect(acme.total).toBe(2);
    expect(acme.avgSalary).toBe(110_000);
    expect(acme.repeatPoster).toBe(true);
    expect(out.find(c => c.name === "Beta")!.repeatPoster).toBe(false);
  });
});
