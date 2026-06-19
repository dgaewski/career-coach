// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Jobs from "../src/views/Jobs.js";
import { renderAt, mockFetch } from "./helpers.js";
import { JOB_A, JOBS, SKILLS } from "./fixtures.js";

describe("Jobs", () => {
  it("lists jobs, shows the filtered count, and links cards to detail", async () => {
    mockFetch({ "/api/jobs": JOBS, "/api/skills": SKILLS, "/api/links": {} });
    renderAt(<Jobs />);
    expect(await screen.findByText("Robot Dev")).toBeTruthy();
    expect(screen.getByText("Firmware Eng")).toBeTruthy();
    expect(screen.getByText(/Showing 2 of 2/i)).toBeTruthy();
    const card = screen.getByText("Robot Dev").closest("a");
    expect(card?.getAttribute("href")).toBe("/jobs/acme-robot-dev");
  });

  it("re-sorts live when the Sort control changes", async () => {
    mockFetch({ "/api/jobs": JOBS, "/api/skills": SKILLS, "/api/links": {} });
    renderAt(<Jobs />);
    await screen.findByText("Robot Dev");
    fireEvent.click(screen.getByRole("tab", { name: "Salary" }));
    // JOB_A has salary 110000, JOB_B null -> A first under salary sort
    const titles = screen.getAllByTestId("job-title").map(n => n.textContent);
    expect(titles[0]).toBe("Robot Dev");
  });

  it("renders calibration flag chips on a job card", async () => {
    const { JobCard } = await import("../src/components/JobCard.js");
    const job = {
      ...JOB_A,
      fit: { score: 76, tier: "stretch" as const, reasons: [], matched: 1, flags: ["below-floor", "clearance-risk"] },
    };
    render(<MemoryRouter><JobCard job={job} /></MemoryRouter>);
    expect(screen.getByText(/below floor/i)).toBeTruthy();
    expect(screen.getByText(/clearance/i)).toBeTruthy();
  });

  it("shows an InterestButton on each card", async () => {
    mockFetch({
      "/api/jobs": [
        { id: "a", name: "A", file: "jobs/A.md", freshness: "high", salaryMidpoint: null,
          fit: { score: 90, tier: "excellent", reasons: [], matched: 0 },
          fm: { title: "Role A", company: "Acme", geo: "remote", level: "early", track: ["software"], skills: [], location: "Boston, MA", "app-status": "none", ingested: "2026-06-14" } },
        { id: "b", name: "B", file: "jobs/B.md", freshness: "high", salaryMidpoint: null,
          fit: { score: 70, tier: "good", reasons: [], matched: 0 },
          fm: { title: "Role B", company: "Beta", geo: "ct-commutable", level: "early", track: ["robotics"], skills: [], location: "Hartford, CT", "app-status": "none", ingested: "2026-06-14" } },
      ],
      "/api/skills": [],
      "/api/links": {},
    });
    renderAt(<Jobs />);
    await screen.findByText("Role A");
    expect(screen.getAllByRole("button", { name: /shortlist/i }).length).toBe(2);
  });

  it("renders user-defined geo zones in the Location filter (not the hardcoded enum)", async () => {
    mockFetch({
      "/api/jobs": JOBS,
      "/api/skills": SKILLS,
      "/api/links": {},
      "/api/summary": {
        generatedAt: "2026-06-14T00:00:00Z", activeJobs: 2, totalJobs: 2,
        staleFlipped: [], warnings: [], pipeline: {}, latestBrief: null,
        user: {
          name: "Alex",
          tracks: ["robotics", "software"],
          geoZones: [{ slug: "south-bay", label: "South Bay", score: 1 }],
        },
      },
    });
    renderAt(<Jobs />);
    await screen.findByText("Robot Dev");
    expect(await screen.findByText(/South Bay/i)).toBeTruthy();
  });
});
