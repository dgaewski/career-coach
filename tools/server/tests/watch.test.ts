import { describe, it, expect, vi } from "vitest";
import { makeReindexScheduler } from "../src/watch.js";

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
