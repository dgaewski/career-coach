import type { Doc, JobFM, CompanyStats } from "./types.js";
import { parseSalaryMidpoint } from "./salary.js";

export function computeCompanies(jobs: Doc<JobFM>[]): CompanyStats[] {
  const byCompany = new Map<string, Doc<JobFM>[]>();
  for (const j of jobs) {
    if (!byCompany.has(j.fm.company)) byCompany.set(j.fm.company, []);
    byCompany.get(j.fm.company)!.push(j);
  }
  return [...byCompany.entries()].map(([name, list]) => {
    const active = list.filter(j => j.fm.status === "active");
    const salaries = list.map(j => parseSalaryMidpoint(j.fm.salary)).filter((s): s is number => s !== null);
    const levels: Record<string, number> = {};
    for (const j of active) levels[j.fm.level] = (levels[j.fm.level] ?? 0) + 1;
    return {
      name, active: active.length, total: list.length,
      avgSalary: salaries.length ? Math.round(salaries.reduce((a, b) => a + b, 0) / salaries.length) : null,
      remoteShare: active.length ? active.filter(j => j.fm.geo === "remote").length / active.length : 0,
      levels, repeatPoster: list.length >= 2,
    };
  }).sort((a, b) => b.active - a.active);
}
