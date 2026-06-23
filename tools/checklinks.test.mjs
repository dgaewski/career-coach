import { describe, it, expect } from "vitest";
import { classifyStatus, isGenericCareers } from "./checklinks.mjs";

describe("checklinks classify", () => {
  it("2xx is live", () => expect(classifyStatus(200, "https://x.com/jobs/123", "https://x.com/jobs/123")).toBe("live"));
  it("404 is dead", () => expect(classifyStatus(404, "https://x.com/jobs/123", "https://x.com/jobs/123")).toBe("dead"));
  it("410 is dead", () => expect(classifyStatus(410, "https://x.com/jobs/123", "https://x.com/jobs/123")).toBe("dead"));
  it("403 (bot-block) is unverified, not dead", () =>
    expect(classifyStatus(403, "https://x.com/jobs/123", "https://x.com/jobs/123")).toBe("unverified"));
  it("500 is unverified, not dead", () =>
    expect(classifyStatus(500, "https://x.com/jobs/123", "https://x.com/jobs/123")).toBe("unverified"));
  it("2xx redirected to careers home is redirected", () =>
    expect(classifyStatus(200, "https://x.com/jobs/123", "https://x.com/careers")).toBe("redirected"));
  it("isGenericCareers detects bare careers pages", () => {
    expect(isGenericCareers("https://x.com/careers")).toBe(true);
    expect(isGenericCareers("https://x.com/jobs/00123-engineer")).toBe(false);
  });

  // Soft-404s: ATS that return HTTP 200 for a closed posting by redirecting the
  // specific listing to a board/landing. A naive HTTP-status check calls these "live".
  it("greenhouse ?error=true soft-404 is redirected, not live", () =>
    expect(classifyStatus(200,
      "https://job-boards.greenhouse.io/assemblyai/jobs/4650728005",
      "https://job-boards.greenhouse.io/assemblyai?error=true")).toBe("redirected"));
  it("cross-host redirect to a board landing is redirected", () =>
    expect(classifyStatus(200,
      "https://job-boards.greenhouse.io/andurilindustries/jobs/5126790007",
      "https://www.anduril.com/open-roles")).toBe("redirected"));
  it("redirect that drops the posting id is redirected", () =>
    expect(classifyStatus(200,
      "https://job-boards.greenhouse.io/flagshippioneering/jobs/4811757008",
      "https://www.flagshippioneering.com/join/roles")).toBe("redirected"));
  it("SPA (Ashby/Workday/Gem) that keeps the same URL stays live", () =>
    expect(classifyStatus(200,
      "https://jobs.ashbyhq.com/angi/18336a40-d7ab-4ead-90fc-e33504430677",
      "https://jobs.ashbyhq.com/angi/18336a40-d7ab-4ead-90fc-e33504430677")).toBe("live"));
  it("redirect to the SAME posting with an added title slug stays live", () =>
    expect(classifyStatus(200,
      "https://job-boards.greenhouse.io/co/jobs/4811757008",
      "https://job-boards.greenhouse.io/co/jobs/4811757008-software-engineer")).toBe("live"));
  it("isGenericCareers also detects board landings", () => {
    expect(isGenericCareers("https://www.anduril.com/open-roles")).toBe(true);
    expect(isGenericCareers("https://www.flagshippioneering.com/join/roles")).toBe(true);
    expect(isGenericCareers("https://job-boards.greenhouse.io/assemblyai/jobs/4650728005")).toBe(false);
  });
});
