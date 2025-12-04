import { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import * as OBC from 'openbim-components';
import { usePinsAPI } from './usePinsAPI';
import { useProject } from './useProject';

export interface PinColors {
  name: string;
  color: string;
}

export interface OriginalColorData {
  fragmentId: string;
  instanceIndex: number;
  color: { r: number; g: number; b: number };
}

/**
 * Custom hook for managing pin functionality
 * Handles pinning/unpinning elements with color selection
 * Integrates with backend API
 */
export function usePins() {
  const { projectId } = useProject();
  const [isPinMode, setIsPinMode] = useState(false);
  const [selectedPinColor, setSelectedPinColor] = useState("#000000");
  
  // Use API hook for backend integration
  const { pinnedElements, pinElement: apiPinElement, unpinElement: apiUnpinElement, updatePinColor: apiUpdatePinColor } = usePinsAPI();
  
  const isPinModeRef = useRef(isPinMode);
  const selectedPinColorRef = useRef(selectedPinColor);
  const pinnedElementsRef = useRef<Map<string, string>>(new Map());
  const originalColorsRef = useRef<Map<string, OriginalColorData>>(new Map());

  // Synchronize refs with state
  useEffect(() => {
    isPinModeRef.current = isPinMode;
  }, [isPinMode]);

  useEffect(() => {
    selectedPinColorRef.current = selectedPinColor;
  }, [selectedPinColor]);

  useEffect(() => {
    pinnedElementsRef.current = pinnedElements;
    console.log('📌 PinnedElements ref updated:', {
      size: pinnedElements.size,
      entries: Array.from(pinnedElements.entries())
    });
  }, [pinnedElements]);

  const pinColors: PinColors[] = [
    { name: "Czarny", color: "#000000" },
    { name: "Biały", color: "#FFFFFF" },
  ];

  /**
   * Handle pinning/unpinning an element
   */
  const handlePinElement = async (
    selection: any,
    highlighter: OBC.FragmentHighlighter,
    viewer: OBC.Components,
    elementIdStr: string
  ) => {
    if (!isPinModeRef.current) return;

    const normalizedColor = selectedPinColorRef.current.trim().toUpperCase();
    const styleName = (normalizedColor === "#000000" || normalizedColor === "000000") 
      ? "pin-black" 
      : "pin-white";
    
    const currentStyle = pinnedElementsRef.current.get(elementIdStr);
    
    console.log(`📌 handlePinElement for ${elementIdStr}:`, {
      currentStyle,
      newStyle: styleName,
      isPinned: !!currentStyle,
      shouldUnpin: currentStyle === styleName,
      refSize: pinnedElementsRef.current.size,
      allPinned: Array.from(pinnedElementsRef.current.entries())
    });

    if (currentStyle) {
      if (currentStyle === styleName) {
        // Unpin element
        console.log(`📌 Unpinning element ${elementIdStr} (same style)`);
        await unpinElement(selection, highlighter, viewer, elementIdStr);
      } else {
        // Repin with different color
        console.log(`📌 Repinning element ${elementIdStr} from ${currentStyle} to ${styleName}`);
        await repinElement(selection, highlighter, viewer, elementIdStr, styleName);
      }
    } else {
      // Pin element
      console.log(`📌 Pinning element ${elementIdStr} with style ${styleName}`);
      await pinElement(selection, highlighter, viewer, elementIdStr, styleName);
    }
  };

  /**
   * Pin an element with selected color
   */
  const pinElement = async (
    selection: any,
    highlighter: OBC.FragmentHighlighter,
    viewer: OBC.Components,
    elementIdStr: string,
    styleName: string
  ) => {
    const targetColor = styleName === "pin-black" ? 0x000000 : 0xFFFFFF;

    try {
      for (const fragID of Object.keys(selection)) {
        const instanceIDs = selection[fragID];
        const scene = viewer.scene?.get();
        
        if (scene) {
          scene.traverse((child: any) => {
            if (child.fragment && child.fragment.id === fragID) {
              const mesh = child.fragment.mesh;
              const fragment = child.fragment;
              
              if (mesh && mesh.material && mesh instanceof THREE.InstancedMesh) {
                const fragmentIds = getFragmentIds(fragment);
                
                // Initialize instanceColor if needed
                if (!mesh.instanceColor) {
                  initializeInstanceColor(mesh);
                }
                
                // Pin instances
                const instanceIDsArray = Array.from(instanceIDs);
                instanceIDsArray.forEach((expressID: number) => {
                  const instanceIndex = fragmentIds.indexOf(expressID);
                  if (instanceIndex === -1) return;
                  
                  // Save original color
                  if (!originalColorsRef.current.has(elementIdStr)) {
                    saveOriginalColor(mesh, instanceIndex, elementIdStr, fragID);
                  }
                  
                  // Set pin color
                  const color = new THREE.Color(targetColor);
                  mesh.setColorAt(instanceIndex, color);
                });
                
                // Update material
                updateMaterialForVertexColors(mesh);
                
                if (mesh.instanceColor) {
                  mesh.instanceColor.needsUpdate = true;
                }
              }
            }
          });
        }
      }
      
      // Update via API (this will update pinnedElements state)
      await apiPinElement(elementIdStr, selectedPinColorRef.current);
      
      // Also manually update ref immediately for synchronous access
      pinnedElementsRef.current.set(elementIdStr, styleName);
      console.log(`✅ Pinned element ${elementIdStr} with style ${styleName}, added to ref`);
    } catch (e) {
      console.error('❌ Error pinning element:', e);
    }
  };

  /**
   * Unpin an element (restore original color)
   */
  const unpinElement = async (
    selection: any,
    highlighter: OBC.FragmentHighlighter,
    viewer: OBC.Components,
    elementIdStr: string
  ) => {
    // Don't use highlighter.clear() - we manually restore colors
    // await highlighter.clear(pinnedElementsRef.current.get(elementIdStr) || "", selection);

    try {
      for (const fragID of Object.keys(selection)) {
        const instanceIDs = selection[fragID];
        const scene = viewer.scene?.get();
        
        if (scene) {
          scene.traverse((child: any) => {
            if (child.fragment && child.fragment.id === fragID) {
              const mesh = child.fragment.mesh;
              
              if (mesh && mesh.material && mesh instanceof THREE.InstancedMesh) {
                const fragment = child.fragment;
                const fragmentIds = getFragmentIds(fragment);
                const instanceIDsArray = Array.from(instanceIDs);
                
                instanceIDsArray.forEach((expressID: number) => {
                  const instanceIndex = fragmentIds.indexOf(expressID);
                  if (instanceIndex === -1) {
                    console.warn(`⚠️ Cannot unpin: ExpressID ${expressID} not found in fragment.ids!`);
                    return;
                  }
                  
                  // Restore original color
                  const originalColorData = originalColorsRef.current.get(elementIdStr);
                  console.log(`📌 Unpinning element ${elementIdStr}:`, {
                    hasOriginalColor: !!originalColorData,
                    originalColor: originalColorData?.color,
                    instanceIndex,
                    expressID
                  });
                  
                  if (originalColorData) {
                    const originalColor = new THREE.Color(
                      originalColorData.color.r,
                      originalColorData.color.g,
                      originalColorData.color.b
                    );
                    mesh.setColorAt(instanceIndex, originalColor);
                    console.log(`✅ Restored original color for element ${elementIdStr}:`, originalColorData.color);
                    // Don't delete here - we might need it if there are multiple instances
                    // originalColorsRef.current.delete(elementIdStr);
                  } else {
                    // If no original color saved, use white as default
                    const whiteColor = new THREE.Color(0xFFFFFF);
                    mesh.setColorAt(instanceIndex, whiteColor);
                    console.log(`⚠️ No original color saved for element ${elementIdStr}, using white`);
                  }
                });
                
                // Clean up original color after processing all instances
                originalColorsRef.current.delete(elementIdStr);
                
                if (mesh.instanceColor) {
                  mesh.instanceColor.needsUpdate = true;
                }
              }
            }
          });
        }
      }
      
      // Update via API (this will update pinnedElements state)
      await apiUnpinElement(elementIdStr);
      
      // Also manually update ref immediately for synchronous access
      pinnedElementsRef.current.delete(elementIdStr);
      console.log(`✅ Unpinned element ${elementIdStr}, removed from ref`);
    } catch (e) {
      console.error('❌ Error unpinning element:', e);
    }
  };

  /**
   * Repin element with different color
   */
  const repinElement = async (
    selection: any,
    highlighter: OBC.FragmentHighlighter,
    viewer: OBC.Components,
    elementIdStr: string,
    styleName: string
  ) => {
    // Don't use highlighter.clear() - we manually set colors directly
    // The original color is already saved, so we can just set the new color
    
    const targetColor = styleName === "pin-black" ? 0x000000 : 0xFFFFFF;

    try {
      for (const fragID of Object.keys(selection)) {
        const instanceIDs = selection[fragID];
        const scene = viewer.scene?.get();
        
        if (scene) {
          scene.traverse((child: any) => {
            if (child.fragment && child.fragment.id === fragID) {
              const mesh = child.fragment.mesh;
              
              if (mesh && mesh.material && mesh instanceof THREE.InstancedMesh) {
                const fragment = child.fragment;
                const fragmentIds = getFragmentIds(fragment);
                
                // Ensure instanceColor exists
                if (!mesh.instanceColor) {
                  initializeInstanceColor(mesh);
                }
                
                const instanceIDsArray = Array.from(instanceIDs);
                instanceIDsArray.forEach((expressID: number) => {
                  const instanceIndex = fragmentIds.indexOf(expressID);
                  if (instanceIndex === -1) return;
                  
                  // Set new pin color directly
                  const color = new THREE.Color(targetColor);
                  mesh.setColorAt(instanceIndex, color);
                });
                
                updateMaterialForVertexColors(mesh);
                
                if (mesh.instanceColor) {
                  mesh.instanceColor.needsUpdate = true;
                }
              }
            }
          });
        }
      }
      
      // Update via API (this will update pinnedElements state)
      await apiUpdatePinColor(elementIdStr, selectedPinColorRef.current);
      
      // Also manually update ref immediately for synchronous access
      pinnedElementsRef.current.set(elementIdStr, styleName);
      console.log(`✅ Repinned element ${elementIdStr} with style ${styleName}, updated in ref`);
    } catch (e) {
      console.error('❌ Error repinning element:', e);
    }
  };

  // Helper functions
  const getFragmentIds = (fragment: any): number[] => {
    if (!fragment.ids) return [];
    
    if (Array.isArray(fragment.ids)) {
      return fragment.ids;
    } else if (fragment.ids instanceof Set) {
      return Array.from(fragment.ids);
    } else if (fragment.ids instanceof Map) {
      return Array.from(fragment.ids.keys());
    } else if (typeof fragment.ids === 'object') {
      return Object.keys(fragment.ids).map(Number);
    }
    
    return [];
  };

  const initializeInstanceColor = (mesh: THREE.InstancedMesh) => {
    const count = mesh.count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      colors[i * 3] = 1;
      colors[i * 3 + 1] = 1;
      colors[i * 3 + 2] = 1;
    }
    mesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
    mesh.instanceColor.needsUpdate = true;
  };

  const saveOriginalColor = (
    mesh: THREE.InstancedMesh,
    instanceIndex: number,
    elementIdStr: string,
    fragID: string
  ) => {
    let originalR = 1, originalG = 1, originalB = 1;
    
    if (mesh.instanceColor) {
      const colorArray = mesh.instanceColor.array as Float32Array;
      originalR = colorArray[instanceIndex * 3];
      originalG = colorArray[instanceIndex * 3 + 1];
      originalB = colorArray[instanceIndex * 3 + 2];
      
      // If color is black (0,0,0), it's likely uninitialized - use white as default
      if (originalR === 0 && originalG === 0 && originalB === 0) {
        originalR = 1;
        originalG = 1;
        originalB = 1;
        console.log(`📌 Element ${elementIdStr} had uninitialized color (black), using white as original`);
      }
    }
    
    const colorData = {
      fragmentId: fragID,
      instanceIndex: instanceIndex,
      color: { r: originalR, g: originalG, b: originalB }
    };
    
    originalColorsRef.current.set(elementIdStr, colorData);
    console.log(`📌 Saved original color for element ${elementIdStr}:`, colorData.color);
  };

  const updateMaterialForVertexColors = (mesh: THREE.InstancedMesh) => {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((mat: any) => {
      if (mat) {
        mat.vertexColors = THREE.VertexColors;
        mat.needsUpdate = true;
      }
    });
  };

  return {
    isPinMode,
    setIsPinMode,
    selectedPinColor,
    setSelectedPinColor,
    pinnedElements,
    pinColors,
    handlePinElement,
    isPinModeRef,
  };
}
