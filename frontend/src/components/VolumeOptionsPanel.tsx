import { useState, useRef, useEffect } from "react";
import { Settings, Box, Eye, EyeOff, Trash2, FileText, GripVertical, ChevronDown, ChevronUp, Palette } from "lucide-react";
import * as THREE from "three";

interface VolumeOptionsPanelProps {
  isOpen: boolean;
  volumeMeasurer: any; // OBC.VolumeMeasurement | SimpleVolumeTool
  onEnabledChange: (enabled: boolean) => void;
  onVisibleChange: (visible: boolean) => void;
  onColorChange: (color: string) => void;
  onModeChange?: (mode: string) => void;
  onUnitsChange: (units: string) => void;
  onPrecisionChange: (precision: number) => void;
  onDeleteAll: () => void;
  onLogValues: () => void;
}

const VolumeOptionsPanel = ({
  isOpen,
  volumeMeasurer,
  onEnabledChange,
  onVisibleChange,
  onColorChange,
  onModeChange,
  onUnitsChange,
  onPrecisionChange,
  onDeleteAll,
  onLogValues,
}: VolumeOptionsPanelProps) => {
  const [position, setPosition] = useState({ x: 20, y: 200 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isExpanded, setIsExpanded] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // State for volume measurer properties
  const [enabled, setEnabled] = useState(volumeMeasurer?.enabled ?? true);
  const [visible, setVisible] = useState(volumeMeasurer?.visible ?? true);
  const [color, setColor] = useState(volumeMeasurer?.color?.getHexString() ?? "494cb6");
  const [units, setUnits] = useState(volumeMeasurer?.units ?? "m³");
  const [precision, setPrecision] = useState(volumeMeasurer?.rounding ?? 2);
  const [mode, setMode] = useState(volumeMeasurer?.mode ?? "volume");

  // Available units
  const unitsList = ["m³", "cm³", "ft³", "in³", "L", "mL"];

  // Available modes (if supported)
  const modes = volumeMeasurer?.modes || ["volume"];

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

  const handleEnabledChange = (checked: boolean) => {
    setEnabled(checked);
    if (volumeMeasurer) {
      volumeMeasurer.enabled = checked;
    }
    onEnabledChange(checked);
  };

  const handleVisibleChange = (checked: boolean) => {
    setVisible(checked);
    if (volumeMeasurer) {
      volumeMeasurer.visible = checked;
    }
    onVisibleChange(checked);
  };

  const handleColorChange = (newColor: string) => {
    setColor(newColor);
    if (volumeMeasurer) {
      volumeMeasurer.color = new THREE.Color(`#${newColor}`);
    }
    onColorChange(`#${newColor}`);
  };

  const handleUnitsChange = (newUnits: string) => {
    setUnits(newUnits);
    if (volumeMeasurer) {
      volumeMeasurer.units = newUnits;
    }
    onUnitsChange(newUnits);
  };

  const handlePrecisionChange = (newPrecision: number) => {
    setPrecision(newPrecision);
    if (volumeMeasurer) {
      volumeMeasurer.rounding = newPrecision;
    }
    onPrecisionChange(newPrecision);
  };

  const handleModeChange = (newMode: string) => {
    setMode(newMode);
    if (volumeMeasurer && volumeMeasurer.mode !== undefined) {
      volumeMeasurer.mode = newMode;
    }
    if (onModeChange) {
      onModeChange(newMode);
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
      {/* Nagłówek z uchwytem do przeciągania */}
      <div 
        onMouseDown={handleMouseDown}
        className={`flex items-center gap-1.5 bg-gradient-to-r from-purple-500 to-purple-600 rounded-t-lg cursor-grab active:cursor-grabbing ${
          isExpanded ? 'px-3 py-2' : 'px-2 py-1.5'
        }`}
      >
        <GripVertical className={isExpanded ? "w-4 h-4 text-white/70" : "w-3 h-3 text-white/70"} />
        {isExpanded && <Box className="w-4 h-4 text-white" />}
        {isExpanded && <span className="text-sm font-semibold text-white flex-1">Pomiar objętości</span>}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-white/80 hover:text-white transition-colors"
          title={isExpanded ? "Zwiń" : "Rozwiń"}
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Kompaktowa wersja */}
      {!isExpanded && (
        <div className="p-1.5 flex flex-col gap-1.5">
          <div className="group relative">
            <button
              onClick={() => handleEnabledChange(!enabled)}
              className={`w-8 h-8 flex items-center justify-center rounded border transition-all ${
                enabled
                  ? 'bg-purple-500 border-purple-600 text-white shadow-sm'
                  : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-purple-400'
              }`}
              title="Włącz/Wyłącz"
            >
              {enabled ? <Box className="w-4 h-4" /> : <Box className="w-4 h-4 opacity-50" />}
            </button>
            <div className="absolute left-full ml-2 top-0 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              {enabled ? "Wyłącz" : "Włącz"}
            </div>
          </div>

          <div className="group relative">
            <button
              onClick={() => handleVisibleChange(!visible)}
              className={`w-8 h-8 flex items-center justify-center rounded border transition-all ${
                visible
                  ? 'bg-green-500 border-green-600 text-white shadow-sm'
                  : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-green-400'
              }`}
              title="Widoczność pomiarów"
            >
              {visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
            <div className="absolute left-full ml-2 top-0 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              {visible ? "Ukryj pomiary" : "Pokaż pomiary"}
            </div>
          </div>

          <div className="group relative">
            <button
              onClick={onDeleteAll}
              className="w-8 h-8 flex items-center justify-center rounded border bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-red-600 dark:text-red-400 hover:border-red-400 transition-all"
              title="Usuń wszystkie"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <div className="absolute left-full ml-2 top-0 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              Usuń wszystkie pomiary
            </div>
          </div>
        </div>
      )}

      {/* Rozwinięta wersja */}
      {isExpanded && (
        <div className="p-3 space-y-3 max-w-[320px]">
          {/* Enabled */}
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => handleEnabledChange(e.target.checked)}
              className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
            />
            <Box className="w-4 h-4 text-gray-500 group-hover:text-purple-500" />
            <div className="flex-1">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
                Włączone
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Aktywne narzędzie pomiaru
              </p>
            </div>
          </label>

          {/* Visible */}
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={visible}
              onChange={(e) => handleVisibleChange(e.target.checked)}
              className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
            />
            {visible ? (
              <Eye className="w-4 h-4 text-gray-500 group-hover:text-green-500" />
            ) : (
              <EyeOff className="w-4 h-4 text-gray-500 group-hover:text-green-500" />
            )}
            <div className="flex-1">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
                Widoczne pomiary
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Wyświetlaj pomiary na modelu
              </p>
            </div>
          </label>

          {/* Color */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-100">
              <Palette className="w-4 h-4" />
              <span>Kolor</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={`#${color}`}
                onChange={(e) => handleColorChange(e.target.value.replace('#', ''))}
                className="w-12 h-8 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
              />
              <input
                type="text"
                value={`#${color}`}
                onChange={(e) => {
                  const hex = e.target.value.replace('#', '');
                  if (/^[0-9A-Fa-f]{6}$/.test(hex)) {
                    handleColorChange(hex);
                  }
                }}
                className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                placeholder="#494cb6"
              />
            </div>
          </div>

          {/* Mode (if supported) */}
          {modes.length > 1 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-100">
                <Settings className="w-4 h-4" />
                <span>Tryb pomiaru</span>
              </div>
              <select
                value={mode}
                onChange={(e) => handleModeChange(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
              >
                {modes.map((m: string) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Units */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-100">
              <Box className="w-4 h-4" />
              <span>Jednostki</span>
            </div>
            <select
              value={units}
              onChange={(e) => handleUnitsChange(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
            >
              {unitsList.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </div>

          {/* Precision */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-100">
              <FileText className="w-4 h-4" />
              <span>Precyzja</span>
            </div>
            <select
              value={precision}
              onChange={(e) => handlePrecisionChange(Number(e.target.value))}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
            >
              {[0, 1, 2, 3, 4, 5].map((p) => (
                <option key={p} value={p}>
                  {p} miejsc po przecinku
                </option>
              ))}
            </select>
          </div>

          {/* Separator */}
          <div className="h-px bg-gray-300 dark:bg-gray-600"></div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={onDeleteAll}
              className="flex-1 px-3 py-2 text-sm bg-red-500 hover:bg-red-600 text-white rounded transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Usuń wszystkie
            </button>
            <button
              onClick={onLogValues}
              className="flex-1 px-3 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Loguj wartości
            </button>
          </div>

          {/* Instructions */}
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Sterowanie:
            </p>
            <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
              <li>• Podwójne kliknięcie = utwórz pomiar</li>
              <li>• Enter = zakończ tworzenie</li>
              <li>• Delete = usuń ostatni pomiar</li>
              <li>• ESC = anuluj</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default VolumeOptionsPanel;

