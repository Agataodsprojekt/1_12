import React, { useState, useRef, useEffect } from 'react';
import { X, Eye, EyeOff, Trash2, Layers, GripVertical, Filter } from 'lucide-react';
import { useVisibilityCategories } from '../hooks/useVisibilityCategories';
import * as OBC from 'openbim-components';

export interface SelectedElement {
  expressID: number;
  name: string;
  type: string;
  fragmentId?: string;
}

interface SelectionPanelProps {
  selectedElements: SelectedElement[];
  isIsolated: boolean;
  onClose: () => void;
  onRemoveElement: (expressID: number) => void;
  onClearSelection: () => void;
  onIsolate: () => void;
  onUnisolate: () => void;
  onSelectElement: (expressID: number) => void;
  fragmentsManager?: any | null; // any ponieważ FragmentsManager może mieć inną strukturę
  loadedModels?: any[];
}

export const SelectionPanel: React.FC<SelectionPanelProps> = ({
  selectedElements,
  isIsolated,
  onClose,
  onRemoveElement,
  onClearSelection,
  onIsolate,
  onUnisolate,
  onSelectElement,
  fragmentsManager,
  loadedModels = [],
}) => {
  const [position, setPosition] = useState({ x: window.innerWidth - 420, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const { categories, loadCategories } = useVisibilityCategories({
    fragmentsManager,
    loadedModels,
  });

  // Load categories when component mounts
  useEffect(() => {
    if (loadedModels.length > 0 && categories.length === 0) {
      loadCategories();
    }
  }, [loadedModels, categories.length, loadCategories]);

  // Filter selected elements by category
  const filteredElements = filterCategory
    ? selectedElements.filter((el) => el.type === filterCategory)
    : selectedElements;

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

  return (
    <div 
      ref={panelRef}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '384px', // w-96 = 384px
        pointerEvents: 'auto',
      }}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 z-50 max-h-[80vh] flex flex-col select-none"
    >
      {/* Header - przeciągalny */}
      <div 
        onMouseDown={handleMouseDown}
        className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-purple-50 dark:bg-purple-900/20 rounded-t-lg cursor-grab active:cursor-grabbing"
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-gray-400" />
          <Layers className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Selekcja i Izolacja
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

      {/* Action Buttons */}
      <div 
        className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-2"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex gap-2">
          {!isIsolated ? (
            <button
              onClick={onIsolate}
              disabled={selectedElements.length === 0}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
            >
              <Eye className="w-4 h-4" />
              Izoluj ({selectedElements.length})
            </button>
          ) : (
            <button
              onClick={onUnisolate}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
            >
              <EyeOff className="w-4 h-4" />
              Pokaż wszystkie
            </button>
          )}
          <button
            onClick={onClearSelection}
            disabled={selectedElements.length === 0}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            title="Wyczyść selekcję"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          {isIsolated 
            ? "🔍 Widoczne tylko wybrane elementy" 
            : "💡 Kliknij elementy z Ctrl aby dodać do selekcji"}
        </p>
      </div>

      {/* Category Filter Section */}
      {selectedElements.length > 0 && categories.length > 0 && (
        <div 
          className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-2"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setShowCategoryFilter(!showCategoryFilter)}
            className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              <span>Filtruj po kategorii</span>
              {filterCategory && (
                <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded">
                  {filterCategory}
                </span>
              )}
            </div>
            <span className="text-xs text-gray-500">
              {showCategoryFilter ? '▼' : '▶'}
            </span>
          </button>

          {showCategoryFilter && (
            <div className="space-y-2">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Wszystkie kategorie</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              {filterCategory && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Pokazano: {filteredElements.length} z {selectedElements.length} elementów
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Selected Elements List */}
      <div 
        className="flex-1 overflow-y-auto p-4"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {selectedElements.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Layers className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="font-medium">Brak wybranych elementów</p>
            <p className="text-sm mt-1">
              Kliknij elementy w modelu z Ctrl<br />
              lub użyj wyszukiwarki
            </p>
          </div>
        ) : (
          <>
            <div className="mb-2 text-sm text-gray-600 dark:text-gray-400">
              {filterCategory ? (
                <>
                  Pokazano: <span className="font-semibold">{filteredElements.length}</span> z{' '}
                  <span className="font-semibold">{selectedElements.length}</span> elementów
                </>
              ) : (
                <>
                  Wybrano: <span className="font-semibold">{selectedElements.length}</span> elementów
                </>
              )}
            </div>
            <div className="space-y-2">
              {filteredElements.map((element) => (
                <div
                  key={element.expressID}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-500 transition-colors group"
                >
                  <button
                    onClick={() => onSelectElement(element.expressID)}
                    className="flex-1 text-left min-w-0"
                  >
                    <div className="font-medium text-gray-900 dark:text-white truncate">
                      {element.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {element.type} • ID: {element.expressID}
                    </div>
                  </button>
                  <button
                    onClick={() => onRemoveElement(element.expressID)}
                    className="ml-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    title="Usuń z selekcji"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Footer Info */}
      <div 
        className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
          <div className="flex items-center gap-1">
            <span className="font-semibold">Ctrl + Klik</span> - dodaj do selekcji
          </div>
          <div className="flex items-center gap-1">
            <span className="font-semibold">Klik na elemencie</span> - podświetl w modelu
          </div>
        </div>
      </div>
    </div>
  );
};

