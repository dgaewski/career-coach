import type { Doc, JobFM, Trend } from "./types.js";
import type { Resolver } from "./aliases.js";

export interface MomentumEntry { series: { month: string; share: number }[]; trend: Trend }

export function computeMomentum(jobs: Doc<JobFM>[], resolver: Resolver): Map<string, MomentumEntry> {
  const monthTotals = new Map<string, number>();
  const monthSlugCounts = new Map<string, Map<string, number>>();
  for (const job of jobs) {
    const raw: unknown = job.fm.ingested;
    const month = raw instanceof Date ? raw.toISOString().slice(0, 7) : String(raw).slice(0, 7);
    monthTotals.set(month, (monthTotals.get(month) ?? 0) + 1);
    const seen = new Set<string>();
    for (const raw of job.fm.skills) {
      const slug = resolver.resolve(raw);
      if (!slug || seen.has(slug)) continue;
      seen.add(slug);
      if (!monthSlugCounts.has(slug)) monthSlugCounts.set(slug, new Map());
      const m = monthSlugCounts.get(slug)!;
      m.set(month, (m.get(month) ?? 0) + 1);
    }
  }
  const months = [...monthTotals.keys()].sort();
  const out = new Map<string, MomentumEntry>();
  for (const slug of resolver.bySlug.keys()) {
    const counts = monthSlugCounts.get(slug) ?? new Map<string, number>();
    const series = months.map(month => ({ month, share: (counts.get(month) ?? 0) / monthTotals.get(month)! }));
    let trend: Trend = "stable";
    if (months.length >= 2) {
      const latest = series[series.length - 1].share;
      const prior = series.slice(0, -1);
      const priorMean = prior.reduce((a, p) => a + p.share, 0) / prior.length;
      if (priorMean === 0) trend = latest > 0 ? "rising" : "stable";
      else if (latest / priorMean > 1.25) trend = "rising";
      else if (latest / priorMean < 0.8) trend = "declining";
    }
    out.set(slug, { series, trend });
  }
  return out;
}
