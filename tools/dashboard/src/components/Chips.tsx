import type { FitTier, Freshness, Trend, DemandTier } from "../lib/types.js";

const STARS: Record<FitTier, string> = { excellent: "★★★★", good: "★★★", stretch: "★★", poor: "★" };
export function FitStars({ tier, score }: { tier: FitTier; score: number }): JSX.Element {
  return <span className="chip" title={tier}>{STARS[tier]} {score}</span>;
}

export function TrendArrow({ trend }: { trend: Trend }): JSX.Element {
  return <span title={trend}>{trend === "rising" ? "↑" : trend === "declining" ? "↓" : "→"}</span>;
}

const FRESH_CLASS: Record<Freshness, string> = { high: "green", medium: "amber", low: "red" };
export function FreshnessChip({ freshness }: { freshness: Freshness }): JSX.Element {
  return <span className={`chip ${FRESH_CLASS[freshness]}`}>{freshness}</span>;
}

const TIER_CLASS: Record<DemandTier, string> = { "high-demand": "green", common: "", occasional: "amber", rare: "red" };
export function DemandChip({ tier }: { tier: DemandTier }): JSX.Element {
  return <span className={`chip ${TIER_CLASS[tier]}`}>{tier}</span>;
}
