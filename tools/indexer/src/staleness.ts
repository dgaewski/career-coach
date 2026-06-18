import { readFile } from "node:fs/promises";
import type { Doc, JobFM } from "./types.js";
import { atomicWrite } from "./io.js";

const DAY = 86_400_000;

/** Flips status: active -> stale for jobs ingested more than `days` ago. Returns flipped file paths. Mutates fm in memory too. */
export async function applyStaleness(jobs: Doc<JobFM>[], now: Date, days: number): Promise<string[]> {
  const flipped: string[] = [];
  for (const job of jobs) {
    if (job.fm.status !== "active") continue;
    const ingested = new Date(String(job.fm.ingested));
    if ((now.getTime() - ingested.getTime()) / DAY <= days) continue;
    const raw = await readFile(job.file, "utf8");
    // Replace only within the leading frontmatter block.
    const end = raw.indexOf("---", 3);
    const head = raw.slice(0, end).replace(/^status:\s*active\s*$/m, "status: stale");
    await atomicWrite(job.file, head + raw.slice(end));
    job.fm.status = "stale";
    flipped.push(job.file);
  }
  return flipped;
}
