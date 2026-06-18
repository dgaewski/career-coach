import { readFile } from "node:fs/promises";
import { atomicWrite } from "../../indexer/src/io.js";

// Matches the same task lines /api/todos parses — keep this in lockstep so the
// index a client sends lines up with the Nth task the server rewrites.
const TASK_RE = /^(\s*[-*]\s+\[)([ xX])(\]\s+.*\S\s*)$/;
const day = (d: Date) => d.toISOString().slice(0, 10);

/** Toggle the Nth markdown task line (0-based, file order) in To-dos.md to done/undone. */
export async function toggleTodo(file: string, index: number, done: boolean, now: Date): Promise<void> {
  if (!Number.isInteger(index) || index < 0) throw new Error(`invalid todo index: ${index}`);

  const raw = await readFile(file, "utf8");
  const lines = raw.split("\n");
  let seen = -1;
  let hit = -1;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(TASK_RE);
    if (!m) continue;
    seen++;
    if (seen === index) {
      lines[i] = m[1] + (done ? "x" : " ") + m[3];
      hit = i;
      break;
    }
  }
  if (hit === -1) throw new Error(`todo index ${index} out of range`);

  let next = lines.join("\n");
  next = next.replace(/^updated:.*$/m, `updated: ${day(now)}`);  // keep frontmatter current if present
  await atomicWrite(file, next);
}
