import type { Doc, JobFM } from "./types.js";

export interface ClearanceSignals { clearanceKeywords: string[]; workAuthKeywords: string[]; companies: string[] }

/** Does the role likely require an ACTIVE security clearance? (body keyword OR defense-prime company) */
export function inferClearanceRisk(job: Doc<JobFM>, signals: ClearanceSignals | undefined): boolean {
  if (!signals) return false;
  const body = job.body.toLowerCase();
  if (signals.clearanceKeywords.some(k => body.includes(k.toLowerCase()))) return true;
  const company = job.fm.company.toLowerCase();
  return signals.companies.some(c => company === c.toLowerCase());
}

/** Does the role likely require US work-authorization/citizenship the user lacks? (body keyword only) */
export function inferWorkAuthRisk(job: Doc<JobFM>, signals: ClearanceSignals | undefined): boolean {
  if (!signals) return false;
  const body = job.body.toLowerCase();
  return signals.workAuthKeywords.some(k => body.includes(k.toLowerCase()));
}
