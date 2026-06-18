import { describe, it, expect } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scanWiki } from "../src/scan.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "fixtures", "isolation");

describe("scanWiki isolation", () => {
  it("scans only root jobs/, ignoring examples/ and template/ subtrees", async () => {
    const scan = await scanWiki(root);
    expect(scan.jobs.map(j => j.fm.title)).toEqual(["Real Job"]);
    expect(scan.errors).toEqual([]);
  });
});
