import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useViewerTools } from "./useViewerTools";
import * as THREE from "three";
import * as OBC from "openbim-components";

// Mock dependencies
vi.mock("./usePins", () => ({
  usePins: vi.fn(() => ({
    isPinMode: false,
    setIsPinMode: vi.fn(),
    selectedPinColor: "#000000",
    setSelectedPinColor: vi.fn(),
    pinColors: [
      { name: "Czarny", color: "#000000" },
      { name: "Biały", color: "#FFFFFF" },
    ],
    handlePinElement: vi.fn(),
    isPinModeRef: { current: false },
  })),
}));

vi.mock("./useMeasurementsAPI", () => ({
  useMeasurementsAPI: vi.fn(() => ({
    calculateDimension: vi.fn(),
    calculateVolume: vi.fn(),
  })),
}));

vi.mock("../utils/SimpleDimensionTool", () => ({
  SimpleDimensionTool: vi.fn().mockImplementation(() => ({
    enabled: false,
    orthogonalMode: false,
    snapToPoints: false,
    alignToEdgeMode: 'none',
    onMeasurementCreated: null,
    handleClick: vi.fn(),
    handleMouseMove: vi.fn(),
    clearPreviewAndSnap: vi.fn(),
    handleRightClick: vi.fn(),
    highlightMeasurement: vi.fn(),
    deleteMeasurement: vi.fn(),
    cancelCurrentMeasurement: vi.fn(),
    getMeasurementData: vi.fn(),
    resetReferenceEdge: vi.fn(),
  })),
}));

vi.mock("../utils/SimpleVolumeTool", () => ({
  SimpleVolumeTool: vi.fn().mockImplementation(() => ({
    enabled: false,
    visible: true,
    color: new THREE.Color("#494cb6"),
    endCreation: vi.fn(),
    delete: vi.fn(),
  })),
}));

describe("useViewerTools", () => {
  const mockScene = {
    add: vi.fn(),
    remove: vi.fn(),
  } as any;

  const mockCamera = {
    getWorldDirection: vi.fn(),
  } as any;

  const defaultOptions = {
    viewerRef: { current: null } as React.RefObject<OBC.Components | null>,
    viewerContainerRef: { current: document.createElement("div") } as React.RefObject<HTMLDivElement>,
    scene: mockScene,
    camera: mockCamera,
    viewsManagerRef: { current: null } as React.RefObject<any>,
    loadedModelsRef: { current: [] } as React.RefObject<any[]>,
    modelObjectsRef: { current: [] } as React.RefObject<THREE.Object3D[]>,
    onActionSave: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("should initialize with default values", () => {
    const { result } = renderHook(() => useViewerTools(defaultOptions));

    expect(result.current.dimensionOrthogonal).toBe(false);
    expect(result.current.dimensionSnap).toBe(true);
    expect(result.current.alignToEdgeMode).toBe('none');
    expect(result.current.isScissorsMode).toBe(false);
    expect(result.current.isAddSectionMode).toBe(false);
    expect(result.current.isPinMode).toBe(false);
  });

  it("should initialize tools when scene and camera are available", () => {
    const { result } = renderHook(() => useViewerTools(defaultOptions));

    act(() => {
      result.current.initializeTools();
    });

    expect(result.current.dimensionsRef.current).not.toBeNull();
    expect(result.current.volumeMeasurerRef.current).not.toBeNull();
  });

  it("should update dimension orthogonal mode", () => {
    const { result } = renderHook(() => useViewerTools(defaultOptions));

    act(() => {
      result.current.setDimensionOrthogonal(true);
    });

    expect(result.current.dimensionOrthogonal).toBe(true);
  });

  it("should update dimension snap mode", () => {
    const { result } = renderHook(() => useViewerTools(defaultOptions));

    act(() => {
      result.current.setDimensionSnap(false);
    });

    expect(result.current.dimensionSnap).toBe(false);
  });

  it("should update align to edge mode", () => {
    const { result } = renderHook(() => useViewerTools(defaultOptions));

    act(() => {
      result.current.setAlignToEdgeMode('parallel');
    });

    expect(result.current.alignToEdgeMode).toBe('parallel');
  });

  it("should toggle scissors mode", () => {
    const { result } = renderHook(() => useViewerTools(defaultOptions));

    act(() => {
      result.current.setIsScissorsMode(true);
    });

    expect(result.current.isScissorsMode).toBe(true);
  });

  it("should toggle add section mode", () => {
    const { result } = renderHook(() => useViewerTools(defaultOptions));

    act(() => {
      result.current.setIsAddSectionMode(true);
    });

    expect(result.current.isAddSectionMode).toBe(true);
  });

  it("should handle dimension click with delete", () => {
    const { result } = renderHook(() => useViewerTools(defaultOptions));

    act(() => {
      result.current.initializeTools();
    });

    const mockEvent = {
      shiftKey: true,
      stopPropagation: vi.fn(),
      preventDefault: vi.fn(),
      target: document.createElement("canvas"),
    } as any;

    act(() => {
      result.current.handleDimensionClickWithDelete(mockEvent);
    });

    // Should not throw error
    expect(result.current.dimensionsRef.current).not.toBeNull();
  });

  it("should handle dimension move", () => {
    const { result } = renderHook(() => useViewerTools(defaultOptions));

    act(() => {
      result.current.initializeTools();
    });

    const mockEvent = {
      shiftKey: true,
      target: document.createElement("canvas"),
    } as any;

    act(() => {
      result.current.handleDimensionMove(mockEvent);
    });

    // Should not throw error
    expect(result.current.dimensionsRef.current).not.toBeNull();
  });

  it("should handle key down events", () => {
    const { result } = renderHook(() => useViewerTools(defaultOptions));

    const mockEvent = {
      key: 'Escape',
    } as KeyboardEvent;

    act(() => {
      result.current.handleKeyDown(mockEvent);
    });

    // Should not throw error
    expect(result.current.isCtrlPressedRef).toBeDefined();
  });

  it("should handle key up events", () => {
    const { result } = renderHook(() => useViewerTools(defaultOptions));

    const mockEvent = {
      key: 'Control',
    } as KeyboardEvent;

    act(() => {
      result.current.handleKeyUp(mockEvent);
    });

    // Should not throw error
    expect(result.current.isCtrlPressedRef.current).toBe(false);
  });

  it("should provide pin colors", () => {
    const { result } = renderHook(() => useViewerTools(defaultOptions));

    expect(result.current.pinColors).toBeDefined();
    expect(result.current.pinColors.length).toBeGreaterThan(0);
  });

  it("should provide isPinModeRef", () => {
    const { result } = renderHook(() => useViewerTools(defaultOptions));

    expect(result.current.isPinModeRef).toBeDefined();
    expect(result.current.isPinModeRef.current).toBe(false);
  });
});
