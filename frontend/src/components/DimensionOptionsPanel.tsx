import { useState, useRef, useEffect } from "react";
import { Settings, Grid3x3, CircleDot, Move, ArrowRightLeft, GripVertical, ChevronDown, ChevronUp } from "lucide-react";

interface DimensionOptionsPanelProps {
  isOpen: boolean;
  orthogonalMode: boolean;
  snapToPoints: boolean;
  alignToEdgeMode: 'none' | 'parallel' | 'perpendicular';
  onOrthogonalChange: (enabled: boolean) => void;
  onSnapChange: (enabled: boolean) => void;
  onAlignToEdgeChange: (mode: 'none' | 'parallel' | 'perpendicular') => void;
}

const DimensionOptionsPanel = ({
  isOpen,
  orthogonalMode,
  snapToPoints,
  alignToEdgeMode,
  onOrthogonalChange,
  onSnapChange,
  onAlignToEdgeChange,
}: DimensionOptionsPanelProps) => {
  const [position, setPosition] = useState({ x: 20, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isExpanded, setIsExpanded] = useState(false);
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

  if (!isOpen) return null;

  return (
    <div 
      ref={panelRef}
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'grab',
        pointerEvents: 'auto',
      }}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-300 dark:border-gray-600 z-50 select-none"
    >
      {/* Nagłówek z uchwytem do przeciągania - kompaktowy w wersji zwiniętej */}
      <div 
        onMouseDown={handleMouseDown}
        className={`flex items-center gap-1.5 bg-gradient-to-r from-blue-500 to-blue-600 rounded-t-lg cursor-grab active:cursor-grabbing ${
          isExpanded ? 'px-3 py-2' : 'px-2 py-1.5'
        }`}
      >
        <GripVertical className={isExpanded ? "w-4 h-4 text-white/70" : "w-3 h-3 text-white/70"} />
        {isExpanded && <Settings className="w-4 h-4 text-white" />}
        {isExpanded && <span className="text-sm font-semibold text-white flex-1">Wymiary</span>}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-white/80 hover:text-white transition-colors"
          title={isExpanded ? "Zwiń" : "Rozwiń"}
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Kompaktowa wersja - tylko ikonki, minimalistyczny design */}
      {!isExpanded && (
        <div className="p-1.5 flex flex-col gap-1.5">
          {/* Wymiary ortogonalne */}
          <div className="group relative">
            <button
              onClick={() => onOrthogonalChange(!orthogonalMode)}
              className={`w-8 h-8 flex items-center justify-center rounded border transition-all ${
                orthogonalMode
                  ? 'bg-blue-500 border-blue-600 text-white shadow-sm'
                  : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-blue-400'
              }`}
              title="Wymiary ortogonalne"
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
            <div className="absolute left-full ml-2 top-0 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              Wymiary ortogonalne (X, Y, Z)
            </div>
          </div>

          {/* Przyciąganie do punktów */}
          <div className="group relative">
            <button
              onClick={() => onSnapChange(!snapToPoints)}
              className={`w-8 h-8 flex items-center justify-center rounded border transition-all ${
                snapToPoints
                  ? 'bg-green-500 border-green-600 text-white shadow-sm'
                  : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-green-400'
              }`}
              title="Przyciąganie do punktów"
            >
              <CircleDot className="w-4 h-4" />
            </button>
            <div className="absolute left-full ml-2 top-0 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              Przyciąganie do punktów
            </div>
          </div>

          {/* Wyrównanie do krawędzi - kompaktowe */}
          <div className="group relative">
            <button
              onClick={() => onAlignToEdgeChange(alignToEdgeMode === 'none' ? 'parallel' : alignToEdgeMode === 'parallel' ? 'perpendicular' : 'none')}
              className={`w-8 h-8 flex items-center justify-center rounded border transition-all ${
                alignToEdgeMode === 'parallel'
                  ? 'bg-green-500 border-green-600 text-white shadow-sm'
                  : alignToEdgeMode === 'perpendicular'
                  ? 'bg-purple-500 border-purple-600 text-white shadow-sm'
                  : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-blue-400'
              }`}
              title="Wyrównanie do krawędzi"
            >
              {alignToEdgeMode === 'parallel' && <ArrowRightLeft className="w-4 h-4" />}
              {alignToEdgeMode === 'perpendicular' && <span className="text-base font-bold">⊥</span>}
              {alignToEdgeMode === 'none' && <Move className="w-4 h-4" />}
            </button>
            <div className="absolute left-full ml-2 top-0 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              {alignToEdgeMode === 'none' && 'Wyrównanie: wyłączone'}
              {alignToEdgeMode === 'parallel' && 'Równolegle do powierzchni'}
              {alignToEdgeMode === 'perpendicular' && 'Prostopadle do powierzchni'}
            </div>
          </div>
        </div>
      )}

      {/* Rozwinięta wersja - pełne opisy */}
      {isExpanded && (
        <div className="p-3 space-y-3 max-w-[320px]">
          {/* Wymiary ortogonalne */}
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={orthogonalMode}
              onChange={(e) => onOrthogonalChange(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <Grid3x3 className="w-4 h-4 text-gray-500 group-hover:text-blue-500" />
            <div className="flex-1">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
                Wymiary ortogonalne
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Wyrównane do osi X, Y, Z
              </p>
            </div>
          </label>

          {/* Przyciąganie do punktów */}
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={snapToPoints}
              onChange={(e) => onSnapChange(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <CircleDot className="w-4 h-4 text-gray-500 group-hover:text-green-500" />
            <div className="flex-1">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
                Przyciąganie do punktów
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Do wierzchołków i krawędzi
              </p>
            </div>
          </label>

          {/* Separator */}
          <div className="h-px bg-gray-300 dark:bg-gray-600"></div>

          {/* Wyrównanie do krawędzi */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-100">
              <Move className="w-4 h-4" />
              <span>Wyrównanie do krawędzi</span>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => onAlignToEdgeChange('none')}
                className={`flex-1 px-2 py-1.5 text-xs rounded border transition-all ${
                  alignToEdgeMode === 'none'
                    ? 'bg-gray-500 text-white border-gray-600'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400'
                }`}
              >
                Wył
              </button>
              <button
                onClick={() => onAlignToEdgeChange('parallel')}
                className={`flex-1 px-2 py-1.5 text-xs rounded border transition-all flex items-center justify-center gap-1 ${
                  alignToEdgeMode === 'parallel'
                    ? 'bg-green-500 text-white border-green-600'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-green-400'
                }`}
              >
                <ArrowRightLeft className="w-3 h-3" />
                ∥
              </button>
              <button
                onClick={() => onAlignToEdgeChange('perpendicular')}
                className={`flex-1 px-2 py-1.5 text-xs rounded border transition-all ${
                  alignToEdgeMode === 'perpendicular'
                    ? 'bg-purple-500 text-white border-purple-600'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-purple-400'
                }`}
              >
                ⊥
              </button>
            </div>
          </div>

          {/* Sterowanie */}
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Sterowanie:
            </p>
            <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
              <li>• Shift + klik = dodaj punkt</li>
              <li>• Shift + 2x klik = zaznacz</li>
              <li>• Delete = usuń</li>
              <li>• ESC = anuluj</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default DimensionOptionsPanel;

