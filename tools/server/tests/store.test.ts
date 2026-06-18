import { describe, it, expect, beforeAll } from "vitest";
import { DataStore } from "../src/store.js";
import { makeTempWiki } from "./helpers.js";

describe("DataStore", () => {
  let store: DataStore;
  beforeAll(async () => { store = new DataStore(await makeTempWiki()); });

  it("loads and caches data files", async () => {
    const jobs = await store.jobs();
    expect(jobs.length).toBe(3);
    expect(await store.jobs()).toBe(jobs);          // same reference = cached
  });
  it("finds jobs by id", async () => {
    const job = await store.jobById("acme-robot-dev");
    expect(job?.name).toBe("Acme — Robot Dev");
    expect(await store.jobById("nope")).toBeUndefined();
  });
  it("exposes meta, skills, gap, companies, map, timeline, errors", async () => {
    expect((await store.meta()).activeJobs).toBe(2);
    expect((await store.skills()).length).toBe(3);
    expect(Array.isArray(await store.gap())).toBe(true);
    expect(Array.isArray(await store.companies())).toBe(true);
    expect((await store.map()).places.length).toBeGreaterThan(0);
    expect(Array.isArray(await store.timeline())).toBe(true);
    expect(Array.isArray(await store.errors())).toBe(true);
  });
  it("invalidate() drops the cache", async () => {
    const before = await store.jobs();
    store.invalidate();
    expect(await store.jobs()).not.toBe(before);
  });
});
