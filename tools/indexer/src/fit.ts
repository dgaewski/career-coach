import type { Doc, JobFM, Config, FitResult, FitTier, Freshness, DemandTier } from "./types.js";
import type { Resolver } from "./aliases.js";
import { parseSalaryMidpoint } from "./salary.js";
import { inferClearanceRisk, inferWorkAuthRisk } from "./clearance.js";

const DAY = 86_400_000;
const NEUTRAL = 0.5;

const DEFAULT_TUNING = {
  tierWeights: { "high-demand": 1.0, common: 0.7, occasional: 0.5, rare: 0.4 } as Record<DemandTier, number>,
  shrinkK: 2,
  depthBonusPer: 0.04,
  depthBonusCap: 0.12,
};

// Runtime/user-derived scoring calibration, distinct from the static knobs on Config.
// geoScores + targetTracks are per-user (sourced from USER.md by the indexer) and so live
// here, while level bands stay on cfg.levelScores because they're universal, not personal.
export interface FitContext {
  tierOf: (slug: string) => DemandTier;
  relatedHave: Record<string, Record<string, number>>;
  geoScores: Record<string, number>;
  targetTracks: Set<string>;
  compFloor?: number;
  userClearance?: string;
  userWorkAuth?: string;
}

export function computeFit(
  job: Doc<JobFM>, resolver: Resolver, cfg: Config, ctx: FitContext,
): FitResult {
  const tuning = cfg.fitTuning ?? DEFAULT_TUNING;
  const reasons: string[] = [];
  const resolved = job.fm.skills.map(s => resolver.resolve(s)).filter((s): s is string => s !== null);
  let skillsFrac = NEUTRAL;
  let matchedCount = 0;

  if (resolved.length > 0) {
    let matched = 0, listed = 0;
    for (const slug of resolved) {
      const w = tuning.tierWeights[ctx.tierOf(slug)] ?? 0.7;
      listed += w;
      const doc = resolver.bySlug.get(slug)!;
      let credit = 0;
      if (doc.fm.have) { credit = 1; reasons.push(`has ${slug} (${w.toFixed(2)})`); }
      else {
        // partial credit: does the user have a related skill that counts toward this one?
        const rel = ctx.relatedHave[slug];
        let best = 0;
        if (rel) {
          for (const [from, c] of Object.entries(rel)) {
            const fromSlug = resolver.resolve(from);
            if (fromSlug && resolver.bySlug.get(fromSlug)?.fm.have && c > best) best = c;
          }
        }
        credit = best;
        reasons.push(best > 0 ? `partial ${slug} via related (${best})` : `missing ${slug}`);
      }
      matched += w * credit;
      if (credit >= 1) matchedCount++;
    }
    skillsFrac = (matched + tuning.shrinkK * NEUTRAL) / (listed + tuning.shrinkK);
    const depthBonus = Math.min(tuning.depthBonusCap, tuning.depthBonusPer * matchedCount);
    skillsFrac = Math.min(1, skillsFrac + depthBonus);
    if (resolved.length <= 1) reasons.push("thin posting: shrunk toward neutral");
  } else {
    reasons.push("no resolvable skills listed (neutral credit)");
  }

  const geoScore = ctx.geoScores[job.fm.geo] ?? 0.3;
  const levelScore = cfg.levelScores[job.fm.level] ?? 0.7;
  const trackScore = job.fm.track.some(t => ctx.targetTracks.has(t)) ? 1 : 0.5;
  reasons.push(`geo ${job.fm.geo} (${geoScore})`, `level ${job.fm.level} (${levelScore})`);
  const w = cfg.fitWeights;
  const base = 100 * (w.skills * skillsFrac + w.geo * geoScore + w.level * levelScore + w.track * trackScore);

  // ── soft calibration penalties: only when the user declared the relevant USER.md field ──
  const pen = cfg.penalties ?? { belowFloor: 0, clearanceRisk: 0, workAuthRisk: 0 };
  const flags: string[] = [];
  let penalty = 0;

  if (ctx.compFloor != null) {
    const mid = parseSalaryMidpoint(job.fm.salary);
    if (mid != null && mid < ctx.compFloor) {
      penalty += pen.belowFloor;
      flags.push("below-floor");
      reasons.push(`below floor ($${mid} < $${ctx.compFloor})`);
    }
  }

  if (!!ctx.userClearance && ctx.userClearance !== "active") {
    if (inferClearanceRisk(job, cfg.clearanceSignals)) {
      penalty += pen.clearanceRisk;
      flags.push("clearance-risk");
      reasons.push("clearance likely required");
    }
  }

  if (ctx.userWorkAuth === "needs-sponsorship") {
    if (inferWorkAuthRisk(job, cfg.clearanceSignals)) {
      penalty += pen.workAuthRisk;
      flags.push("work-auth-risk");
      reasons.push("US work authorization / citizenship likely required");
    }
  }

  const score = Math.max(0, Math.round(base * (1 - penalty)));
  const t = cfg.fitTiers;
  const tier: FitTier = score >= t.excellent ? "excellent" : score >= t.good ? "good" : score >= t.stretch ? "stretch" : "poor";
  return { score, tier, reasons, matched: matchedCount, flags };
}

export function freshness(job: Doc<JobFM>, now: Date): Freshness {
  if (job.fm.status !== "active") return "low";
  const ref = new Date(String(job.fm.posted ?? job.fm.ingested));
  const days = (now.getTime() - ref.getTime()) / DAY;
  return days <= 21 ? "high" : days <= 45 ? "medium" : "low";
}

/* ── deterministic ranking comparator (ordering only; does not change the score) ── */
const FRESH_RANK: Record<string, number> = { high: 2, medium: 1, low: 0 };
const LEVEL_RANK: Record<string, number> = { entry: 3, early: 3, mid: 1, senior: 0, unknown: 2 };

export interface RankableJob {
  fit: { score: number; matched?: number };
  freshness: string;
  fm: { level: string; company: string };
}

export function compareJobs(a: RankableJob, b: RankableJob): number {
  if (b.fit.score !== a.fit.score) return b.fit.score - a.fit.score;
  const fr = (FRESH_RANK[b.freshness] ?? 0) - (FRESH_RANK[a.freshness] ?? 0);
  if (fr) return fr;
  const lv = (LEVEL_RANK[b.fm.level] ?? 0) - (LEVEL_RANK[a.fm.level] ?? 0);
  if (lv) return lv;
  const mc = (b.fit.matched ?? 0) - (a.fit.matched ?? 0);
  if (mc) return mc;
  return a.fm.company.localeCompare(b.fm.company);
}
