import { createContext, useContext, ReactNode } from 'react';
import * as OBC from 'openbim-components';
import * as THREE from 'three';

interface ViewerContextType {
  viewer: OBC.Components | null;
  scene: THREE.Scene | null;
  camera: THREE.Camera | null;
  viewerContainerRef: React.RefObject<HTMLDivElement>;
}

const ViewerContext = createContext<ViewerContextType | undefined>(undefined);

export function ViewerProvider({
  children,
  viewer,
  scene,
  camera,
  viewerContainerRef,
}: {
  children: ReactNode;
  viewer: OBC.Components | null;
  scene: THREE.Scene | null;
  camera: THREE.Camera | null;
  viewerContainerRef: React.RefObject<HTMLDivElement>;
}) {
  return (
    <ViewerContext.Provider value={{ viewer, scene, camera, viewerContainerRef }}>
      {children}
    </ViewerContext.Provider>
  );
}

export function useViewerContext() {
  const context = useContext(ViewerContext);
  if (context === undefined) {
    throw new Error('useViewerContext must be used within ViewerProvider');
  }
  return context;
}
