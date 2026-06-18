import { describe, it, expect, beforeEach } from "vitest";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { toggleTodo } from "../src/todos.js";
import { makeTempWiki, NOW } from "./helpers.js";

const SAMPLE = `---
type: coach
created: 2026-06-14
updated: 2026-06-14
---

# Career To-dos

Intro paragraph that is not a task.

- [ ] First task
- [x] Second already done
- [ ] Third task
`;

let root: string;
let file: string;
beforeEach(async () => {
  root = await makeTempWiki();
  file = path.join(root, "coach", "To-dos.md");
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, SAMPLE, "utf8");
});

describe("toggleTodo", () => {
  it("marks an open task done, leaving siblings untouched", async () => {
    await toggleTodo(file, 0, true, NOW);
    const raw = await readFile(file, "utf8");
    expect(raw).toMatch(/- \[x\] First task/);
    expect(raw).toMatch(/- \[x\] Second already done/);
    expect(raw).toMatch(/- \[ \] Third task/);
  });

  it("unchecks a done task", async () => {
    await toggleTodo(file, 1, false, NOW);
    const raw = await readFile(file, "utf8");
    expect(raw).toMatch(/- \[ \] Second already done/);
  });

  it("indexes only task lines (skips prose) and bumps updated:", async () => {
    await toggleTodo(file, 2, true, NOW);
    const raw = await readFile(file, "utf8");
    expect(raw).toMatch(/- \[x\] Third task/);
    expect(raw).toMatch(/^updated: 2026-06-11$/m);
    expect(raw).toContain("Intro paragraph that is not a task.");  // body preserved
  });

  it("throws on an out-of-range index", async () => {
    await expect(toggleTodo(file, 9, true, NOW)).rejects.toThrow(/out of range/);
  });

  it("rejects a negative index", async () => {
    await expect(toggleTodo(file, -1, true, NOW)).rejects.toThrow(/invalid todo index/);
  });
});
