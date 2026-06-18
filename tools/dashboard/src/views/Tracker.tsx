import { useEffect, useRef, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useData } from "../hooks/useData.js";
import { post } from "../lib/api.js";
import type { Job, TimelineMonth } from "../lib/types.js";
import { APP_STATUSES, REJECTION_STAGES } from "../lib/types.js";
import { Modal, Segmented } from "../components/primitives.js";

// ── Column config ──────────────────────────────────────────────────────────
const COL_META: Record<string, { label: string; color: string; dot: string; bgVar: string }> = {
  interested: { label: "Interested",  color: "#2F62F0", dot: "#2F62F0", bgVar: "var(--blue-soft)"   },
  applied:    { label: "Applied",     color: "#7A53F2", dot: "#7A53F2", bgVar: "var(--violet-soft)"  },
  interview:  { label: "Interview",   color: "#5B2FBF", dot: "#5B2FBF", bgVar: "var(--violet-soft)"  },
  offer:      { label: "Offer",       color: "#1E9E5A", dot: "#1E9E5A", bgVar: "var(--green-soft)"   },
  rejected:   { label: "Rejected",    color: "#D8443F", dot: "#D8443F", bgVar: "var(--red-soft)"     },
};

// Design's rejection-stage labels → enum values
const STAGE_OPTIONS: [string, string][] = [
  ["screening",     "No response"],
  ["phone",         "After screen"],
  ["onsite",        "After interview"],
  ["offer-declined","After offer"],
];

// Deterministic confetti pieces (no Math.random in render path)
const CONFETTI_COLORS = ["#2F62F0", "#7A53F2", "#1E9E5A", "#D9A13B", "#5B2FBF", "#E0726E"];
const CONFETTI = Array.from({ length: 36 }, (_, i) => {
  const left  = i * 97 % 100;
  const delay = (i % 12) * 0.07;
  const dur   = 2 + (i % 5) * 0.3;
  const size  = 7 + (i % 4) * 2;
  const sq    = i % 3 === 0;
  const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
  return { left, delay, dur, size, sq, color };
});

export default function Tracker(): JSX.Element {
  const jobs     = useData<Job[]>("/api/jobs?status=all");
  const timeline = useData<TimelineMonth[]>("/api/timeline");

  // DnD state
  const [dragId,      setDragId]      = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  // Rejection modal state
  const [rejectJobId,  setRejectJobId]  = useState<string | null>(null);
  const [rejStage,     setRejStage]     = useState<string>("screening");
  const [rejReason,    setRejReason]    = useState<string>("");

  // Offer celebration state
  const [celebrate,       setCelebrate]       = useState(false);
  const [celebrateTitle,  setCelebrateTitle]  = useState("");
  const celebrateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Note inputs
  const [notes, setNotes] = useState<Record<string, string>>({});

  // busy
  const [busy, setBusy] = useState(false);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const applyStatus = async (
    jobId: string,
    status: string,
    rejection?: { stage?: string; reason?: string },
  ): Promise<void> => {
    setBusy(true);
    try {
      await post(`/api/jobs/${jobId}/app-status`, {
        status,
        rejectionStage:  rejection?.stage  || undefined,
        rejectionReason: rejection?.reason || undefined,
      });
      jobs.reload();
    } finally {
      setBusy(false);
    }
  };

  const triggerCelebration = (title: string): void => {
    setCelebrate(true);
    setCelebrateTitle(title);
    if (celebrateTimer.current) clearTimeout(celebrateTimer.current);
    celebrateTimer.current = setTimeout(() => setCelebrate(false), 3400);
  };

  useEffect(() => () => {
    if (celebrateTimer.current) clearTimeout(celebrateTimer.current);
  }, []);

  // ── DnD handlers ─────────────────────────────────────────────────────────
  const handleDragStart = (jobId: string) => (): void => {
    setDragId(jobId);
  };
  const handleDragEnd = (): void => {
    // drag finished (dropped or cancelled) — clear both transient drag states
    setDragOverCol(null);
    setDragId(null);
  };
  const handleDragOver = (col: string) => (e: React.DragEvent): void => {
    e.preventDefault();
    setDragOverCol(col);
  };
  const handleDrop = (col: string) => (e: React.DragEvent): void => {
    e.preventDefault();
    setDragOverCol(null);
    if (!dragId) return;
    const job = jobs.data?.find(j => j.id === dragId);
    if (!job) { setDragId(null); return; }
    const currentStatus = job.fm["app-status"];
    if (currentStatus === col) { setDragId(null); return; }

    const droppedId = dragId;
    setDragId(null);

    if (col === "rejected") {
      setRejectJobId(droppedId);
      setRejStage("screening");
      setRejReason("");
    } else if (col === "offer") {
      void applyStatus(droppedId, "offer");
      triggerCelebration(job.fm.title);
    } else {
      void applyStatus(droppedId, col);
    }
  };

  const confirmReject = async (): Promise<void> => {
    if (!rejectJobId) return;
    await applyStatus(rejectJobId, "rejected", { stage: rejStage, reason: rejReason });
    setRejectJobId(null);
  };

  const sendNote = async (jobId: string): Promise<void> => {
    const text = (notes[jobId] ?? "").trim();
    if (!text) return;
    await post(`/api/jobs/${jobId}/note`, { text });
    setNotes(prev => ({ ...prev, [jobId]: "" }));
    jobs.reload();
  };

  // ── Data derivation ───────────────────────────────────────────────────────
  const allJobs    = jobs.data ?? [];
  const appJobs    = allJobs.filter(j => j.fm["app-status"] !== "none");
  const rejected   = allJobs.filter(j => j.fm["app-status"] === "rejected");

  // Postmortem: count by stage
  const byStage: Record<string, number> = {};
  for (const j of rejected) {
    const s = j.fm["rejection-stage"] ?? "unknown";
    byStage[s] = (byStage[s] ?? 0) + 1;
  }
  const postmortem = Object.entries(byStage).map(([stage, n]) => ({
    stage,
    pct: Math.round((n / rejected.length) * 100),
    n,
  }));

  // Pending rejection job (for modal title)
  const rejectJob = rejectJobId ? allJobs.find(j => j.id === rejectJobId) : null;

  // ── Render ────────────────────────────────────────────────────────────────
  if (jobs.loading) return <p className="muted" style={{ padding: "40px" }}>Loading…</p>;
  if (jobs.error || !jobs.data) return <p style={{ padding: "40px" }}>Failed to load jobs: {jobs.error}</p>;

  return (
    <div style={{ animation: "ccfade .4s ease both" }}>

      {/* Header */}
      <div style={{ marginBottom: 20, animation: "ccrise .5s ease both" }}>
        <h3 style={{
          fontFamily: "'Newsreader', serif", fontWeight: 500, fontSize: 32,
          margin: "0 0 6px", letterSpacing: "-0.01em",
        }}>
          Tracker
        </h3>
        <div style={{
          fontSize: 14, color: "var(--muted3)",
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {appJobs.length} application{appJobs.length !== 1 ? "s" : ""} · drag a card between columns to update its status
          {busy && <span style={{ marginLeft: 12, color: "var(--accent)" }}>saving…</span>}
        </div>
      </div>

      {/* Board */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: 14,
        alignItems: "start",
        marginBottom: 26,
      }}>
        {APP_STATUSES.map(col => {
          const meta  = COL_META[col];
          const cards = appJobs.filter(j => j.fm["app-status"] === col);
          const over  = dragOverCol === col;
          return (
            <div
              key={col}
              data-testid={`col-${col}`}
              onDragOver={handleDragOver(col)}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={handleDrop(col)}
              style={{
                background: over ? meta.bgVar : "var(--line6)",
                border: `1.5px ${over ? "dashed" : "solid"} ${over ? meta.color : "var(--line)"}`,
                borderRadius: 14,
                padding: "14px 12px",
                minHeight: 120,
                transition: "background 120ms, border-color 120ms",
              }}
            >
              {/* Column header */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, padding: "2px 4px" }}>
                <span style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: meta.dot, flexShrink: 0,
                }} />
                <h3 style={{
                  fontWeight: 600, fontSize: 13.5, margin: 0,
                  color: "var(--ink)",
                }}>
                  {meta.label}
                </h3>
                <span style={{
                  marginLeft: "auto",
                  background: "var(--track)", color: "var(--muted3)",
                  borderRadius: 999, padding: "1px 7px",
                  fontSize: 11.5, fontWeight: 700,
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {cards.length}
                </span>
              </div>

              {/* Cards */}
              {cards.map(j => {
                const isRejected = col === "rejected";
                const isDragging = dragId === j.id;
                return (
                  <div
                    key={j.id}
                    data-testid={`card-${j.id}`}
                    draggable
                    onDragStart={handleDragStart(j.id)}
                    onDragEnd={handleDragEnd}
                    style={{
                      background: "var(--card)",
                      border: "1px solid var(--line3)",
                      borderLeft: `3px solid ${meta.color}`,
                      borderRadius: 12,
                      padding: "12px 13px",
                      marginBottom: 10,
                      cursor: "grab",
                      opacity: isDragging ? 0.35 : 1,
                      transition: "opacity 120ms, box-shadow 120ms",
                      boxShadow: "0 1px 2px rgba(28,26,23,.04), 0 4px 16px -8px rgba(28,26,23,.18)",
                    }}
                  >
                    {/* Title + fit */}
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                      <span style={{ fontWeight: 600, fontSize: 13.5, lineHeight: 1.3, color: "var(--ink)" }}>
                        {j.fm.title}
                      </span>
                      <span style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontWeight: 700, fontSize: 13, flexShrink: 0,
                        color: "var(--accent)",
                      }}>
                        {j.fit.score}
                      </span>
                    </div>

                    {/* Meta line */}
                    <div style={{ fontSize: 12, color: "var(--muted3)", margin: "3px 0 9px" }}>
                      {j.fm.company}{j.fm.salary ? ` · ${j.fm.salary}` : ""}
                    </div>

                    {/* Quick note (non-rejected only) */}
                    {!isRejected && (
                      <div style={{ display: "flex", gap: 5 }}>
                        <input
                          aria-label={`note-${j.id}`}
                          placeholder="Add a note…"
                          value={notes[j.id] ?? ""}
                          onChange={e => setNotes(prev => ({ ...prev, [j.id]: e.target.value }))}
                          onKeyDown={e => { if (e.key === "Enter") void sendNote(j.id); }}
                          style={{
                            flex: 1,
                            background: "var(--bg)", border: "1px solid var(--line)",
                            borderRadius: 8, padding: "5px 9px",
                            fontSize: 12, fontFamily: "inherit", color: "var(--ink3)",
                            outline: "none",
                          }}
                        />
                        <button
                          aria-label={`addnote-${j.id}`}
                          onClick={() => void sendNote(j.id)}
                          style={{
                            background: "var(--track)", border: "1px solid var(--line2)",
                            borderRadius: 8, padding: "5px 9px",
                            fontSize: 13, fontWeight: 600, cursor: "pointer",
                            color: "var(--muted)",
                          }}
                        >
                          +
                        </button>
                      </div>
                    )}

                    {/* Rejected: stage chip + reason */}
                    {isRejected && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {j.fm["rejection-stage"] && (
                          <span style={{
                            alignSelf: "flex-start",
                            display: "inline-flex", alignItems: "center",
                            background: "var(--red-soft)", color: "var(--red-fg)",
                            borderRadius: 999, padding: "3px 9px",
                            fontSize: 11, fontWeight: 600,
                          }}>
                            {j.fm["rejection-stage"]}
                          </span>
                        )}
                        {j.fm["rejection-reason"] && (
                          <span style={{ fontSize: 11.5, color: "var(--muted3)", fontStyle: "italic", lineHeight: 1.4 }}>
                            "{j.fm["rejection-reason"]}"
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Empty drop zone */}
              {cards.length === 0 && (
                <div style={{
                  textAlign: "center", color: "var(--muted3)", fontSize: 12,
                  padding: "20px 0",
                  border: "1.5px dashed var(--line2)", borderRadius: 10,
                  marginTop: 4,
                }}>
                  Drop here
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Analytics */}
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16 }}>

        {/* Pipeline over time */}
        <div style={{
          background: "var(--card)", border: "1px solid var(--line)",
          borderRadius: 16, padding: 22,
          boxShadow: "0 1px 2px rgba(28,26,23,.04), 0 18px 44px -38px rgba(28,26,23,.4)",
          animation: "ccrise .5s ease both",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>Pipeline over time</span>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              {[
                { label: "Interested", color: "#2F62F0" },
                { label: "Applied",    color: "#7A53F2" },
                { label: "Interview",  color: "#5B2FBF" },
                { label: "Offer",      color: "#1E9E5A" },
                { label: "Rejected",   color: "#D8A6A4" },
              ].map(({ label, color }) => (
                <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--muted2)" }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: color, flexShrink: 0 }} />
                  {label}
                </span>
              ))}
            </div>
          </div>
          {(timeline.data?.length ?? 0) > 0 ? (
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={timeline.data!} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fill: "var(--muted3)" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted3)" }} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)", border: "1px solid var(--line)",
                    borderRadius: 10, fontSize: 12,
                  }}
                />
                <Bar dataKey="interested" stackId="a" fill="#2F62F0" isAnimationActive={false} />
                <Bar dataKey="applied"    stackId="a" fill="#7A53F2" isAnimationActive={false} />
                <Bar dataKey="interview"  stackId="a" fill="#5B2FBF" isAnimationActive={false} />
                <Bar dataKey="offer"      stackId="a" fill="#1E9E5A" isAnimationActive={false} />
                <Bar dataKey="rejected"   stackId="a" fill="#D8A6A4" isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="muted" style={{ fontSize: 13 }}>No pipeline events yet.</p>
          )}
        </div>

        {/* Where applications end (postmortem) */}
        <div style={{
          background: "var(--card)", border: "1px solid var(--line)",
          borderRadius: 16, padding: 22,
          boxShadow: "0 1px 2px rgba(28,26,23,.04), 0 18px 44px -38px rgba(28,26,23,.4)",
          animation: "ccrise .5s ease both", animationDelay: ".1s",
        }}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Where applications end</div>
          <div style={{ fontSize: 12.5, color: "var(--muted3)", marginBottom: 18 }}>
            Postmortem · updates as you log rejections
          </div>
          {rejected.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--muted3)" }}>No rejections recorded.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
              {postmortem.map(({ stage, pct }) => (
                <div key={stage}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
                    <span>{stage}: {pct}%</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--muted)" }}>
                      {pct}%
                    </span>
                  </div>
                  <div style={{ height: 8, background: "var(--line5)", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{
                      width: `${pct}%`, height: "100%",
                      background: "var(--red-fg)", borderRadius: 99,
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Rejection Modal */}
      <Modal open={rejectJobId !== null} onClose={() => setRejectJobId(null)}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--red-fg)", marginBottom: 10 }}>
          Log a rejection
        </div>
        <h4 style={{ fontFamily: "'Newsreader', serif", fontWeight: 600, fontSize: 24, margin: "0 0 3px", letterSpacing: "-0.01em" }}>
          {rejectJob?.fm.title ?? ""}
        </h4>
        <div style={{ fontSize: 13.5, color: "var(--muted3)", marginBottom: 22 }}>
          {rejectJob?.fm.company ?? ""}
        </div>

        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink3)", marginBottom: 10 }}>
          Where did it end?
        </div>
        <Segmented<string>
          options={STAGE_OPTIONS}
          value={rejStage}
          onChange={setRejStage}
        />

        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink3)", margin: "22px 0 10px" }}>
          What happened?{" "}
          <span style={{ fontWeight: 400, color: "var(--muted3)" }}>(optional)</span>
        </div>
        <textarea
          aria-label="rejection-reason"
          placeholder="e.g. Wanted more ROS2 shipping experience"
          value={rejReason}
          onChange={e => setRejReason(e.target.value)}
          rows={3}
          style={{
            width: "100%", background: "var(--card)",
            border: "1px solid var(--line2)", borderRadius: 10,
            padding: "11px 13px", fontSize: 14, fontFamily: "inherit",
            color: "var(--ink3)", resize: "vertical", outline: "none",
            marginBottom: 24,
          }}
        />

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={() => setRejectJobId(null)}
            style={{
              cursor: "pointer", background: "var(--card)", color: "var(--ink3)",
              fontWeight: 600, fontSize: 14, padding: "10px 18px",
              borderRadius: 11, fontFamily: "inherit", border: "1px solid var(--line2)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => void confirmReject()}
            style={{
              border: "none", cursor: "pointer", background: "var(--red-fg)",
              color: "#fff", fontWeight: 600, fontSize: 14, padding: "10px 18px",
              borderRadius: 11, fontFamily: "inherit",
              boxShadow: "0 6px 16px -6px rgba(181,50,46,.6)",
            }}
          >
            Mark as rejected
          </button>
        </div>
      </Modal>

      {/* Offer celebration */}
      {celebrate && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 60,
          pointerEvents: "none", overflow: "hidden",
        }}>
          {/* Confetti */}
          {CONFETTI.map((c, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                top: "-8vh",
                left: `${c.left}%`,
                width: c.size,
                height: c.sq ? c.size : Math.round(c.size * 0.5),
                background: c.color,
                borderRadius: c.sq ? 2 : 99,
                animation: `ccconfetti ${c.dur}s linear ${c.delay}s forwards`,
              }}
            />
          ))}

          {/* Centered card */}
          <div style={{
            position: "absolute",
            left: "50%", top: "42%",
            transform: "translate(-50%, -50%)",
            background: "var(--card)", border: "1px solid var(--line)",
            borderRadius: 20, padding: "28px 36px",
            textAlign: "center",
            boxShadow: "0 40px 90px -28px rgba(20,18,15,.5)",
            animation: "ccpop .5s cubic-bezier(.2,1.3,.4,1) both",
            pointerEvents: "auto",
          }}>
            <div style={{ fontSize: 42, lineHeight: 1, marginBottom: 10 }}>🎉</div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11, letterSpacing: ".14em",
              textTransform: "uppercase", color: "var(--green-fg)",
              marginBottom: 8,
            }}>
              Offer logged
            </div>
            <h4 style={{
              fontFamily: "'Newsreader', serif", fontWeight: 600, fontSize: 26,
              margin: "0 0 6px", letterSpacing: "-0.01em",
            }}>
              {celebrateTitle}
            </h4>
            <div style={{ fontSize: 14, color: "var(--muted2)", maxWidth: "30ch" }}>
              Congratulations — that's a real milestone. Take a moment.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
