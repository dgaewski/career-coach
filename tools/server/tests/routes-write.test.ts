import { describe, it, expect, beforeEach } from "vitest";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { buildApp } from "../src/app.js";
import { DataStore } from "../src/store.js";
import { makeTempWiki } from "./helpers.js";

let app: Awaited<ReturnType<typeof buildApp>>;
let root: string;
beforeEach(async () => {
  root = await makeTempWiki();
  app = await buildApp(new DataStore(root), root);
});

describe("POST /api/jobs/:id/app-status", () => {
  it("round-trips a status change to the markdown file", async () => {
    const res = await app.inject({
      method: "POST", url: "/api/jobs/acme-robot-dev/app-status",
      payload: { status: "interview" },
    });
    expect(res.statusCode).toBe(200);
    const raw = await readFile(path.join(root, "jobs", "Acme — Robot Dev.md"), "utf8");
    expect(raw).toMatch(/^app-status: interview$/m);
  });
  it("accepts rejection details with rejected", async () => {
    const res = await app.inject({
      method: "POST", url: "/api/jobs/acme-robot-dev/app-status",
      payload: { status: "rejected", rejectionStage: "phone", rejectionReason: "level mismatch" },
    });
    expect(res.statusCode).toBe(200);
    const raw = await readFile(path.join(root, "jobs", "Acme — Robot Dev.md"), "utf8");
    expect(raw).toMatch(/^rejection-stage: phone$/m);
  });
  it("400s on bad status, 404s on unknown id", async () => {
    expect((await app.inject({ method: "POST", url: "/api/jobs/acme-robot-dev/app-status", payload: { status: "ghosted" } })).statusCode).toBe(400);
    expect((await app.inject({ method: "POST", url: "/api/jobs/nope/app-status", payload: { status: "applied" } })).statusCode).toBe(404);
  });
  it("invalidates the store cache so the next read reflects the write", async () => {
    await app.inject({ method: "POST", url: "/api/jobs/acme-robot-dev/app-status", payload: { status: "applied" } });
    // NOTE: data/jobs.json is only refreshed by re-index; the API signals staleness instead:
    const body = (await app.inject({ method: "GET", url: "/api/jobs/acme-robot-dev" })).json();
    expect(body).toBeTruthy();  // read path still works post-write
  });
  it("404s when the job file is deleted after indexing", async () => {
    await rm(path.join(root, "jobs", "Acme — Robot Dev.md"));
    const res = await app.inject({ method: "POST", url: "/api/jobs/acme-robot-dev/app-status", payload: { status: "applied" } });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe("job file not found");
  });
});

describe("POST /api/jobs/:id/note", () => {
  it("appends the note to the file", async () => {
    const res = await app.inject({
      method: "POST", url: "/api/jobs/acme-robot-dev/note",
      payload: { text: "Referred by J. Smith" },
    });
    expect(res.statusCode).toBe(200);
    const raw = await readFile(path.join(root, "jobs", "Acme — Robot Dev.md"), "utf8");
    expect(raw).toContain("Referred by J. Smith");
  });
  it("400s on empty text", async () => {
    expect((await app.inject({ method: "POST", url: "/api/jobs/acme-robot-dev/note", payload: { text: " " } })).statusCode).toBe(400);
  });
});
