import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ViewerHeader } from "./ViewerHeader";

// Mock ThemeContext
vi.mock("../contexts/ThemeContext", () => ({
  useTheme: vi.fn(() => ({
    theme: "dark",
    toggleTheme: vi.fn(),
  })),
}));

describe("ViewerHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render with default title and subtitle", () => {
    render(<ViewerHeader />);
    
    expect(screen.getByText("IFC Construction Calculator")).toBeInTheDocument();
    expect(screen.getByText("Wizualizacja i analiza konstrukcji budowlanych")).toBeInTheDocument();
  });

  it("should render with custom title and subtitle", () => {
    render(<ViewerHeader title="Custom Title" subtitle="Custom Subtitle" />);
    
    expect(screen.getByText("Custom Title")).toBeInTheDocument();
    expect(screen.getByText("Custom Subtitle")).toBeInTheDocument();
  });

  it("should apply dark theme styles", () => {
    const { useTheme } = require("../contexts/ThemeContext");
    useTheme.mockReturnValue({
      theme: "dark",
      toggleTheme: vi.fn(),
    });

    const { container } = render(<ViewerHeader />);
    const header = container.querySelector("header");
    
    expect(header).toHaveClass("header-dark");
    expect(header).toHaveStyle({
      backgroundColor: "rgb(31, 41, 55)", // #1f2937
    });
  });

  it("should apply light theme styles", () => {
    const { useTheme } = require("../contexts/ThemeContext");
    useTheme.mockReturnValue({
      theme: "light",
      toggleTheme: vi.fn(),
    });

    const { container } = render(<ViewerHeader />);
    const header = container.querySelector("header");
    
    expect(header).toHaveClass("header-light");
    expect(header).toHaveStyle({
      backgroundColor: "rgb(255, 255, 255)", // #ffffff
    });
  });

  it("should have correct structure", () => {
    const { container } = render(<ViewerHeader />);
    
    const header = container.querySelector("header");
    const h1 = container.querySelector("h1");
    const p = container.querySelector("p");
    
    expect(header).toBeInTheDocument();
    expect(h1).toBeInTheDocument();
    expect(p).toBeInTheDocument();
    expect(h1?.parentElement).toBe(header);
    expect(p?.parentElement).toBe(header);
  });
});
