import { useState } from "react";
import { Link } from "react-router-dom";
import { useData } from "../hooks/useData.js";
import type { MarketTrends, MarketTrack, Job, Summary } from "../lib/types.js";
import { humanizeTrack, trackColor } from "../lib/vocab.js";
import { Chip } from "../components/primitives.js";

type Tone = "green" | "red" | "amber" | "blue" | "violet" | "neutral";

const STALE: Record<string, { label: string; color: string }> = {
  fresh:   { label: "● fresh", color: "var(--green-fg)" },
  aging:   { label: "◐ aging", color: "var(--amber-fg)" },
  stale:   { label: "○ stale", color: "var(--red-fg)" },
  unknown: { label: "", color: "var(--muted3)" },
};

const TRAJ: Record<string, { label: string; tone: Tone }> = {
  rising:  { label: "↑ rising",  tone: "green" },
  steady:  { label: "→ steady",  tone: "neutral" },
  cooling: { label: "↓ cooling", tone: "red" },
};
const COMP: Record<string, { label: string; tone: Tone }> = {
  low:         { label: "low",       tone: "green" },
  moderate:    { label: "moderate",  tone: "neutral" },
  high:        { label: "high",      tone: "amber" },
  "very-high": { label: "very high", tone: "red" },
};
function dots(n?: number): string {
  const v = Math.max(0, Math.min(5, Math.round(n ?? 0)));
  return "●".repeat(v) + "○".repeat(5 - v);
}
function trajChip(v: string | undefined): JSX.Element | null {
  const t = v ? TRAJ[v] : undefined;
  return t ? <Chip tone={t.tone}>{t.label}</Chip> : null;
}
function compChip(v: string | undefined): JSX.Element | null {
  const c = v ? COMP[v] : undefined;
  return c ? <Chip tone={c.tone}>{c.label}</Chip> : null;
}
type SortKey = "track" | "demand" | "trajectory" | "comp" | "competition" | "fit";
const TRAJ_ORD: Record<string, number> = { cooling: 1, steady: 2, rising: 3 };
const COMP_ORD: Record<string, number> = { low: 1, moderate: 2, high: 3, "very-high": 4 };
function parseComp(s?: string): number | null {
  if (!s) return null;
  const m = s.match(/([\d.]+)\s*(k)?/i);
  return m ? parseFloat(m[1]) * (m[2] ? 1000 : 1) : null;
}
function sortVal(t: MarketTrack, fit: number | null, key: SortKey): number | string | null {
  switch (key) {
    case "track": return humanizeTrack(t.track);
    case "demand": return t.demand ?? null;
    case "trajectory": return t.trajectory ? (TRAJ_ORD[t.trajectory] ?? null) : null;
    case "comp": return parseComp(t.salary?.early);
    case "competition": return t.competition ? (COMP_ORD[t.competition] ?? null) : null;
    case "fit": return fit;
  }
}

function medianFit(jobs: Job[], track: string): number | null {
  const s = jobs
    .filter(j => j.fm.status === "active" && j.fm.track.includes(track))
    .map(j => j.fit.score)
    .sort((a, b) => a - b);
  if (!s.length) return null;
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

export default function Trends(): JSX.Element {
  const market = useData<MarketTrends>("/api/market");
  const jobs = useData<Job[]>("/api/jobs");
  const skills = useData<{ slug: string; name: string }[]>("/api/skills");
  const companies = useData<{ name: string }[]>("/api/companies");
  const summary = useData<Summary>("/api/summary");
  const userTracks = summary.data?.user?.tracks;

  if (market.loading) return <p className="muted">Loading…</p>;

  // Treat any failure to load (empty payload OR a fetch error — e.g. a coach server
  // started before /api/market existed returns 404) as "not researched yet": suggest
  // the command rather than showing a raw error.
  const m = market.data;
  if (market.error || !m || !m.exists || m.tracks.length === 0) {
    return (
      <div style={{
        animation: "ccfade .4s ease both", textAlign: "center", padding: "80px 0",
        color: "var(--muted3)", fontFamily: "'JetBrains Mono', monospace", fontSize: 13,
      }}>
        No market research yet — run <code>/market-trends</code> to research your tracks.
        {market.error ? (
          <div style={{ marginTop: 10, fontSize: 12, color: "var(--muted3)" }}>
            (Already ran it? Restart the dashboard server — <code>npm run coach</code> — so it loads the latest.)
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div style={{ animation: "ccfade .4s ease both" }} data-testid="trends-view">
      <div style={{ marginBottom: 18 }}>
        <h3 style={{
          fontFamily: "'Newsreader', Georgia, serif", fontWeight: 500, fontSize: 32,
          margin: "0 0 6px", letterSpacing: "-0.01em",
        }}>Market Trends</h3>
        <div style={{ fontSize: 14, color: "var(--muted3)", fontFamily: "'JetBrains Mono', monospace" }}>
          {`Broad market research across your ${m.tracks.length} track${m.tracks.length === 1 ? "" : "s"}`}
          {m.researched ? ` · researched ${m.researched}` : ""}
          {m.staleness !== "unknown" ? <> · <span style={{ color: STALE[m.staleness].color }}>{STALE[m.staleness].label}</span></> : null}
        </div>
      </div>
      <Scorecard tracks={m.tracks} jobs={jobs.data ?? []} userTracks={userTracks} />
      {m.tracks.map(t => (
        <TrackSection
          key={t.track}
          t={t}
          globalSources={m.sources}
          skillName={new Map((skills.data ?? []).map(s => [s.slug, s.name]))}
          companySet={new Set((companies.data ?? []).map(c => c.name))}
          userTracks={userTracks}
        />
      ))}
    </div>
  );
}

function SkillChips({ slugs, skillName, soft }: { slugs?: string[]; skillName: Map<string, string>; soft: string }): JSX.Element | null {
  if (!slugs?.length) return null;
  return (
    <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 7 }}>
      {slugs.map(slug => {
        const label = skillName.get(slug) ?? slug;
        const chipStyle: React.CSSProperties = {
          fontSize: 12.5, padding: "3px 10px", borderRadius: 999,
          background: soft, color: "var(--ink2)", textDecoration: "none",
        };
        return skillName.has(slug)
          ? <Link key={slug} to={`/skills/${slug}`} style={chipStyle}>{label}</Link>
          : <span key={slug} style={chipStyle}>{label}</span>;
      })}
    </span>
  );
}

function TrackSection({ t, globalSources, skillName, companySet, userTracks }: {
  t: MarketTrack; globalSources: string[]; skillName: Map<string, string>; companySet: Set<string>; userTracks?: string[];
}): JSX.Element {
  const c = trackColor(t.track, userTracks);
  const label: React.CSSProperties = {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: ".08em",
    textTransform: "uppercase", color: c.solid, margin: "0 0 8px",
  };
  const sources = t.sources?.length ? t.sources : globalSources;
  return (
    <section id={`track-${t.track}`} style={{
      background: "var(--card)", border: "1px solid var(--line)", borderTop: `3px solid ${c.solid}`,
      borderRadius: 16, overflow: "hidden", marginBottom: 18, scrollMarginTop: 70, animation: "ccrise .5s ease both",
    }}>
      <div style={{ background: c.soft, padding: "18px 24px 16px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <h4 style={{ fontFamily: "'Newsreader', Georgia, serif", fontWeight: 600, fontSize: 22, margin: 0, color: c.solid }}>
            {humanizeTrack(t.track)}
          </h4>
          {trajChip(t.trajectory)}
        </div>
        {t.headline ? <p style={{ fontStyle: "italic", color: "var(--muted)", margin: "8px 0 0" }}>{t.headline}</p> : null}
      </div>

      <div style={{ padding: 24 }}>
        {t.snapshot ? (<><p style={label}>2026 Snapshot</p><p style={{ margin: "0 0 18px", lineHeight: 1.6 }}>{t.snapshot}{t.growthNote ? ` (${t.growthNote})` : ""}</p></>) : null}

        {(t.tailwinds?.length || t.headwinds?.length) ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
            {t.tailwinds?.length ? <div><p style={label}>Tailwinds ↑</p><ul style={{ margin: 0, paddingLeft: 18 }}>{t.tailwinds.map((x, i) => <li key={i}>{x}</li>)}</ul></div> : null}
            {t.headwinds?.length ? <div><p style={label}>Headwinds ↓</p><ul style={{ margin: 0, paddingLeft: 18 }}>{t.headwinds.map((x, i) => <li key={i}>{x}</li>)}</ul></div> : null}
          </div>
        ) : null}

        {(t.salary || t.hiring?.length || t.hiringCompanies?.length) ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
            {t.salary ? (
              <div><p style={label}>Salary (by level)</p>
                {Object.entries(t.salary).map(([lvl, range]) => (
                  <div key={lvl} style={{ display: "flex", justifyContent: "space-between", maxWidth: 220, fontSize: 14 }}>
                    <span style={{ color: "var(--muted)" }}>{lvl}</span><span>{range}</span>
                  </div>
                ))}
              </div>
            ) : <div />}
            {(t.hiring?.length || t.hiringCompanies?.length) ? (
              <div><p style={label}>Who's hiring</p>
                <p style={{ margin: 0, lineHeight: 1.7 }}>
                  {(t.hiring ?? []).join(" · ")}
                  {t.hiringCompanies?.length ? <><br />{t.hiringCompanies.map((co, i) => (
                    <span key={co}>{i ? " · " : ""}{companySet.has(co) ? <Link to={`/companies/${co}`} style={{ color: "var(--accent)", textDecoration: "none" }}>{co}</Link> : co}</span>
                  ))}</> : null}
                </p>
              </div>
            ) : <div />}
          </div>
        ) : null}

        {(t.coreSkills?.length || t.emergingSkills?.length || t.fadingSkills?.length) ? (
          <>
            <p style={label}>Skills</p>
            <div style={{ display: "grid", gap: 8, marginBottom: 18 }}>
              {t.coreSkills?.length ? <div><span style={{ color: "var(--muted)", fontSize: 13, marginRight: 8 }}>Core</span><SkillChips slugs={t.coreSkills} skillName={skillName} soft={c.soft} /></div> : null}
              {t.emergingSkills?.length ? <div><span style={{ color: "var(--green-fg)", fontSize: 13, marginRight: 8 }}>Emerging ↑</span><SkillChips slugs={t.emergingSkills} skillName={skillName} soft={c.soft} /></div> : null}
              {t.fadingSkills?.length ? <div><span style={{ color: "var(--muted3)", fontSize: 13, marginRight: 8 }}>Fading ↓</span><SkillChips slugs={t.fadingSkills} skillName={skillName} soft={c.soft} /></div> : null}
            </div>
          </>
        ) : null}

        {t.yourFit ? (
          <div style={{ borderLeft: `3px solid ${c.solid}`, paddingLeft: 14, margin: "0 0 14px" }}>
            <p style={label}>Your position</p>
            <p style={{ margin: 0, lineHeight: 1.6 }}>{t.yourFit} <Link to="/coach" style={{ color: "var(--accent)", textDecoration: "none" }}>→ Skill Gap</Link></p>
          </div>
        ) : null}

        {sources.length ? (
          <p style={{ fontSize: 12, color: "var(--muted3)" }}>
            Sources {sources.map((u, i) => <a key={u} href={u} target="_blank" rel="noreferrer" style={{ color: c.solid, marginRight: 8 }}>[{i + 1}]</a>)}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function Scorecard({ tracks, jobs, userTracks }: { tracks: MarketTrack[]; jobs: Job[]; userTracks?: string[] }): JSX.Element {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 } | null>(null);
  const th: React.CSSProperties = {
    textAlign: "left", padding: "10px 14px", fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--muted3)",
    borderBottom: "1px solid var(--line)", cursor: "pointer", userSelect: "none",
  };
  const td: React.CSSProperties = { padding: "12px 14px", borderBottom: "1px solid var(--line3, #f3f4f6)", fontSize: 14 };

  const rows = tracks.map(t => ({ t, fit: medianFit(jobs, t.track) }));
  if (sort) {
    const { key, dir } = sort;
    rows.sort((a, b) => {
      const va = sortVal(a.t, a.fit, key);
      const vb = sortVal(b.t, b.fit, key);
      if (va === null && vb === null) return 0;
      if (va === null) return 1;   // nulls always last, regardless of direction
      if (vb === null) return -1;
      if (typeof va === "string" && typeof vb === "string") return va.localeCompare(vb) * dir;
      return ((va as number) - (vb as number)) * dir;
    });
  }
  const toggle = (key: SortKey): void => setSort(s => (s && s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: -1 }));
  const arrow = (key: SortKey): string => (sort?.key === key ? (sort.dir === 1 ? " ▲" : " ▼") : "");
  const cols: [SortKey, string][] = [
    ["track", "Track"], ["demand", "Demand"], ["trajectory", "Trajectory"],
    ["comp", "Comp (early)"], ["competition", "Competition"], ["fit", "Your fit"],
  ];

  return (
    <div style={{
      background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16,
      padding: 6, marginBottom: 24, overflowX: "auto",
      boxShadow: "0 1px 2px rgba(28,26,23,.04),0 18px 44px -38px rgba(28,26,23,.4)",
      animation: "ccrise .5s ease both",
    }}>
      <table data-testid="scorecard" style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {cols.map(([key, lbl]) => (
              <th key={key} style={th} data-testid={`sort-${key}`} onClick={() => toggle(key)}>{lbl}{arrow(key)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ t, fit }) => (
            <tr
              key={t.track}
              data-testid={`scorecard-row-${t.track}`}
              onClick={() => document.getElementById(`track-${t.track}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}
              style={{ cursor: "pointer" }}
            >
              <td style={{ ...td, fontWeight: 600 }}>
                <span data-testid={`track-dot-${t.track}`} style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: trackColor(t.track, userTracks).solid, marginRight: 8, verticalAlign: "middle" }} />
                {humanizeTrack(t.track)}
              </td>
              <td style={{ ...td, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 2 }}>{t.demand != null ? dots(t.demand) : "—"}</td>
              <td style={td}>{trajChip(t.trajectory) ?? "—"}</td>
              <td style={td}>{t.salary?.early ?? "—"}</td>
              <td style={td}>{compChip(t.competition) ?? "—"}</td>
              <td style={{ ...td, fontWeight: 700 }} data-testid={`fit-${t.track}`}>{fit === null ? "—" : fit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
