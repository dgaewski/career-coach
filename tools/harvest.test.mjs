import { describe, it, expect } from "vitest";
import {
  extractBoardId, titleKey, guessZone,
  normalizeGreenhouse, normalizeLever, normalizeAshby,
  passesFilters, tagKnown,
} from "./harvest.mjs";

describe("extractBoardId", () => {
  it("greenhouse job-boards", () =>
    expect(extractBoardId("https://job-boards.greenhouse.io/nimblerobotics/jobs/4248780009"))
      .toEqual({ ats: "greenhouse", id: "nimblerobotics" }));
  it("greenhouse boards", () =>
    expect(extractBoardId("https://boards.greenhouse.io/airbnb/jobs/12345"))
      .toEqual({ ats: "greenhouse", id: "airbnb" }));
  it("greenhouse boards-api", () =>
    expect(extractBoardId("https://boards-api.greenhouse.io/v1/boards/stripe/jobs/9"))
      .toEqual({ ats: "greenhouse", id: "stripe" }));
  it("lever jobs", () =>
    expect(extractBoardId("https://jobs.lever.co/whoop/abc-123"))
      .toEqual({ ats: "lever", id: "whoop" }));
  it("lever api", () =>
    expect(extractBoardId("https://api.lever.co/v0/postings/veeva"))
      .toEqual({ ats: "lever", id: "veeva" }));
  it("ashby decodes the board name", () =>
    expect(extractBoardId("https://jobs.ashbyhq.com/Verne%20Robotics/uuid"))
      .toEqual({ ats: "ashby", id: "Verne Robotics" }));
  it("ashby api", () =>
    expect(extractBoardId("https://api.ashbyhq.com/posting-api/job-board/quora/uuid"))
      .toEqual({ ats: "ashby", id: "quora" }));
  it("non-ATS hosts → null", () => {
    expect(extractBoardId("https://amazon.jobs/en/jobs/123")).toBeNull();
    expect(extractBoardId("https://x.wd1.myworkdayjobs.com/foo/job/Y")).toBeNull();
    expect(extractBoardId("https://careers.example.com/role")).toBeNull();
    expect(extractBoardId("")).toBeNull();
    expect(extractBoardId('""')).toBeNull();
  });
});

describe("titleKey", () => {
  it("normalizes case + punctuation + whitespace", () =>
    expect(titleKey("Pickle Robot", "Software Engineer, Path Planning"))
      .toBe("pickle robot|software engineer path planning"));
  it("collapses equivalently-spelled variants", () =>
    expect(titleKey("C3 AI", "AI/ML Engineer")).toBe(titleKey("c3  ai", "AI ML  Engineer")));
});

describe("guessZone", () => {
  it("remote", () => expect(guessZone("Remote, US")).toBe("remote"));
  it("NE state abbrev → new-england", () => expect(guessZone("Cambridge, MA")).toBe("new-england"));
  it("NE state name → new-england", () => expect(guessZone("Providence, Rhode Island")).toBe("new-england"));
  it("other US state → other", () => expect(guessZone("Austin, TX")).toBe("other"));
  it("empty → unknown", () => expect(guessZone("")).toBe(""));
});

describe("normalizers", () => {
  it("greenhouse maps + strips html", () => {
    const json = { jobs: [{ title: "Robotics SWE", updated_at: "2026-06-01T00:00:00Z",
      location: { name: "Boston, MA" }, absolute_url: "https://job-boards.greenhouse.io/x/jobs/1",
      content: "<p>Build &amp; ship</p>" }] };
    const [p] = normalizeGreenhouse(json, "X");
    expect(p).toMatchObject({ company: "X", title: "Robotics SWE", location: "Boston, MA",
      url: "https://job-boards.greenhouse.io/x/jobs/1", ats: "greenhouse", postedAt: "2026-06-01" });
    expect(p.text).toContain("Build & ship");
  });
  it("lever maps", () => {
    const json = [{ text: "Backend Engineer", hostedUrl: "https://jobs.lever.co/x/abc",
      categories: { location: "Remote" }, createdAt: 1700000000000, descriptionPlain: "do things" }];
    const [p] = normalizeLever(json, "X");
    expect(p).toMatchObject({ title: "Backend Engineer", location: "Remote",
      url: "https://jobs.lever.co/x/abc", ats: "lever", text: "do things" });
  });
  it("ashby filters unlisted + maps", () => {
    const json = { jobs: [
      { title: "ML Engineer", location: "Cambridge, MA", jobUrl: "https://jobs.ashbyhq.com/x/u1",
        publishedAt: "2026-05-01T00:00:00Z", descriptionPlain: "ml", isListed: true },
      { title: "Hidden", location: "NY", jobUrl: "https://jobs.ashbyhq.com/x/u2",
        descriptionPlain: "", isListed: false },
    ] };
    const ps = normalizeAshby(json, "X");
    expect(ps).toHaveLength(1);
    expect(ps[0]).toMatchObject({ title: "ML Engineer", ats: "ashby" });
  });
  it("skips postings missing title or url", () => {
    expect(normalizeGreenhouse({ jobs: [{ title: "", absolute_url: "u" }] }, "X")).toHaveLength(0);
    expect(normalizeLever([{ text: "T" }], "X")).toHaveLength(0);
  });
});

describe("passesFilters", () => {
  const cal = { excludeTerms: ["power", "utility"] };
  it("keeps an early-career New England role", () =>
    expect(passesFilters({ title: "Software Engineer I", location: "Boston, MA", company: "X" }, cal)).toBe(true));
  it("keeps remote", () =>
    expect(passesFilters({ title: "ML Engineer", location: "Remote, US", company: "X" }, cal)).toBe(true));
  it("drops senior/staff/principal/director/VP", () => {
    for (const t of ["Senior Engineer", "Staff SWE", "Principal Engineer", "Engineering Director", "VP, Engineering"])
      expect(passesFilters({ title: t, location: "Boston, MA", company: "X" }, cal)).toBe(false);
  });
  it("drops out-of-region non-remote roles", () =>
    expect(passesFilters({ title: "SWE", location: "San Francisco, CA", company: "X" }, cal)).toBe(false));
  it("drops excluded-sector employers (match on company)", () =>
    expect(passesFilters({ title: "Electrical Engineer", location: "Hartford, CT", company: "Eversource Utility" }, cal)).toBe(false));
  it("does NOT drop 'power electronics' titles at non-excluded employers", () =>
    expect(passesFilters({ title: "Power Electronics Engineer", location: "Wilmington, MA", company: "Analog Devices" }, cal)).toBe(true));
});

describe("tagKnown", () => {
  const known = {
    urls: new Set(["https://job-boards.greenhouse.io/x/jobs/1"]),
    titleKeys: new Set([titleKey("Y", "Robotics Engineer")]),
  };
  it("matches by exact url", () =>
    expect(tagKnown({ company: "X", title: "New", url: "https://job-boards.greenhouse.io/x/jobs/1" }, known)).toBe(true));
  it("matches by normalized company|title", () =>
    expect(tagKnown({ company: "Y", title: "Robotics Engineer", url: "https://other" }, known)).toBe(true));
  it("new posting → false", () =>
    expect(tagKnown({ company: "Z", title: "Fresh Role", url: "https://new" }, known)).toBe(false));
});
