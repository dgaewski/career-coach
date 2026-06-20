import { describe, it, expect } from "vitest";
import { calibrationDriftWarning } from "../src/index.js";

const BAND = { min: 0.12, max: 0.30 };

describe("calibrationDriftWarning (fit calibration drift)", () => {
  it("warns when strong-fit share is above the band (under-discriminating)", () => {
    expect(calibrationDriftWarning(50, 100, BAND)).toMatch(/calibration/);
    expect(calibrationDriftWarning(50, 100, BAND)).toMatch(/rais/);   // suggests raising the threshold
  });

  it("warns when strong-fit share is below the band (over-discriminating)", () => {
    expect(calibrationDriftWarning(5, 100, BAND)).toMatch(/calibration/);
    expect(calibrationDriftWarning(5, 100, BAND)).toMatch(/lower/);   // suggests lowering the threshold
  });

  it("is quiet when share is inside the band", () => {
    expect(calibrationDriftWarning(20, 100, BAND)).toBeNull();
  });

  it("stays quiet on a corpus too small to judge", () => {
    expect(calibrationDriftWarning(8, 10, BAND)).toBeNull();
    expect(calibrationDriftWarning(0, 0, BAND)).toBeNull();
  });
});
