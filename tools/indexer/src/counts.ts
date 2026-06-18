import type { Doc, JobFM, SkillStats, DemandTier, Config } from "./types.js";
import type { Resolver } from "./aliases.js";

function tierFor(share: number, t: Config["demandTiers"]): DemandTier {
  if (share >= t.highDemand) return "high-demand";
  if (share >= t.common) return "common";
  if (share >= t.occasional) return "occasional";
  return "rare";
}

const bump = (rec: Record<string, number>, key: string) => { rec[key] = (rec[key] ?? 0) + 1; };

export function computeSkillDemand(
  jobs: Doc<JobFM>[], resolver: Resolver, tiers: Config["demandTiers"],
): { stats: SkillStats[]; warnings: string[] } {
  const active = jobs.filter(j => j.fm.status === "active");
  const warnings: string[] = [];
  const stats = new Map<string, SkillStats>();
  for (const [slug, doc] of resolver.bySlug) {
    stats.set(slug, {
      slug, name: doc.name, have: doc.fm.have, count: 0, share: 0, tier: "rare",
      byTrack: {}, byGeo: {}, byLevel: {}, keywordCount: 0, trend: "stable",
    });
  }
  for (const job of active) {
    for (const raw of job.fm.skills) {
      const slug = resolver.resolve(raw);
      if (!slug) { warnings.push(`unresolvable skill slug "${raw}" in ${job.file}`); continue; }
      const s = stats.get(slug)!;
      s.count += 1;
      for (const t of job.fm.track) bump(s.byTrack, t);
      bump(s.byGeo, job.fm.geo);
      bump(s.byLevel, job.fm.level);
    }
    for (const kw of job.fm.keywords ?? []) {
      const slug = resolver.resolve(kw);
      if (slug) stats.get(slug)!.keywordCount += 1;   // keywords resolving to known skills tally separately
    }
  }
  const n = Math.max(active.length, 1);
  for (const s of stats.values()) { s.share = s.count / n; s.tier = tierFor(s.share, tiers); }
  return { stats: [...stats.values()].sort((a, b) => b.count - a.count), warnings };
}
