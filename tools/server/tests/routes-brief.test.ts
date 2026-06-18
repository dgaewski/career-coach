import { describe, it, expect, beforeAll } from "vitest";
import { buildApp } from "../src/app.js";
import { DataStore } from "../src/store.js";
import { makeTempWiki } from "./helpers.js";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

let app: Awaited<ReturnType<typeof buildApp>>;
beforeAll(async () => { const root = await makeTempWiki(); app = await buildApp(new DataStore(root), root); });

describe("GET /api/brief", () => {
  it("returns a structured brief with masthead, lead, ledger", async () => {
    const r = await app.inject({ method: "GET", url: "/api/brief" });
    expect(r.statusCode).toBe(200);
    const b = r.json();
    expect(b.masthead).toHaveProperty("no");
    expect(typeof b.lead.headline).toBe("string");
    expect(b.ledger).toHaveProperty("active");
    expect(["authored", "templated"]).toContain(b.source);
    expect(Array.isArray(b.threeRoles)).toBe(true);
  });

  it("uses authored brief: frontmatter when present", async () => {
    const root = await makeTempWiki();
    await mkdir(path.join(root, "coach", "briefs"), { recursive: true });
    await writeFile(path.join(root, "coach", "briefs", "2026-06-11 Batch Brief.md"),
`---
type: brief
brief:
  kicker: "Lead · Authored"
  headline: "An authored headline"
  byline: "By the coach"
  lead: ["Para one.", "Para two."]
  pullStat: { number: "99", label: "Custom" }
  threeRoles: []
  nudge: "Do the thing."
---
Body prose.
`, "utf8");
    const app2 = await buildApp(new DataStore(root), root);
    const b = (await app2.inject({ method: "GET", url: "/api/brief" })).json();
    expect(b.source).toBe("authored");
    expect(b.lead.headline).toBe("An authored headline");
    expect(b.lead.paragraphs).toEqual(["Para one.", "Para two."]);
    expect(b.nudge).toBe("Do the thing.");
    // authored threeRoles is empty -> back-filled from top fits to up to 3
    expect(b.threeRoles.length).toBeGreaterThan(0);
  });

  it("falls back to templated values for fields the authored block omits", async () => {
    const root = await makeTempWiki();
    await mkdir(path.join(root, "coach", "briefs"), { recursive: true });
    await writeFile(path.join(root, "coach", "briefs", "2026-06-11 Batch Brief.md"),
`---
type: brief
brief:
  headline: "Only a headline"
---
Body prose.
`, "utf8");
    const app2 = await buildApp(new DataStore(root), root);
    const b = (await app2.inject({ method: "GET", url: "/api/brief" })).json();
    expect(b.source).toBe("authored");
    expect(b.lead.headline).toBe("Only a headline");
    // omitted fields fall back to the templated base (not undefined)
    expect(b.lead.kicker).toBe("Lead · Market");
    expect(b.lead.pullStat).toHaveProperty("number");
    expect(typeof b.nudge).toBe("string");
    expect(b.nudge.length).toBeGreaterThan(0);
  });
});
