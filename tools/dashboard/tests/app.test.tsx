// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import App from "../src/App.js";
import { renderAt, mockFetch } from "./helpers.js";
import { SUMMARY, JOBS, SKILLS, COMPANIES } from "./fixtures.js";

describe("App", () => {
  it("renders the shell", async () => {
    mockFetch({});
    renderAt(<App />);
    // Error state shows the run-the-indexer hint (summary fetch fails → empty state)
    expect(await screen.findByText(/npm run coach/)).toBeTruthy();
  });
  it("shows nav with all eight views when the API is up", async () => {
    mockFetch({ "/api/summary": SUMMARY });
    renderAt(<App />);
    for (const label of ["Overview", "Morning Brief", "Jobs", "Tracker", "Coach", "Skills", "Companies", "Map"]) {
      expect(await screen.findByRole("link", { name: label })).toBeTruthy();
    }
  });
  it("PageView redirects known job names to the job route", async () => {
    mockFetch({
      "/api/summary": SUMMARY, "/api/jobs": JOBS, "/api/skills": SKILLS, "/api/companies": COMPANIES,
      "/api/jobs/acme-robot-dev": { ...JOBS[0], html: "<p>x</p>" },   // real JobDetail (Task 7) uses this
    });
    renderAt(<App />, `/page/${encodeURIComponent("Acme — Robot Dev")}`);
    // Matches the Task-4 stub marker, the old job.name, or the real JobDetail fm.title (Phase 4c B2+).
    expect(await screen.findByText(/JobDetail:acme-robot-dev|Acme — Robot Dev|Robot Dev/)).toBeTruthy();
  });
  it("PageView renders coach pages by trying allowlisted dirs", async () => {
    mockFetch({
      "/api/summary": SUMMARY, "/api/jobs": JOBS, "/api/skills": SKILLS, "/api/companies": COMPANIES,
      "/api/pages/coach/Goals": { title: "Goals", html: "<p>goal body</p>" },
    });
    renderAt(<App />, "/page/Goals");
    expect(await screen.findByText("goal body")).toBeTruthy();
  });
});
