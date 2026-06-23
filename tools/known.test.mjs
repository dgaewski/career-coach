import { describe, it, expect } from "vitest";
import { verdict } from "./known.mjs";

const known = {
  companies: ["Pickle Robot", "C3 AI"],
  urls: ["https://job-boards.greenhouse.io/x/jobs/1"],
  titleKeys: ["pickle robot|software engineer path planning"],
};

describe("known verdict", () => {
  it("url hit → known", () =>
    expect(verdict(known, "https://job-boards.greenhouse.io/x/jobs/1")).toBe("known"));
  it("url miss → new", () =>
    expect(verdict(known, "https://job-boards.greenhouse.io/x/jobs/999")).toBe("new"));
  it("company|title hit (normalized) → known", () =>
    expect(verdict(known, "Pickle Robot|Software Engineer, Path Planning")).toBe("known"));
  it("company|title miss → new", () =>
    expect(verdict(known, "Pickle Robot|Brand New Role")).toBe("new"));
  it("bare company hit → known", () => expect(verdict(known, "c3  ai")).toBe("known"));
  it("bare company miss → new", () => expect(verdict(known, "Acme Robotics")).toBe("new"));
});
