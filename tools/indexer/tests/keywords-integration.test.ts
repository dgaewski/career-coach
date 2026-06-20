import { describe, it, expect } from "vitest";
import { cp, mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runIndexer } from "../src/index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
async function indexed() {
  const root = await mkdtemp(path.join(tmpdir(), "ccidx-"));
  await cp(path.join(here, "fixtures", "wiki"), root, { recursive: true });
  await runIndexer(root, new Date("2026-06-11T12:00:00Z"));
  return root;
}
const read = async (root: string, f: string) => JSON.parse(await readFile(path.join(root, "data", f), "utf8"));

describe("indexer emits overview/keywords/snapshot", () => {
  it("writes overview.json with hero", async () => {
    const ov = await read(await indexed(), "overview.json");
    expect(typeof ov.hero.activeRoles).toBe("number");
  });
  it("writes keywords.json as {term,count}[] sorted desc", async () => {
    const kw = await read(await indexed(), "keywords.json");
    expect(Array.isArray(kw)).toBe(true);
    for (let i = 1; i < kw.length; i++) expect(kw[i - 1].count >= kw[i].count).toBe(true);
  });
  it("second run produces a changes object (newRoles empty on identical re-run)", async () => {
    const root = await indexed();
    await runIndexer(root, new Date("2026-06-12T12:00:00Z"));
    const ov = await read(root, "overview.json");
    expect(ov.changes.newRoles).toEqual([]);
  });
});
