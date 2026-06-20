import { describe, it, expect } from "vitest";
import { geoOptions, trackOptions, trackColor } from "../src/lib/vocab.js";
import type { Summary } from "../src/lib/types.js";

const base = { generatedAt: "", activeJobs: 0, totalJobs: 0, staleFlipped: [], warnings: [], pipeline: {}, latestBrief: null };

describe("vocab", () => {
  it("derives geo + track options from summary.user", () => {
    const summary = { ...base, user: {
      name: "Ada", tracks: ["robotics", "ai-ml"],
      geoZones: [{ slug: "south-bay", label: "South Bay", score: 1, home: true }, { slug: "remote", label: "Remote", score: 1 }],
    } } as Summary;
    expect(geoOptions(summary).map(o => o.value)).toContain("south-bay");
    expect(geoOptions(summary).find(o => o.value === "south-bay")!.label).toBe("South Bay");
    expect(geoOptions(summary).map(o => o.value)).toEqual(expect.arrayContaining(["remote", "other"]));
    expect(trackOptions(summary).map(o => o.value)).toEqual(["robotics", "ai-ml"]);
  });
  it("falls back to the GEOS/TRACKS consts when summary.user is absent", () => {
    const summary = { ...base } as Summary;
    expect(geoOptions(summary).map(o => o.value)).toContain("ct-commutable");
    expect(trackOptions(summary).map(o => o.value)).toContain("software");
  });
  it("tolerates undefined summary", () => {
    expect(geoOptions(undefined).length).toBeGreaterThan(0);
    expect(trackOptions(undefined).length).toBeGreaterThan(0);
  });
  it("humanizes known track slugs (ai-ml → AI / ML, ee-hardware → EE / Hardware)", () => {
    const summary = { ...base, user: { name: "X", tracks: ["robotics", "ai-ml", "ee-hardware"], geoZones: [] } } as Summary;
    const labels = trackOptions(summary).map(o => o.label);
    expect(labels).toContain("Robotics");
    expect(labels).toContain("AI / ML");
    expect(labels).toContain("EE / Hardware");
  });
  it("falls back to capitalize for an unknown track slug", () => {
    const summary = { ...base, user: { name: "X", tracks: ["bioinformatics"], geoZones: [] } } as Summary;
    expect(trackOptions(summary)[0].label).toBe("Bioinformatics");
  });
  it("maps known tracks to their curated hex hue", () => {
    expect(trackColor("robotics").solid).toBe("#7A53F2");
    expect(trackColor("ai-ml").solid).toBe("#D6409F");
    expect(trackColor("ee-hardware").solid).toBe("#E0902E");
    expect(trackColor("software").solid).toBe("#159B8A");
  });
  it("resolves an unknown track deterministically", () => {
    const a = trackColor("icu");
    expect(a).toEqual(trackColor("icu"));            // stable per slug
    expect(a.solid).toMatch(/^(#|hsl)/);              // curated hex or generated hsl
    expect(a.gradient).toContain("linear-gradient");
    expect(a.soft).toMatch(/^(rgba|hsl)/);
  });
  it("gives a new user's custom tracks distinct colors for any count (>8)", () => {
    const tracks = ["icu","er","or","peds","onc","ed","picu","nicu","ccu","ld","pacu","tele"]; // 12 custom
    const solids = tracks.map(t => trackColor(t, tracks).solid);
    expect(new Set(solids).size).toBe(12);           // all distinct — no fixed-palette cap
    expect(trackColor("er", tracks)).toEqual(trackColor("er", tracks)); // stable for a given list
    for (const s of solids) expect(["#7A53F2", "#D6409F", "#E0902E", "#159B8A"]).not.toContain(s); // never a curated hue
  });
});
