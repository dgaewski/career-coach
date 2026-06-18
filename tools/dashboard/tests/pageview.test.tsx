// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import PageView from "../src/views/PageView.js";
import { renderAt, mockFetch } from "./helpers.js";

const PAGE = (fm: Record<string, unknown>) => ({
  "/api/jobs": [], "/api/skills": [], "/api/companies": [],
  "/api/pages/coach/advice/Resume%20and%20ATS%20Strategy": { title: "Resume and ATS Strategy", html: "<p>body</p>", fm },
});

describe("PageView", () => {
  it("shows a back link and advice sources", async () => {
    mockFetch(PAGE({ type: "advice", researched: "2026-06-10", sources: ["https://example.com/a"] }));
    renderAt(<Routes><Route path="/page/:name" element={<PageView />} /></Routes>, "/page/Resume and ATS Strategy");
    expect(await screen.findByText(/back to coach/i)).toBeTruthy();   // coach page → coach breadcrumb
    expect(screen.getByText(/sources/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: /example\.com/i })).toBeTruthy();
  });
  it("flags advice researched over 6 months ago", async () => {
    mockFetch(PAGE({ type: "advice", researched: "2020-01-01", sources: [] }));
    renderAt(<Routes><Route path="/page/:name" element={<PageView />} /></Routes>, "/page/Resume and ATS Strategy");
    expect(await screen.findByText(/re-verify/i)).toBeTruthy();
  });
  it("uses a generic Back link for non-coach (e.g. analytics) pages", async () => {
    mockFetch({ "/api/jobs": [], "/api/skills": [], "/api/companies": [],
      "/api/pages/analytics/Trends": { title: "Trends", html: "<p>t</p>", fm: { type: "analytics" } } });
    renderAt(<Routes><Route path="/page/:name" element={<PageView />} /></Routes>, "/page/Trends");
    expect(await screen.findByText("← Back")).toBeTruthy();
    expect(screen.queryByText(/back to coach/i)).toBeNull();
  });
});
