import { describe, it, expect } from "vitest";
import { strongFitWarning } from "../src/index.js";

describe("strongFitWarning", () => {
  it("warns when more than half of active roles are strong fits", () => {
    expect(strongFitWarning(8, 10, 80)).toMatch(/discrimination/);
    expect(strongFitWarning(4, 10, 80)).toBeNull();
    expect(strongFitWarning(0, 0, 80)).toBeNull();
  });
});
