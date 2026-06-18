import type { Job } from "./types.js";

/** Derive the most frequent track from jobs for a given company name. */
export function primaryTrack(jobs: Job[], companyName: string): string {
  const byTrack: Record<string, number> = {};
  for (const j of jobs) {
    if (j.fm.company !== companyName) continue;
    for (const t of j.fm.track) byTrack[t] = (byTrack[t] ?? 0) + 1;
  }
  const best = Object.entries(byTrack).sort((a, b) => b[1] - a[1])[0];
  return best ? best[0] : "";
}

/** 1–2 uppercase initials from a company name. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export const MONO_COLORS = [
  { bg: "rgba(108,99,255,.14)", fg: "var(--accent)" },
  { bg: "rgba(30,158,90,.13)",  fg: "var(--green-fg,#1e9e5a)" },
  { bg: "rgba(47,98,240,.12)",  fg: "#2f62f0" },
  { bg: "rgba(180,100,0,.12)",  fg: "var(--amber-fg,#B86A00)" },
  { bg: "rgba(214,50,50,.10)",  fg: "var(--red-fg,#D8443F)" },
];

export function monoColor(name: string) {
  const idx = name.charCodeAt(0) % MONO_COLORS.length;
  return MONO_COLORS[idx];
}
