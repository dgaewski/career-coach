export interface Config {
  stalenessDays: number;
  fitWeights: { skills: number; geo: number; level: number; track: number };
  fitTiers: { excellent: number; good: number; stretch: number };
  levelScores: Record<string, number>;
  demandTiers: { highDemand: number; common: number; occasional: number };
  salarySanityUsd: { min: number; max: number };
  keywordWeight: number;
  relatedHave?: Record<string, Record<string, number>>;
  fitTuning?: {
    tierWeights: Record<DemandTier, number>;
    shrinkK: number;
    depthBonusPer: number;
    depthBonusCap: number;
  };
  penalties?: { belowFloor: number; clearanceRisk: number; workAuthRisk: number };
  pivotBoost?: number;
  clearanceSignals?: { clearanceKeywords: string[]; workAuthKeywords: string[]; companies: string[] };
}

export interface PageError { file: string; reason: string }

export interface GeoZone { slug: string; label: string; score: number; home?: boolean }

export interface UserProfile {
  name: string;
  tracks: string[];
  levelBand: string[];
  employmentTypes: string[];
  exclude: string[];
  resumeVersion: string;
  geoZones: GeoZone[];
  // Optional — carried in USER.md but not consumed until Phase 1b:
  compFloor?: number;
  compTarget?: number;
  workAuth?: string;
  clearance?: string;
  workMode?: string[];
  relocate?: string;
  positioning?: string;
  pivot?: { from: string; into: string[] };
}

export interface JobFM {
  type: "job"; title: string; company: string; location?: string;
  address?: string; geo: string; track: string[]; level: string;
  salary?: string; url?: string; "discovered-via"?: string;
  employment?: string; source?: string; posted?: string; ingested: string;
  status: "active" | "stale" | "closed";
  "app-status": string; "app-updated"?: string; "app-history"?: string[];
  "rejection-stage"?: string; "rejection-reason"?: string;
  skills: string[]; keywords?: string[];
}

export interface SkillFM {
  type: "skill"; slug: string; aliases?: string[]; category?: string;
  have: boolean; evidence?: string;
}

export interface CompanyFM { type: "company"; hq?: string; industry?: string; "careers-url"?: string }
export interface ProjectFM { type: "project"; status: string; closes: string[]; repo?: string }

export interface Doc<F> { file: string; name: string; fm: F; body: string }

export interface WikiScan {
  jobs: Doc<JobFM>[]; skills: Doc<SkillFM>[];
  companies: Doc<CompanyFM>[]; projects: Doc<ProjectFM>[];
  errors: PageError[];
}

export type Trend = "rising" | "stable" | "declining";
export type DemandTier = "high-demand" | "common" | "occasional" | "rare";
export type FitTier = "excellent" | "good" | "stretch" | "poor";
export type Freshness = "high" | "medium" | "low";

export interface SkillStats {
  slug: string; name: string; have: boolean; count: number; share: number;
  tier: DemandTier; byTrack: Record<string, number>; byGeo: Record<string, number>;
  byLevel: Record<string, number>; keywordCount: number; trend: Trend;
}

export interface FitResult { score: number; tier: FitTier; reasons: string[]; matched: number; flags: string[] }

export interface GapEntry {
  slug: string; name: string; count: number; share: number; trend: Trend;
  roi: number; closedBy: string[];
  byTrack?: Record<string, { count: number; share: number; roi: number }>;
}

export interface CompanyStats {
  name: string; active: number; total: number; avgSalary: number | null;
  remoteShare: number; levels: Record<string, number>; repeatPoster: boolean;
}

export interface MapPlace { place: string; lat: number; lng: number; count: number; jobs: string[] }
export interface MapData { places: MapPlace[]; remoteCount: number; otherCount: number; warnings: string[] }

export interface ChangeSet {
  newRoles:    { id: string; title: string; company: string }[];
  fitImproved: { id: string; title: string; from: number; to: number }[];
  fitDeclined: { id: string; title: string; from: number; to: number }[];
  staleFlipped:{ id: string; title: string }[];
}
export interface Snapshot { [id: string]: { fit: number; status: string } }

export interface Overview {
  hero: { activeRoles: number; strongFits: number; inPipeline: number; topMatch: number; topMatchId: string | null };
  pipeline: { interested: number; applied: number; interview: number; offer: number; rejected: number };
  freshness: { fresh: number; recent: number; stale: number };
  fitSpread: { excellent: number; good: number; stretch: number; poor: number };
  demandByTrack: Record<string, number>;
  wordCloud: { slug: string; name: string; count: number; tier: string; have: boolean; trend: Trend }[];
  changes: ChangeSet;
  indexedAt: string;
  trackReadiness: Record<string, number>;
}
