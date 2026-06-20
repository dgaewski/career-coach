import type { MarketTrack } from "./types.js";

export interface TrajectoryAggregate {
  direction: "rising" | "steady" | "cooling";
  rising: number;
  steady: number;
  cooling: number;
  n: number; // tracks with a known trajectory
}

/**
 * Roll the per-track market trajectories into one overall read for the
 * Overview "Market momentum" card. Tracks with no trajectory are ignored.
 * More rising than cooling → rising; more cooling than rising → cooling;
 * a tie (including all-steady or empty) → steady.
 */
export function aggregateTrajectory(tracks: MarketTrack[]): TrajectoryAggregate {
  let rising = 0, steady = 0, cooling = 0;
  for (const t of tracks) {
    if (t.trajectory === "rising") rising++;
    else if (t.trajectory === "cooling") cooling++;
    else if (t.trajectory === "steady") steady++;
  }
  const n = rising + steady + cooling;
  const direction = rising > cooling ? "rising" : cooling > rising ? "cooling" : "steady";
  return { direction, rising, steady, cooling, n };
}
