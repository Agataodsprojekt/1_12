import { IFCElement } from '../types/ifc';
import { Button } from './ui/button';
import { Eye, EyeOff } from 'lucide-react';

interface VisibilityControlsProps {
  elements: IFCElement[];
  visibleTypes: Record<string, boolean>;
  onTypeVisibilityChange: (typeName: string, visible: boolean) => void;
  onShowAll: () => void;
  onHideAll: () => void;
}

export function VisibilityControls({
  elements,
  visibleTypes,
  onTypeVisibilityChange,
  onShowAll,
  onHideAll,
}: VisibilityControlsProps) {
  // Group elements by type
  const typeCounts: Record<string, number> = {};
  elements.forEach((element) => {
    const typeName = element.type_name || 'Unknown';
    typeCounts[typeName] = (typeCounts[typeName] || 0) + 1;
  });

  const sortedTypes = Object.keys(typeCounts).sort();

  return (
    <div className="space-y-4">
      <h4 className="font-semibold">Wyświetlanie elementów</h4>
      
      <div className="flex gap-2">
        <Button onClick={onShowAll} variant="outline" size="sm" className="flex-1">
          <Eye className="w-4 h-4 mr-2" />
          Pokaż wszystkie
        </Button>
        <Button onClick={onHideAll} variant="outline" size="sm" className="flex-1">
          <EyeOff className="w-4 h-4 mr-2" />
          Ukryj wszystkie
        </Button>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {sortedTypes.map((typeName) => {
          const count = typeCounts[typeName];
          const isVisible = visibleTypes[typeName] !== false;
          
          return (
            <label
              key={typeName}
              className="flex items-center gap-2 p-2 rounded hover:bg-accent cursor-pointer"
            >
              <input
                type="checkbox"
                checked={isVisible}
                onChange={(e) => onTypeVisibilityChange(typeName, e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm flex-1">
                {typeName} <span className="text-muted-foreground">({count})</span>
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

