import { describe, it, expect, beforeAll } from "vitest";
import { buildApp } from "../src/app.js";
import { DataStore } from "../src/store.js";
import { makeTempWiki } from "./helpers.js";

let app: Awaited<ReturnType<typeof buildApp>>;
beforeAll(async () => { const root = await makeTempWiki(); app = await buildApp(new DataStore(root), root); });

describe("GET /api/overview", () => {
  it("returns hero + freshness", async () => {
    const r = await app.inject({ method: "GET", url: "/api/overview" });
    expect(r.statusCode).toBe(200);
    const ov = r.json();
    expect(typeof ov.hero.activeRoles).toBe("number");
    expect(ov.freshness).toHaveProperty("fresh");
  });
});
describe("GET /api/keywords", () => {
  it("returns an array", async () => {
    const r = await app.inject({ method: "GET", url: "/api/keywords" });
    expect(r.statusCode).toBe(200);
    expect(Array.isArray(r.json())).toBe(true);
  });
});
