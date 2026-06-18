import { describe, it, expect, beforeAll } from "vitest";
import { buildApp } from "../src/app.js";
import { DataStore } from "../src/store.js";
import { makeTempWiki } from "./helpers.js";

let app: Awaited<ReturnType<typeof buildApp>>;
beforeAll(async () => {
  const root = await makeTempWiki();
  app = await buildApp(new DataStore(root), root);
});

describe("GET /api/pages/*", () => {
  it("renders a coach page to HTML", async () => {
    const res = await app.inject({ method: "GET", url: `/api/pages/${encodeURIComponent("coach/Skill Gap Analysis")}` });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.title).toBe("Skill Gap Analysis");
    expect(body.html).toContain("Commentary");
  });
  it("renders analytics pages too", async () => {
    const res = await app.inject({ method: "GET", url: `/api/pages/${encodeURIComponent("analytics/Skill Cloud")}` });
    expect(res.statusCode).toBe(200);
  });
  it("rejects path traversal and out-of-allowlist dirs", async () => {
    expect((await app.inject({ method: "GET", url: `/api/pages/${encodeURIComponent("../tools/config")}` })).statusCode).toBe(400);
    expect((await app.inject({ method: "GET", url: `/api/pages/${encodeURIComponent("tools/config")}` })).statusCode).toBe(400);
  });
  it("rejects double-encoded traversal and null bytes", async () => {
    // %252e%252e → Fastify decodes %25→% giving %2e%2e → handler decodes to ..
    expect((await app.inject({ method: "GET", url: "/api/pages/%252e%252e/tools/config" })).statusCode).toBe(400);
    expect((await app.inject({ method: "GET", url: "/api/pages/coach%00evil" })).statusCode).toBe(400);
  });
  it("404s on missing page", async () => {
    expect((await app.inject({ method: "GET", url: `/api/pages/${encodeURIComponent("coach/Nope")}` })).statusCode).toBe(404);
  });
});
