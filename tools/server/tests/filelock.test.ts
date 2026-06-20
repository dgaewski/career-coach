import { describe, it, expect } from "vitest";
import { withFileLock } from "../src/filelock.js";

describe("withFileLock", () => {
  it("serializes calls on the same key (no overlap, FIFO order)", async () => {
    const order: string[] = [];
    let active = 0, maxActive = 0;
    const task = (id: string) => withFileLock("f", async () => {
      active++; maxActive = Math.max(maxActive, active);
      await new Promise(r => setTimeout(r, 10));
      order.push(id); active--;
    });
    await Promise.all([task("a"), task("b"), task("c")]);
    expect(maxActive).toBe(1);
    expect(order).toEqual(["a", "b", "c"]);
  });

  it("runs different keys concurrently", async () => {
    let active = 0, maxActive = 0;
    const task = (k: string) => withFileLock(k, async () => {
      active++; maxActive = Math.max(maxActive, active);
      await new Promise(r => setTimeout(r, 10));
      active--;
    });
    await Promise.all([task("x"), task("y")]);
    expect(maxActive).toBe(2);
  });

  it("propagates the result and keeps the chain alive after an error", async () => {
    await expect(withFileLock("g", async () => { throw new Error("boom"); })).rejects.toThrow("boom");
    await expect(withFileLock("g", async () => 42)).resolves.toBe(42);
  });
});
