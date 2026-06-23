import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const here = path.dirname(fileURLToPath(import.meta.url));
// tests -> indexer -> tools -> repo root -> .claude/skills/<name>/SKILL.md
const skillsDir = path.join(here, "..", "..", "..", ".claude", "skills");
const skillPath = (name: string) => path.join(skillsDir, name, "SKILL.md");

// The full command layer. `args: true` => the command must declare a non-empty argument-hint.
const commands: { name: string; args: boolean }[] = [
  { name: "setup", args: false },
  { name: "find-jobs", args: true },
  { name: "add-job", args: true },
  { name: "coach", args: true },
  { name: "why", args: true },
  { name: "compare", args: true },
  { name: "update-resume", args: false },
  { name: "lint", args: false },
  { name: "status", args: false },
  { name: "backup", args: false },
  { name: "help", args: false },
  { name: "watch", args: true },
  { name: "enrich", args: true },
  { name: "update", args: false },
  { name: "market-trends", args: false },
];

describe("command layer (.claude/skills)", () => {
  for (const cmd of commands) {
    describe(`/${cmd.name}`, () => {
      it("is a valid user-only skill", () => {
        const file = skillPath(cmd.name);
        expect(existsSync(file)).toBe(true);
        const parsed = matter(readFileSync(file, "utf8"));
        expect(parsed.data.name).toBe(cmd.name);
        expect(parsed.data["disable-model-invocation"]).toBe(true);
        expect(typeof parsed.data.description).toBe("string");
        expect((parsed.data.description as string).length).toBeGreaterThan(20);
        expect(parsed.data["allowed-tools"]).toBeDefined();
        expect(parsed.content.trim().length).toBeGreaterThan(200);
        if (cmd.args) {
          expect(typeof parsed.data["argument-hint"]).toBe("string");
          expect((parsed.data["argument-hint"] as string).length).toBeGreaterThan(0);
        }
      });
    });
  }

  it("/setup keeps its phased onboarding body", () => {
    const parsed = matter(readFileSync(skillPath("setup"), "utf8"));
    expect(parsed.content).toMatch(/Phase 1/);
    expect(parsed.content).toMatch(/Phase 4/);
    expect(parsed.content).toMatch(/market-trends/);
  });
});
