// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import Coach from "../src/views/Coach.js";
import { renderAt, mockFetch } from "./helpers.js";
import { GAP, PROJECTS, BRIEFS, OVERVIEW } from "./fixtures.js";
import type { Job, Summary } from "../src/lib/types.js";

const mkJob = (id: string, score: number, appStatus: string, title: string, company: string): Job => ({
  id, name: `${company} — ${title}`, file: `jobs/${company} — ${title}.md`, freshness: "high", salaryMidpoint: null,
  fit: { score, tier: "good", reasons: [], matched: 0 },
  fm: { title, company, geo: "remote", level: "early", track: ["software"], skills: [],
    "app-status": appStatus, "app-history": [], ingested: "2026-06-14", status: "active" },
});

const ACTIVE_JOBS: Job[] = [
  mkJob("job-hi", 85, "none", "Top Role", "Alpha"),
  mkJob("job-lo", 60, "none", "Low Role", "Beta"),
];

const BASE_SUMMARY: Summary = {
  generatedAt: "2026-06-14T12:00:00Z", activeJobs: 2, totalJobs: 2, staleFlipped: [],
  warnings: [], pipeline: {}, latestBrief: null,
  user: { name: "Alex", tracks: ["robotics", "software", "ai-ml", "ee-hardware"], geoZones: [{ slug: "ct-commutable", label: "CT / Boston", score: 1, home: true }] },
};

describe("Coach", () => {
  it("renders profile html, ROI gap bars, project cards with closes-N, and briefs archive", async () => {
    mockFetch({
      "/api/gap": GAP,
      "/api/list/coach/projects": PROJECTS,
      "/api/list/coach/briefs": [{ name: "2026-06-10 Batch Brief", fm: { type: "brief" } }, { name: "2026-06-14b Batch Brief", fm: { type: "brief" } }],
      "/api/list/coach/advice": [{ name: "Resume and ATS Strategy", fm: { type: "advice", researched: "2026-06-10" }, gist: "Parse cleanly, match keywords." }],
      "/api/todos": [{ text: "Publish projects", done: false }, { text: "Old thing", done: true }],
      "/api/jobs": ACTIVE_JOBS,
      "/api/overview": OVERVIEW,
      "/api/summary": BASE_SUMMARY,
    });
    renderAt(<Coach />);

    // Identity card renders; full profile (skills-with-evidence) is its own page
    expect(await screen.findByText("Alex")).toBeTruthy();
    expect(screen.getByText(/full profile/i).closest("a")?.getAttribute("href")).toBe("/page/Profile");

    // Open to-dos surface in the "Do" lane (the standalone to-dos card was removed as a duplicate)
    expect(screen.getByText("Publish projects")).toBeTruthy();

    // ROI gap bar shows gap name (may appear in both This Week and gap bars)
    expect(screen.getAllByText("ROS 2").length).toBeGreaterThan(0);

    // gap row shows the role-demand count (GAP[0].count = 1), NOT closedBy.length
    expect(screen.getByText(/^1 role$/)).toBeTruthy();
    // and the "closed by" project hint when closedBy is non-empty (GAP[0].closedBy = ["Arm Migration"])
    expect(screen.getByText(/closed by Arm Migration/i)).toBeTruthy();

    // Project card renders with name
    expect(screen.getByText("Arm Migration")).toBeTruthy();

    // Project "closes N gaps" chip — PROJECTS[0].closes has 2 entries
    expect(screen.getByText(/closes 2 gaps/i)).toBeTruthy();

    // Newest brief links to /brief, older brief links to /page/<name>
    const newestBrief = screen.getByText("2026-06-14b Batch Brief").closest("a");
    expect(newestBrief?.getAttribute("href")).toBe("/brief");
    const oldBrief = screen.getByText("2026-06-10 Batch Brief").closest("a");
    expect(oldBrief?.getAttribute("href")).toBe("/page/2026-06-10%20Batch%20Brief");

    // Project card links to a BARE page name (PageView resolves the dir itself)
    const projLink = screen.getByText("Arm Migration").closest("a");
    expect(projLink?.getAttribute("href")).toBe("/page/Arm%20Migration");

    // Advice gist text shows
    expect(screen.getByText(/Parse cleanly, match keywords/i)).toBeTruthy();

    // This week card renders
    expect(screen.getByText(/this week/i)).toBeTruthy();
    expect(screen.getByText(/Apply/i)).toBeTruthy();

    // Track readiness meter shows highest-readiness track
    expect(screen.getAllByText(/EE \/ Hardware/i).length).toBeGreaterThan(0);
  });

  it("renders wiki-backed advice rows when the advice list is non-empty", async () => {
    mockFetch({
      "/api/gap": GAP,
      "/api/list/coach/projects": PROJECTS,
      "/api/list/coach/briefs": BRIEFS,
      "/api/list/coach/advice": [{ name: "Negotiation", fm: { researched: "2026-06-01" } }],
      "/api/todos": [],
      "/api/jobs": [],
      "/api/overview": OVERVIEW,
      "/api/summary": BASE_SUMMARY,
    });
    renderAt(<Coach />);
    expect(await screen.findByText("Negotiation")).toBeTruthy();
    const adviceLink = screen.getByText("Negotiation").closest("a");
    expect(adviceLink?.getAttribute("href")).toBe("/page/Negotiation");
  });

  it("renders gap-track pills from the user's tracks (not a hardcoded list)", async () => {
    const customSummary: Summary = {
      ...BASE_SUMMARY,
      user: { name: "Alex", tracks: ["robotics", "ee-hardware"], geoZones: [{ slug: "ct-commutable", label: "CT / Boston", score: 1, home: true }] },
    };
    mockFetch({
      "/api/gap": GAP,
      "/api/list/coach/projects": PROJECTS,
      "/api/list/coach/briefs": BRIEFS,
      "/api/list/coach/advice": [],
      "/api/todos": [],
      "/api/jobs": [],
      "/api/overview": OVERVIEW,
      "/api/summary": customSummary,
    });
    renderAt(<Coach />);
    // Pills should reflect the user's tracks from summary, not the hardcoded list.
    // Use role=button to target pill buttons specifically (not incidental text in subtitles).
    expect(await screen.findByRole("button", { name: /robotics/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /ee \/ hardware/i })).toBeTruthy();
    // "ai-ml" and "software" are NOT in user.tracks, so no pill for them (only "All" + the two tracks)
    expect(screen.queryByRole("button", { name: /^ai \/ ml$/i })).toBeFalsy();
    expect(screen.queryByRole("button", { name: /^software$/i })).toBeFalsy();
  });
});
