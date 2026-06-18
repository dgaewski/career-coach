import Fastify, { type FastifyInstance } from "fastify";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import type { DataStore, JobRecord } from "./store.js";
import { renderPage } from "./render.js";
import { applyAppStatus, appendNote } from "./tracker.js";
import { toggleTodo } from "./todos.js";
import { addClient } from "./sse.js";
import { assembleBrief } from "./brief.js";

type Query = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);
const num = (v: string | string[] | undefined): number | undefined => {
  const s = one(v);
  if (!s) return undefined;                     // empty/missing → not supplied (not a 0 filter)
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;    // invalid numeric params are ignored, not 0-result traps
};

function firstBlockquote(body: string): string | undefined {
  for (const line of body.split("\n")) {
    const t = line.trim();
    if (t.startsWith(">")) {
      const text = t.replace(/^>\s?/, "").trim();
      if (text) return text;
    }
  }
  return undefined;
}

function applyJobFilters(jobs: JobRecord[], q: Query): JobRecord[] {
  let out = jobs;
  const status = one(q.status) ?? "active";
  if (status !== "all") out = out.filter(j => j.fm.status === status);
  const track = one(q.track); if (track) out = out.filter(j => j.fm.track.includes(track));
  const geo = one(q.geo); if (geo) out = out.filter(j => j.fm.geo === geo);
  const level = one(q.level); if (level) out = out.filter(j => j.fm.level === level);
  const skill = one(q.skill); if (skill) out = out.filter(j => j.fm.skills.includes(skill));
  const appStatus = one(q.appStatus); if (appStatus) out = out.filter(j => j.fm["app-status"] === appStatus);
  const place = one(q.place); if (place) out = out.filter(j => (j.fm.location as string | undefined) === place);
  const freshness = one(q.freshness); if (freshness) out = out.filter(j => j.freshness === freshness);
  const fitMin = num(q.fitMin); if (fitMin !== undefined) out = out.filter(j => j.fit.score >= fitMin);
  const salaryMin = num(q.salaryMin); if (salaryMin !== undefined) out = out.filter(j => j.salaryMidpoint !== null && j.salaryMidpoint >= salaryMin);
  const missingMax = num(q.missingMax); if (missingMax !== undefined) out = out.filter(j => j.fit.reasons.filter(r => r.startsWith("missing ")).length <= missingMax);
  return out;
}

export async function buildApp(store: DataStore, wikiRoot: string, onWrite?: () => void): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  void wikiRoot;

  app.get("/api/health", async () => ({ ok: true }));

  app.get("/api/events", (req, reply) => { reply.hijack(); addClient(reply); });

  app.get("/api/summary", async () => {
    const meta = await store.meta();
    const jobs = await store.jobs();
    const pipeline: Record<string, number> = {};
    for (const j of jobs) {
      const s = j.fm["app-status"];
      if (s && s !== "none") pipeline[s] = (pipeline[s] ?? 0) + 1;
    }
    let latestBrief: string | null = null;
    try {
      const briefsDir = path.join(store.root, "coach", "briefs");
      const entries = await readdir(briefsDir);
      const briefs = entries.filter(f => f.endsWith(".md")).sort();
      if (briefs.length > 0) {
        const last = briefs[briefs.length - 1];
        latestBrief = "coach/briefs/" + last.slice(0, -3); // strip .md
      }
    } catch {
      // briefs dir missing or unreadable → leave latestBrief as null
    }
    return { ...meta, pipeline, latestBrief };
  });

  app.get<{ Querystring: Query }>("/api/jobs", async (req) =>
    applyJobFilters(await store.jobs(), req.query));

  app.get("/api/skills", async () => store.skills());
  app.get("/api/companies", async () => store.companies());
  app.get("/api/gap", async () => store.gap());
  app.get("/api/timeline", async () => store.timeline());
  app.get("/api/map", async () => store.map());
  app.get("/api/errors", async () => store.errors());
  app.get("/api/overview", async () => store.overview());
  app.get("/api/keywords", async () => store.keywords());
  app.get("/api/links", async () => store.links());

  app.get("/api/todos", async () => {
    try {
      const raw = await readFile(path.join(store.root, "coach", "To-dos.md"), "utf8");
      const body = matter(raw).content;
      const todos: { text: string; done: boolean }[] = [];
      for (const line of body.split("\n")) {
        const m = line.match(/^\s*[-*]\s+\[([ xX])\]\s+(.*\S)\s*$/);
        if (m) todos.push({ done: m[1].toLowerCase() === "x", text: m[2].trim() });
      }
      return todos;
    } catch { return []; }
  });

  app.get("/api/brief", async () => {
    let briefCount = 0;
    try {
      const entries = await readdir(path.join(store.root, "coach", "briefs"));
      briefCount = entries.filter(f => f.endsWith(".md")).length;
    } catch { /* none */ }
    return assembleBrief(store, new Date(), briefCount);
  });

  app.get<{ Params: { slug: string } }>("/api/skills/:slug", async (req, reply) => {
    const skills = await store.skills();
    const skill = skills.find(s => s.slug === req.params.slug);
    if (!skill) return reply.code(404).send({ error: "unknown skill slug" });
    const jobs = (await store.jobs()).filter(j => j.fm.status === "active" && j.fm.skills.includes(req.params.slug));
    return { ...skill, jobs };
  });

  app.get<{ Params: { id: string } }>("/api/jobs/:id", async (req, reply) => {
    const job = await store.jobById(req.params.id);
    if (!job) return reply.code(404).send({ error: "unknown job id" });
    // job.file is indexer-generated, but keep reads contained to the wiki root.
    const abs = path.resolve(store.root, job.file);
    if (!abs.startsWith(path.resolve(store.root) + path.sep)) {
      return reply.code(404).send({ error: "unknown job id" });
    }
    try {
      const raw = await readFile(abs, "utf8");
      const { content } = matter(raw);
      return { ...job, html: renderPage(content) };
    } catch {
      // File deleted between index and read; the watcher will catch up.
      return reply.code(404).send({ error: "job file not found" });
    }
  });

  const PAGE_DIRS = new Set(["coach", "analytics", "jobs", "companies", "skills"]);
  app.get<{ Params: { "*": string } }>("/api/pages/*", async (req, reply) => {
    // Decode twice: Fastify pre-decodes once; this catches double-encoded sequences (%252e → %2e → .).
    const rel = decodeURIComponent(req.params["*"]);
    const top = rel.split("/")[0];
    if (rel.includes("..") || rel.includes("\\") || rel.includes("\0") || !PAGE_DIRS.has(top)) {
      return reply.code(400).send({ error: "invalid page path" });
    }
    const abs = path.resolve(store.root, rel + ".md");
    if (!abs.startsWith(path.resolve(store.root) + path.sep)) {
      return reply.code(400).send({ error: "invalid page path" });
    }
    try {
      const raw = await readFile(abs, "utf8");
      const parsed = matter(raw);
      return { title: path.basename(rel), html: renderPage(parsed.content), fm: parsed.data };
    } catch {
      return reply.code(404).send({ error: "page not found" });
    }
  });

  const LIST_DIRS = new Set(["coach/briefs", "coach/advice", "coach/projects"]);
  app.get<{ Params: { "*": string } }>("/api/list/*", async (req, reply) => {
    const rel = decodeURIComponent(req.params["*"]);
    if (!LIST_DIRS.has(rel)) return reply.code(400).send({ error: "invalid list dir" });
    try {
      const files = (await readdir(path.join(store.root, rel))).filter(f => f.endsWith(".md")).sort();
      const out = [];
      for (const f of files) {
        const raw = await readFile(path.join(store.root, rel, f), "utf8");
        const parsed = matter(raw);
        out.push({ name: f.slice(0, -3), fm: parsed.data, gist: firstBlockquote(parsed.content) });
      }
      return out;
    } catch {
      return [];   // dir missing → empty archive, not an error
    }
  });

  app.post<{ Params: { id: string }; Body: { status?: string; rejectionStage?: string; rejectionReason?: string } }>(
    "/api/jobs/:id/app-status", async (req, reply) => {
      const job = await store.jobById(req.params.id);
      if (!job) return reply.code(404).send({ error: "unknown job id" });
      try {
        await applyAppStatus(path.join(store.root, job.file), req.body?.status ?? "", new Date(),
          { stage: req.body?.rejectionStage, reason: req.body?.rejectionReason });
        onWrite?.();
        return { ok: true };
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === "ENOENT") {
          return reply.code(404).send({ error: "job file not found" });
        }
        return reply.code(400).send({ error: e instanceof Error ? e.message : String(e) });
      }
    });

  app.post<{ Body: { index?: number; done?: boolean } }>(
    "/api/todos/toggle", async (req, reply) => {
      const index = req.body?.index;
      const done = req.body?.done;
      if (typeof index !== "number" || typeof done !== "boolean") {
        return reply.code(400).send({ error: "index (number) and done (boolean) are required" });
      }
      try {
        await toggleTodo(path.join(store.root, "coach", "To-dos.md"), index, done, new Date());
        onWrite?.();
        return { ok: true };
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === "ENOENT") {
          return reply.code(404).send({ error: "To-dos.md not found" });
        }
        return reply.code(400).send({ error: e instanceof Error ? e.message : String(e) });
      }
    });

  app.post<{ Params: { id: string }; Body: { text?: string } }>(
    "/api/jobs/:id/note", async (req, reply) => {
      const job = await store.jobById(req.params.id);
      if (!job) return reply.code(404).send({ error: "unknown job id" });
      try {
        await appendNote(path.join(store.root, job.file), req.body?.text ?? "", new Date());
        onWrite?.();
        return { ok: true };
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === "ENOENT") {
          return reply.code(404).send({ error: "job file not found" });
        }
        return reply.code(400).send({ error: e instanceof Error ? e.message : String(e) });
      }
    });

  return app;
}
