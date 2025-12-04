import { useState, useCallback, useEffect } from 'react';
import { api, Selection } from '../lib/api';
import { useProject } from './useProject';

/**
 * Hook for managing selections with backend integration
 * Syncs selection state with backend API
 */
export function useSelectionsAPI() {
  const { projectId } = useProject();
  const [selections, setSelections] = useState<Selection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [useBackend, setUseBackend] = useState(true);

  // Load selections from backend on mount
  useEffect(() => {
    if (useBackend && projectId) {
      loadSelectionsFromBackend();
    }
  }, [projectId, useBackend]);

  const loadSelectionsFromBackend = useCallback(async () => {
    try {
      setIsLoading(true);
      const loadedSelections = await api.selections.getAll(projectId);
      setSelections(loadedSelections);
    } catch (error) {
      console.warn('⚠️ Failed to load selections from backend:', error);
      setUseBackend(false);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const createSelection = useCallback(async (
    name: string,
    elementIds: string[],
    metadata?: any
  ): Promise<Selection> => {
    try {
      const newSelection = await api.selections.create(projectId, name, elementIds, metadata);
      setSelections((prev) => [...prev, newSelection]);
      return newSelection;
    } catch (error) {
      console.warn('⚠️ Failed to create selection in backend:', error);
      setUseBackend(false);
      // Fallback: create local selection
      const localSelection: Selection = {
        id: `selection-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        project_id: projectId,
        name,
        element_ids: elementIds,
        metadata,
        created_at: new Date().toISOString(),
      };
      setSelections((prev) => [...prev, localSelection]);
      return localSelection;
    }
  }, [projectId]);

  const isolateSelection = useCallback(async (selectionId: string): Promise<void> => {
    try {
      await api.selections.isolate(selectionId);
    } catch (error) {
      console.warn('⚠️ Failed to isolate selection in backend:', error);
      setUseBackend(false);
    }
  }, []);

  const showSelection = useCallback(async (selectionId: string): Promise<void> => {
    try {
      await api.selections.show(selectionId);
    } catch (error) {
      console.warn('⚠️ Failed to show selection in backend:', error);
      setUseBackend(false);
    }
  }, []);

  const hideSelection = useCallback(async (selectionId: string): Promise<void> => {
    try {
      await api.selections.hide(selectionId);
    } catch (error) {
      console.warn('⚠️ Failed to hide selection in backend:', error);
      setUseBackend(false);
    }
  }, []);

  return {
    selections,
    createSelection,
    isolateSelection,
    showSelection,
    hideSelection,
    isLoading,
    reload: loadSelectionsFromBackend,
  };
}
