import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Viewer3D } from "./Viewer3D";

// Mock useViewer3D hook
vi.mock("../hooks/useViewer3D", () => ({
  useViewer3D: vi.fn(() => ({
    viewerRef: { current: null },
    viewerContainerRef: { current: document.createElement("div") },
    state: {
      viewer: null,
      scene: null,
      camera: null,
      renderer: null,
      isInitialized: false,
    },
    initialize: vi.fn(),
    dispose: vi.fn(),
  })),
}));

// Mock ActionBar
vi.mock("./ActionBar", () => ({
  default: ({ onActionSelect }: { onActionSelect?: (action: string) => void }) => (
    <div data-testid="action-bar" onClick={() => onActionSelect?.("test-action")}>
      ActionBar Mock
    </div>
  ),
}));

describe("Viewer3D", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render viewer container", () => {
    const { container } = render(<Viewer3D />);
    
    const viewerDiv = container.querySelector("div[style*='width: 100%']");
    expect(viewerDiv).toBeInTheDocument();
  });

  it("should render ActionBar component", () => {
    render(<Viewer3D />);
    
    const actionBar = screen.getByTestId("action-bar");
    expect(actionBar).toBeInTheDocument();
  });

  it("should have correct container styles", () => {
    const { container } = render(<Viewer3D />);
    
    const viewerDiv = container.querySelector("div[style*='width: 100%']");
    expect(viewerDiv).toHaveStyle({
      width: "100%",
      flex: "1",
      position: "relative",
    });
  });

  it("should call onActionSelect when ActionBar triggers action", () => {
    const onActionSelect = vi.fn();
    render(<Viewer3D onActionSelect={onActionSelect} />);
    
    const actionBar = screen.getByTestId("action-bar");
    actionBar.click();
    
    expect(onActionSelect).toHaveBeenCalledWith("test-action");
  });

  it("should render children", () => {
    render(
      <Viewer3D>
        <div data-testid="child">Child Content</div>
      </Viewer3D>
    );
    
    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByText("Child Content")).toBeInTheDocument();
  });

  it("should have touchAction none for camera controls", () => {
    const { container } = render(<Viewer3D />);
    
    const viewerDiv = container.querySelector("div[style*='width: 100%']");
    expect(viewerDiv).toHaveStyle({
      touchAction: "none",
    });
  });
});
