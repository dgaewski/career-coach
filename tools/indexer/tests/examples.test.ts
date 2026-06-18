import { describe, it, expect } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scanWiki } from "../src/scan.js";
import { loadUser } from "../src/user.js";

const here = path.dirname(fileURLToPath(import.meta.url));
// tests -> indexer -> tools -> repo root -> examples
const examplesRoot = path.join(here, "..", "..", "..", "examples");

describe("examples/ demo instance", () => {
  it("is schema-correct (zero errors, expected counts)", async () => {
    const scan = await scanWiki(examplesRoot);
    expect(scan.errors).toEqual([]);
    expect(scan.jobs).toHaveLength(3);
    expect(scan.companies).toHaveLength(2);
    expect(scan.skills).toHaveLength(5);
  });

  it("has a parseable USER.md for the demo persona", () => {
    const user = loadUser(examplesRoot);
    expect(user.name).toBe("Sam Rivera");
    expect(user.tracks).toEqual(["ai-ml", "software"]);
  });
});
