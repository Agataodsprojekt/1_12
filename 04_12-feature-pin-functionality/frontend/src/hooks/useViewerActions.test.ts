import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useViewerActions } from "./useViewerActions";
import * as OBC from "openbim-components";

// Mock OpenBIM Components
vi.mock("openbim-components", () => ({
  Components: vi.fn(),
}));

describe("useViewerActions", () => {
  const mockViewerRef = { current: null };
  const mockContainerRef = { current: document.createElement("div") };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    
    // Create a mock canvas element
    const canvas = document.createElement("canvas");
    mockContainerRef.current.appendChild(canvas);
  });

  it("should initialize with default values", () => {
    const { result } = renderHook(() =>
      useViewerActions({
        viewerRef: mockViewerRef as React.RefObject<OBC.Components | null>,
        viewerContainerRef: mockContainerRef as React.RefObject<HTMLDivElement>,
      })
    );

    expect(result.current.activeAction).toBe("move");
    expect(result.current.showCommentPanel).toBe(false);
    expect(result.current.isPinMode).toBe(false);
    expect(result.current.isDimensionMode).toBe(false);
  });

  it("should handle action selection", () => {
    const { result } = renderHook(() =>
      useViewerActions({
        viewerRef: mockViewerRef as React.RefObject<OBC.Components | null>,
        viewerContainerRef: mockContainerRef as React.RefObject<HTMLDivElement>,
      })
    );

    act(() => {
      result.current.handleActionSelect("pin");
    });

    expect(result.current.activeAction).toBe("pin");
    expect(result.current.isPinMode).toBe(true);
  });

  it("should toggle comment panel", () => {
    const { result } = renderHook(() =>
      useViewerActions({
        viewerRef: mockViewerRef as React.RefObject<OBC.Components | null>,
        viewerContainerRef: mockContainerRef as React.RefObject<HTMLDivElement>,
      })
    );

    act(() => {
      result.current.handleActionSelect("comment");
    });

    expect(result.current.showCommentPanel).toBe(true);

    act(() => {
      result.current.handleActionSelect("move");
    });

    expect(result.current.showCommentPanel).toBe(false);
  });

  it("should handle dimension mode", () => {
    const { result } = renderHook(() =>
      useViewerActions({
        viewerRef: mockViewerRef as React.RefObject<OBC.Components | null>,
        viewerContainerRef: mockContainerRef as React.RefObject<HTMLDivElement>,
      })
    );

    act(() => {
      result.current.handleActionSelect("dimension");
    });

    expect(result.current.isDimensionMode).toBe(true);
    expect(result.current.isVolumeMode).toBe(false);
    expect(result.current.isPinMode).toBe(false);
  });

  it("should handle volume mode", () => {
    const { result } = renderHook(() =>
      useViewerActions({
        viewerRef: mockViewerRef as React.RefObject<OBC.Components | null>,
        viewerContainerRef: mockContainerRef as React.RefObject<HTMLDivElement>,
      })
    );

    act(() => {
      result.current.handleActionSelect("volume");
    });

    expect(result.current.isVolumeMode).toBe(true);
    expect(result.current.isDimensionMode).toBe(false);
  });

  it("should handle screenshot action", () => {
    const { result } = renderHook(() =>
      useViewerActions({
        viewerRef: mockViewerRef as React.RefObject<OBC.Components | null>,
        viewerContainerRef: mockContainerRef as React.RefObject<HTMLDivElement>,
      })
    );

    // Mock createElement and appendChild
    const mockLink = {
      download: "",
      href: "",
      click: vi.fn(),
    };
    const createElementSpy = vi.spyOn(document, "createElement").mockReturnValue(mockLink as any);
    const appendChildSpy = vi.spyOn(document.body, "appendChild").mockImplementation(() => mockLink as any);
    const removeChildSpy = vi.spyOn(document.body, "removeChild").mockImplementation(() => mockLink as any);

    act(() => {
      result.current.handleActionSelect("camera");
    });

    expect(createElementSpy).toHaveBeenCalledWith("a");
    expect(mockLink.click).toHaveBeenCalled();
    expect(appendChildSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();

    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });

  it("should call onActionChange callback when provided", () => {
    const onActionChange = vi.fn();
    const { result } = renderHook(() =>
      useViewerActions({
        viewerRef: mockViewerRef as React.RefObject<OBC.Components | null>,
        viewerContainerRef: mockContainerRef as React.RefObject<HTMLDivElement>,
        onActionChange,
      })
    );

    act(() => {
      result.current.handleActionSelect("pin");
    });

    expect(onActionChange).toHaveBeenCalledWith("pin");
  });

  it("should handle multiple panel toggles", () => {
    const { result } = renderHook(() =>
      useViewerActions({
        viewerRef: mockViewerRef as React.RefObject<OBC.Components | null>,
        viewerContainerRef: mockContainerRef as React.RefObject<HTMLDivElement>,
      })
    );

    act(() => {
      result.current.handleActionSelect("search");
    });
    expect(result.current.showSearchPanel).toBe(true);

    act(() => {
      result.current.handleActionSelect("selection");
    });
    expect(result.current.showSearchPanel).toBe(false);
    expect(result.current.showSelectionPanel).toBe(true);

    act(() => {
      result.current.handleActionSelect("visibility");
    });
    expect(result.current.showSelectionPanel).toBe(false);
    expect(result.current.showVisibilityPanel).toBe(true);
  });

  it("should handle screenshot when viewer is not ready", () => {
    const nullViewerRef = { current: null };
    const { result } = renderHook(() =>
      useViewerActions({
        viewerRef: nullViewerRef as React.RefObject<OBC.Components | null>,
        viewerContainerRef: mockContainerRef as React.RefObject<HTMLDivElement>,
      })
    );

    act(() => {
      result.current.handleScreenshot();
    });

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("Cannot capture screenshot")
    );
  });

  it("should handle screenshot when canvas is not found", () => {
    const emptyContainerRef = { current: document.createElement("div") };
    const { result } = renderHook(() =>
      useViewerActions({
        viewerRef: mockViewerRef as React.RefObject<OBC.Components | null>,
        viewerContainerRef: emptyContainerRef as React.RefObject<HTMLDivElement>,
      })
    );

    act(() => {
      result.current.handleScreenshot();
    });

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("canvas not found")
    );
  });
});
