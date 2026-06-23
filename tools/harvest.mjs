// Harvests currently-live postings from ATS JSON board APIs (Greenhouse/Lever/Ashby)
// for the companies we already track + a user watchlist, into a dedup-tagged local cache.
// Writes ../data/known.json and ../data/board-cache.json. Usage: node harvest.mjs (from tools/)
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(DIR, "..");
const DATA = path.join(ROOT, "data");

const NE_STATES = /(,\s*(CT|MA|RI|NH|VT|ME)\b)|\b(Connecticut|Massachusetts|Rhode Island|New Hampshire|Vermont|Maine)\b/i;
const SENIOR = /\b(senior|sr\.?|staff|principal|director|vp|head of|chief|distinguished|fellow)\b/i;

// ── pure helpers (unit-tested) ───────────────────────────────────────────────

export function extractBoardId(url) {
  let u;
  try { u = new URL(String(url).replace(/^"|"$/g, "")); } catch { return null; }
  const host = u.hostname.toLowerCase();
  const segs = u.pathname.split("/").filter(Boolean);
  if (host.endsWith("greenhouse.io")) {
    if (host.startsWith("boards-api")) return segs[1] === "boards" && segs[2] ? { ats: "greenhouse", id: segs[2] } : null;
    return segs[0] ? { ats: "greenhouse", id: segs[0] } : null;          // job-boards. / boards.
  }
  if (host.endsWith("lever.co")) {
    if (host.startsWith("api.")) return segs[0] === "v0" && segs[2] ? { ats: "lever", id: segs[2] } : null;
    return segs[0] ? { ats: "lever", id: segs[0] } : null;              // jobs.lever.co
  }
  if (host.endsWith("ashbyhq.com")) {
    if (host.startsWith("api.")) return segs[2] ? { ats: "ashby", id: decodeURIComponent(segs[2]) } : null;
    return segs[0] ? { ats: "ashby", id: decodeURIComponent(segs[0]) } : null;  // jobs.ashbyhq.com
  }
  return null;
}

const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
export function titleKey(company, title) { return `${norm(company)}|${norm(title)}`; }

export function guessZone(location) {
  const loc = String(location ?? "");
  if (!loc.trim()) return "";
  if (/\bremote\b/i.test(loc)) return "remote";
  if (NE_STATES.test(loc)) return "new-england";
  return "other";
}

function stripHtml(s) {
  if (!s) return "";
  return String(s).replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ").trim();
}
const day = (v) => {
  if (!v) return "";
  const d = new Date(v);
  return isNaN(d) ? "" : d.toISOString().slice(0, 10);
};
const post = (o) => (o.title && o.url) ? o : null;   // drop incomplete postings

export function normalizeGreenhouse(json, company) {
  return (json?.jobs ?? []).map((j) => post({
    company, title: (j.title || "").trim(), location: j.location?.name || "",
    url: j.absolute_url || "", ats: "greenhouse", postedAt: day(j.updated_at),
    text: stripHtml(j.content),
  })).filter(Boolean);
}
export function normalizeLever(json, company) {
  return (Array.isArray(json) ? json : []).map((p) => post({
    company, title: (p.text || "").trim(), location: p.categories?.location || "",
    url: p.hostedUrl || "", ats: "lever", postedAt: day(p.createdAt),
    text: (p.descriptionPlain || stripHtml(p.description) || "").trim(),
  })).filter(Boolean);
}
export function normalizeAshby(json, company) {
  return (json?.jobs ?? []).filter((j) => j.isListed !== false).map((j) => post({
    company, title: (j.title || "").trim(), location: j.location || j.address?.postalAddress?.addressLocality || "",
    url: j.jobUrl || "", ats: "ashby", postedAt: day(j.publishedAt),
    text: (j.descriptionPlain || stripHtml(j.descriptionHtml) || "").trim(),
  })).filter(Boolean);
}

export function passesFilters(p, cal) {
  if (SENIOR.test(p.title)) return false;
  const company = norm(p.company);
  if ((cal.excludeTerms || []).some((t) => new RegExp(`\\b${norm(t)}\\b`).test(company))) return false;
  const zone = guessZone(p.location);
  if (zone === "other") return false;        // keep remote / New England / unknown-location
  return true;
}

export function tagKnown(p, known) {
  return known.urls.has(p.url) || known.titleKeys.has(titleKey(p.company, p.title));
}

// ── network + IO (main) ──────────────────────────────────────────────────────

async function fetchJson(url) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 15000);
      try {
        const res = await fetch(url, { signal: ctrl.signal, headers: { "user-agent": "career-coach harvest" } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } finally { clearTimeout(t); }
    } catch (e) { if (attempt === 1) throw e; }
  }
}
const BOARD_API = {
  greenhouse: (id) => `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(id)}/jobs?content=true`,
  lever: (id) => `https://api.lever.co/v0/postings/${encodeURIComponent(id)}?mode=json`,
  ashby: (id) => `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(id)}`,
};
const NORMALIZE = { greenhouse: normalizeGreenhouse, lever: normalizeLever, ashby: normalizeAshby };

function parseExclude(userMd) {
  const m = userMd.match(/^exclude:\s*\[([^\]]*)\]/m);
  return m ? m[1].split(",").map((s) => s.trim()).filter(Boolean) : [];
}

async function main() {
  const jobs = JSON.parse(await readFile(path.join(DATA, "jobs.json"), "utf8"));
  const userMd = existsSync(path.join(ROOT, "USER.md")) ? await readFile(path.join(ROOT, "USER.md"), "utf8") : "";
  const cal = { excludeTerms: parseExclude(userMd) };

  // known-set + boardId→company map from existing postings
  const companies = new Set(), urls = new Set(), titleKeys = new Set();
  const boardIds = { greenhouse: new Set(), lever: new Set(), ashby: new Set() };
  const idToCompany = {};
  for (const j of jobs) {
    const fm = j.fm || {};
    if (fm.company) companies.add(fm.company);
    if (fm.url) { urls.add(fm.url); }
    if (fm.company && fm.title) titleKeys.add(titleKey(fm.company, fm.title));
    const b = extractBoardId(fm.url || "");
    if (b) { boardIds[b.ats].add(b.id); idToCompany[`${b.ats}:${b.id}`] = idToCompany[`${b.ats}:${b.id}`] || fm.company; }
  }

  // watchlist boards
  const wlPath = path.join(ROOT, "find-jobs", "watchlist.json");
  if (existsSync(wlPath)) {
    try {
      const wl = JSON.parse(await readFile(wlPath, "utf8"));
      for (const ats of ["greenhouse", "lever", "ashby"]) for (const id of (wl[ats] || [])) boardIds[ats].add(id);
    } catch (e) { console.warn(`watchlist.json unreadable: ${e.message}`); }
  }

  await writeFile(path.join(DATA, "known.json"), JSON.stringify({
    companies: [...companies].sort(),
    boardIds: { greenhouse: [...boardIds.greenhouse].sort(), lever: [...boardIds.lever].sort(), ashby: [...boardIds.ashby].sort() },
    urls: [...urls], titleKeys: [...titleKeys],
  }, null, 2) + "\n", "utf8");

  const known = { urls, titleKeys };
  const candidates = [];
  let scanned = 0, errored = 0;
  for (const ats of ["greenhouse", "lever", "ashby"]) {
    for (const id of boardIds[ats]) {
      scanned++;
      try {
        const json = await fetchJson(BOARD_API[ats](id));
        const company = idToCompany[`${ats}:${id}`] || id;
        for (const p of NORMALIZE[ats](json, company)) {
          if (!passesFilters(p, cal)) continue;
          candidates.push({ ...p, geo: guessZone(p.location), known: tagKnown(p, known), text: p.text.slice(0, 1500) });
        }
      } catch (e) { errored++; console.warn(`  skip ${ats}/${id}: ${e.message}`); }
    }
  }

  candidates.sort((a, b) => (a.known - b.known) || (b.postedAt < a.postedAt ? -1 : 1));
  await writeFile(path.join(DATA, "board-cache.json"), JSON.stringify(candidates, null, 2) + "\n", "utf8");

  const fresh = candidates.filter((c) => !c.known).length;
  console.log(`harvested ${scanned} boards (${errored} errored): ${candidates.length} postings kept, ${fresh} new / ${candidates.length - fresh} known → data/board-cache.json, data/known.json`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
