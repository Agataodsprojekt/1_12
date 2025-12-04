import * as THREE from "three";
import * as OBC from "openbim-components";
import CommentPanel from "./CommentPanel";
import DimensionOptionsPanel from "./DimensionOptionsPanel";
import VolumeOptionsPanel from "./VolumeOptionsPanel";
import { SearchPanel } from "./SearchPanel";
import { SelectionPanel, SelectedElement } from "./SelectionPanel";
import { VisibilityPanel } from "./VisibilityPanel";
import { ViewsPanel } from "./ViewsPanel";
import { CostSummary } from "./CostSummary";
import { VisibilityControls } from "./VisibilityControls";
import { ElementsList } from "./ElementsList";
import { Comment } from "../hooks/useComments";
import { SimpleVolumeTool } from "../utils/SimpleVolumeTool";
import { ViewsManager } from "../utils/views";
import { getFragmentsManager, getLoadedModels } from "../lib/thatopen";
import { SimpleHider } from "../utils/SimpleHider";

export interface ViewerPanelsProps {
  // Viewer refs
  viewerRef: React.RefObject<OBC.Components | null>;
  hiderRef: React.RefObject<SimpleHider | null>;
  viewsManagerRef: React.RefObject<ViewsManager | null>;
  volumeMeasurerRef: React.RefObject<SimpleVolumeTool | null>;
  
  // Panel visibility states
  showCommentPanel: boolean;
  showSearchPanel: boolean;
  showSelectionPanel: boolean;
  showVisibilityPanel: boolean;
  showViewsPanel: boolean;
  isPinMode: boolean;
  isDimensionMode: boolean;
  isVolumeMode: boolean;
  isScissorsMode: boolean;
  isAddSectionMode: boolean;
  
  // Panel handlers
  onCloseCommentPanel: () => void;
  onCloseSearchPanel: () => void;
  onCloseSelectionPanel: () => void;
  onCloseVisibilityPanel: () => void;
  onCloseViewsPanel: () => void;
  onScissorsModeChange: (enabled: boolean) => void;
  onAddSectionModeChange: (enabled: boolean) => void;
  
  // Comments
  comments: Comment[];
  selectedElementId?: string;
  selectedElementName?: string;
  onAddComment: (text: string, elementId?: string, elementName?: string) => void;
  onDeleteComment: (commentId: string) => void;
  onCommentClick?: (elementId: string) => void;
  getAllComments: () => Comment[];
  
  // Dimension options
  dimensionOrthogonal: boolean;
  dimensionSnap: boolean;
  alignToEdgeMode: 'none' | 'parallel' | 'perpendicular';
  onDimensionOrthogonalChange: (enabled: boolean) => void;
  onDimensionSnapChange: (enabled: boolean) => void;
  onAlignToEdgeChange: (mode: 'none' | 'parallel' | 'perpendicular') => void;
  
  // Volume options
  onVolumeEnabledChange?: (enabled: boolean) => void;
  onVolumeVisibleChange?: (visible: boolean) => void;
  onVolumeColorChange?: (color: string) => void;
  onVolumeModeChange?: (mode: string) => void;
  onVolumeUnitsChange?: (units: string) => void;
  onVolumePrecisionChange?: (precision: number) => void;
  onVolumeDeleteAll?: () => void;
  onVolumeLogValues?: () => Promise<void>;
  
  // Search
  onSearchSelect?: (elementId: string) => void;
  searchFunction?: (query: string) => Promise<any[]>;
  onAddToSelection?: (elementId: string) => void;
  
  // Selection
  selectedElements: SelectedElement[];
  isIsolated: boolean;
  onRemoveElement: (elementId: string) => void;
  onClearSelection: () => void;
  onIsolate: () => void;
  onUnisolate: () => void;
  onSelectionElementClick: (expressID: number) => void;
  
  // IFC Data
  elements: any[];
  costs: any;
  visibleTypes: Set<string>;
  onTypeVisibilityChange: (type: string, visible: boolean) => void;
  onShowAllTypes: () => void;
  onHideAllTypes: () => void;
  
  // Pins
  pinColors: Array<{ color: string; name: string }>;
  selectedPinColor: string;
  onPinColorSelect: (color: string) => void;
  
  // Loading/Error
  isLoading: boolean;
  error?: string;
}

/**
 * Container component for all viewer panels
 * Manages rendering of all overlay panels, controls, and status indicators
 */
export function ViewerPanels(props: ViewerPanelsProps) {
  const {
    viewerRef,
    hiderRef,
    viewsManagerRef,
    volumeMeasurerRef,
    showCommentPanel,
    showSearchPanel,
    showSelectionPanel,
    showVisibilityPanel,
    showViewsPanel,
    isPinMode,
    isDimensionMode,
    isVolumeMode,
    comments,
    selectedElementId,
    selectedElementName,
    onAddComment,
    onDeleteComment,
    onCommentClick,
    getAllComments,
    onCloseCommentPanel,
    onCloseSearchPanel,
    onCloseSelectionPanel,
    onCloseVisibilityPanel,
    onCloseViewsPanel,
    dimensionOrthogonal,
    dimensionSnap,
    alignToEdgeMode,
    onDimensionOrthogonalChange,
    onDimensionSnapChange,
    onAlignToEdgeChange,
    selectedElements,
    isIsolated,
    onRemoveElement,
    onClearSelection,
    onIsolate,
    onUnisolate,
    onSelectionElementClick,
    elements,
    costs,
    visibleTypes,
    onTypeVisibilityChange,
    onShowAllTypes,
    onHideAllTypes,
    pinColors,
    selectedPinColor,
    onPinColorSelect,
    isLoading,
    error,
    onSearchSelect,
    searchFunction,
    onAddToSelection,
    onScissorsModeChange,
    onAddSectionModeChange,
    isScissorsMode,
    isAddSectionMode,
  } = props;

  return (
    <>
      {/* Cost Summary - panel kosztów */}
      {costs && (
        <div style={{
          position: 'absolute',
          top: '80px',
          right: '20px',
          zIndex: 90,
          pointerEvents: 'none',
        }}>
          <div style={{ pointerEvents: 'auto' }}>
            <CostSummary costs={costs} />
          </div>
        </div>
      )}

      {/* Visibility Controls - widoczność typów */}
      {elements.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          zIndex: 90,
          pointerEvents: 'none',
        }}>
          <div style={{ pointerEvents: 'auto' }}>
            <VisibilityControls
              elements={elements}
              visibleTypes={visibleTypes}
              onTypeVisibilityChange={onTypeVisibilityChange}
              onShowAll={onShowAllTypes}
              onHideAll={onHideAllTypes}
            />
          </div>
        </div>
      )}

      {/* Elements List - lista elementów */}
      {elements.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: '100px',
          left: '20px',
          zIndex: 90,
          maxHeight: '300px',
          overflowY: 'auto',
          pointerEvents: 'none',
        }}>
          <div style={{ pointerEvents: 'auto' }}>
            <ElementsList elements={elements} />
          </div>
        </div>
      )}

      {/* Loading/Error status */}
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1000,
          backgroundColor: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '20px',
          borderRadius: '8px',
          pointerEvents: 'auto',
        }}>
          Ładowanie modelu IFC...
        </div>
      )}

      {error && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1000,
          backgroundColor: 'rgba(220,38,38,0.9)',
          color: 'white',
          padding: '20px',
          borderRadius: '8px',
          pointerEvents: 'auto',
        }}>
          Błąd: {error}
        </div>
      )}
      
      {/* Panel z paletą kolorów dla pinowania */}
      {isPinMode && (
        <div 
          className="pin-color-palette"
          style={{
            position: 'absolute',
            top: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            padding: '12px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            pointerEvents: 'auto',
          }}
        >
          <div style={{ 
            fontSize: '14px', 
            fontWeight: '600', 
            color: 'hsl(var(--foreground))',
            marginBottom: '4px'
          }}>
            📌 Wybierz kolor pinezki
          </div>
          
          <div style={{ 
            display: 'flex', 
            gap: '8px',
            flexWrap: 'wrap',
            maxWidth: '300px'
          }}>
            {pinColors.map((colorOption) => (
              <button
                key={colorOption.color}
                onClick={() => {
                  console.log('🎨 Pin color button clicked:', colorOption.color, 'name:', colorOption.name);
                  onPinColorSelect(colorOption.color);
                }}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  border: selectedPinColor === colorOption.color 
                    ? '3px solid hsl(var(--primary))' 
                    : '2px solid hsl(var(--border))',
                  backgroundColor: colorOption.color,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: selectedPinColor === colorOption.color 
                    ? '0 0 0 2px hsl(var(--background)), 0 0 0 4px hsl(var(--primary))' 
                    : 'none',
                }}
                title={colorOption.name}
              />
            ))}
          </div>
          
          <div style={{
            fontSize: '12px',
            color: 'hsl(var(--muted-foreground))',
            marginTop: '4px',
            textAlign: 'center'
          }}>
            Kliknij na elementy aby je oznaczyć
          </div>
        </div>
      )}
      
      {/* Comment Panel */}
      {showCommentPanel && (
        <CommentPanel
          comments={getAllComments()}
          selectedElementId={selectedElementId}
          selectedElementName={selectedElementName}
          onAddComment={onAddComment}
          onDeleteComment={onDeleteComment}
          onClose={onCloseCommentPanel}
          onCommentClick={onCommentClick}
        />
      )}

      {/* Dimension Options Panel */}
      <DimensionOptionsPanel
        isOpen={isDimensionMode}
        orthogonalMode={dimensionOrthogonal}
        snapToPoints={dimensionSnap}
        alignToEdgeMode={alignToEdgeMode}
        onOrthogonalChange={onDimensionOrthogonalChange}
        onSnapChange={onDimensionSnapChange}
        onAlignToEdgeChange={onAlignToEdgeChange}
      />

      {/* Volume Options Panel */}
      {volumeMeasurerRef.current && (
        <VolumeOptionsPanel
          isOpen={isVolumeMode}
          volumeMeasurer={volumeMeasurerRef.current}
          onEnabledChange={onVolumeEnabledChange}
          onVisibleChange={onVolumeVisibleChange}
          onColorChange={onVolumeColorChange}
          onModeChange={onVolumeModeChange}
          onUnitsChange={onVolumeUnitsChange}
          onPrecisionChange={onVolumePrecisionChange}
          onDeleteAll={onVolumeDeleteAll}
          onLogValues={onVolumeLogValues}
        />
      )}

      {/* Search Panel */}
      {showSearchPanel && (
        <SearchPanel
          onClose={onCloseSearchPanel}
          onSelectElement={onSearchSelect}
          searchFunction={searchFunction}
          onAddToSelection={onAddToSelection}
        />
      )}

      {/* Selection Panel */}
      {showSelectionPanel && viewerRef.current && (
        <SelectionPanel
          selectedElements={selectedElements}
          isIsolated={isIsolated}
          onClose={onCloseSelectionPanel}
          onRemoveElement={onRemoveElement}
          onClearSelection={onClearSelection}
          onIsolate={onIsolate}
          onUnisolate={onUnisolate}
          onSelectElement={onSelectionElementClick}
          fragmentsManager={(viewerRef.current as any).fragments || getFragmentsManager(viewerRef.current)}
          loadedModels={getLoadedModels()}
        />
      )}

      {/* Visibility Panel */}
      {showVisibilityPanel && viewerRef.current && hiderRef.current && (
        <VisibilityPanel
          hider={hiderRef.current}
          fragmentsManager={(viewerRef.current as any).fragments || getFragmentsManager(viewerRef.current)}
          loadedModels={getLoadedModels()}
          onClose={onCloseVisibilityPanel}
        />
      )}

      {/* Views Panel */}
      {showViewsPanel && viewsManagerRef.current && (
        <ViewsPanel
          viewsManager={viewsManagerRef.current}
          onClose={() => {
            onCloseViewsPanel();
            onAddSectionModeChange(false);
            onScissorsModeChange(false);
          }}
          onAddSectionMode={() => {
            onAddSectionModeChange(!isAddSectionMode);
            if (!isAddSectionMode) onScissorsModeChange(false);
            console.log('🔄 Add Section Mode:', !isAddSectionMode);
          }}
          isAddSectionMode={isAddSectionMode}
          onScissorsMode={(enabled: boolean) => {
            onScissorsModeChange(enabled);
            if (enabled) onAddSectionModeChange(false);
            console.log('✂️ Scissors Mode:', enabled);
          }}
          isScissorsMode={isScissorsMode}
        />
      )}
    </>
  );
}
