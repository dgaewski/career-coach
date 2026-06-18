import type { ChangeSet, Snapshot } from "./types.js";

interface JobRec { id: string; fm: { title: string; company: string; status: string }; fit: { score: number } }

export function buildSnapshot(jobs: JobRec[]): Snapshot {
  const snap: Snapshot = {};
  for (const j of jobs) snap[j.id] = { fit: j.fit.score, status: j.fm.status };
  return snap;
}

export function diffSnapshot(prior: Snapshot, jobs: JobRec[], flippedIds: Set<string>): ChangeSet {
  const cs: ChangeSet = { newRoles: [], fitImproved: [], fitDeclined: [], staleFlipped: [] };
  const havePrior = Object.keys(prior).length > 0;
  for (const j of jobs) {
    const p = prior[j.id];
    if (!p) { if (havePrior) cs.newRoles.push({ id: j.id, title: j.fm.title, company: j.fm.company }); continue; }
    if (j.fit.score > p.fit) cs.fitImproved.push({ id: j.id, title: j.fm.title, from: p.fit, to: j.fit.score });
    else if (j.fit.score < p.fit) cs.fitDeclined.push({ id: j.id, title: j.fm.title, from: p.fit, to: j.fit.score });
    if (flippedIds.has(j.id)) cs.staleFlipped.push({ id: j.id, title: j.fm.title });
  }
  return cs;
}
