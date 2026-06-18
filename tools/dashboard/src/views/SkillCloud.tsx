import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useData } from "../hooks/useData.js";
import type { GapEntry, Skill, Keyword, Summary } from "../lib/types.js";
import { LEVELS } from "../lib/types.js";
import { geoOptions, trackOptions } from "../lib/vocab.js";
import { WordCloud, Segmented, Chip } from "../components/primitives.js";
import { TrendArrow } from "../components/Chips.js";
import SkillExplorer from "./SkillExplorer.js";

const mono = "'JetBrains Mono', monospace";

// ─── Gaps panel: interactive ranked missing-skills table (was a static md page) ──
type GapSort = "roi" | "count";
function GapsPanel({ gaps, track }: { gaps: GapEntry[] | null; track: string }): JSX.Element {
  const [sort, setSort] = useState<GapSort>("roi");
  if (gaps === null) return <p className="muted" style={{ margin: 0 }}>Loading gaps…</p>;

  const roiFor   = (g: GapEntry) => (track ? g.byTrack?.[track]?.roi ?? 0 : g.roi);
  const countFor = (g: GapEntry) => (track ? g.byTrack?.[track]?.count ?? 0 : g.count);
  const rows = gaps
    .filter(g => roiFor(g) > 0)
    .sort((a, b) => (sort === "roi" ? roiFor(b) - roiFor(a) : countFor(b) - countFor(a)));
  const maxRoi = Math.max(1, ...rows.map(roiFor));

  if (rows.length === 0) return <p className="muted" style={{ margin: 0 }}>No gaps for this slice — nice.</p>;

  const sortBtn = (key: GapSort, label: string) => (
    <button
      onClick={() => setSort(key)}
      style={{
        cursor: "pointer", border: "none", background: "none", fontFamily: mono, fontSize: 11,
        letterSpacing: ".04em", textTransform: "uppercase", padding: 0,
        color: sort === key ? "var(--accent)" : "var(--muted3)", fontWeight: sort === key ? 700 : 500,
      }}
    >{label}{sort === key ? " ↓" : ""}</button>
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 12.5, color: "var(--muted3)" }}>
          Missing skills ranked by {sort === "roi" ? "ROI (demand × how close you are)" : "active-role demand"}
          {track ? ` · within ${track}` : " · across all tracks"}
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          <span style={{ fontFamily: mono, fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--faint)" }}>sort</span>
          {sortBtn("roi", "ROI")}
          {sortBtn("count", "Demand")}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 32, rowGap: 16 }}>
        {rows.map(g => (
          <div key={g.slug}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 13.5, marginBottom: 5 }}>
              <span style={{ fontWeight: 500 }}>
                <Link to={`/skills/${g.slug}`} style={{ color: "inherit", textDecoration: "none" }}>{g.name}</Link>
                {" "}<TrendArrow trend={g.trend} />
              </span>
              <span style={{ fontFamily: mono, fontSize: 12, color: "var(--muted)" }}>
                {countFor(g)} role{countFor(g) === 1 ? "" : "s"}
              </span>
            </div>
            {g.closedBy.length > 0 && (
              <div style={{ fontSize: 11.5, color: "var(--green-fg)", marginBottom: 4 }}>✓ closed by {g.closedBy.join(", ")}</div>
            )}
            <div style={{ height: 9, background: "var(--line5)", borderRadius: 99, overflow: "hidden" }}>
              <div style={{ width: `${(roiFor(g) / maxRoi) * 100}%`, height: "100%", background: "linear-gradient(90deg,#2F62F0,#7A53F2)", borderRadius: 99 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Tier → CSS color variable
const TIER_COLOR: Record<Skill["tier"], string> = {
  "high-demand": "var(--accent)",
  common: "var(--violet, #7c3aed)",
  occasional: "var(--ink3, #6b7280)",
  rare: "var(--faint, #9ca3af)",
};

const TREND_MARK: Record<Skill["trend"], React.ReactNode> = {
  rising:   <span style={{ color: "var(--green-fg)", fontSize: "0.62em", fontFamily: "'JetBrains Mono',monospace" }}>↑</span>,
  declining: <span style={{ color: "var(--red-fg)", fontSize: "0.62em", fontFamily: "'JetBrains Mono',monospace" }}>↓</span>,
  stable:   null,
};

type Mode = "skills" | "keywords" | "gaps";

// Filter dropdown pill matching design (card-style, border-radius 9px)
function SlicePill({
  label, field, value, options, onChange,
}: {
  label: string; field: string; value: string;
  options: readonly string[]; onChange: (v: string) => void;
}): JSX.Element {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--card, #fff)", border: "1px solid var(--line2, #e2e8f0)", borderRadius: 9, padding: "7px 12px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
      <select
        aria-label={field}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ border: "none", background: "transparent", font: "inherit", cursor: "pointer", outline: "none", paddingRight: 4 }}
      >
        <option value="">{label}: Any</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <span style={{ color: "var(--faint, #9ca3af)" }}>▾</span>
    </label>
  );
}

export default function SkillCloud(): JSX.Element {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [mode, setMode] = useState<Mode>("skills");

  const { data: skills, loading: sLoading, error: sError } = useData<Skill[]>("/api/skills");
  const { data: keywords, loading: kLoading } = useData<Keyword[]>("/api/keywords");
  const { data: gaps } = useData<GapEntry[]>("/api/gap");
  const { data: summary } = useData<Summary>("/api/summary");

  // Active filter values
  const track = params.get("track") ?? "";
  const geo   = params.get("geo") ?? "";
  const level = params.get("level") ?? "";

  const setFilter = (key: string, val: string): void => {
    const next = new URLSearchParams(params);
    if (val) next.set(key, val); else next.delete(key);
    setParams(next, { replace: true });
  };

  // --- Skills cloud items ---
  const filteredSkills = (skills ?? []).filter(s => {
    if (track && !s.byTrack[track]) return false;
    if (geo   && !s.byGeo[geo])     return false;
    if (level && !s.byLevel[level]) return false;
    return true;
  });

  const facetCount = (s: Skill): number => {
    const counts: number[] = [];
    if (track) counts.push(s.byTrack[track] ?? 0);
    if (geo)   counts.push(s.byGeo[geo] ?? 0);
    if (level) counts.push(s.byLevel[level] ?? 0);
    return counts.length ? Math.min(...counts) : s.count;
  };

  const maxSkill = Math.max(1, ...filteredSkills.map(s => facetCount(s)));

  const cloudItems = filteredSkills.map(s => {
    const n = facetCount(s);
    const weight = n / maxSkill;
    const haveMark = s.have
      ? <span style={{ color: "var(--green-fg, #16a34a)", fontSize: "0.7em" }}>✓</span>
      : null;
    const trendMark = TREND_MARK[s.trend];
    const mark = (haveMark || trendMark)
      ? <>{haveMark}{trendMark}</>
      : undefined;
    return { key: s.slug, label: s.name, weight, color: TIER_COLOR[s.tier], mark };
  });

  // --- Keywords cloud items (mono, muted, non-interactive) ---
  const maxKw = Math.max(1, ...(keywords ?? []).map(k => k.count));
  const kwItems = (keywords ?? []).map(k => ({
    key: k.term, label: k.term, weight: k.count / maxKw, color: "var(--muted3, #9ca3af)", mark: undefined,
  }));

  if (sLoading) return <p className="muted">Loading skills…</p>;
  if (sError)   return <p>Failed to load skills: {sError}</p>;

  return (
    <div style={{ animation: "ccfade .4s ease both" }}>
      {/* ── Header row ── */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, flexWrap: "wrap", marginBottom: 20, animation: "ccrise .5s ease both" }}>
        <div>
          <h3 style={{ fontFamily: "'Newsreader', Georgia, serif", fontWeight: 500, fontSize: 32, margin: "0 0 6px", letterSpacing: "-0.01em" }}>
            Skill Cloud
          </h3>
          <div style={{ fontSize: 14, color: "var(--muted3, #9ca3af)", fontFamily: "'JetBrains Mono', monospace" }}>
            {mode === "gaps"
              ? "Skills you're missing, ranked by ROI · ✓ closed by a portfolio project"
              : mode === "keywords"
                ? "Raw terms lifted from postings"
                : "Sized by demand · colored by tier · ✓ you already have it"}
          </div>
        </div>
        <Segmented<Mode>
          options={[["skills", "Skills"], ["keywords", "Keywords"], ["gaps", "Gaps"]]}
          value={mode}
          onChange={setMode}
        />
      </div>

      {/* ── Filter pills ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap", marginBottom: 16, animation: "ccrise .5s ease both", animationDelay: ".04s" }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--muted3, #9ca3af)", marginRight: 2 }}>
          Slice
        </span>
        <SlicePill label="Track"    field="track" value={track} options={trackOptions(summary).map(o => o.value)} onChange={v => setFilter("track", v)} />
        <SlicePill label="Location" field="geo"   value={geo}   options={geoOptions(summary).map(o => o.value)}  onChange={v => setFilter("geo", v)} />
        <SlicePill label="Level"    field="level"  value={level} options={LEVELS} onChange={v => setFilter("level", v)} />
        {(track || geo || level) && (
          <button
            onClick={() => setParams({}, { replace: true })}
            style={{ background: "none", border: "none", color: "var(--accent, #6c63ff)", fontSize: 12, cursor: "pointer", padding: "2px 6px" }}
          >
            clear ×
          </button>
        )}
      </div>

      {/* ── Cloud card ── */}
      <div style={{
        background: "var(--card, #fff)", border: "1px solid var(--line, #e5e7eb)", borderRadius: 18,
        padding: "34px 30px", boxShadow: "0 1px 2px rgba(28,26,23,.04),0 18px 44px -38px rgba(28,26,23,.4)",
        marginBottom: 16, animation: "ccrise .5s ease both", animationDelay: ".08s",
      }}>
        {mode === "gaps" ? (
          <GapsPanel gaps={gaps} track={track} />
        ) : mode === "skills" ? (
          <>
            {cloudItems.length === 0
              ? <p className="muted" style={{ margin: 0 }}>Nothing matches these filters.</p>
              : (
                <WordCloud
                  items={cloudItems}
                  selected={slug}
                  onPick={k => navigate(`/skills/${k}`)}
                />
              )
            }
          </>
        ) : (
          <>
            {kLoading
              ? <p className="muted">Loading keywords…</p>
              : (
                <>
                  <WordCloud items={kwItems} /* no onPick → non-interactive */ />
                  <div style={{ marginTop: 18, fontSize: 12.5, color: "var(--muted3, #9ca3af)", fontStyle: "italic" }}>
                    Raw keywords lifted from postings — switch to{" "}
                    <strong style={{ fontWeight: 600, color: "var(--accent, #6c63ff)" }}>Skills</strong>{" "}
                    to explore one in depth.
                  </div>
                </>
              )
            }
          </>
        )}
      </div>

      {/* ── Explorer (skills mode only, when a slug is selected) ── */}
      {mode === "skills" && (
        slug
          ? <SkillExplorer slug={slug} />
          : (
            <div style={{
              background: "var(--bg2, #f9fafb)", border: "1px solid var(--line, #e5e7eb)", borderRadius: 18,
              padding: "28px 30px", animation: "ccrise .45s ease both", animationDelay: ".12s",
              color: "var(--muted3, #9ca3af)", fontFamily: "'JetBrains Mono', monospace", fontSize: 13,
            }}>
              Select a skill to explore it in depth.
            </div>
          )
      )}
    </div>
  );
}
