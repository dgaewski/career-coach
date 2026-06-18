import { Link } from "react-router-dom";
import { useData } from "../hooks/useData.js";
import type { SkillDetail } from "../lib/types.js";
import { Chip, Sparkline } from "../components/primitives.js";

// Trend display helpers
const TREND_COLOR: Record<string, string> = {
  rising: "var(--green-fg)",
  declining: "var(--red-fg)",
  stable: "var(--ink3)",
};
const TREND_LABEL: Record<string, string> = {
  rising: "↑ rising",
  declining: "↓ declining",
  stable: "→ stable",
};
const FIT_COLOR: Record<string, string> = {
  excellent: "var(--green-fg)",
  good: "var(--green-fg)",
  stretch: "var(--amber-fg)",
  poor: "var(--muted3)",
};

// Stat tile
function StatTile({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }): JSX.Element {
  return (
    <div style={{
      background: "var(--card, #fff)", border: "1px solid var(--line3, #f3f4f6)",
      borderRadius: 12, padding: 14,
    }}>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted3, #9ca3af)", marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1, color: accent ? "var(--accent, #6c63ff)" : "inherit" }}>
        {value}
      </div>
    </div>
  );
}

interface Props { slug: string }

export default function SkillExplorer({ slug }: Props): JSX.Element {
  const { data: skill, loading, error } = useData<SkillDetail>(`/api/skills/${slug}`);

  if (loading) {
    return (
      <div style={{
        background: "var(--bg2, #f9fafb)", border: "1px solid var(--line, #e5e7eb)", borderRadius: 18,
        padding: "28px 30px", animation: "ccrise .45s ease both", animationDelay: ".12s",
      }}>
        <p className="muted">Loading explorer…</p>
      </div>
    );
  }

  if (error || !skill) {
    return (
      <div style={{
        background: "var(--bg2, #f9fafb)", border: "1px solid var(--line, #e5e7eb)", borderRadius: 18,
        padding: "28px 30px",
      }}>
        <p>Failed to load skill: {error}</p>
      </div>
    );
  }

  const companies = [...new Set(skill.jobs.map(j => j.fm.company))];
  const shareStr = `${Math.round(skill.share * 100)}%`;
  const sparkPoints = skill.series.map(p => p.share);

  return (
    <div style={{
      background: "var(--bg2, #f9fafb)", border: "1px solid var(--line, #e5e7eb)", borderRadius: 18,
      padding: "28px 30px", boxShadow: "0 1px 2px rgba(28,26,23,.04),0 18px 44px -38px rgba(28,26,23,.4)",
      animation: "ccrise .45s ease both", animationDelay: ".12s",
    }}>
      {/* ── Explorer label ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--muted3, #9ca3af)" }}>
          Skill explorer
        </div>
      </div>

      {/* ── Skill name + badges ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 22 }}>
        <h4 style={{ fontFamily: "'Newsreader', Georgia, serif", fontWeight: 600, fontSize: 34, margin: 0, letterSpacing: "-0.01em" }}>
          {skill.name}
        </h4>
        {skill.have
          ? <Chip tone="green">you have this ✓</Chip>
          : <Chip tone="red">skill gap</Chip>
        }
        <Chip tone={skill.tier === "high-demand" ? "green" : skill.tier === "rare" ? "red" : skill.tier === "occasional" ? "amber" : "neutral"}>
          {skill.tier}
        </Chip>
      </div>

      {/* ── Overview row: stats + sparkline · who's hiring + gap card ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>

        {/* Left: stat tiles + sparkline */}
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 18 }}>
            <StatTile label="Postings" value={skill.count} />
            <StatTile label="Share" value={shareStr} accent />
            <div style={{
              background: "var(--card, #fff)", border: "1px solid var(--line3, #f3f4f6)",
              borderRadius: 12, padding: 14,
            }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted3, #9ca3af)", marginBottom: 8 }}>
                Trend
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1, marginTop: 8, color: TREND_COLOR[skill.trend] ?? "inherit", fontFamily: "'JetBrains Mono', monospace" }}>
                {TREND_LABEL[skill.trend] ?? skill.trend}
              </div>
            </div>
          </div>

          {/* Sparkline card */}
          <div style={{ background: "var(--card, #fff)", border: "1px solid var(--line3, #f3f4f6)", borderRadius: 12, padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Momentum · share over time</span>
            </div>
            <Sparkline points={sparkPoints} width={240} height={54} />
          </div>
        </div>

        {/* Right: clickable companies + gap card */}
        <div>
          {/* Who's hiring — clickable company chips */}
          <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink3, #374151)", marginBottom: 9 }}>
            Who's hiring
          </div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 18 }}>
            {companies.length > 0
              ? companies.map(c => (
                  <Link
                    key={c}
                    to={`/companies/${encodeURIComponent(c)}`}
                    style={{ background: "var(--track, #f3f4f6)", color: "var(--ink3, #374151)", borderRadius: 999, padding: "5px 11px", fontSize: 12.5, fontWeight: 500, textDecoration: "none", border: "1px solid transparent" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--line2)"; e.currentTarget.style.color = "var(--accent)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.color = "var(--ink3, #374151)"; }}
                  >
                    {c}
                  </Link>
                ))
              : <span className="muted" style={{ fontSize: 12.5 }}>No companies listed.</span>
            }
          </div>

          {/* Gap card (only when !have) */}
          {!skill.have && (
            <div style={{
              background: "linear-gradient(150deg,#211E1A,var(--rule,#27272a))",
              borderRadius: 14, padding: 18, color: "#fff",
            }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#9A8FE8", marginBottom: 9 }}>
                Close this gap →
              </div>
              <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontWeight: 600, fontSize: 18, marginBottom: 5 }}>
                Targeted mini-project
              </div>
              <div style={{ fontSize: 13, color: "#C9C3BA", lineHeight: 1.5, marginBottom: 11 }}>
                A focused build that demonstrates {skill.name} end to end.
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span style={{ background: "rgba(154,143,232,.18)", color: "#C3B8F5", borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 600 }}>
                  {skill.name}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Full-width roles list (company, location, level, salary, fit) ── */}
      <div style={{ marginTop: 26 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink3, #374151)", marginBottom: 4 }}>
          Roles asking for {skill.name} · {skill.jobs.length}
        </div>
        {skill.jobs.length === 0
          ? <p className="muted" style={{ fontSize: 13 }}>No active roles.</p>
          : <div style={{ display: "flex", flexDirection: "column" }}>
              {skill.jobs.map(j => {
                const where = (j.fm.location as string | undefined) || j.fm.geo;
                const salary = j.fm.salary as string | undefined;
                const fitColor = FIT_COLOR[j.fit.tier] ?? "var(--ink3)";
                return (
                  <div key={j.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "center", padding: "11px 0", borderBottom: "1px solid var(--line4, #f3f4f6)" }}>
                    <div style={{ minWidth: 0 }}>
                      <Link to={`/jobs/${j.id}`} style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink)", textDecoration: "none" }}>
                        {j.fm.title}
                      </Link>
                      <div style={{ fontSize: 12.5, color: "var(--muted2)", marginTop: 3, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 7 }}>
                        <Link
                          to={`/companies/${encodeURIComponent(j.fm.company)}`}
                          style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}
                        >
                          {j.fm.company}
                        </Link>
                        <span style={{ color: "var(--faint)" }}>·</span>
                        <span>{where}</span>
                        <span style={{ color: "var(--faint)" }}>·</span>
                        <span style={{ textTransform: "capitalize" }}>{j.fm.level}</span>
                        {salary && <><span style={{ color: "var(--faint)" }}>·</span><span>{salary}</span></>}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 14, color: fitColor }}>
                        {j.fit.score}
                      </span>
                      <div style={{ fontSize: 10.5, color: "var(--muted3)", textTransform: "capitalize" }}>{j.fit.tier}</div>
                    </div>
                  </div>
                );
              })}
            </div>
        }
      </div>
    </div>
  );
}
