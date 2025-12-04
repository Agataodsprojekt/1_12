import { useState, useCallback, useEffect } from 'react';
import { api, View } from '../lib/api';
import { useProject } from './useProject';

/**
 * Hook for managing views with backend integration
 * Syncs view state with backend API
 */
export function useViewsAPI() {
  const { projectId } = useProject();
  const [views, setViews] = useState<View[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [useBackend, setUseBackend] = useState(true);

  // Load views from backend on mount
  useEffect(() => {
    if (useBackend && projectId) {
      loadViewsFromBackend();
    }
  }, [projectId, useBackend]);

  const loadViewsFromBackend = useCallback(async () => {
    try {
      setIsLoading(true);
      const loadedViews = await api.views.getAll(projectId);
      setViews(loadedViews);
    } catch (error) {
      console.warn('⚠️ Failed to load views from backend:', error);
      setUseBackend(false);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const createView = useCallback(async (
    name: string,
    type: 'storey' | 'elevation' | 'section',
    data: any
  ): Promise<View> => {
    try {
      const newView = await api.views.create(projectId, name, type, data);
      setViews((prev) => [...prev, newView]);
      return newView;
    } catch (error) {
      console.warn('⚠️ Failed to create view in backend:', error);
      setUseBackend(false);
      // Fallback: create local view
      const localView: View = {
        id: `view-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        project_id: projectId,
        name,
        type,
        data,
        created_at: new Date().toISOString(),
      };
      setViews((prev) => [...prev, localView]);
      return localView;
    }
  }, [projectId]);

  const updateView = useCallback(async (viewId: string, viewData: Partial<View>): Promise<View> => {
    try {
      const updatedView = await api.views.update(viewId, viewData);
      setViews((prev) => prev.map((v) => (v.id === viewId ? updatedView : v)));
      return updatedView;
    } catch (error: any) {
      // If view doesn't exist (404), it's likely a locally created view
      // Just update locally without logging as error
      if (error?.response?.status === 404) {
        // View doesn't exist in backend - update locally only
        setViews((prev) =>
          prev.map((v) =>
            v.id === viewId ? { ...v, ...viewData, updated_at: new Date().toISOString() } : v
          )
        );
        return views.find((v) => v.id === viewId) || { id: viewId, ...viewData } as View;
      }
      
      // For other errors, log as warning
      console.warn('⚠️ Failed to update view in backend:', error);
      setUseBackend(false);
      // Fallback: update local view
      setViews((prev) =>
        prev.map((v) =>
          v.id === viewId ? { ...v, ...viewData, updated_at: new Date().toISOString() } : v
        )
      );
      return views.find((v) => v.id === viewId)!;
    }
  }, [projectId, views]);

  const deleteView = useCallback(async (viewId: string): Promise<void> => {
    try {
      await api.views.delete(viewId);
      setViews((prev) => prev.filter((v) => v.id !== viewId));
    } catch (error) {
      console.warn('⚠️ Failed to delete view from backend:', error);
      setUseBackend(false);
      // Fallback: delete local view
      setViews((prev) => prev.filter((v) => v.id !== viewId));
    }
  }, [projectId]);

  return {
    views,
    createView,
    updateView,
    deleteView,
    isLoading,
    reload: loadViewsFromBackend,
  };
}
