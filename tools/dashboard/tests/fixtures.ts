export const JOB_A = {
  id: "acme-robot-dev", name: "Acme — Robot Dev", file: "jobs/Acme — Robot Dev.md",
  fm: {
    type: "job", title: "Robot Dev", company: "Acme", location: "Boston, MA", geo: "boston-metro",
    track: ["robotics"], level: "early", salary: "$100k–$120k", url: "https://acme.test/j1",
    ingested: "2026-06-01", status: "active", "app-status": "applied", "app-history": ["2026-06-05 applied"],
    skills: ["ros2", "cpp"], keywords: [],
  },
  fit: { score: 90, tier: "excellent" as const, reasons: ["has ros2", "missing cpp", "geo boston-metro (1)", "level early (1)"], matched: 2, flags: [] as string[] },
  freshness: "high" as const, salaryMidpoint: 110000,
};
export const JOB_B = {
  id: "beta-firmware-eng", name: "Beta — Firmware Eng", file: "jobs/Beta — Firmware Eng.md",
  fm: {
    type: "job", title: "Firmware Eng", company: "Beta", location: "Hartford, CT", geo: "ct-commutable",
    track: ["ee-hardware"], level: "entry", ingested: "2026-05-01", status: "active",
    "app-status": "rejected", "app-history": ["2026-05-10 applied", "2026-06-01 rejected"],
    "rejection-stage": "screening", skills: ["c"], keywords: [],
  },
  fit: { score: 55, tier: "stretch" as const, reasons: ["missing c", "geo ct-commutable (1)", "level entry (1)"], matched: 1, flags: [] as string[] },
  freshness: "low" as const, salaryMidpoint: null,
};
export const JOBS = [JOB_A, JOB_B];
export const SUMMARY = {
  generatedAt: "2026-06-12T12:00:00Z", activeJobs: 2, totalJobs: 2, staleFlipped: [],
  warnings: ["w1"], pipeline: { applied: 1, rejected: 1 }, latestBrief: "coach/briefs/2026-06-10 Batch Brief",
  user: { name: "Alex", tracks: ["robotics", "software", "ai-ml", "ee-hardware"], geoZones: [{ slug: "ct-commutable", label: "CT / Boston", score: 1, home: true }] },
};
export const SKILLS = [
  { slug: "ros2", name: "ROS 2", have: false, count: 1, share: 0.5, tier: "high-demand",
    byTrack: { robotics: 1 }, byGeo: { "boston-metro": 1 }, byLevel: { early: 1 },
    keywordCount: 0, trend: "rising", series: [{ month: "2026-05", share: 0.2 }, { month: "2026-06", share: 0.5 }] },
  { slug: "c", name: "C", have: true, count: 1, share: 0.5, tier: "common",
    byTrack: { "ee-hardware": 1 }, byGeo: { "ct-commutable": 1 }, byLevel: { entry: 1 },
    keywordCount: 0, trend: "stable", series: [{ month: "2026-06", share: 0.5 }] },
];
export const GAP = [{ slug: "ros2", name: "ROS 2", count: 1, share: 0.5, trend: "rising", roi: 100, closedBy: ["Arm Migration"] }];
export const COMPANIES = [
  { name: "Acme", active: 1, total: 1, avgSalary: 110000, remoteShare: 0,   levels: { early: 1 }, repeatPoster: false },
  { name: "Beta", active: 2, total: 5, avgSalary: 90000,  remoteShare: 0.5, levels: { entry: 2 }, repeatPoster: true  },
];
export const MAPDATA = {
  places: [{ place: "Boston, MA", lat: 42.36, lng: -71.06, count: 1, jobs: ["Acme — Robot Dev"] }],
  remoteCount: 1, otherCount: 0, warnings: [],
};
export const TIMELINE = [{ month: "2026-06", interested: 0, applied: 1, interview: 0, offer: 0, rejected: 1 }];
export const ERRORS = [{ file: "jobs/Broken.md", reason: "bad frontmatter" }];
export const JOB_DETAIL = { ...JOB_A, html: "<h2>About the role</h2><p>Build robots.</p>" };
export const KEYWORDS = [{ term: "perception", count: 3 }, { term: "autonomy", count: 1 }];
export const SKILL_DETAIL = { ...SKILLS[0], jobs: JOBS };   // ros2 detail with jobs
export const PROFILE_PAGE = { title: "Profile", html: "<h2>Who I am</h2><p>ECE engineer pivoting to robotics.</p>" };
export const PROJECTS = [
  { name: "Arm Migration", fm: { status: "in-progress", closes: ["ros2", "moveit2"] } },
  { name: "DSA Comparison", fm: { status: "idea", closes: ["algorithms"] } },
];
export const BRIEFS = [{ name: "2026-06-10 Batch Brief", fm: { type: "brief" } }];
export const OVERVIEW = {
  hero: { activeRoles: 20, strongFits: 6, inPipeline: 2, topMatch: 94, topMatchId: "acme-robot-dev" },
  pipeline: { interested: 1, applied: 1, interview: 0, offer: 0, rejected: 1 },
  freshness: { fresh: 12, recent: 5, stale: 3 },
  fitSpread: { excellent: 6, good: 8, stretch: 4, poor: 2 },
  demandByTrack: { robotics: 6, software: 4, "ai-ml": 7, "ee-hardware": 4 },
  momentum: {
    weekly: { direction: "rising", pct: 18, span: "6 wk", series: [{ bucket: "2026-W20", count: 2 }, { bucket: "2026-W24", count: 5 }] },
    monthly: { direction: "stable", pct: 0, span: "1 mo", series: [{ bucket: "2026-06", count: 20 }] },
  },
  wordCloud: [{ slug: "ros2", name: "ROS 2", count: 6, tier: "high-demand", have: false, trend: "rising" }],
  changes: { newRoles: [], fitImproved: [], fitDeclined: [], staleFlipped: [] },
  indexedAt: "2026-06-13T12:00:00Z",
  trackReadiness: { "ee-hardware": 0.72, software: 0.45, robotics: 0.5, "ai-ml": 0.6 },
};
export const BRIEF = {
  masthead: { vol: "1", no: 20, date: "2026-06-13", indexedAt: "2026-06-13T12:00:00Z" },
  lead: {
    kicker: "Lead · Market",
    headline: "Boston's 128 belt is where you compete today",
    byline: "Career Intelligence · prepared for Alex",
    paragraphs: ["The market is dense with robotics roles.", "Your fit is strongest in embedded test."],
    pullStat: { number: "94", label: "New top match" },
  },
  threeRoles: [{ id: "acme-robot-dev", title: "Robot Dev", company: "Acme", why: "test-equipment domain match" }],
  overnight: { newRoles: [{ id: "n1", title: "New Role", company: "NewCo" }], fitImproved: [], fitDeclined: [], staleFlipped: [] },
  ledger: { active: 20, strongFits: 6, inPipeline: 2, interviews: 0, offers: 0 },
  freshness: { fresh: 12, recent: 5, stale: 3 },
  nudge: "Verify the Lila residency window this week.",
  inDemand: [{ name: "ROS 2", count: 6, have: false, trend: "rising" }],
  source: "templated",
};
