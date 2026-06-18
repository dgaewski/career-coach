import { describe, it, expect } from "vitest";
import { loadUser } from "../src/user.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "fixtures", "wiki");

describe("loadUser", () => {
  it("parses USER.md calibration from the wiki root", () => {
    const u = loadUser(root);
    expect(u.name).toBe("Test User");
    expect(u.tracks).toEqual(["robotics", "software", "ai-ml", "ee-hardware"]);
    expect(u.geoZones.find(z => z.slug === "boston-metro")?.score).toBe(1.0);
    expect(u.geoZones.find(z => z.home)?.slug).toBe("ct-commutable");
  });

  it("defaults optional fields to undefined when absent", () => {
    const u = loadUser(root);
    expect(u.compFloor).toBeUndefined();
    expect(u.clearance).toBeUndefined();
  });

  it("throws a clear error when USER.md is missing", () => {
    expect(() => loadUser(path.join(here, "fixtures"))).toThrow(/USER\.md not found/);
  });
});
