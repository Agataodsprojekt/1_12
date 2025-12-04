import { useState, useCallback, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { useProject } from './useProject';

/**
 * Hook for managing pins with backend integration
 * Syncs pin state with backend API
 */
export function usePinsAPI() {
  const { projectId } = useProject();
  const [pinnedElements, setPinnedElements] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [useBackend, setUseBackend] = useState(true);
  const isInitializedRef = useRef(false);

  // Load pins from backend on mount
  useEffect(() => {
    if (useBackend && projectId && !isInitializedRef.current) {
      loadPinsFromBackend();
      isInitializedRef.current = true;
    }
  }, [projectId, useBackend]);

  const loadPinsFromBackend = useCallback(async () => {
    try {
      setIsLoading(true);
      const pins = await api.pins.getAll(projectId);
      
      const pinsMap = new Map<string, string>();
      pins.forEach((pin) => {
        pinsMap.set(pin.element_id, pin.color);
      });
      
      setPinnedElements(pinsMap);
    } catch (error) {
      console.warn('⚠️ Failed to load pins from backend:', error);
      setUseBackend(false);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const pinElement = useCallback(async (elementId: string, color: string) => {
    // Optimistic update
    setPinnedElements((prev) => {
      const newMap = new Map(prev);
      newMap.set(elementId, color);
      return newMap;
    });

    // Save to backend
    if (useBackend && projectId) {
      try {
        await api.pins.create(projectId, elementId, color);
      } catch (error) {
        console.warn('⚠️ Failed to save pin to backend:', error);
        setUseBackend(false);
        // Revert optimistic update
        setPinnedElements((prev) => {
          const newMap = new Map(prev);
          newMap.delete(elementId);
          return newMap;
        });
      }
    }
  }, [projectId, useBackend]);

  const unpinElement = useCallback(async (elementId: string) => {
    // Optimistic update
    setPinnedElements((prev) => {
      const newMap = new Map(prev);
      newMap.delete(elementId);
      return newMap;
    });

    // Delete from backend
    if (useBackend && projectId) {
      try {
        await api.pins.delete(projectId, elementId);
      } catch (error) {
        console.warn('⚠️ Failed to delete pin from backend:', error);
        setUseBackend(false);
      }
    }
  }, [projectId, useBackend]);

  const updatePinColor = useCallback(async (elementId: string, color: string) => {
    // Optimistic update
    setPinnedElements((prev) => {
      const newMap = new Map(prev);
      newMap.set(elementId, color);
      return newMap;
    });

    // Update in backend
    if (useBackend && projectId) {
      try {
        await api.pins.update(projectId, elementId, color);
      } catch (error) {
        console.warn('⚠️ Failed to update pin in backend:', error);
        setUseBackend(false);
      }
    }
  }, [projectId, useBackend]);

  return {
    pinnedElements,
    pinElement,
    unpinElement,
    updatePinColor,
    isLoading,
    reload: loadPinsFromBackend,
  };
}
