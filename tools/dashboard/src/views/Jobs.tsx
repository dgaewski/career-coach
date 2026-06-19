import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useData } from "../hooks/useData.js";
import type { Job, Skill, LinksMap, Summary } from "../lib/types.js";
import { LEVELS, APP_STATUSES } from "../lib/types.js";
import { geoOptions, trackOptions } from "../lib/vocab.js";
import { havePct } from "../lib/smartFilters.js";
import { Segmented, RangeSlider } from "../components/primitives.js";
import { JobCard } from "../components/JobCard.js";

type SortKey = "fit" | "salary" | "newest";

const FRESHNESS_OPTIONS = ["high", "medium", "low"] as const;

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Styled select that looks like a pill dropdown */
function PillSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}): JSX.Element {
  return (
    <label style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          appearance: "none",
          background: "var(--bg)",
          border: "1px solid var(--line2, #ddd)",
          borderRadius: 9,
          padding: "7px 30px 7px 12px",
          fontSize: 13,
          fontWeight: 500,
          cursor: "pointer",
          color: value ? "var(--accent)" : "var(--ink)",
          fontFamily: "inherit",
          outline: "none",
        }}
      >
        <option value="">{label}: Any</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>{label}: {o.label}</option>
        ))}
      </select>
      <span style={{
        position: "absolute",
        right: 10,
        pointerEvents: "none",
        color: "var(--faint, #bbb)",
        fontSize: 11,
      }}>▾</span>
    </label>
  );
}

export default function Jobs(): JSX.Element {
  const jobs = useData<Job[]>("/api/jobs");
  const skills = useData<Skill[]>("/api/skills");
  const links = useData<LinksMap>("/api/links");
  const { data: summary } = useData<Summary>("/api/summary");

  // Filter state
  const [trackFilter, setTrackFilter] = useState("");
  const [geoFilter, setGeoFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [freshnessFilter, setFreshnessFilter] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [placeFilter, setPlaceFilter] = useState("");
  const [linkFilter, setLinkFilter] = useState("");
  const [haveMin, setHaveMin] = useState(0);
  const [sort, setSort] = useState<SortKey>("fit");

  // Pre-select place from ?place= query param (e.g. from map "see all in <city>" link).
  // Apply only when the param changes to a NEW value so it handles map→Jobs jumps even when
  // Jobs is already mounted, but doesn't re-apply (and fight) a filter the user has cleared.
  const [sp] = useSearchParams();
  const lastAppliedPlace = useRef<string | null>(null);
  useEffect(() => {
    const p = sp.get("place");
    if (p && p !== lastAppliedPlace.current) {
      setPlaceFilter(p);
      lastAppliedPlace.current = p;
    }
  }, [sp]);

  const allJobs = jobs.data ?? [];

  const filtered = useMemo(() => {
    let out = allJobs.slice();

    if (trackFilter) out = out.filter(j => j.fm.track.includes(trackFilter));
    if (geoFilter) out = out.filter(j => j.fm.geo === geoFilter);
    if (levelFilter) out = out.filter(j => j.fm.level === levelFilter);
    if (freshnessFilter) out = out.filter(j => j.freshness === freshnessFilter);
    if (skillFilter) out = out.filter(j => j.fm.skills.includes(skillFilter));
    if (statusFilter) out = out.filter(j => j.fm["app-status"] === statusFilter);
    if (haveMin > 0) out = out.filter(j => havePct(j) * 100 >= haveMin);
    if (placeFilter) out = out.filter(j => j.fm.location === placeFilter);
    if (linkFilter) out = out.filter(j => (links.data?.[j.id]?.status ?? "none") === linkFilter);

    const sorters: Record<SortKey, (a: Job, b: Job) => number> = {
      fit: (a, b) => b.fit.score - a.fit.score,
      salary: (a, b) => {
        const sa = a.salaryMidpoint ?? -1;
        const sb = b.salaryMidpoint ?? -1;
        return sb - sa;
      },
      newest: (a, b) => {
        const da = Date.parse(String(a.fm.ingested));
        const db = Date.parse(String(b.fm.ingested));
        return db - da;
      },
    };

    return [...out].sort(sorters[sort]);
  }, [allJobs, trackFilter, geoFilter, levelFilter, freshnessFilter, skillFilter, statusFilter, haveMin, sort, placeFilter, linkFilter, links.data]);

  const sortLabel = sort === "fit" ? "Fit" : sort === "salary" ? "Salary" : "Newest";

  const skillOptions = (skills.data ?? []).map(s => ({ value: s.slug, label: s.name }));

  const placeOptions = useMemo(
    () => [...new Set(allJobs.map(j => j.fm.location).filter((x): x is string => !!x))].sort().map(p => ({ value: p, label: p })),
    [allJobs],
  );

  if (jobs.loading) return <p className="muted">Loading…</p>;
  if (jobs.error) return <p>Failed to load jobs: {jobs.error}</p>;

  return (
    // Natural page scroll (like every other view): the body scrolls under the sticky nav.
    // No inner scroll container, no virtualization — the title scrolls away to reclaim space
    // and the filter bar stays put via position:sticky.
    <div style={{ animation: "ccfade .4s ease both" }}>
      {/* ── Header — scrolls away with the page ── */}
      <div style={{
        marginBottom: 18,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 20,
        animation: "ccrise .5s ease both",
      }}>
        <div>
          <h3 style={{
            fontFamily: "'Newsreader', Georgia, serif",
            fontWeight: 500,
            fontSize: 32,
            margin: "0 0 6px",
            letterSpacing: "-0.01em",
          }}>Jobs</h3>
          <div
            data-testid="jobs-subtitle"
            style={{
              fontSize: 14,
              color: "var(--muted3)",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {`Showing ${filtered.length} of ${allJobs.length} roles · sorted by ${sortLabel}`}
          </div>
        </div>
      </div>

      {/* ── Filter bar card — sticky just under the nav so it stays reachable while scrolling.
           The wrapper carries an opaque page-bg band so cards scrolling underneath don't
           peek through the card's rounded corners. ── */}
      <div style={{
        position: "sticky",
        top: 56,
        zIndex: 5,
        background: "var(--bg)",
        paddingTop: 8,
        marginTop: -8,
        marginBottom: 16,
      }}>
      <div style={{
        background: "var(--card)",
        border: "1px solid var(--line)",
        borderRadius: 16,
        padding: 18,
        boxShadow: "0 1px 2px rgba(28,26,23,.04),0 18px 44px -38px rgba(28,26,23,.4)",
        animation: "ccrise .5s ease both",
        animationDelay: ".05s",
      }}>
        {/* Single row: filter pills, with the have-% slider + sort pushed to the right
            (wraps under on narrow widths) — keeps the filter card compact. */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          flexWrap: "wrap",
        }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            letterSpacing: ".1em",
            textTransform: "uppercase",
            color: "var(--muted3)",
            marginRight: 4,
          }}>Filter</span>

          <PillSelect
            label="Track"
            value={trackFilter}
            onChange={setTrackFilter}
            options={trackOptions(summary)}
          />
          <PillSelect
            label="Location"
            value={geoFilter}
            onChange={setGeoFilter}
            options={geoOptions(summary)}
          />
          <PillSelect
            label="Level"
            value={levelFilter}
            onChange={setLevelFilter}
            options={LEVELS.map(l => ({ value: l, label: capitalize(l) }))}
          />
          <PillSelect
            label="Freshness"
            value={freshnessFilter}
            onChange={setFreshnessFilter}
            options={FRESHNESS_OPTIONS.map(f => ({ value: f, label: capitalize(f) }))}
          />
          <PillSelect
            label="Skill"
            value={skillFilter}
            onChange={setSkillFilter}
            options={skillOptions}
          />
          <PillSelect
            label="Status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={APP_STATUSES.map(s => ({ value: s, label: capitalize(s) }))}
          />
          <PillSelect
            label="City"
            value={placeFilter}
            onChange={setPlaceFilter}
            options={placeOptions}
          />
          <PillSelect
            label="Link"
            value={linkFilter}
            onChange={setLinkFilter}
            options={[
              { value: "live", label: "Live" },
              { value: "dead", label: "Dead" },
              { value: "unverified", label: "Unverified" },
              { value: "none", label: "No link" },
              { value: "redirected", label: "Redirected" },
            ]}
          />

          {/* have-% slider + sort — pushed to the right end of the filter row */}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 13, color: "var(--muted)", whiteSpace: "nowrap" }}>
                You have ≥{" "}
                <strong style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--accent)" }}>
                  {haveMin}%
                </strong>
              </span>
              <RangeSlider value={haveMin} onChange={setHaveMin} min={0} max={100} />
            </div>

            <div style={{ height: 22, width: 1, background: "var(--line)" }} />

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>Sort</span>
              <Segmented<SortKey>
                options={[["fit", "Fit"], ["salary", "Salary"], ["newest", "Newest"]]}
                value={sort}
                onChange={setSort}
              />
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* ── Job cards — plain 2-up grid in the natural page scroll ── */}
      {filtered.length > 0 ? (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 16,
        }}>
          {filtered.map(j => (
            <JobCard key={j.id} job={j} linkStatus={links.data?.[j.id]?.status} onChanged={jobs.reload} />
          ))}
        </div>
      ) : (
        <div style={{
          textAlign: "center",
          color: "var(--muted3)",
          padding: "60px 0",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 13,
        }}>
          No roles match the current filters.
        </div>
      )}
    </div>
  );
}
