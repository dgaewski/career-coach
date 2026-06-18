import React from "react";
import { render, cleanup, type RenderResult } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, afterEach } from "vitest";

// RTL's auto-cleanup relies on a global `afterEach`, which vitest doesn't
// inject unless globals:true is set. Register it explicitly here so every
// test file that imports helpers gets DOM cleanup between tests.
afterEach(() => { cleanup(); });

// jsdom lacks ResizeObserver, which Recharts' ResponsiveContainer needs.
// Polyfill it so charts can use ResponsiveContainer in production.
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

/** Stub fetch with a path→payload map (query strings ignored) and disable SSE. */
export function mockFetch(routes: Record<string, unknown>): ReturnType<typeof vi.fn> {
  vi.stubGlobal("EventSource", undefined);   // lib/live.ts guards on typeof EventSource
  const fn = vi.fn(async (url: unknown, init?: { method?: string }) => {
    const pathOnly = String(url).split("?")[0];
    const key = `${init?.method ?? "GET"} ${pathOnly}`;
    const hit = routes[key] ?? routes[pathOnly];
    if (hit === undefined) return { ok: false, status: 404, json: async () => ({ error: `no mock for ${key}` }) };
    return { ok: true, status: 200, json: async () => hit };
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

export function renderAt(ui: React.ReactElement, path = "/"): RenderResult {
  return render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>);
}
