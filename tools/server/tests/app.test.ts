import { describe, it, expect, beforeAll } from "vitest";
import { buildApp } from "../src/app.js";
import { DataStore } from "../src/store.js";
import { makeTempWiki } from "./helpers.js";

describe("buildApp", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeAll(async () => {
    const root = await makeTempWiki();
    app = await buildApp(new DataStore(root), root);
  });
  it("responds to health check", async () => {
    const res = await app.inject({ method: "GET", url: "/api/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });
});
