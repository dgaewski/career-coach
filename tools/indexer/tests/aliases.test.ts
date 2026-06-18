import { describe, it, expect } from "vitest";
import { buildResolver } from "../src/aliases.js";
import type { Doc, SkillFM } from "../src/types.js";

function skill(slug: string, aliases: string[], have = false): Doc<SkillFM> {
  return { file: slug + ".md", name: slug, body: "", fm: { type: "skill", slug, aliases, have } };
}

describe("buildResolver", () => {
  it("resolves slugs, aliases, and normalized variants", () => {
    const r = buildResolver([skill("ros2", ["ROS2", "ROS 2"]), skill("cpp", ["C++"])]);
    expect(r.resolve("ros2")).toBe("ros2");
    expect(r.resolve("ROS 2")).toBe("ros2");
    expect(r.resolve("c++")).toBe("cpp");
    expect(r.resolve("nope")).toBeNull();
  });
  it("reports alias collisions", () => {
    const r = buildResolver([skill("ml", ["ML"]), skill("markup", ["ML"])]);
    expect(r.collisions).toHaveLength(1);
    expect(r.collisions[0]).toContain("ML");
  });
});
