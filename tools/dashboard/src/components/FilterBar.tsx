import { useSearchParams } from "react-router-dom";
import { LEVELS, type Summary } from "../lib/types.js";
import { useData } from "../hooks/useData.js";
import { geoOptions, trackOptions } from "../lib/vocab.js";

export interface FilterBarProps {
  fields: ("track" | "geo" | "level" | "freshness" | "skill" | "appStatus")[];
  skillOptions?: { slug: string; name: string }[];
}

const STATIC_OPTIONS: Record<string, readonly string[]> = {
  level: LEVELS, freshness: ["high", "medium", "low"],
  appStatus: ["none", "interested", "applied", "interview", "offer", "rejected"],
};

export function useFilterParams(): URLSearchParams {
  return useSearchParams()[0];
}

export default function FilterBar({ fields, skillOptions }: FilterBarProps): JSX.Element {
  const [params, setParams] = useSearchParams();
  const { data: summary } = useData<Summary>("/api/summary");
  const options: Record<string, readonly { value: string; label: string }[]> = {
    ...Object.fromEntries(Object.entries(STATIC_OPTIONS).map(([k, v]) => [k, v.map(o => ({ value: o, label: o }))])),
    track: trackOptions(summary),
    geo: geoOptions(summary),
  };
  const set = (k: string, v: string): void => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v); else next.delete(k);
    setParams(next, { replace: true });
  };
  return (
    <div className="filterbar">
      {fields.map(f =>
        f === "skill" ? (
          <select key={f} aria-label="skill" value={params.get("skill") ?? ""} onChange={e => set("skill", e.target.value)}>
            <option value="">skill: any</option>
            {(skillOptions ?? []).map(s => <option key={s.slug} value={s.slug}>{s.name}</option>)}
          </select>
        ) : (
          <select key={f} aria-label={f} value={params.get(f) ?? ""} onChange={e => set(f, e.target.value)}>
            <option value="">{f}: any</option>
            {(options[f] ?? []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ),
      )}
    </div>
  );
}
