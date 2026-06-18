import type { Overview, MomentumSeries, ChangeSet, Trend, SkillStats } from "./types.js";

interface JobRec {
  id: string; fm: { title: string; track: string[]; status: string; "app-status": string;
                    ingested: unknown; posted?: unknown };
  fit: { score: number; tier?: string }; freshness: string;
}

export function isoWeekKey(d: Date): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThu = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((date.getTime() - firstThu.getTime()) / 86400000 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Bucket pre-keyed values into a sorted count series and classify trend. */
export function volumeMomentum(keys: string[], _id: (k: string) => string, unit: "wk" | "mo"): MomentumSeries {
  const counts = new Map<string, number>();
  for (const k of keys) counts.set(k, (counts.get(k) ?? 0) + 1);
  const series = [...counts.keys()].sort().map(bucket => ({ bucket, count: counts.get(bucket)! }));
  if (series.length < 2) return { direction: "stable", pct: 0, span: "building history", series };
  const latest = series[series.length - 1].count;
  const prior = series.slice(0, -1);
  const priorMean = prior.reduce((a, p) => a + p.count, 0) / prior.length;
  const ratio = priorMean === 0 ? (latest > 0 ? Infinity : 1) : latest / priorMean;
  let direction: Trend = "stable";
  if (ratio > 1.25) direction = "rising"; else if (ratio < 0.8) direction = "declining";
  const pct = priorMean === 0 ? (latest > 0 ? 100 : 0) : Math.round((ratio - 1) * 100);
  return { direction, pct, span: `${series.length} ${unit}`, series };
}

const dstr = (v: unknown): string => (v instanceof Date ? v.toISOString() : String(v));

export function computeOverview(jobs: JobRec[], stats: SkillStats[], extra: { changes: ChangeSet }, now: Date, tracks: string[] = ["robotics", "software", "ai-ml", "ee-hardware"]): Overview {
  const active = jobs.filter(j => j.fm.status === "active");
  const pipeline = { interested: 0, applied: 0, interview: 0, offer: 0, rejected: 0 };
  for (const j of jobs) { const s = j.fm["app-status"]; if (s && s in pipeline) (pipeline as any)[s]++; }
  const freshness = { fresh: 0, recent: 0, stale: 0 };   // active corpus only — donut total == activeRoles
  for (const j of active) freshness[j.freshness === "high" ? "fresh" : j.freshness === "medium" ? "recent" : "stale"]++;
  const demandByTrack: Record<string, number> = {};
  for (const j of active) for (const t of j.fm.track) demandByTrack[t] = (demandByTrack[t] ?? 0) + 1;
  const trackReadiness: Record<string, number> = {};
  for (const t of tracks) {
    let have = 0, total = 0;
    for (const s of stats) {
      const d = s.byTrack[t] ?? 0;
      if (d <= 0) continue;
      total += d;
      if (s.have) have += d;
    }
    trackReadiness[t] = total > 0 ? have / total : 0;
  }
  const dates = jobs.map(j => new Date(dstr(j.fm.ingested ?? j.fm.posted)));
  const momentum = {
    weekly: volumeMomentum(dates.map(isoWeekKey), k => k, "wk"),
    monthly: volumeMomentum(dates.map(d => d.toISOString().slice(0, 7)), k => k, "mo"),
  };
  const wordCloud = [...stats].filter(s => s.count > 0).sort((a, b) => b.count - a.count).slice(0, 24)
    .map(s => ({ slug: s.slug, name: s.name, count: s.count, tier: s.tier, have: s.have, trend: s.trend }));
  const fitSpread = { excellent: 0, good: 0, stretch: 0, poor: 0 };
  for (const j of active) {
    const t = (j.fit.tier ?? "poor") as keyof typeof fitSpread;
    if (t in fitSpread) fitSpread[t]++;
  }
  const top = active.reduce<JobRec | null>((best, j) => (j.fit.score > (best?.fit.score ?? -1) ? j : best), null);
  return {
    hero: {
      activeRoles: active.length,
      strongFits: fitSpread.excellent,
      inPipeline: jobs.filter(j => { const s = j.fm["app-status"]; return s && s !== "none"; }).length,
      topMatch: top?.fit.score ?? 0,
      topMatchId: top?.id ?? null,
    },
    pipeline, freshness, fitSpread, demandByTrack, trackReadiness, momentum, wordCloud,
    changes: extra.changes, indexedAt: now.toISOString(),
  };
}
