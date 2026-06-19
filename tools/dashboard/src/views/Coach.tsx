import { useState } from "react";
import { Link } from "react-router-dom";
import { useData } from "../hooks/useData.js";
import type { GapEntry, Job, ListedPage, Overview, Summary } from "../lib/types.js";
import { TrendArrow } from "../components/Chips.js";
import { applyPicks, readinessRows, suggestedTodos } from "../lib/coachDerive.js";
import { toggleTodo } from "../lib/mutations.js";
import { trackOptions } from "../lib/vocab.js";

const mono = "'JetBrains Mono', monospace";
const serif = "'Newsreader', serif";

// Shared light-card style (matches the Overview cards).
const cardStyle = {
  background: "var(--card)",
  border: "1px solid var(--line)",
  borderRadius: 16,
  padding: 22,
  boxShadow: "0 1px 2px rgba(28,26,23,.04), 0 18px 44px -38px rgba(28,26,23,.4)",
} as const;

// Mono uppercase kicker used across the dashboard's section labels.
const kicker = {
  fontFamily: mono, fontSize: 11, letterSpacing: ".12em",
  textTransform: "uppercase" as const, color: "var(--accent)",
};

// Per-track bar colours — distinct, non-blue hues (skill-gap bars stay blue).
const TRACK_BAR: Record<string, string> = {
  robotics:      "linear-gradient(90deg,#7A53F2,#9B6BF0)",   // violet
  "ai-ml":       "linear-gradient(90deg,#D6409F,#E861B0)",   // magenta
  "ee-hardware": "linear-gradient(90deg,#E0902E,#EBA94E)",   // amber
  software:      "linear-gradient(90deg,#159B8A,#27B3A0)",   // teal
};
const TRACK_PALETTE = [
  "linear-gradient(90deg,#7A53F2,#9B6BF0)", // violet
  "linear-gradient(90deg,#D6409F,#E861B0)", // magenta
  "linear-gradient(90deg,#E0902E,#EBA94E)", // amber
  "linear-gradient(90deg,#159B8A,#27B3A0)", // teal
  "linear-gradient(90deg,#3E7BEA,#5C95F2)", // blue
  "linear-gradient(90deg,#C7503B,#DA6A55)", // rust
];
const trackBar = (track: string): string => {
  if (TRACK_BAR[track]) return TRACK_BAR[track];
  let h = 0; for (let i = 0; i < track.length; i++) h = (h * 31 + track.charCodeAt(i)) >>> 0;
  return TRACK_PALETTE[h % TRACK_PALETTE.length];
};

// ─── Status colour for portfolio project status badge ────────────────────────
const STATUS_TONE: Record<string, { bg: string; fg: string }> = {
  "in-progress": { bg: "var(--green-soft)", fg: "var(--green-fg)" },
  done:          { bg: "var(--blue-soft)",  fg: "var(--accent)"   },
  idea:          { bg: "var(--track)",      fg: "var(--muted)"    },
};

function statusStyle(s: string) {
  const t = STATUS_TONE[s] ?? STATUS_TONE["idea"];
  return {
    background: t.bg,
    color: t.fg,
    borderRadius: "999px",
    padding: "3px 9px",
    fontSize: 11,
    fontWeight: 600,
    whiteSpace: "nowrap" as const,
  };
}

// ─── Static advice tips (fallback when no advice pages exist) ────────────────
const ADVICE_TIPS = [
  {
    label: "Interviews",
    tip: "Lead every loop with a concrete project — it answers the 'can you ship?' doubt before it's asked.",
  },
  {
    label: "Negotiation",
    tip: "Anchor on total comp, not base. Tech offers hide value in equity and relocation.",
  },
  {
    label: "Outreach",
    tip: "Warm intros reply 5× more often. Map your network before cold-applying.",
  },
];

// ─── "This week" lane (soft-tinted, footer link). `grow` makes it fill a flex column. ──
function Lane({ title, soft, fg, footer, grow, children }: {
  title: string; soft: string; fg: string; footer?: React.ReactNode; grow?: boolean; children: React.ReactNode;
}): JSX.Element {
  return (
    <div style={{ background: soft, borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", ...(grow ? { flex: 1 } : {}) }}>
      <div style={{ fontWeight: 700, fontSize: 11.5, letterSpacing: ".06em", textTransform: "uppercase", color: fg, marginBottom: 11 }}>
        {title}
      </div>
      <div style={{ flex: 1 }}>{children}</div>
      {footer && (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(0,0,0,.05)" }}>{footer}</div>
      )}
    </div>
  );
}

function LaneLink({ to, children, fg }: { to: string; children: React.ReactNode; fg: string }): JSX.Element {
  return (
    <Link to={to} style={{ fontFamily: mono, fontSize: 11.5, color: fg, textDecoration: "none", fontWeight: 600 }}>
      {children}
    </Link>
  );
}

// ─── Avatar monogram ──────────────────────────────────────────────────────────
function Avatar() {
  return (
    <div
      style={{
        width: 54,
        height: 54,
        borderRadius: "50%",
        flexShrink: 0,
        background:
          "repeating-linear-gradient(135deg,var(--line),var(--line) 6px,#EFEBE3 6px,#EFEBE3 12px)",
        border: "1px solid var(--line2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: mono,
        fontSize: 16,
        fontWeight: 700,
        color: "var(--muted)",
        letterSpacing: "-0.02em",
      }}
    >
      D
    </div>
  );
}

const tagStyle = (green = false) => ({
  background: green ? "var(--green-soft)" : "var(--track)",
  color: green ? "var(--green-fg)" : "var(--muted)",
  borderRadius: "999px", padding: "3px 9px", fontSize: 11.5, fontWeight: 600,
} as const);

// A ranked ROI gap row (used in the hero). `dense` trims the closed-by hint spacing.
function GapRow({ g, roiPct, count }: { g: GapEntry; roiPct: number; count: number }): JSX.Element {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 13.5, marginBottom: 5 }}>
        <span style={{ fontWeight: 500 }}>
          <Link to={`/skills/${g.slug}`} style={{ color: "inherit", textDecoration: "none" }}>{g.name}</Link>
          {" "}<TrendArrow trend={g.trend} />
        </span>
        <span style={{ fontFamily: mono, fontSize: 12, color: "var(--muted)" }}>
          {count} role{count === 1 ? "" : "s"}
        </span>
      </div>
      {g.closedBy.length > 0 && (
        <div style={{ fontSize: 11.5, color: "var(--green-fg)", marginBottom: 4 }}>
          ✓ closed by {g.closedBy.join(", ")}
        </div>
      )}
      <div style={{ height: 9, background: "var(--line5)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ width: `${roiPct}%`, height: "100%", background: "linear-gradient(90deg,#2F62F0,#7A53F2)", borderRadius: 99 }} />
      </div>
    </div>
  );
}

export default function Coach(): JSX.Element {
  const gap      = useData<GapEntry[]>("/api/gap");
  const projects = useData<ListedPage[]>("/api/list/coach/projects");
  const briefs   = useData<ListedPage[]>("/api/list/coach/briefs");
  const advice   = useData<ListedPage[]>("/api/list/coach/advice");

  const todos    = useData<{ text: string; done: boolean }[]>("/api/todos");
  const jobsRes  = useData<Job[]>("/api/jobs");
  const ov       = useData<Overview>("/api/overview");
  const summaryRes = useData<Summary>("/api/summary");

  // Gap-track pills: derived from user's tracks in summary (falls back to the TRACKS const via trackOptions).
  const gapTracks: [string, string][] = [
    ["all", "All"],
    ...trackOptions(summaryRes.data).map(o => [o.value, o.label] as [string, string]),
  ];

  const [gapTrack, setGapTrack] = useState<string>("all");
  const roiFor = (g: GapEntry) =>
    gapTrack === "all" ? g.roi : (g.byTrack?.[gapTrack]?.roi ?? 0);
  const countFor = (g: GapEntry) =>
    gapTrack === "all" ? g.count : (g.byTrack?.[gapTrack]?.count ?? 0);
  const gaps = [...(gap.data ?? [])]
    .filter(g => roiFor(g) > 0)
    .sort((a, b) => roiFor(b) - roiFor(a))
    .slice(0, 8);
  const maxRoi = Math.max(1, ...gaps.map(roiFor));

  const picks = applyPicks(jobsRes.data ?? []);
  const studyGaps = gaps.slice(0, 3);
  // Keep each todo's file-order index (== server task index) so toggles target the right line.
  const openTodos = (todos.data ?? []).map((t, i) => ({ ...t, i })).filter(t => !t.done).slice(0, 4);
  const readiness = readinessRows(ov.data?.trackReadiness);

  // Programmatic next-actions, complementing the Study/Apply lanes (projects, interview prep, stale advice).
  const suggestions = suggestedTodos({
    gaps: gap.data ?? [], projects: projects.data ?? [], jobs: jobsRes.data ?? [],
    advice: advice.data ?? [], nowMs: Date.now(), max: 3,
  });

  // Optimistic checkbox state for the Do lane (keyed by todo index); reconciles on the next data push.
  const [localDone, setLocalDone] = useState<Record<number, boolean>>({});
  const onToggleTodo = (idx: number): void => {
    const next = !(localDone[idx] ?? false);
    setLocalDone(m => ({ ...m, [idx]: next }));
    toggleTodo(idx, next).catch(() => setLocalDone(m => { const c = { ...m }; delete c[idx]; return c; }));
  };

  // Application pipeline mini-status (from overview), shown on the This Week header.
  const pipe = ov.data?.pipeline;
  const pipeStats = pipe
    ? ([["interested", "interested"], ["applied", "applied"], ["interview", "interview"], ["offer", "offer"]] as const)
        .map(([k, label]) => ({ label, n: pipe[k] ?? 0 })).filter(s => s.n > 0)
    : [];

  // "Updated as of" freshness — when the indexer last regenerated the data.
  const indexedAt = ov.data?.indexedAt;
  const freshLabel = indexedAt
    ? new Date(indexedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : null;

  // Brief rows sorted newest-first (name starts with date)
  const briefRows = [...(briefs.data ?? [])].reverse();

  // Advice rows: use wiki pages if any, fall back to static tips
  const adviceRows = (advice.data ?? []).length > 0 ? advice.data! : null;

  const laneEmpty = { fontSize: 12.5, color: "var(--muted3)" } as const;

  return (
    <div style={{ animation: "ccfade .4s ease both" }}>

      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 18, animation: "ccrise .5s ease both", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h3 style={{ fontFamily: serif, fontWeight: 500, fontSize: 32, margin: "0 0 6px", letterSpacing: "-0.01em" }}>
            Coach
          </h3>
          <div style={{ fontSize: 14, color: "var(--muted3)", fontFamily: mono }}>
            Your profile, your gaps, and the work that closes them
          </div>
        </div>
        {freshLabel && (
          <div style={{ fontFamily: mono, fontSize: 11.5, color: "var(--faint)" }}>
            updated {freshLabel}
          </div>
        )}
      </div>

      {/* ── MASTHEAD: identity · track readiness ───────────────────────────── */}
      <div style={{ ...cardStyle, padding: "22px 26px", marginBottom: 16, animation: "ccrise .5s ease both" }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(230px, 0.82fr) 1.6fr", gap: 28, alignItems: "center" }}>

          {/* Identity */}
          <div style={{ borderRight: "1px solid var(--line)", paddingRight: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
              <Avatar />
              <div>
                <h4 style={{ fontFamily: serif, fontWeight: 600, fontSize: 22, margin: "0 0 2px", letterSpacing: "-0.01em" }}>
                  {summaryRes.data?.user?.name || "You"}
                </h4>
                {summaryRes.data?.user?.positioning && (
                  <div style={{ fontSize: 13.5, color: "var(--muted2)" }}>{summaryRes.data.user.positioning}</div>
                )}
              </div>
            </div>
            {(() => {
              const homeLabel = summaryRes.data?.user?.geoZones.find(z => z.home)?.label ?? "";
              return (
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 14 }}>
                  {homeLabel && <span style={tagStyle()}>{homeLabel}</span>}
                  {summaryRes.data?.user?.relocate === "willing" && <span style={tagStyle(true)}>Open to relocate</span>}
                </div>
              );
            })()}
            <Link to="/page/Profile" style={{ fontFamily: mono, fontSize: 12.5, color: "var(--accent)", textDecoration: "none" }}>
              Full profile · skills with evidence →
            </Link>
          </div>

          {/* Track readiness */}
          <div>
            <div style={{ ...kicker, marginBottom: 14 }}>Track readiness</div>
            {readiness.length === 0 && <p className="muted" style={{ fontSize: 13 }}>No data yet.</p>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 26, rowGap: 13 }}>
              {readiness.map(r => (
                <div key={r.track}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
                    <span>{r.label}</span>
                    <span style={{ fontFamily: mono, fontSize: 11.5, color: "var(--muted)" }}>{r.pct}%</span>
                  </div>
                  <div style={{ height: 8, background: "var(--line5)", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ width: `${r.pct}%`, height: "100%", background: trackBar(r.track), borderRadius: 99 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── SKILL GAPS HERO (the centrepiece — high + full width) ───────────── */}
      <div style={{ ...cardStyle, padding: "24px 26px", marginBottom: 16, animation: "ccrise .5s ease both", animationDelay: ".05s" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 4 }}>
          <div>
            <div style={{ fontFamily: serif, fontWeight: 600, fontSize: 19, letterSpacing: "-0.01em" }}>
              Skill gaps · ranked by ROI
            </div>
            <div style={{ fontSize: 12.5, color: "var(--muted3)", marginTop: 3 }}>
              What to learn next — weighted by demand × how close you are.
              {" "}{gapTrack === "all" ? "Across all tracks." : `Within ${gapTracks.find(t => t[0] === gapTrack)?.[1] ?? gapTrack}.`}
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {gapTracks.map(([key, label]) => (
              <button
                key={key}
                onClick={() => setGapTrack(key)}
                style={{
                  cursor: "pointer", border: "1px solid var(--line2)", borderRadius: 999,
                  padding: "4px 11px", fontSize: 12, fontFamily: mono,
                  background: gapTrack === key ? "var(--solid)" : "transparent",
                  color: gapTrack === key ? "#fff" : "var(--muted)",
                }}
              >{label}</button>
            ))}
          </div>
        </div>

        {gaps.length === 0 && (
          <p className="muted" style={{ fontSize: 13, marginTop: 14 }}>No gaps — or no data yet.</p>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 32, rowGap: 16, marginTop: 18 }}>
          {gaps.map(g => (
            <GapRow key={g.slug} g={g} roiPct={(roiFor(g) / maxRoi) * 100} count={countFor(g)} />
          ))}
        </div>
      </div>

      {/* ── THIS WEEK · your plan (full width, balanced lanes) ──────────────── */}
      <div style={{ ...cardStyle, padding: "22px 24px", marginBottom: 16, animation: "ccrise .5s ease both", animationDelay: ".1s" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
          <div style={kicker}>This week · your plan</div>
          {pipeStats.length > 0 && (
            <Link to="/tracker" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none", fontSize: 12.5, color: "var(--muted2)" }}>
              {pipeStats.map((s, i) => (
                <span key={s.label} style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                  {i > 0 && <span style={{ color: "var(--line2)" }}>·</span>}
                  <span><strong style={{ color: "var(--ink2)", fontFamily: mono, fontWeight: 600 }}>{s.n}</strong> {s.label}</span>
                </span>
              ))}
              <span style={{ color: "var(--accent)", fontFamily: mono, fontSize: 11.5 }}>tracker →</span>
            </Link>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 14, alignItems: "stretch" }}>

          {/* Left column — Study + Apply, compact, stacked */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            <Lane title="Study" soft="var(--blue-soft)" fg="var(--accent)" grow
              footer={<LaneLink to="/page/Skill Gap Analysis" fg="var(--accent)">all gaps →</LaneLink>}>
              {studyGaps.length === 0 ? <div style={laneEmpty}>No gaps — nice.</div> :
                studyGaps.map(g => (
                  <div key={g.slug} style={{ marginBottom: 7, fontSize: 13.5 }}>
                    <Link to={`/skills/${g.slug}`} style={{ color: "var(--ink)", textDecoration: "none", fontWeight: 500 }}>{g.name}</Link>
                    <span style={{ color: "var(--muted3)", fontSize: 12 }}> · {g.count} role{g.count === 1 ? "" : "s"}</span>
                  </div>
                ))}
            </Lane>

            <Lane title="Apply" soft="var(--green-soft)" fg="var(--green-fg)" grow
              footer={<LaneLink to="/jobs" fg="var(--green-fg)">browse all roles →</LaneLink>}>
              {picks.length === 0 ? <div style={laneEmpty}>You're applied-up — add more shortlists.</div> :
                picks.map(j => (
                  <div key={j.id} style={{ marginBottom: 7, fontSize: 13.5, lineHeight: 1.35 }}>
                    <Link to={`/jobs/${j.id}`} style={{ color: "var(--ink)", textDecoration: "none", fontWeight: 500 }}>{j.fm.company} — {j.fm.title}</Link>
                    <span style={{ color: "var(--muted3)", fontSize: 12 }}> · {j.fit.score}{j.fm["app-status"] === "interested" ? " ★" : ""}</span>
                  </div>
                ))}
            </Lane>

          </div>

          {/* Right column — Do gets the room: suggested actions + checkable to-dos */}
          <Lane title="Do" soft="var(--amber-soft, #fbe6c8)" fg="var(--amber-fg, #c47f00)"
            footer={<LaneLink to="/page/To-dos" fg="var(--amber-fg, #c47f00)">all to-dos →</LaneLink>}>

            {/* Suggested (auto) — derived from your data, complements Study/Apply */}
            {suggestions.length > 0 && (
              <div style={{ border: "1px dashed var(--amber-fg, #c47f00)", borderRadius: 10, padding: "11px 13px", marginBottom: 13, opacity: 0.97 }}>
                <div style={{ fontFamily: mono, fontSize: 9.5, letterSpacing: ".09em", textTransform: "uppercase", color: "var(--amber-fg, #c47f00)", marginBottom: 7 }}>
                  Suggested · auto
                </div>
                {suggestions.map((s, i) => (
                  <div key={i} style={{ marginBottom: i === suggestions.length - 1 ? 0 : 6, fontSize: 13.5 }}>
                    <Link to={s.to} style={{ color: "var(--ink2)", textDecoration: "none", fontWeight: 500 }}>{s.text}</Link>
                  </div>
                ))}
              </div>
            )}

            {/* Manual to-dos — clickable to check off (writes back to To-dos.md) */}
            {openTodos.length === 0 && suggestions.length === 0
              ? <div style={laneEmpty}>To-do list is clear.</div>
              : openTodos.map(t => {
                  const done = localDone[t.i] ?? false;
                  return (
                    <button
                      key={t.i}
                      onClick={() => onToggleTodo(t.i)}
                      style={{
                        display: "flex", gap: 8, alignItems: "flex-start", width: "100%", textAlign: "left",
                        background: "none", border: "none", padding: 0, marginBottom: 8, cursor: "pointer",
                        fontSize: 13.5, lineHeight: 1.35, font: "inherit", color: done ? "var(--muted3)" : "var(--ink2)",
                      }}
                    >
                      <span style={{ color: done ? "var(--green-fg)" : "var(--amber-fg, #c47f00)", flexShrink: 0 }}>{done ? "☑" : "☐"}</span>
                      <span style={{ textDecoration: done ? "line-through" : "none" }}>{t.text}</span>
                    </button>
                  );
                })}
          </Lane>

        </div>
      </div>

      {/* ── SUPPORTING ROW: portfolio · market briefs ──────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "stretch", marginBottom: 16 }}>

        {/* Portfolio projects */}
        <div style={{ ...cardStyle, animation: "ccrise .5s ease both", animationDelay: ".15s" }}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 16 }}>
            Portfolio projects · close your gaps
          </div>

          {(projects.data ?? []).length === 0 && (
            <p className="muted" style={{ fontSize: 13 }}>No project pages yet.</p>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {(projects.data ?? []).map(p => {
              const closes = (p.fm.closes as string[] | undefined)?.length ?? 0;
              const status = String(p.fm.status ?? "idea");
              const closesChipStyle = closes > 0
                ? { background: "var(--green-soft)", color: "var(--green-fg)" }
                : { background: "var(--track)", color: "var(--muted)" };

              return (
                <div
                  key={p.name}
                  style={{ border: "1px solid var(--line3)", borderRadius: 12, padding: 14 }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                    <Link
                      to={`/page/${encodeURIComponent(p.name)}`}
                      style={{ fontFamily: serif, fontWeight: 600, fontSize: 16, color: "var(--ink)", textDecoration: "none" }}
                    >
                      {p.name}
                    </Link>
                    <span style={{ flexShrink: 0, borderRadius: "999px", padding: "3px 9px", fontSize: 11, fontWeight: 600, ...closesChipStyle }}>
                      closes {closes} gap{closes !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <span style={statusStyle(status)}>{status}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Market briefs archive — rows stretch to fill the card so the bento stays even */}
        <div style={{ ...cardStyle, display: "flex", flexDirection: "column", animation: "ccrise .5s ease both", animationDelay: ".2s" }}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 14 }}>Market briefs</div>

          {briefRows.length === 0 && (
            <p className="muted" style={{ fontSize: 13 }}>No briefs yet.</p>
          )}

          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            {briefRows.map((b, i) => {
              const dateMatch = b.name.match(/^(\d{4}-\d{2}-\d{2})/);
              const dateLabel = dateMatch
                ? new Date(dateMatch[1] + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric" })
                : b.name.slice(0, 8);
              const isLast = i === briefRows.length - 1;

              return (
                <div
                  key={b.name}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", flex: 1, borderBottom: isLast ? "none" : "1px solid var(--line5)" }}
                >
                  <span style={{ fontFamily: mono, fontSize: 11.5, color: "var(--muted3)", flexShrink: 0, width: 54 }}>
                    {dateLabel}
                  </span>
                  <Link
                    to={i === 0 ? "/brief" : `/page/${encodeURIComponent(b.name)}`}
                    style={{ fontSize: 14, color: "var(--ink2)", textDecoration: "none" }}
                  >
                    {b.name}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* ── ADVICE LIBRARY (full width, internal grid) ─────────────────────── */}
      <div style={{ ...cardStyle, animation: "ccrise .5s ease both", animationDelay: ".25s" }}>
        <div style={{ ...kicker, marginBottom: 16 }}>Advice library</div>

        {adviceRows !== null ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
            {adviceRows.map(a => (
              <Link
                key={a.name}
                to={`/page/${encodeURIComponent(a.name)}`}
                style={{ display: "block", textDecoration: "none", border: "1px solid var(--line3)", borderRadius: 12, padding: 14 }}
              >
                <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--accent)", marginBottom: 3 }}>
                  {a.name}
                </div>
                {a.gist && (
                  <div style={{ fontSize: 12.5, color: "var(--muted2)", lineHeight: 1.4 }}>{a.gist}</div>
                )}
                {a.fm.researched ? (
                  <div style={{ fontSize: 11, color: "var(--muted3)", marginTop: 6, fontFamily: mono }}>
                    researched {String(a.fm.researched).slice(0, 10)}
                  </div>
                ) : null}
              </Link>
            ))}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
            {ADVICE_TIPS.map(tip => (
              <div key={tip.label} style={{ border: "1px solid var(--line3)", borderRadius: 12, padding: 14 }}>
                <div style={{ ...kicker, fontSize: 10.5, letterSpacing: ".08em", marginBottom: 4 }}>
                  {tip.label}
                </div>
                <div style={{ fontSize: 13.5, color: "var(--ink2)", lineHeight: 1.4 }}>
                  {tip.tip}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
