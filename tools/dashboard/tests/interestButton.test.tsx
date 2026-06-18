// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderAt, mockFetch } from "./helpers.js";
import { InterestButton } from "../src/components/InterestButton.js";

describe("InterestButton", () => {
  it("toggles to interested optimistically and POSTs", async () => {
    const fn = mockFetch({ "POST /api/jobs/acme-1/app-status": { ok: true } });
    const onChanged = vi.fn();
    renderAt(<InterestButton id="acme-1" status="none" onChanged={onChanged} />);
    const btn = screen.getByRole("button", { name: /shortlist/i });
    fireEvent.click(btn);
    expect(screen.getByRole("button", { name: /remove from shortlist/i })).toBeTruthy(); // optimistic
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(fn).toHaveBeenCalledWith("/api/jobs/acme-1/app-status",
      expect.objectContaining({ method: "POST" }));
  });
  it("shows a locked label for roles already deeper in the funnel", () => {
    renderAt(<InterestButton id="x" status="applied" />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("applied")).toBeTruthy();
  });
  it("reverts the optimistic state when the POST fails", async () => {
    mockFetch({});   // no route registered → POST resolves not-ok → post() throws
    renderAt(<InterestButton id="acme-1" status="none" />);
    fireEvent.click(screen.getByRole("button", { name: /add to shortlist/i }));
    expect(screen.getByRole("button", { name: /remove from shortlist/i })).toBeTruthy(); // optimistic
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /add to shortlist/i })).toBeTruthy()); // reverted
  });
});
