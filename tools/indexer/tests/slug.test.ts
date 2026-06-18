import { describe, it, expect } from "vitest";
import { slugify } from "../src/slug.js";

describe("slugify", () => {
  it("lowercases and hyphenates non-alphanumerics including em-dashes", () => {
    expect(slugify("Acme — Robot Dev")).toBe("acme-robot-dev");
    expect(slugify("Teradyne — Software Engineer, Embedded Robotics (SiPh Test Solutions)"))
      .toBe("teradyne-software-engineer-embedded-robotics-siph-test-solutions");
  });
  it("trims leading/trailing hyphens and collapses runs", () => {
    expect(slugify("  C++ & Stuff!! ")).toBe("c-stuff");
  });
});
