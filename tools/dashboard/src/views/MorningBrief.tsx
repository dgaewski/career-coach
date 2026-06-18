import { Link } from "react-router-dom";
import { useData } from "../hooks/useData.js";
import type { Brief } from "../lib/types.js";
import { CountUp } from "../components/primitives.js";

/* ── helpers ────────────────────────────────────────────────────────── */

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).toUpperCase();
  } catch {
    return iso;
  }
}

/* ── sub-components ─────────────────────────────────────────────────── */

function DropCapParagraph({ text }: { text: string }) {
  if (!text) return null;
  const first = text[0];
  const rest = text.slice(1);
  return (
    <p style={{ margin: "0 0 1.1em", lineHeight: 1.64, color: "var(--ink2)", fontSize: 15, position: "relative" }}>
      <span
        aria-hidden="true"
        style={{
          float: "left",
          fontSize: 66,
          lineHeight: 0.82,
          fontFamily: "'Newsreader', Georgia, serif",
          fontWeight: 700,
          color: "var(--accent)",
          marginRight: 6,
          marginTop: 6,
          letterSpacing: "-0.02em",
        }}
      >{first}</span>
      {rest}
    </p>
  );
}

function PullStat({ number, label }: { number: string; label: string }) {
  return (
    <div style={{
      borderLeft: "3px solid var(--accent)",
      paddingLeft: 16,
      margin: "20px 0",
      display: "flex",
      alignItems: "baseline",
      gap: 10,
    }}>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 40,
        fontWeight: 700,
        color: "var(--accent)",
        lineHeight: 1,
        letterSpacing: "-0.03em",
      }}>{number}</span>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11.5,
        fontWeight: 600,
        color: "var(--muted3)",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
      }}>{label}</span>
    </div>
  );
}

function ThreeRolesList({ roles }: { roles: Brief["threeRoles"] }) {
  if (!roles.length) return null;
  return (
    <div style={{ marginTop: 20 }}>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "var(--muted3)",
        marginBottom: 10,
        paddingBottom: 8,
        borderBottom: "1px solid var(--line4)",
      }}>
        Three roles worth reading today
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {roles.map((r) => (
          <Link
            key={r.id}
            to={`/jobs/${r.id}`}
            style={{ textDecoration: "none" }}
          >
            <div style={{
              padding: "10px 0",
              borderBottom: "1px solid var(--line5)",
              cursor: "pointer",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{
                  fontSize: 14.5,
                  fontWeight: 600,
                  color: "var(--ink)",
                  fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
                  transition: "color 150ms",
                }}>{r.title}</span>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  color: "var(--muted3)",
                  marginLeft: 10,
                  flexShrink: 0,
                }}>{r.company}</span>
              </div>
              <div style={{
                fontSize: 12.5,
                color: "var(--muted2)",
                marginTop: 2,
                lineHeight: 1.5,
              }}>{r.why}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function OvernightLog({ overnight }: { overnight: Brief["overnight"] }) {
  const { newRoles, fitImproved, staleFlipped } = overnight;
  const hasEntries = newRoles.length + fitImproved.length + staleFlipped.length > 0;

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "var(--muted3)",
        marginBottom: 10,
        paddingBottom: 8,
        borderBottom: "1px solid var(--line4)",
      }}>
        What changed overnight
      </div>
      {!hasEntries && (
        <p style={{ fontSize: 13, color: "var(--muted3)", fontStyle: "italic", margin: 0 }}>
          No changes since last index.
        </p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {newRoles.map((r) => (
          <div key={r.id} style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            padding: "4px 0",
          }}>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 700,
              fontSize: 12,
              color: "var(--green-fg)",
            }}>↑ new</span>
            <span style={{ color: "var(--ink3)" }}>{r.title}</span>
            <span style={{ color: "var(--muted3)", fontSize: 11.5 }}>{r.company}</span>
          </div>
        ))}
        {fitImproved.map((r) => (
          <div key={r.id} style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            padding: "4px 0",
          }}>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 700,
              fontSize: 12,
              color: "var(--green-fg)",
            }}>↑ fit</span>
            <span style={{ color: "var(--ink3)" }}>{r.title}</span>
            {"from" in r && "to" in r && (
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                color: "var(--muted3)",
              }}>+{(r as { from: number; to: number }).to - (r as { from: number; to: number }).from}</span>
            )}
          </div>
        ))}
        {staleFlipped.map((r) => (
          <div key={r.id} style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            padding: "4px 0",
          }}>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 700,
              fontSize: 12,
              color: "var(--amber-fg)",
            }}>! stale</span>
            <span style={{ color: "var(--ink3)" }}>{r.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FreshnessBar({ freshness }: { freshness: Brief["freshness"] }) {
  const total = freshness.fresh + freshness.recent + freshness.stale || 1;
  const freshPct = (freshness.fresh / total) * 100;
  const recentPct = (freshness.recent / total) * 100;
  const stalePct = (freshness.stale / total) * 100;
  return (
    <div style={{ marginTop: 20 }}>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "var(--muted3)",
        marginBottom: 8,
      }}>Freshness</div>
      <div style={{
        display: "flex",
        height: 8,
        borderRadius: 999,
        overflow: "hidden",
        gap: 2,
      }}>
        <div style={{
          width: `${freshPct}%`,
          background: "#1E9E5A",
          borderRadius: "999px 0 0 999px",
          transition: "width 700ms cubic-bezier(.22,.68,0,1.2)",
        }} />
        <div style={{
          width: `${recentPct}%`,
          background: "#C98A1E",
        }} />
        <div style={{
          width: `${stalePct}%`,
          background: "#D8443F",
          borderRadius: "0 999px 999px 0",
        }} />
      </div>
      <div style={{
        display: "flex",
        gap: 14,
        marginTop: 8,
        fontSize: 11,
        fontFamily: "'JetBrains Mono', monospace",
        color: "var(--muted3)",
      }}>
        <span><span style={{ color: "#1E9E5A" }}>●</span> Fresh {freshness.fresh}</span>
        <span><span style={{ color: "#C98A1E" }}>●</span> Recent {freshness.recent}</span>
        <span><span style={{ color: "#D8443F" }}>●</span> Stale {freshness.stale}</span>
      </div>
    </div>
  );
}

function Ledger({ ledger }: { ledger: Brief["ledger"] }) {
  const rows: [string, number, string?][] = [
    ["Active roles",  ledger.active,     undefined],
    ["Strong fits",   ledger.strongFits, "≥80"],
    ["In pipeline",   ledger.inPipeline, undefined],
    ["Interviews",    ledger.interviews, undefined],
    ["Offers",        ledger.offers,     undefined],
  ];
  return (
    <div>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "var(--muted3)",
        marginBottom: 14,
        paddingBottom: 8,
        borderBottom: "1px solid var(--line)",
      }}>
        By the numbers
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {rows.map(([label, value, sub], i) => (
          <div
            key={label}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              padding: "10px 0",
              borderBottom: i < rows.length - 1 ? "1px dotted var(--dotline)" : "none",
            }}
          >
            <div>
              <span style={{ fontSize: 14, color: "var(--ink2)", lineHeight: 1 }}>{label}</span>
              {sub && (
                <span style={{
                  display: "block",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  color: "var(--muted3)",
                  marginTop: 1,
                }}>{sub}</span>
              )}
            </div>
            <span
              data-testid={label === "Active roles" ? "ledger-active" : undefined}
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 22,
                fontWeight: 700,
                color: label === "Strong fits" ? "var(--accent)" : "var(--ink)",
                letterSpacing: "-0.02em",
              }}
            >
              <CountUp value={value} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NudgeCard({ nudge }: { nudge: string }) {
  return (
    <div style={{
      marginTop: 24,
      background: "linear-gradient(135deg, #211E1A 0%, #2A2622 100%)",
      borderRadius: 14,
      padding: "18px 20px",
      color: "#fff",
    }}>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "var(--amber-fg)",
        marginBottom: 10,
      }}>
        Coach's nudge
      </div>
      <p style={{
        margin: 0,
        fontFamily: "'Newsreader', Georgia, serif",
        fontSize: 15.5,
        lineHeight: 1.58,
        color: "rgba(255,255,255,0.88)",
        fontStyle: "italic",
      }}>{nudge}</p>
    </div>
  );
}

function InDemandBand({ skills }: { skills: Brief["inDemand"] }) {
  if (!skills.length) return null;
  const maxCount = Math.max(...skills.map(s => s.count), 1);
  return (
    <div style={{ marginTop: 0 }}>
      {/* Double rule top */}
      <div style={{ borderTop: "3px double var(--rule)", paddingTop: 18 }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--amber-fg)",
          marginBottom: 16,
        }}>
          In demand this week
        </div>
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "8px 12px",
          alignItems: "baseline",
        }}>
          {skills.map((s) => {
            const weight = s.count / maxCount;
            const fontSize = 14 + weight * 22;
            const mark = s.have
              ? <span style={{ fontSize: fontSize * 0.55, color: "#1E9E5A", marginLeft: 2, verticalAlign: "super" }}>✓</span>
              : s.trend === "rising"
                ? <span style={{ fontSize: fontSize * 0.55, color: "var(--green-fg)", marginLeft: 2, verticalAlign: "super" }}>↑</span>
                : s.trend === "declining"
                  ? <span style={{ fontSize: fontSize * 0.55, color: "var(--red-fg)", marginLeft: 2, verticalAlign: "super" }}>↓</span>
                  : null;
            return (
              <span
                key={s.name}
                style={{
                  fontFamily: "'Newsreader', Georgia, serif",
                  fontSize,
                  fontWeight: 600,
                  color: s.have ? "var(--ink)" : "var(--ink2)",
                  lineHeight: 1.2,
                  cursor: "default",
                }}
              >
                {s.name}{mark}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MORNING BRIEF VIEW
   ══════════════════════════════════════════════════════════════════════ */

export default function MorningBrief(): JSX.Element {
  const { data, error, loading } = useData<Brief>("/api/brief");

  /* ── loading ── */
  if (loading) {
    return (
      <div style={{
        padding: "80px 0",
        textAlign: "center",
        color: "var(--muted3)",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 13,
        letterSpacing: "0.08em",
      }}>
        Loading The Morning Brief…
      </div>
    );
  }

  /* ── error / empty ── */
  if (error || !data) {
    return (
      <div style={{
        padding: "80px 32px",
        maxWidth: 560,
        margin: "0 auto",
        textAlign: "center",
      }}>
        <div style={{
          fontFamily: "'Newsreader', Georgia, serif",
          fontSize: 32,
          fontWeight: 700,
          color: "var(--ink)",
          marginBottom: 12,
          letterSpacing: "-0.01em",
        }}>
          The Morning Brief
        </div>
        <p style={{ color: "var(--muted2)", fontSize: 14.5, lineHeight: 1.6, margin: 0 }}>
          {error
            ? `Could not load the brief — ${error}. Run a batch ingest to generate one.`
            : "No brief available yet. Write a batch brief in coach/briefs/ or run an ingest to generate the templated version."}
        </p>
      </div>
    );
  }

  const { masthead, lead, threeRoles, overnight, ledger, freshness, nudge, inDemand, source } = data;

  return (
    <div
      style={{
        animation: "ccrise 0.4s ease both",
        paddingBottom: 64,
      }}
    >
      {/* ── Broadsheet panel ── */}
      <div style={{
        background: "var(--bg2)",
        borderRadius: 20,
        padding: "0 0 32px",
        border: "1px solid var(--line3)",
        boxShadow: "0 1px 2px rgba(28,26,23,.04), 0 18px 44px -36px rgba(28,26,23,.4)",
        overflow: "hidden",
      }}>

        {/* ── Masthead ── */}
        <div style={{ padding: "22px 36px 0" }}>
          {/* Masthead rule line */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--muted3)",
            }}>
              Vol. {masthead.vol} · No. {masthead.no}
            </span>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--muted3)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}>
              <span style={{
                display: "inline-block",
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#1E9E5A",
                animation: "ccpulse 1.4s ease-in-out infinite",
              }} />
              Indexed {relativeTime(masthead.indexedAt)} · Live
            </span>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--muted3)",
            }}>
              {formatDate(masthead.date)}
            </span>
          </div>

          {/* Top rule */}
          <div style={{ borderTop: "1px solid var(--rule)", marginBottom: 18 }} />

          {/* "The Morning Brief" centered serif title */}
          <div style={{ textAlign: "center", paddingBottom: 16 }}>
            <h1 style={{
              fontFamily: "'Newsreader', Georgia, serif",
              fontSize: 52,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "var(--ink)",
              margin: "0 0 10px",
              lineHeight: 1.1,
            }}>
              The Morning Brief
            </h1>
            <p style={{
              fontFamily: "'Newsreader', Georgia, serif",
              fontSize: 16,
              fontStyle: "italic",
              color: "var(--muted2)",
              margin: 0,
            }}>
              {lead.byline}
            </p>
          </div>

          {/* Double-rule bottom of masthead */}
          <div style={{
            borderTop: "3px double var(--rule)",
            marginBottom: 0,
          }} />
        </div>

        {/* ── Body: 2-column (lead + ledger) ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1.85fr 1fr",
          padding: "0 36px",
          gap: 0,
        }}>
          {/* Lead column */}
          <div style={{
            paddingTop: 28,
            paddingRight: 36,
            paddingBottom: 28,
            borderRight: "1px solid var(--line)",
          }}>
            {/* Mono kicker */}
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--amber-fg)",
              marginBottom: 10,
            }}>
              {lead.kicker}
            </div>

            {/* Newsreader headline */}
            <h2 style={{
              fontFamily: "'Newsreader', Georgia, serif",
              fontSize: 34,
              fontWeight: 700,
              letterSpacing: "-0.01em",
              lineHeight: 1.18,
              color: "var(--ink)",
              margin: "0 0 10px",
            }}>
              {lead.headline}
            </h2>

            {/* Mono byline */}
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11.5,
              color: "var(--muted3)",
              letterSpacing: "0.04em",
              marginBottom: 20,
              paddingBottom: 16,
              borderBottom: "1px solid var(--line4)",
            }}>
              {lead.byline}
            </div>

            {/* Body paragraphs — first gets drop cap */}
            {lead.paragraphs.map((p, i) =>
              i === 0
                ? <DropCapParagraph key={i} text={p} />
                : <p key={i} style={{ margin: "0 0 1.1em", lineHeight: 1.64, color: "var(--ink2)", fontSize: 15 }}>{p}</p>
            )}

            {/* Pull-stat box */}
            <PullStat number={lead.pullStat.number} label={lead.pullStat.label} />

            {/* Three roles */}
            <ThreeRolesList roles={threeRoles} />

            {/* Overnight log */}
            <OvernightLog overnight={overnight} />
          </div>

          {/* Ledger sidebar */}
          <div style={{
            paddingTop: 28,
            paddingLeft: 28,
            paddingBottom: 28,
          }}>
            {/* By the numbers */}
            <Ledger ledger={ledger} />

            {/* Freshness stacked bar */}
            <FreshnessBar freshness={freshness} />

            {/* Coach's nudge */}
            <NudgeCard nudge={nudge} />
          </div>
        </div>

        {/* ── In-demand band ── */}
        <div style={{ padding: "4px 36px 0" }}>
          <InDemandBand skills={inDemand} />
        </div>

        {/* ── Templated note ── */}
        {source === "templated" && (
          <div style={{
            margin: "20px 36px 0",
            padding: "10px 16px",
            background: "var(--amber-soft)",
            borderRadius: 9,
            borderLeft: "3px solid var(--amber-fg)",
          }}>
            <span style={{
              fontSize: 12.5,
              color: "var(--amber-fg)",
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              Auto-generated from your data — write a batch brief for the editorial version.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
