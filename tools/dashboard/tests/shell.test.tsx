// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import App from "../src/App.js";
import { renderAt, mockFetch } from "./helpers.js";
import { SUMMARY } from "./fixtures.js";

describe("App shell", () => {
  it("renders wordmark, all 8 nav tabs, theme toggle, and live pill", async () => {
    mockFetch({ "/api/summary": SUMMARY, "/api/overview": {}, "/api/jobs": [], "/api/skills": [], "/api/errors": [] });
    renderAt(<App />, "/");
    expect(await screen.findByText("Career Coach")).toBeTruthy();
    for (const t of ["Overview","Morning Brief","Jobs","Tracker","Coach","Skills","Companies","Map"])
      expect(screen.getByRole("link", { name: t })).toBeTruthy();
    expect(screen.getByText("live")).toBeTruthy();
    expect(screen.getByLabelText(/theme/i)).toBeTruthy();
  });
});
