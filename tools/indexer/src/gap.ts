import type { SkillStats, GapEntry, Doc, ProjectFM } from "./types.js";

const FACTOR = { rising: 1.25, stable: 1.0, declining: 0.8 } as const;

export function computeGap(
  stats: SkillStats[], projects: Doc<ProjectFM>[], keywordWeight: number,
  trackTotals: Record<string, number> = {},
  pivotInto: string[] = [], pivotBoost = 1,
): GapEntry[] {
  const missing = stats.filter(s => !s.have && (s.count > 0 || s.keywordCount > 0));
  const into = new Set(pivotInto);
  const raw = missing.map(s => {
    // pivot boost applies ONLY to the overall (cross-track) rawRoi, not the per-track facet
    // (a uniform boost would cancel out inside per-track normalization).
    const pivotFactor = into.size > 0 && [...into].some(t => (s.byTrack[t] ?? 0) > 0) ? pivotBoost : 1;
    return {
      s,
      rawRoi: (s.share + keywordWeight * (s.keywordCount * s.share === 0 && s.count === 0 ? 0 : s.keywordCount / Math.max(s.count, 1) * s.share)) * FACTOR[s.trend] * pivotFactor,
      closedBy: projects.filter(p => p.fm.closes.includes(s.slug)).map(p => p.name),
    };
  });
  // Simplification: keyword contribution folds into share-based ROI; dominant term is share × momentum.
  const top = Math.max(...raw.map(r => r.rawRoi), 0);

  // per-track raw ROI + per-track normalization tops
  const trackTop: Record<string, number> = {};
  for (const { s } of raw) {
    for (const [track, cnt] of Object.entries(s.byTrack)) {
      const denom = trackTotals[track] ?? 0;
      const r = (denom > 0 ? cnt / denom : 0) * FACTOR[s.trend];
      if (r > (trackTop[track] ?? 0)) trackTop[track] = r;
    }
  }

  return raw
    .sort((a, b) => b.rawRoi - a.rawRoi)
    .map(({ s, rawRoi, closedBy }) => {
      const byTrack: Record<string, { count: number; share: number; roi: number }> = {};
      for (const [track, cnt] of Object.entries(s.byTrack)) {
        const denom = trackTotals[track] ?? 0;
        const share = denom > 0 ? cnt / denom : 0;
        const r = share * FACTOR[s.trend];
        byTrack[track] = {
          count: cnt,
          share,
          roi: (trackTop[track] ?? 0) > 0 ? Math.round((r / trackTop[track]) * 100) : 0,
        };
      }
      return {
        slug: s.slug, name: s.name, count: s.count, share: s.share, trend: s.trend,
        roi: top > 0 ? Math.round((rawRoi / top) * 100) : 0, closedBy, byTrack,
      };
    });
}
