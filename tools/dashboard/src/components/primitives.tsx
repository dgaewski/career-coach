import { useEffect, useRef, useState } from "react";

/** Count-up animation; renders the final value immediately in non-animating envs (tests). */
export function CountUp({ value, duration = 950 }: { value: number; duration?: number }): JSX.Element {
  const [n, setN] = useState(value);
  const ref = useRef(value);
  useEffect(() => {
    if (typeof requestAnimationFrame === "undefined") { setN(value); return; }
    const from = 0, start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(from + (value - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick); else ref.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{n}</>;
}

export function GrowBar({ frac, className = "" }: { frac: number; className?: string }): JSX.Element {
  return <div className={`growbar ${className}`} style={{ transform: `scaleX(${Math.max(0, Math.min(1, frac))})`, transformOrigin: "left" }} />;
}

export function Stars({ score }: { score: number }): JSX.Element {
  const filled = Math.round((score / 100) * 5);
  return (
    <span className="stars">
      {[0, 1, 2, 3, 4].map(i => <span key={i} data-star data-filled={i < filled} style={{ color: i < filled ? "var(--accent)" : "var(--star-empty)" }}>★</span>)}
    </span>
  );
}

type Tone = "green" | "red" | "amber" | "blue" | "violet" | "neutral";
export function Chip({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }): JSX.Element {
  return <span className={`chip chip-${tone}`}>{children}</span>;
}

export function Segmented<T extends string>(
  { options, value, onChange }: { options: [T, string][]; value: T; onChange: (v: T) => void },
): JSX.Element {
  return (
    <div className="segmented" role="tablist">
      {options.map(([val, label]) => (
        <button key={val} role="tab" aria-selected={val === value}
          className={val === value ? "seg active" : "seg"} onClick={() => onChange(val)}>{label}</button>
      ))}
    </div>
  );
}

export function Sparkline({ points, width = 220, height = 56, area = true }: { points: number[]; width?: number; height?: number; area?: boolean }): JSX.Element {
  if (points.length < 2) return <div className="muted spark-empty">building history</div>;
  const max = Math.max(...points), min = Math.min(...points), span = max - min || 1;
  const x = (i: number) => (i / (points.length - 1)) * width;
  const y = (v: number) => height - ((v - min) / span) * (height - 6) - 3;
  const line = points.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="spark" width={width} height={height}>
      {area && <path d={`${line} L${width} ${height} L0 ${height} Z`} fill="var(--accent)" opacity="0.10" />}
      <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2" className="spark-draw" />
    </svg>
  );
}

export function Donut({ segments, label }: { segments: { value: number; color: string }[]; label: string }): JSX.Element {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  let acc = 0;
  const stops = segments.map(s => { const from = (acc / total) * 100; acc += s.value; const to = (acc / total) * 100; return `${s.color} ${from}% ${to}%`; }).join(", ");
  return (
    <div className="donut" style={{ background: `conic-gradient(${stops})` }}>
      <div className="donut-hole"><span>{label}</span></div>
    </div>
  );
}

export function WordCloud({ items, selected, onPick }: { items: { key: string; label: string; weight: number; color: string; mark?: React.ReactNode }[]; selected?: string; onPick?: (k: string) => void }): JSX.Element {
  return (
    <div className="cloud">
      {items.map(it => (
        <button key={it.key} className={it.key === selected ? "cloud-term selected" : "cloud-term"}
          style={{ fontSize: `${16 + it.weight * 26}px`, color: it.color }} onClick={() => onPick?.(it.key)}>
          {it.label}{it.mark}
        </button>
      ))}
    </div>
  );
}

export function RangeSlider({ value, onChange, min = 0, max = 100 }: { value: number; onChange: (v: number) => void; min?: number; max?: number }): JSX.Element {
  return <input type="range" className="range" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))} />;
}

export function Toast({ children, onDone }: { children: React.ReactNode; onDone?: () => void }): JSX.Element {
  useEffect(() => { const t = setTimeout(() => onDone?.(), 2800); return () => clearTimeout(t); }, [onDone]);
  return <div className="toast" role="status"><span className="live-dot" />{children}<span className="toast-sheen" /></div>;
}

export function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }): JSX.Element | null {
  if (!open) return null;
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>{children}</div>
    </div>
  );
}
