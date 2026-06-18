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
});
