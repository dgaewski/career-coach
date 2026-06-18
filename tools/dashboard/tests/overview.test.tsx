// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import Overview from "../src/views/Overview.js";
import { renderAt, mockFetch } from "./helpers.js";
import { SUMMARY, OVERVIEW } from "./fixtures.js";

const BRIEF = {};

describe("Overview", () => {
  it("renders hero stats, pipeline, momentum toggle, and word cloud", async () => {
    mockFetch({ "/api/summary": SUMMARY, "/api/overview": OVERVIEW, "/api/brief": BRIEF, "/api/jobs": [] });
    renderAt(<Overview />);
    expect(await screen.findByText("Good morning, Alex.")).toBeTruthy();
    expect(screen.getByText(String(OVERVIEW.hero.topMatch))).toBeTruthy();
    expect(screen.getByText("ROS 2")).toBeTruthy();
    fireEvent.click(screen.getByText("Monthly"));   // momentum toggle works
    expect(screen.getByRole("tab", { name: "Monthly" }).getAttribute("aria-selected")).toBe("true");
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
