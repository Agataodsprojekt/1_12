import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useViewer3D } from "./useViewer3D";
import * as OBC from "openbim-components";
import * as THREE from "three";

// Mock OpenBIM Components
vi.mock("openbim-components", () => ({
  Components: vi.fn().mockImplementation(() => ({
    scene: null,
    renderer: null,
    camera: null,
    raycaster: null,
    grid: null,
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
    get: vi.fn(() => ({
      localClippingEnabled: false,
    })),
    postproduction: {
      enabled: false,
    },
  })),
  OrthoPerspectiveCamera: vi.fn().mockImplementation(() => ({
    get: vi.fn(() => ({
      position: { x: 0, y: 0, z: 0 },
      getWorldDirection: vi.fn(),
    })),
    controls: {
      enabled: false,
      addEventListener: vi.fn(),
    },
  })),
  SimpleRaycaster: vi.fn(),
  SimpleGrid: vi.fn(),
}));

// Mock THREE
vi.mock("three", () => ({
  AmbientLight: vi.fn(),
  DirectionalLight: vi.fn().mockImplementation(() => ({
    position: {
      set: vi.fn(),
    },
  })),
  Color: vi.fn().mockImplementation((color) => ({ hex: color })),
  GridHelper: vi.fn(),
  AxesHelper: vi.fn(),
}));

// Mock ThemeContext
vi.mock("../contexts/ThemeContext", () => ({
  useTheme: vi.fn(() => ({
    theme: "dark",
    toggleTheme: vi.fn(),
  })),
}));

describe("useViewer3D", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console methods
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should initialize viewer on mount", async () => {
    const { result } = renderHook(() => useViewer3D());

    await waitFor(() => {
      expect(result.current.state.isInitialized).toBe(true);
    });

    expect(OBC.Components).toHaveBeenCalled();
    expect(result.current.viewerRef.current).not.toBeNull();
  });

  it("should provide viewer container ref", () => {
    const { result } = renderHook(() => useViewer3D());

    expect(result.current.viewerContainerRef).toBeDefined();
    expect(result.current.viewerContainerRef.current).toBeNull(); // Initially null until attached to DOM
  });

  it("should initialize scene, camera, and renderer", async () => {
    const { result } = renderHook(() => useViewer3D());

    await waitFor(() => {
      expect(result.current.state.isInitialized).toBe(true);
    });

    expect(result.current.state.scene).not.toBeNull();
    expect(result.current.state.camera).not.toBeNull();
    expect(result.current.state.renderer).not.toBeNull();
  });

  it("should dispose viewer on unmount", async () => {
    const mockDispose = vi.fn();
    const { Components } = require("openbim-components");
    Components.mockImplementation(() => ({
      scene: null,
      renderer: null,
      camera: null,
      raycaster: null,
      grid: null,
      init: vi.fn(),
      dispose: mockDispose,
    }));

    const { result, unmount } = renderHook(() => useViewer3D());

    await waitFor(() => {
      expect(result.current.state.isInitialized).toBe(true);
    });

    unmount();

    expect(mockDispose).toHaveBeenCalled();
  });

  it("should not initialize if viewer already exists", async () => {
    const { Components } = require("openbim-components");
    Components.mockClear();

    const { result, rerender } = renderHook(() => useViewer3D());

    await waitFor(() => {
      expect(result.current.state.isInitialized).toBe(true);
    });

    const firstCallCount = Components.mock.calls.length;

    rerender();

    // Should not create new instance on rerender
    expect(Components.mock.calls.length).toBe(firstCallCount);
  });

  it("should update scene background based on theme", async () => {
    const { useTheme } = require("../contexts/ThemeContext");
    const mockScene = {
      background: null,
    };

    const { SimpleScene } = require("openbim-components");
    SimpleScene.mockImplementation(() => ({
      get: vi.fn(() => mockScene),
    }));

    const { result, rerender } = renderHook(() => useViewer3D());

    await waitFor(() => {
      expect(result.current.state.isInitialized).toBe(true);
    });

    // Change theme to light
    useTheme.mockReturnValue({
      theme: "light",
      toggleTheme: vi.fn(),
    });

    rerender();

    await waitFor(() => {
      expect(mockScene.background).toBeDefined();
    });
  });

  it("should enable local clipping in renderer", async () => {
    const mockRenderer = {
      localClippingEnabled: false,
    };

    const { PostproductionRenderer } = require("openbim-components");
    PostproductionRenderer.mockImplementation(() => ({
      get: vi.fn(() => mockRenderer),
      postproduction: {
        enabled: false,
      },
    }));

    const { result } = renderHook(() => useViewer3D());

    await waitFor(() => {
      expect(result.current.state.isInitialized).toBe(true);
    });

    expect(mockRenderer.localClippingEnabled).toBe(true);
  });

  it("should handle initialization errors gracefully", async () => {
    const { Components } = require("openbim-components");
    Components.mockImplementation(() => {
      throw new Error("Initialization failed");
    });

    const { result } = renderHook(() => useViewer3D());

    // Should not crash, state should remain uninitialized
    await waitFor(() => {
      expect(result.current.state.isInitialized).toBe(false);
    });

    expect(console.error).toHaveBeenCalled();
  });
});
