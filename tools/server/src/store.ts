import { readFile } from "node:fs/promises";
import path from "node:path";

export interface JobRecord {
  id: string; name: string; file: string;
  fm: Record<string, unknown> & { status: string; "app-status": string; track: string[]; geo: string; level: string; skills: string[] };
  fit: { score: number; tier: string; reasons: string[]; matched?: number; flags?: string[] };
  freshness: string; salaryMidpoint: number | null;
}

export class DataStore {
  readonly root: string;
  readonly dataDir: string;
  private cache = new Map<string, unknown>();
  private byId: Map<string, JobRecord> | null = null;

  constructor(root: string) {
    this.root = root;
    this.dataDir = path.join(root, "data");
  }

  private async load<T>(name: string): Promise<T> {
    if (!this.cache.has(name)) {
      const raw = await readFile(path.join(this.dataDir, name), "utf8");
      this.cache.set(name, JSON.parse(raw));
    }
    return this.cache.get(name) as T;
  }

  jobs() { return this.load<JobRecord[]>("jobs.json"); }
  skills() { return this.load<({ slug: string } & Record<string, unknown>)[]>("skills.json"); }
  companies() { return this.load<Record<string, unknown>[]>("companies.json"); }
  gap() { return this.load<Record<string, unknown>[]>("gap.json"); }
  map() { return this.load<{ places: unknown[]; remoteCount: number; otherCount: number }>("map.json"); }
  timeline() { return this.load<Record<string, unknown>[]>("timeline.json"); }
  errors() { return this.load<Record<string, unknown>[]>("errors.json"); }
  meta() { return this.load<{ generatedAt: string; activeJobs: number; totalJobs: number; staleFlipped: string[]; warnings: string[]; user?: { name: string; tracks: string[]; geoZones: Array<{ slug: string; label: string; score: number; home?: boolean }>; relocate?: string; positioning?: string } }>("meta.json"); }
  overview() { return this.load<Record<string, unknown>>("overview.json"); }
  keywords() { return this.load<{ term: string; count: number }[]>("keywords.json"); }

  async links(): Promise<Record<string, { status: string; finalUrl?: string; checked: string }>> {
    try { return JSON.parse(await readFile(path.join(this.dataDir, "links.json"), "utf8")); }
    catch { return {}; }   // not generated yet → empty
  }

  async jobById(id: string): Promise<JobRecord | undefined> {
    if (!this.byId) {
      this.byId = new Map((await this.jobs()).map(j => [j.id, j]));
    }
    return this.byId.get(id);
  }

  invalidate(): void {
    this.cache.clear();
    this.byId = null;
  }
}
