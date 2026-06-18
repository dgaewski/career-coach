import type { LinkStatus } from "../lib/types.js";

const META: Record<LinkStatus, { label: string; bg: string; fg: string }> = {
  live:       { label: "✓ live link",      bg: "var(--green-soft)", fg: "var(--green-fg)" },
  redirected: { label: "⚠ no direct link", bg: "var(--track)",      fg: "var(--muted)"   },
  none:       { label: "⚠ no direct link", bg: "var(--track)",      fg: "var(--muted)"   },
  unverified: { label: "⚠ unverified",     bg: "var(--track)",      fg: "var(--muted)"   },
  dead:       { label: "✗ link dead",       bg: "var(--red-soft)",   fg: "var(--red-fg)"  },
};

export function LinkChip({ status }: { status: LinkStatus | undefined }): JSX.Element | null {
  if (!status) return null;
  const m = META[status];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", background: m.bg, color: m.fg,
      borderRadius: 999, padding: "3px 9px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
    }}>{m.label}</span>
  );
}
