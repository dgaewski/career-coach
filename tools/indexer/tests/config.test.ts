import { describe, it, expect } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig, loadPlaces } from "../src/config.js";

const here = path.dirname(fileURLToPath(import.meta.url)); // __dirname is unavailable in ESM
const fixtureTools = path.join(here, "fixtures", "wiki", "tools");

describe("config", () => {
  it("loads config.json with expected keys", () => {
    const c = loadConfig(fixtureTools);
    expect(c.stalenessDays).toBe(45);
    expect(c.fitWeights.skills).toBeCloseTo(0.5);
    expect(c.keywordWeight).toBeCloseTo(0.5);
  });
  it("loads places.json from the wiki root", () => {
    const p = loadPlaces(path.join(here, "fixtures", "wiki"));
    expect(p["Boston, MA"][0]).toBeCloseTo(42.3601);
  });
});

describe("config tuning fields", () => {
  it("loads relatedHave and fitTuning from the fixture config", () => {
    const cfg = loadConfig(path.join(here, "fixtures", "wiki", "tools"));
    expect(cfg.relatedHave?.ros2?.ros).toBe(0.5);
    expect(cfg.fitTuning?.shrinkK).toBe(2);
    expect(cfg.fitTuning?.tierWeights["high-demand"]).toBe(1.0);
  });
  it("loads penalties, pivotBoost, and clearanceSignals", () => {
    const cfg = loadConfig(path.join(here, "fixtures", "wiki", "tools"));
    expect(cfg.penalties?.belowFloor).toBe(0.10);
    expect(cfg.penalties?.clearanceRisk).toBe(0.12);
    expect(cfg.penalties?.workAuthRisk).toBe(0.12);
    expect(cfg.pivotBoost).toBe(1.2);
    expect(cfg.clearanceSignals?.clearanceKeywords).toContain("secret clearance");
    expect(cfg.clearanceSignals?.workAuthKeywords).toContain("U.S. citizenship");
    expect(cfg.clearanceSignals?.companies).toContain("Anduril");
  });
});
