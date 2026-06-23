// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { LogoOrMonogram } from "../src/components/CompanyLogo.js";

afterEach(() => { cleanup(); });

describe("LogoOrMonogram", () => {
  it("renders an img pointing at the logo path when logo is set", () => {
    render(<LogoOrMonogram name="Acme" logo="assets/logos/acme.png" />);
    const img = screen.getByRole("img");
    expect(img.getAttribute("src")).toBe("/assets/logos/acme.png");
    expect(img.getAttribute("alt")).toBe("Acme");
  });

  it("renders the initials monogram when no logo is set", () => {
    render(<LogoOrMonogram name="Beta Corp" logo={null} />);
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("BC")).toBeTruthy();
  });
});
