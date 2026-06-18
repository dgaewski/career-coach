import { useState, useEffect } from "react";
import { setAppStatus } from "../lib/mutations.js";

export function InterestButton({ id, status, onChanged, size = "md" }: {
  id: string; status: string; onChanged?: () => void; size?: "sm" | "md";
}): JSX.Element {
  const [optimistic, setOptimistic] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Once server truth (the reloaded `status` prop) arrives, drop the optimistic override so a later
  // external status change can't be masked by a stale local value.
  useEffect(() => { setOptimistic(null); }, [status]);
  const effective = optimistic ?? status;
  const interested = effective === "interested";
  const inFunnel = effective !== "none" && effective !== "";   // "" is treated the same as "none"

  // Roles already past "interested" (applied/interview/…): show status, don't let the shortlist toggle clobber it.
  if (inFunnel && !interested) {
    return (
      <span style={{
        fontSize: 12, fontWeight: 600, color: "var(--muted)",
        textTransform: "capitalize",
      }}>{effective}</span>
    );
  }

  const toggle = async (e: React.MouseEvent): Promise<void> => {
    e.preventDefault(); e.stopPropagation();   // don't trigger an enclosing card link
    if (busy) return;
    const next = interested ? "none" : "interested";
    setOptimistic(next); setBusy(true);
    try { await setAppStatus(id, next); onChanged?.(); }
    catch { setOptimistic(null); }             // revert on failure
    finally { setBusy(false); }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={interested}
      aria-label={interested ? "Remove from shortlist" : "Add to shortlist"}
      style={{
        cursor: busy ? "default" : "pointer",
        transition: "background 120ms, border-color 120ms, color 120ms",
        border: `1px solid ${interested ? "var(--accent)" : "var(--line2)"}`,
        background: interested ? "var(--blue-soft)" : "var(--card)",
        color: interested ? "var(--accent)" : "var(--muted)",
        borderRadius: 999,
        padding: size === "sm" ? "3px 10px" : "6px 13px",
        fontSize: size === "sm" ? 11.5 : 13,
        fontWeight: 600,
        fontFamily: "inherit",
        whiteSpace: "nowrap",
      }}
    >
      {interested ? "★ Interested" : "☆ Shortlist"}
    </button>
  );
}
