import { useState, useCallback, useRef } from "react";
import * as OBC from "openbim-components";
import * as THREE from "three";

export interface UseViewerActionsOptions {
  viewerRef: React.RefObject<OBC.Components | null>;
  viewerContainerRef: React.RefObject<HTMLDivElement>;
  onActionChange?: (action: string) => void;
}

export interface UseViewerActionsReturn {
  activeAction: string;
  setActiveAction: (action: string) => void;
  handleActionSelect: (action: string) => void;
  handleScreenshot: () => void;
  // Panel states
  showCommentPanel: boolean;
  setShowCommentPanel: (show: boolean) => void;
  showSearchPanel: boolean;
  setShowSearchPanel: (show: boolean) => void;
  showSelectionPanel: boolean;
  setShowSelectionPanel: (show: boolean) => void;
  showVisibilityPanel: boolean;
  setShowVisibilityPanel: (show: boolean) => void;
  showViewsPanel: boolean;
  setShowViewsPanel: (show: boolean) => void;
  // Mode states (these should be passed from useViewerTools)
  isPinMode: boolean;
  setIsPinMode: (enabled: boolean) => void;
  isDimensionMode: boolean;
  setIsDimensionMode: (enabled: boolean) => void;
  isVolumeMode: boolean;
  setIsVolumeMode: (enabled: boolean) => void;
  isScissorsMode: boolean;
  setIsScissorsMode: (enabled: boolean) => void;
  isAddSectionMode: boolean;
  setIsAddSectionMode: (enabled: boolean) => void;
}

/**
 * Hook for managing viewer actions and UI state
 * Handles action selection, panel visibility, and mode toggling
 */
export function useViewerActions(
  options: UseViewerActionsOptions
): UseViewerActionsReturn {
  const { viewerRef, viewerContainerRef, onActionChange } = options;

  const [activeAction, setActiveAction] = useState<string>("move");
  
  // Panel states
  const [showCommentPanel, setShowCommentPanel] = useState(false);
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [showSelectionPanel, setShowSelectionPanel] = useState(false);
  const [showVisibilityPanel, setShowVisibilityPanel] = useState(false);
  const [showViewsPanel, setShowViewsPanel] = useState(false);
  
  // Mode states are managed by useViewerTools hook
  // These are kept for backward compatibility but should be passed from tools hook
  const [isPinMode, setIsPinMode] = useState(false);
  const [isDimensionMode, setIsDimensionMode] = useState(false);
  const [isVolumeMode, setIsVolumeMode] = useState(false);
  const [isScissorsMode, setIsScissorsMode] = useState(false);
  const [isAddSectionMode, setIsAddSectionMode] = useState(false);

  const handleScreenshot = useCallback(() => {
    if (!viewerRef.current || !viewerContainerRef.current) {
      console.warn('⚠️ Cannot capture screenshot: viewer not ready');
      return;
    }
    
    try {
      const canvas = viewerContainerRef.current.querySelector('canvas');
      if (!canvas) {
        console.warn('⚠️ Cannot capture screenshot: canvas not found');
        return;
      }
      
      // Convert canvas to data URL
      const dataURL = canvas.toDataURL('image/png');
      
      // Create download link
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      link.download = `screenshot-${timestamp}.png`;
      link.href = dataURL;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('📸 Screenshot captured and downloaded');
    } catch (error) {
      console.error('❌ Error capturing screenshot:', error);
    }
  }, [viewerRef, viewerContainerRef]);

  const handleActionSelect = useCallback((action: string) => {
    setActiveAction(action);
    console.log("Selected action:", action);
    onActionChange?.(action);
    
    // Handle comment panel
    if (action === "comment") {
      setShowCommentPanel(true);
      console.log("💬 Comment panel enabled");
      return;
    }
    
    if (showCommentPanel && action !== "comment") {
      setShowCommentPanel(false);
      console.log("💬 Comment panel disabled");
    }
    
    // Handle pin mode
    if (action === "pin") {
      setIsPinMode(true);
      console.log("📌 Pin mode enabled");
      return;
    }
    
    if (isPinMode && action !== "pin") {
      setIsPinMode(false);
      console.log("📌 Pin mode disabled");
    }
    
    // Handle dimension mode
    if (action === "dimension") {
      setIsDimensionMode(true);
      setIsVolumeMode(false);
      setIsPinMode(false);
      console.log("📏 Dimension mode enabled");
      return;
    }
    
    if (isDimensionMode && action !== "dimension") {
      setIsDimensionMode(false);
      console.log("📏 Dimension mode disabled");
    }
    
    // Handle volume mode
    if (action === "volume") {
      setIsVolumeMode(true);
      setIsDimensionMode(false);
      console.log("📦 Volume measurement mode enabled");
      return;
    }
    
    if (isVolumeMode && action !== "volume") {
      setIsVolumeMode(false);
      console.log("📦 Volume measurement mode disabled");
    }
    
    // Handle search panel
    if (action === "search") {
      setShowSearchPanel(true);
      console.log("🔍 Search panel enabled");
      return;
    }
    
    if (showSearchPanel && action !== "search") {
      setShowSearchPanel(false);
      console.log("🔍 Search panel disabled");
    }
    
    // Handle selection panel
    if (action === "selection") {
      setShowSelectionPanel(true);
      console.log("🎯 Selection panel enabled");
      return;
    }
    
    if (showSelectionPanel && action !== "selection") {
      setShowSelectionPanel(false);
      console.log("🎯 Selection panel disabled");
    }
    
    // Handle visibility panel
    if (action === "visibility") {
      setShowVisibilityPanel(true);
      console.log("👁️ Visibility panel enabled");
      return;
    }
    
    if (showVisibilityPanel && action !== "visibility") {
      setShowVisibilityPanel(false);
      console.log("👁️ Visibility panel disabled");
    }
    
    // Handle views panel
    if (action === "views") {
      setShowViewsPanel(true);
      console.log("📐 Views panel enabled");
      return;
    }
    
    if (showViewsPanel && action !== "views") {
      setShowViewsPanel(false);
      console.log("📐 Views panel disabled");
    }
    
    // Handle screenshot
    if (action === "camera") {
      handleScreenshot();
      return;
    }
  }, [
    showCommentPanel,
    isPinMode,
    isDimensionMode,
    isVolumeMode,
    showSearchPanel,
    showSelectionPanel,
    showVisibilityPanel,
    showViewsPanel,
    handleScreenshot,
    onActionChange,
  ]);

  return {
    activeAction,
    setActiveAction,
    handleActionSelect,
    handleScreenshot,
    showCommentPanel,
    setShowCommentPanel,
    showSearchPanel,
    setShowSearchPanel,
    showSelectionPanel,
    setShowSelectionPanel,
    showVisibilityPanel,
    setShowVisibilityPanel,
    showViewsPanel,
    setShowViewsPanel,
    isPinMode,
    setIsPinMode,
    isDimensionMode,
    setIsDimensionMode,
    isVolumeMode,
    setIsVolumeMode,
    isScissorsMode,
    setIsScissorsMode,
    isAddSectionMode,
    setIsAddSectionMode,
  };
}
