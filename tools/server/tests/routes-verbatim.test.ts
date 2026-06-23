import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { buildApp } from "../src/app.js";
import { DataStore } from "../src/store.js";
import { makeTempWiki } from "./helpers.js";

let app: Awaited<ReturnType<typeof buildApp>>;
let root: string;
beforeAll(async () => {
  root = await makeTempWiki();
  // Append a verbatim posting section to an existing fixture job; the route re-reads the file per request.
  const file = path.join(root, "jobs", "Acme — Robot Dev.md");
  const raw = await readFile(file, "utf8");
  await writeFile(file, raw + "\n\n## Posting (verbatim)\n\nWe are hiring a robot developer. Build robots.\n", "utf8");
  app = await buildApp(new DataStore(root), root);
});
afterAll(async () => { await rm(root, { recursive: true, force: true }); });

describe("GET /api/jobs/:id verbatim", () => {
  it("splits out postingHtml and sets postingCaptured", async () => {
    const r = await app.inject({ method: "GET", url: "/api/jobs/acme-robot-dev" });
    expect(r.statusCode).toBe(200);
    const j = r.json();
    expect(j.html).not.toContain("Posting (verbatim)");
    expect(j.postingHtml).toContain("robot developer");
    expect(j.postingCaptured).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("omits postingHtml for a job with no verbatim section", async () => {
    const r = await app.inject({ method: "GET", url: "/api/jobs/gamma-mystery" });
    expect(r.statusCode).toBe(200);
    expect(r.json().postingHtml).toBeUndefined();
  });
});
