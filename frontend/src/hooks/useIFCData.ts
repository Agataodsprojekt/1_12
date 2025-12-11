/**
 * Hook for managing IFC data from backend
 * Handles elements, costs, loading states, errors, and visibility controls
 */

import { useState, useCallback } from 'react';
import { IFCElement, Costs, ParseResponse } from '../types/ifc';

export function useIFCData() {
  const [elements, setElements] = useState<IFCElement[]>([]);
  const [costs, setCosts] = useState<Costs | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visibleTypes, setVisibleTypes] = useState<Record<string, boolean>>({});

  const handleParsed = useCallback((data: ParseResponse) => {
    const elementsArray = Array.isArray(data.elements) ? data.elements : [];
    setElements(elementsArray);
    setCosts(data.costs);
    setError(null);

    // Initialize visible types - all visible by default
    const types: Record<string, boolean> = {};
    elementsArray.forEach((element) => {
      const typeName = element.type_name || 'Unknown';
      if (!types[typeName]) {
        types[typeName] = true; // All types visible by default
      }
    });
    setVisibleTypes(types);
  }, []);

  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setElements([]);
    setVisibleTypes({});
    setCosts(null);
  }, []);

  const handleTypeVisibilityChange = useCallback((typeName: string, visible: boolean) => {
    setVisibleTypes((prev) => ({
      ...prev,
      [typeName]: visible,
    }));
  }, []);

  const showAllTypes = useCallback(() => {
    setVisibleTypes((prev) => {
      const allVisible: Record<string, boolean> = {};
      Object.keys(prev).forEach((type) => {
        allVisible[type] = true;
      });
      return allVisible;
    });
  }, []);

  const hideAllTypes = useCallback(() => {
    setVisibleTypes((prev) => {
      const allHidden: Record<string, boolean> = {};
      Object.keys(prev).forEach((type) => {
        allHidden[type] = false;
      });
      return allHidden;
    });
  }, []);

  const clear = useCallback(() => {
    setElements([]);
    setCosts(null);
    setError(null);
    setVisibleTypes({});
  }, []);

  return {
    elements,
    costs,
    isLoading,
    error,
    visibleTypes,
    setIsLoading,
    handleParsed,
    handleError,
    handleTypeVisibilityChange,
    showAllTypes,
    hideAllTypes,
    clear,
  };
}

