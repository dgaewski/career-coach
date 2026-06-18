// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CountUp, Stars, Chip, Segmented } from "../src/components/primitives.js";
import { Sparkline, Donut, WordCloud, RangeSlider, Modal } from "../src/components/primitives.js";

describe("primitives", () => {
  it("CountUp renders its final value", () => {
    render(<CountUp value={94} />);
    expect(screen.getByText("94")).toBeTruthy();
  });
  it("Stars renders 5 star slots", () => {
    const { container } = render(<Stars score={80} />);
    expect(container.querySelectorAll("[data-star]").length).toBe(5);
  });
  it("Chip shows label", () => { render(<Chip tone="green">Fresh</Chip>); expect(screen.getByText("Fresh")).toBeTruthy(); });
  it("Segmented calls onChange", () => {
    let v = "fit";
    render(<Segmented options={[["fit","Fit"],["salary","Salary"]]} value={v} onChange={x => (v = x)} />);
    screen.getByText("Salary").click();
    expect(v).toBe("salary");
  });
  it("Sparkline renders an svg path", () => {
    const { container } = render(<Sparkline points={[1,3,2,5]} />);
    expect(container.querySelector("path")).toBeTruthy();
  });
  it("Donut renders segments summing to total in the label", () => {
    render(<Donut segments={[{value:91,color:"#1E9E5A"},{value:31,color:"#C98A1E"},{value:20,color:"#D8443F"}]} label="142" />);
    expect(screen.getByText("142")).toBeTruthy();
  });
  it("WordCloud renders clickable terms", () => {
    let picked = "";
    render(<WordCloud items={[{key:"ros2",label:"ROS 2",weight:1,color:"var(--accent)"}]} onPick={k => (picked = k)} />);
    screen.getByText("ROS 2").click();
    expect(picked).toBe("ros2");
  });
  it("Modal shows children when open", () => {
    render(<Modal open onClose={() => {}}><p>Hi</p></Modal>);
    expect(screen.getByText("Hi")).toBeTruthy();
  });
});
