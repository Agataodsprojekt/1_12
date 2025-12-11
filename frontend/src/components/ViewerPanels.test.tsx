import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ViewerPanels } from "./ViewerPanels";
import * as OBC from "openbim-components";

// Mock all panel components
vi.mock("./CommentPanel", () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="comment-panel">
      CommentPanel
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

vi.mock("./DimensionOptionsPanel", () => ({
  default: () => <div data-testid="dimension-panel">DimensionOptionsPanel</div>,
}));

vi.mock("./VolumeOptionsPanel", () => ({
  default: () => <div data-testid="volume-panel">VolumeOptionsPanel</div>,
}));

vi.mock("./SearchPanel", () => ({
  SearchPanel: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="search-panel">
      SearchPanel
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

vi.mock("./SelectionPanel", () => ({
  SelectionPanel: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="selection-panel">
      SelectionPanel
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

vi.mock("./VisibilityPanel", () => ({
  VisibilityPanel: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="visibility-panel">
      VisibilityPanel
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

vi.mock("./ViewsPanel", () => ({
  ViewsPanel: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="views-panel">
      ViewsPanel
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

vi.mock("./CostSummary", () => ({
  CostSummary: () => <div data-testid="cost-summary">CostSummary</div>,
}));

vi.mock("./VisibilityControls", () => ({
  VisibilityControls: () => <div data-testid="visibility-controls">VisibilityControls</div>,
}));

vi.mock("./ElementsList", () => ({
  ElementsList: () => <div data-testid="elements-list">ElementsList</div>,
}));

vi.mock("../lib/thatopen", () => ({
  getFragmentsManager: vi.fn(() => null),
  getLoadedModels: vi.fn(() => []),
}));

describe("ViewerPanels", () => {
  const defaultProps = {
    viewerRef: { current: null } as React.RefObject<OBC.Components | null>,
    hiderRef: { current: null } as React.RefObject<any>,
    viewsManagerRef: { current: null } as React.RefObject<any>,
    volumeMeasurerRef: { current: null } as React.RefObject<any>,
    showCommentPanel: false,
    showSearchPanel: false,
    showSelectionPanel: false,
    showVisibilityPanel: false,
    showViewsPanel: false,
    isPinMode: false,
    isDimensionMode: false,
    isVolumeMode: false,
    isScissorsMode: false,
    isAddSectionMode: false,
    onCloseCommentPanel: vi.fn(),
    onCloseSearchPanel: vi.fn(),
    onCloseSelectionPanel: vi.fn(),
    onCloseVisibilityPanel: vi.fn(),
    onCloseViewsPanel: vi.fn(),
    onScissorsModeChange: vi.fn(),
    onAddSectionModeChange: vi.fn(),
    comments: [],
    onAddComment: vi.fn(),
    onDeleteComment: vi.fn(),
    onCommentClick: vi.fn(),
    getAllComments: vi.fn(() => []),
    dimensionOrthogonal: false,
    dimensionSnap: false,
    alignToEdgeMode: 'none' as const,
    onDimensionOrthogonalChange: vi.fn(),
    onDimensionSnapChange: vi.fn(),
    onAlignToEdgeChange: vi.fn(),
    selectedElements: [],
    isIsolated: false,
    onRemoveElement: vi.fn(),
    onClearSelection: vi.fn(),
    onIsolate: vi.fn(),
    onUnisolate: vi.fn(),
    onSelectionElementClick: vi.fn(),
    elements: [],
    costs: null,
    visibleTypes: new Set<string>(),
    onTypeVisibilityChange: vi.fn(),
    onShowAllTypes: vi.fn(),
    onHideAllTypes: vi.fn(),
    pinColors: [],
    selectedPinColor: "#000000",
    onPinColorSelect: vi.fn(),
    isLoading: false,
    error: undefined,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("should render nothing when all panels are closed", () => {
    const { container } = render(<ViewerPanels {...defaultProps} />);
    
    expect(screen.queryByTestId("comment-panel")).not.toBeInTheDocument();
    expect(screen.queryByTestId("search-panel")).not.toBeInTheDocument();
    expect(screen.queryByTestId("selection-panel")).not.toBeInTheDocument();
  });

  it("should render comment panel when showCommentPanel is true", () => {
    render(<ViewerPanels {...defaultProps} showCommentPanel={true} />);
    
    expect(screen.getByTestId("comment-panel")).toBeInTheDocument();
  });

  it("should render search panel when showSearchPanel is true", () => {
    render(<ViewerPanels {...defaultProps} showSearchPanel={true} />);
    
    expect(screen.getByTestId("search-panel")).toBeInTheDocument();
  });

  it("should render selection panel when showSelectionPanel is true and viewer exists", () => {
    const viewerRef = { current: {} as OBC.Components };
    render(<ViewerPanels {...defaultProps} showSelectionPanel={true} viewerRef={viewerRef} />);
    
    expect(screen.getByTestId("selection-panel")).toBeInTheDocument();
  });

  it("should render visibility panel when showVisibilityPanel is true and viewer/hider exist", () => {
    const viewerRef = { current: {} as OBC.Components };
    const hiderRef = { current: {} };
    render(
      <ViewerPanels 
        {...defaultProps} 
        showVisibilityPanel={true} 
        viewerRef={viewerRef}
        hiderRef={hiderRef}
      />
    );
    
    expect(screen.getByTestId("visibility-panel")).toBeInTheDocument();
  });

  it("should render views panel when showViewsPanel is true and viewsManager exists", () => {
    const viewsManagerRef = { current: {} };
    render(
      <ViewerPanels 
        {...defaultProps} 
        showViewsPanel={true} 
        viewsManagerRef={viewsManagerRef}
      />
    );
    
    expect(screen.getByTestId("views-panel")).toBeInTheDocument();
  });

  it("should render cost summary when costs are provided", () => {
    render(<ViewerPanels {...defaultProps} costs={{ total: 1000 }} />);
    
    expect(screen.getByTestId("cost-summary")).toBeInTheDocument();
  });

  it("should render visibility controls when elements are provided", () => {
    render(<ViewerPanels {...defaultProps} elements={[{ id: 1, type: "IfcWall" }]} />);
    
    expect(screen.getByTestId("visibility-controls")).toBeInTheDocument();
  });

  it("should render elements list when elements are provided", () => {
    render(<ViewerPanels {...defaultProps} elements={[{ id: 1, type: "IfcWall" }]} />);
    
    expect(screen.getByTestId("elements-list")).toBeInTheDocument();
  });

  it("should render loading indicator when isLoading is true", () => {
    render(<ViewerPanels {...defaultProps} isLoading={true} />);
    
    expect(screen.getByText("Ładowanie modelu IFC...")).toBeInTheDocument();
  });

  it("should render error message when error is provided", () => {
    render(<ViewerPanels {...defaultProps} error="Test error" />);
    
    expect(screen.getByText(/Błąd: Test error/)).toBeInTheDocument();
  });

  it("should render pin color palette when isPinMode is true", () => {
    const pinColors = [
      { color: "#000000", name: "Czarny" },
      { color: "#FFFFFF", name: "Biały" },
    ];
    
    render(
      <ViewerPanels 
        {...defaultProps} 
        isPinMode={true}
        pinColors={pinColors}
      />
    );
    
    expect(screen.getByText("📌 Wybierz kolor pinezki")).toBeInTheDocument();
    expect(screen.getByTitle("Czarny")).toBeInTheDocument();
    expect(screen.getByTitle("Biały")).toBeInTheDocument();
  });

  it("should render dimension panel when isDimensionMode is true", () => {
    render(<ViewerPanels {...defaultProps} isDimensionMode={true} />);
    
    expect(screen.getByTestId("dimension-panel")).toBeInTheDocument();
  });

  it("should render volume panel when isVolumeMode is true and volumeMeasurer exists", () => {
    const volumeMeasurerRef = { current: { enabled: false } };
    render(
      <ViewerPanels 
        {...defaultProps} 
        isVolumeMode={true}
        volumeMeasurerRef={volumeMeasurerRef}
      />
    );
    
    expect(screen.getByTestId("volume-panel")).toBeInTheDocument();
  });

  it("should call onCloseCommentPanel when comment panel close button is clicked", () => {
    const onCloseCommentPanel = vi.fn();
    render(
      <ViewerPanels 
        {...defaultProps} 
        showCommentPanel={true}
        onCloseCommentPanel={onCloseCommentPanel}
      />
    );
    
    const closeButton = screen.getByText("Close");
    closeButton.click();
    
    expect(onCloseCommentPanel).toHaveBeenCalled();
  });

  it("should call onPinColorSelect when pin color button is clicked", () => {
    const onPinColorSelect = vi.fn();
    const pinColors = [
      { color: "#000000", name: "Czarny" },
    ];
    
    render(
      <ViewerPanels 
        {...defaultProps} 
        isPinMode={true}
        pinColors={pinColors}
        onPinColorSelect={onPinColorSelect}
      />
    );
    
    const colorButton = screen.getByTitle("Czarny");
    colorButton.click();
    
    expect(onPinColorSelect).toHaveBeenCalledWith("#000000");
  });
});
