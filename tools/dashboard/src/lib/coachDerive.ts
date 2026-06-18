import type { GapEntry, Job, ListedPage } from "./types.js";
import { TRACK_LABELS } from "./vocab.js";

/** Up to 3 roles to apply to: shortlisted-but-not-applied first, then highest-fit untouched. */
export function applyPicks(jobs: Job[]): Job[] {
  const active = jobs.filter(j => (j.fm.status ?? "active") === "active");
  const shortlisted = active
    .filter(j => j.fm["app-status"] === "interested")
    .sort((a, b) => b.fit.score - a.fit.score);
  const fresh = active
    .filter(j => j.fm["app-status"] === "none" || j.fm["app-status"] === "")
    .sort((a, b) => b.fit.score - a.fit.score);
  return [...shortlisted, ...fresh].slice(0, 3);
}

/** Track readiness rows, sorted high→low, with integer percent. */
export function readinessRows(tr: Record<string, number> | undefined): { track: string; label: string; pct: number }[] {
  return Object.entries(tr ?? {})
    .map(([track, frac]) => ({ track, label: TRACK_LABELS[track] ?? track, pct: Math.round(frac * 100) }))
    .sort((a, b) => b.pct - a.pct);
}

export interface Suggestion { text: string; to: string; tag: string }

const MONTH_MS = 1000 * 60 * 60 * 24 * 30.4;

/**
 * Up to `max` programmatic next-actions derived from live data. Deliberately
 * COMPLEMENTS the Study (gaps) and Apply (open jobs) lanes instead of repeating
 * them: ship in-flight projects, prep jobs already at the interview stage, and
 * re-verify advice researched over six months ago. Falls back to the top ROI
 * gap only when nothing else is actionable.
 */
export function suggestedTodos(input: {
  gaps?: GapEntry[]; projects?: ListedPage[]; jobs?: Job[]; advice?: ListedPage[];
  nowMs: number; max?: number;
}): Suggestion[] {
  const { gaps = [], projects = [], jobs = [], advice = [], nowMs, max = 3 } = input;
  const out: Suggestion[] = [];

  // 1. Portfolio: publish/ship in-flight projects (the user's highest-leverage move). Cap at 2 for variety.
  const projSugs: Suggestion[] = [];
  for (const p of projects) {
    const status = String(p.fm.status ?? "idea");
    const verb = status === "idea" ? "Publish" : status === "in-progress" ? "Ship" : null;
    if (verb) projSugs.push({ text: `${verb} ${p.name}`, to: `/page/${encodeURIComponent(p.name)}`, tag: "Build" });
  }
  out.push(...projSugs.slice(0, 2));

  // 2. Interview prep for any job at the interview stage (the Apply lane only shows open/interested roles).
  for (const j of jobs) {
    if (j.fm["app-status"] === "interview") {
      out.push({ text: `Prep ${j.fm.company} interview`, to: `/jobs/${j.id}`, tag: "Prep" });
    }
  }

  // 3. Re-verify advice older than six months.
  for (const a of advice) {
    const r = typeof a.fm.researched === "string" ? a.fm.researched : null;
    if (r && nowMs - Date.parse(r) > 6 * MONTH_MS) {
      out.push({ text: `Re-verify ${a.name}`, to: `/page/${encodeURIComponent(a.name)}`, tag: "Review" });
    }
  }

  // 4. Fallback: nothing else actionable → point at the highest-ROI gap.
  if (out.length === 0 && gaps.length > 0) {
    const top = [...gaps].sort((a, b) => b.roi - a.roi)[0];
    out.push({ text: `Start ${top.name}`, to: `/skills/${top.slug}`, tag: "Study" });
  }

  return out.slice(0, max);
}
