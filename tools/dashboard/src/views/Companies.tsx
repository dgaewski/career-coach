import { useState } from "react";
import { Link } from "react-router-dom";
import { useData } from "../hooks/useData.js";
import { GrowBar, Chip } from "../components/primitives.js";
import type { Company, Job } from "../lib/types.js";
import { primaryTrack } from "../lib/companyUtils.js";
import { LogoOrMonogram } from "../components/CompanyLogo.js";

type SortKey = "active" | "total" | "avgSalary" | "remoteShare";

const COL = "2.3fr 0.8fr 0.9fr 1fr 1.4fr 1.3fr";

const HDR_BASE: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 10.5,
  letterSpacing: ".08em",
  textTransform: "uppercase" as const,
  color: "var(--muted3)",
  fontWeight: 500,
  background: "none",
  border: "none",
  padding: 0,
  cursor: "default",
  textAlign: "left" as const,
};

const HDR_SORTABLE: React.CSSProperties = {
  ...HDR_BASE,
  cursor: "pointer",
};

const HDR_ACTIVE: React.CSSProperties = {
  ...HDR_SORTABLE,
  color: "var(--ink)",
  fontWeight: 700,
};

interface SortBtnProps {
  sort: SortKey;
  setSort: (k: SortKey) => void;
  label: string;
  colKey: SortKey;
}

function SortBtn({ sort, setSort, label, colKey }: SortBtnProps): JSX.Element {
  const active = sort === colKey;
  return (
    <button
      role="button"
      aria-label={label}
      onClick={() => setSort(colKey)}
      style={active ? HDR_ACTIVE : HDR_SORTABLE}
    >
      {label}{active ? " ↓" : ""}
    </button>
  );
}

export default function Companies(): JSX.Element {
  const { data, error, loading } = useData<Company[]>("/api/companies");
  const jobs = useData<Job[]>("/api/jobs");
  const [sort, setSort] = useState<SortKey>("active");

  if (loading) return <p className="muted" style={{ padding: "32px 0" }}>Loading…</p>;
  if (error || !data) return <p style={{ color: "var(--red-fg)" }}>Failed to load companies: {error}</p>;

  const allJobs = jobs.data ?? [];
  const rows = [...data].sort((a, b) => (Number(b[sort] ?? -1)) - (Number(a[sort] ?? -1)));

  return (
    <div style={{ animation: "ccfade .4s ease both" }}>
      {/* ── Header ── */}
      <div style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 20,
        flexWrap: "wrap",
        marginBottom: 20,
        animation: "ccrise .5s ease both",
      }}>
        <div>
          <h3 style={{
            fontFamily: "'Newsreader', Georgia, serif",
            fontWeight: 500,
            fontSize: 32,
            margin: "0 0 6px",
            letterSpacing: "-0.01em",
          }}>Companies</h3>
          <div style={{
            fontSize: 14,
            color: "var(--muted3)",
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            Employer scorecards · click a column to re-rank
          </div>
        </div>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          fontSize: 12.5,
          color: "var(--amber-fg, #B86A00)",
          background: "var(--amber-soft, rgba(180,100,0,.10))",
          borderRadius: 999,
          padding: "6px 12px",
        }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#C98A1E", display: "inline-block", flexShrink: 0 }} />
          &ldquo;Repeat poster&rdquo; flags a possible ghost job
        </div>
      </div>

      {/* ── Table card ── */}
      <div style={{
        background: "var(--card)",
        border: "1px solid var(--line)",
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: "0 1px 2px rgba(28,26,23,.04),0 18px 44px -38px rgba(28,26,23,.4)",
        animation: "ccrise .5s ease both",
        animationDelay: ".05s",
      }}>
        {/* Header row */}
        <div style={{
          display: "grid",
          gridTemplateColumns: COL,
          gap: 14,
          alignItems: "center",
          padding: "14px 22px",
          borderBottom: "1px solid var(--line4)",
          background: "var(--bg2)",
        }}>
          <span style={HDR_BASE}>Employer</span>
          <SortBtn sort={sort} setSort={setSort} colKey="active" label="Active" />
          <SortBtn sort={sort} setSort={setSort} colKey="total" label="All-time" />
          <SortBtn sort={sort} setSort={setSort} colKey="avgSalary" label="Avg salary" />
          <SortBtn sort={sort} setSort={setSort} colKey="remoteShare" label="Remote" />
          <span style={HDR_BASE}>Signal</span>
        </div>

        {/* Data rows */}
        {rows.map(c => {
          const track = primaryTrack(allJobs, c.name);
          const salaryLabel = c.avgSalary !== null ? `$${c.avgSalary.toLocaleString()}` : "—";
          const remotePct = Math.round(c.remoteShare * 100);

          return (
            <Link
              key={c.name}
              to={`/companies/${encodeURIComponent(c.name)}`}
              data-testid="company-row"
              style={{
                display: "grid",
                gridTemplateColumns: COL,
                gap: 14,
                alignItems: "center",
                padding: "15px 22px",
                borderBottom: "1px solid var(--line6, rgba(0,0,0,.05))",
                cursor: "pointer",
                transition: "background .14s ease",
                textDecoration: "none",
                color: "inherit",
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg2)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}
            >
              {/* Employer cell */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                <LogoOrMonogram name={c.name} logo={c.logo} size={36} radius={9} fontSize={13} />
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontWeight: 600,
                    fontSize: 14.5,
                    lineHeight: 1.2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}>
                    {c.name}
                  </div>
                  {track && (
                    <div style={{
                      fontSize: 11.5,
                      color: "var(--muted3)",
                      fontFamily: "'JetBrains Mono', monospace",
                      marginTop: 1,
                    }}>
                      {track}
                    </div>
                  )}
                </div>
              </div>

              {/* Active */}
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 700,
                fontSize: 18,
              }}>
                {c.active}
              </span>

              {/* All-time */}
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 14,
                color: "var(--muted3)",
              }}>
                {c.total}
              </span>

              {/* Avg salary */}
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 600,
                fontSize: 14,
              }}>
                {salaryLabel}
              </span>

              {/* Remote bar + % */}
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <div style={{
                  flex: 1,
                  maxWidth: 90,
                  height: 7,
                  background: "var(--line5, rgba(0,0,0,.08))",
                  borderRadius: 99,
                  overflow: "hidden",
                }}>
                  <GrowBar frac={c.remoteShare} />
                </div>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12.5,
                  color: "var(--muted)",
                }}>
                  {remotePct}%
                </span>
              </div>

              {/* Signal chip */}
              <div>
                {c.repeatPoster
                  ? (
                    <Chip tone="amber">⚑ repeat poster</Chip>
                  )
                  : (
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      color: "var(--green-fg, #1E9E5A)",
                      fontSize: 12.5,
                      fontWeight: 500,
                    }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#1E9E5A", display: "inline-block", flexShrink: 0 }} />
                      healthy
                    </span>
                  )
                }
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
