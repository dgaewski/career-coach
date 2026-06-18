import { Link } from "react-router-dom";
import type { Job, LinkStatus } from "../lib/types.js";
import { FLAG_LABEL } from "../lib/types.js";
import { havePct } from "../lib/smartFilters.js";
import { Stars, Chip } from "./primitives.js";
import { InterestButton } from "./InterestButton.js";
import { LinkChip } from "./LinkChip.js";

function freshnessChip(f: string): JSX.Element {
  if (f === "high") return (
    <Chip tone="green">
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--green-fg, #1e9e5a)", display: "inline-block", marginRight: 5 }} />
      Fresh
    </Chip>
  );
  if (f === "medium") return (
    <Chip tone="amber">
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--amber-fg, #c47f00)", display: "inline-block", marginRight: 5 }} />
      Recent
    </Chip>
  );
  return (
    <Chip tone="red">
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--red-fg, #d8443f)", display: "inline-block", marginRight: 5 }} />
      Stale
    </Chip>
  );
}

export function JobCard({ job, linkStatus, onChanged }: {
  job: Job; linkStatus?: LinkStatus; onChanged?: () => void;
}): JSX.Element {
  const hPct = Math.round(havePct(job) * 100);
  const hasSalary = !!job.fm.salary;

  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--line)",
        borderRadius: 16,
        padding: 20,
        boxShadow: "0 1px 2px rgba(28,26,23,.04),0 18px 44px -38px rgba(28,26,23,.35)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        boxSizing: "border-box",
        transition: "transform .18s ease, box-shadow .18s ease, border-color .18s ease",
        animation: "ccrise .45s ease both",
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform = "translateY(-3px)";
        el.style.borderColor = "#CBD8FB";
        el.style.boxShadow = "0 1px 2px rgba(28,26,23,.04),0 26px 54px -30px rgba(47,98,240,.4)";
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform = "";
        el.style.borderColor = "";
        el.style.boxShadow = "0 1px 2px rgba(28,26,23,.04),0 18px 44px -38px rgba(28,26,23,.35)";
      }}
    >
      {/* Top: title + meta | stars + score */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-start" }}>
        <Link to={`/jobs/${job.id}`} style={{ textDecoration: "none", color: "inherit", minWidth: 0 }}>
          <span
            data-testid="job-title"
            style={{
              fontSize: 17,
              fontWeight: 600,
              color: "var(--ink)",
              lineHeight: 1.25,
              display: "block",
            }}
          >{job.fm.title}</span>
          <div style={{ fontSize: 13, color: "var(--muted3)", marginTop: 4 }}>
            {job.fm.company} · {job.fm.location ?? job.fm.geo} · {job.fm.level}
          </div>
        </Link>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <Stars score={job.fit.score} />
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 700,
            fontSize: 24,
            marginTop: 3,
          }}>{job.fit.score}</div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "var(--line5)", margin: "16px 0" }} />

      {/* Chips row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <Chip tone="blue">have {hPct}%</Chip>

        {hasSalary
          ? <Chip tone="neutral">{job.fm.salary}</Chip>
          : <Chip tone="amber">salary unverified</Chip>
        }

        {freshnessChip(job.freshness)}

        <LinkChip status={linkStatus} />
        {job.fit.flags?.map(f => (
          <Chip key={f} tone="amber">⚠ {FLAG_LABEL[f] ?? f}</Chip>
        ))}
      </div>

      {/* Bottom row: InterestButton + open link */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 14 }}>
        <InterestButton id={job.id} status={job.fm["app-status"]} size="sm" onChanged={onChanged} />
        <Link
          to={`/jobs/${job.id}`}
          style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "var(--accent)", textDecoration: "none" }}
        >
          open →
        </Link>
      </div>
    </div>
  );
}
