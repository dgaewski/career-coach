// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import MorningBrief from "../src/views/MorningBrief.js";
import { renderAt, mockFetch } from "./helpers.js";
import { BRIEF } from "./fixtures.js";

describe("MorningBrief", () => {
  it("renders the masthead title, lead headline, three roles link, ledger number, and templated note", async () => {
    mockFetch({ "/api/brief": BRIEF });
    renderAt(<MorningBrief />);

    // Masthead title
    expect(await screen.findByText("The Morning Brief")).toBeTruthy();

    // Lead headline
    expect(screen.getByText("Boston's 128 belt is where you compete today")).toBeTruthy();

    // Three-roles entry links to /jobs/:id
    const roleLink = screen.getByText("Robot Dev").closest("a");
    expect(roleLink?.getAttribute("href")).toBe("/jobs/acme-robot-dev");

    // Ledger number for active roles — use a targeted query on the ledger section
    // CountUp renders the final value; find "20" inside the ledger area
    const ledgerHeading = screen.getByText("By the numbers");
    const ledgerPanel = ledgerHeading.closest("div") as HTMLElement;
    expect(ledgerPanel).toBeTruthy();
    // The value "20" should appear somewhere in the rendered output
    expect(screen.getByTestId("ledger-active").textContent).toBe("20");

    // Templated note — source === "templated"
    expect(screen.getByText(/Auto-generated from your data/i)).toBeTruthy();
  });
});
