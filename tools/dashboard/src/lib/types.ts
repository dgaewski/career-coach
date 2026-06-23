export type FitTier = "excellent" | "good" | "stretch" | "poor";
export type Freshness = "high" | "medium" | "low";
export type Trend = "rising" | "stable" | "declining";
export type DemandTier = "high-demand" | "common" | "occasional" | "rare";

export interface JobFM {
  title: string; company: string; location?: string; address?: string; geo: string;
  track: string[]; level: string; salary?: string; url?: string; employment?: string;
  posted?: string; ingested: string; status: string;
  "app-status": string; "app-updated"?: string; "app-history": string[];
  "rejection-stage"?: string; "rejection-reason"?: string;
  skills: string[]; keywords?: string[];
  [key: string]: unknown;
}
export interface Job {
  id: string; name: string; file: string; fm: JobFM;
  fit: { score: number; tier: FitTier; reasons: string[]; matched: number; flags?: string[] };
  freshness: Freshness; salaryMidpoint: number | null;
}
export type JobDetail = Job & { html: string; postingHtml?: string; postingCaptured?: string };

export interface Skill {
  slug: string; name: string; have: boolean; count: number; share: number; tier: DemandTier;
  byTrack: Record<string, number>; byGeo: Record<string, number>; byLevel: Record<string, number>;
  keywordCount: number; trend: Trend; series: { month: string; share: number }[];
}
export type SkillDetail = Skill & { jobs: Job[] };

export interface GapEntry { slug: string; name: string; count: number; share: number; trend: Trend; roi: number; closedBy: string[]; byTrack?: Record<string, { count: number; share: number; roi: number }> }
export interface Company {
  name: string; active: number; total: number; avgSalary: number | null;
  remoteShare: number; levels: Record<string, number>; repeatPoster: boolean;
  hq?: string; industry?: string; size?: string; careersUrl?: string;
  domain?: string; founded?: number; logo?: string | null;
}
export interface MapPlace { place: string; lat: number; lng: number; count: number; jobs: string[] }
export interface MapData { places: MapPlace[]; remoteCount: number; otherCount: number; warnings: string[] }
export interface TimelineMonth { month: string; interested: number; applied: number; interview: number; offer: number; rejected: number }
export interface GeoZone { slug: string; label: string; score: number; home?: boolean }
export interface Summary {
  generatedAt: string; activeJobs: number; totalJobs: number; staleFlipped: string[]; warnings: string[];
  pipeline: Record<string, number>; latestBrief: string | null;
  user?: { name: string; tracks: string[]; geoZones: GeoZone[]; positioning?: string; relocate?: string };
}
export interface PageError { file: string; reason: string }
export interface Page { title: string; html: string; fm?: Record<string, unknown> }
export interface ListedPage { name: string; fm: Record<string, unknown>; gist?: string }

export const TRACKS = ["robotics", "software", "ai-ml", "ee-hardware"] as const;
export const GEOS = ["ct-commutable", "boston-metro", "new-england", "remote", "other"] as const;
export const LEVELS = ["entry", "early", "mid", "senior", "unknown"] as const;
export const APP_STATUSES = ["interested", "applied", "interview", "offer", "rejected"] as const;
export const REJECTION_STAGES = ["screening", "oa", "phone", "onsite", "offer-declined"] as const;

export const FLAG_LABEL: Record<string, string> = { "below-floor": "below floor", "clearance-risk": "clearance", "work-auth-risk": "work auth" };

export interface ChangeSet {
  newRoles: { id: string; title: string; company: string }[];
  fitImproved: { id: string; title: string; from: number; to: number }[];
  fitDeclined: { id: string; title: string; from: number; to: number }[];
  staleFlipped: { id: string; title: string }[];
}
export interface Overview {
  hero: { activeRoles: number; strongFits: number; inPipeline: number; topMatch: number; topMatchId: string | null };
  pipeline: { interested: number; applied: number; interview: number; offer: number; rejected: number };
  freshness: { fresh: number; recent: number; stale: number };
  fitSpread: { excellent: number; good: number; stretch: number; poor: number };
  demandByTrack: Record<string, number>;
  wordCloud: { slug: string; name: string; count: number; tier: string; have: boolean; trend: Trend }[];
  changes: ChangeSet; indexedAt: string;
  trackReadiness?: Record<string, number>;   // track → demand-weighted have-share (0–1)
}
export interface Keyword { term: string; count: number }
export interface Brief {
  masthead: { vol: string; no: number; date: string; indexedAt: string };
  lead: { kicker: string; headline: string; byline: string; paragraphs: string[]; pullStat: { number: string; label: string } };
  threeRoles: { id: string; title: string; company: string; why: string }[];
  overnight: ChangeSet;
  ledger: { active: number; strongFits: number; inPipeline: number; interviews: number; offers: number };
  freshness: { fresh: number; recent: number; stale: number };
  nudge: string;
  inDemand: { name: string; count: number; have: boolean; trend: Trend }[];
  source: "authored" | "templated";
}

export type LinkStatus = "live" | "dead" | "redirected" | "none" | "unverified";
export interface LinkInfo { status: LinkStatus; finalUrl?: string; checked: string }
export type LinksMap = Record<string, LinkInfo>;   // jobId → link info

export interface MarketTrack {
  track: string;
  trajectory?: "rising" | "steady" | "cooling";
  headline?: string;
  demand?: number;
  growthNote?: string;
  competition?: "low" | "moderate" | "high" | "very-high";
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
  staleness: "fresh" | "aging" | "stale" | "unknown";
  tracks: MarketTrack[];
}
