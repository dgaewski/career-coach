import { describe, it, expect } from "vitest";
import { buildApp } from "../src/app.js";
import { DataStore } from "../src/store.js";
import { assembleMarket } from "../src/market.js";
import { makeTempWiki } from "./helpers.js";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

async function writeMarket(root: string, body: string): Promise<void> {
  await mkdir(path.join(root, "coach"), { recursive: true });
  await writeFile(path.join(root, "coach", "Market Trends.md"), body, "utf8");
}

describe("GET /api/market", () => {
  it("returns empty when coach/Market Trends.md is absent", async () => {
    const root = await makeTempWiki();
    const app = await buildApp(new DataStore(root), root);
    const m = (await app.inject({ method: "GET", url: "/api/market" })).json();
    expect(m.exists).toBe(false);
    expect(m.tracks).toEqual([]);
    expect(m.staleness).toBe("unknown");
  });

  it("drops track entries that lack a track key", async () => {
    const root = await makeTempWiki();
    await writeMarket(root,
`---
type: market-trends
researched: 2026-06-01
market:
  tracks:
    - track: robotics
      trajectory: rising
    - trajectory: cooling
---
`);
    const m = await assembleMarket(root, new Date("2026-06-19"));
    expect(m.tracks).toHaveLength(1);
    expect(m.tracks[0].track).toBe("robotics");
  });

  it("coerces a non-array sources value to an empty array", async () => {
    const root = await makeTempWiki();
    await writeMarket(root, `---\nresearched: 2026-06-01\nsources: "https://bls.gov/x"\nmarket:\n  tracks: []\n---\n`);
    const m = await assembleMarket(root, new Date("2026-06-19"));
    expect(m.sources).toEqual([]);
  });

  it("parses the market: block", async () => {
    const root = await makeTempWiki();
    await writeMarket(root,
`---
type: market-trends
researched: 2026-06-01
updated: 2026-06-02
sources: ["https://bls.gov/x"]
market:
  tracks:
    - track: robotics
      trajectory: rising
      demand: 4
      competition: high
      salary: { early: "$110k-135k" }
      coreSkills: [ros2, cpp]
      snapshot: "Up YoY. [1]"
      yourFit: "Strong; ROS 2 is the gap."
---
## Notes
mine
`);
    const app = await buildApp(new DataStore(root), root);
    const m = (await app.inject({ method: "GET", url: "/api/market" })).json();
    expect(m.exists).toBe(true);
    expect(m.tracks).toHaveLength(1);
    expect(m.tracks[0].track).toBe("robotics");
    expect(m.tracks[0].trajectory).toBe("rising");
    expect(m.tracks[0].coreSkills).toEqual(["ros2", "cpp"]);
    expect(m.sources[0]).toContain("bls.gov");
    expect(m.researched).toBe("2026-06-01");
    expect(m.updated).toBe("2026-06-02");
  });

  it("treats an unparseable researched date as unknown", async () => {
    const root = await makeTempWiki();
    await writeMarket(root, `---\nresearched: "not a date"\nmarket:\n  tracks: []\n---\n`);
    expect((await assembleMarket(root, new Date("2026-06-19"))).staleness).toBe("unknown");
  });

  it("computes staleness from researched date", async () => {
    const root = await makeTempWiki();
    await writeMarket(root, `---\nresearched: 2026-01-01\nmarket:\n  tracks: []\n---\n`);
    expect((await assembleMarket(root, new Date("2026-02-01"))).staleness).toBe("fresh"); // 31d
    expect((await assembleMarket(root, new Date("2026-04-15"))).staleness).toBe("aging"); // ~104d
    expect((await assembleMarket(root, new Date("2026-09-01"))).staleness).toBe("stale"); // >180d
  });
});
