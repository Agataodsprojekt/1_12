import React, { useState, useEffect, useRef } from 'react';
import { X, Eye, EyeOff, RotateCcw, Layers, GripVertical } from 'lucide-react';
import * as OBC from 'openbim-components';
import { useVisibilityCategories } from '../hooks/useVisibilityCategories';
import { Button } from './ui/button';
import { SimpleHider, ModelIdMap } from '../utils/SimpleHider';

interface VisibilityPanelProps {
  hider: SimpleHider | null;
  fragmentsManager: any | null; // any ponieważ FragmentsManager może mieć inną strukturę
  loadedModels: any[];
  onClose: () => void;
}

export const VisibilityPanel: React.FC<VisibilityPanelProps> = ({
  hider,
  fragmentsManager,
  loadedModels,
  onClose,
}) => {
  const [position, setPosition] = useState({ x: 20, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isIsolating, setIsIsolating] = useState(false);
  const [isHiding, setIsHiding] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const { categories, isLoading, loadCategories, refreshCategories } = useVisibilityCategories({
    fragmentsManager,
    loadedModels,
  });

  // Log fragments manager info on mount
  useEffect(() => {
    if (fragmentsManager) {
      const listSize = fragmentsManager.list?.size || 0;
      console.log('📊 VisibilityPanel: FragmentsManager info:', {
        hasList: !!fragmentsManager.list,
        listSize: listSize,
        loadedModelsCount: loadedModels.length
      });
    } else {
      console.warn('⚠️ VisibilityPanel: FragmentsManager is null');
    }
  }, [fragmentsManager, loadedModels.length]);

  // Load categories when component mounts or models change
  useEffect(() => {
    if (loadedModels.length > 0 && categories.length === 0 && !isLoading) {
      console.log('🔄 VisibilityPanel: Loading categories, models count:', loadedModels.length);
      loadCategories();
    }
  }, [loadedModels.length, categories.length, isLoading, loadCategories]);

  // Listen for model loaded event to refresh categories
  useEffect(() => {
    const handleModelLoaded = (event: CustomEvent) => {
      console.log('📢 VisibilityPanel: Received ifc-model-loaded event', event.detail);
      // Refresh categories when new model is loaded
      if (event.detail && event.detail.models && event.detail.models.length > 0) {
        console.log(`🔄 Refreshing categories for ${event.detail.models.length} loaded models...`);
        // Użyj setTimeout aby dać czas na pełne załadowanie modelu
        setTimeout(() => {
          refreshCategories();
        }, 500);
      }
    };

    window.addEventListener('ifc-model-loaded', handleModelLoaded as EventListener);
    return () => {
      window.removeEventListener('ifc-model-loaded', handleModelLoaded as EventListener);
    };
  }, [refreshCategories]);
  
  // Automatycznie załaduj kategorie gdy panel się montuje i modele są dostępne
  useEffect(() => {
    if (loadedModels.length > 0 && categories.length === 0 && !isLoading) {
      console.log('🔄 VisibilityPanel: Auto-loading categories on mount, models count:', loadedModels.length);
      loadCategories();
    }
  }, [loadedModels.length]);

  // Drag handling
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (panelRef.current) {
      const rect = panelRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setIsDragging(true);
    }
  };

  /**
   * Escape special regex characters
   */
  const escapeRegex = (str: string) => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  /**
   * Isolate selected categories
   */
  const handleIsolate = async () => {
    if (!hider || selectedCategories.length === 0) {
      console.warn('⚠️ Cannot isolate: missing hider or categories');
      return;
    }

    if (!hider.isolate || typeof hider.isolate !== 'function') {
      console.warn('⚠️ Hider.isolate is not available');
      return;
    }

    setIsIsolating(true);
    try {
      console.log('🔍 Isolating categories:', selectedCategories);
      
      // Normalizuj kategorie (usuń "Ifc" prefix jeśli jest, dla porównania)
      const normalizedCategories = selectedCategories.map(cat => {
        const normalized = cat.startsWith('Ifc') ? cat.substring(3) : cat;
        return normalized.toLowerCase();
      });
      
      const map: ModelIdMap = {};
      
      // Iteruj przez wszystkie załadowane modele
      for (let modelIndex = 0; modelIndex < loadedModels.length; modelIndex++) {
        const model = loadedModels[modelIndex];
        const modelId = model.modelId || model.uuid || String(modelIndex);
        const idsInModel = new Set<number>();
        
        if (!model.items || !Array.isArray(model.items)) {
          console.warn(`⚠️ Model ${modelId}: No items array`);
          continue;
        }
        
        console.log(`📋 Processing model ${modelId} with ${model.items.length} items...`);
        
        // Zbierz wszystkie IDs z wszystkich fragmentów
        const allIds: number[] = [];
        for (const item of model.items) {
          let ids = (item as any)?.ids;
          if (!ids && (item as any)?.fragment?.ids) {
            ids = (item as any).fragment.ids;
          }
          
          if (ids) {
            if (Array.isArray(ids)) {
              allIds.push(...ids);
            } else if (ids instanceof Set) {
              allIds.push(...Array.from(ids));
            } else if (ids instanceof Map) {
              allIds.push(...Array.from(ids.keys()));
            }
          }
        }
        
        console.log(`📊 Model ${modelId}: Found ${allIds.length} total IDs`);
        
        // Sprawdź każdy ID i zbierz te, które pasują do wybranych kategorii
        const batchSize = 50;
        for (let i = 0; i < allIds.length; i += batchSize) {
          const batch = allIds.slice(i, i + batchSize);
          const batchResults = await Promise.all(
            batch.map(async (expressID) => {
              try {
                const props = await model.getProperties(expressID);
                const category = props?.Name?.value || props?.name || props?.Name;
                
                if (category && typeof category === 'string') {
                  const normalizedCategory = category.toLowerCase();
                  // Sprawdź czy pasuje do którejkolwiek z wybranych kategorii
                  if (normalizedCategories.some(selected => normalizedCategory.includes(selected) || selected.includes(normalizedCategory))) {
                    return expressID;
                  }
                }
                return null;
              } catch (err) {
                return null;
              }
            })
          );
          
          batchResults.forEach((id) => {
            if (id !== null) {
              idsInModel.add(id);
            }
          });
        }
        
        if (idsInModel.size > 0) {
          map[modelId] = idsInModel;
          console.log(`✅ Model ${modelId}: Found ${idsInModel.size} elements matching selected categories`);
        } else {
          console.warn(`⚠️ Model ${modelId}: No elements found for selected categories`);
        }
      }

      console.log('📊 Isolation map:', Object.keys(map).length, 'models with elements');
      
      if (Object.keys(map).length > 0) {
        await hider.isolate(map);
        console.log(`✅ Isolated ${selectedCategories.length} categories`);
      } else {
        console.warn('⚠️ No elements found for selected categories - map is empty');
      }
    } catch (error) {
      console.error('Error isolating categories:', error);
    } finally {
      setIsIsolating(false);
    }
  };

  /**
   * Hide selected categories
   */
  const handleHide = async () => {
    if (!hider || selectedCategories.length === 0) {
      console.warn('⚠️ Cannot hide: missing hider or categories');
      return;
    }

    if (!hider.set || typeof hider.set !== 'function') {
      console.warn('⚠️ Hider.set is not available');
      return;
    }

    setIsHiding(true);
    try {
      console.log('👁️ Hiding categories:', selectedCategories);
      
      // Normalizuj kategorie (usuń "Ifc" prefix jeśli jest, dla porównania)
      const normalizedCategories = selectedCategories.map(cat => {
        const normalized = cat.startsWith('Ifc') ? cat.substring(3) : cat;
        return normalized.toLowerCase();
      });
      
      const map: ModelIdMap = {};
      
      // Iteruj przez wszystkie załadowane modele
      for (let modelIndex = 0; modelIndex < loadedModels.length; modelIndex++) {
        const model = loadedModels[modelIndex];
        const modelId = model.modelId || model.uuid || String(modelIndex);
        const idsInModel = new Set<number>();
        
        if (!model.items || !Array.isArray(model.items)) {
          console.warn(`⚠️ Model ${modelId}: No items array`);
          continue;
        }
        
        console.log(`📋 Processing model ${modelId} with ${model.items.length} items...`);
        
        // Zbierz wszystkie IDs z wszystkich fragmentów
        const allIds: number[] = [];
        for (const item of model.items) {
          let ids = (item as any)?.ids;
          if (!ids && (item as any)?.fragment?.ids) {
            ids = (item as any).fragment.ids;
          }
          
          if (ids) {
            if (Array.isArray(ids)) {
              allIds.push(...ids);
            } else if (ids instanceof Set) {
              allIds.push(...Array.from(ids));
            } else if (ids instanceof Map) {
              allIds.push(...Array.from(ids.keys()));
            }
          }
        }
        
        console.log(`📊 Model ${modelId}: Found ${allIds.length} total IDs`);
        
        // Sprawdź każdy ID i zbierz te, które pasują do wybranych kategorii
        const batchSize = 50;
        for (let i = 0; i < allIds.length; i += batchSize) {
          const batch = allIds.slice(i, i + batchSize);
          const batchResults = await Promise.all(
            batch.map(async (expressID) => {
              try {
                const props = await model.getProperties(expressID);
                const category = props?.Name?.value || props?.name || props?.Name;
                
                if (category && typeof category === 'string') {
                  const normalizedCategory = category.toLowerCase();
                  // Sprawdź czy pasuje do którejkolwiek z wybranych kategorii
                  if (normalizedCategories.some(selected => normalizedCategory.includes(selected) || selected.includes(normalizedCategory))) {
                    return expressID;
                  }
                }
                return null;
              } catch (err) {
                return null;
              }
            })
          );
          
          batchResults.forEach((id) => {
            if (id !== null) {
              idsInModel.add(id);
            }
          });
        }
        
        if (idsInModel.size > 0) {
          map[modelId] = idsInModel;
          console.log(`✅ Model ${modelId}: Found ${idsInModel.size} elements to hide`);
        } else {
          console.warn(`⚠️ Model ${modelId}: No elements found for selected categories`);
        }
      }

      console.log('📊 Hide map:', Object.keys(map).length, 'models with elements');
      
      if (Object.keys(map).length > 0) {
        await hider.set(false, map);
        console.log(`✅ Hidden ${selectedCategories.length} categories`);
      } else {
        console.warn('⚠️ No elements found for selected categories - map is empty');
      }
    } catch (error) {
      console.error('Error hiding categories:', error);
    } finally {
      setIsHiding(false);
    }
  };

  /**
   * Reset visibility (show all)
   */
  const handleReset = async () => {
    if (!hider) {
      console.warn('⚠️ Cannot reset: hider not available');
      return;
    }

    if (!hider.set || typeof hider.set !== 'function') {
      console.warn('⚠️ Hider.set is not available');
      return;
    }

    try {
      await hider.set(true);
      setSelectedCategories([]);
      console.log('✅ Reset visibility - all elements visible');
    } catch (error) {
      console.error('Error resetting visibility:', error);
    }
  };

  /**
   * Toggle category selection
   */
  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(category)) {
        return prev.filter((c) => c !== category);
      } else {
        return [...prev, category];
      }
    });
  };

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '384px',
        pointerEvents: 'auto',
      }}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 z-50 max-h-[80vh] flex flex-col select-none"
    >
      {/* Header - draggable */}
      <div
        onMouseDown={handleMouseDown}
        className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20 rounded-t-lg cursor-grab active:cursor-grabbing"
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-gray-400" />
          <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Visibility Panel
          </h3>
        </div>
        <button
          onClick={onClose}
          onMouseDown={(e) => e.stopPropagation()}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Reset Button */}
        <div className="space-y-2">
          <Button
            onClick={handleReset}
            variant="outline"
            className="w-full"
            disabled={!hider}
          >
            <RotateCcw className="w-4 h-4" />
            Reset Visibility
          </Button>
        </div>

        {/* Categories Selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Select Categories:
            </label>
            {loadedModels.length > 0 && (
              <button
                onClick={() => {
                  console.log('🔄 Manually refreshing categories...');
                  refreshCategories();
                }}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                disabled={isLoading}
              >
                {isLoading ? 'Loading...' : 'Refresh'}
              </button>
            )}
          </div>
          {isLoading ? (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Loading categories...
            </div>
          ) : categories.length === 0 ? (
            <div className="text-sm text-gray-500 dark:text-gray-400 space-y-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
              <p className="font-medium">No categories available.</p>
              {fragmentsManager && fragmentsManager.list ? (
                <p className="text-xs">
                  FragmentsManager.list.size: {fragmentsManager.list.size || 0}
                </p>
              ) : null}
              {loadedModels.length > 0 ? (
                <>
                  <p className="text-xs">
                    Models loaded: {loadedModels.length}
                  </p>
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                    💡 Wczytaj model i kliknij "Refresh" powyżej
                  </p>
                </>
              ) : (
                <p className="text-xs">Load an IFC model first.</p>
              )}
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md p-2 space-y-1">
              {categories.map((category) => (
                <label
                  key={category}
                  className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category)}
                    onChange={() => toggleCategory(category)}
                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600"
                  />
                  <span className="text-sm text-gray-900 dark:text-gray-100">
                    {category}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <Button
            onClick={handleIsolate}
            disabled={selectedCategories.length === 0 || isIsolating || !hider}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
          >
            <Eye className="w-4 h-4" />
            {isIsolating ? 'Isolating...' : `Isolate (${selectedCategories.length})`}
          </Button>

          <Button
            onClick={handleHide}
            disabled={selectedCategories.length === 0 || isHiding || !hider}
            className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400"
          >
            <EyeOff className="w-4 h-4" />
            {isHiding ? 'Hiding...' : `Hide (${selectedCategories.length})`}
          </Button>
        </div>

        {/* Info */}
        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1 pt-2 border-t border-gray-200 dark:border-gray-700">
          <div>
            <span className="font-semibold">Isolate:</span> Show only selected
            categories
          </div>
          <div>
            <span className="font-semibold">Hide:</span> Hide selected
            categories
          </div>
          <div>
            <span className="font-semibold">Reset:</span> Show all elements
          </div>
        </div>
      </div>
    </div>
  );
};

