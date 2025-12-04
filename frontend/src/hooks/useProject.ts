import { useState, useEffect } from 'react';

/**
 * Hook for managing current project ID
 * In the future, this could be loaded from URL params, localStorage, or user selection
 */
export function useProject() {
  const [projectId, setProjectId] = useState<string>('default-project');

  // Load project ID from localStorage on mount
  useEffect(() => {
    const savedProjectId = localStorage.getItem('currentProjectId');
    if (savedProjectId) {
      setProjectId(savedProjectId);
    }
  }, []);

  // Save project ID to localStorage when it changes
  useEffect(() => {
    if (projectId) {
      localStorage.setItem('currentProjectId', projectId);
    }
  }, [projectId]);

  return {
    projectId,
    setProjectId,
  };
}
