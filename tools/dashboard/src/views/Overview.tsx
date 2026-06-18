import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useData } from "../hooks/useData.js";
import type { Overview as OverviewData, Summary, Job } from "../lib/types.js";
import { InterestButton } from "../components/InterestButton.js";
import {
  CountUp, GrowBar, Stars, Segmented, Sparkline, Donut, WordCloud,
} from "../components/primitives.js";

/* ── helpers ── */
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function tierColor(tier: string): string {
  if (tier === "high-demand") return "var(--accent)";
  if (tier === "common") return "var(--violet)";
  if (tier === "occasional") return "var(--ink3)";
  return "var(--faint)";
}

const TRACK_LABELS: Record<string, string> = {
  robotics: "Robotics",
  software: "Software",
  "ai-ml": "AI / ML",
  "ee-hardware": "EE / Hardware",
};

/* ── card shell ── */
const cardStyle: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--line)",
  borderRadius: 16,
  padding: 22,
  boxShadow: "0 1px 2px rgba(28,26,23,.04),0 18px 44px -36px rgba(28,26,23,.4)",
};

/* ── pipeline bar colours ── */
const PIPE_COLORS: Record<string, string> = {
  interested: "linear-gradient(180deg,var(--blue-soft),#DCE5FE)",
  applied:    "linear-gradient(180deg,#CBDAFD,#A9C2FB)",
  interview:  "linear-gradient(180deg,#9FB6F8,#7A53F2)",
  offer:      "#1E9E5A",
  rejected:   "#E9D6D5",
};
const PIPE_ORDER = ["interested", "applied", "interview", "offer", "rejected"] as const;

/* ═══════════════════════════════════════════════════════════════
   OVERVIEW VIEW
   ═══════════════════════════════════════════════════════════════ */
export default function Overview(): JSX.Element {
  const [gran, setGran] = useState<"weekly" | "monthly">("weekly");
  const navigate = useNavigate();

  const ovRes   = useData<OverviewData>("/api/overview");
  const sumRes  = useData<Summary>("/api/summary");
  const briefRes = useData<import("../lib/types.js").Brief>("/api/brief");
  const jobsRes = useData<Job[]>("/api/jobs");

  if (ovRes.loading || sumRes.loading) {
    return (
      <div style={{ padding: "60px 0", textAlign: "center", color: "var(--muted3)",
                    fontFamily: "'JetBrains Mono',monospace", fontSize: 13 }}>
        Loading…
      </div>
    );
  }
  if (!ovRes.data || !ovRes.data.hero || !sumRes.data) {
    return (
      <div style={{ padding: "60px 0", textAlign: "center", color: "var(--muted3)" }}>
        {ovRes.error ?? sumRes.error ?? "Failed to load overview."}
      </div>
    );
  }

  const ov  = ovRes.data;
  const sum = sumRes.data;

  /* fitSpread — guard against stale API responses that predate Phase 5a */
  const spread = ov.fitSpread ?? { excellent: 0, good: 0, stretch: 0, poor: 0 };

  /* To-review lane — show shortlisted roles AND top-fit candidates together, so picking one
     marks it (★) in place instead of making the other candidates vanish. */
  const allJobs = jobsRes.data ?? [];
  const interested = allJobs.filter(j => j.fm["app-status"] === "interested");
  const topFits = [...allJobs].sort((a, b) => b.fit.score - a.fit.score).slice(0, 6);
  const reviewSeen = new Set<string>();
  const reviewList: typeof allJobs = [];
  for (const j of [...interested, ...topFits]) {
    if (!reviewSeen.has(j.id)) { reviewSeen.add(j.id); reviewList.push(j); }
  }
  reviewList.sort((a, b) => b.fit.score - a.fit.score);
  const reviewEmpty = interested.length === 0;

  /* word-cloud items */
  const maxCount = Math.max(...ov.wordCloud.map(w => w.count), 1);
  const cloudItems = ov.wordCloud.map(w => ({
    key:    w.slug,
    label:  w.name,
    weight: w.count / maxCount,
    color:  tierColor(w.tier),
    mark:   w.have ? <span style={{ color: "var(--green-fg)", fontSize: "0.6em", marginLeft: 3 }}>✓</span> : undefined,
  }));

  /* demand by track */
  const trackEntries = Object.entries(ov.demandByTrack);
  const maxTrack = Math.max(...trackEntries.map(([, v]) => v), 1);

  /* pipeline bars */
  const pipeMax = Math.max(...PIPE_ORDER.map(k => ov.pipeline[k]), 1);

  /* momentum */
  const mom = ov.momentum[gran];
  const dirLabel = mom.direction === "rising" ? "Rising" :
                   mom.direction === "declining" ? "Declining" : "Stable";
  const dirIcon  = mom.direction === "rising" ? "↑" :
                   mom.direction === "declining" ? "↓" : "→";
  const dirColor = mom.direction === "rising" ? "var(--green-fg)" :
                   mom.direction === "declining" ? "var(--red-fg, #D8443F)" : "var(--muted3)";

  /* greeting + delta */
  const firstName = (sum.user?.name || "").trim().split(/\s+/)[0] || "there";
  const newCount  = ov.changes?.newRoles?.length ?? 0;
  const dateLabel = new Date(sum.generatedAt).toLocaleDateString("en-US",
    { weekday: "long", day: "numeric", month: "long" });

  return (
    <div style={{ animation: "ccfade .4s ease both" }}>

      {/* ── GREETING ── */}
      <div style={{
        display: "flex", alignItems: "flex-end", justifyContent: "space-between",
        gap: 20, marginBottom: 24, animation: "ccrise .5s ease both",
      }}>
        <div>
          <h3 style={{
            fontFamily: "'Newsreader',serif", fontWeight: 500, fontSize: 34,
            margin: "0 0 6px", letterSpacing: "-0.01em",
          }}>Good morning, {firstName}.</h3>
          <div style={{
            fontSize: 14, color: "var(--muted3)",
            fontFamily: "'JetBrains Mono',monospace",
          }}>
            <span style={{ color: "var(--ink2)" }}>{dateLabel}</span>
            {" · indexed "}
            <span style={{ color: "var(--green-fg)" }}>{relativeTime(sum.generatedAt)}</span>
            {" · "}
            <span style={{ color: "var(--ink)" }}>{ov.hero.activeRoles}</span> postings tracked
          </div>
        </div>
        <Link to="/brief" style={{
          textDecoration: "none",
          background: "var(--solid)", color: "#fff", fontWeight: 600, fontSize: 14,
          padding: "11px 18px", borderRadius: 11, fontFamily: "inherit",
          display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap",
        }}>
          Read the Morning Brief <span style={{ opacity: .6 }}>→</span>
        </Link>
      </div>

      {/* ── HERO CARDS ── */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 16,
      }}>
        {/* Active roles */}
        <div style={{ ...cardStyle, animation: "ccrise .5s ease both", animationDelay: ".04s" }}>
          <div style={{
            fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: ".1em",
            textTransform: "uppercase", color: "var(--muted3)", marginBottom: 14,
          }}>Active roles</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 9 }}>
            <span style={{ fontSize: 46, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1 }}>
              <CountUp value={ov.hero.activeRoles} />
            </span>
            {newCount > 0 && (
              <span style={{
                fontFamily: "'JetBrains Mono',monospace", fontSize: 13,
                fontWeight: 600, color: "var(--green-fg)",
              }}>↑ {newCount}</span>
            )}
          </div>
          <div style={{ fontSize: 13, color: "var(--muted3)", marginTop: 8 }}>
            {newCount > 0 ? `${newCount} new since last index` : "postings tracked"}
          </div>
        </div>

        {/* Strong fits */}
        <div style={{ ...cardStyle, animation: "ccrise .5s ease both", animationDelay: ".1s" }}>
          <div style={{
            fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: ".1em",
            textTransform: "uppercase", color: "var(--muted3)", marginBottom: 14,
          }}>Strong fits</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 9 }}>
            <span style={{
              fontSize: 46, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1,
              color: "var(--accent)",
            }}>
              <CountUp value={ov.hero.strongFits} />
            </span>
          </div>
          <div style={{ marginTop: 10 }}>
            <div style={{ display: "flex", height: 7, borderRadius: 99, overflow: "hidden", background: "var(--line5,#EBEBEB)" }}>
              {([
                ["excellent", "var(--accent)"], ["good", "var(--violet)"], ["stretch", "var(--ink3)"],
              ] as const).map(([k, c]) => {
                const v = spread[k as "excellent" | "good" | "stretch"];
                return v > 0 ? <div key={k} title={`${k}: ${v}`} style={{ flex: v, background: c }} /> : null;
              })}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted3)", marginTop: 7, fontFamily: "'JetBrains Mono',monospace" }}>
              {spread.excellent} excellent · {spread.good} good · {spread.stretch} stretch
            </div>
          </div>
        </div>

        {/* In pipeline */}
        <div style={{ ...cardStyle, animation: "ccrise .5s ease both", animationDelay: ".16s" }}>
          <div style={{
            fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: ".1em",
            textTransform: "uppercase", color: "var(--muted3)", marginBottom: 14,
          }}>In pipeline</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 9 }}>
            <span style={{ fontSize: 46, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1 }}>
              <CountUp value={ov.hero.inPipeline} />
            </span>
            <span style={{
              fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: "var(--muted3)",
            }}>apps</span>
          </div>
          <div style={{ fontSize: 13, color: "var(--muted3)", marginTop: 8 }}>
            {ov.pipeline.interview} interviews · {ov.pipeline.offer} offer
          </div>
        </div>

        {/* Top match */}
        <div style={{ ...cardStyle, animation: "ccrise .5s ease both", animationDelay: ".22s" }}>
          <div style={{
            fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: ".1em",
            textTransform: "uppercase", color: "var(--muted3)", marginBottom: 14,
          }}>Top match</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 9 }}>
            <span style={{ fontSize: 46, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1 }}>
              <CountUp value={ov.hero.topMatch} />
            </span>
            <Stars score={ov.hero.topMatch} />
          </div>
          <div style={{ fontSize: 13, color: "var(--muted3)", marginTop: 8 }}>
            {ov.hero.topMatchId
              ? <Link to={`/jobs/${ov.hero.topMatchId}`} style={{ color: "var(--accent)", textDecoration: "none" }}>see the role →</Link>
              : "fit score"}
          </div>
        </div>
      </div>

      {/* ── PIPELINE + FRESHNESS ── */}
      <div style={{
        display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: 16, marginBottom: 16,
      }}>
        {/* Pipeline */}
        <div style={{ ...cardStyle, animation: "ccrise .5s ease both", animationDelay: ".2s" }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20,
          }}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>Pipeline</span>
            <Link to="/tracker" style={{
              textDecoration: "none",
              fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "var(--accent)",
            }}>Open Tracker →</Link>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 120 }}>
            {PIPE_ORDER.map((key, i) => {
              const count = ov.pipeline[key];
              const barH  = Math.max(8, Math.round((count / pipeMax) * 96));
              const isOffer    = key === "offer";
              const isRejected = key === "rejected";
              const numColor   = isOffer ? "var(--green-fg)" : isRejected ? "var(--muted3)" : "inherit";
              return (
                <div key={key} style={{
                  flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                }}>
                  <span style={{
                    fontFamily: "'JetBrains Mono',monospace", fontWeight: 600,
                    fontSize: 15, color: numColor,
                  }}>{count}</span>
                  <div style={{
                    width: "100%", height: barH,
                    background: PIPE_COLORS[key],
                    borderRadius: "8px 8px 4px 4px",
                    transformOrigin: "bottom",
                    animation: `ccgrow ${0.8 + i * 0.1}s cubic-bezier(.2,.7,.2,1) both`,
                    marginTop: "auto",
                  }} />
                  <span style={{
                    fontSize: 11, color: "var(--muted3)",
                    textTransform: "capitalize",
                  }}>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Freshness donut */}
        <div style={{ ...cardStyle, animation: "ccrise .5s ease both", animationDelay: ".26s" }}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 18 }}>Freshness</div>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <Donut
              segments={[
                { value: ov.freshness.fresh,  color: "#1E9E5A" },
                { value: ov.freshness.recent, color: "#C98A1E" },
                { value: ov.freshness.stale,  color: "#D8443F" },
              ]}
              label={String(ov.hero.activeRoles)}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 9, fontSize: 13 }}>
              {([
                { label: "Fresh",  count: ov.freshness.fresh,  color: "#1E9E5A" },
                { label: "Recent", count: ov.freshness.recent, color: "#C98A1E" },
                { label: "Stale",  count: ov.freshness.stale,  color: "#D8443F" },
              ] as const).map(({ label, count, color }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{
                    width: 9, height: 9, borderRadius: 3, background: color, flexShrink: 0,
                  }} />
                  {label}{" "}
                  <span style={{
                    fontFamily: "'JetBrains Mono',monospace", color: "var(--muted3)", marginLeft: 2,
                  }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── MOMENTUM + DEMAND BY TRACK ── */}
      <div style={{
        display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, marginBottom: 16,
      }}>
        {/* Market momentum */}
        <div style={{
          background: "linear-gradient(160deg,var(--blue-soft),var(--violet-soft))",
          border: "1px solid var(--line)", borderRadius: 16, padding: 22,
          animation: "ccrise .5s ease both", animationDelay: ".24s",
        }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6,
          }}>
            <span style={{
              fontFamily: "'JetBrains Mono',monospace", fontSize: 11,
              letterSpacing: ".1em", textTransform: "uppercase", color: "#5566C8",
            }}>Market momentum</span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{
                fontFamily: "'JetBrains Mono',monospace", fontSize: 12,
                color: dirColor, fontWeight: 600,
              }}>{dirIcon} {mom.pct}% · {mom.span}</span>
              <Segmented
                options={[["weekly", "Weekly"], ["monthly", "Monthly"]]}
                value={gran}
                onChange={setGran}
              />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{
              fontSize: 40, fontWeight: 800, letterSpacing: "-0.03em",
              lineHeight: 1.1, color: "#2F3DC0",
            }}>{dirLabel}</span>
            <span style={{ fontSize: 14, color: "#5566C8" }}>demand for your tracks</span>
          </div>
          <div style={{ marginTop: 10 }}>
            <Sparkline points={mom.series.map(p => p.count)} width={340} height={80} />
          </div>
        </div>

        {/* Demand by track */}
        <div style={{ ...cardStyle, animation: "ccrise .5s ease both", animationDelay: ".3s" }}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 18 }}>Demand by track</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {trackEntries.map(([key, count]) => (
              <div key={key}>
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  fontSize: 13, marginBottom: 5,
                }}>
                  <span>{TRACK_LABELS[key] ?? key}</span>
                  <span style={{
                    fontFamily: "'JetBrains Mono',monospace", color: "var(--muted)",
                  }}>{count}</span>
                </div>
                <div style={{
                  height: 8, background: "var(--line5, #EBEBEB)",
                  borderRadius: 99, overflow: "hidden",
                }}>
                  <GrowBar frac={count / maxTrack} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── WORD CLOUD + BRIEF ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16 }}>
        {/* Word cloud */}
        <div style={{ ...cardStyle, animation: "ccrise .5s ease both", animationDelay: ".32s" }}>
          <div style={{
            display: "flex", alignItems: "center",
            justifyContent: "space-between", marginBottom: 16,
          }}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>What the market wants</span>
            <Link to="/skills" style={{
              textDecoration: "none",
              fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "var(--accent)",
            }}>Skill cloud →</Link>
          </div>
          <WordCloud
            items={cloudItems}
            onPick={slug => navigate(`/skills/${slug}`)}
          />
        </div>

        {/* This week's brief — dark feature card */}
        <Link to="/brief" style={{
          textDecoration: "none",
          background: "linear-gradient(150deg,#211E1A,var(--rule,#2A2520))",
          borderRadius: 16, padding: 24, color: "#fff",
          display: "flex", flexDirection: "column", justifyContent: "space-between",
          boxShadow: "0 18px 44px -30px rgba(28,26,23,.7)",
          animation: "ccrise .5s ease both", animationDelay: ".36s",
          transition: "transform .18s ease",
        }}>
          <div>
            <div style={{
              fontFamily: "'JetBrains Mono',monospace", fontSize: 11,
              letterSpacing: ".12em", textTransform: "uppercase",
              color: "#9A8FE8", marginBottom: 14,
            }}>{briefRes.data?.lead?.kicker ?? "This week's brief"}</div>
            <h4 style={{
              fontFamily: "'Newsreader',serif", fontWeight: 500,
              fontSize: 23, lineHeight: 1.25, margin: "0 0 10px", color: "#fff",
            }}>
              {briefRes.data?.lead?.headline ?? "Your market intelligence, distilled."}
            </h4>
            <p style={{
              fontSize: 13.5, lineHeight: 1.55, color: "#C9C3BA", margin: 0,
            }}>
              {briefRes.data?.lead?.paragraphs?.[0] ?? "See new high-fit roles, momentum shifts, and your top next move."}
            </p>
          </div>
          <div style={{
            fontFamily: "'JetBrains Mono',monospace",
            fontSize: 12, color: "#9A8FE8", marginTop: 18,
          }}>Read full brief →</div>
        </Link>
      </div>

      {/* ── TO REVIEW (kept at the bottom of the page) ── */}
      <div style={{ ...cardStyle, marginTop: 16, animation: "ccrise .5s ease both", animationDelay: ".38s" }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16,
        }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>
            {reviewEmpty ? "To review · your top fits" : `To review · ${interested.length} shortlisted`}
          </span>
          <Link to="/tracker" style={{
            textDecoration: "none",
            fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "var(--accent)",
          }}>Open Tracker →</Link>
        </div>
        {reviewEmpty && (
          <div style={{
            fontSize: 13, color: "var(--muted3)", marginBottom: 14,
            fontFamily: "'JetBrains Mono',monospace",
          }}>
            You haven{"'"}t shortlisted any yet — start with these.
          </div>
        )}
        {reviewList.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--muted3)" }}>No roles to review yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {reviewList.map(j => (
              <div key={j.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 14px", borderRadius: 10,
                background: "var(--bg, #F9F8F6)", border: "1px solid var(--line5, #EBEBEB)",
              }}>
                <Link to={`/jobs/${j.id}`} style={{
                  textDecoration: "none", color: "inherit", flex: 1, minWidth: 0,
                  display: "flex", alignItems: "center", gap: 12,
                }}>
                  <span style={{
                    fontFamily: "'JetBrains Mono',monospace", fontSize: 12,
                    fontWeight: 700, color: "var(--accent)", whiteSpace: "nowrap",
                  }}>{j.fit.score}</span>
                  <span style={{ fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {j.fm.company}
                  </span>
                  <span style={{ fontSize: 13, color: "var(--muted3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {j.fm.title}
                  </span>
                </Link>
                <div style={{ flexShrink: 0, marginLeft: 12 }}>
                  <InterestButton id={j.id} status={j.fm["app-status"]} size="sm" onChanged={jobsRes.reload} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
