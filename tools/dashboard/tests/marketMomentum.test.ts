import { describe, it, expect } from "vitest";
import { aggregateTrajectory } from "../src/lib/marketMomentum.js";
import type { MarketTrack } from "../src/lib/types.js";

const t = (track: string, trajectory?: MarketTrack["trajectory"]): MarketTrack => ({ track, trajectory });

describe("aggregateTrajectory", () => {
  it("reads 'rising' when more tracks rise than cool", () => {
    const agg = aggregateTrajectory([t("a", "rising"), t("b", "rising"), t("c", "steady"), t("d", "cooling")]);
    expect(agg.direction).toBe("rising");
    expect(agg).toMatchObject({ rising: 2, steady: 1, cooling: 1, n: 4 });
  });

  it("reads 'cooling' when more tracks cool than rise", () => {
    expect(aggregateTrajectory([t("a", "cooling"), t("b", "cooling"), t("c", "rising")]).direction).toBe("cooling");
  });

  it("reads 'steady' when rising and cooling are tied", () => {
    expect(aggregateTrajectory([t("a", "rising"), t("b", "cooling"), t("c", "steady")]).direction).toBe("steady");
  });

  it("ignores tracks with no trajectory (does not count them in n)", () => {
    const agg = aggregateTrajectory([t("a", "rising"), t("b"), t("c")]);
    expect(agg.n).toBe(1);
    expect(agg.direction).toBe("rising");
  });

  it("reads 'steady' for an empty list", () => {
    expect(aggregateTrajectory([])).toMatchObject({ direction: "steady", n: 0 });
  });
});
