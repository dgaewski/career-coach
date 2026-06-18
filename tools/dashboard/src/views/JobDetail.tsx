import { Link, useNavigate, useParams } from "react-router-dom";
import { useData } from "../hooks/useData.js";
import type { JobDetail as JobDetailT, LinksMap, Summary } from "../lib/types.js";
import { FLAG_LABEL } from "../lib/types.js";
import { wikilinkClickHandler } from "../lib/wikilinks.js";
import { Stars, Chip } from "../components/primitives.js";
import { InterestButton } from "../components/InterestButton.js";
import { LinkChip } from "../components/LinkChip.js";

/** Split fit.reasons into has-skills, missing-skills (skill-only, strip prefix). */
function splitReasons(reasons: string[]): { hasSkills: string[]; missingSkills: string[] } {
  const hasSkills: string[] = [];
  const missingSkills: string[] = [];
  for (const r of reasons) {
    if (r.startsWith("has ") && !r.includes("(")) hasSkills.push(r.slice(4));
    else if (r.startsWith("missing ") && !r.includes("(")) missingSkills.push(r.slice(8));
    // non-skill reasons (geo …, level …) are intentionally dropped
  }
  return { hasSkills, missingSkills };
}

function havePercent(has: number, missing: number): number {
  const total = has + missing;
  if (total === 0) return 0;
  return Math.round((has / total) * 100);
}

const FRESH_COLOR: Record<string, string> = {
  high: "var(--green-fg)",
  medium: "var(--amber-fg, #B86A00)",
  low: "var(--red-fg)",
};

const STATUS_COLOR: Record<string, string> = {
  applied: "var(--accent)",
  interview: "var(--green-fg)",
  offer: "var(--green-fg)",
  rejected: "var(--red-fg)",
  none: "var(--muted)",
  interested: "var(--amber-fg, #B86A00)",
};

export default function JobDetail(): JSX.Element {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data: job, error, loading, reload } = useData<JobDetailT>(`/api/jobs/${id}`);
  const { data: summary } = useData<Summary>("/api/summary");
  const links = useData<LinksMap>("/api/links");

  if (loading) return <p className="muted" style={{ padding: "32px 0" }}>Loading…</p>;
  if (error || !job) {
    return (
      <div style={{ padding: "32px 0" }}>
        <Link to="/jobs" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, color: "var(--muted)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 7, marginBottom: 20 }}>
          ← All jobs
        </Link>
        <p style={{ color: "var(--red-fg)" }}>Failed to load job — not found or unavailable.</p>
      </div>
    );
  }

  const { hasSkills, missingSkills } = splitReasons(job.fit.reasons);
  const havePct = havePercent(hasSkills.length, missingSkills.length);
  const appStatus = job.fm["app-status"];
  const statusColor = STATUS_COLOR[appStatus] ?? "var(--muted)";
  const freshColor = FRESH_COLOR[job.freshness] ?? "var(--muted)";
  const indexedLabel = summary?.generatedAt
    ? summary.generatedAt.slice(0, 10)
    : job.fm.ingested?.toString().slice(0, 10) ?? "—";
  // Apply CTA: use the canonical posting only when present AND not a confirmed-dead (404/410) link;
  // otherwise fall through to the discovered-via careers page so the primary CTA is never a dead click.
  // ("unverified" links — bot-blocked/transient — keep the canonical URL, since they're probably live.)
  const linkDead = links.data?.[job.id]?.status === "dead";
  const canonicalUrl = job.fm.url && !linkDead ? String(job.fm.url) : "";

  return (
    <div style={{ animation: "ccfade .35s ease both" }}>
      {/* ← Back link */}
      <Link
        to="/jobs"
        style={{
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12.5,
          color: "var(--muted)",
          marginBottom: 20,
          textDecoration: "none",
        }}
      >
        ← All jobs
      </Link>

      {/* Header row: title + meta  |  stars + score + View posting */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, flexWrap: "wrap", marginBottom: 22 }}>
        <div>
          <h1 style={{ fontFamily: "'Newsreader', serif", fontWeight: 600, fontSize: 34, margin: "0 0 7px", letterSpacing: "-0.01em", lineHeight: 1.1 }}>
            {job.fm.title}
          </h1>
          <div style={{ fontSize: 15, color: "var(--muted2)" }}>
            {job.fm.company}
            {job.fm.location ? ` · ${job.fm.location}` : job.fm.geo ? ` · ${job.fm.geo}` : ""}
            {job.fm.level ? ` · ${job.fm.level}` : ""}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 18, flexShrink: 0 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ lineHeight: 1 }}>
              <Stars score={job.fit.score} />
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 30, marginTop: 3 }}>
              {job.fit.score}
            </div>
            {job.fit.flags?.length ? (
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 6, flexWrap: "wrap" }}>
                {job.fit.flags.map(f => <Chip key={f} tone="amber">⚠ {FLAG_LABEL[f] ?? f}</Chip>)}
              </div>
            ) : null}
          </div>
          <InterestButton id={job.id} status={job.fm["app-status"]} onChanged={reload} />
          {canonicalUrl ? (
            <a
              href={canonicalUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                border: "none",
                cursor: "pointer",
                background: "var(--solid)",
                color: "#fff",
                fontWeight: 600,
                fontSize: 14,
                padding: "11px 18px",
                borderRadius: 11,
                fontFamily: "inherit",
                whiteSpace: "nowrap",
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              View posting ↗
            </a>
          ) : job.fm["discovered-via"] ? (
            <a
              href={String(job.fm["discovered-via"])}
              target="_blank"
              rel="noreferrer"
              style={{
                cursor: "pointer",
                background: "var(--card)",
                color: "var(--ink3)",
                fontWeight: 600,
                fontSize: 14,
                padding: "11px 18px",
                borderRadius: 11,
                fontFamily: "inherit",
                whiteSpace: "nowrap",
                textDecoration: "none",
                display: "inline-block",
                border: "1px solid var(--line2)",
              }}
            >
              Careers page ↗
            </a>
          ) : null}
        </div>
      </div>

      {/* Fit reasons centerpiece: 2-col grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 22 }}>
        {/* Why you fit — green left-accent */}
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: "3px solid #1E9E5A", borderRadius: 14, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--green-fg)" }}>
              Why you fit
            </span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 14, color: "var(--green-fg)" }}>
              have {havePct}%
            </span>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {hasSkills.length === 0 && (
              <span style={{ fontSize: 13, color: "var(--muted3)" }}>—</span>
            )}
            {hasSkills.map(s => (
              <Chip key={s} tone="green">✓ {s}</Chip>
            ))}
          </div>
        </div>

        {/* What's missing — red left-accent */}
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: "3px solid #D8443F", borderRadius: 14, padding: 20 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--red-fg)", marginBottom: 14 }}>
            What&rsquo;s missing
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {missingSkills.length === 0 && (
              <span style={{ fontSize: 13, color: "var(--muted3)" }}>—</span>
            )}
            {missingSkills.map(s => (
              <Chip key={s} tone="red">+ {s}</Chip>
            ))}
          </div>
        </div>
      </div>

      {/* Body + Facts sidebar: 1.7fr / 1fr */}
      <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: 20, alignItems: "start" }}>
        {/* Body panel — bg2, Newsreader subheads */}
        <div
          className="rendered"
          style={{ background: "var(--bg2)", border: "1px solid var(--line)", borderRadius: 16, padding: "28px 30px" }}
          onClick={wikilinkClickHandler(navigate)}
          dangerouslySetInnerHTML={{ __html: job.html }}
        />

        {/* Facts sidebar */}
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, padding: 22 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--muted3)", marginBottom: 16 }}>
            The facts
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {/* Link */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--line5)" }}>
              <span style={{ fontSize: 13, color: "var(--muted3)" }}>Link</span>
              <LinkChip status={links.data?.[job.id]?.status} />
            </div>
            {/* Salary */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--line5)" }}>
              <span style={{ fontSize: 13, color: "var(--muted3)" }}>Salary</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 14 }}>
                {job.fm.salary ?? "unverified"}
              </span>
            </div>
            {/* Freshness */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--line5)" }}>
              <span style={{ fontSize: 13, color: "var(--muted3)" }}>Freshness</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 500, color: freshColor }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: freshColor, display: "inline-block", flexShrink: 0 }} />
                {job.freshness}
              </span>
            </div>
            {/* Status */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--line5)" }}>
              <span style={{ fontSize: 13, color: "var(--muted3)" }}>Status</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: statusColor }}>
                {appStatus === "none" ? "—" : appStatus}
              </span>
            </div>
            {/* Type */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--line5)" }}>
              <span style={{ fontSize: 13, color: "var(--muted3)" }}>Type</span>
              <span style={{ fontSize: 13.5, fontWeight: 500 }}>
                {job.fm.employment ?? "full-time"}
              </span>
            </div>
            {/* Location */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--line5)" }}>
              <span style={{ fontSize: 13, color: "var(--muted3)" }}>Location</span>
              <span style={{ fontSize: 13.5, fontWeight: 500 }}>
                {job.fm.location ?? job.fm.geo ?? "—"}
              </span>
            </div>
            {/* Posted */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--line5)" }}>
              <span style={{ fontSize: 13, color: "var(--muted3)" }}>Posted</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, color: "var(--muted)" }}>
                {job.fm.posted ? String(job.fm.posted).slice(0, 10) : "—"}
              </span>
            </div>
            {/* Indexed */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0" }}>
              <span style={{ fontSize: 13, color: "var(--muted3)" }}>Indexed</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, color: "var(--green-fg)" }}>
                {indexedLabel}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
