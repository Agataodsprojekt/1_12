import React, { useState, useRef, useEffect, useMemo } from 'react';
import { X, GripVertical, FileText, ChevronDown, ChevronRight, Filter, ArrowUpDown } from 'lucide-react';
import { IFCElement } from '../types/ifc';

interface DocumentationPanelProps {
  elements: IFCElement[];
  onClose: () => void;
  loadedModels?: any[];
}

type SortField = 'type_name' | 'name' | 'global_id';
type SortDirection = 'asc' | 'desc';

export const DocumentationPanel: React.FC<DocumentationPanelProps> = ({
  elements,
  onClose,
  loadedModels = [],
}) => {
  const [position, setPosition] = useState({ x: window.innerWidth - 420, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [filterQuery, setFilterQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('type_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [expandedElements, setExpandedElements] = useState<Set<string>>(new Set());
  const [extractedElements, setExtractedElements] = useState<IFCElement[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Extract elements from loaded models if elements array is empty
  useEffect(() => {
    const extractElementsFromModels = async () => {
      if (elements.length > 0) {
        setExtractedElements([]);
        return;
      }

      if (loadedModels.length === 0) {
        setExtractedElements([]);
        return;
      }

      setIsExtracting(true);
      const extracted: IFCElement[] = [];

      try {
        for (const model of loadedModels) {
          if (!model.items || !Array.isArray(model.items)) {
            continue;
          }

          for (const item of model.items) {
            const ids = (item as any)?.ids;
            if (!ids) continue;

            const idArray: number[] = Array.isArray(ids)
              ? ids
              : ids instanceof Set || ids instanceof Map
              ? Array.from(ids as Set<number> | Map<number, unknown>).map((v: any) =>
                  typeof v === "number" ? v : Array.isArray(v) ? v[0] : Number(v)
                )
              : typeof ids === "object"
              ? Object.keys(ids).map((k) => Number(k))
              : [];

            // Process in batches to avoid blocking
            const batchSize = 100;
            for (let i = 0; i < idArray.length; i += batchSize) {
              const batch = idArray.slice(i, i + batchSize);
              await Promise.all(
                batch.map(async (expressID) => {
                  try {
                    if (model.getProperties) {
                      const props = await model.getProperties(expressID);
                      if (props) {
                        const globalId = (props as any).GlobalId?.value || (props as any).global_id || `expressID_${expressID}`;
                        const typeName = (props as any).type || (props as any).Type?.value || 'Unknown';
                        const name = (props as any).Name?.value || (props as any).name || '';
                        
                        extracted.push({
                          global_id: String(globalId),
                          type_name: String(typeName),
                          name: String(name),
                          properties: props as Record<string, any>,
                        });
                      }
                    }
                  } catch {
                    // Skip this element
                  }
                })
              );
            }
          }
        }
      } catch (error) {
        console.error('Error extracting elements from models:', error);
      } finally {
        setExtractedElements(extracted);
        setIsExtracting(false);
      }
    };

    extractElementsFromModels();
  }, [elements, loadedModels]);

  // Use extracted elements if elements array is empty
  const allElements = elements.length > 0 ? elements : extractedElements;

  // Calculate statistics
  const stats = useMemo(() => {
    const typeCounts: Record<string, number> = {};
    allElements.forEach((el) => {
      const type = el.type_name || 'Unknown';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
    return {
      totalElements: allElements.length,
      uniqueTypes: Object.keys(typeCounts).length,
      typeCounts,
    };
  }, [allElements]);

  // Filter and sort elements
  const filteredAndSortedElements = useMemo(() => {
    let filtered = allElements;

    // Apply filter
    if (filterQuery.trim()) {
      const query = filterQuery.toLowerCase();
      filtered = allElements.filter((el) => {
        const typeName = (el.type_name || '').toLowerCase();
        const name = (el.name || '').toLowerCase();
        const globalId = (el.global_id || '').toLowerCase();
        return typeName.includes(query) || name.includes(query) || globalId.includes(query);
      });
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let aValue: string;
      let bValue: string;

      switch (sortField) {
        case 'type_name':
          aValue = (a.type_name || 'Unknown').toLowerCase();
          bValue = (b.type_name || 'Unknown').toLowerCase();
          break;
        case 'name':
          aValue = (a.name || 'Unnamed').toLowerCase();
          bValue = (b.name || 'Unnamed').toLowerCase();
          break;
        case 'global_id':
          aValue = (a.global_id || '').toLowerCase();
          bValue = (b.global_id || '').toLowerCase();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [allElements, filterQuery, sortField, sortDirection]);

  // Handle dragging
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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const toggleExpanded = (globalId: string) => {
    const newExpanded = new Set(expandedElements);
    if (newExpanded.has(globalId)) {
      newExpanded.delete(globalId);
    } else {
      newExpanded.add(globalId);
    }
    setExpandedElements(newExpanded);
  };

  const formatPosition = (position?: [number, number, number]) => {
    if (!position) return 'N/A';
    return `(${position[0].toFixed(2)}, ${position[1].toFixed(2)}, ${position[2].toFixed(2)})`;
  };

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '500px',
        pointerEvents: 'auto',
      }}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 z-50 max-h-[85vh] flex flex-col select-none"
    >
      {/* Header - przeciągalny */}
      <div
        onMouseDown={handleMouseDown}
        className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-green-50 dark:bg-green-900/20 rounded-t-lg cursor-grab active:cursor-grabbing"
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-gray-400" />
          <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Dokumentacja Projektu
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

      {/* Statistics */}
      <div
        className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-600 dark:text-gray-400">Łączna liczba</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {stats.totalElements}
            </div>
          </div>
          <div>
            <div className="text-gray-600 dark:text-gray-400">Typy elementów</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {stats.uniqueTypes}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Input */}
      <div
        className="p-4 border-b border-gray-200 dark:border-gray-700"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filtruj po typie, nazwie, ID..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     placeholder-gray-500 dark:placeholder-gray-400
                     focus:ring-2 focus:ring-green-500 focus:border-transparent
                     transition-all"
            autoFocus
          />
        </div>
        {filterQuery && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Znaleziono: {filteredAndSortedElements.length} z {allElements.length} elementów
          </p>
        )}
        {isExtracting && (
          <p className="mt-2 text-xs text-green-600 dark:text-green-400">
            Ładowanie elementów z modeli...
          </p>
        )}
      </div>

      {/* Table Header */}
      <div
        className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 grid grid-cols-12 gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => handleSort('type_name')}
          className="col-span-4 flex items-center gap-1 hover:text-green-600 dark:hover:text-green-400 transition-colors text-left"
        >
          Typ
          <ArrowUpDown className="w-3 h-3" />
          {sortField === 'type_name' && (
            <span className="text-green-600 dark:text-green-400">
              {sortDirection === 'asc' ? '↑' : '↓'}
            </span>
          )}
        </button>
        <button
          onClick={() => handleSort('name')}
          className="col-span-4 flex items-center gap-1 hover:text-green-600 dark:hover:text-green-400 transition-colors text-left"
        >
          Nazwa
          <ArrowUpDown className="w-3 h-3" />
          {sortField === 'name' && (
            <span className="text-green-600 dark:text-green-400">
              {sortDirection === 'asc' ? '↑' : '↓'}
            </span>
          )}
        </button>
        <button
          onClick={() => handleSort('global_id')}
          className="col-span-4 flex items-center gap-1 hover:text-green-600 dark:hover:text-green-400 transition-colors text-left"
        >
          Global ID
          <ArrowUpDown className="w-3 h-3" />
          {sortField === 'global_id' && (
            <span className="text-green-600 dark:text-green-400">
              {sortDirection === 'asc' ? '↑' : '↓'}
            </span>
          )}
        </button>
      </div>

      {/* Elements List */}
      <div
        className="flex-1 overflow-y-auto"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {isExtracting ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full mb-2" />
            <p>Ładowanie elementów z modeli...</p>
          </div>
        ) : filteredAndSortedElements.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>
              {filterQuery ? 'Nie znaleziono elementów pasujących do filtra' : 'Brak elementów do wyświetlenia'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredAndSortedElements.map((element, index) => {
              const globalId = element.global_id || `element-${index}`;
              const isExpanded = expandedElements.has(globalId);

              return (
                <div
                  key={globalId}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="px-4 py-3 grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-4 text-sm text-gray-900 dark:text-white font-medium truncate">
                      {element.type_name || 'Unknown'}
                    </div>
                    <div className="col-span-4 text-sm text-gray-700 dark:text-gray-300 truncate">
                      {element.name || 'Unnamed'}
                    </div>
                    <div className="col-span-3 text-xs text-gray-500 dark:text-gray-400 font-mono truncate">
                      {element.global_id || 'N/A'}
                    </div>
                    <button
                      onClick={() => toggleExpanded(globalId)}
                      className="col-span-1 flex justify-end text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-3 pt-0 bg-gray-50 dark:bg-gray-900/30 border-t border-gray-200 dark:border-gray-700">
                      <div className="space-y-2 text-xs">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-gray-600 dark:text-gray-400 font-medium">Typ:</span>
                            <span className="ml-2 text-gray-900 dark:text-white">
                              {element.type_name || 'Unknown'}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400 font-medium">Global ID:</span>
                            <span className="ml-2 text-gray-900 dark:text-white font-mono">
                              {element.global_id || 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400 font-medium">Nazwa:</span>
                            <span className="ml-2 text-gray-900 dark:text-white">
                              {element.name || 'Unnamed'}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400 font-medium">Pozycja:</span>
                            <span className="ml-2 text-gray-900 dark:text-white font-mono">
                              {formatPosition(element.position)}
                            </span>
                          </div>
                        </div>
                        {element.properties && Object.keys(element.properties).length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                            <div className="text-gray-600 dark:text-gray-400 font-medium mb-2">
                              Właściwości:
                            </div>
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {Object.entries(element.properties).map(([key, value]) => (
                                <div key={key} className="flex justify-between text-xs">
                                  <span className="text-gray-600 dark:text-gray-400 font-medium">
                                    {key}:
                                  </span>
                                  <span className="text-gray-900 dark:text-white ml-2 text-right max-w-[60%] truncate">
                                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

