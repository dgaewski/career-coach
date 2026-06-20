// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import Overview from "../src/views/Overview.js";
import { renderAt, mockFetch } from "./helpers.js";
import { SUMMARY, OVERVIEW, MARKET } from "./fixtures.js";

const BRIEF = {};

function hrefOfCard(label: string): string | null | undefined {
  return screen.getByText(label).closest("a")?.getAttribute("href");
}

describe("Overview", () => {
  it("renders hero stats, market momentum, and word cloud", async () => {
    mockFetch({ "/api/summary": SUMMARY, "/api/overview": OVERVIEW, "/api/brief": BRIEF, "/api/jobs": [], "/api/market": MARKET });
    renderAt(<Overview />);
    expect(await screen.findByText("Good morning, Alex.")).toBeTruthy();
    expect(screen.getByText(String(OVERVIEW.hero.topMatch))).toBeTruthy();
    expect(screen.getByText("ROS 2")).toBeTruthy();
    // momentum now reflects market trajectory (2 rising / 0 cooling → Rising), not ingest volume
    expect(screen.getByText("Rising")).toBeTruthy();
  });

  it("derives the market direction from /api/market trajectories", async () => {
    const cooling = { ...MARKET, tracks: [
      { track: "robotics", trajectory: "cooling", demand: 2 },
      { track: "software", trajectory: "cooling", demand: 2 },
      { track: "ai-ml", trajectory: "rising", demand: 5 },
    ] };
    mockFetch({ "/api/summary": SUMMARY, "/api/overview": OVERVIEW, "/api/brief": BRIEF, "/api/jobs": [], "/api/market": cooling });
    renderAt(<Overview />);
    expect(await screen.findByText("Cooling")).toBeTruthy();
  });

  it("nudges /market-trends when no research exists (no restart hint)", async () => {
    const empty = { exists: false, researched: null, updated: null, sources: [], staleness: "unknown", tracks: [] };
    mockFetch({ "/api/summary": SUMMARY, "/api/overview": OVERVIEW, "/api/brief": BRIEF, "/api/jobs": [], "/api/market": empty });
    renderAt(<Overview />);
    expect(await screen.findByText("Good morning, Alex.")).toBeTruthy();
    expect(screen.getByText(/market-trends/)).toBeTruthy();
    expect(screen.queryByText(/Restart/i)).toBeNull();   // fresh instance: pure call-to-action, no server hint
  });

  it("suggests the command (not a raw error) when /api/market is unavailable, with a restart hint", async () => {
    // No /api/market mock -> the stub 404s, mirroring a coach server started before the route existed.
    mockFetch({ "/api/summary": SUMMARY, "/api/overview": OVERVIEW, "/api/brief": BRIEF, "/api/jobs": [] });
    renderAt(<Overview />);
    expect(await screen.findByText("Good morning, Alex.")).toBeTruthy();
    expect(screen.getByText(/market-trends/)).toBeTruthy();
    expect(screen.getByText(/Restart/i)).toBeTruthy();
    expect(screen.queryByText(/Failed to load|HTTP 404/i)).toBeNull();
  });

  it("makes the hero cards and momentum card clickable to their views", async () => {
    mockFetch({ "/api/summary": SUMMARY, "/api/overview": OVERVIEW, "/api/brief": BRIEF, "/api/jobs": [], "/api/market": MARKET });
    renderAt(<Overview />);
    await screen.findByText("Good morning, Alex.");
    expect(hrefOfCard("Active roles")).toBe("/jobs");
    expect(hrefOfCard("Strong fits")).toBe("/coach");
    expect(hrefOfCard("In pipeline")).toBe("/tracker");
    expect(hrefOfCard("Market momentum")).toBe("/trends");
  });

  it("does not crash when fitSpread is missing (graceful)", async () => {
    const { fitSpread, ...noSpread } = OVERVIEW;   // simulate a stale API missing the 5a field
    mockFetch({ "/api/overview": noSpread, "/api/summary": SUMMARY, "/api/jobs": [], "/api/brief": BRIEF });
    renderAt(<Overview />);
    expect(await screen.findByText("Good morning, Alex.")).toBeTruthy();   // renders, no white-screen
  });

  it("To-review lane nudges top fits when nothing is shortlisted", async () => {
    mockFetch({
      "/api/overview": OVERVIEW, "/api/summary": SUMMARY, "/api/brief": BRIEF,
      "/api/jobs": [
        { id: "a", name: "A", file: "jobs/A.md", freshness: "high", salaryMidpoint: null,
          fit: { score: 95, tier: "excellent", reasons: [], matched: 0 },
          fm: { title: "Top Role", company: "Acme", geo: "remote", level: "early", track: ["software"], skills: [], keywords: [], location: "Boston, MA", "app-status": "none", "app-history": [], ingested: "2026-06-14", status: "active" } },
      ],
    });
    renderAt(<Overview />);
    expect(await screen.findByText(/top fits/i)).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /shortlist/i }).length).toBeGreaterThan(0);
  });

  it("To-review lane keeps top-fit candidates visible after one is shortlisted", async () => {
    const mk = (id: string, title: string, score: number, appStatus: string): unknown => ({
      id, name: id.toUpperCase(), file: `jobs/${id}.md`, freshness: "high", salaryMidpoint: null,
      fit: { score, tier: "excellent", reasons: [], matched: 0 },
      fm: { title, company: "Acme", geo: "remote", level: "early", track: ["software"], skills: [], keywords: [],
        location: "Boston, MA", "app-status": appStatus, "app-history": [], ingested: "2026-06-14", status: "active" },
    });
    mockFetch({
      "/api/overview": OVERVIEW, "/api/summary": SUMMARY, "/api/brief": BRIEF,
      // one already shortlisted + two un-shortlisted candidates
      "/api/jobs": [mk("a", "Shortlisted Role", 95, "interested"), mk("b", "Candidate B", 90, "none"), mk("c", "Candidate C", 85, "none")],
    });
    renderAt(<Overview />);
    // the shortlisted role shows AND the candidates remain selectable (don't vanish)
    expect(await screen.findByText("Shortlisted Role")).toBeTruthy();
    expect(screen.getByText("Candidate B")).toBeTruthy();
    expect(screen.getByText("Candidate C")).toBeTruthy();
    expect(screen.getByText(/1 shortlisted/i)).toBeTruthy();
  });
});
