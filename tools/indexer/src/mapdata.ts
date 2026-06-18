import type { Doc, JobFM, MapData, MapPlace } from "./types.js";

export function computeMap(
  jobs: Doc<JobFM>[], places: Record<string, [number, number]>, zoneSlugs: Set<string>,
): MapData {
  const warnings: string[] = [];
  const grouped = new Map<string, MapPlace>();
  let remoteCount = 0, otherCount = 0;
  for (const j of jobs.filter(j => j.fm.status === "active")) {
    if (j.fm.geo === "remote") { remoteCount++; continue; }
    if (!zoneSlugs.has(j.fm.geo)) { otherCount++; continue; }
    const loc = j.fm.location ?? "";
    const coords = places[loc];
    if (!coords) { warnings.push(`map: unresolved place "${loc}" (${j.name})`); continue; }
    const [lat, lng] = coords;
    if (!grouped.has(loc)) grouped.set(loc, { place: loc, lat, lng, count: 0, jobs: [] });
    const p = grouped.get(loc)!;
    p.count++; p.jobs.push(j.name);
  }
  return { places: [...grouped.values()].sort((a, b) => b.count - a.count), remoteCount, otherCount, warnings };
}
