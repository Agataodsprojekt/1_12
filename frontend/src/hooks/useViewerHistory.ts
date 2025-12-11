import { useState, useCallback, useRef } from "react";
import * as THREE from "three";

interface CameraState {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  timestamp: number;
}

export function useViewerHistory() {
  const [history, setHistory] = useState<CameraState[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const isApplyingHistory = useRef(false);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  const saveCameraState = useCallback(
    (position: THREE.Vector3, target: THREE.Vector3) => {
      // Prevent saving state when applying undo/redo
      if (isApplyingHistory.current) {
        return;
      }

      const newState: CameraState = {
        position: { x: position.x, y: position.y, z: position.z },
        target: { x: target.x, y: target.y, z: target.z },
        timestamp: Date.now(),
      };

      setHistory((prev) => {
        // Remove any states after current index (if we made changes after undo)
        const newHistory = prev.slice(0, currentIndex + 1);
        // Add new state
        newHistory.push(newState);
        // Limit history size to 50 states
        if (newHistory.length > 50) {
          newHistory.shift();
          return newHistory;
        }
        return newHistory;
      });

      setCurrentIndex((prev) => {
        const newIndex = Math.min(prev + 1, 49);
        return newIndex;
      });
    },
    [currentIndex]
  );

  const undo = useCallback(() => {
    if (!canUndo) return null;

    const newIndex = currentIndex - 1;
    setCurrentIndex(newIndex);
    return history[newIndex];
  }, [canUndo, currentIndex, history]);

  const redo = useCallback(() => {
    if (!canRedo) return null;

    const newIndex = currentIndex + 1;
    setCurrentIndex(newIndex);
    return history[newIndex];
  }, [canRedo, currentIndex, history]);

  const setApplyingHistory = useCallback((value: boolean) => {
    isApplyingHistory.current = value;
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setCurrentIndex(-1);
  }, []);

  return {
    saveCameraState,
    undo,
    redo,
    canUndo,
    canRedo,
    setApplyingHistory,
    clearHistory,
    historyLength: history.length,
    currentIndex,
  };
}
