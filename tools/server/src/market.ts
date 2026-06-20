import { readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

export type Trajectory = "rising" | "steady" | "cooling";
export type Competition = "low" | "moderate" | "high" | "very-high";
export type Staleness = "fresh" | "aging" | "stale" | "unknown";

export interface MarketTrack {
  track: string;
  trajectory?: Trajectory;
  headline?: string;
  demand?: number;            // 1-5
  growthNote?: string;
  competition?: Competition;
  salary?: Record<string, string>;
  coreSkills?: string[];
  emergingSkills?: string[];
  fadingSkills?: string[];
  tailwinds?: string[];
  headwinds?: string[];
  hiring?: string[];
  hiringCompanies?: string[];
  snapshot?: string;
  yourFit?: string;
  sources?: string[];
}

export interface MarketTrends {
  exists: boolean;
  researched: string | null;
  updated: string | null;
  sources: string[];
  staleness: Staleness;
  tracks: MarketTrack[];
}

const EMPTY: MarketTrends = {
  exists: false, researched: null, updated: null, sources: [], staleness: "unknown", tracks: [],
};

function toDateStr(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.toISOString().slice(0, 10);
  return String(v);
}

function staleness(researched: string | null, now: Date): Staleness {
  if (!researched) return "unknown";
  const t = Date.parse(researched);
  if (Number.isNaN(t)) return "unknown";
  const days = (now.getTime() - t) / 86_400_000;
  if (days < 90) return "fresh";
  if (days < 180) return "aging";
  return "stale";
}

export async function assembleMarket(root: string, now: Date): Promise<MarketTrends> {
  let raw: string;
  try {
    raw = await readFile(path.join(root, "coach", "Market Trends.md"), "utf8");
  } catch {
    return { ...EMPTY };
  }
  const data = matter(raw).data as {
    researched?: string; updated?: string; sources?: string[];
    market?: { tracks?: MarketTrack[] };
  };
  const researched = toDateStr(data.researched);
  return {
    exists: true,
    researched,
    updated: toDateStr(data.updated),
    sources: Array.isArray(data.sources) ? data.sources : [],
    staleness: staleness(researched, now),
    tracks: (Array.isArray(data.market?.tracks) ? (data.market!.tracks as MarketTrack[]) : [])
      .filter((t): t is MarketTrack => !!t && typeof t.track === "string" && t.track.length > 0),
  };
}
