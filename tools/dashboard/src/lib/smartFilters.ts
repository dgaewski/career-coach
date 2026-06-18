import type { Job } from "./types.js";

export interface SmartFilterParams { havePctMin?: number; missingMax?: number; salaryMin?: number }
export interface SmartFilterResult { job: Job; salaryUnverified: boolean }

/** Fraction of the job's skills the user has, from fit reasons ("has X" / "missing X"). 1 when no skill reasons. */
export function havePct(job: Job): number {
  const has = job.fit.reasons.filter(r => r.startsWith("has ")).length;
  const missing = job.fit.reasons.filter(r => r.startsWith("missing ")).length;
  return has + missing === 0 ? 1 : has / (has + missing);
}

/**
 * Client-side smart filters per spec §8.3. Salary filtering applies to the parseable
 * subset only — unparseable salaries are INCLUDED and flagged, never silently dropped.
 */
export function applySmartFilters(jobs: Job[], p: SmartFilterParams): SmartFilterResult[] {
  return jobs
    .filter(j => p.havePctMin === undefined || havePct(j) >= p.havePctMin)
    .filter(j => p.missingMax === undefined || j.fit.reasons.filter(r => r.startsWith("missing ")).length <= p.missingMax)
    .filter(j => p.salaryMin === undefined || j.salaryMidpoint === null || j.salaryMidpoint >= p.salaryMin)
    .map(j => ({ job: j, salaryUnverified: p.salaryMin !== undefined && j.salaryMidpoint === null }));
}
