// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import type { ReactNode } from "react";
import { screen, waitFor } from "@testing-library/react";
import { renderAt, mockFetch } from "./helpers.js";
import { MAPDATA, JOBS } from "./fixtures.js";

// Mock react-leaflet so jsdom doesn't crash on canvas/SVG internals.
// Mirror exactly the existing mock pattern: thin wrappers that render children.
vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children?: unknown }) => <div data-testid="map">{children as never}</div>,
  TileLayer: ({ url }: { url?: string }) => <div data-testid="tile" data-url={url ?? ""} />,
  Marker: ({ children }: { children?: unknown }) => <div data-testid="marker">{children as never}</div>,
  Tooltip: ({ children }: { children?: unknown }) => <div data-testid="tooltip">{children as never}</div>,
  Popup: ({ children }: { children?: unknown }) => <div data-testid="popup">{children as never}</div>,
  useMap: () => ({ fitBounds: vi.fn(), on: vi.fn(), off: vi.fn() }),
}));
vi.mock("leaflet/dist/leaflet.css", () => ({}));
// react-leaflet-cluster doesn't render in jsdom; passthrough so children still render.
vi.mock("react-leaflet-cluster", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
// Silence leaflet.markercluster CSS imports
vi.mock("leaflet.markercluster/dist/MarkerCluster.css", () => ({}));
vi.mock("leaflet.markercluster/dist/MarkerCluster.Default.css", () => ({}));

const { default: MapView } = await import("../src/views/MapView.js");

describe("MapView", () => {
  it("renders the map container without throwing", async () => {
    mockFetch({ "/api/map": MAPDATA, "/api/jobs": JOBS });
    renderAt(<MapView />);
    expect(await screen.findByTestId("map")).toBeTruthy();
  });

  it("renders remote chip and outside-NE chip with correct counts", async () => {
    mockFetch({ "/api/map": MAPDATA, "/api/jobs": JOBS });
    renderAt(<MapView />);
    // remoteCount = 1 → "🏠 1 remote roles"
    expect(await screen.findByText(/1 remote/)).toBeTruthy();
    // otherCount = 0 → "0 elsewhere"
    expect(screen.getByText(/elsewhere/)).toBeTruthy();
  });

  it("renders one marker for the one place in MAPDATA", async () => {
    mockFetch({ "/api/map": MAPDATA, "/api/jobs": JOBS });
    renderAt(<MapView />);
    await screen.findByTestId("map");
    expect(screen.getAllByTestId("marker").length).toBe(1);
  });

  it("renders tooltip with place name and count", async () => {
    mockFetch({ "/api/map": MAPDATA, "/api/jobs": JOBS });
    renderAt(<MapView />);
    await screen.findByTestId("map");
    // Tooltip should say "Boston, MA · 1 roles"
    expect(screen.getByTestId("tooltip").textContent).toMatch(/Boston, MA/);
  });

  it("renders popup with job link and company meta", async () => {
    mockFetch({ "/api/map": MAPDATA, "/api/jobs": JOBS });
    renderAt(<MapView />);
    await screen.findByTestId("map");
    // Popup lists the job name as a link; "Acme — Robot Dev" resolves to JOB_A
    expect(screen.getByText("Acme — Robot Dev")).toBeTruthy();
    // Company meta line in popup should contain "Acme" (the company name)
    const popup = screen.getByTestId("popup");
    expect(popup.textContent).toMatch(/Acme/);
  });

  it("filters places through the shared job filters (track=ee-hardware hides Boston robotics place)", async () => {
    mockFetch({ "/api/map": MAPDATA, "/api/jobs": JOBS });
    // Acme — Robot Dev is track=robotics; filtering to ee-hardware empties Boston
    renderAt(<MapView />, "/?track=ee-hardware");
    expect(await screen.findByTestId("map")).toBeTruthy();
    expect(screen.queryAllByTestId("marker").length).toBe(0);
  });

  it("legend is rendered with cluster and major-hub descriptions", async () => {
    mockFetch({ "/api/map": MAPDATA, "/api/jobs": JOBS });
    renderAt(<MapView />);
    await screen.findByTestId("map");
    expect(screen.getByText(/Cluster of roles/)).toBeTruthy();
    expect(screen.getByText(/Major hub/)).toBeTruthy();
  });

  it("FilterBar track options come from the user's tracks, not the hardcoded enum", async () => {
    const summaryWithUser = {
      generatedAt: "2026-06-14T00:00:00Z", activeJobs: 1, totalJobs: 1, staleFlipped: [],
      warnings: [], pipeline: { applied: 0, rejected: 0 }, latestBrief: "",
      user: { name: "Alex", tracks: ["robotics"], geoZones: [] },
    };
    mockFetch({ "/api/map": MAPDATA, "/api/jobs": JOBS, "/api/summary": summaryWithUser });
    renderAt(<MapView />);
    await screen.findByTestId("map");
    // FilterBar fetches /api/summary independently; wait until its options reflect the user's tracks
    await waitFor(() => {
      const trackSelect = screen.getByLabelText("track");
      const opts = Array.from(trackSelect.querySelectorAll("option")).map(o => o.textContent);
      expect(opts).toContain("Robotics");
      expect(opts).not.toContain("Software");
    });
  });
});
