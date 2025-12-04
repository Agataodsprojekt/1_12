import { useState, useRef, useCallback, useEffect } from "react";
import * as THREE from "three";
import * as OBC from "openbim-components";
import { SimpleDimensionTool } from "../utils/SimpleDimensionTool";
import { SimpleVolumeTool } from "../utils/SimpleVolumeTool";
import { ViewsManager } from "../utils/views";
import { usePins, PinColors } from "./usePins";
import { useMeasurementsAPI } from "./useMeasurementsAPI";

export interface UseViewerToolsOptions {
  viewerRef: React.RefObject<OBC.Components | null>;
  viewerContainerRef: React.RefObject<HTMLDivElement>;
  scene: THREE.Scene | null;
  camera: THREE.Camera | null;
  viewsManagerRef: React.RefObject<ViewsManager | null>;
  loadedModelsRef: React.RefObject<any[]>;
  modelObjectsRef: React.RefObject<THREE.Object3D[]>;
  onActionSave?: (action: { type: string; data: any; timestamp: number }) => void;
}

export interface UseViewerToolsReturn {
  // Dimension tool
  dimensionsRef: React.RefObject<SimpleDimensionTool | null>;
  dimensionOrthogonal: boolean;
  dimensionSnap: boolean;
  alignToEdgeMode: 'none' | 'parallel' | 'perpendicular';
  setDimensionOrthogonal: (enabled: boolean) => void;
  setDimensionSnap: (enabled: boolean) => void;
  setAlignToEdgeMode: (mode: 'none' | 'parallel' | 'perpendicular') => void;
  
  // Volume tool
  volumeMeasurerRef: React.RefObject<SimpleVolumeTool | null>;
  
  // Scissors tool
  isScissorsMode: boolean;
  setIsScissorsMode: (enabled: boolean) => void;
  scissorsPointsRef: React.RefObject<THREE.Vector3[]>;
  scissorsPreviewLineRef: React.RefObject<THREE.Line | null>;
  
  // Add section tool
  isAddSectionMode: boolean;
  setIsAddSectionMode: (enabled: boolean) => void;
  
  // Pins
  isPinMode: boolean;
  setIsPinMode: (enabled: boolean) => void;
  selectedPinColor: string;
  setSelectedPinColor: (color: string) => void;
  pinColors: PinColors[];
  handlePinElement: (
    selection: any,
    highlighter: OBC.FragmentHighlighter,
    viewer: OBC.Components,
    elementIdStr: string
  ) => Promise<void>;
  isPinModeRef: React.RefObject<boolean>;
  
  // Event handlers
  handleDimensionClickWithDelete: (event: MouseEvent) => void;
  handleDimensionMove: (event: MouseEvent) => void;
  handleScissorsClick: (event: MouseEvent) => Promise<void>;
  handleScissorsMouseMove: (event: MouseEvent) => void;
  handleAddSectionClick: (event: MouseEvent) => Promise<void>;
  handleKeyDown: (event: KeyboardEvent) => void;
  handleKeyUp: (event: KeyboardEvent) => void;
  isCtrlPressedRef: React.RefObject<boolean>;
  
  // Initialization
  initializeTools: () => void;
}

/**
 * Hook for managing viewer tools (dimension, volume, scissors, pins)
 * Handles tool initialization, state management, and event handlers
 */
export function useViewerTools(options: UseViewerToolsOptions): UseViewerToolsReturn {
  const {
    viewerRef,
    viewerContainerRef,
    scene,
    camera,
    viewsManagerRef,
    loadedModelsRef,
    modelObjectsRef,
    onActionSave,
  } = options;

  // Dimension tool
  const dimensionsRef = useRef<SimpleDimensionTool | null>(null);
  const [dimensionOrthogonal, setDimensionOrthogonal] = useState(false);
  const [dimensionSnap, setDimensionSnap] = useState(true);
  const [alignToEdgeMode, setAlignToEdgeMode] = useState<'none' | 'parallel' | 'perpendicular'>('none');

  // Volume tool
  const volumeMeasurerRef = useRef<SimpleVolumeTool | null>(null);

  // Scissors tool
  const [isScissorsMode, setIsScissorsMode] = useState(false);
  const isScissorsModeRef = useRef(false);
  const scissorsPointsRef = useRef<THREE.Vector3[]>([]);
  const scissorsPreviewLineRef = useRef<THREE.Line | null>(null);

  // Add section tool
  const [isAddSectionMode, setIsAddSectionMode] = useState(false);
  const isAddSectionModeRef = useRef(false);

  // Pins
  const {
    isPinMode,
    setIsPinMode,
    selectedPinColor,
    setSelectedPinColor,
    pinColors,
    handlePinElement,
    isPinModeRef,
  } = usePins();

  // Measurements API
  const measurementsAPI = useMeasurementsAPI();

  // Sync refs with state
  useEffect(() => {
    isScissorsModeRef.current = isScissorsMode;
  }, [isScissorsMode]);

  useEffect(() => {
    isAddSectionModeRef.current = isAddSectionMode;
  }, [isAddSectionMode]);

  // Initialize tools
  const initializeTools = useCallback(() => {
    if (!scene || !camera) return;

    // Initialize dimension tool
    if (!dimensionsRef.current) {
      const dimensions = new SimpleDimensionTool(scene, camera);
      dimensionsRef.current = dimensions;

      // Setup dimension callback
      dimensions.onMeasurementCreated = async (dimensionData) => {
        const action = {
          type: 'dimension_add',
          data: dimensionData,
          timestamp: Date.now(),
        };
        onActionSave?.(action);
        console.log('📏 Dimension saved to history');

        // Save to backend API
        try {
          await measurementsAPI.calculateDimension(dimensionData.start, dimensionData.end);
          console.log('✅ Dimension saved to backend');
        } catch (error) {
          console.warn('⚠️ Failed to save dimension to backend:', error);
        }
      };
    }

    // Initialize volume tool
    if (!volumeMeasurerRef.current) {
      const volumeMeasurer = new SimpleVolumeTool(scene, camera);
      volumeMeasurer.enabled = false;
      volumeMeasurer.visible = true;
      volumeMeasurer.color = new THREE.Color("#494cb6");
      volumeMeasurerRef.current = volumeMeasurer;
      console.log('✅ SimpleVolumeTool initialized');
    }
  }, [scene, camera, onActionSave, measurementsAPI]);

  // Dimension options sync
  useEffect(() => {
    if (dimensionsRef.current) {
      dimensionsRef.current.orthogonalMode = dimensionOrthogonal;
      console.log('📏 Orthogonal mode:', dimensionOrthogonal);
    }
  }, [dimensionOrthogonal]);

  useEffect(() => {
    if (dimensionsRef.current) {
      dimensionsRef.current.snapToPoints = dimensionSnap;
      console.log('📏 Snap to points:', dimensionSnap);
    }
  }, [dimensionSnap]);

  useEffect(() => {
    if (dimensionsRef.current) {
      dimensionsRef.current.alignToEdgeMode = alignToEdgeMode;
      dimensionsRef.current.resetReferenceEdge();
      console.log('📏 Align to edge mode:', alignToEdgeMode);
    }
  }, [alignToEdgeMode]);

  // Scissors tool handlers
  const handleScissorsClick = useCallback(async (event: MouseEvent) => {
    if (!isScissorsModeRef.current || !viewerContainerRef.current || !viewsManagerRef.current || !camera) return;

    // Ignore if dimension mode is active
    if (dimensionsRef.current?.enabled && event.shiftKey) return;

    event.preventDefault();
    event.stopPropagation();

    try {
      const canvas = viewerContainerRef.current.querySelector('canvas');
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mouse = new THREE.Vector2();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // Get camera direction
      const cameraDirection = new THREE.Vector3();
      camera.getWorldDirection(cameraDirection);

      // Use raycaster to find intersection point
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      // Get all meshes
      const meshes: THREE.Mesh[] = [];
      for (const model of loadedModelsRef.current || []) {
        for (const item of model.items || []) {
          if (item.mesh && (item.mesh instanceof THREE.Mesh || item.mesh instanceof THREE.InstancedMesh)) {
            meshes.push(item.mesh as THREE.Mesh);
          }
        }
      }

      const intersects = raycaster.intersectObjects(meshes, true);

      let point: THREE.Vector3;
      if (intersects.length > 0) {
        point = intersects[0].point.clone();
      } else {
        // If no intersection, use point on camera plane at fixed distance
        const distance = 10;
        point = new THREE.Vector3();
        raycaster.ray.at(distance, point);
      }

      scissorsPointsRef.current.push(point);
      console.log(`✂️ Scissors: Point ${scissorsPointsRef.current.length} at:`, point);

      // If we have 2 points, create the section
      if (scissorsPointsRef.current.length === 2) {
        const [point1, point2] = scissorsPointsRef.current;

        // Calculate line length for better range
        const lineLength = point1.distanceTo(point2);
        const calculatedRange = Math.max(lineLength * 2, 50);

        console.log('✂️ Line length:', lineLength, 'Calculated range:', calculatedRange);

        // Create section view from two points
        const view = await viewsManagerRef.current.createSectionViewFromPoints(
          point1,
          point2,
          cameraDirection,
          {
            name: `Scissors Section ${viewsManagerRef.current.getAllViews().length + 1}`,
            range: calculatedRange,
            helpersVisible: true
          }
        );

        if (view) {
          console.log('✅ Scissors section created:', view.name);
          setIsScissorsMode(false);

          // Automatically open the view
          try {
            await viewsManagerRef.current.openView(view.id);
            console.log('✅ Scissors section view automatically opened');
          } catch (error) {
            console.error('❌ Error auto-opening view:', error);
          }

          window.dispatchEvent(new CustomEvent('views-updated'));
        }

        // Reset points
        scissorsPointsRef.current = [];
      } else {
        // Update preview line
        updateScissorsPreview();
      }
    } catch (error) {
      console.error('❌ Error in scissors tool:', error);
    }
  }, [camera, viewsManagerRef, loadedModelsRef]);

  const updateScissorsPreview = useCallback((mousePoint?: THREE.Vector3) => {
    if (!viewerRef.current) return;

    const scene = (viewerRef.current.scene as any).get();
    if (!scene) return;

    // Remove old preview
    if (scissorsPreviewLineRef.current) {
      scene.remove(scissorsPreviewLineRef.current);
      scissorsPreviewLineRef.current.geometry.dispose();
      if (scissorsPreviewLineRef.current.material instanceof THREE.Material) {
        scissorsPreviewLineRef.current.material.dispose();
      }
      scissorsPreviewLineRef.current = null;
    }

    // Create new preview line
    if (scissorsPointsRef.current.length === 1 && mousePoint) {
      const points = [scissorsPointsRef.current[0], mousePoint];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 3 });
      const line = new THREE.Line(geometry, material);
      scissorsPreviewLineRef.current = line;
      scene.add(line);
    } else if (scissorsPointsRef.current.length === 2) {
      const geometry = new THREE.BufferGeometry().setFromPoints(scissorsPointsRef.current);
      const material = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 3 });
      const line = new THREE.Line(geometry, material);
      scissorsPreviewLineRef.current = line;
      scene.add(line);
    }
  }, [viewerRef]);

  const handleScissorsMouseMove = useCallback((event: MouseEvent) => {
    if (!isScissorsModeRef.current || !viewerContainerRef.current || scissorsPointsRef.current.length !== 1 || !camera) return;

    try {
      const canvas = viewerContainerRef.current.querySelector('canvas');
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mouse = new THREE.Vector2();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      const meshes: THREE.Mesh[] = [];
      for (const model of loadedModelsRef.current || []) {
        for (const item of model.items || []) {
          if (item.mesh && (item.mesh instanceof THREE.Mesh || item.mesh instanceof THREE.InstancedMesh)) {
            meshes.push(item.mesh as THREE.Mesh);
          }
        }
      }

      const intersects = raycaster.intersectObjects(meshes, true);

      let mousePoint: THREE.Vector3;
      if (intersects.length > 0) {
        mousePoint = intersects[0].point.clone();
      } else {
        const distance = 10;
        mousePoint = new THREE.Vector3();
        raycaster.ray.at(distance, mousePoint);
      }

      updateScissorsPreview(mousePoint);
    } catch (error) {
      // Ignore errors during preview
    }
  }, [camera, loadedModelsRef, updateScissorsPreview]);

  // Add section tool handler
  const handleAddSectionClick = useCallback(async (event: MouseEvent) => {
    if (!isAddSectionModeRef.current || !viewsManagerRef.current || !viewerContainerRef.current || !camera) return;

    // Ignore if dimension mode is active
    if (dimensionsRef.current?.enabled && event.shiftKey) return;

    console.log('🖱️ Add Section mode: Click detected on model');

    try {
      const canvas = viewerContainerRef.current.querySelector('canvas');
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mouse = new THREE.Vector2();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      const meshes: THREE.Mesh[] = [];
      for (const model of loadedModelsRef.current || []) {
        for (const item of model.items || []) {
          if (item.mesh && item.mesh instanceof THREE.Mesh) {
            meshes.push(item.mesh);
          }
        }
      }

      const intersects = raycaster.intersectObjects(meshes, true);

      if (intersects.length > 0) {
        const intersection = intersects[0];
        const point = intersection.point;
        let normal = intersection.face?.normal;

        if (!normal && intersection.object instanceof THREE.Mesh) {
          const geometry = intersection.object.geometry;
          if (geometry && intersection.faceIndex !== undefined && intersection.faceIndex >= 0) {
            const positionAttribute = geometry.getAttribute('position');
            if (positionAttribute) {
              // Calculate normal from face vertices
              const a = intersection.faceIndex * 3;
              const v1 = new THREE.Vector3().fromBufferAttribute(positionAttribute, a);
              const v2 = new THREE.Vector3().fromBufferAttribute(positionAttribute, a + 1);
              const v3 = new THREE.Vector3().fromBufferAttribute(positionAttribute, a + 2);
              normal = new THREE.Vector3().subVectors(v2, v1).cross(new THREE.Vector3().subVectors(v3, v1)).normalize();
            }
          }
        }

        if (normal) {
          normal.transformDirection(intersection.object.matrixWorld);
          normal.normalize();

          const view = await viewsManagerRef.current.createSectionView(normal, point, {
            name: `Section ${viewsManagerRef.current.getAllViews().length + 1}`,
            helpersVisible: true
          });

          if (view) {
            console.log('✅ Section view created:', view.name);
            window.dispatchEvent(new CustomEvent('views-updated'));
          }
        }
      }
    } catch (error) {
      console.error('❌ Error in add section tool:', error);
    }
  }, [camera, viewsManagerRef, loadedModelsRef]);

  // Dimension handlers - refs for local state
  const selectedMeasurementToDeleteRef = useRef<THREE.Group | null>(null);
  const lastClickTimeRef = useRef<number>(0);
  const doubleClickThreshold = 300;

  const handleDimensionMove = useCallback((event: MouseEvent) => {
    // Handle scissors mode preview first
    if (isScissorsModeRef.current) {
      handleScissorsMouseMove(event);
      return;
    }

    if (!dimensionsRef.current?.enabled || (modelObjectsRef.current?.length || 0) === 0) return;

    // Only show preview when Shift is pressed
    if (event.shiftKey) {
      dimensionsRef.current.handleMouseMove(event, modelObjectsRef.current || []);
    } else {
      dimensionsRef.current.clearPreviewAndSnap();
    }
  }, [modelObjectsRef, handleScissorsMouseMove]);

  const handleDimensionClickWithDelete = useCallback((event: MouseEvent) => {
    // Volume mode doesn't use click handler
    if (volumeMeasurerRef.current?.enabled) {
      return;
    }

    // Check scissors mode
    if (isScissorsModeRef.current) {
      handleScissorsClick(event);
      return;
    }

    // Check add section mode
    if (isAddSectionModeRef.current) {
      handleAddSectionClick(event);
      return;
    }

    if (!dimensionsRef.current?.enabled) return;

    // Only react when Shift is pressed
    if (!event.shiftKey) {
      return;
    }

    const currentTime = Date.now();
    const timeSinceLastClick = currentTime - lastClickTimeRef.current;

    // Shift + Double-click = select measurement for deletion
    if (timeSinceLastClick < doubleClickThreshold) {
      console.log('🎯 Shift+Double-click detected - trying to select measurement for deletion');
      event.stopPropagation();
      event.preventDefault();

      if (selectedMeasurementToDeleteRef.current) {
        dimensionsRef.current?.highlightMeasurement(selectedMeasurementToDeleteRef.current, false);
      }

      selectedMeasurementToDeleteRef.current = dimensionsRef.current?.handleRightClick(event, modelObjectsRef.current || []) || null;
      if (selectedMeasurementToDeleteRef.current) {
        console.log('✅ Measurement selected for deletion. Press Delete to remove.');
        dimensionsRef.current?.highlightMeasurement(selectedMeasurementToDeleteRef.current, true);
      } else {
        console.log('❌ No measurement found at click position');
      }

      lastClickTimeRef.current = 0;
      return;
    }

    // Shift + Single click = add dimension point
    lastClickTimeRef.current = currentTime;

    setTimeout(() => {
      if (Date.now() - lastClickTimeRef.current >= doubleClickThreshold && (modelObjectsRef.current?.length || 0) > 0) {
        console.log('➕ Shift+click - adding dimension point');
        dimensionsRef.current?.handleClick(event, modelObjectsRef.current || []);
      }
    }, doubleClickThreshold);
  }, [modelObjectsRef, handleScissorsClick, handleAddSectionClick]);

  // Keyboard handlers
  const isCtrlPressedRef = useRef(false);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Track Ctrl
    if (event.key === 'Control' || event.ctrlKey) {
      isCtrlPressedRef.current = true;
    }

    // Handle volume measurement keys
    if (volumeMeasurerRef.current?.enabled) {
      if (event.code === 'Enter' || event.code === 'NumpadEnter') {
        if (volumeMeasurerRef.current.endCreation) {
          volumeMeasurerRef.current.endCreation();
          console.log('✅ Volume measurement creation ended');
        }
        return;
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        if (volumeMeasurerRef.current.delete) {
          volumeMeasurerRef.current.delete();
          console.log('✅ Volume measurement deleted');
        }
        return;
      } else if (event.key === 'Escape') {
        if (volumeMeasurerRef.current.endCreation) {
          volumeMeasurerRef.current.endCreation();
          console.log('❌ Volume measurement creation canceled');
        }
        return;
      }
    }

    // Handle dimension deletion
    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (selectedMeasurementToDeleteRef.current && dimensionsRef.current) {
        // Save dimension data for undo before deletion
        const dimensionData = dimensionsRef.current.getMeasurementData(selectedMeasurementToDeleteRef.current);
        if (dimensionData && onActionSave) {
          const action = {
            type: 'dimension_delete',
            data: dimensionData,
            timestamp: Date.now(),
          };
          onActionSave(action);
        }
        
        dimensionsRef.current.deleteMeasurement(selectedMeasurementToDeleteRef.current);
        selectedMeasurementToDeleteRef.current = null;
        console.log('✅ Dimension deleted');
      }
    }

    // Handle ESC to cancel dimension
    if (event.key === 'Escape') {
      if (dimensionsRef.current?.enabled) {
        dimensionsRef.current.cancelCurrentMeasurement();
        if (selectedMeasurementToDeleteRef.current) {
          dimensionsRef.current.highlightMeasurement(selectedMeasurementToDeleteRef.current, false);
        }
        selectedMeasurementToDeleteRef.current = null;
        console.log('❌ Dimension creation canceled');
      }
    }
  }, [onActionSave]);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    // Track Ctrl release
    if (event.key === 'Control') {
      isCtrlPressedRef.current = false;
    }
  }, []);

  return {
    // Dimension tool
    dimensionsRef,
    dimensionOrthogonal,
    dimensionSnap,
    alignToEdgeMode,
    setDimensionOrthogonal,
    setDimensionSnap,
    setAlignToEdgeMode,

    // Volume tool
    volumeMeasurerRef,

    // Scissors tool
    isScissorsMode,
    setIsScissorsMode,
    scissorsPointsRef,
    scissorsPreviewLineRef,

    // Add section tool
    isAddSectionMode,
    setIsAddSectionMode,

    // Pins
    isPinMode,
    setIsPinMode,
    selectedPinColor,
    setSelectedPinColor,
    pinColors,
    handlePinElement,
    isPinModeRef,

    // Event handlers
    handleDimensionClickWithDelete,
    handleDimensionMove,
    handleScissorsClick,
    handleScissorsMouseMove,
    handleAddSectionClick,
    handleKeyDown,
    handleKeyUp,
    isCtrlPressedRef,

    // Initialization
    initializeTools,
  };
}
