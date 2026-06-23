import { Link, useNavigate, useParams } from "react-router-dom";
import { useData } from "../hooks/useData.js";
import type { Company, Job, Page } from "../lib/types.js";
import { wikilinkClickHandler } from "../lib/wikilinks.js";
import { Stars, GrowBar } from "../components/primitives.js";
import { primaryTrack } from "../lib/companyUtils.js";
import { LogoOrMonogram } from "../components/CompanyLogo.js";

export default function CompanyDetail(): JSX.Element {
  const { name = "" } = useParams();
  const navigate = useNavigate();
  const decoded = decodeURIComponent(name);

  const companies = useData<Company[]>("/api/companies");
  const page = useData<Page>(`/api/pages/companies/${encodeURIComponent(decoded)}`);
  const jobs = useData<Job[]>("/api/jobs?status=all");

  // Fix 2: loading guard uses OR — wait for ALL fetches before rendering data
  if (companies.loading || page.loading || jobs.loading) {
    return <p className="muted" style={{ padding: "32px 0" }}>Loading…</p>;
  }

  // Fix 1: find this company in the /api/companies data
  const company = (companies.data ?? []).find(c => c.name === decoded);

  // Graceful "not found" state
  if (!company) {
    return (
      <div style={{ padding: "32px 0" }}>
        <Link
          to="/companies"
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
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--accent)"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--muted)"}
        >
          ← All companies
        </Link>
        <p style={{ color: "var(--muted3)", fontSize: 15 }}>
          Company &ldquo;{decoded}&rdquo; not found in the index.
        </p>
      </div>
    );
  }

  const allJobs = jobs.data ?? [];

  // Jobs-derived values (used ONLY for Open roles section + track badge)
  const track = primaryTrack(allJobs, decoded);
  const activeRoles = allJobs.filter(j => j.fm.company === decoded && j.fm.status === "active");

  // Scorecard values — all from the /api/companies record (Fix 1)
  const salaryLabel = company.avgSalary !== null ? `$${company.avgSalary.toLocaleString()}` : "—";
  const remotePct = Math.round(company.remoteShare * 100);
  const isRepeat = company.repeatPoster;

  return (
    <div style={{ animation: "ccfade .35s ease both" }}>
      {/* ← Back link */}
      <Link
        to="/companies"
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
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--accent)"}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--muted)"}
      >
        ← All companies
      </Link>

      {/* Header: monogram + name + track + signal */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 20,
        flexWrap: "wrap",
        marginBottom: 24,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <LogoOrMonogram name={decoded} logo={company.logo} size={56} radius={14} fontSize={20} />
          <div>
            <h3 style={{
              fontFamily: "'Newsreader', Georgia, serif",
              fontWeight: 600,
              fontSize: 32,
              margin: "0 0 4px",
              letterSpacing: "-0.01em",
            }}>
              {decoded}
            </h3>
            {(() => {
              const parts = [company.industry, company.hq, company.size, company.founded !== undefined ? `est. ${company.founded}` : undefined].filter(Boolean);
              return parts.length ? (
                <div style={{ fontSize: 13.5, color: "var(--muted3)", fontFamily: "'JetBrains Mono', monospace" }}>
                  {parts.join(" · ")}
                </div>
              ) : (track && (
                <div style={{ fontSize: 13.5, color: "var(--muted3)", fontFamily: "'JetBrains Mono', monospace" }}>{track}</div>
              ));
            })()}
            {(company.domain || company.careersUrl) && (
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                {company.domain && (
                  <a href={`https://${company.domain}`} target="_blank" rel="noreferrer"
                    style={{ fontSize: 12.5, color: "var(--accent)", textDecoration: "none" }}>↗ {company.domain}</a>
                )}
                {company.careersUrl && (
                  <a href={company.careersUrl} target="_blank" rel="noreferrer"
                    style={{ fontSize: 12.5, color: "var(--accent)", textDecoration: "none" }}>↗ Careers</a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Signal — from company.repeatPoster (Fix 1) */}
        {isRepeat
          ? (
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "var(--amber-soft, rgba(180,100,0,.10))",
              color: "var(--amber-fg, #B86A00)",
              borderRadius: 999,
              padding: "7px 13px",
              fontSize: 13,
              fontWeight: 600,
            }}>
              ⚑ Repeat poster — verify before applying
            </span>
          )
          : (
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              color: "var(--green-fg, #1E9E5A)",
              fontSize: 13.5,
              fontWeight: 600,
            }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#1E9E5A", display: "inline-block", flexShrink: 0 }} />
              Healthy posting pattern
            </span>
          )
        }
      </div>

      {/* Main 1.7fr / 1fr grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1.7fr 1fr",
        gap: 20,
        alignItems: "start",
        marginBottom: 28,
      }}>
        {/* Left: wiki body */}
        <div
          className="rendered"
          style={{
            background: "var(--bg2)",
            border: "1px solid var(--line)",
            borderRadius: 16,
            padding: "28px 30px",
          }}
          onClick={wikilinkClickHandler(navigate)}
        >
          {page.data
            ? <div dangerouslySetInnerHTML={{ __html: page.data.html }} />
            : (
              <p style={{ color: "var(--muted3)", fontSize: 14 }}>
                {page.error ?? "No wiki page found for this company."}
              </p>
            )
          }
        </div>

        {/* Right: Scorecard sidebar — all values from company record (Fix 1) */}
        <div style={{
          background: "var(--card)",
          border: "1px solid var(--line)",
          borderRadius: 16,
          padding: 22,
        }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            letterSpacing: ".1em",
            textTransform: "uppercase",
            color: "var(--muted3)",
            marginBottom: 16,
          }}>
            Scorecard
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--line5)" }}>
              <span style={{ fontSize: 13, color: "var(--muted3)" }}>Active openings</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 18 }}>
                {company.active}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--line5)" }}>
              <span style={{ fontSize: 13, color: "var(--muted3)" }}>All-time</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: "var(--muted)" }}>
                {company.total}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--line5)" }}>
              <span style={{ fontSize: 13, color: "var(--muted3)" }}>Avg salary</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 14 }}>
                {salaryLabel}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--line5)" }}>
              <span style={{ fontSize: 13, color: "var(--muted3)" }}>Remote share</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 60,
                  height: 6,
                  background: "var(--line5, rgba(0,0,0,.08))",
                  borderRadius: 99,
                  overflow: "hidden",
                }}>
                  <GrowBar frac={company.remoteShare} />
                </div>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "var(--muted)" }}>
                  {remotePct}%
                </span>
              </div>
            </div>
            {company.hq && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--line5)" }}>
                <span style={{ fontSize: 13, color: "var(--muted3)" }}>HQ</span>
                <span style={{ fontSize: 13.5, fontWeight: 500 }}>{company.hq}</span>
              </div>
            )}
            {company.founded !== undefined && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--line5)" }}>
                <span style={{ fontSize: 13, color: "var(--muted3)" }}>Founded</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13.5 }}>{company.founded}</span>
              </div>
            )}
            {company.size && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--line5)" }}>
                <span style={{ fontSize: 13, color: "var(--muted3)" }}>Size</span>
                <span style={{ fontSize: 13.5, fontWeight: 500 }}>{company.size}</span>
              </div>
            )}
            {company.industry && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--line5)" }}>
                <span style={{ fontSize: 13, color: "var(--muted3)" }}>Industry</span>
                <span style={{ fontSize: 13.5, fontWeight: 500 }}>{company.industry}</span>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0" }}>
              <span style={{ fontSize: 13, color: "var(--muted3)" }}>Signal</span>
              {isRepeat
                ? (
                  <span style={{ color: "var(--amber-fg, #B86A00)", fontSize: 12.5, fontWeight: 600 }}>
                    ⚑ Repeat poster
                  </span>
                )
                : (
                  <span style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    color: "var(--green-fg, #1E9E5A)",
                    fontSize: 12.5,
                    fontWeight: 500,
                  }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#1E9E5A", display: "inline-block", flexShrink: 0 }} />
                    Healthy posting pattern
                  </span>
                )
              }
            </div>
          </div>
        </div>
      </div>

      {/* Open roles section — derived from jobs list (Fix 1: only jobs used here) */}
      <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 14 }}>
        Open roles ·{" "}
        <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--accent)" }}>
          {activeRoles.length}
        </span>
      </div>

      {activeRoles.length > 0
        ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {activeRoles.map(j => {
              const hasSalary = !!j.fm.salary;
              return (
                <Link
                  key={j.id}
                  to={`/jobs/${j.id}`}
                  style={{
                    display: "block",
                    textDecoration: "none",
                    color: "inherit",
                    background: "var(--card)",
                    border: "1px solid var(--line)",
                    borderRadius: 14,
                    padding: 18,
                    cursor: "pointer",
                    transition: "transform .16s ease, box-shadow .16s ease, border-color .16s ease",
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.transform = "translateY(-2px)";
                    el.style.borderColor = "#CBD8FB";
                    el.style.boxShadow = "0 16px 34px -22px rgba(47,98,240,.45)";
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.transform = "";
                    el.style.borderColor = "";
                    el.style.boxShadow = "";
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {j.name}
                      </div>
                      <div style={{ fontSize: 12.5, color: "var(--muted3)", marginTop: 3 }}>
                        {j.fm.location ?? j.fm.geo} · {j.fm.level}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ lineHeight: 1 }}>
                        <Stars score={j.fit.score} />
                      </div>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 18, marginTop: 2 }}>
                        {j.fit.score}
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      background: "var(--track, rgba(0,0,0,.05))",
                      color: "var(--ink3, var(--muted))",
                      borderRadius: 999,
                      padding: "4px 10px",
                      fontSize: 12,
                      fontWeight: 700,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      {hasSalary ? j.fm.salary : "—"}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )
        : (
          <div style={{
            background: "var(--card)",
            border: "1px dashed var(--line2, #ddd)",
            borderRadius: 14,
            padding: 26,
            textAlign: "center",
            color: "var(--muted3)",
            fontSize: 14,
          }}>
            No open roles indexed right now — check back after the next refresh.
          </div>
        )
      }
    </div>
  );
}
