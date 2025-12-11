import { useEffect, useRef, useState } from "react";
import * as OBC from "openbim-components";
import * as THREE from "three";
import { useTheme } from "../contexts/ThemeContext";

export interface Viewer3DState {
  viewer: OBC.Components | null;
  scene: THREE.Scene | null;
  camera: THREE.Camera | null;
  renderer: THREE.WebGLRenderer | null;
  isInitialized: boolean;
}

export interface UseViewer3DReturn {
  viewerRef: React.RefObject<OBC.Components | null>;
  viewerContainerRef: React.RefObject<HTMLDivElement>;
  state: Viewer3DState;
  initialize: () => void;
  dispose: () => void;
}

/**
 * Hook for managing 3D viewer initialization and lifecycle
 * Handles OBC.Components setup, scene, camera, renderer, and lighting
 */
export function useViewer3D(): UseViewer3DReturn {
  const viewerRef = useRef<OBC.Components | null>(null);
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<Viewer3DState>({
    viewer: null,
    scene: null,
    camera: null,
    renderer: null,
    isInitialized: false,
  });
  const { theme } = useTheme();

  const initialize = () => {
    if (!viewerContainerRef.current || viewerRef.current) {
      return;
    }

    try {
      // Create main viewer
      const viewer = new OBC.Components();
      viewerRef.current = viewer;

      // Scene
      const sceneComponent = new OBC.SimpleScene(viewer);
      viewer.scene = sceneComponent;
      const scene = sceneComponent.get();

      // Lighting
      const ambientLight = new THREE.AmbientLight(0xE6E7E4, 1);
      const directionalLight = new THREE.DirectionalLight(0xF9F9F9, 0.75);
      directionalLight.position.set(10, 50, 10);
      scene.add(ambientLight, directionalLight);
      
      // Set initial background (will be updated by theme effect)
      scene.background = new THREE.Color(0x202932);

      // Renderer
      const rendererComponent = new OBC.PostproductionRenderer(viewer, viewerContainerRef.current);
      viewer.renderer = rendererComponent;
      
      // Enable local clipping for section views
      try {
        const threeRenderer = rendererComponent.get();
        if (threeRenderer && threeRenderer.localClippingEnabled !== undefined) {
          threeRenderer.localClippingEnabled = true;
          console.log('✅ Enabled local clipping in renderer');
        }
      } catch (e) {
        console.warn('⚠️ Could not enable local clipping:', e);
      }

      // Camera
      const cameraComponent = new OBC.OrthoPerspectiveCamera(viewer);
      viewer.camera = cameraComponent;
      
      if (cameraComponent.controls) {
        cameraComponent.controls.enabled = true;
        console.log("📷 Camera controls enabled");
      }

      // Raycaster
      const raycasterComponent = new OBC.SimpleRaycaster(viewer);
      viewer.raycaster = raycasterComponent;

      // Grid
      const gridComponent = new OBC.SimpleGrid(viewer, new THREE.GridHelper(10, 10));
      viewer.grid = gridComponent;

      // Initialize viewer
      viewer.init();

      // Update state
      const threeRenderer = rendererComponent.get();
      const threeCamera = cameraComponent.get();
      
      setState({
        viewer,
        scene,
        camera: threeCamera,
        renderer: threeRenderer,
        isInitialized: true,
      });

      console.log('✅ Viewer3D initialized');
    } catch (error) {
      console.error('❌ Error initializing Viewer3D:', error);
    }
  };

  const dispose = () => {
    if (viewerRef.current) {
      try {
        viewerRef.current.dispose();
        viewerRef.current = null;
        setState({
          viewer: null,
          scene: null,
          camera: null,
          renderer: null,
          isInitialized: false,
        });
        console.log('✅ Viewer3D disposed');
      } catch (error) {
        console.error('❌ Error disposing Viewer3D:', error);
      }
    }
  };

  // Initialize on mount
  useEffect(() => {
    initialize();

    return () => {
      dispose();
    };
  }, []);

  // Update scene background based on theme
  useEffect(() => {
    if (!state.scene) return;

    if (theme === 'dark') {
      state.scene.background = new THREE.Color(0x202932);
    } else {
      state.scene.background = new THREE.Color(0xE6E7E4);
    }
  }, [theme, state.scene]);

  return {
    viewerRef,
    viewerContainerRef,
    state,
    initialize,
    dispose,
  };
}
