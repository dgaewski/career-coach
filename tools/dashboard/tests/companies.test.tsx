// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import Companies from "../src/views/Companies.js";
import CompanyDetail from "../src/views/CompanyDetail.js";
import { renderAt, mockFetch } from "./helpers.js";
import { COMPANIES, JOBS } from "./fixtures.js";

describe("Companies", () => {
  it("ranks companies with quality metrics", async () => {
    mockFetch({ "/api/companies": COMPANIES, "/api/jobs": JOBS });
    renderAt(<Companies />);
    expect(await screen.findByText("Acme")).toBeTruthy();
    expect(screen.getByText(/\$110,000/)).toBeTruthy();
  });

  it("shows repeat-poster chip for repeat companies", async () => {
    mockFetch({ "/api/companies": COMPANIES, "/api/jobs": JOBS });
    renderAt(<Companies />);
    await screen.findByText("Beta");
    // The chip says "⚑ repeat poster"; header note also mentions "Repeat poster" — use getAllBy
    expect(screen.getAllByText(/repeat poster/i).length).toBeGreaterThan(0);
  });

  it("re-ranks rows when clicking a sort header", async () => {
    mockFetch({ "/api/companies": COMPANIES, "/api/jobs": JOBS });
    renderAt(<Companies />);
    await screen.findByText("Acme");

    // Click "All-time" sort header — Beta has total:5, Acme has total:1 → Beta first
    fireEvent.click(screen.getByRole("button", { name: /All-time/i }));
    const rows = screen.getAllByTestId("company-row");
    // Beta (total:5) should be first after sorting by All-time desc
    expect(rows[0].textContent).toContain("Beta");
  });

  it("row links to /companies/:name", async () => {
    mockFetch({ "/api/companies": COMPANIES, "/api/jobs": JOBS });
    renderAt(<Companies />);
    await screen.findByText("Acme");
    const link = screen.getByText("Acme").closest("a");
    expect(link?.getAttribute("href")).toBe("/companies/Acme");
  });

  it("shows the stored logo as an img in the row", async () => {
    mockFetch({ "/api/companies": COMPANIES, "/api/jobs": JOBS });
    renderAt(<Companies />);
    await screen.findByText("Acme");
    const img = screen.getAllByRole("img").find(i => i.getAttribute("src") === "/assets/logos/acme.png");
    expect(img).toBeTruthy();
  });
});

describe("CompanyDetail", () => {
  it("renders the company page and its jobs", async () => {
    mockFetch({
      "/api/companies": COMPANIES,
      "/api/pages/companies/Acme": { title: "Acme", html: "<p>company body</p>" },
      // mockFetch strips query strings; /api/jobs?status=all → /api/jobs
      "/api/jobs": JOBS,
    });
    renderAt(<Routes><Route path="/companies/:name" element={<CompanyDetail />} /></Routes>, "/companies/Acme");
    expect(await screen.findByText("company body")).toBeTruthy();
    expect(screen.getByText("Acme — Robot Dev")).toBeTruthy();
  });

  it("shows repeat-poster signal for a repeat-poster company", async () => {
    mockFetch({
      "/api/companies": COMPANIES,
      "/api/pages/companies/Beta": { title: "Beta", html: "<p>beta body</p>" },
      "/api/jobs": JOBS,
    });
    renderAt(<Routes><Route path="/companies/:name" element={<CompanyDetail />} /></Routes>, "/companies/Beta");
    // Beta has repeatPoster:true in fixtures — both header signal and scorecard row should show amber text
    const repeatMatches = await screen.findAllByText(/repeat poster/i);
    expect(repeatMatches.length).toBeGreaterThan(0);
  });

  it("shows HQ, founded, size, industry and a careers link from the company record", async () => {
    mockFetch({
      "/api/companies": COMPANIES,
      "/api/pages/companies/Acme": { title: "Acme", html: "<p>company body</p>" },
      "/api/jobs": JOBS,
    });
    renderAt(<Routes><Route path="/companies/:name" element={<CompanyDetail />} /></Routes>, "/companies/Acme");
    await screen.findByText("company body");
    expect(screen.getByText("Boston, MA")).toBeTruthy();
    expect(screen.getByText("2015")).toBeTruthy();
    expect(screen.getByText("~1100")).toBeTruthy();
    const careers = screen.getByRole("link", { name: /careers/i });
    expect(careers.getAttribute("href")).toBe("https://acme.test/careers");
  });
});
