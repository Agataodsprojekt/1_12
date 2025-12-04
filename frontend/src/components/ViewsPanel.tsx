import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Eye, Trash2, Layers, GripVertical, Building2, ArrowUpDown, Plus, Scissors } from 'lucide-react';
import { Button } from './ui/button';
import { ViewsManager, View } from '../utils/views';

// Component for section plane slider
interface SectionPlaneSliderProps {
  viewId: string;
  viewsManager: ViewsManager;
  onUpdate: () => void;
}

const SectionPlaneSlider: React.FC<SectionPlaneSliderProps> = ({ viewId, viewsManager, onUpdate }) => {
  const [sliderValue, setSliderValue] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLInputElement>(null);
  const lastSliderValueRef = useRef<number>(0);

  // Get initial position from view
  useEffect(() => {
    const view = viewsManager.getView(viewId);
    if (view && view.point && view.normal) {
      // Reset slider to center (0) when view changes
      setSliderValue(0);
      lastSliderValueRef.current = 0;
    }
  }, [viewId, viewsManager]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    
    // Calculate relative offset from last position
    const offset = newValue - lastSliderValueRef.current;
    lastSliderValueRef.current = newValue;
    
    setSliderValue(newValue);
    
    if (!isDragging) {
      setIsDragging(true);
    }
    
    // Update plane position with relative offset (don't update camera)
    viewsManager.updateSectionPlane(viewId, offset, false).catch(err => {
      console.warn('Failed to update section plane:', err);
    }); // false = don't update camera
    onUpdate();
  };

  const handleSliderMouseDown = () => {
    setIsDragging(true);
  };

  const handleSliderMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground min-w-[50px]">Back</span>
        <input
          ref={sliderRef}
          type="range"
          min="-50"
          max="50"
          step="0.1"
          value={sliderValue}
          onChange={handleSliderChange}
          onMouseDown={handleSliderMouseDown}
          onMouseUp={handleSliderMouseUp}
          onTouchStart={handleSliderMouseDown}
          onTouchEnd={handleSliderMouseUp}
          className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer slider"
          style={{
            background: `linear-gradient(to right, 
              hsl(var(--muted)) 0%, 
              hsl(var(--muted)) ${((sliderValue + 50) / 100) * 100}%, 
              hsl(var(--primary)) ${((sliderValue + 50) / 100) * 100}%, 
              hsl(var(--primary)) 100%)`
          }}
        />
        <span className="text-xs text-muted-foreground min-w-[50px] text-right">Forward</span>
      </div>
      <div className="text-xs text-muted-foreground text-center">
        Position: {sliderValue.toFixed(1)} units
      </div>
    </div>
  );
};

interface ViewsPanelProps {
  viewsManager: ViewsManager | null;
  onClose: () => void;
  onAddSectionMode?: () => void;
  isAddSectionMode?: boolean;
  onScissorsMode?: (enabled: boolean) => void;
  isScissorsMode?: boolean;
}

export const ViewsPanel: React.FC<ViewsPanelProps> = ({
  viewsManager,
  onClose,
  onAddSectionMode,
  isAddSectionMode = false,
  onScissorsMode,
  isScissorsMode = false,
}) => {
  const [position, setPosition] = useState({ x: 20, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [views, setViews] = useState<View[]>([]);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Refresh views list
  const refreshViews = useCallback(() => {
    if (viewsManager) {
      const allViews = viewsManager.getAllViews();
      setViews(allViews);
      const activeView = viewsManager.getActiveView();
      setActiveViewId(activeView?.id || null);
    }
  }, [viewsManager]);

  // Initial load and periodic refresh
  useEffect(() => {
    if (viewsManager) {
      refreshViews();
      // Refresh more frequently initially, then less often
      const interval = setInterval(() => {
        refreshViews();
      }, 500); // Refresh every 500ms
      
      // Listen for views-updated event
      const handleViewsUpdated = () => {
        console.log('📢 ViewsPanel: Received views-updated event');
        refreshViews();
      };
      window.addEventListener('views-updated', handleViewsUpdated);
      
      return () => {
        clearInterval(interval);
        window.removeEventListener('views-updated', handleViewsUpdated);
      };
    }
  }, [viewsManager, refreshViews]);

  // Listen for model loaded event to auto-create storey views
  useEffect(() => {
    const handleModelLoaded = async (event: CustomEvent) => {
      if (viewsManager && event.detail && event.detail.models && event.detail.models.length > 0) {
        console.log('📢 ViewsPanel: Received ifc-model-loaded event, creating storey views...');
        setIsLoading(true);
        try {
          const createdViews = await viewsManager.createStoreyViewsFromModels();
          console.log(`📊 ViewsPanel: Created ${createdViews.length} views, refreshing...`);
          // Refresh multiple times to ensure UI updates
          refreshViews();
          setTimeout(refreshViews, 100);
          setTimeout(refreshViews, 500);
        } catch (error) {
          console.error('❌ Error creating storey views:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    window.addEventListener('ifc-model-loaded', handleModelLoaded as EventListener);
    return () => {
      window.removeEventListener('ifc-model-loaded', handleModelLoaded as EventListener);
    };
  }, [viewsManager, refreshViews]);

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

  const handleDragStart = (e: React.MouseEvent) => {
    if (panelRef.current) {
      const rect = panelRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setIsDragging(true);
    }
  };

  const handleOpenView = async (viewId: string) => {
    if (!viewsManager) return;
    setIsLoading(true);
    try {
      const success = await viewsManager.openView(viewId);
      if (success) {
        setActiveViewId(viewId);
        refreshViews();
      }
    } catch (error) {
      console.error('❌ Error opening view:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteView = async (viewId: string) => {
    if (!viewsManager) return;
    setIsLoading(true);
    try {
      const success = await viewsManager.deleteView(viewId);
      if (success) {
        if (activeViewId === viewId) {
          setActiveViewId(null);
        }
        refreshViews();
      }
    } catch (error) {
      console.error('❌ Error deleting view:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseActiveView = async () => {
    if (!viewsManager) return;
    setIsLoading(true);
    try {
      const success = await viewsManager.closeActiveView();
      if (success) {
        setActiveViewId(null);
        refreshViews();
      }
    } catch (error) {
      console.error('❌ Error closing view:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getViewIcon = (type: View['type']) => {
    switch (type) {
      case 'storey':
        return <Building2 className="w-4 h-4" />;
      case 'elevation':
        return <ArrowUpDown className="w-4 h-4" />;
      case 'section':
        return <Layers className="w-4 h-4" />;
      default:
        return <Eye className="w-4 h-4" />;
    }
  };

  const getViewTypeLabel = (type: View['type']) => {
    switch (type) {
      case 'storey':
        return 'Storey';
      case 'elevation':
        return 'Elevation';
      case 'section':
        return 'Section';
      default:
        return 'View';
    }
  };

  // Group views by type
  const groupedViews = views.reduce((acc, view) => {
    if (!acc[view.type]) {
      acc[view.type] = [];
    }
    acc[view.type].push(view);
    return acc;
  }, {} as Record<View['type'], View[]>);

  return (
    <div
      ref={panelRef}
      className="fixed bg-background border border-border rounded-lg shadow-lg z-50 min-w-[320px] max-w-[400px]"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 border-b border-border cursor-move"
        onMouseDown={handleDragStart}
      >
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">2D Views</h3>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-3 max-h-[600px] overflow-y-auto">
        {/* Add Section View Buttons */}
        <div className="mb-3 space-y-2">
          <Button
            onClick={onAddSectionMode}
            variant={isAddSectionMode ? "default" : "outline"}
            size="sm"
            className="w-full"
            disabled={isLoading || isScissorsMode}
          >
            <Plus className="w-4 h-4 mr-2" />
            {isAddSectionMode ? "Click on model to add section..." : "Add Section View"}
          </Button>
          {isAddSectionMode && (
            <p className="text-xs text-muted-foreground text-center">
              Click on a surface in the model to create a section view. Press ESC to cancel.
            </p>
          )}
          
          <Button
            onClick={() => onScissorsMode && onScissorsMode(!isScissorsMode)}
            variant={isScissorsMode ? "default" : "outline"}
            size="sm"
            className="w-full"
            disabled={isLoading || isAddSectionMode}
          >
            <Scissors className="w-4 h-4 mr-2" />
            {isScissorsMode ? "Drawing section line..." : "Scissors Tool"}
          </Button>
          {isScissorsMode && (
            <p className="text-xs text-muted-foreground text-center">
              Click two points to define a section line. The plane will be perpendicular to your view. Press ESC to cancel.
            </p>
          )}
          
        </div>

        {isLoading && (
          <div className="text-sm text-muted-foreground mb-3">
            Loading views...
          </div>
        )}

        {views.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            <p>No views available.</p>
            <p className="text-xs mt-1">
              Load an IFC model and click "Add Section View" to create a custom view.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Active View Info */}
            {activeViewId && (
              <div className="p-2 bg-primary/10 border border-primary/20 rounded text-sm">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary" />
                  <span className="font-medium">Active View:</span>
                  <span>{views.find(v => v.id === activeViewId)?.name}</span>
                </div>
                <Button
                  onClick={handleCloseActiveView}
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  disabled={isLoading}
                >
                  Close Active View
                </Button>
              </div>
            )}

            {/* Views by Type */}
            {Object.entries(groupedViews).map(([type, typeViews]) => (
              <div key={type} className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {getViewTypeLabel(type as View['type'])} ({typeViews.length})
                </h4>
                <div className="space-y-1">
                  {typeViews.map((view) => (
                    <div key={view.id} className="space-y-1">
                      <div
                        className={`flex items-center justify-between p-2 rounded border ${
                          view.id === activeViewId
                            ? 'bg-primary/10 border-primary/20'
                            : 'bg-muted/30 border-border hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {getViewIcon(view.type)}
                          <span className="text-sm truncate">{view.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {view.id !== activeViewId && (
                            <Button
                              onClick={() => handleOpenView(view.id)}
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                              disabled={isLoading}
                              title="Open view"
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                          )}
                          {/* Toggle helper visibility for section views */}
                          {view.type === 'section' && viewsManager && (
                            <Button
                              onClick={() => {
                                if (viewsManager) {
                                  const isVisible = viewsManager.toggleSectionHelperVisibility(view.id);
                                  refreshViews();
                                  console.log(`👁️ Section helper ${view.id} visibility: ${isVisible ? 'ON' : 'OFF'}`);
                                }
                              }}
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 relative"
                              disabled={isLoading}
                              title={viewsManager?.isSectionHelperVisible(view.id) ? "Hide section plane" : "Show section plane"}
                            >
                              {viewsManager?.isSectionHelperVisible(view.id) ? (
                                <Eye className="w-3 h-3" />
                              ) : (
                                <div className="relative">
                                  <Eye className="w-3 h-3 text-red-500" />
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-4 h-0.5 bg-red-500 rotate-45 origin-center"></div>
                                  </div>
                                </div>
                              )}
                            </Button>
                          )}
                          <Button
                            onClick={() => handleDeleteView(view.id)}
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-destructive hover:text-destructive"
                            disabled={isLoading}
                            title="Delete view"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Section controls - show when section view is active */}
                      {view.type === 'section' && view.id === activeViewId && viewsManager && (
                        <div className="p-2 bg-muted/20 rounded border border-border">
                          <div className="text-xs font-medium text-muted-foreground mb-2">
                            Move Section Plane:
                          </div>
                          <SectionPlaneSlider
                            viewId={view.id}
                            viewsManager={viewsManager}
                            onUpdate={() => {
                              refreshViews();
                              setTimeout(() => {
                                window.dispatchEvent(new CustomEvent('views-updated'));
                              }, 100);
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

