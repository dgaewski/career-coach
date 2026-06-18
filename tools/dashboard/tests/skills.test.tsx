// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import SkillCloud from "../src/views/SkillCloud.js";
import { renderAt, mockFetch } from "./helpers.js";
import { SKILLS, KEYWORDS, SKILL_DETAIL } from "./fixtures.js";

describe("SkillCloud page", () => {
  it("renders a skill term from the cloud when skills API is mocked", async () => {
    mockFetch({ "/api/skills": SKILLS, "/api/keywords": KEYWORDS });
    renderAt(
      <Routes>
        <Route path="/skills" element={<SkillCloud />} />
        <Route path="/skills/:slug" element={<SkillCloud />} />
      </Routes>,
      "/skills",
    );
    expect(await screen.findByText("ROS 2")).toBeTruthy();
  });

  it("swaps to keyword cloud when Keywords tab is clicked", async () => {
    mockFetch({ "/api/skills": SKILLS, "/api/keywords": KEYWORDS });
    renderAt(
      <Routes>
        <Route path="/skills" element={<SkillCloud />} />
        <Route path="/skills/:slug" element={<SkillCloud />} />
      </Routes>,
      "/skills",
    );
    // Wait for skills to load
    await screen.findByText("ROS 2");
    // Click the Keywords tab
    fireEvent.click(screen.getByRole("tab", { name: "Keywords" }));
    expect(await screen.findByText("perception")).toBeTruthy();
  });

  it("renders explorer with skill name and role link when navigated to /skills/:slug", async () => {
    mockFetch({
      "/api/skills": SKILLS,
      "/api/keywords": KEYWORDS,
      "/api/skills/ros2": SKILL_DETAIL,
    });
    renderAt(
      <Routes>
        <Route path="/skills" element={<SkillCloud />} />
        <Route path="/skills/:slug" element={<SkillCloud />} />
      </Routes>,
      "/skills/ros2",
    );
    // Cloud still present
    expect(await screen.findByText("ROS 2")).toBeTruthy();
    // Roles list shows the job title link to /jobs/:id
    const roleLink = await screen.findByRole("link", { name: /robot dev/i });
    expect(roleLink.getAttribute("href")).toBe("/jobs/acme-robot-dev");
    // Company is its own clickable link to the company page
    const companyLinks = screen.getAllByRole("link", { name: /^acme$/i });
    expect(companyLinks.some(l => l.getAttribute("href") === "/companies/Acme")).toBe(true);
  });
});
