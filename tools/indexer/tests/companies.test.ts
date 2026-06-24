import { describe, it, expect } from "vitest";
import { computeCompanies, companyEnrichmentWarnings } from "../src/companies.js";
import type { Doc, JobFM, CompanyFM } from "../src/types.js";

function job(company: string, over: Partial<JobFM>): Doc<JobFM> {
  return { file: "j", name: "j", body: "", fm: {
    type: "job", title: "t", company, geo: "boston-metro", track: ["robotics"], level: "early",
    ingested: "2026-06-01", status: "active", "app-status": "none", skills: [], ...over,
  } as JobFM };
}

describe("computeCompanies", () => {
  it("aggregates counts, salary, remote share, levels, repeat flag", () => {
    const out = computeCompanies([
      job("Acme", { salary: "$100k–$120k" }),
      job("Acme", { geo: "remote", level: "mid", status: "stale" }),
      job("Beta", {}),
    ]);
    const acme = out.find(c => c.name === "Acme")!;
    expect(acme.active).toBe(1);
    expect(acme.total).toBe(2);
    expect(acme.avgSalary).toBe(110_000);
    expect(acme.repeatPoster).toBe(true);
    expect(acme.logo).toBeNull();          // logo defaults to null (not undefined) with no logoFiles
    expect(out.find(c => c.name === "Beta")!.repeatPoster).toBe(false);
  });
});

function cdoc(name: string, fm: Partial<CompanyFM>): Doc<CompanyFM> {
  return { file: "c", name, body: "", fm: { type: "company", ...fm } as CompanyFM };
}

describe("computeCompanies enrichment", () => {
  it("merges company frontmatter and resolves a logo file when present", () => {
    const out = computeCompanies(
      [job("Acme", {})],
      [cdoc("Acme", { hq: "Boston, MA", industry: "robotics", size: "~1100", "careers-url": "https://acme.test/careers", domain: "acme.test", founded: 2015 })],
      ["acme.png"],
    );
    const acme = out.find(c => c.name === "Acme")!;
    expect(acme.hq).toBe("Boston, MA");
    expect(acme.industry).toBe("robotics");
    expect(acme.size).toBe("~1100");
    expect(acme.careersUrl).toBe("https://acme.test/careers");
    expect(acme.domain).toBe("acme.test");
    expect(acme.founded).toBe(2015);
    expect(acme.logo).toBe("assets/logos/acme.png");
  });

  it("logo is null when no matching file exists, and works with no company docs", () => {
    const out = computeCompanies([job("Beta", {})]);
    expect(out.find(c => c.name === "Beta")!.logo).toBeNull();
  });

  it("matches the first logo extension available", () => {
    const out = computeCompanies([job("Beta", {})], [], ["beta.svg"]);
    expect(out.find(c => c.name === "Beta")!.logo).toBe("assets/logos/beta.svg");
  });
});

describe("companyEnrichmentWarnings", () => {
  const withAbout = (name: string): Doc<CompanyFM> =>
    ({ file: "c", name, body: "## About\n> a sourced blurb", fm: { type: "company" } as CompanyFM });

  it("flags a company missing both a logo and ## About", () => {
    const out = companyEnrichmentWarnings([cdoc("Acme", {})], []);
    expect(out).toEqual(["company enrichment: Acme missing logo + ## About — run /enrich Acme"]);
  });

  it("flags only the missing piece (logo present, About absent)", () => {
    const out = companyEnrichmentWarnings([cdoc("Acme", {})], ["acme.png"]);
    expect(out).toEqual(["company enrichment: Acme missing ## About — run /enrich Acme"]);
  });

  it("flags only the missing piece (About present, logo absent)", () => {
    const out = companyEnrichmentWarnings([withAbout("Acme")], []);
    expect(out).toEqual(["company enrichment: Acme missing logo — run /enrich Acme"]);
  });

  it("stays quiet when a company has both a logo and ## About", () => {
    expect(companyEnrichmentWarnings([withAbout("Acme")], ["acme.png"])).toEqual([]);
  });

  it("exempts confidential/undisclosed/stealth placeholders (un-enrichable)", () => {
    const docs = [cdoc("Confidential (Rocky Hill manufacturer)", {}), cdoc("Undisclosed Startup", {}), cdoc("Stealth Robotics Co", {})];
    expect(companyEnrichmentWarnings(docs, [])).toEqual([]);
  });
});
