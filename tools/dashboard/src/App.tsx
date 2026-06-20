import { useEffect, useState } from "react";
import { NavLink, Route, Routes, useLocation } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary.js";
import { useData } from "./hooks/useData.js";
import { useTheme } from "./hooks/useTheme.js";
import type { Summary, Overview } from "./lib/types.js";
import { api } from "./lib/api.js";
import { subscribeRefresh } from "./lib/live.js";
import { Toast } from "./components/primitives.js";
import Overview_ from "./views/Overview.js";
import Jobs from "./views/Jobs.js";
import JobDetail from "./views/JobDetail.js";
import SkillCloud from "./views/SkillCloud.js";
import Tracker from "./views/Tracker.js";
import Coach from "./views/Coach.js";
import Companies from "./views/Companies.js";
import CompanyDetail from "./views/CompanyDetail.js";
import MapView from "./views/MapView.js";
import PageView from "./views/PageView.js";
import MorningBrief from "./views/MorningBrief.js";
import Trends from "./views/Trends.js";

const NAV: [string, string][] = [
  ["/", "Overview"], ["/brief", "Morning Brief"], ["/coach", "Coach"], ["/trends", "Market Trends"],
  ["/jobs", "Jobs"], ["/tracker", "Tracker"], ["/skills", "Skills"], ["/companies", "Companies"], ["/map", "Map"],
];

/** Subscribes to SSE refresh events and fetches /api/overview on each one.
 *  Returns a toast message string when a refresh has fired, or null otherwise. */
function useLiveToast(): { msg: string | null; dismiss: () => void } {
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeRefresh(async () => {
      try {
        const data = await api<Overview>("/api/overview");
        const newRoles = data?.changes?.newRoles?.length ?? 0;
        const fitImproved = data?.changes?.fitImproved?.length ?? 0;
        setMsg(`Market re-indexed — ${newRoles} new role${newRoles === 1 ? "" : "s"}, ${fitImproved} fit${fitImproved === 1 ? "" : "s"} improved`);
      } catch {
        // If the fetch fails, skip the toast silently
      }
    });
    return unsub;
  }, []);

  return { msg, dismiss: () => setMsg(null) };
}

/** Inner component — must be inside a Router so useLocation() is valid. */
function RoutedViews(): JSX.Element {
  const location = useLocation();
  return (
    <ErrorBoundary key={location.pathname}>
      <Routes>
        <Route path="/" element={<Overview_ />} />
        <Route path="/brief" element={<MorningBrief />} />
        <Route path="/skills" element={<SkillCloud />} />
        <Route path="/skills/:slug" element={<SkillCloud />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/jobs/:id" element={<JobDetail />} />
        <Route path="/tracker" element={<Tracker />} />
        <Route path="/coach" element={<Coach />} />
        <Route path="/trends" element={<Trends />} />
        <Route path="/companies" element={<Companies />} />
        <Route path="/companies/:name" element={<CompanyDetail />} />
        <Route path="/map" element={<MapView />} />
        <Route path="/page/:name" element={<PageView />} />
        <Route path="*" element={<div className="empty">Not found.</div>} />
      </Routes>
    </ErrorBoundary>
  );
}

export default function App(): JSX.Element {
  const { error, loading } = useData<Summary>("/api/summary");
  const { theme, toggle } = useTheme();
  const { msg, dismiss } = useLiveToast();

  if (loading) return <main><p className="muted">Loading Career_Coach…</p></main>;
  if (error) {
    return (
      <main className="empty">
        <h1>Career_Coach</h1>
        <p>No data available ({error}).</p>
        <p>Start the server with <code>npm run coach</code> in <code>tools/</code>, or re-index with <code>npm run index</code>.</p>
      </main>
    );
  }

  return (
    <>
      <nav className="topnav">
        {/* Logo mark — gradient "C" circle */}
        <div className="nav-logo" aria-hidden="true">
          <div
            className="nav-logo-mark"
            style={{
              width: 30, height: 30, borderRadius: 9,
              background: "linear-gradient(135deg, #2F62F0, #7A53F2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontFamily: "'Newsreader', serif", fontWeight: 700, fontSize: 17, flexShrink: 0,
            }}
          >
            C
          </div>
        </div>

        {/* Wordmark */}
        <span
          className="nav-wordmark"
          style={{ fontFamily: "Newsreader, Georgia, serif", fontWeight: 600, fontSize: 18, letterSpacing: "-0.01em", marginRight: 14 }}
        >
          Career Coach
        </span>

        {/* Nav tabs */}
        {NAV.map(([to, label]) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) => isActive ? "nav-tab nav-tab--active" : "nav-tab"}
            style={({ isActive }) => isActive
              ? { background: "var(--solid)", color: "#fff", borderRadius: 9, padding: "6px 13px" }
              : { borderRadius: 9, padding: "6px 13px" }}
          >
            {label}
          </NavLink>
        ))}

        {/* Live pill (soft-filled, pushed to the right) */}
        <span className="nav-live-pill" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 7, fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, color: "var(--green-fg)", background: "var(--green-soft)", padding: "5px 10px", borderRadius: 999, flexShrink: 0 }}>
          <span className="live-dot" style={{ width: 7, height: 7, borderRadius: "50%", background: "#1E9E5A", display: "inline-block", animation: "ccpulse 1.8s ease-in-out infinite" }} />
          live
        </span>

        {/* Theme toggle */}
        <button
          aria-label="Toggle theme"
          onClick={toggle}
          style={{
            width: 32, height: 32, borderRadius: "50%", border: "1px solid var(--line)",
            background: "var(--card)", color: "var(--muted)", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}
        >
          {theme === "light" ? "☾" : "☀"}
        </button>

        {/* Avatar */}
        <div
          className="nav-avatar"
          aria-hidden="true"
          style={{
            width: 30, height: 30, borderRadius: "50%",
            background: "linear-gradient(135deg, var(--line), var(--dotline))",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700, color: "var(--muted)", flexShrink: 0,
          }}
        >
          D
        </div>
      </nav>

      {/* Live toast — only shown after an actual refresh event */}
      {msg && <Toast onDone={dismiss}>{msg}</Toast>}

      <main>
        <RoutedViews />
      </main>
    </>
  );
}
