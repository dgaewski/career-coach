// Link-health checker. Reads ../data/jobs.json, HTTP-checks each job url, writes ../data/links.json.
// Usage: node checklinks.mjs   (run from tools/)
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(DIR, "..", "data");

const GENERIC_CAREERS_PATHS = new Set([
  "", "/careers", "/career", "/jobs", "/en/careers",
  "/open-roles", "/join/roles", "/roles", "/openings", "/positions", "/search",
]);

export function isGenericCareers(url) {
  try {
    const u = new URL(url);
    const p = u.pathname.replace(/\/+$/, "").toLowerCase();
    return GENERIC_CAREERS_PATHS.has(p);
  } catch { return false; }
}

// A soft-404: the requested URL pointed at a specific posting (a deep path with
// an id-like last segment) but the 200 response came from a different URL that
// dropped that identifier — i.e. the ATS redirected a closed listing to a board
// or landing. Also catches the explicit `?error=true` marker (Greenhouse).
// Errs toward "not redirected" (live) on ambiguity, to avoid hiding live roles.
export function redirectedAwayFromPosting(requestedUrl, finalUrl) {
  try {
    const req = new URL(requestedUrl);
    const fin = new URL(finalUrl);
    if (fin.searchParams.has("error")) return true;              // e.g. greenhouse ?error=true
    const segs = req.pathname.split("/").filter(Boolean);
    if (segs.length < 2) return false;                           // not a deep posting path → can't tell
    const id = segs[segs.length - 1].toLowerCase();
    if (id.length < 3) return false;                             // too short to match reliably
    const finalHay = (fin.pathname + fin.search).toLowerCase();
    return !finalHay.includes(id);                              // final lost the posting id → redirected away
  } catch { return false; }
}

export function classifyStatus(httpStatus, requestedUrl, finalUrl) {
  if (httpStatus >= 200 && httpStatus < 300) {
    if (finalUrl && requestedUrl) {
      if (isGenericCareers(finalUrl) && !isGenericCareers(requestedUrl)) return "redirected";
      if (redirectedAwayFromPosting(requestedUrl, finalUrl)) return "redirected";  // soft-404
    }
    return "live";
  }
  if (httpStatus === 404 || httpStatus === 410) return "dead";   // genuinely gone
  return "unverified";   // 403/429/5xx/etc — bot-block or transient; live status can't be confirmed
}

async function checkOne(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(url, { method: "GET", redirect: "follow", signal: ctrl.signal,
      headers: { "user-agent": "Mozilla/5.0 (career-coach link check)" } });
    return { status: classifyStatus(res.status, url, res.url), finalUrl: res.url };
  } catch {
    return { status: "unverified", finalUrl: undefined };   // timeout/network error — can't confirm dead
  } finally { clearTimeout(t); }
}

async function main() {
  const jobs = JSON.parse(await readFile(path.join(DATA, "jobs.json"), "utf8"));
  const now = new Date().toISOString().slice(0, 10);
  const out = {};
  let live = 0, dead = 0, none = 0, redirected = 0, unverified = 0;
  for (const j of jobs) {
    const url = (j.fm?.url ?? "").trim();
    if (!url) { out[j.id] = { status: "none", checked: now }; none++; continue; }
    const r = await checkOne(url);
    out[j.id] = { status: r.status, finalUrl: r.finalUrl, checked: now };
    if (r.status === "live") live++; else if (r.status === "dead") dead++; else if (r.status === "redirected") redirected++; else if (r.status === "unverified") unverified++;
  }
  await writeFile(path.join(DATA, "links.json"), JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(`checked ${jobs.length}: ${live} live, ${dead} dead, ${unverified} unverified, ${redirected} redirected, ${none} no-link → data/links.json`);
}

// run only as CLI, not when imported by the test
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(e => { console.error(e); process.exit(1); });
}
