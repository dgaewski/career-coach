import { describe, it, expect } from "vitest";
import { applyPicks, readinessRows, suggestedTodos } from "../src/lib/coachDerive.js";
import type { GapEntry, Job, ListedPage } from "../src/lib/types.js";

const mk = (id: string, score: number, appStatus: string, company = "C"): Job => ({
  id, name: id, file: `jobs/${id}.md`, freshness: "high", salaryMidpoint: null,
  fit: { score, tier: "good", reasons: [], matched: 0 },
  fm: { title: id, company, geo: "remote", level: "early", track: ["software"], skills: [],
    "app-status": appStatus, "app-history": [], ingested: "2026-06-14", status: "active" },
});

const proj = (name: string, status: string): ListedPage => ({ name, fm: { status } });
const adv = (name: string, researched: string): ListedPage => ({ name, fm: { researched } });
const gap = (slug: string, name: string, roi: number): GapEntry =>
  ({ slug, name, count: roi, share: 0, trend: "stable", roi, closedBy: [] });

const NOW = Date.parse("2026-06-14T12:00:00Z");

describe("coachDerive", () => {
  it("applyPicks: shortlisted-not-applied first, then top fits, max 3, excludes funnel", () => {
    const jobs = [mk("low", 60, "none"), mk("short", 70, "interested"), mk("hi", 95, "none"), mk("applied", 99, "applied")];
    const picks = applyPicks(jobs);
    expect(picks.map(p => p.id)).toEqual(["short", "hi", "low"]);   // interested first, then fit-desc; applied excluded
  });
  it("readinessRows sorts tracks by readiness desc and formats pct", () => {
    const rows = readinessRows({ "ee-hardware": 0.72, software: 0.45, robotics: 0.5, "ai-ml": 0.6 });
    expect(rows[0].track).toBe("ee-hardware");
    expect(rows[0].pct).toBe(72);
    expect(rows[rows.length - 1].track).toBe("software");
  });

  describe("suggestedTodos", () => {
    it("ships in-flight projects (capped at 2) and preps interview-stage jobs", () => {
      const s = suggestedTodos({
        projects: [proj("Arm", "in-progress"), proj("DSA", "idea"), proj("SDR", "in-progress")],
        jobs: [mk("j1", 90, "interview", "Cyvl"), mk("j2", 80, "interested")],
        nowMs: NOW, max: 3,
      });
      expect(s.map(x => x.text)).toEqual(["Ship Arm", "Publish DSA", "Prep Cyvl interview"]);
      expect(s[0].to).toBe("/page/Arm");
    });

    it("flags advice researched over six months ago, not recent advice", () => {
      const s = suggestedTodos({
        advice: [adv("Old Playbook", "2025-11-01"), adv("Fresh Tips", "2026-06-01")],
        nowMs: NOW,
      });
      expect(s.map(x => x.text)).toEqual(["Re-verify Old Playbook"]);
    });

    it("falls back to the top-ROI gap only when nothing else is actionable", () => {
      const s = suggestedTodos({
        gaps: [gap("sql", "SQL", 40), gap("ros2", "ROS 2", 100)],
        nowMs: NOW,
      });
      expect(s).toEqual([{ text: "Start ROS 2", to: "/skills/ros2", tag: "Study" }]);
    });

    it("returns nothing when there is nothing to do", () => {
      expect(suggestedTodos({ nowMs: NOW })).toEqual([]);
    });
  });
});
