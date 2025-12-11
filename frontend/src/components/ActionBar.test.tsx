import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ActionBar from "./ActionBar";

// Mock useTheme from ThemeContext
vi.mock("../contexts/ThemeContext", () => ({
  useTheme: () => ({
    theme: "light",
    toggleTheme: vi.fn(),
    isLoaded: true,
  }),
}));

describe("ActionBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render all action buttons", () => {
    render(<ActionBar />);
    
    // Check if all action buttons are rendered
    expect(screen.getByLabelText("Undo")).toBeInTheDocument();
    expect(screen.getByLabelText("Redo")).toBeInTheDocument();
    expect(screen.getByLabelText("Move")).toBeInTheDocument();
    expect(screen.getByLabelText("Pin")).toBeInTheDocument();
    expect(screen.getByLabelText("Lighting")).toBeInTheDocument();
    expect(screen.getByLabelText("Dimensions")).toBeInTheDocument();
    expect(screen.getByLabelText("Screenshot")).toBeInTheDocument();
    expect(screen.getByLabelText("Comment")).toBeInTheDocument();
    expect(screen.getByLabelText("Share")).toBeInTheDocument();
    expect(screen.getByLabelText("Toggle theme")).toBeInTheDocument();
  });

  it("should have Move button active by default", () => {
    render(<ActionBar />);
    
    const moveButton = screen.getByLabelText("Move");
    expect(moveButton).toHaveClass("active");
  });

  it("should call onActionSelect when a button is clicked", () => {
    const mockOnActionSelect = vi.fn();
    render(<ActionBar onActionSelect={mockOnActionSelect} />);
    
    const undoButton = screen.getByLabelText("Undo");
    fireEvent.click(undoButton);
    
    expect(mockOnActionSelect).toHaveBeenCalledWith("undo");
    expect(mockOnActionSelect).toHaveBeenCalledTimes(1);
  });

  it("should update active state when a button is clicked", () => {
    render(<ActionBar />);
    
    const pinButton = screen.getByLabelText("Pin");
    const moveButton = screen.getByLabelText("Move");
    
    // Initially Move is active
    expect(moveButton).toHaveClass("active");
    expect(pinButton).not.toHaveClass("active");
    
    // Click Pin button
    fireEvent.click(pinButton);
    
    // Now Pin should be active
    expect(pinButton).toHaveClass("active");
    expect(moveButton).not.toHaveClass("active");
  });

  it("should render correct tooltips for each button", () => {
    render(<ActionBar />);
    
    expect(screen.getByLabelText("Undo")).toHaveAttribute("title", "Undo last action");
    expect(screen.getByLabelText("Redo")).toHaveAttribute("title", "Redo last action");
    expect(screen.getByLabelText("Move")).toHaveAttribute("title", "Move around in the 3D view");
    expect(screen.getByLabelText("Pin")).toHaveAttribute("title", "Mark and pin important elements");
    expect(screen.getByLabelText("Lighting")).toHaveAttribute("title", "Adjust lighting and environment");
    expect(screen.getByLabelText("Dimensions")).toHaveAttribute("title", "Measure dimensions in the model");
    expect(screen.getByLabelText("Screenshot")).toHaveAttribute("title", "Capture screenshot of the view");
    expect(screen.getByLabelText("Comment")).toHaveAttribute("title", "Add comments to the model");
    expect(screen.getByLabelText("Share")).toHaveAttribute("title", "Share the model with others");
  });

  it("should call onActionSelect with correct action id for each button", () => {
    const mockOnActionSelect = vi.fn();
    render(<ActionBar onActionSelect={mockOnActionSelect} />);
    
    const actions = [
      { label: "Undo", id: "undo" },
      { label: "Redo", id: "redo" },
      { label: "Move", id: "move" },
      { label: "Pin", id: "pin" },
      { label: "Lighting", id: "lighting" },
      { label: "Dimensions", id: "dimensions" },
      { label: "Screenshot", id: "camera" },
      { label: "Comment", id: "comment" },
      { label: "Share", id: "share" },
    ];
    
    actions.forEach((action) => {
      mockOnActionSelect.mockClear();
      const button = screen.getByLabelText(action.label);
      fireEvent.click(button);
      expect(mockOnActionSelect).toHaveBeenCalledWith(action.id);
    });
  });

  it("should handle theme toggle button click", () => {
    const mockToggleTheme = vi.fn();
    const mockUseTheme = vi.fn().mockReturnValue({
      theme: "light",
      toggleTheme: mockToggleTheme,
      isLoaded: true,
    });
    
    vi.doMock("../contexts/ThemeContext", () => ({
      useTheme: mockUseTheme,
    }));
    
    render(<ActionBar />);
    
    const themeButton = screen.getByLabelText("Toggle theme");
    fireEvent.click(themeButton);
    
    expect(mockToggleTheme).toHaveBeenCalledTimes(1);
  });

  it("should show correct tooltip for dark theme", () => {
    const mockUseTheme = vi.fn().mockReturnValue({
      theme: "dark",
      toggleTheme: vi.fn(),
      isLoaded: true,
    });
    
    vi.doMock("../contexts/ThemeContext", () => ({
      useTheme: mockUseTheme,
    }));
    
    render(<ActionBar />);
    
    const themeButton = screen.getByLabelText("Toggle theme");
    expect(themeButton).toHaveAttribute("title", "Switch to light mode");
  });

  it("should show correct tooltip for light theme", () => {
    const mockUseTheme = vi.fn().mockReturnValue({
      theme: "light",
      toggleTheme: vi.fn(),
      isLoaded: true,
    });
    
    vi.doMock("../contexts/ThemeContext", () => ({
      useTheme: mockUseTheme,
    }));
    
    render(<ActionBar />);
    
    const themeButton = screen.getByLabelText("Toggle theme");
    expect(themeButton).toHaveAttribute("title", "Switch to dark mode");
  });

  it("should work without onActionSelect prop", () => {
    render(<ActionBar />);
    
    const undoButton = screen.getByLabelText("Undo");
    
    // Should not throw error when clicking without callback
    expect(() => fireEvent.click(undoButton)).not.toThrow();
  });

  it("should apply correct CSS classes to toolbar", () => {
    const { container } = render(<ActionBar />);
    
    const toolbar = container.querySelector(".toolbar-strip");
    expect(toolbar).toBeInTheDocument();
    expect(toolbar).toHaveClass("sticky", "bottom-8");
  });

  it("should render action buttons with correct CSS classes", () => {
    render(<ActionBar />);
    
    const undoButton = screen.getByLabelText("Undo");
    expect(undoButton).toHaveClass("action-button", "group");
  });

  it("should maintain only one active button at a time", () => {
    render(<ActionBar />);
    
    const moveButton = screen.getByLabelText("Move");
    const pinButton = screen.getByLabelText("Pin");
    const lightingButton = screen.getByLabelText("Lighting");
    
    // Initially Move is active
    expect(moveButton).toHaveClass("active");
    
    // Click Pin
    fireEvent.click(pinButton);
    expect(pinButton).toHaveClass("active");
    expect(moveButton).not.toHaveClass("active");
    
    // Click Lighting
    fireEvent.click(lightingButton);
    expect(lightingButton).toHaveClass("active");
    expect(pinButton).not.toHaveClass("active");
    expect(moveButton).not.toHaveClass("active");
  });
});

