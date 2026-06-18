import { describe, it, expect } from "vitest";
import { inferClearanceRisk, inferWorkAuthRisk, type ClearanceSignals } from "../src/clearance.js";
import type { Doc, JobFM } from "../src/types.js";

const signals: ClearanceSignals = {
  clearanceKeywords: ["secret clearance", "TS/SCI"],
  workAuthKeywords: ["U.S. citizenship", "ITAR", "no sponsorship"],
  companies: ["Anduril"],
};

function job(body: string, company = "Acme"): Doc<JobFM> {
  return { file: "j", name: "j", body, fm: {
    type: "job", title: "t", company, geo: "remote", track: ["software"],
    level: "early", ingested: "2026-06-01", status: "active", "app-status": "none", skills: [],
  } as JobFM };
}

describe("inferClearanceRisk", () => {
  it("true on a clearance keyword (case-insensitive)", () => {
    expect(inferClearanceRisk(job("Active SECRET CLEARANCE required."), signals)).toBe(true);
  });
  it("true on a listed defense-prime company", () => {
    expect(inferClearanceRisk(job("Build robots.", "Anduril"), signals)).toBe(true);
  });
  it("false on a work-auth-only body (citizenship is not a clearance)", () => {
    expect(inferClearanceRisk(job("Must hold U.S. citizenship."), signals)).toBe(false);
  });
  it("false when signals undefined", () => {
    expect(inferClearanceRisk(job("secret clearance"), undefined)).toBe(false);
  });
});

describe("inferWorkAuthRisk", () => {
  it("true on a citizenship/sponsorship keyword", () => {
    expect(inferWorkAuthRisk(job("Must hold U.S. citizenship."), signals)).toBe(true);
    expect(inferWorkAuthRisk(job("This role is ITAR-controlled."), signals)).toBe(true);
  });
  it("false on a clearance-only body (clearance is not a work-auth barrier)", () => {
    expect(inferWorkAuthRisk(job("Active secret clearance required."), signals)).toBe(false);
  });
  it("does NOT use the company list (work-auth is body-keyword only)", () => {
    expect(inferWorkAuthRisk(job("Build robots.", "Anduril"), signals)).toBe(false);
  });
  it("false when signals undefined", () => {
    expect(inferWorkAuthRisk(job("U.S. citizenship"), undefined)).toBe(false);
  });
});
