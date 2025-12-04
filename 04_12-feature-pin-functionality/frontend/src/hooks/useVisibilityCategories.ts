/**
 * Hook for managing IFC categories for visibility control
 * Handles loading and caching categories from loaded models
 */

import { useState, useCallback, useRef } from 'react';
import * as OBC from 'openbim-components';

interface UseVisibilityCategoriesProps {
  fragmentsManager?: any | null; // any ponieważ FragmentsManager może mieć inną strukturę
  loadedModels?: any[];
}

export function useVisibilityCategories({
  fragmentsManager,
  loadedModels = [],
}: UseVisibilityCategoriesProps) {
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const cachedCategoriesRef = useRef<string[] | null>(null);

  /**
   * Load categories from all loaded models
   */
  const loadCategories = useCallback(async (): Promise<string[]> => {
    // Return cached categories if available
    if (cachedCategoriesRef.current) {
      setCategories(cachedCategoriesRef.current);
      return cachedCategoriesRef.current;
    }

    setIsLoading(true);
    try {
      const categorySet = new Set<string>();

      // Method 1: Use FragmentsManager if available
      if (fragmentsManager && fragmentsManager.list) {
        const listSize = fragmentsManager.list.size || 0;
        console.log(`📊 FragmentsManager.list.size: ${listSize}`);
        
        if (listSize === 0) {
          console.warn('⚠️ FragmentsManager.list is empty - will use fallback methods');
        } else {
          try {
            const models = Array.from(fragmentsManager.list.values());
            console.log(`📋 Trying to load categories from ${models.length} models in FragmentsManager`);
            
            const perModel = await Promise.all(
              models.map((m) => {
                if (m && typeof m.getItemsWithGeometryCategories === 'function') {
                  return m.getItemsWithGeometryCategories();
                }
                return Promise.resolve([]);
              })
            );
            
            perModel.forEach((arr, index) => {
              if (arr && Array.isArray(arr) && arr.length > 0) {
                console.log(`✅ Model ${index}: Found ${arr.length} categories via getItemsWithGeometryCategories`);
                arr.forEach((c) => {
                  if (c) categorySet.add(c);
                });
              }
            });
          } catch (error) {
            console.warn('Error loading categories from FragmentsManager:', error);
          }
        }
      } else {
        console.warn('⚠️ FragmentsManager or fragmentsManager.list not available');
      }

      // Method 2: Get categories from model properties using item.ids
      if (categorySet.size === 0 && loadedModels.length > 0) {
        console.log('📋 Loading categories from model properties...');
        for (const model of loadedModels) {
          try {
            // Method 2a: PRIMARY METHOD - Use model.items[].ids to get all element IDs
            // Then get properties for each ID and extract Name as category
            if (model.items && Array.isArray(model.items)) {
              console.log(`📋 Method 2a: Using model.items[].ids to get categories...`);
              console.log(`📊 Model has ${model.items.length} items`);
              
              const typeSet = new Set<string>();
              const allIds: number[] = [];
              
              // Zbierz wszystkie IDs z wszystkich fragmentów
              for (let i = 0; i < model.items.length; i++) {
                const item = model.items[i];
                
                // Debug: sprawdź strukturę pierwszego item
                if (i === 0) {
                  const ids = (item as any)?.ids;
                  console.log('🔍 First item structure:', {
                    keys: Object.keys(item || {}),
                    hasIds: !!ids,
                    idsType: typeof ids,
                    idsIsArray: Array.isArray(ids),
                    idsIsSet: ids instanceof Set,
                    idsIsMap: ids instanceof Map,
                    idsLength: Array.isArray(ids) ? ids.length : (ids instanceof Set || ids instanceof Map ? ids.size : 'N/A'),
                    idsValue: ids,
                    itemKeys: Object.keys(item || {})
                  });
                  
                  // Sprawdź też fragment
                  if ((item as any)?.fragment) {
                    const frag = (item as any).fragment;
                    console.log('🔍 First item.fragment structure:', {
                      hasFragment: !!frag,
                      fragmentKeys: Object.keys(frag || {}),
                      fragmentIds: frag?.ids,
                      fragmentIdsType: typeof frag?.ids
                    });
                  }
                }
                
                // Sprawdź różne możliwe formaty ids
                let ids = (item as any)?.ids;
                
                // Jeśli item.ids nie istnieje, spróbuj item.fragment.ids
                if (!ids && (item as any)?.fragment?.ids) {
                  ids = (item as any).fragment.ids;
                }
                
                if (ids) {
                  if (Array.isArray(ids)) {
                    // ids jest tablicą
                    if (ids.length > 0) {
                      allIds.push(...ids);
                    }
                  } else if (ids instanceof Set) {
                    // ids jest Set
                    if (ids.size > 0) {
                      allIds.push(...Array.from(ids));
                    }
                  } else if (ids instanceof Map) {
                    // ids jest Map
                    if (ids.size > 0) {
                      allIds.push(...Array.from(ids.keys()));
                    }
                  } else if (typeof ids === 'object' && ids !== null) {
                    // ids jest obiektem - spróbuj Object.keys lub Object.values
                    try {
                      const keys = Object.keys(ids).map(k => {
                        const num = parseInt(k);
                        return isNaN(num) ? null : num;
                      }).filter(k => k !== null) as number[];
                      if (keys.length > 0) {
                        allIds.push(...keys);
                      }
                    } catch (e) {
                      // Ignoruj
                    }
                  }
                }
              }
              
              console.log(`📊 Total IDs collected: ${allIds.length}`);
              
              if (allIds.length > 0) {
                // Przetwórz wszystkie IDs (lub próbkę jeśli jest za dużo)
                const maxToProcess = Math.min(500, allIds.length);
                const idsToProcess = allIds.slice(0, maxToProcess);
                console.log(`📊 Processing ${idsToProcess.length} IDs to extract categories...`);
                
                // Przetwórz w batchach równolegle
                const batchSize = 50;
                for (let i = 0; i < idsToProcess.length; i += batchSize) {
                  const batch = idsToProcess.slice(i, i + batchSize);
                  const batchResults = await Promise.all(
                    batch.map(async (expressID) => {
                      try {
                        const props = await model.getProperties(expressID);
                        // KATEGORIA to właściwość "Name" (np. "Beam", "Column", etc.)
                        const category = props?.Name?.value || 
                                        props?.name || 
                                        props?.Name ||
                                        props?.type || 
                                        props?.Type?.value;
                        
                        if (category && typeof category === 'string' && category.trim().length > 0) {
                          // Jeśli zaczyna się od "Ifc", użyj bezpośrednio, w przeciwnym razie dodaj "Ifc" prefix
                          return category.startsWith('Ifc') ? category : `Ifc${category}`;
                        }
                        return null;
                      } catch (err) {
                        return null;
                      }
                    })
                  );
                  
                  batchResults.forEach((category) => {
                    if (category) typeSet.add(category);
                  });
                }
                
                typeSet.forEach((category) => {
                  if (category) categorySet.add(category);
                });
                
                if (typeSet.size > 0) {
                  console.log(`✅ Loaded ${typeSet.size} categories from model.items[].ids:`, Array.from(typeSet).sort());
                  // Jeśli znaleźliśmy kategorie, nie próbuj innych metod
                  continue;
                } else {
                  console.warn('⚠️ No categories found in element properties');
                  // Debug: sprawdź strukturę pierwszego elementu
                  if (idsToProcess.length > 0) {
                    try {
                      const sampleProps = await model.getProperties(idsToProcess[0]);
                      console.log('🔍 Sample element properties:', {
                        expressID: idsToProcess[0],
                        propsKeys: Object.keys(sampleProps || {}),
                        Name: sampleProps?.Name,
                        name: sampleProps?.name,
                        type: sampleProps?.type,
                        fullProps: sampleProps
                      });
                    } catch (err) {
                      console.warn('⚠️ Could not get sample properties:', err);
                    }
                  }
                }
              } else {
                console.warn('⚠️ No IDs found in model.items[].ids');
              }
            }
            
            // Method 2b: Try getItemsWithGeometryCategories on model directly (fallback)
            if (categorySet.size === 0 && model && typeof model.getItemsWithGeometryCategories === 'function') {
              try {
                const cats = await model.getItemsWithGeometryCategories();
                if (cats && Array.isArray(cats) && cats.length > 0) {
                  cats.forEach((c) => {
                    if (c) categorySet.add(c);
                  });
                  console.log(`✅ Loaded ${cats.length} categories from model.getItemsWithGeometryCategories()`);
                } else {
                  console.log('⚠️ model.getItemsWithGeometryCategories() returned empty array');
                }
              } catch (err) {
                console.warn('⚠️ model.getItemsWithGeometryCategories() failed:', err);
              }
            }

            // Method 2b: Extract categories from item fragments
            if (categorySet.size === 0 && model.items && Array.isArray(model.items)) {
              for (const item of model.items) {
                try {
                  // Try item.fragment.getItemsWithGeometryCategories()
                  if (item.fragment && typeof item.fragment.getItemsWithGeometryCategories === 'function') {
                    const cats = await item.fragment.getItemsWithGeometryCategories();
                    if (cats && Array.isArray(cats)) {
                      cats.forEach((c) => {
                        if (c) categorySet.add(c);
                      });
                    }
                  }
                  // Try item.getItemsWithGeometryCategories() if item is a fragment manager
                  else if (item && typeof item.getItemsWithGeometryCategories === 'function') {
                    const cats = await item.getItemsWithGeometryCategories();
                    if (cats && Array.isArray(cats)) {
                      cats.forEach((c) => {
                        if (c) categorySet.add(c);
                      });
                    }
                  }
                } catch (err) {
                  // Continue to next item
                }
              }
            }

            // Method 2c: LAST RESORT - Try to get IDs from model.items (if getAllPropertiesOfType failed)
            // This is less reliable because item.ids might not exist
            if (categorySet.size === 0 && model.items && Array.isArray(model.items)) {
              console.log('📋 Method 2c: Last resort - trying to extract from model.items...');
              console.log(`📊 Model has ${model.items.length} items`);
              
              // Debug: sprawdź strukturę pierwszego item
              if (model.items.length > 0) {
                const firstItem = model.items[0];
                console.log('🔍 First item structure:', {
                  keys: Object.keys(firstItem || {}),
                  hasIds: !!(firstItem as any)?.ids,
                  hasMesh: !!(firstItem as any)?.mesh,
                  item: firstItem
                });
              }
              
              const typeSet = new Set<string>();
              let processedCount = 0;
              const maxElements = 200; // Ograniczony limit
              
              // Spróbuj użyć getAllPropertiesOfType jeśli item.ids nie istnieje
              // Ale najpierw sprawdź czy item.ids w ogóle istnieje
              let hasIds = false;
              for (const item of model.items) {
                if ((item as any)?.ids && Array.isArray((item as any).ids)) {
                  hasIds = true;
                  break;
                }
              }
              
              if (!hasIds) {
                console.warn('⚠️ model.items[].ids does not exist - cannot extract categories this way');
                console.log('💡 Tip: Use getAllPropertiesOfType(0) instead (Method 2a)');
              } else {
                // Zbierz wszystkie IDs z wszystkich fragmentów
                const allIds: number[] = [];
                for (const item of model.items) {
                  if ((item as any)?.ids && Array.isArray((item as any).ids)) {
                    allIds.push(...(item as any).ids);
                  }
                }
                
                console.log(`📊 Total IDs found in model.items: ${allIds.length}`);
                
                if (allIds.length > 0) {
                  // Przetwórz próbkę ID
                  const sampleSize = Math.min(maxElements, allIds.length);
                  const sampleIds = allIds.slice(0, sampleSize);
                  
                  console.log(`📊 Processing ${sampleSize} sample IDs from model.items...`);
                  
                  // Przetwórz równolegle w batchach
                  const batchSize = 20;
                  for (let i = 0; i < sampleIds.length; i += batchSize) {
                    const batch = sampleIds.slice(i, i + batchSize);
                    const batchResults = await Promise.all(
                      batch.map(async (expressID) => {
                        try {
                          const props = await model.getProperties(expressID);
                          // KATEGORIA to właściwość "Name"
                          const category = props?.Name?.value || 
                                          props?.name || 
                                          props?.Name ||
                                          props?.type || 
                                          props?.Type?.value || 
                                          props?.type_name || 
                                          props?.TypeName?.value ||
                                          (props?.constructor?.name?.startsWith('Ifc') ? props.constructor.name : null);
                          
                          if (category && typeof category === 'string' && category.trim().length > 0) {
                            // Jeśli zaczyna się od "Ifc", użyj bezpośrednio, w przeciwnym razie dodaj "Ifc" prefix
                            return category.startsWith('Ifc') ? category : `Ifc${category}`;
                          }
                          return null;
                        } catch (err) {
                          return null;
                        }
                      })
                    );
                    
                    batchResults.forEach((type) => {
                      if (type) typeSet.add(type);
                    });
                    processedCount += batch.length;
                  }
                  
                  typeSet.forEach((type) => {
                    if (type) categorySet.add(type);
                  });
                  
                  if (typeSet.size > 0) {
                    console.log(`✅ Loaded ${typeSet.size} categories from model.items:`, Array.from(typeSet));
                  }
                }
              }
            }
          } catch (error) {
            console.warn('Error loading categories from model:', error);
          }
        }
      }

      const sortedCategories = Array.from(categorySet).sort((a, b) =>
        a.localeCompare(b)
      );

      cachedCategoriesRef.current = sortedCategories;
      setCategories(sortedCategories);
      setIsLoading(false);

      console.log(`✅ Loaded ${sortedCategories.length} IFC categories`);
      return sortedCategories;
    } catch (error) {
      console.error('Error loading categories:', error);
      setIsLoading(false);
      return [];
    }
  }, [fragmentsManager, loadedModels]);

  /**
   * Get current categories (load if not cached)
   */
  const getCategories = useCallback(async (): Promise<string[]> => {
    if (categories.length > 0) {
      return categories;
    }
    return await loadCategories();
  }, [categories, loadCategories]);

  /**
   * Clear cache and reload categories
   */
  const clearCache = useCallback(() => {
    cachedCategoriesRef.current = null;
    setCategories([]);
    console.log('🗑️ Categories cache cleared');
  }, []);

  /**
   * Refresh categories from models
   */
  const refreshCategories = useCallback(async (): Promise<string[]> => {
    clearCache();
    return await loadCategories();
  }, [clearCache, loadCategories]);

  return {
    categories,
    isLoading,
    loadCategories,
    getCategories,
    clearCache,
    refreshCategories,
  };
}

