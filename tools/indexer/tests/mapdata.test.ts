import { describe, it, expect } from "vitest";
import { computeMap } from "../src/mapdata.js";
import type { Doc, JobFM } from "../src/types.js";

const places = {
  "Boston, MA": [42.3601, -71.0589] as [number, number],
  "San Jose, CA": [37.3382, -121.8863] as [number, number],
};
const NE = new Set(["ct-commutable", "boston-metro", "new-england"]);

function job(title: string, over: Partial<JobFM>): Doc<JobFM> {
  return { file: title, name: title, body: "", fm: {
    type: "job", title, company: "c", geo: "boston-metro", track: ["robotics"], level: "early",
    location: "Boston, MA", ingested: "2026-06-01", status: "active", "app-status": "none", skills: [], ...over,
  } as JobFM };
}

describe("computeMap", () => {
  it("groups in-zone actives by place; chips remote/other; warns on unresolved place", () => {
    const m = computeMap([
      job("a", {}), job("b", {}),
      job("c", { geo: "remote", location: undefined }),
      job("d", { geo: "other", location: "Troy, MI" }),
      job("e", { location: "Mystery, MA" }),
      job("g", { status: "stale" }),
    ], places, NE);
    expect(m.places.find(p => p.place === "Boston, MA")!.count).toBe(2);
    expect(m.remoteCount).toBe(1);
    expect(m.otherCount).toBe(1);
    expect(m.warnings.some(w => w.includes("Mystery, MA"))).toBe(true);
  });

  it("works for a non-NE zone set (genericity)", () => {
    const m = computeMap(
      [job("sj", { geo: "south-bay", location: "San Jose, CA" })],
      places, new Set(["south-bay"]),
    );
    expect(m.places.find(p => p.place === "San Jose, CA")!.count).toBe(1);
    expect(m.otherCount).toBe(0);
  });
});
