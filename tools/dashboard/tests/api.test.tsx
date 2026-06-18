// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { api, post } from "../src/lib/api.js";
import { useData } from "../src/hooks/useData.js";
import { mockFetch, renderAt } from "./helpers.js";
import { JOBS } from "./fixtures.js";

function Probe(): JSX.Element {
  const { data, error, loading } = useData<typeof JOBS>("/api/jobs");
  if (loading) return <p>loading</p>;
  if (error) return <p>error: {error}</p>;
  return <p>got {data!.length}</p>;
}

describe("api", () => {
  it("returns parsed JSON on ok", async () => {
    mockFetch({ "/api/jobs": JOBS });
    expect((await api<typeof JOBS>("/api/jobs")).length).toBe(2);
  });
  it("normalizes route-shape and fastify-shape errors", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: unknown) =>
      String(url).includes("a")
        ? { ok: false, status: 400, json: async () => ({ error: "route says no" }) }
        : { ok: false, status: 400, json: async () => ({ statusCode: 400, code: "X", error: "Bad Request", message: "fastify says no" }) }));
    await expect(api("/a")).rejects.toThrow("route says no");
    await expect(api("/b")).rejects.toThrow("fastify says no");
  });
  it("post sends JSON", async () => {
    const fn = mockFetch({ "POST /api/jobs/x/note": { ok: true } });
    await post("/api/jobs/x/note", { text: "hi" });
    const [, init] = fn.mock.calls[0];
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body).text).toBe("hi");
  });
});

describe("useData", () => {
  it("renders data after load", async () => {
    mockFetch({ "/api/jobs": JOBS });
    renderAt(<Probe />);
    expect(await screen.findByText("got 2")).toBeTruthy();
  });
  it("surfaces errors", async () => {
    mockFetch({});
    renderAt(<Probe />);
    expect(await screen.findByText(/error:/)).toBeTruthy();
  });
});
