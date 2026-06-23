// One-line liveness check for a job URL (reuses checklinks' classification).
// Usage: node checkurl.mjs <url> [<url>...]   OR   pipe one URL per line on stdin.
// Prints "<live|dead|redirected|unverified>\t<finalUrl>" per URL. Cheap alternative to a
// full WebFetch when an agent just needs to know whether a posting is still reachable.
import { classifyStatus } from "./checklinks.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export async function check(url) {
  const u = String(url).trim().replace(/^"|"$/g, "");
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(u, { redirect: "follow", signal: ctrl.signal,
      headers: { "user-agent": "Mozilla/5.0 (career-coach checkurl)" } });
    return { status: classifyStatus(res.status, u, res.url), finalUrl: res.url };
  } catch {
    return { status: "unverified", finalUrl: "" };
  } finally { clearTimeout(t); }
}

async function readStdin() {
  return new Promise((resolve) => {
    let s = ""; process.stdin.on("data", (d) => (s += d)); process.stdin.on("end", () => resolve(s));
  });
}

async function main() {
  let urls = process.argv.slice(2).filter((a) => a !== "--");
  if (!urls.length) urls = (await readStdin()).split("\n").map((x) => x.trim()).filter(Boolean);
  for (const u of urls) { const r = await check(u); console.log(`${r.status}\t${r.finalUrl}`); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
