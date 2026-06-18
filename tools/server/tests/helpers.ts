import { cp, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runIndexer } from "../../indexer/src/index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
export const NOW = new Date("2026-06-11T12:00:00Z");

/** Temp copy of the indexer fixture wiki, indexed once. Returns wiki root. */
export async function makeTempWiki(): Promise<string> {
  const fixture = path.join(here, "..", "..", "indexer", "tests", "fixtures", "wiki");
  const root = await mkdtemp(path.join(tmpdir(), "ccsrv-"));
  await cp(fixture, root, { recursive: true });
  await runIndexer(root, NOW);
  return root;
}
