import { GEOS, TRACKS, type Summary } from "./types.js";

export interface VocabOption { value: string; label: string }

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

export const TRACK_LABELS: Record<string, string> = {
  "robotics": "Robotics", "software": "Software", "ai-ml": "AI / ML", "ee-hardware": "EE / Hardware",
};
const titleCase = (s: string): string => s.split(/[-_\s]+/).filter(Boolean).map(cap).join(" ");
export const humanizeTrack = (s: string): string => TRACK_LABELS[s] ?? titleCase(s);

export interface TrackColor { solid: string; soft: string; gradient: string }
// solid → borders/titles/dots/eyebrows · soft → translucent wash/chip bg · gradient → bars/stripes

// Curated default colors for common engineering tracks (the existing Coach hues — keeps Coach unchanged).
const TRACK_COLORS: Record<string, TrackColor> = {
  robotics:      { solid: "#7A53F2", soft: "rgba(122,83,242,.10)", gradient: "linear-gradient(90deg,#7A53F2,#9B6BF0)" },
  "ai-ml":       { solid: "#D6409F", soft: "rgba(214,64,159,.10)", gradient: "linear-gradient(90deg,#D6409F,#E861B0)" },
  "ee-hardware": { solid: "#E0902E", soft: "rgba(224,144,46,.12)", gradient: "linear-gradient(90deg,#E0902E,#EBA94E)" },
  software:      { solid: "#159B8A", soft: "rgba(21,155,138,.10)", gradient: "linear-gradient(90deg,#159B8A,#27B3A0)" },
};
// Distinct colors for ANY user's custom tracks via golden-angle hue rotation — no fixed palette to
// cap or wrap, and (being HSL) never duplicates a curated hex hue. Append nothing to extend; it's infinite.
function genTrackColor(i: number): TrackColor {
  const h = Math.round((210 + i * 137.508) % 360);   // golden angle → maximally-spread, distinct hues
  return {
    solid: `hsl(${h} 64% 44%)`,                 // darker → readable as title/border text on light + soft bg
    soft: `hsl(${h} 62% 52% / 0.12)`,           // subtle background wash, unchanged
    gradient: `linear-gradient(90deg, hsl(${h} 64% 44%), hsl(${h} 70% 56%))`,
  };
}
/**
 * One stable color per track, for ANY user's tracks:
 *  1. curated tracks keep their hand-tuned hex hue;
 *  2. a custom track is colored by its position among the user's *custom* tracks (`tracks`, the
 *     canonical USER.md order) via golden-angle generation → distinct colors for ANY number of tracks;
 *  3. when `tracks` is absent, hash the slug and generate from it so the function is always total.
 * Callers pass the same `summary.user.tracks` everywhere, so a track's color is identical across pages.
 */
export function trackColor(track: string, tracks?: string[]): TrackColor {
  if (TRACK_COLORS[track]) return TRACK_COLORS[track];
  const custom = (tracks ?? []).filter(t => !TRACK_COLORS[t]);
  const i = custom.indexOf(track);
  if (i >= 0) return genTrackColor(i);
  let h = 0; for (let j = 0; j < track.length; j++) h = (h * 31 + track.charCodeAt(j)) >>> 0;
  return genTrackColor(h);
}

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
