import { describe, it, expect, vi } from "vitest";
import path from "node:path";
import { makeReindexScheduler, isIgnored, watchTargets } from "../src/watch.js";

const p = (...parts: string[]) => path.join("/wiki", ...parts);

describe("watch targets + ignore", () => {
  it("watches the content dirs and tools/config.json", () => {
    const t = watchTargets("/wiki");
    for (const d of ["jobs", "skills", "companies", "coach"]) expect(t).toContain(p(d));
    expect(t).toContain(p("tools", "config.json"));   // scoring-knob changes must trigger a re-index
  });

  it("ignores generated/build dirs and temp files", () => {
    expect(isIgnored(p("data", "jobs.json"))).toBe(true);
    expect(isIgnored(p("analytics", "Trends.md"))).toBe(true);
    expect(isIgnored(p("tools", "indexer", "src", "index.ts"))).toBe(true);
    expect(isIgnored(p("jobs", "Acme.md.tmp"))).toBe(true);
  });

  it("does NOT ignore content files or tools/config.json", () => {
    expect(isIgnored(p("jobs", "Acme.md"))).toBe(false);
    expect(isIgnored(p("tools", "config.json"))).toBe(false);   // the fix: config.json is the one watched tools/ file
  });
});

describe("makeReindexScheduler", () => {
  it("debounces bursts into one run and suppresses events during the run", async () => {
    vi.useFakeTimers();
    let running = 0; let runs = 0;
    const scheduler = makeReindexScheduler(async () => {
      running++; runs++;
      await new Promise(r => setTimeout(r, 50));
      running--;
    }, 100);
    scheduler.poke(); scheduler.poke(); scheduler.poke();
    await vi.advanceTimersByTimeAsync(99);
    expect(runs).toBe(0);                       // still within debounce window
    await vi.advanceTimersByTimeAsync(2);
    expect(runs).toBe(1);                       // one run for the burst
    scheduler.poke();                           // event DURING the run (t≈101; run ends t≈151)
    await vi.advanceTimersByTimeAsync(49);      // t≈150: first run finishing
    await vi.advanceTimersByTimeAsync(100);     // t≈250: trailing debounce fired at t≈201 → second run started
    expect(runs).toBe(2);                       // trailing change picked up
    await vi.advanceTimersByTimeAsync(60);      // let the second run's 50ms body complete
    expect(running).toBe(0);
    vi.useRealTimers();
  });
});
