// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTheme } from "../src/hooks/useTheme.js";

beforeEach(() => { localStorage.clear(); document.documentElement.removeAttribute("data-theme"); });

describe("useTheme", () => {
  it("defaults to light and toggles to dark, persisting + setting data-theme", () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("light");
    act(() => result.current.toggle());
    expect(result.current.theme).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem("cc-theme")).toBe("dark");
  });
});
