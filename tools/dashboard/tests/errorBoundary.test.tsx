// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorBoundary } from "../src/components/ErrorBoundary.js";

function Boom(): JSX.Element { throw new Error("boom"); }

describe("ErrorBoundary", () => {
  it("renders a fallback instead of crashing", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});   // silence React error log
    render(<ErrorBoundary><Boom /></ErrorBoundary>);
    expect(screen.getByText(/something went wrong/i)).toBeTruthy();
    spy.mockRestore();
  });
});
