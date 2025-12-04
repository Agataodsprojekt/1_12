import React, { useState, useEffect, useRef } from 'react';
import { X, Search, ChevronDown, ChevronRight, Plus, GripVertical } from 'lucide-react';

interface SearchResult {
  expressID: number;
  name: string;
  type: string;
  properties: Record<string, any>;
}

interface SearchPanelProps {
  onClose: () => void;
  onSelectElement: (expressID: number) => void;
  searchFunction: (query: string) => Promise<SearchResult[]>;
  onAddToSelection?: (expressID: number) => void;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({ 
  onClose, 
  onSelectElement,
  searchFunction,
  onAddToSelection 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [expandedResults, setExpandedResults] = useState<Set<number>>(new Set());
  const [position, setPosition] = useState({ x: window.innerWidth - 420, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const performSearch = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const results = await searchFunction(searchQuery);
        setSearchResults(results);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(performSearch, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, searchFunction]);

  const toggleExpanded = (expressID: number) => {
    const newExpanded = new Set(expandedResults);
    if (newExpanded.has(expressID)) {
      newExpanded.delete(expressID);
    } else {
      newExpanded.add(expressID);
    }
    setExpandedResults(newExpanded);
  };

  const handleSelectElement = (expressID: number) => {
    onSelectElement(expressID);
  };

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
      {/* Header - przeciągalny */}
      <div 
        onMouseDown={handleMouseDown}
        className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20 rounded-t-lg cursor-grab active:cursor-grabbing"
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-gray-400" />
          <Search className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Wyszukiwarka Elementów
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

      {/* Search Input */}
      <div 
        className="p-4 border-b border-gray-200 dark:border-gray-700"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Szukaj po nazwie, typie, ID..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     placeholder-gray-500 dark:placeholder-gray-400
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     transition-all"
            autoFocus
          />
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Przykłady: "column", "wall", "IfcWall", "123"
        </p>
      </div>

      {/* Results */}
      <div 
        className="flex-1 overflow-y-auto p-4"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {isSearching && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full mb-2" />
            <p>Wyszukiwanie...</p>
          </div>
        )}

        {!isSearching && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Nie znaleziono wyników</p>
          </div>
        )}

        {!isSearching && searchQuery.trim().length < 2 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Wpisz co najmniej 2 znaki aby wyszukać</p>
          </div>
        )}

        {!isSearching && searchResults.length > 0 && (
          <>
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Znaleziono: <span className="font-semibold">{searchResults.length}</span> elementów
              </div>
              {onAddToSelection && searchResults.length > 1 && (
                <button
                  onClick={() => {
                    let addedCount = 0;
                    searchResults.forEach(result => {
                      onAddToSelection(result.expressID);
                      addedCount++;
                    });
                    console.log(`✅ Added ${addedCount} elements to selection from search results`);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 rounded-lg transition-colors shadow-sm hover:shadow"
                  title="Dodaj wszystkie wyniki do selekcji"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Dodaj wszystkie
                </button>
              )}
            </div>
            <div className="space-y-2">
              {searchResults.map((result) => (
                <div
                  key={result.expressID}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden
                           hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
                >
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50">
                    <button
                      onClick={() => handleSelectElement(result.expressID)}
                      className="flex-1 text-left hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      <div className="font-medium text-gray-900 dark:text-white">
                        {result.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {result.type} • ID: {result.expressID}
                      </div>
                    </button>
                    <div className="flex items-center gap-1 ml-2">
                      {onAddToSelection && (
                        <button
                          onClick={() => onAddToSelection(result.expressID)}
                          className="p-1 text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded transition-colors"
                          title="Dodaj do selekcji"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => toggleExpanded(result.expressID)}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        {expandedResults.has(result.expressID) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {expandedResults.has(result.expressID) && (
                    <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                      <div className="text-xs space-y-1">
                        {Object.entries(result.properties).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">
                              {key}:
                            </span>
                            <span className="text-gray-900 dark:text-white ml-2">
                              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

