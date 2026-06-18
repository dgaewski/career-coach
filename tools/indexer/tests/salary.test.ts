import { describe, it, expect } from "vitest";
import { parseSalaryMidpoint, salaryWarnings } from "../src/salary.js";

describe("parseSalaryMidpoint", () => {
  it("parses k-ranges to midpoint dollars", () => {
    expect(parseSalaryMidpoint("$100k–$120k")).toBe(110_000);
    expect(parseSalaryMidpoint("$95K-$151K")).toBe(123_000);
  });
  it("parses comma amounts and single values", () => {
    expect(parseSalaryMidpoint("$81,500.00-$90,560.00")).toBe(86_030);
    expect(parseSalaryMidpoint("$135,275")).toBe(135_275);
  });
  it("returns null for hourly, empty, or unparseable", () => {
    expect(parseSalaryMidpoint("$40-$72/hr")).toBeNull();
    expect(parseSalaryMidpoint(undefined)).toBeNull();
    expect(parseSalaryMidpoint("competitive")).toBeNull();
  });
});

describe("salaryWarnings", () => {
  it("flags values outside the sanity range", () => {
    const w = salaryWarnings([{ file: "a.md", midpoint: 300_000 }], { min: 50_000, max: 250_000 });
    expect(w).toHaveLength(1);
    expect(w[0]).toContain("a.md");
  });
});
