import { useState } from "react";
import { initials, monoColor } from "../lib/companyUtils.js";

interface Props { name: string; logo?: string | null; size?: number; radius?: number; fontSize?: number }

/** A company's stored logo, falling back to the two-letter initials monogram. */
export function LogoOrMonogram({ name, logo, size = 36, radius = 9, fontSize = 13 }: Props): JSX.Element {
  const [failed, setFailed] = useState(false);
  if (logo && !failed) {
    return (
      <img
        src={"/" + logo}
        alt={name}
        width={size}
        height={size}
        onError={() => setFailed(true)}
        style={{ width: size, height: size, borderRadius: radius, objectFit: "contain", background: "#fff", flexShrink: 0, border: "1px solid var(--line5, rgba(0,0,0,.06))" }}
      />
    );
  }
  const mc = monoColor(name);
  return (
    <div style={{
      width: size, height: size, borderRadius: radius, background: mc.bg, color: mc.fg,
      fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize,
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, letterSpacing: ".04em",
    }}>
      {initials(name)}
    </div>
  );
}
