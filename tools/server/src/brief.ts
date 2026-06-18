import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import type { DataStore, JobRecord } from "./store.js";

interface OverviewLike {
  hero: { activeRoles: number; strongFits: number; inPipeline: number; topMatch: number };
  pipeline: { interview: number; offer: number };
  freshness: { fresh: number; recent: number; stale: number };
  demandByTrack: Record<string, number>;
  wordCloud: { name: string; count: number; have: boolean; trend: string }[];
  changes: unknown; indexedAt: string;
}

interface AuthoredBlock {
  kicker?: string; headline?: string; byline?: string; lead?: string[];
  pullStat?: { number: string; label: string };
  threeRoles?: { job: string; why: string }[]; nudge?: string;
}

async function readAuthored(root: string): Promise<AuthoredBlock | null> {
  try {
    const dir = path.join(root, "coach", "briefs");
    const files = (await readdir(dir)).filter(f => f.endsWith(".md")).sort();
    if (!files.length) return null;
    const raw = await readFile(path.join(dir, files[files.length - 1]), "utf8");
    const block = (matter(raw).data as { brief?: AuthoredBlock }).brief;
    return block ?? null;
  } catch { return null; }
}

function topFits(jobs: JobRecord[], n: number) {
  return jobs.filter(j => j.fm.status === "active").sort((a, b) => b.fit.score - a.fit.score).slice(0, n);
}

export async function assembleBrief(store: DataStore, now: Date, briefCount: number) {
  const ov = await store.overview() as unknown as OverviewLike;
  const jobs = await store.jobs();
  const gaps = await store.gap() as { name: string; roi: number }[];
  const meta = await store.meta();
  const who = meta.user?.name || "you";
  const topTrack = Object.entries(ov.demandByTrack).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "robotics";
  const topGap = [...gaps].sort((a, b) => b.roi - a.roi)[0];
  const three = topFits(jobs, 3).map(j => ({ id: j.id, title: String(j.fm.title), company: String(j.fm.company), why: `fit ${j.fit.score}` }));
  const base = {
    masthead: { vol: String(briefCount || 1), no: jobs.length, date: now.toISOString().slice(0, 10), indexedAt: ov.indexedAt },
    lead: {
      kicker: "Lead · Market",
      headline: `${ov.hero.activeRoles} active roles, top match ${ov.hero.topMatch}`,
      byline: `Career Intelligence · prepared for ${who}`,
      paragraphs: [
        `The market shows ${ov.hero.activeRoles} active roles with ${ov.hero.strongFits} strong fits (≥80). ${topTrack} leads demand.`,
        `${(ov.changes as { newRoles: unknown[] }).newRoles.length} new roles since the last index; ${ov.hero.inPipeline} in your pipeline.`,
      ],
      pullStat: { number: String(ov.hero.topMatch), label: "Top match" },
    },
    threeRoles: three,
    overnight: ov.changes,
    ledger: { active: ov.hero.activeRoles, strongFits: ov.hero.strongFits, inPipeline: ov.hero.inPipeline,
              interviews: ov.pipeline.interview, offers: ov.pipeline.offer },
    freshness: ov.freshness,
    nudge: topGap ? `Close your top gap: ${topGap.name}` : "Keep ingesting batches to sharpen the signal.",
    inDemand: ov.wordCloud.slice(0, 12).map(s => ({ name: s.name, count: s.count, have: s.have, trend: s.trend })),
    source: "templated" as const,
  };
  const authored = await readAuthored(store.root);
  if (!authored) return base;
  const resolved: typeof base.threeRoles = [];
  for (const r of authored.threeRoles ?? []) {
    const j = await store.jobById(r.job);
    if (j) resolved.push({ id: j.id, title: String(j.fm.title), company: String(j.fm.company), why: r.why });
  }
  // Back-fill from the top fits in order, skipping any already resolved (no index drift, no dupes).
  for (const b of base.threeRoles) {
    if (resolved.length >= 3) break;
    if (!resolved.some(x => x.id === b.id)) resolved.push(b);
  }
  return {
    ...base,
    lead: {
      ...base.lead,
      kicker: authored.kicker ?? base.lead.kicker,
      headline: authored.headline ?? base.lead.headline,
      byline: authored.byline ?? base.lead.byline,
      paragraphs: authored.lead ?? base.lead.paragraphs,
      pullStat: authored.pullStat ?? base.lead.pullStat,
    },
    threeRoles: resolved,
    nudge: authored.nudge ?? base.nudge,
    source: "authored" as const,
  };
}
