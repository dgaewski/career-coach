// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import Trends from "../src/views/Trends.js";
import { renderAt, mockFetch } from "./helpers.js";

const EMPTY = { exists: false, researched: null, updated: null, sources: [], staleness: "unknown", tracks: [] };

describe("Trends (Market Trends)", () => {
  it("shows an empty state when no research exists", async () => {
    mockFetch({ "/api/market": EMPTY, "/api/jobs": [], "/api/skills": [], "/api/companies": [] });
    renderAt(<Trends />);
    expect(await screen.findByText(/run/i)).toBeTruthy();
    expect(screen.getByText(/market-trends/)).toBeTruthy();
  });

  it("shows the run-the-command suggestion (not a raw error) when /api/market is unavailable", async () => {
    // No /api/market mock -> the fetch stub returns a 404, mirroring a coach server
    // started before the route existed.
    mockFetch({ "/api/jobs": [], "/api/skills": [], "/api/companies": [] });
    renderAt(<Trends />);
    expect(await screen.findByText(/No market research yet/i)).toBeTruthy();
    expect(screen.getByText(/Restart the dashboard server/i)).toBeTruthy();
    expect(screen.queryByText(/Failed to load/i)).toBeNull();
  });

  it("renders a scorecard row per track with derived 'your fit'", async () => {
    mockFetch({
      "/api/market": { exists: true, researched: "2026-06-01", updated: null, sources: [], staleness: "fresh", tracks: [
        { track: "robotics", trajectory: "rising", demand: 4, competition: "high", salary: { early: "$110k-135k" } },
        { track: "software", trajectory: "steady", demand: 5, competition: "high", salary: { early: "$120k-150k" } },
      ] },
      "/api/jobs": [
        { id: "a", fm: { status: "active", track: ["robotics"] }, fit: { score: 80 } },
        { id: "b", fm: { status: "active", track: ["robotics"] }, fit: { score: 90 } },
      ],
      "/api/skills": [], "/api/companies": [],
    });
    renderAt(<Trends />);
    await screen.findByTestId("scorecard");
    expect(screen.getByTestId("fit-robotics").textContent).toBe("85"); // median(80, 90)
    expect(screen.getByTestId("fit-software").textContent).toBe("—");   // no jobs → dash
  });

  it("renders a per-track section with linked skill chips and your-position", async () => {
    mockFetch({
      "/api/market": { exists: true, researched: "2026-06-01", updated: null, sources: ["https://bls.gov/x"], staleness: "fresh", tracks: [
        { track: "robotics", trajectory: "rising", headline: "Hot.", demand: 4, competition: "high",
          salary: { entry: "$85k", early: "$110k" }, coreSkills: ["ros2", "unknownskill"], emergingSkills: ["nav2"], fadingSkills: ["ros"],
          tailwinds: ["Warehouse capex"], headwinds: ["Margins"], hiring: ["Logistics"], hiringCompanies: ["Acme"],
          snapshot: "Demand up YoY. [1]", yourFit: "Strong; ROS 2 is the gap.", sources: ["https://ifr.org/y"] },
      ] },
      "/api/jobs": [{ id: "a", fm: { status: "active", track: ["robotics"] }, fit: { score: 80 } }],
      "/api/skills": [{ slug: "ros2", name: "ROS 2" }, { slug: "nav2", name: "Nav2" }, { slug: "ros", name: "ROS 1" }],
      "/api/companies": [{ name: "Acme" }],
    });
    renderAt(<Trends />);
    expect(await screen.findByText(/Demand up YoY/)).toBeTruthy();
    expect(screen.getByText("Warehouse capex")).toBeTruthy();
    expect(screen.getByText(/ROS 2 is the gap/)).toBeTruthy();
    expect(screen.getByText("ROS 2").closest("a")?.getAttribute("href")).toBe("/skills/ros2");
    expect(screen.getByText("unknownskill").closest("a")).toBeNull(); // unknown slug → plain text
    expect(screen.getByText("Acme").closest("a")?.getAttribute("href")).toBe("/companies/Acme");
  });

  it("sorts the scorecard by a column when its header is clicked", async () => {
    mockFetch({
      "/api/market": { exists: true, researched: "2026-06-01", updated: null, sources: [], staleness: "fresh", tracks: [
        { track: "robotics", demand: 4 },
        { track: "software", demand: 5 },
        { track: "ai-ml", demand: 3 },
      ] },
      "/api/jobs": [
        { id: "a", fm: { status: "active", track: ["robotics"] }, fit: { score: 80 } },
        { id: "b", fm: { status: "active", track: ["robotics"] }, fit: { score: 90 } }, // robotics median 85
        { id: "c", fm: { status: "active", track: ["ai-ml"] }, fit: { score: 60 } },    // ai-ml 60; software none
      ],
      "/api/skills": [], "/api/companies": [],
    });
    renderAt(<Trends />);
    await screen.findByTestId("scorecard");
    const order0 = screen.getAllByTestId(/^scorecard-row-/).map(r => r.getAttribute("data-testid"));
    expect(order0).toEqual(["scorecard-row-robotics", "scorecard-row-software", "scorecard-row-ai-ml"]); // authored order
    fireEvent.click(screen.getByTestId("sort-fit"));
    const order1 = screen.getAllByTestId(/^scorecard-row-/).map(r => r.getAttribute("data-testid"));
    expect(order1).toEqual(["scorecard-row-robotics", "scorecard-row-ai-ml", "scorecard-row-software"]); // desc, nulls last
  });

  it("scrolls to a track's section when its scorecard row is clicked", async () => {
    Element.prototype.scrollIntoView = vi.fn();
    mockFetch({
      "/api/market": { exists: true, researched: "2026-06-01", updated: null, sources: [], staleness: "fresh", tracks: [
        { track: "robotics", demand: 4, snapshot: "x" },
      ] },
      "/api/jobs": [], "/api/skills": [], "/api/companies": [],
    });
    renderAt(<Trends />);
    await screen.findByTestId("scorecard");
    expect(document.getElementById("track-robotics")).toBeTruthy();
    fireEvent.click(screen.getByTestId("scorecard-row-robotics"));
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it("color-keys each track (scorecard dot + section title in the track color)", async () => {
    mockFetch({
      "/api/market": { exists: true, researched: "2026-06-01", updated: null, sources: [], staleness: "fresh", tracks: [
        { track: "robotics", trajectory: "rising", demand: 4, headline: "x", coreSkills: ["ros2"] },
      ] },
      "/api/jobs": [], "/api/skills": [{ slug: "ros2", name: "ROS 2" }], "/api/companies": [],
    });
    renderAt(<Trends />);
    const dot = await screen.findByTestId("track-dot-robotics");
    expect(dot.style.background).toBe("rgb(122, 83, 242)");                 // robotics solid #7A53F2
    const h4 = document.getElementById("track-robotics")?.querySelector("h4");
    expect(h4?.style.color).toBe("rgb(122, 83, 242)");                      // title in the track color
  });

  it("renders dashes without crashing for missing/unknown scorecard values", async () => {
    mockFetch({
      "/api/market": { exists: true, researched: "2026-06-01", updated: null, sources: [], staleness: "fresh", tracks: [
        { track: "design" },                                                           // all fields missing
        { track: "weird", trajectory: "flat", competition: "extreme", demand: 4, salary: { early: "$1" } }, // unknown enums
      ] },
      "/api/jobs": [], "/api/skills": [], "/api/companies": [],
    });
    renderAt(<Trends />);
    await screen.findByTestId("scorecard");
    expect(screen.getByTestId("scorecard-row-design")).toBeTruthy();
    expect(screen.getByTestId("fit-design").textContent).toBe("—");
    expect(screen.getByTestId("scorecard-row-weird")).toBeTruthy(); // unknown trajectory/competition must not throw
    expect(screen.queryByText("Skills")).toBeNull();
  });
});
