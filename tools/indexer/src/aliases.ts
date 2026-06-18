import type { Doc, SkillFM } from "./types.js";

export interface Resolver {
  resolve(input: string): string | null;
  collisions: string[];
  bySlug: Map<string, Doc<SkillFM>>;
}

const norm = (s: string) => s.toLowerCase().replace(/[\s\-_./]/g, "");

export function buildResolver(skills: Doc<SkillFM>[]): Resolver {
  const map = new Map<string, string>();
  const collisions: string[] = [];
  const bySlug = new Map<string, Doc<SkillFM>>();
  for (const s of skills) {
    bySlug.set(s.fm.slug, s);
    for (const key of [s.fm.slug, ...(s.fm.aliases ?? [])]) {
      const n = norm(key);
      const existing = map.get(n);
      if (existing && existing !== s.fm.slug) {
        collisions.push(`alias collision: "${key}" claimed by both "${existing}" and "${s.fm.slug}"`);
        continue;
      }
      map.set(n, s.fm.slug);
    }
  }
  return { resolve: (input) => map.get(norm(input)) ?? null, collisions, bySlug };
}
