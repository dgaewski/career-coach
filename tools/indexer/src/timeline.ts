import type { Doc, JobFM } from "./types.js";

export interface TimelineMonth {
  month: string; interested: number; applied: number; interview: number; offer: number; rejected: number;
}
const STATUSES = ["interested", "applied", "interview", "offer", "rejected"] as const;

export function computeTimeline(jobs: Doc<JobFM>[]): TimelineMonth[] {
  const months = new Map<string, TimelineMonth>();
  for (const j of jobs) {
    for (const entry of j.fm["app-history"] ?? []) {
      const [date, status] = entry.split(/\s+/);
      if (!date || !STATUSES.includes(status as typeof STATUSES[number])) continue;
      const month = date.slice(0, 7);
      if (!months.has(month)) months.set(month, { month, interested: 0, applied: 0, interview: 0, offer: 0, rejected: 0 });
      months.get(month)![status as typeof STATUSES[number]] += 1;
    }
  }
  return [...months.values()].sort((a, b) => a.month.localeCompare(b.month));
}
