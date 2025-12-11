import { useState } from "react";
import {
  RotateCcw,
  RotateCw,
  Hand,
  Pin,
  Sun,
  Moon,
  Camera,
  MessageCircle,
  FileSpreadsheet,
  Search,
  Layers,
  Eye,
  SquareStack,
  Box,
  FileText,
} from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import DimensionIcon from "./icons/DimensionIcon";

interface ActionBarProps {
  onActionSelect?: (action: string) => void;
}

export default function ActionBar({ onActionSelect }: ActionBarProps) {
  const [activeAction, setActiveAction] = useState<string | null>("move");
  const { theme, toggleTheme } = useTheme();

  const handleActionClick = (action: string) => {
    // Przyciski jednorazowe (nie są trybami, tylko akcjami)
    const oneTimeActions = ["undo", "redo", "camera", "export"];
    
    if (oneTimeActions.includes(action)) {
      // Wykonaj akcję ale nie zmieniaj aktywnego trybu
      onActionSelect?.(action);
      return;
    }
    
    // Przyciski trybów (togglable) - jeśli kliknięto ten sam, wyłącz go
    if (activeAction === action) {
      setActiveAction("move");
      onActionSelect?.("move");
    } else {
      setActiveAction(action);
      onActionSelect?.(action);
    }
  };

  const handleThemeToggle = () => {
    toggleTheme();
  };

  const actions = [
    {
      id: "undo",
      label: "Undo",
      icon: RotateCcw,
      tooltip: "Undo last action",
    },
    {
      id: "redo",
      label: "Redo",
      icon: RotateCw,
      tooltip: "Redo last action",
    },
    {
      id: "move",
      label: "Move",
      icon: Hand,
      tooltip: "Move around in the 3D view",
    },
    {
      id: "pin",
      label: "Pin",
      icon: Pin,
      tooltip: "Mark and pin important elements",
    },
    {
      id: "dimension",
      label: "Dimension",
      icon: DimensionIcon,
      tooltip: "Measure distances and dimensions",
    },
    {
      id: "volume",
      label: "Volume",
      icon: Box,
      tooltip: "Measure volumes",
    },
    {
      id: "search",
      label: "Search",
      icon: Search,
      tooltip: "Search elements in the model",
    },
    {
      id: "camera",
      label: "Screenshot",
      icon: Camera,
      tooltip: "Capture screenshot of the view",
    },
    {
      id: "comment",
      label: "Comment",
      icon: MessageCircle,
      tooltip: "Add comments to the model",
    },
    {
      id: "selection",
      label: "Selection",
      icon: Layers,
      tooltip: "Select and isolate elements",
    },
    {
      id: "visibility",
      label: "Visibility",
      icon: Eye,
      tooltip: "Control visibility by IFC categories",
    },
    {
      id: "views",
      label: "Views",
      icon: SquareStack,
      tooltip: "Manage 2D views (storeys, elevations, sections)",
    },
    {
      id: "export",
      label: "Documentation Export",
      icon: FileSpreadsheet,
      tooltip: "Export documentation to Excel",
    },
  ];

  return (
    <div className="toolbar-strip sticky bottom-8 left-1/2 -translate-x-1/2 z-40 max-w-fit mx-auto">
      <div className="flex items-center gap-1">
        {actions.map((action) => {
          const Icon = action.icon;
          const isActive = activeAction === action.id;

          return (
            <button
              key={action.id}
              onClick={() => handleActionClick(action.id)}
              className={`action-button group ${isActive ? "active" : ""}`}
              title={action.tooltip}
              aria-label={action.label}
            >
              <Icon className="w-5 h-5" />
              <span className="absolute bottom-full mb-2 px-2 py-1 bg-foreground text-background text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                {action.label}
              </span>
            </button>
          );
        })}

        <button
          onClick={handleThemeToggle}
          className="action-button group"
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
          <span className="absolute bottom-full mb-2 px-2 py-1 bg-foreground text-background text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </span>
        </button>
      </div>
    </div>
  );
}
