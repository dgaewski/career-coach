import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api.js";
import { wikilinkClickHandler } from "../lib/wikilinks.js";
import type { Job, Skill, Company, Page } from "../lib/types.js";

const PAGE_DIRS = ["coach", "coach/advice", "coach/projects", "coach/briefs", "analytics", "skills", "companies"];

const mono = "'JetBrains Mono', monospace";
const serif = "'Newsreader', serif";

// Mono uppercase kicker shown above the page title, by frontmatter type.
const KICKER: Record<string, string> = {
  advice: "Advice", project: "Project", brief: "Market brief",
  profile: "Profile", coach: "Coach", "interview-bank": "Interview bank",
};

const cardStyle = {
  background: "var(--card)",
  border: "1px solid var(--line)",
  borderRadius: 16,
  boxShadow: "0 1px 2px rgba(28,26,23,.04), 0 18px 44px -38px rgba(28,26,23,.4)",
} as const;

function monthsSince(dateStr: string): number {
  const t = Date.parse(dateStr);
  if (Number.isNaN(t)) return 0;
  return (Date.now() - t) / (1000 * 60 * 60 * 24 * 30.4);
}

// Drop a leading <h1> from rendered markdown — the title is shown in the page hero,
// so the body's own "# Title" heading would otherwise duplicate it.
function stripLeadingH1(html: string): string {
  return html.replace(/^\s*<h1[^>]*>[\s\S]*?<\/h1>\s*/i, "");
}

// Remove an <h2>heading</h2> section (up to the next <h2> or end). Used to drop the
// body's "## Sources" when the same links already render in the meta sidebar.
function stripSection(html: string, heading: string): string {
  const re = new RegExp(`<h2[^>]*>\\s*${heading}\\s*</h2>[\\s\\S]*?(?=<h2[\\s>]|$)`, "i");
  return html.replace(re, "");
}

export default function PageView(): JSX.Element {
  const { name = "" } = useParams();
  const navigate = useNavigate();
  const [page, setPage] = useState<Page | null>(null);
  const [missing, setMissing] = useState(false);
  const [resolvedDir, setResolvedDir] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    setPage(null); setMissing(false); setResolvedDir("");
    (async () => {
      const decoded = decodeURIComponent(name);
      const [jobs, skills, companies] = await Promise.all([
        api<Job[]>("/api/jobs?status=all").catch(() => []),
        api<Skill[]>("/api/skills").catch(() => []),
        api<Company[]>("/api/companies").catch(() => []),
      ]);
      if (cancelled) return;
      const job = jobs.find(j => j.name === decoded);
      if (job) return navigate(`/jobs/${job.id}`, { replace: true });
      const skill = skills.find(s => s.name === decoded || s.slug === decoded);
      if (skill) return navigate(`/skills/${skill.slug}`, { replace: true });
      const company = companies.find(c => c.name === decoded);
      if (company) return navigate(`/companies/${encodeURIComponent(company.name)}`, { replace: true });
      for (const dir of PAGE_DIRS) {
        try {
          const p = await api<Page>(`/api/pages/${dir}/${encodeURIComponent(decoded)}`);
          if (!cancelled) { setPage(p); setResolvedDir(dir); }
          return;
        } catch { /* try next dir */ }
      }
      if (!cancelled) setMissing(true);
    })();
    return () => { cancelled = true; };
  }, [name, navigate]);

  const underCoach = resolvedDir.startsWith("coach");
  const back = (
    <Link to={underCoach ? "/coach" : "/"} style={{
      fontFamily: mono, fontSize: 12.5, color: "var(--muted)",
      textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 7, marginBottom: 20,
    }}>{underCoach ? "← Back to Coach" : "← Back"}</Link>
  );

  if (missing) return (
    <div style={{ padding: "16px 0" }}>{back}
      <div className="empty">Page "{decodeURIComponent(name)}" isn't written yet — a wikilink to it marks the gap.</div>
    </div>
  );
  if (!page) return <div style={{ padding: "16px 0" }}>{back}<p className="muted">Resolving…</p></div>;

  const fm = page.fm ?? {};
  const type = String(fm.type ?? "");
  const sources = Array.isArray(fm.sources) ? (fm.sources as string[]) : [];
  const researched = typeof fm.researched === "string" ? fm.researched : null;
  const stale = researched ? monthsSince(researched) > 6 : false;
  const closes = Array.isArray(fm.closes) ? (fm.closes as string[]) : [];
  const repo = typeof fm.repo === "string" ? fm.repo : "";

  const kickerLabel = KICKER[type] ?? (resolvedDir.split("/").pop() ?? "Page");

  // Sidebar shows only for pages that carry structured meta.
  const hasMeta =
    (type === "advice" && (researched !== null || sources.length > 0)) ||
    (type === "project");

  // Body HTML: title (leading H1) is shown in the hero; advice "## Sources" moves to the sidebar.
  let bodyHtml = stripLeadingH1(page.html);
  if (type === "advice" && sources.length > 0) bodyHtml = stripSection(bodyHtml, "Sources");
  // The renderer escapes raw HTML, so authoring markers like <!-- gap:begin --> would show as text.
  bodyHtml = bodyHtml.replace(/&lt;!--[\s\S]*?--&gt;/g, "");

  // Pages with a wide data table (e.g. the gap analysis) get a roomier reading column.
  const hasTable = /<table/i.test(bodyHtml);
  const contentMax = hasMeta ? 1000 : hasTable ? 940 : 760;

  // ─── meta sidebar ──────────────────────────────────────────────────────────
  const metaLabel = { fontFamily: mono, fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase" as const, color: "var(--muted3)", marginBottom: 6 };
  const metaBlock = { marginBottom: 18 };

  const sidebar = hasMeta ? (
    <aside style={{ position: "sticky", top: 84, alignSelf: "start", ...cardStyle, padding: "18px 20px" }}>
      {type === "advice" && (
        <>
          {researched && (
            <div style={metaBlock}>
              <div style={metaLabel}>Researched</div>
              <div style={{ fontSize: 13.5, color: "var(--ink2)", fontFamily: mono }}>{researched.slice(0, 10)}</div>
              {stale && (
                <div style={{ marginTop: 8, background: "var(--amber-soft, #fbe6c8)", color: "var(--amber-fg, #c47f00)", borderRadius: 9, padding: "7px 10px", fontSize: 11.5, fontWeight: 600, lineHeight: 1.35 }}>
                  ⚠ Re-verify — over 6 months old
                </div>
              )}
            </div>
          )}
          {sources.length > 0 && (
            <div style={{ marginBottom: 0 }}>
              <div style={metaLabel}>Sources</div>
              <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 7 }}>
                {sources.map(s => {
                  let host = s;
                  try { host = new URL(s).hostname.replace(/^www\./, ""); } catch { /* keep raw */ }
                  return (
                    <li key={s}>
                      <a href={s} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, color: "var(--accent)", textDecoration: "none", wordBreak: "break-word" }}>
                        {host} ↗
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      )}

      {type === "project" && (
        <>
          <div style={metaBlock}>
            <div style={metaLabel}>Status</div>
            <span style={{ display: "inline-block", background: "var(--track)", color: "var(--muted)", borderRadius: 999, padding: "3px 10px", fontSize: 11.5, fontWeight: 600 }}>
              {String(fm.status ?? "idea")}
            </span>
          </div>
          <div style={metaBlock}>
            <div style={metaLabel}>Repo</div>
            {repo
              ? <a href={repo} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: "var(--accent)", textDecoration: "none" }}>open repo ↗</a>
              : <span style={{ fontSize: 13, color: "var(--muted3)" }}>TBD</span>}
          </div>
          {closes.length > 0 && (
            <div style={{ marginBottom: 0 }}>
              <div style={metaLabel}>Closes gaps</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {closes.map(c => (
                  <Link key={c} to={`/skills/${c}`} style={{ background: "var(--green-soft)", color: "var(--green-fg)", borderRadius: 999, padding: "3px 9px", fontSize: 11.5, fontWeight: 600, textDecoration: "none" }}>
                    {c}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </aside>
  ) : null;

  return (
    <div style={{ padding: "16px 0", animation: "ccfade .4s ease both" }}>
      {back}

      {/* page hero — title rendered once, here (body's own H1 is stripped) */}
      <header style={{ maxWidth: contentMax, marginBottom: 18, animation: "ccrise .5s ease both" }}>
        <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 8 }}>
          {kickerLabel}
        </div>
        <h1 style={{ fontFamily: serif, fontWeight: 600, fontSize: 32, lineHeight: 1.12, letterSpacing: "-0.015em", margin: 0, color: "var(--ink)" }}>
          {page.title}
        </h1>
      </header>

      <div
        style={{
          maxWidth: contentMax,
          display: "grid",
          gridTemplateColumns: hasMeta ? "minmax(0, 1fr) 248px" : "minmax(0, 1fr)",
          gap: 28,
          alignItems: "start",
        }}
      >
        <article
          className="rendered"
          onClick={wikilinkClickHandler(navigate)}
          style={{ ...cardStyle, padding: "30px 34px" }}
        >
          <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
        </article>

        {sidebar}
      </div>
    </div>
  );
}
