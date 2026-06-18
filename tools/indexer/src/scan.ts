import fg from "fast-glob";
import matter from "gray-matter";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Doc, JobFM, SkillFM, CompanyFM, ProjectFM, PageError, WikiScan } from "./types.js";

const REQUIRED_JOB = ["title", "company", "geo", "track", "level", "ingested", "status", "app-status", "skills"];

async function parseDir<F>(root: string, glob: string, required: string[], errors: PageError[]): Promise<Doc<F>[]> {
  const files = await fg(glob, { cwd: root, absolute: true });
  const docs: Doc<F>[] = [];
  for (const file of files.sort()) {
    try {
      const raw = await readFile(file, "utf8");
      const parsed = matter(raw);
      const missing = required.filter(k => parsed.data[k] === undefined || parsed.data[k] === null);
      if (missing.length > 0) {
        errors.push({ file, reason: `missing required field(s): ${missing.join(", ")}` });
        continue;
      }
      // Validate that required array fields are actually arrays (catches bare scalar YAML)
      const badArray = (["track", "skills"] as const).find(
        f => required.includes(f) && parsed.data[f] !== undefined && !Array.isArray(parsed.data[f])
      );
      if (badArray) {
        errors.push({ file, reason: `${badArray} must be a YAML array (use [${parsed.data[badArray]}], not a bare string)` });
        continue;
      }
      docs.push({ file, name: path.basename(file, ".md"), fm: parsed.data as F, body: parsed.content });
    } catch (e) {
      errors.push({ file, reason: e instanceof Error ? e.message : String(e) });
    }
  }
  return docs;
}

export async function scanWiki(root: string): Promise<WikiScan> {
  const errors: PageError[] = [];
  const [jobs, skills, companies, projects] = await Promise.all([
    parseDir<JobFM>(root, "jobs/*.md", REQUIRED_JOB, errors),
    parseDir<SkillFM>(root, "skills/*.md", ["slug", "have"], errors),
    parseDir<CompanyFM>(root, "companies/*.md", [], errors),
    parseDir<ProjectFM>(root, "coach/projects/*.md", ["status", "closes"], errors),
  ]);
  return { jobs, skills, companies, projects, errors };
}
