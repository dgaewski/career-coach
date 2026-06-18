import { describe, it, expect, beforeAll } from "vitest";
import { rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildApp } from "../src/app.js";
import { DataStore } from "../src/store.js";
import { makeTempWiki } from "./helpers.js";

let app: Awaited<ReturnType<typeof buildApp>>;
beforeAll(async () => {
  const root = await makeTempWiki();
  app = await buildApp(new DataStore(root), root);
});

describe("GET /api/summary", () => {
  it("returns meta + counts", async () => {
    const res = await app.inject({ method: "GET", url: "/api/summary" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.activeJobs).toBe(2);
    expect(body.totalJobs).toBe(3);
    expect(typeof body.generatedAt).toBe("string");
  });
  it("latestBrief is null when no briefs dir exists", async () => {
    const res = await app.inject({ method: "GET", url: "/api/summary" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    // Default fixture has no coach/briefs/ directory
    expect(body.latestBrief).toBeNull();
  });
  it("latestBrief returns the lexicographically last brief path without .md", async () => {
    const { cp, mkdtemp } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { fileURLToPath } = await import("node:url");
    const { runIndexer } = await import("../../indexer/src/index.js");
    const fixture = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      "..", "..", "indexer", "tests", "fixtures", "wiki"
    );
    const briefRoot = await mkdtemp(path.join(tmpdir(), "ccbrief-"));
    await cp(fixture, briefRoot, { recursive: true });
    await runIndexer(briefRoot, new Date("2026-06-11T12:00:00Z"));
    // Create briefs dir with two brief files
    const briefsDir = path.join(briefRoot, "coach", "briefs");
    await mkdir(briefsDir, { recursive: true });
    await writeFile(path.join(briefsDir, "2026-06-01 Batch Brief.md"), "# Brief 1\nOlder brief.", "utf8");
    await writeFile(path.join(briefsDir, "2026-06-10 Batch Brief.md"), "# Brief 2\nNewer brief.", "utf8");
    const briefApp = await buildApp(new DataStore(briefRoot), briefRoot);
    const res = await briefApp.inject({ method: "GET", url: "/api/summary" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.latestBrief).toBe("coach/briefs/2026-06-10 Batch Brief");
  });
});

describe("GET /api/jobs", () => {
  it("defaults to active jobs only", async () => {
    const body = (await app.inject({ method: "GET", url: "/api/jobs" })).json();
    expect(body.length).toBe(2);                       // Beta is stale
  });
  it("status=all returns everything", async () => {
    const body = (await app.inject({ method: "GET", url: "/api/jobs?status=all" })).json();
    expect(body.length).toBe(3);
  });
  it("filters by track, geo, and skill", async () => {
    expect((await app.inject({ method: "GET", url: "/api/jobs?track=robotics" })).json().length).toBe(2);
    expect((await app.inject({ method: "GET", url: "/api/jobs?geo=other" })).json().length).toBe(1);
    expect((await app.inject({ method: "GET", url: "/api/jobs?skill=cpp" })).json().length).toBe(1);
  });
  it("filters by minimum fit score", async () => {
    const all = (await app.inject({ method: "GET", url: "/api/jobs" })).json();
    const high = (await app.inject({ method: "GET", url: "/api/jobs?fitMin=90" })).json();
    expect(high.length).toBeLessThan(all.length + 1);  // sanity: filter applied
    for (const j of high) expect(j.fit.score).toBeGreaterThanOrEqual(90);
  });
  it("ignores non-numeric and repeated query params instead of returning 0 results", async () => {
    const all = (await app.inject({ method: "GET", url: "/api/jobs" })).json();
    const nan = (await app.inject({ method: "GET", url: "/api/jobs?fitMin=abc" })).json();
    expect(nan.length).toBe(all.length);               // invalid numeric filter ignored
    const dup = (await app.inject({ method: "GET", url: "/api/jobs?track=robotics&track=software" })).json();
    expect(dup.length).toBeGreaterThan(0);             // first value wins, no crash
  });
});

describe("GET /api/jobs/:id", () => {
  it("returns frontmatter + rendered HTML body", async () => {
    const res = await app.inject({ method: "GET", url: "/api/jobs/acme-robot-dev" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.name).toBe("Acme — Robot Dev");
    expect(body.html).toContain("Fit notes");
    expect(body.fit.score).toBeGreaterThan(0);
  });
  it("404s on unknown id", async () => {
    expect((await app.inject({ method: "GET", url: "/api/jobs/nope" })).statusCode).toBe(404);
  });
  it("404s when the job file is deleted after indexing", async () => {
    const root = await makeTempWiki();
    const isolated = await buildApp(new DataStore(root), root);
    await rm(path.join(root, "jobs", "Acme — Robot Dev.md"));
    const res = await isolated.inject({ method: "GET", url: "/api/jobs/acme-robot-dev" });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe("job file not found");
  });
});

describe("collection routes", () => {
  for (const [url, check] of [
    ["/api/skills", (b: any) => expect(b.length).toBe(3)],
    ["/api/companies", (b: any) => expect(b.length).toBeGreaterThan(0)],
    ["/api/gap", (b: any) => expect(Array.isArray(b)).toBe(true)],
    ["/api/timeline", (b: any) => expect(Array.isArray(b)).toBe(true)],
    ["/api/errors", (b: any) => expect(b.length).toBe(1)],
  ] as [string, (b: any) => void][]) {
    it(`GET ${url} returns data`, async () => {
      const res = await app.inject({ method: "GET", url });
      expect(res.statusCode).toBe(200);
      check(res.json());
    });
  }
  it("GET /api/map returns places + chips", async () => {
    const body = (await app.inject({ method: "GET", url: "/api/map" })).json();
    expect(body.places.length).toBeGreaterThan(0);
    expect(typeof body.remoteCount).toBe("number");
  });
});

describe("GET /api/skills/:slug", () => {
  it("returns the skill with its matching active jobs", async () => {
    const body = (await app.inject({ method: "GET", url: "/api/skills/ros2" })).json();
    expect(body.slug).toBe("ros2");
    expect(body.jobs.length).toBe(1);                  // Acme only
    expect(body.jobs[0].id).toBe("acme-robot-dev");
  });
  it("404s on unknown slug", async () => {
    expect((await app.inject({ method: "GET", url: "/api/skills/nope" })).statusCode).toBe(404);
  });
});

describe("GET /api/list/*", () => {
  it("lists an allowlisted dir with frontmatter, [] when missing, 400 otherwise", async () => {
    const root = await makeTempWiki();
    const dir = path.join(root, "coach", "projects");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "Arm Migration.md"),
      "---\ntype: project\nstatus: in-progress\ncloses: [ros2]\n---\n# Arm Migration\n", "utf8");
    const isolated = await buildApp(new DataStore(root), root);
    const body = (await isolated.inject({ method: "GET", url: "/api/list/coach%2Fprojects" })).json();
    expect(body).toEqual([{ name: "Arm Migration", fm: { type: "project", status: "in-progress", closes: ["ros2"] } }]);
    expect((await isolated.inject({ method: "GET", url: "/api/list/coach%2Fbriefs" })).json()).toEqual([]);
    expect((await isolated.inject({ method: "GET", url: "/api/list/jobs" })).statusCode).toBe(400);
  });
});

describe("place filter + links", () => {
  it("filters /api/jobs by place (fm.location)", async () => {
    const res = await app.inject({ method: "GET", url: "/api/jobs?status=all&place=Boston, MA" });
    const jobs = res.json() as { fm: { location?: string } }[];
    expect(jobs.length).toBeGreaterThan(0);
    expect(jobs.every(j => j.fm.location === "Boston, MA")).toBe(true);
  });
  it("/api/links returns an object (empty when no links.json)", async () => {
    const res = await app.inject({ method: "GET", url: "/api/links" });
    expect(res.statusCode).toBe(200);
    expect(typeof res.json()).toBe("object");
  });
});

describe("gist + fm + todos", () => {
  it("/api/list/coach/advice includes a gist (first blockquote)", async () => {
    const res = await app.inject({ method: "GET", url: "/api/list/coach/advice" });
    const list = res.json() as { name: string; gist?: string }[];
    expect(list.length).toBeGreaterThan(0);
    expect(list.some(p => typeof p.gist === "string" && p.gist.length > 0)).toBe(true);
  });
  it("/api/pages returns frontmatter fm", async () => {
    const list = (await app.inject({ method: "GET", url: "/api/list/coach/advice" })).json() as { name: string }[];
    const res = await app.inject({ method: "GET", url: `/api/pages/coach/advice/${encodeURIComponent(list[0].name)}` });
    const page = res.json() as { title: string; html: string; fm: Record<string, unknown> };
    expect(page.fm).toBeTruthy();
    expect(page.fm.type).toBe("advice");
  });
  it("/api/todos parses checkbox lines", async () => {
    const res = await app.inject({ method: "GET", url: "/api/todos" });
    const todos = res.json() as { text: string; done: boolean }[];
    expect(Array.isArray(todos)).toBe(true);
    expect(todos.some(t => t.done === false)).toBe(true);
  });
});
