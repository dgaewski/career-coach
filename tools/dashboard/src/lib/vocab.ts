import { GEOS, TRACKS, type Summary } from "./types.js";

export interface VocabOption { value: string; label: string }

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

export const TRACK_LABELS: Record<string, string> = {
  "robotics": "Robotics", "software": "Software", "ai-ml": "AI / ML", "ee-hardware": "EE / Hardware",
};
const titleCase = (s: string): string => s.split(/[-_\s]+/).filter(Boolean).map(cap).join(" ");
export const humanizeTrack = (s: string): string => TRACK_LABELS[s] ?? titleCase(s);

/** Geo filter options: the user's zones (from summary) + remote + other; falls back to the GEOS const. */
export function geoOptions(summary: Summary | null | undefined): VocabOption[] {
  const zones = summary?.user?.geoZones;
  if (zones && zones.length > 0) {
    const opts = zones.filter(z => z.slug !== "remote").map(z => ({ value: z.slug, label: z.label }));
    return [...opts, { value: "remote", label: "Remote" }, { value: "other", label: "Elsewhere" }];
  }
  return GEOS.map(g => ({ value: g, label: g === "other" ? "Elsewhere" : cap(g) }));
}

/** Track filter options: the user's tracks (from summary); falls back to the TRACKS const. */
export function trackOptions(summary: Summary | null | undefined): VocabOption[] {
  const tracks = summary?.user?.tracks;
  const list = tracks && tracks.length > 0 ? tracks : [...TRACKS];
  return list.map(t => ({ value: t, label: humanizeTrack(t) }));
}
