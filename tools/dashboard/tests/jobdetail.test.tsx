// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import JobDetail from "../src/views/JobDetail.js";
import { renderAt, mockFetch } from "./helpers.js";
import { JOB_DETAIL, SUMMARY } from "./fixtures.js";

describe("JobDetail", () => {
  it("renders title, fit chips (stripped), and body HTML", async () => {
    mockFetch({
      "/api/jobs/acme-robot-dev": JOB_DETAIL,
      "/api/summary": SUMMARY,
      "/api/links": {},
    });
    renderAt(
      <Routes><Route path="/jobs/:id" element={<JobDetail />} /></Routes>,
      "/jobs/acme-robot-dev",
    );
    // title from fm.title
    expect(await screen.findByText("Robot Dev")).toBeTruthy();
    // "Why you fit" chip — stripped slug (rendered as "✓ ros2"), no "has " prefix
    expect(screen.getByText(/ros2/)).toBeTruthy();
    // "What's missing" chip — stripped slug (rendered as "+ cpp"), no "missing " prefix
    expect(screen.getByText(/cpp/)).toBeTruthy();
    // body HTML rendered
    expect(screen.getByText("About the role")).toBeTruthy();
  });

  it("shows View posting link only when url is present", async () => {
    mockFetch({
      "/api/jobs/acme-robot-dev": JOB_DETAIL,
      "/api/summary": SUMMARY,
      "/api/links": {},
    });
    renderAt(
      <Routes><Route path="/jobs/:id" element={<JobDetail />} /></Routes>,
      "/jobs/acme-robot-dev",
    );
    await screen.findByText("Robot Dev");
    expect(screen.getByRole("link", { name: /View posting/i })).toBeTruthy();
  });

  it("404 shows a not-found message", async () => {
    mockFetch({ "/api/summary": SUMMARY });
    renderAt(
      <Routes><Route path="/jobs/:id" element={<JobDetail />} /></Routes>,
      "/jobs/nope",
    );
    expect(await screen.findByText(/not found|Failed to load/i)).toBeTruthy();
  });

  it("apply button falls back to discovered-via when url is empty", async () => {
    mockFetch({
      "/api/jobs/x": { id: "x", name: "X", file: "jobs/X.md", freshness: "high", salaryMidpoint: null,
        fit: { score: 80, tier: "good", reasons: [], matched: 0 },
        fm: { title: "X", company: "C", geo: "remote", level: "early", track: ["software"], skills: [],
          "app-status": "none", url: "", "discovered-via": "https://co.com/careers", ingested: "2026-06-14" },
        html: "<p>x</p>" },
      "/api/summary": { generatedAt: "2026-06-14", activeJobs: 1, totalJobs: 1, staleFlipped: [], warnings: [], pipeline: {}, latestBrief: null },
      "/api/links": {},
    });
    renderAt(
      <Routes><Route path="/jobs/:id" element={<JobDetail />} /></Routes>,
      "/jobs/x",
    );
    const link = await screen.findByRole("link", { name: /careers page/i });
    expect(link.getAttribute("href")).toBe("https://co.com/careers");
  });

  it("apply button falls back when the canonical url is dead (404), not just empty", async () => {
    mockFetch({
      "/api/jobs/d": { id: "d", name: "D", file: "jobs/D.md", freshness: "high", salaryMidpoint: null,
        fit: { score: 70, tier: "good", reasons: [], matched: 0 },
        fm: { title: "D", company: "C", geo: "remote", level: "early", track: ["software"], skills: [],
          "app-status": "none", url: "https://co.com/jobs/dead-123", "discovered-via": "https://co.com/careers", ingested: "2026-06-14" },
        html: "<p>d</p>" },
      "/api/summary": { generatedAt: "2026-06-14", activeJobs: 1, totalJobs: 1, staleFlipped: [], warnings: [], pipeline: {}, latestBrief: null },
      "/api/links": { d: { status: "dead", checked: "2026-06-14" } },
    });
    renderAt(
      <Routes><Route path="/jobs/:id" element={<JobDetail />} /></Routes>,
      "/jobs/d",
    );
    // confirmed-dead canonical url → no "View posting"; falls back to the careers page
    expect(await screen.findByRole("link", { name: /careers page/i })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /view posting/i })).toBeNull();
  });
});
