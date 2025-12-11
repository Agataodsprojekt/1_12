import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Viewer from "./Viewer";

// Mock OpenBIM Components
vi.mock("openbim-components", () => ({
  Components: vi.fn().mockImplementation(() => ({
    scene: null,
    renderer: null,
    camera: null,
    raycaster: null,
    ui: {
      addToolbar: vi.fn(),
    },
    init: vi.fn(),
    dispose: vi.fn(),
  })),
  SimpleScene: vi.fn().mockImplementation(() => ({
    get: vi.fn(() => ({
      add: vi.fn(),
      background: null,
    })),
  })),
  PostproductionRenderer: vi.fn().mockImplementation(() => ({
    postproduction: {
      enabled: false,
    },
  })),
  OrthoPerspectiveCamera: vi.fn(),
  SimpleRaycaster: vi.fn(),
  SimpleGrid: vi.fn(),
  FragmentIfcLoader: vi.fn().mockImplementation(() => ({
    setup: vi.fn(),
    onIfcLoaded: {
      add: vi.fn(),
    },
    uiElement: {
      get: vi.fn(),
    },
  })),
  FragmentHighlighter: vi.fn().mockImplementation(() => ({
    setup: vi.fn(),
    updateHighlight: vi.fn(),
    events: {
      select: {
        onHighlight: {
          add: vi.fn(),
        },
      },
    },
  })),
  IfcPropertiesProcessor: vi.fn().mockImplementation(() => ({
    process: vi.fn(),
    renderProperties: vi.fn(),
    uiElement: {
      get: vi.fn(),
    },
  })),
  Toolbar: vi.fn().mockImplementation(() => ({
    addChild: vi.fn(),
  })),
}));

// Mock THREE
vi.mock("three", () => ({
  AmbientLight: vi.fn(),
  DirectionalLight: vi.fn().mockImplementation(() => ({
    position: {
      set: vi.fn(),
    },
  })),
  Color: vi.fn(),
}));

// Mock ActionBar
vi.mock("../components/ActionBar", () => ({
  default: ({ onActionSelect }: { onActionSelect?: (action: string) => void }) => (
    <div data-testid="action-bar" onClick={() => onActionSelect?.("test-action")}>
      ActionBar Mock
    </div>
  ),
}));

describe("Viewer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console.log to avoid cluttering test output
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("should render viewer container", () => {
    const { container } = render(<Viewer />);
    
    const viewerDiv = container.querySelector("div[style*='width: 100%']");
    expect(viewerDiv).toBeInTheDocument();
  });

  it("should render ActionBar component", () => {
    render(<Viewer />);
    
    const actionBar = screen.getByTestId("action-bar");
    expect(actionBar).toBeInTheDocument();
  });

  it("should have correct container styles", () => {
    const { container } = render(<Viewer />);
    
    const viewerDiv = container.querySelector("div[style*='width: 100%']");
    expect(viewerDiv).toHaveStyle({
      width: "100%",
      height: "100vh",
      position: "relative",
    });
  });

  it("should handle action selection from ActionBar", () => {
    const consoleSpy = vi.spyOn(console, "log");
    render(<Viewer />);
    
    const actionBar = screen.getByTestId("action-bar");
    actionBar.click();
    
    expect(consoleSpy).toHaveBeenCalledWith("Selected action:", "test-action");
  });

  it("should initialize OpenBIM Components on mount", () => {
    const { Components } = require("openbim-components");
    
    render(<Viewer />);
    
    // Components constructor should be called
    expect(Components).toHaveBeenCalled();
  });

  it("should cleanup on unmount", () => {
    const mockDispose = vi.fn();
    const { Components } = require("openbim-components");
    
    Components.mockImplementation(() => ({
      scene: null,
      renderer: null,
      camera: null,
      raycaster: null,
      ui: {
        addToolbar: vi.fn(),
      },
      init: vi.fn(),
      dispose: mockDispose,
    }));
    
    const { unmount } = render(<Viewer />);
    
    unmount();
    
    // Dispose should be called on cleanup
    expect(mockDispose).toHaveBeenCalled();
  });

  it("should not reinitialize viewer if already exists", () => {
    const { Components } = require("openbim-components");
    Components.mockClear();
    
    const { rerender } = render(<Viewer />);
    
    const callCountAfterFirstRender = Components.mock.calls.length;
    
    rerender(<Viewer />);
    
    // Should not create new Components instance on rerender
    expect(Components.mock.calls.length).toBe(callCountAfterFirstRender);
  });
});

