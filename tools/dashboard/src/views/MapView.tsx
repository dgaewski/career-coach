import { useMemo, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Tooltip, Popup, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import type { LatLngBoundsExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { useData } from "../hooks/useData.js";
import { useHtmlTheme } from "../hooks/useHtmlTheme.js";
import type { Job, MapData } from "../lib/types.js";
import FilterBar from "../components/FilterBar.js";

// ── Literal hex values for markers (Leaflet canvas can't read CSS vars) ──
const ACCENT_LIGHT  = "#2F62F0";
const ACCENT_DARK   = "#7AA0FF";
const VIOLET_LIGHT  = "#7A53F2";
const VIOLET_DARK   = "#AE92FF";

// CARTO tile URLs
const TILE_LIGHT = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const TILE_DARK  = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const ATTRIBUTION = "© OpenStreetMap contributors © CARTO";

/** Build a sized, colored divIcon that mimics the old CircleMarker radius look */
function placeIcon(count: number, fill: string): L.DivIcon {
  // Diameter derived from the same formula as the old radius: r = 9 + sqrt(count) * 2.6
  const r = 9 + Math.sqrt(count) * 2.6;
  const d = Math.round(r * 2);
  return L.divIcon({
    className: "cc-mapdot",
    html: `<div style="width:${d}px;height:${d}px;border-radius:50%;background:${fill};border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.15);"></div>`,
    iconSize: [d, d],
    iconAnchor: [d / 2, d / 2],
  });
}

/** Fit map bounds to all visible markers */
function BoundsFitter({ bounds }: { bounds: [number, number][] }): null {
  const map = useMap();
  useEffect(() => {
    if (bounds.length === 0) return;
    const lb: LatLngBoundsExpression = bounds as [number, number][];
    try { map.fitBounds(lb, { padding: [32, 32] }); } catch { /* ignore jsdom */ }
  }, [map, bounds]);
  return null;
}

export default function MapView(): JSX.Element {
  const mapData  = useData<MapData>("/api/map");
  const jobsData = useData<Job[]>("/api/jobs?status=all");
  const [params] = useSearchParams();
  const theme    = useHtmlTheme();

  // Name → Job lookup for popup links
  const byName = useMemo(
    () => new Map((jobsData.data ?? []).map(j => [j.name, j])),
    [jobsData.data],
  );

  // Shared filters: keep only jobs matching active pills, then filter places
  const visible = useMemo(() => {
    const track     = params.get("track");
    const level     = params.get("level");
    const freshness = params.get("freshness");

    const kept = new Set(
      (jobsData.data ?? [])
        .filter(j => !track     || j.fm.track.includes(track))
        .filter(j => !level     || j.fm.level === level)
        .filter(j => !freshness || j.freshness === freshness)
        .map(j => j.name),
    );

    return (mapData.data?.places ?? [])
      .map(p => ({ ...p, jobs: p.jobs.filter(n => kept.has(n)), count: p.jobs.filter(n => kept.has(n)).length }))
      .filter(p => p.count > 0);
  }, [mapData.data, jobsData.data, params]);

  if (mapData.loading || jobsData.loading) return <p className="muted">Loading…</p>;
  if (mapData.error || !mapData.data) return <p>Failed to load map data: {mapData.error}</p>;

  const { remoteCount, otherCount } = mapData.data;
  const tileUrl     = theme === "dark" ? TILE_DARK : TILE_LIGHT;
  const accentColor = theme === "dark" ? ACCENT_DARK : ACCENT_LIGHT;
  const violetColor = theme === "dark" ? VIOLET_DARK : VIOLET_LIGHT;
  const bounds      = visible.map(p => [p.lat, p.lng] as [number, number]);

  return (
    <div style={{ animation: "ccfade .4s ease both" }}>
      {/* ── Header row ── */}
      <div style={{
        display: "flex", alignItems: "flex-end", justifyContent: "space-between",
        gap: 20, flexWrap: "wrap", marginBottom: 18, animation: "ccrise .5s ease both",
      }}>
        <div>
          <h3 style={{
            fontFamily: "'Newsreader', serif", fontWeight: 500, fontSize: 32,
            margin: "0 0 6px", letterSpacing: "-0.01em", color: "var(--ink)",
          }}>Map</h3>
          <div style={{
            fontSize: 14, color: "var(--muted3)",
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            Where the roles are · marker size scales with openings
          </div>
        </div>

        {/* Remote + outside-NE chips */}
        <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "var(--blue-soft)", color: "var(--accent)",
            borderRadius: 999, padding: "6px 12px", fontSize: 12.5, fontWeight: 600,
          }}>
            🏠 {remoteCount} remote roles
          </span>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "var(--track)", color: "var(--muted)",
            borderRadius: 999, padding: "6px 12px", fontSize: 12.5, fontWeight: 600,
          }}>
            {otherCount} elsewhere
          </span>
        </div>
      </div>

      {/* ── Filter pills ── */}
      <div style={{ marginBottom: 16, animation: "ccrise .5s ease both", animationDelay: ".04s" }}>
        <FilterBar fields={["track", "level", "freshness"]} />
      </div>

      {/* ── Map container ── */}
      <div style={{
        height: 540, width: "100%", borderRadius: 16,
        border: "1px solid var(--line)", overflow: "hidden",
        background: "var(--bg2)",
        boxShadow: "0 1px 2px rgba(28,26,23,.04),0 24px 60px -44px rgba(28,26,23,.45)",
        animation: "ccrise .5s ease both", animationDelay: ".08s",
        position: "relative", zIndex: 0,
      }}>
        <MapContainer
          center={[42.5, -71.4]}
          zoom={7}
          scrollWheelZoom
          style={{ height: "100%", width: "100%" }}
        >
          {/* key={theme} forces TileLayer to re-mount on theme switch → new tiles */}
          <TileLayer key={theme} url={tileUrl} attribution={ATTRIBUTION} />

          <MarkerClusterGroup chunkedLoading>
            {visible.map(p => {
              const fill = p.count >= 12 ? violetColor : accentColor;
              return (
                <Marker
                  key={p.place}
                  position={[p.lat, p.lng]}
                  icon={placeIcon(p.count, fill)}
                >
                  <Tooltip direction="top">
                    {p.place} · {p.count} roles
                  </Tooltip>
                  <Popup maxWidth={260}>
                    <div className="cc-pop">
                      <div className="cc-pop-head">
                        {p.place}
                        <span>{p.count} roles</span>
                      </div>
                      {p.jobs.slice(0, 8).map(name => {
                        const job = byName.get(name);
                        return (
                          <div key={name} className="cc-pop-job">
                            {job
                              ? <Link to={`/jobs/${job.id}`}>{name}</Link>
                              : <span>{name}</span>
                            }
                            {job && (
                              <div className="cc-pop-meta">
                                {job.fm.company}{job.fm.address ? ` · ${job.fm.address}` : ""}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <Link className="cc-pop-more" to={`/jobs?place=${encodeURIComponent(p.place)}`}>
                        See all {p.count} in {p.place} →
                      </Link>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MarkerClusterGroup>

          <BoundsFitter bounds={bounds} />
        </MapContainer>
      </div>

      {/* ── Legend ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 22, flexWrap: "wrap",
        marginTop: 14, fontSize: 12.5, color: "var(--muted2)",
      }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
          <span style={{
            width: 12, height: 12, borderRadius: "50%",
            background: accentColor, border: "2px solid #fff",
            boxShadow: "0 0 0 1px var(--line)", display: "inline-block",
          }} />
          Cluster of roles
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
          <span style={{
            width: 18, height: 18, borderRadius: "50%",
            background: violetColor, border: "2px solid #fff",
            boxShadow: "0 0 0 1px #E3D9FB", display: "inline-block",
          }} />
          Major hub (12+)
        </span>
        <span style={{
          color: "var(--muted3)",
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          click a marker for roles &amp; addresses
        </span>
      </div>
    </div>
  );
}
