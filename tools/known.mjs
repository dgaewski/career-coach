// "Do we already have this posting?" lookup against ../data/known.json (written by harvest.mjs).
// Usage: node known.mjs "<url>"  |  node known.mjs "<Company>|<Title>"  |  node known.mjs "<Company>"
//        (or pipe one query per line on stdin). Prints "<known|new>\t<query>" per query.
// Lets a discovery agent reject dupes for ~no tokens instead of researching then discovering it's a dup.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(DIR, "..", "data");
const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function verdict(known, query) {
  const q = String(query).trim().replace(/^"|"$/g, "");
  if (/^https?:\/\//i.test(q)) return (known.urls || []).includes(q) ? "known" : "new";
  if (q.includes("|")) {
    const [c, t] = q.split("|");
    return (known.titleKeys || []).includes(`${norm(c)}|${norm(t)}`) ? "known" : "new";
  }
  return (known.companies || []).some((c) => norm(c) === norm(q)) ? "known" : "new";
}

async function readStdin() {
  return new Promise((resolve) => {
    let s = ""; process.stdin.on("data", (d) => (s += d)); process.stdin.on("end", () => resolve(s));
  });
}

async function main() {
  const known = JSON.parse(await readFile(path.join(DATA, "known.json"), "utf8"));
  let queries = process.argv.slice(2).filter((a) => a !== "--");
  if (!queries.length) queries = (await readStdin()).split("\n").map((x) => x.trim()).filter(Boolean);
  for (const q of queries) console.log(`${verdict(known, q)}\t${q}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => { console.error("error: data/known.json missing — run `npm run harvest` first"); process.exit(1); });
}
