import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeFile, mkdir, readFile } from "node:fs/promises";
import { loadConfig, loadPlaces } from "./config.js";
import { loadUser } from "./user.js";
import { scanWiki } from "./scan.js";
import { buildResolver } from "./aliases.js";
import { applyStaleness } from "./staleness.js";
import { computeSkillDemand } from "./counts.js";
import { computeMomentum } from "./momentum.js";
import { computeFit, freshness } from "./fit.js";
import { computeGap } from "./gap.js";
import { computeCompanies } from "./companies.js";
import { computeMap } from "./mapdata.js";
import { computeTimeline } from "./timeline.js";
import { parseSalaryMidpoint, salaryWarnings } from "./salary.js";
import { emitJson, renderSkillCloud, renderCompanies, renderLocations, renderFitRanking, renderTrends, injectGapBlock } from "./emit.js";
import { slugify } from "./slug.js";
import { buildSnapshot, diffSnapshot } from "./changes.js";
import { computeOverview } from "./overview.js";
import type { Snapshot } from "./types.js";

/**
 * Calibration-drift detector. Flags (never auto-changes) when the strong-fit
 * share leaves the healthy band — too high = under-discriminating, too low =
 * over-discriminating — so the owner re-runs calibration when it makes sense.
 * Quiet on corpora too small (<20 active) to judge.
 */
export function calibrationDriftWarning(
  strong: number, active: number, band: { min: number; max: number },
): string | null {
  if (active < 20) return null;
  const pct = Math.round((strong / active) * 100);
  const lo = Math.round(band.min * 100), hi = Math.round(band.max * 100);
  if (pct > hi) return `fit calibration: ${pct}% of active roles are strong fits (target ${lo}–${hi}%) — under-discriminating; consider raising fitTiers.excellent in tools/config.json and re-indexing`;
  if (pct < lo) return `fit calibration: only ${pct}% of active roles are strong fits (target ${lo}–${hi}%) — consider lowering fitTiers.excellent in tools/config.json and re-indexing`;
  return null;
}

export async function runIndexer(root: string, now: Date): Promise<void> {
  const toolsDir = path.join(root, "tools");
  const cfg = loadConfig(toolsDir);
  const places = loadPlaces(root);
  const user = loadUser(root);
  const zoneSlugs = new Set(user.geoZones.filter(z => z.slug !== "remote").map(z => z.slug));
  const geoScores = Object.fromEntries(user.geoZones.map(z => [z.slug, z.score]));
  const targetTracks = new Set(user.tracks);
  const scan = await scanWiki(root);
  const resolver = buildResolver(scan.skills);

  const flipped = await applyStaleness(scan.jobs, now, cfg.stalenessDays);

  const { stats, warnings: countWarnings } = computeSkillDemand(scan.jobs, resolver, cfg.demandTiers);
  const momentum = computeMomentum(scan.jobs, resolver);
  for (const s of stats) s.trend = momentum.get(s.slug)?.trend ?? "stable";

  const warnings: string[] = [...countWarnings, ...resolver.collisions];

  const tierBySlug = new Map(stats.map(s => [s.slug, s.tier] as const));
  const fitCtx = {
    tierOf: (slug: string) => tierBySlug.get(slug) ?? ("common" as const),
    relatedHave: cfg.relatedHave ?? {},
    geoScores,
    targetTracks,
    compFloor: user.compFloor,
    userClearance: user.clearance,
    userWorkAuth: user.workAuth,
  };

  const seenIds = new Map<string, number>();
  const jobRecords = scan.jobs.map(j => {
    let id = slugify(j.name);
    const n = seenIds.get(id) ?? 0;
    seenIds.set(id, n + 1);
    if (n > 0) { id = `${id}-${n + 1}`; warnings.push(`duplicate job id "${slugify(j.name)}" — suffixed as ${id}`); }
    return {
      id, name: j.name, file: path.relative(root, j.file).split(path.sep).join("/"), fm: j.fm,
      fit: computeFit(j, resolver, cfg, fitCtx), freshness: freshness(j, now),
      salaryMidpoint: parseSalaryMidpoint(j.fm.salary),
    };
  });
  const trackTotals: Record<string, number> = {};
  for (const j of scan.jobs) if (j.fm.status === "active") for (const t of j.fm.track) trackTotals[t] = (trackTotals[t] ?? 0) + 1;
  const gaps = computeGap(stats, scan.projects, cfg.keywordWeight, trackTotals, user.pivot?.into ?? [], cfg.pivotBoost ?? 1.2);
  const companies = computeCompanies(scan.jobs);
  const map = computeMap(scan.jobs, places, zoneSlugs);
  const timeline = computeTimeline(scan.jobs);
  const salWarnings = salaryWarnings(
    jobRecords.filter(j => j.salaryMidpoint !== null).map(j => ({ file: j.file, midpoint: j.salaryMidpoint! })),
    cfg.salarySanityUsd,
  );
  const emptyFitNotes = scan.jobs.filter(j => !/##\s*Fit notes\s*\n+\s*\S/.test(j.body)).map(j => `empty Fit notes: ${path.basename(j.file)}`);
  const validGeos = new Set([...zoneSlugs, "remote", "other"]);
  const geoWarnings = scan.jobs
    .filter(j => j.fm.status === "active" && !validGeos.has(j.fm.geo))
    .map(j => `geo "${j.fm.geo}" not a defined zone: ${path.basename(j.file)}`);
  warnings.push(...map.warnings, ...salWarnings, ...emptyFitNotes, ...geoWarnings);

  const dataDir = path.join(root, "data");
  let prior: Snapshot = {};
  try { prior = JSON.parse(await readFile(path.join(dataDir, "snapshot.json"), "utf8")); } catch { /* first run */ }
  const flippedIds = new Set(jobRecords.filter(j => flipped.some(f => path.basename(f) === path.basename(j.file))).map(j => j.id));
  const changes = diffSnapshot(prior, jobRecords, flippedIds);
  const overview = computeOverview(jobRecords, stats, { changes }, now, user.tracks);
  const activeRecs = jobRecords.filter(j => j.fm.status === "active");
  const drift = calibrationDriftWarning(
    activeRecs.filter(j => j.fit.tier === "excellent").length, activeRecs.length,
    cfg.fitTuning?.strongFitBand ?? { min: 0.12, max: 0.30 });
  if (drift) warnings.push(drift);
  const keywordCounts = new Map<string, number>();
  for (const j of scan.jobs) if (j.fm.status === "active") for (const k of (j.fm.keywords ?? [])) keywordCounts.set(k, (keywordCounts.get(k) ?? 0) + 1);
  const keywords = [...keywordCounts.entries()].map(([term, count]) => ({ term, count })).sort((a, b) => b.count - a.count);

  await emitJson(dataDir, "jobs.json", jobRecords);
  await emitJson(dataDir, "skills.json", stats.map(s => ({ ...s, series: momentum.get(s.slug)?.series ?? [] })));
  await emitJson(dataDir, "companies.json", companies);
  await emitJson(dataDir, "gap.json", gaps);
  await emitJson(dataDir, "map.json", map);
  await emitJson(dataDir, "timeline.json", timeline);
  await emitJson(dataDir, "errors.json", scan.errors);
  await emitJson(dataDir, "meta.json", {
    generatedAt: now.toISOString(),
    activeJobs: scan.jobs.filter(j => j.fm.status === "active").length,
    totalJobs: scan.jobs.length,
    staleFlipped: flipped.map(f => path.basename(f)),
    user: { name: user.name, tracks: user.tracks, geoZones: user.geoZones, relocate: user.relocate, positioning: user.positioning },
    warnings,
  });
  await emitJson(dataDir, "overview.json", overview);
  await emitJson(dataDir, "keywords.json", keywords);
  await emitJson(dataDir, "snapshot.json", buildSnapshot(jobRecords));

  const analyticsDir = path.join(root, "analytics");
  await mkdir(analyticsDir, { recursive: true });
  const active = jobRecords.filter(j => j.fm.status === "active");
  await writeFile(path.join(analyticsDir, "Skill Cloud.md"), renderSkillCloud(stats, now), "utf8");
  await writeFile(path.join(analyticsDir, "Companies Hiring.md"), renderCompanies(companies, now), "utf8");
  await writeFile(path.join(analyticsDir, "Locations.md"), renderLocations(map, now), "utf8");
  await writeFile(path.join(analyticsDir, "Fit Ranking.md"), renderFitRanking(active, now), "utf8");
  await writeFile(path.join(analyticsDir, "Trends.md"), renderTrends(stats, now), "utf8");
  await injectGapBlock(path.join(root, "coach", "Skill Gap Analysis.md"), gaps);

  console.log(`indexed ${scan.jobs.length} jobs (${active.length} active), ${stats.length} skills; ` +
    `${flipped.length} staled; ${warnings.length} warnings; ${scan.errors.length} errors`);
}

// CLI entry: wiki root = argv[2] or parent of tools/
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const root = process.argv[2] ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
  runIndexer(path.resolve(root), new Date()).catch(e => { console.error(e); process.exit(1); });
}
