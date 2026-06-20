import { readFile } from "node:fs/promises";
import { atomicWrite } from "../../indexer/src/io.js";
import { withFileLock } from "./filelock.js";

const STATUSES = new Set(["none", "interested", "applied", "interview", "offer", "rejected"]);
const STAGES = new Set(["screening", "oa", "phone", "onsite", "offer-declined"]);

const day = (d: Date) => d.toISOString().slice(0, 10);

function splitFrontmatter(raw: string): { head: string; rest: string } {
  const end = raw.indexOf("\n---", 3);
  if (!raw.startsWith("---") || end === -1) throw new Error("no frontmatter block");
  return { head: raw.slice(0, end), rest: raw.slice(end) };
}

/**
 * Upsert a line in the frontmatter head.
 * If `key:` already exists on any line, replace that line.
 * Otherwise, insert the new line immediately after the line matching `after:`.
 * If the `after` anchor is ALSO absent, the line is silently dropped — every
 * call site anchors on a key that is guaranteed present by that point.
 */
function upsertLine(head: string, key: string, line: string, after: string): string {
  const re = new RegExp(`^${key}:.*$`, "m");
  if (re.test(head)) return head.replace(re, line);
  const anchor = new RegExp(`^(${after}:.*)$`, "m");
  return head.replace(anchor, `$1\n${line}`);
}

export async function applyAppStatus(
  file: string,
  status: string,
  now: Date,
  rejection?: { stage?: string; reason?: string },
): Promise<void> {
  if (!STATUSES.has(status)) throw new Error(`invalid status: ${status}`);
  if (rejection?.stage && !STAGES.has(rejection.stage)) throw new Error(`invalid stage: ${rejection.stage}`);
  if (rejection?.stage && status !== "rejected") throw new Error("rejection fields require status=rejected");

  // Serialize read-modify-write per file so concurrent POSTs can't lose updates.
  return withFileLock(file, async () => {
  const raw = await readFile(file, "utf8");
  let { head, rest } = splitFrontmatter(raw);
  const today = day(now);
  const entry = `"${today} ${status}"`;

  // Update app-status in place; a job page without the key is malformed — refuse rather than mutate.
  if (!/^app-status:.*$/m.test(head)) throw new Error(`app-status key missing in ${file}`);
  head = head.replace(/^app-status:.*$/m, `app-status: ${status}`);

  // Upsert app-updated after app-status
  head = upsertLine(head, "app-updated", `app-updated: ${today}`, "app-status");

  // Append to app-history
  if (/^app-history: \[\]$/m.test(head)) {
    // Empty flow array → populate with single entry
    head = head.replace(/^app-history: \[\]$/m, `app-history: [${entry}]`);
  } else if (/^app-history: \[.+\]$/m.test(head)) {
    // Non-empty flow array → append to existing entries
    head = head.replace(/^app-history: \[(.+)\]$/m, (_m, inner: string) => `app-history: [${inner}, ${entry}]`);
  } else if (/^app-history:/m.test(head)) {
    // Key present but not a flow array (block-style list?) — replacing the key line
    // would orphan the block entries and corrupt the YAML. Refuse.
    throw new Error(`app-history in ${file} is not a flow-style array; cannot append`);
  } else {
    // No app-history key at all → insert after app-updated
    head = upsertLine(head, "app-history", `app-history: [${entry}]`, "app-updated");
  }

  // Write rejection fields when applicable
  if (status === "rejected" && rejection?.stage) {
    head = upsertLine(head, "rejection-stage", `rejection-stage: ${rejection.stage}`, "app-history");
    if (rejection.reason) {
      head = upsertLine(
        head,
        "rejection-reason",
        `rejection-reason: "${rejection.reason.replace(/"/g, "'")}"`,
        "rejection-stage",
      );
    }
  }

  // Keep `updated:` current
  head = upsertLine(head, "updated", `updated: ${today}`, "created");

  await atomicWrite(file, head + rest);
  });
}

export async function appendNote(file: string, text: string, now: Date): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("empty note");
  if (trimmed.length > 2000) throw new Error("note too long");

  return withFileLock(file, async () => {
  const raw = await readFile(file, "utf8");
  const bullet = `- ${day(now)}: ${trimmed}`;
  let next: string;

  const heading = /^## Notes[ \t]*$/m.exec(raw);
  if (heading) {
    // Append at the END of the section so notes stay chronological.
    // NOTE: raw string search; does not see through code fences. Acceptable for job-page Notes.
    const sectionStart = heading.index + heading[0].length;
    const nextHeading = raw.indexOf("\n## ", sectionStart);
    if (nextHeading === -1) {
      next = raw.trimEnd() + `\n${bullet}\n`;
    } else {
      next = raw.slice(0, nextHeading).trimEnd() + `\n${bullet}\n` + raw.slice(nextHeading);
    }
  } else {
    // No ## Notes section — add at end of file
    next = raw.trimEnd() + `\n\n## Notes\n${bullet}\n`;
  }

  await atomicWrite(file, next);
  });
}
