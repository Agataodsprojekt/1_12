import { useRef, useEffect } from "react";
import ActionBar from "./ActionBar";
import { useViewer3D } from "../hooks/useViewer3D";

interface Viewer3DProps {
  onActionSelect?: (action: string) => void;
  children?: React.ReactNode;
}

/**
 * Main 3D viewer container component
 * Handles viewer initialization and provides container for 3D canvas
 */
export function Viewer3D({ onActionSelect, children }: Viewer3DProps) {
  const { viewerRef, viewerContainerRef, state } = useViewer3D();

  return (
    <div 
      ref={viewerContainerRef} 
      style={{ 
        width: '100%', 
        flex: 1, 
        position: 'relative',
        touchAction: 'none', // Important for camera controls
        overflow: 'visible',
        minHeight: 0,
      }}
    >
      <ActionBar onActionSelect={onActionSelect} />
      {children}
    </div>
  );
}
