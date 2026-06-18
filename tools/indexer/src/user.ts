import { readFileSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type { UserProfile, GeoZone } from "./types.js";

/** Read per-user calibration from <root>/USER.md. */
export function loadUser(root: string): UserProfile {
  const filePath = path.join(root, "USER.md");
  let raw: string;
  try {
    raw = readFileSync(filePath, "utf8");
  } catch {
    throw new Error(`USER.md not found at ${filePath} — create it (or run /setup)`);
  }
  const parsed = matter(raw);
  const fm = parsed.data as Record<string, unknown>;
  const positioning = parsed.content.trim() || undefined;
  return {
    name: String(fm.name ?? ""),
    tracks: (fm.tracks as string[]) ?? [],
    levelBand: (fm["level-band"] as string[]) ?? [],
    employmentTypes: (fm["employment-types"] as string[]) ?? [],
    exclude: (fm.exclude as string[]) ?? [],
    resumeVersion: String(fm["resume-version"] ?? ""),
    geoZones: (fm["geo-zones"] as GeoZone[]) ?? [],
    compFloor: fm["comp-floor"] as number | undefined,
    compTarget: fm["comp-target"] as number | undefined,
    workAuth: fm["work-auth"] as string | undefined,
    clearance: fm.clearance as string | undefined,
    workMode: fm["work-mode"] as string[] | undefined,
    relocate: fm.relocate as string | undefined,
    positioning,
    pivot: fm.pivot as { from: string; into: string[] } | undefined,
  };
}
