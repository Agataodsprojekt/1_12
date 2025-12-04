import { useEffect, useRef, useState } from "react";
import * as OBC from "openbim-components";
import * as THREE from "three";
import ActionBar from "../components/ActionBar";
import CommentPanel from "../components/CommentPanel";
import DimensionOptionsPanel from "../components/DimensionOptionsPanel";
import VolumeOptionsPanel from "../components/VolumeOptionsPanel";
import { SearchPanel } from "../components/SearchPanel";
import { SelectionPanel, SelectedElement } from "../components/SelectionPanel";
import { VisibilityPanel } from "../components/VisibilityPanel";
import { ViewsPanel } from "../components/ViewsPanel";
import { CostSummary } from "../components/CostSummary";
import { VisibilityControls } from "../components/VisibilityControls";
import { ElementsList } from "../components/ElementsList";
import { useTheme } from "../contexts/ThemeContext";
import { useComments, Comment } from "../hooks/useComments";
import { useIFCData } from "../hooks/useIFCData";
import { usePins } from "../hooks/usePins";
import { useProject } from "../hooks/useProject";
import { useViewsAPI } from "../hooks/useViewsAPI";
import { useSelectionsAPI } from "../hooks/useSelectionsAPI";
import { useMeasurementsAPI } from "../hooks/useMeasurementsAPI";
import { SimpleDimensionTool } from "../utils/SimpleDimensionTool";
import { SimpleVolumeTool } from "../utils/SimpleVolumeTool";
import { SimpleHider } from "../utils/SimpleHider";
import { enableViewsFeature, ViewsManager } from "../utils/views";
import { getFragmentsManager, getHider, setLoadedModels, getLoadedModels } from "../lib/thatopen";
import { ExportDialog } from "../components/ExportDialog";
import { exportElementsToExcel } from "../utils/excelExport";
import { api } from "../lib/api";

const Viewer = () => {
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<OBC.Components | null>(null);
  const [activeAction, setActiveAction] = useState<string>("move");
  const [showCommentPanel, setShowCommentPanel] = useState(false);
  const [selectedElementId, setSelectedElementId] = useState<string | undefined>();
  const [selectedElementName, setSelectedElementName] = useState<string | undefined>();
  const { theme } = useTheme();
  const { comments, addComment, deleteComment, getAllComments } = useComments();
  
  // IFC Data from backend
  const {
    elements,
    costs,
    isLoading,
    error,
    visibleTypes,
    setIsLoading,
    handleParsed,
    handleError,
    handleTypeVisibilityChange,
    showAllTypes,
    hideAllTypes,
  } = useIFCData();
  
  const highlighterRef = useRef<OBC.FragmentHighlighter | null>(null);
  const hiderRef = useRef<SimpleHider | null>(null);
  const dimensionsRef = useRef<SimpleDimensionTool | null>(null);
  const modelObjectsRef = useRef<THREE.Object3D[]>([]);
  const ifcLoaderRef = useRef<OBC.FragmentIfcLoader | null>(null);
  
  // Pins - using hook with backend integration
  const {
    isPinMode,
    setIsPinMode,
    selectedPinColor,
    setSelectedPinColor,
    pinnedElements,
    pinColors,
    handlePinElement,
    isPinModeRef,
  } = usePins();
  
  // Keep refs for backward compatibility with existing code
  const selectedPinColorRef = useRef(selectedPinColor);
  const pinnedElementsRef = useRef<Map<string, string>>(new Map());
  
  // Stan dla wymiarowania
  const [isDimensionMode, setIsDimensionMode] = useState(false);
  const [dimensionOrthogonal, setDimensionOrthogonal] = useState(false);
  const [dimensionSnap, setDimensionSnap] = useState(true); // Domyślnie włączone
  const [alignToEdgeMode, setAlignToEdgeMode] = useState<'none' | 'parallel' | 'perpendicular'>('none');
  
  // Stan dla pomiaru objętości
  const [isVolumeMode, setIsVolumeMode] = useState(false);
  const isVolumeModeRef = useRef(false);
  const volumeMeasurerRef = useRef<any>(null); // OBC.VolumeMeasurement | SimpleVolumeTool
  
  // Stan dla wyszukiwania
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const loadedModelsRef = useRef<any[]>([]);
  
  // Stan dla selekcji i izolacji
  const [showSelectionPanel, setShowSelectionPanel] = useState(false);
  const [selectedElements, setSelectedElements] = useState<SelectedElement[]>([]);
  const selectedElementsRef = useRef<SelectedElement[]>([]); // Ref dla aktualnego stanu selekcji (używany w closure)
  const [isIsolated, setIsIsolated] = useState(false);
  
  // Stan dla Visibility Panel
  const [showVisibilityPanel, setShowVisibilityPanel] = useState(false);
  const hiddenFragmentsRef = useRef<Map<string, Set<number>>>(new Map());
  const originalFragmentsRef = useRef<Map<string, any>>(new Map()); // Przechowuje oryginalne fragmenty przed splittem
  const splitFragmentsRef = useRef<Map<string, THREE.Mesh[]>>(new Map()); // Przechowuje nowe podzielone fragmenty
  const showSelectionPanelRef = useRef(showSelectionPanel);
  const isCtrlPressedRef = useRef(false);
  
  // Stan dla Views Panel
  const [showViewsPanel, setShowViewsPanel] = useState(false);
  const [isAddSectionMode, setIsAddSectionMode] = useState(false);
  const isAddSectionModeRef = useRef(false);
  const [isScissorsMode, setIsScissorsMode] = useState(false);
  const isScissorsModeRef = useRef(false);
  const scissorsPointsRef = useRef<THREE.Vector3[]>([]);
  const scissorsPreviewLineRef = useRef<THREE.Line | null>(null);
  const viewsManagerRef = useRef<ViewsManager | null>(null);
  // Export dialog state
  const [showExportDialog, setShowExportDialog] = useState(false);
  
  // API hooks for backend integration
  const viewsAPI = useViewsAPI();
  const selectionsAPI = useSelectionsAPI();
  const measurementsAPI = useMeasurementsAPI();
  
  // Synchronizuj ref z state
  useEffect(() => {
    isAddSectionModeRef.current = isAddSectionMode;
  }, [isAddSectionMode]);
  
  useEffect(() => {
    isScissorsModeRef.current = isScissorsMode;
    if (!isScissorsMode) {
      // Reset scissors mode
      scissorsPointsRef.current = [];
      if (scissorsPreviewLineRef.current && viewerRef.current) {
        const scene = (viewerRef.current.scene as any).get();
        if (scene) {
          scene.remove(scissorsPreviewLineRef.current);
        }
        scissorsPreviewLineRef.current = null;
      }
    }
  }, [isScissorsMode]);
  
  
  // Sync refs with state (for backward compatibility)
  useEffect(() => {
    selectedPinColorRef.current = selectedPinColor;
  }, [selectedPinColor]);
  
  useEffect(() => {
    pinnedElementsRef.current = pinnedElements;
  }, [pinnedElements]);
  
  useEffect(() => {
    isVolumeModeRef.current = isVolumeMode;
  }, [isVolumeMode]);
  
  useEffect(() => {
    showSelectionPanelRef.current = showSelectionPanel;
  }, [showSelectionPanel]);
  
  // Synchronizuj ref z selectedElements (używany w closure)
  useEffect(() => {
    selectedElementsRef.current = selectedElements;
  }, [selectedElements]);
  
  // Synchronizuj opcje wymiarowania z narzędziem
  useEffect(() => {
    if (dimensionsRef.current) {
      dimensionsRef.current.orthogonalMode = dimensionOrthogonal;
      console.log('📏 Orthogonal mode:', dimensionOrthogonal);
    }
  }, [dimensionOrthogonal]);
  
  useEffect(() => {
    if (dimensionsRef.current) {
      dimensionsRef.current.snapToPoints = dimensionSnap;
      console.log('📏 Snap to points:', dimensionSnap);
    }
  }, [dimensionSnap]);
  
  useEffect(() => {
    if (dimensionsRef.current) {
      dimensionsRef.current.alignToEdgeMode = alignToEdgeMode;
      dimensionsRef.current.resetReferenceEdge();
      console.log('📏 Align to edge mode:', alignToEdgeMode);
    }
  }, [alignToEdgeMode]);
  
  // Animacja snap markera
  useEffect(() => {
    if (!isDimensionMode || !dimensionsRef.current) return;
    
    const animationInterval = setInterval(() => {
      if (dimensionsRef.current) {
        dimensionsRef.current.updateSnapMarker();
      }
    }, 50); // 20 FPS dla płynnej animacji
    
    return () => clearInterval(animationInterval);
  }, [isDimensionMode]);
  
  // pinColors comes from usePins hook
  
  // Ref aby zawsze mieć dostęp do najnowszych komentarzy
  const commentsRef = useRef(comments);
  useEffect(() => {
    commentsRef.current = comments;
  }, [comments]);

  // System historii akcji dla undo/redo
  interface Action {
    type: 'camera' | 'dimension_add' | 'dimension_delete';
    data: any;
    timestamp: number;
  }
  
  interface CameraState {
    position: THREE.Vector3;
    target: THREE.Vector3;
  }
  
  interface DimensionData {
    group: THREE.Group;
    start: THREE.Vector3;
    end: THREE.Vector3;
  }
  
  const actionHistory = useRef<Action[]>([]);
  const historyIndex = useRef<number>(-1);
  const isRestoringState = useRef<boolean>(false);

  useEffect(() => {
    if (!viewerContainerRef.current || viewerRef.current) return;

    // --- UTWORZENIE GŁÓWNEGO VIEWERA ---
    // Viewer musi być tworzony lokalnie - każdy komponent ma swój własny viewer
    // Tylko Hider i FragmentsManager są współdzielone
    const viewer = new OBC.Components();
    viewerRef.current = viewer;

    // --- SCENA ---
    const sceneComponent = new OBC.SimpleScene(viewer);
    viewer.scene = sceneComponent;
    const scene = sceneComponent.get();

    // --- OŚWIETLENIE ---
    // Ustaw światła - intensywność zostanie dostosowana przez useEffect z motywem
    const ambientLight = new THREE.AmbientLight(0xE6E7E4, 1);
    const directionalLight = new THREE.DirectionalLight(0xF9F9F9, 0.75);
    directionalLight.position.set(10, 50, 10);
    scene.add(ambientLight, directionalLight);
    
    // Ustaw początkowe tło - zostanie zaktualizowane przez useEffect z motywem
    scene.background = new THREE.Color(0x202932);

    // --- KONTENER RENDERA ---
    const rendererComponent = new OBC.PostproductionRenderer(viewer, viewerContainerRef.current);
    viewer.renderer = rendererComponent;
    
    // Enable local clipping for section views
    try {
      const threeRenderer = rendererComponent.get();
      if (threeRenderer && threeRenderer.localClippingEnabled !== undefined) {
        threeRenderer.localClippingEnabled = true;
        console.log('✅ Enabled local clipping in renderer');
      }
    } catch (e) {
      console.warn('⚠️ Could not enable local clipping:', e);
    }

    // --- KAMERA ---
    const cameraComponent = new OBC.OrthoPerspectiveCamera(viewer);
    viewer.camera = cameraComponent;
    
    // Włącz kontrolki kamery
    if (cameraComponent.controls) {
      cameraComponent.controls.enabled = true;
      console.log("📷 Camera controls enabled");
    }
    
    // Dodaj test listener aby sprawdzić czy eventy przechodzą do canvas
    const canvas = viewerContainerRef.current.querySelector('canvas');
    const testMouseDown = () => {
      console.log('🖱️ Canvas mousedown event detected!');
    };
    const testMouseMove = () => {
      console.log('🖱️ Canvas mousemove event detected!');
    };
    
    // Czekaj aż canvas się pojawi
    setTimeout(() => {
      const canvas = viewerContainerRef.current?.querySelector('canvas');
      if (canvas) {
        canvas.addEventListener('mousedown', testMouseDown);
        canvas.addEventListener('mousemove', testMouseMove);
        console.log('🖱️ Test listeners attached to canvas');
        
        // Usuń test listenery po 5 sekundach
        setTimeout(() => {
          canvas.removeEventListener('mousedown', testMouseDown);
          canvas.removeEventListener('mousemove', testMouseMove);
          console.log('🖱️ Test listeners removed');
        }, 5000);
      }
    }, 500);
    
    // Zapisz początkowy stan kamery
    setTimeout(() => {
      saveCameraState();
      console.log("📷 Initial camera state saved");
    }, 1000);
    
    // Dodaj listener na zmiany kamery (zapisz stan po każdej interakcji)
    let cameraChangeTimeout: number | null = null;
    cameraComponent.controls.addEventListener('controlend', () => {
      // Użyj debounce aby nie zapisywać stanu zbyt często
      if (cameraChangeTimeout) {
        clearTimeout(cameraChangeTimeout);
      }
      cameraChangeTimeout = window.setTimeout(() => {
        saveCameraState();
      }, 300);
    });

    // --- RAYCASTER ---
    const raycasterComponent = new OBC.SimpleRaycaster(viewer);
    viewer.raycaster = raycasterComponent;

    // --- VIEWS MANAGER ---
    const viewsManager = enableViewsFeature(viewer, scene, cameraComponent.get(), raycasterComponent);
    viewsManagerRef.current = viewsManager;
    
    // Integrate ViewsManager with API
    viewsManager.setAPIIntegration({
      createView: viewsAPI.createView,
      updateView: viewsAPI.updateView,
      deleteView: viewsAPI.deleteView,
    });
    
    console.log('✅ ViewsManager initialized with API integration');
    
    // Ensure renderer has local clipping enabled
    try {
      const threeRenderer = rendererComponent.get();
      if (threeRenderer && threeRenderer.localClippingEnabled !== undefined) {
        threeRenderer.localClippingEnabled = true;
        console.log('✅ Enabled localClippingEnabled in renderer for ViewsManager');
      }
    } catch (e) {
      console.warn('⚠️ Could not enable localClippingEnabled:', e);
    }

    // --- INICJALIZACJA VIEWERA ---
    viewer.init();
    rendererComponent.postproduction.enabled = true;

    // --- VOLUME MEASUREMENT ---
    // Use SimpleVolumeTool (custom implementation)
    const volumeMeasurer = new SimpleVolumeTool(scene, cameraComponent.get());
    volumeMeasurer.enabled = false; // Start disabled
    volumeMeasurer.visible = true;
    volumeMeasurer.color = new THREE.Color("#494cb6");
    volumeMeasurerRef.current = volumeMeasurer;
    console.log('✅ SimpleVolumeTool initialized');
    
    // Sprawdź czy canvas jest w kontenerze
    setTimeout(() => {
      if (viewerContainerRef.current) {
        const canvas = viewerContainerRef.current.querySelector('canvas');
        if (canvas) {
          console.log('✅ Canvas found in container:', {
            width: canvas.width,
            height: canvas.height,
            style: canvas.style.cssText,
            pointerEvents: window.getComputedStyle(canvas).pointerEvents
          });
        } else {
          console.error('❌ Canvas NOT found in container!');
        }
      }
    }, 100);

    // --- SIATKA (GRID) ---
    // Użyj własnej siatki zamiast SimpleGrid (który tworzy prostokąt w środku)
    const gridHelper = new THREE.GridHelper(100, 100, 0x666666, 0x444444);
    scene.add(gridHelper);
    
    // --- OSIE WSPÓŁRZĘDNYCH (zamiast prostokąta) ---
    const axesHelper = new THREE.AxesHelper(5); // Długość osi: 5 jednostek
    scene.add(axesHelper);

    // --- ŁADOWANIE MODELU IFC ---
    const ifcLoader = new OBC.FragmentIfcLoader(viewer);
    ifcLoader.setup();
    ifcLoaderRef.current = ifcLoader;

    // --- PODŚWIETLENIE I PANEL WŁAŚCIWOŚCI ---
    const highlighter = new OBC.FragmentHighlighter(viewer);
    highlighter.setup();
    
    // Setup() już tworzy domyślne grupy highlight, więc nie trzeba ich dodawać ręcznie
    // Wyłącz outline dla czystszego wyglądu
    highlighter.outlineEnabled = false;
    
    // Dodaj style dla pinowania (czarny i biały)
    // FragmentHighlighter.add() tworzy style z domyślnymi kolorami
    // Musimy skonfigurować kolory materiałów dla tych stylów
    highlighter.add("pin-black", []);
    highlighter.add("pin-white", []);
    
    // Skonfiguruj kolory dla stylów pinowania
    // FragmentHighlighter przechowuje style w różnych miejscach w zależności od wersji
    const highlighterAny = highlighter as any;
    
    // Spróbuj znaleźć i skonfigurować materiały dla stylów
    const configurePinStyleColors = () => {
      try {
        // Metoda 1: Sprawdź czy style są w styles map
        if (highlighterAny.styles && typeof highlighterAny.styles.get === 'function') {
          const blackStyle = highlighterAny.styles.get("pin-black");
          const whiteStyle = highlighterAny.styles.get("pin-white");
          
          if (blackStyle) {
            // Style może mieć material lub materials (array)
            const materials = blackStyle.material ? [blackStyle.material] : (blackStyle.materials || []);
            materials.forEach((mat: any) => {
              if (mat && mat.color) {
                mat.color.setHex(0x000000); // Czarny
                mat.needsUpdate = true;
              }
            });
            console.log('✅ Configured pin-black style color');
          }
          
          if (whiteStyle) {
            const materials = whiteStyle.material ? [whiteStyle.material] : (whiteStyle.materials || []);
            materials.forEach((mat: any) => {
              if (mat && mat.color) {
                mat.color.setHex(0xFFFFFF); // Biały
                mat.needsUpdate = true;
              }
            });
            console.log('✅ Configured pin-white style color');
          }
        }
        
        // Metoda 2: Sprawdź czy style są w materials map
        if (highlighterAny.materials && typeof highlighterAny.materials.get === 'function') {
          const blackMat = highlighterAny.materials.get("pin-black");
          const whiteMat = highlighterAny.materials.get("pin-white");
          
          if (blackMat && blackMat.color) {
            blackMat.color.setHex(0x000000);
            blackMat.needsUpdate = true;
            console.log('✅ Configured pin-black material color');
          }
          
          if (whiteMat && whiteMat.color) {
            whiteMat.color.setHex(0xFFFFFF);
            whiteMat.needsUpdate = true;
            console.log('✅ Configured pin-white material color');
          }
        }
        
        // Metoda 3: Sprawdź czy style są bezpośrednio dostępne
        if (highlighterAny["pin-black"]) {
          const blackStyle = highlighterAny["pin-black"];
          if (blackStyle.material && blackStyle.material.color) {
            blackStyle.material.color.setHex(0x000000);
            blackStyle.material.needsUpdate = true;
            console.log('✅ Configured pin-black via direct access');
          }
        }
        
        if (highlighterAny["pin-white"]) {
          const whiteStyle = highlighterAny["pin-white"];
          if (whiteStyle.material && whiteStyle.material.color) {
            whiteStyle.material.color.setHex(0xFFFFFF);
            whiteStyle.material.needsUpdate = true;
            console.log('✅ Configured pin-white via direct access');
          }
        }
      } catch (e) {
        console.warn('⚠️ Could not configure pin style colors:', e);
      }
    };
    
    // Spróbuj skonfigurować kolory od razu
    configurePinStyleColors();
    
    // Zapisz funkcję do późniejszego użycia (po załadowaniu modelu)
    (highlighter as any).configurePinColors = configurePinStyleColors;
    
    console.log('✅ Added pin styles: pin-black, pin-white');
    
    highlighterRef.current = highlighter;

    // --- HIDER (ZARZĄDZANIE WIDOCZNOŚCIĄ) ---
    // Użyj wspólnej instancji SimpleHider z lib/thatopen.ts
    // Hider jest współdzielony między komponentami
    const hider = getHider();
    hiderRef.current = hider;
    console.log('✅ SimpleHider initialized (shared instance)');
    
    // FragmentsManager będzie pobrany później, gdy viewer będzie gotowy
    // (po inicjalizacji i załadowaniu modelu)

    // --- NARZĘDZIE WYMIAROWANIA (własna implementacja) ---
    const dimensions = new SimpleDimensionTool(scene, cameraComponent.get());
    dimensionsRef.current = dimensions;
    
    // Callback wywoływany gdy wymiar jest tworzony (dla undo/redo i API)
    dimensions.onMeasurementCreated = async (dimensionData) => {
      const action: Action = {
        type: 'dimension_add',
        data: dimensionData,
        timestamp: Date.now(),
      };
      saveAction(action);
      console.log('📏 Dimension saved to history');
      
      // Save to backend API
      try {
        await measurementsAPI.calculateDimension(dimensionData.start, dimensionData.end);
        console.log('✅ Dimension saved to backend');
      } catch (error) {
        console.warn('⚠️ Failed to save dimension to backend:', error);
      }
    };
    
    // Event listener dla ruchu myszy w trybie wymiarowania (podgląd)
    // Tylko pokazuj podgląd gdy Shift jest wciśnięty
    const handleDimensionMove = (event: MouseEvent) => {
      // Handle scissors mode preview first
      if (isScissorsModeRef.current) {
        handleScissorsMouseMove(event);
        return;
      }
      
      if (!dimensions.enabled || modelObjectsRef.current.length === 0) return;
      
      // Tylko pokazuj podgląd gdy Shift jest wciśnięty
      if (event.shiftKey) {
        dimensions.handleMouseMove(event, modelObjectsRef.current);
      } else {
        // Bez Shift - wyczyść podgląd aby nie przeszkadzał
        dimensions.clearPreviewAndSnap();
      }
    };
    
    // Stan dla zaznaczonego wymiaru do usunięcia
    let selectedMeasurementToDelete: THREE.Group | null = null;
    
    // Zmienne dla wykrywania podwójnego kliknięcia i Shift
    let lastClickTime = 0;
    const doubleClickThreshold = 300; // ms
    
    // Handler dla narzędzia nożyczek (scissors tool)
    const handleScissorsClick = async (event: MouseEvent) => {
      if (!isScissorsModeRef.current || !viewerContainerRef.current || !viewsManagerRef.current) return;
      
      // Ignore if dimension mode is active
      if (dimensions.enabled && event.shiftKey) return;
      
      event.preventDefault();
      event.stopPropagation();
      
      try {
        const canvas = viewerContainerRef.current.querySelector('canvas');
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        const mouse = new THREE.Vector2();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Get camera direction (forward vector)
        const camera = cameraComponent.get();
        const cameraDirection = new THREE.Vector3();
        camera.getWorldDirection(cameraDirection);
        
        // Use raycaster to find intersection point
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        
        // Get all meshes
        const meshes: THREE.Mesh[] = [];
        for (const model of loadedModelsRef.current) {
          for (const item of model.items || []) {
            if (item.mesh && (item.mesh instanceof THREE.Mesh || item.mesh instanceof THREE.InstancedMesh)) {
              meshes.push(item.mesh as THREE.Mesh);
            }
          }
        }
        
        const intersects = raycaster.intersectObjects(meshes, true);
        
        if (intersects.length > 0) {
          const point = intersects[0].point.clone();
          scissorsPointsRef.current.push(point);
          
          console.log(`✂️ Scissors: Point ${scissorsPointsRef.current.length} at:`, point);
          
          // If we have 2 points, create the section
          if (scissorsPointsRef.current.length === 2) {
            const [point1, point2] = scissorsPointsRef.current;
            
            // Calculate line length for better range
            const lineLength = point1.distanceTo(point2);
            const calculatedRange = Math.max(lineLength * 2, 50); // At least 50 units
            
            console.log('✂️ Line length:', lineLength, 'Calculated range:', calculatedRange);
            
            // Create section view from two points
            const view = await viewsManagerRef.current.createSectionViewFromPoints(
              point1,
              point2,
              cameraDirection,
              {
                name: `Scissors Section ${viewsManagerRef.current.getAllViews().length + 1}`,
                range: calculatedRange, // Use calculated range instead of fixed 10
                helpersVisible: true
              }
            );
            
            if (view) {
              console.log('✅ Scissors section created:', view.name);
              setIsScissorsMode(false);
              
              // Automatically open the view
              try {
                await viewsManagerRef.current.openView(view.id);
                console.log('✅ Scissors section view automatically opened');
              } catch (error) {
                console.error('❌ Error auto-opening view:', error);
              }
              
              window.dispatchEvent(new CustomEvent('views-updated'));
            }
            
            // Reset points
            scissorsPointsRef.current = [];
          } else {
            // Update preview line
            updateScissorsPreview();
          }
        } else {
          // If no intersection, use point on camera plane at fixed distance
          const distance = 10;
          const point = new THREE.Vector3();
          raycaster.ray.at(distance, point);
          scissorsPointsRef.current.push(point);
          
          console.log(`✂️ Scissors: Point ${scissorsPointsRef.current.length} (no intersection) at:`, point);
          
          if (scissorsPointsRef.current.length === 2) {
            const [point1, point2] = scissorsPointsRef.current;
            
            // Calculate line length for better range
            const lineLength = point1.distanceTo(point2);
            const calculatedRange = Math.max(lineLength * 2, 50); // At least 50 units
            
            console.log('✂️ Line length (no intersection):', lineLength, 'Calculated range:', calculatedRange);
            
            const view = await viewsManagerRef.current.createSectionViewFromPoints(
              point1,
              point2,
              cameraDirection,
              {
                name: `Scissors Section ${viewsManagerRef.current.getAllViews().length + 1}`,
                range: calculatedRange, // Use calculated range instead of fixed 10
                helpersVisible: true
              }
            );
            
            if (view) {
              console.log('✅ Scissors section created:', view.name);
              setIsScissorsMode(false);
              
              // Automatically open the view
              try {
                await viewsManagerRef.current.openView(view.id);
                console.log('✅ Scissors section view automatically opened');
              } catch (error) {
                console.error('❌ Error auto-opening view:', error);
              }
              
              window.dispatchEvent(new CustomEvent('views-updated'));
            }
            
            scissorsPointsRef.current = [];
          } else {
            updateScissorsPreview();
          }
        }
      } catch (error) {
        console.error('❌ Error in scissors tool:', error);
      }
    };
    
    // Update preview line for scissors tool
    const updateScissorsPreview = (mousePoint?: THREE.Vector3) => {
      if (!viewerRef.current) return;
      
      const scene = (viewerRef.current.scene as any).get();
      if (!scene) return;
      
      // Remove old preview
      if (scissorsPreviewLineRef.current) {
        scene.remove(scissorsPreviewLineRef.current);
        scissorsPreviewLineRef.current.geometry.dispose();
        if (scissorsPreviewLineRef.current.material instanceof THREE.Material) {
          scissorsPreviewLineRef.current.material.dispose();
        }
        scissorsPreviewLineRef.current = null;
      }
      
      // Create new preview line
      if (scissorsPointsRef.current.length === 1 && mousePoint) {
        // Show line from first point to current mouse position
        const points = [scissorsPointsRef.current[0], mousePoint];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 3 });
        const line = new THREE.Line(geometry, material);
        scissorsPreviewLineRef.current = line;
        scene.add(line);
      } else if (scissorsPointsRef.current.length === 2) {
        // Show line between two points
        const geometry = new THREE.BufferGeometry().setFromPoints(scissorsPointsRef.current);
        const material = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 3 });
        const line = new THREE.Line(geometry, material);
        scissorsPreviewLineRef.current = line;
        scene.add(line);
      }
    };
    
    // Handler for mouse move in scissors mode (preview line)
    const handleScissorsMouseMove = (event: MouseEvent) => {
      if (!isScissorsModeRef.current || !viewerContainerRef.current || scissorsPointsRef.current.length !== 1) return;
      
      try {
        const canvas = viewerContainerRef.current.querySelector('canvas');
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        const mouse = new THREE.Vector2();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Use raycaster to find intersection point
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, cameraComponent.get());
        
        // Get all meshes
        const meshes: THREE.Mesh[] = [];
        for (const model of loadedModelsRef.current) {
          for (const item of model.items || []) {
            if (item.mesh && (item.mesh instanceof THREE.Mesh || item.mesh instanceof THREE.InstancedMesh)) {
              meshes.push(item.mesh as THREE.Mesh);
            }
          }
        }
        
        const intersects = raycaster.intersectObjects(meshes, true);
        
        let mousePoint: THREE.Vector3;
        if (intersects.length > 0) {
          mousePoint = intersects[0].point.clone();
        } else {
          // If no intersection, use point on camera plane at fixed distance
          const distance = 10;
          mousePoint = new THREE.Vector3();
          raycaster.ray.at(distance, mousePoint);
        }
        
        updateScissorsPreview(mousePoint);
      } catch (error) {
        // Ignore errors during preview
      }
    };
    
    // Handler dla dodawania przekroju (single click w trybie add section)
    const handleAddSectionClick = async (event: MouseEvent) => {
      // Sprawdź czy tryb dodawania przekroju jest aktywny
      if (!isAddSectionModeRef.current) return;
      
      // Ignore if dimension mode is active (Shift+click is for dimensions)
      if (dimensions.enabled && event.shiftKey) return;
      
      console.log('🖱️ Add Section mode: Click detected on model');
      
      if (!viewsManagerRef.current || !viewerContainerRef.current) {
        console.warn('⚠️ ViewsManager or container not available');
        return;
      }
      
      try {
        // Get mouse position relative to canvas
        const canvas = viewerContainerRef.current.querySelector('canvas');
        if (!canvas) {
          console.warn('⚠️ Canvas not found');
          return;
        }
        
        const rect = canvas.getBoundingClientRect();
        const mouse = new THREE.Vector2();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        console.log('🖱️ Mouse position:', mouse);
        
        // Use THREE.Raycaster (more reliable)
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, cameraComponent.get());
        
        // Get all meshes from loaded models
        const meshes: THREE.Mesh[] = [];
        for (const model of loadedModelsRef.current) {
          for (const item of model.items || []) {
            if (item.mesh && item.mesh instanceof THREE.Mesh) {
              meshes.push(item.mesh);
            }
          }
        }
        
        console.log(`📦 Found ${meshes.length} meshes for raycasting`);
        const intersects = raycaster.intersectObjects(meshes, true);
        console.log(`🎯 Found ${intersects.length} intersections`);
        
        if (intersects.length > 0) {
          const intersection = intersects[0];
          const point = intersection.point;
          let normal = intersection.face?.normal;
          
          console.log('🔍 Intersection:', {
            point,
            hasNormal: !!normal,
            faceIndex: intersection.faceIndex
          });
          
          // If no face normal, calculate from geometry
          if (!normal && intersection.object instanceof THREE.Mesh) {
            const geometry = intersection.object.geometry;
            if (geometry && intersection.faceIndex !== undefined && intersection.faceIndex >= 0) {
              const positionAttribute = geometry.getAttribute('position');
              if (positionAttribute) {
                const a = intersection.faceIndex * 3;
                const vA = new THREE.Vector3().fromBufferAttribute(positionAttribute, a);
                const vB = new THREE.Vector3().fromBufferAttribute(positionAttribute, a + 1);
                const vC = new THREE.Vector3().fromBufferAttribute(positionAttribute, a + 2);
                
                vA.applyMatrix4(intersection.object.matrixWorld);
                vB.applyMatrix4(intersection.object.matrixWorld);
                vC.applyMatrix4(intersection.object.matrixWorld);
                
                const edge1 = new THREE.Vector3().subVectors(vB, vA);
                const edge2 = new THREE.Vector3().subVectors(vC, vA);
                normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();
                console.log('📐 Calculated normal from geometry:', normal);
              }
            }
          }
          
          if (normal && intersection.object instanceof THREE.Mesh) {
            // Transform normal to world space
            const worldNormal = new THREE.Vector3();
            normal = normal.clone();
            
            if (intersection.object.matrixWorld) {
              const normalMatrix = new THREE.Matrix3().getNormalMatrix(intersection.object.matrixWorld);
              worldNormal.copy(normal).applyMatrix3(normalMatrix).normalize();
            } else {
              worldNormal.copy(normal).normalize();
            }
            
            console.log('🌍 World normal:', worldNormal);
            
            // Create section view
            const view = await viewsManagerRef.current.createSectionViewWithNormal(
              worldNormal,
              point,
              {
                name: `Section ${viewsManagerRef.current.getAllViews().length + 1}`,
                range: 10,
                helpersVisible: true
              }
            );
            
            if (view) {
              console.log('✅ Section view created:', view.name);
              
              // Disable add section mode
              setIsAddSectionMode(false);
              
              // Refresh ViewsPanel
              window.dispatchEvent(new CustomEvent('views-updated'));
            } else {
              console.error('❌ Failed to create section view');
            }
          } else {
            console.warn('⚠️ No valid normal found for intersection');
          }
        } else {
          console.warn('⚠️ No intersection found - click was not on model');
        }
      } catch (error) {
        console.error('❌ Error creating section view:', error);
      }
    };
    
    // Obsługa kliknięć: Shift + klik = dodaj punkt, Shift + podwójny klik = zaznacz do usunięcia
    const handleDimensionClickWithDelete = (event: MouseEvent) => {
      // Volume mode doesn't use click handler - it calculates volume from selected elements
      // Volume is calculated automatically when elements are selected via highlighter
      if (isVolumeModeRef.current) {
        // Volume measurement works through element selection, not clicks
        return;
      }
      
      // Check scissors mode
      if (isScissorsModeRef.current) {
        handleScissorsClick(event);
        return;
      }
      
      // Check add section mode
      if (isAddSectionModeRef.current) {
        handleAddSectionClick(event);
        return;
      }
      
      if (!dimensions.enabled) return;
      
      // WAŻNE: Tylko reaguj gdy Shift jest wciśnięty!
      // Bez Shift = pozwól kontrolkom kamery działać normalnie
      if (!event.shiftKey) {
        return; // Kamera może swobodnie działać
      }
      
      const currentTime = Date.now();
      const timeSinceLastClick = currentTime - lastClickTime;
      
      // Shift + Podwójne kliknięcie = zaznacz wymiar do usunięcia
      if (timeSinceLastClick < doubleClickThreshold) {
        console.log('🎯 Shift+Double-click detected - trying to select measurement for deletion');
        event.stopPropagation();
        event.preventDefault();
        
        // Wyczyść poprzednie zaznaczenie
        if (selectedMeasurementToDelete) {
          dimensions.highlightMeasurement(selectedMeasurementToDelete, false);
        }
        
        selectedMeasurementToDelete = dimensions.handleRightClick(event, modelObjectsRef.current);
        if (selectedMeasurementToDelete) {
          console.log('✅ Measurement selected for deletion. Press Delete to remove.');
          dimensions.highlightMeasurement(selectedMeasurementToDelete, true);
        } else {
          console.log('❌ No measurement found at click position');
        }
        
        lastClickTime = 0; // Reset czasu
        return; // Nie dodawaj punktu!
      }
      
      // Shift + Pojedyncze kliknięcie = dodaj punkt wymiaru
      lastClickTime = currentTime;
      
      // Małe opóźnienie aby sprawdzić czy to nie będzie podwójne kliknięcie
      setTimeout(() => {
        if (Date.now() - lastClickTime >= doubleClickThreshold && modelObjectsRef.current.length > 0) {
          console.log('➕ Shift+click - adding dimension point');
          dimensions.handleClick(event, modelObjectsRef.current);
        }
      }, doubleClickThreshold);
    };
    
    // Event listener dla klawisza ESC (anulowanie bieżącego wymiaru) i Delete (usuwanie)
    const handleKeyDown = (event: KeyboardEvent) => {
      // Śledź Ctrl
      if (event.key === 'Control' || event.ctrlKey) {
        isCtrlPressedRef.current = true;
      }
      
      // Handle volume measurement keys
      if (isVolumeModeRef.current && volumeMeasurerRef.current) {
        if (event.code === 'Enter' || event.code === 'NumpadEnter') {
          if (volumeMeasurerRef.current.endCreation) {
            volumeMeasurerRef.current.endCreation();
            console.log('✅ Volume measurement creation ended');
          }
          return;
        } else if (event.key === 'Delete' || event.key === 'Backspace') {
          if (volumeMeasurerRef.current.delete) {
            volumeMeasurerRef.current.delete();
            console.log('✅ Volume measurement deleted');
          }
          return;
        } else if (event.key === 'Escape') {
          // Cancel volume measurement creation if in progress
          if (volumeMeasurerRef.current.endCreation) {
            volumeMeasurerRef.current.endCreation();
            console.log('❌ Volume measurement creation canceled');
          }
          return;
        }
      }
      
      if (dimensions.enabled) {
        if (event.key === 'Escape') {
          dimensions.cancelCurrentMeasurement();
          if (selectedMeasurementToDelete) {
            dimensions.highlightMeasurement(selectedMeasurementToDelete, false);
          }
          selectedMeasurementToDelete = null;
          console.log('📏 Current measurement canceled');
        } else if (event.key === 'Delete' && selectedMeasurementToDelete) {
          // Zapisz dane wymiaru przed usunięciem (dla undo)
          const dimensionData = dimensions.getMeasurementData(selectedMeasurementToDelete);
          if (dimensionData) {
            const action: Action = {
              type: 'dimension_delete',
              data: dimensionData,
              timestamp: Date.now(),
            };
            saveAction(action);
          }
          
          dimensions.deleteMeasurement(selectedMeasurementToDelete);
          selectedMeasurementToDelete = null;
          console.log('📏 Measurement deleted and saved to history');
        }
      }
    };
    
    // Event listener dla puszczenia Ctrl
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Control') {
        isCtrlPressedRef.current = false;
      }
      
      // ESC - cancel add section mode or scissors mode
      if (event.key === 'Escape') {
        if (isAddSectionModeRef.current) {
          console.log('❌ Canceling add section mode');
          setIsAddSectionMode(false);
        }
        if (isScissorsModeRef.current) {
          console.log('❌ Canceling scissors mode');
          setIsScissorsMode(false);
        }
      }
    };
    
    viewerContainerRef.current.addEventListener('click', handleDimensionClickWithDelete);
    viewerContainerRef.current.addEventListener('mousemove', handleDimensionMove);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    console.log("📏 Simple dimension tool initialized");

    // --- DOUBLE-CLICK HANDLER FOR SECTION VIEWS ---
    let viewsLastClickTime = 0;
    const viewsDoubleClickThreshold = 300; // ms
    
    const handleDoubleClick = async (event: MouseEvent) => {
      console.log('🖱️ Double-click event received!', {
        target: event.target,
        currentTarget: event.currentTarget,
        button: event.button,
        shiftKey: event.shiftKey,
        dimensionsEnabled: dimensions.enabled
      });
      
      // Ignore if dimension mode is active (Shift+click is for dimensions)
      if (dimensions.enabled && event.shiftKey) {
        console.log('⚠️ Ignoring double-click - dimension mode active with Shift');
        return;
      }
      
      // Handle volume measurement double-click
      if (isVolumeModeRef.current && volumeMeasurerRef.current) {
        console.log('📦 Volume mode active - starting volume measurement');
        event.preventDefault();
        event.stopPropagation();
        try {
          if (volumeMeasurerRef.current.create) {
            await volumeMeasurerRef.current.create();
            console.log('✅ Volume measurement creation started - click on model to set points');
          }
        } catch (e) {
          console.error('❌ Error creating volume measurement:', e);
        }
        return;
      }
      
      // Prevent default to avoid conflicts
      event.preventDefault();
      event.stopPropagation();
      
      const currentTime = Date.now();
      const timeSinceLastClick = currentTime - viewsLastClickTime;
      
      console.log('⏱️ Time since last click:', timeSinceLastClick, 'ms');
      
      if (timeSinceLastClick < viewsDoubleClickThreshold) {
        // Double-click detected
        console.log('🖱️✅ Double-click detected, creating section view...');
        
        if (!viewsManagerRef.current || !viewerContainerRef.current) return;
        
        try {
          // Get mouse position relative to canvas
          const canvas = viewerContainerRef.current.querySelector('canvas');
          if (!canvas) return;
          
          const rect = canvas.getBoundingClientRect();
          const mouse = new THREE.Vector2();
          mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
          
          // Use the viewer's raycaster if available
          let intersects: THREE.Intersection[] = [];
          let useOBCRaycaster = false;
          
          if (viewerRef.current && viewerRef.current.raycaster) {
            // Use OBC raycaster
            const obcRaycaster = viewerRef.current.raycaster as any;
            console.log('🔍 OBC Raycaster available:', {
              hasCast: typeof obcRaycaster.cast === 'function',
              hasCastRay: typeof obcRaycaster.castRay === 'function',
              raycasterType: obcRaycaster.constructor?.name
            });
            
            // Try castRay() first (as in the example code)
            if (obcRaycaster.castRay && typeof obcRaycaster.castRay === 'function') {
              try {
                const result = await obcRaycaster.castRay();
                console.log('🎯 castRay() result:', result);
                if (result && result.normal && result.point) {
                  // OBC format: { normal, point }
                  // Convert to THREE.Intersection format
                  intersects = [{
                    point: new THREE.Vector3(result.point.x, result.point.y, result.point.z),
                    face: {
                      normal: new THREE.Vector3(result.normal.x, result.normal.y, result.normal.z)
                    } as THREE.Face,
                    distance: 0,
                    object: new THREE.Object3D() // Placeholder
                  } as THREE.Intersection];
                  useOBCRaycaster = true;
                  console.log('✅ Using OBC castRay() result');
                }
              } catch (e) {
                console.warn('⚠️ castRay() failed:', e);
              }
            }
            
            // Try cast() as fallback
            if (intersects.length === 0 && obcRaycaster.cast && typeof obcRaycaster.cast === 'function') {
              try {
                const result = obcRaycaster.cast(mouse);
                console.log('🎯 cast() result:', result);
                if (result && Array.isArray(result) && result.length > 0) {
                  intersects = result;
                  useOBCRaycaster = true;
                  console.log('✅ Using OBC cast() result');
                }
              } catch (e) {
                console.warn('⚠️ cast() failed:', e);
              }
            }
          }
          
          // Fallback: use THREE.Raycaster
          if (intersects.length === 0) {
            console.log('🔄 Using THREE.Raycaster as fallback');
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, cameraComponent.get());
            
            // Get all meshes from loaded models
            const meshes: THREE.Mesh[] = [];
            for (const model of loadedModelsRef.current) {
              for (const item of model.items || []) {
                if (item.mesh && item.mesh instanceof THREE.Mesh) {
                  meshes.push(item.mesh);
                }
              }
            }
            
            console.log(`📦 Found ${meshes.length} meshes for raycasting`);
            intersects = raycaster.intersectObjects(meshes, true);
            console.log(`🎯 THREE.Raycaster found ${intersects.length} intersections`);
          }
          
          if (intersects.length > 0) {
            const intersection = intersects[0];
            console.log('🔍 Intersection found:', {
              point: intersection.point,
              face: intersection.face,
              object: intersection.object,
              hasNormal: !!intersection.face?.normal
            });
            
            const point = intersection.point;
            let normal = intersection.face?.normal;
            
            // If no face normal, try to calculate from geometry
            if (!normal && intersection.object instanceof THREE.Mesh) {
              const geometry = intersection.object.geometry;
              if (geometry && intersection.faceIndex !== undefined) {
                const positionAttribute = geometry.getAttribute('position');
                if (positionAttribute && intersection.faceIndex >= 0) {
                  // Calculate normal from face vertices
                  const a = intersection.faceIndex * 3;
                  const vA = new THREE.Vector3().fromBufferAttribute(positionAttribute, a);
                  const vB = new THREE.Vector3().fromBufferAttribute(positionAttribute, a + 1);
                  const vC = new THREE.Vector3().fromBufferAttribute(positionAttribute, a + 2);
                  
                  // Transform to world space
                  vA.applyMatrix4(intersection.object.matrixWorld);
                  vB.applyMatrix4(intersection.object.matrixWorld);
                  vC.applyMatrix4(intersection.object.matrixWorld);
                  
                  // Calculate normal
                  const edge1 = new THREE.Vector3().subVectors(vB, vA);
                  const edge2 = new THREE.Vector3().subVectors(vC, vA);
                  normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();
                  console.log('📐 Calculated normal from geometry:', normal);
                }
              }
            }
            
            if (normal && intersection.object instanceof THREE.Mesh) {
              // Transform normal to world space
              const worldNormal = new THREE.Vector3();
              normal = normal.clone();
              
              // Apply object's world matrix to normal
              if (intersection.object.matrixWorld) {
                const normalMatrix = new THREE.Matrix3().getNormalMatrix(intersection.object.matrixWorld);
                worldNormal.copy(normal).applyMatrix3(normalMatrix).normalize();
                console.log('🌍 Transformed normal to world space:', worldNormal);
              } else {
                worldNormal.copy(normal).normalize();
                console.log('🌍 Using normal as-is (no matrix):', worldNormal);
              }
              
              // Create section view using the new method (with inverted normal and offset point)
              // This matches the provided code example
              console.log('🎬 Creating section view with:', {
                normal: worldNormal,
                point: point,
                range: 10
              });
              
              const view = await viewsManagerRef.current.createSectionViewWithNormal(
                worldNormal,
                point,
                {
                  name: `Section ${viewsManagerRef.current.getAllViews().length + 1}`,
                  range: 10, // Default range as in the example
                  helpersVisible: true // Enable helpers to see if it works
                }
              );
              
              if (view) {
                console.log('✅ Section view created successfully:', view.name);
                console.log('   View ID:', view.id);
                console.log('   View type:', view.type);
                console.log('   Normal (inverted):', view.normal);
                console.log('   Point (with offset):', view.point);
                
                // Refresh ViewsPanel to show the new view
                window.dispatchEvent(new CustomEvent('views-updated'));
              } else {
                console.error('❌ Failed to create section view - view is null');
              }
            } else {
              console.warn('⚠️ No valid normal found for intersection', {
                hasNormal: !!normal,
                isMesh: intersection.object instanceof THREE.Mesh,
                objectType: intersection.object?.constructor?.name
              });
            }
          } else {
            console.log('⚠️ No intersection found for double-click');
            console.log('   Mouse position:', mouse);
            console.log('   Canvas:', canvas ? 'found' : 'not found');
          }
        } catch (error) {
          console.error('❌ Error creating section view from double-click:', error);
        }
        
        viewsLastClickTime = 0; // Reset
      } else {
        viewsLastClickTime = currentTime;
      }
    };
    
    // Add double-click listener to both container and canvas
    // Canvas might be the actual target for mouse events
    const addDoubleClickListener = () => {
      if (viewerContainerRef.current) {
        viewerContainerRef.current.addEventListener('dblclick', handleDoubleClick, { capture: true });
        console.log('✅ Double-click handler added to container');
        
        // Also try to add to canvas directly
        const canvas = viewerContainerRef.current.querySelector('canvas');
        if (canvas) {
          canvas.addEventListener('dblclick', handleDoubleClick, { capture: true });
          console.log('✅ Double-click handler added to canvas');
        } else {
          // Wait for canvas to appear
          setTimeout(() => {
            const canvas = viewerContainerRef.current?.querySelector('canvas');
            if (canvas) {
              canvas.addEventListener('dblclick', handleDoubleClick, { capture: true });
              console.log('✅ Double-click handler added to canvas (delayed)');
            }
          }, 1000);
        }
      }
    };
    
    // Add listener after a short delay to ensure everything is initialized
    setTimeout(addDoubleClickListener, 500);
    console.log('✅ Double-click handler for section views initialized');

    // Pętla aktualizacji dla wymiarów (skalowanie etykiet względem kamery)
    let animationFrameId: number;
    const updateLoop = () => {
      if (dimensions) {
        dimensions.update();
      }
      animationFrameId = requestAnimationFrame(updateLoop);
    };
    updateLoop();

    const propertiesProcessor = new OBC.IfcPropertiesProcessor(viewer);

      // --- Po wczytaniu modelu ---
    ifcLoader.onIfcLoaded.add(async (model: any) => {
      // przetwarzanie właściwości
      propertiesProcessor.process(model);
      await highlighter.updateHighlight();
      
      // Po załadowaniu modelu, spróbuj ponownie skonfigurować kolory stylów pinowania
      // (niektóre style mogą być inicjalizowane dopiero po updateHighlight)
      if ((highlighter as any).configurePinColors) {
        (highlighter as any).configurePinColors();
        console.log('✅ Attempted to configure pin style colors after model load');
      }
      
      // Zapisz model dla wyszukiwania
      loadedModelsRef.current.push(model);
      console.log(`🔍 Model loaded for search: ${loadedModelsRef.current.length} total models`);
      
      // Zaktualizuj modele w wspólnej instancji SimpleHider
      setLoadedModels(loadedModelsRef.current);
      
      // Event: odśwież kategorie w VisibilityPanel (zawsze, nie tylko gdy panel jest otwarty)
      // To wywoła refreshCategories w komponencie VisibilityPanel
      window.dispatchEvent(new CustomEvent('ifc-model-loaded', { 
        detail: { model, models: loadedModelsRef.current } 
      }));
      console.log('📢 Dispatched ifc-model-loaded event for category refresh');
      
      // Automatyczne tworzenie widoków z storeys
      // Użyj setTimeout aby upewnić się, że modele są w pełni załadowane
      setTimeout(async () => {
        if (viewsManagerRef.current) {
          try {
            console.log('🏗️ Starting storey views creation...');
            const createdViews = await viewsManagerRef.current.createStoreyViewsFromModels();
            console.log(`✅ Created ${createdViews.length} storey view(s) from loaded models`);
            
            // Dispatch event to notify ViewsPanel
            window.dispatchEvent(new CustomEvent('views-created', {
              detail: { count: createdViews.length }
            }));
          } catch (error) {
            console.error('❌ Error creating storey views:', error);
          }
        }
      }, 1000); // Wait 1 second for model to be fully processed
      
      // Zapisz obiekty modelu dla narzędzia wymiarowania
      const meshes: THREE.Object3D[] = [];
      model.items.forEach((item: any) => {
        if (item.mesh) {
          meshes.push(item.mesh);
        }
      });
      modelObjectsRef.current = meshes;
      console.log(`📏 Loaded ${meshes.length} objects for dimension tool`);

      // reagowanie na zaznaczenia
      highlighter.events.select.onHighlight.add(async (selection: any) => {
        // Pobierz wszystkie expressID z selection (może być wiele elementów)
        const allExpressIDs: number[] = [];
        for (const fragmentID of Object.keys(selection)) {
          const ids = selection[fragmentID];
          if (ids instanceof Set) {
            allExpressIDs.push(...Array.from(ids).map(id => Number(id)));
          } else if (Array.isArray(ids)) {
            allExpressIDs.push(...ids.map(id => Number(id)));
          }
        }
        
        // Jeśli Ctrl jest wciśnięty i panel selekcji jest otwarty, znajdź NOWY element
        // (ten, który nie jest jeszcze w selectedElements)
        let expressID: number | null = null;
        if (isCtrlPressedRef.current && showSelectionPanelRef.current) {
          // Znajdź element, który nie jest jeszcze w selekcji (użyj ref dla aktualnego stanu)
          const currentSelection = selectedElementsRef.current;
          console.log(`🔍 Looking for new element. Current selection:`, currentSelection.map(el => el.expressID), `All IDs in selection:`, allExpressIDs);
          for (const id of allExpressIDs) {
            if (!currentSelection.some((el: SelectedElement) => el.expressID === id)) {
              expressID = id;
              console.log(`✅ Found new element: ${id}`);
              break; // Użyj pierwszego nowego elementu
            }
          }
          // Jeśli wszystkie elementy są już w selekcji, użyj pierwszego
          if (expressID === null && allExpressIDs.length > 0) {
            expressID = allExpressIDs[0];
            console.log(`⚠️ All elements already in selection, using first: ${expressID}`);
          }
        } else {
          // Normalny klik - użyj pierwszego elementu
          expressID = allExpressIDs.length > 0 ? allExpressIDs[0] : null;
        }
        
        if (expressID === null) {
          console.warn("⚠️ No expressID found in selection");
          return;
        }
        
        const elementIdStr = expressID.toString();
        
        // Sprawdź, czy kliknięty element jest już podświetlony
        // Jeśli tak, odznacz go
        if (selectedElementId === elementIdStr && !isCtrlPressedRef.current) {
          console.log("🔄 Clicked on already selected element - deselecting");
          highlighter.clear();
          setSelectedElementId(undefined);
          setSelectedElementName(undefined);
          // Wyczyść panel Properties
          try {
            const propertiesPanel = viewer.ui?.projects?.active?.uiElements?.get("Properties");
            if (propertiesPanel) {
              propertiesPanel.visible = false;
            }
          } catch (error) {
            // Ignoruj błąd
          }
          return;
        }
        
        // Jeśli Ctrl jest wciśnięty i panel selekcji jest otwarty, dodaj do selekcji
        // i JEDNOCZEŚNIE pokaż properties dla aktualnie klikniętego elementu.
        if (isCtrlPressedRef.current && showSelectionPanelRef.current) {
          console.log("🎯 Ctrl+click - adding element to selection and showing its properties:", expressID);
          addToSelection(expressID);
          // nie wychodzimy z funkcji – poniższy kod zaktualizuje panel Properties
        }
        
        // Jeśli tryb pinowania jest aktywny, zapinuj element
        if (isPinModeRef.current) {
          console.log("📌 Pin mode active - pinning element:", elementIdStr);
          
          // Use hook's handlePinElement which integrates with backend API
          await handlePinElement(selection, highlighter, viewer, elementIdStr);
          
          return; // Nie pokazuj properties w trybie pinowania
        }
        
        // OLD PIN LOGIC - REMOVED (now using usePins hook)
        // Keeping this comment for reference - removed to fix syntax error
        /*
        try {
            // Określ styl na podstawie wybranego koloru
            // Normalizuj kolor do porównania (usuwając spacje i zmieniając na uppercase)
            const normalizedColor = selectedPinColorRef.current.trim().toUpperCase();
            const styleName = (normalizedColor === "#000000" || normalizedColor === "000000") ? "pin-black" : "pin-white";
            console.log("📌 Selected pin style:", styleName, "for color:", selectedPinColorRef.current, "(normalized:", normalizedColor, ")");
            
            // Sprawdź czy element jest już przypięty
            // CRITICAL: Użyj ref zamiast stanu, aby mieć aktualną wartość w funkcji asynchronicznej
            const currentStyle = pinnedElementsRef.current.get(elementIdStr);
            console.log(`📌 Checking if element ${elementIdStr} is pinned:`, {
              currentStyle: currentStyle,
              selectedStyle: styleName,
              isPinned: !!currentStyle,
              shouldUnpin: currentStyle === styleName,
              pinnedElementsSize: pinnedElementsRef.current.size,
              allPinnedElements: Array.from(pinnedElementsRef.current.entries())
            });
            
            if (currentStyle) {
              // Element jest już przypięty - sprawdź czy to ten sam styl
              if (currentStyle === styleName) {
                // Ten sam styl - odpiń element (przywróć oryginalny kolor)
                console.log("📌 Element already pinned with same style - unpinning");
                
                // Wyczyść styl tylko dla tego elementu
                await highlighter.clear(currentStyle, selection);
                
                // Przywróć oryginalny kolor materiału dla tego elementu
                try {
                  for (const fragID of Object.keys(selection)) {
                    const instanceIDs = selection[fragID];
                    console.log(`📌 Unpinning: Restoring color for fragment ${fragID}, instanceIDs:`, Array.from(instanceIDs));
                    
                    const scene = viewer.scene?.get();
                    if (scene) {
                      scene.traverse((child: any) => {
                        if (child.fragment && child.fragment.id === fragID) {
                          const mesh = child.fragment.mesh;
                          if (mesh && mesh.material) {
                            if (mesh instanceof THREE.InstancedMesh) {
                              // CRITICAL: Mapuj expressID na indeks instancji
                              const fragment = child.fragment;
                              let fragmentIds: number[] = [];
                              if (fragment.ids) {
                                if (Array.isArray(fragment.ids)) {
                                  fragmentIds = fragment.ids;
                                } else if (fragment.ids instanceof Set) {
                                  fragmentIds = Array.from(fragment.ids);
                                } else if (fragment.ids instanceof Map) {
                                  fragmentIds = Array.from(fragment.ids.keys());
                                } else if (typeof fragment.ids === 'object') {
                                  fragmentIds = Object.keys(fragment.ids).map(Number);
                                }
                              }
                              
                              // CRITICAL: Przywróć oryginalny kolor TYLKO dla instancji w selection
                              const instanceIDsArray = Array.from(instanceIDs);
                              instanceIDsArray.forEach((expressID: number) => {
                                const instanceIndex = fragmentIds.indexOf(expressID);
                                if (instanceIndex === -1) {
                                  console.warn(`⚠️ Cannot unpin: ExpressID ${expressID} not found in fragment.ids!`);
                                  return;
                                }
                                
                                // Przywróć zapamiętany oryginalny kolor
                                const originalColorData = originalColorsRef.current.get(elementIdStr);
                                if (originalColorData) {
                                  const originalColor = new THREE.Color(
                                    originalColorData.color.r,
                                    originalColorData.color.g,
                                    originalColorData.color.b
                                  );
                                  mesh.setColorAt(instanceIndex, originalColor);
                                  console.log(`📌 Restored original color for expressID ${expressID} (instance index ${instanceIndex}):`, originalColorData.color);
                                  
                                  // Usuń zapamiętany oryginalny kolor
                                  originalColorsRef.current.delete(elementIdStr);
                                } else {
                                  // Jeśli nie mamy zapamiętanego koloru, użyj białego jako domyślnego
                                  const whiteColor = new THREE.Color(0xFFFFFF);
                                  mesh.setColorAt(instanceIndex, whiteColor);
                                  console.log(`📌 Restored default color (white) for expressID ${expressID} (instance index ${instanceIndex}) - no original color saved`);
                                }
                              });
                              
                              if (mesh.instanceColor) {
                                mesh.instanceColor.needsUpdate = true;
                              }
                              
                              // Sprawdź, czy wszystkie instancje w fragmencie są odpięte
                              // Jeśli tak, możemy wyłączyć vertexColors, aby użyć domyślnego koloru materiału
                              // Ale na razie zostawiamy vertexColors włączone, bo inne instancje mogą być pinowane
                              console.log(`✅ Unpinned element - restored white color`);
                            } else if (mesh instanceof THREE.Mesh) {
                              // Dla zwykłego Mesh, highlighter.clear powinien przywrócić oryginalny kolor
                              console.log(`📌 Unpinning regular Mesh - highlighter.clear should restore color`);
                            }
                          }
                        }
                      });
                    }
                  }
                  console.log(`✅ Unpinned element ${elementIdStr} - original colors restored`);
                } catch (e) {
                  console.error('❌ Error restoring original colors during unpin:', e);
                }
                
                setPinnedElements((prev: Map<string, string>) => {
                  const newMap = new Map(prev);
                  newMap.delete(elementIdStr);
                  return newMap;
                });
                console.log(`✅ Element ${elementIdStr} unpinned`);
              } else {
                // Inny styl - najpierw wyczyść poprzedni styl, potem przypnij nowym
                console.log(`📌 Element pinned with different style (${currentStyle}) - clearing and repinning with ${styleName}`);
                
                // Wyczyść tylko ten element z poprzedniego stylu
                await highlighter.clear(currentStyle, selection);
                
                // Przypnij tylko ten element nowym stylem
                // CRITICAL: NIE używaj highlighter.highlightByID - ustaw kolory bezpośrednio
                const targetColor = styleName === "pin-black" ? 0x000000 : 0xFFFFFF;
                
                try {
                  // CRITICAL: Użyj tylko selection dla tego jednego elementu
                  for (const fragID of Object.keys(selection)) {
                    const instanceIDs = selection[fragID];
                    console.log(`📌 Repinning: Setting color for fragment ${fragID}, instanceIDs:`, Array.from(instanceIDs));
                    
                    const scene = viewer.scene?.get();
                    if (scene) {
                      scene.traverse((child: any) => {
                        if (child.fragment && child.fragment.id === fragID) {
                          const mesh = child.fragment.mesh;
                          if (mesh && mesh.material) {
                            if (mesh instanceof THREE.InstancedMesh) {
                              // CRITICAL: Mapuj expressID na indeks instancji
                              const fragment = child.fragment;
                              let fragmentIds: number[] = [];
                              if (fragment.ids) {
                                if (Array.isArray(fragment.ids)) {
                                  fragmentIds = fragment.ids;
                                } else if (fragment.ids instanceof Set) {
                                  fragmentIds = Array.from(fragment.ids);
                                } else if (fragment.ids instanceof Map) {
                                  fragmentIds = Array.from(fragment.ids.keys());
                                } else if (typeof fragment.ids === 'object') {
                                  fragmentIds = Object.keys(fragment.ids).map(Number);
                                }
                              }
                              
                              // CRITICAL: Jeśli instanceColor nie istnieje, utwórz go i wypełnij białym
                              if (!mesh.instanceColor) {
                                const count = mesh.count;
                                const colors = new Float32Array(count * 3);
                                for (let i = 0; i < count; i++) {
                                  colors[i * 3] = 1;
                                  colors[i * 3 + 1] = 1;
                                  colors[i * 3 + 2] = 1;
                                }
                                mesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
                                mesh.instanceColor.needsUpdate = true;
                              }
                              
                              // CRITICAL: Ustaw kolor TYLKO dla pinowanej instancji
                              // NIE zmieniaj kolorów innych instancji - mogą być już pinowane
                              const instanceIDsArray = Array.from(instanceIDs);
                              console.log(`📌 Repinning ${instanceIDsArray.length} instance(s) - preserving other instance colors`);
                              
                              instanceIDsArray.forEach((expressID: number) => {
                                const instanceIndex = fragmentIds.indexOf(expressID);
                                if (instanceIndex === -1) {
                                  console.warn(`⚠️ Cannot repin: ExpressID ${expressID} not found in fragment.ids!`);
                                  return;
                                }
                                
                                // CRITICAL: Nie nadpisuj oryginalnego koloru - zachowaj ten, który był zapamiętany przy pierwszym pinowaniu
                                // (oryginalny kolor jest już zapamiętany w originalColorsRef)
                                
                                const color = new THREE.Color(targetColor);
                                mesh.setColorAt(instanceIndex, color);
                                console.log(`📌 Set repin color ${targetColor.toString(16)} for expressID ${expressID} (instance index ${instanceIndex})`);
                              });
                              
                              if (mesh.instanceColor) {
                                mesh.instanceColor.needsUpdate = true;
                              }
                              if (Array.isArray(mesh.material)) {
                                mesh.material.forEach((mat: any) => {
                                  if (mat) {
                                    mat.vertexColors = THREE.VertexColors;
                                    mat.needsUpdate = true;
                                  }
                                });
                              } else if (mesh.material) {
                                (mesh.material as any).vertexColors = THREE.VertexColors;
                                (mesh.material as any).needsUpdate = true;
                              }
                            } else if (mesh instanceof THREE.Mesh) {
                              if (Array.isArray(mesh.material)) {
                                mesh.material.forEach((mat: any) => {
                                  if (mat && mat.color) {
                                    mat.color.setHex(targetColor);
                                    mat.needsUpdate = true;
                                  }
                                });
                              } else if (mesh.material && (mesh.material as any).color) {
                                (mesh.material as any).color.setHex(targetColor);
                                (mesh.material as any).needsUpdate = true;
                              }
                            }
                          }
                        }
                      });
                    }
                  }
                  console.log(`✅ Repinned element ${elementIdStr} with color ${targetColor.toString(16)}`);
                } catch (e) {
                  console.error('❌ Error repinning element:', e);
                }
                
                setPinnedElements((prev: Map<string, string>) => {
                  const newMap = new Map(prev);
                  newMap.set(elementIdStr, styleName);
                  return newMap;
                });
                console.log(`✅ Element ${elementIdStr} repinned with style ${styleName}`);
              }
            } else {
              // Element nie jest przypięty - przypnij go
              console.log(`📌 Pinning element with style ${styleName}`);
              
              // CRITICAL: NIE używaj highlighter.highlightByID - może kolorować wszystkie elementy
              // Zamiast tego, ustaw kolory bezpośrednio tylko dla klikniętego elementu
              const targetColor = styleName === "pin-black" ? 0x000000 : 0xFFFFFF;
              
              try {
                // CRITICAL: Użyj tylko selection dla tego jednego elementu
                for (const fragID of Object.keys(selection)) {
                  const instanceIDs = selection[fragID];
                  console.log(`📌 Setting color for fragment ${fragID}, instanceIDs:`, Array.from(instanceIDs));
                  
                  // Spróbuj znaleźć fragment w scenie
                  const scene = viewer.scene?.get();
                  if (scene) {
                    let foundFragment = false;
                    let totalFragments = 0;
                    
                    scene.traverse((child: any) => {
                      if (child.fragment) {
                        totalFragments++;
                        if (child.fragment.id === fragID) {
                          foundFragment = true;
                          console.log(`📌 Found target fragment ${fragID} (total fragments in scene: ${totalFragments})`);
                          
                          const mesh = child.fragment.mesh;
                          const fragment = child.fragment;
                          
                          if (mesh && mesh.material) {
                          // Dla InstancedMesh, ustaw kolor TYLKO dla instancji w selection
                          if (mesh instanceof THREE.InstancedMesh) {
                            // CRITICAL: Mapuj expressID na indeks instancji używając fragment.ids
                            let fragmentIds: number[] = [];
                            if (fragment.ids) {
                              if (Array.isArray(fragment.ids)) {
                                fragmentIds = fragment.ids;
                              } else if (fragment.ids instanceof Set) {
                                fragmentIds = Array.from(fragment.ids);
                              } else if (fragment.ids instanceof Map) {
                                fragmentIds = Array.from(fragment.ids.keys());
                              } else if (typeof fragment.ids === 'object') {
                                fragmentIds = Object.keys(fragment.ids).map(Number);
                              }
                            }
                            
                            console.log(`📌 Fragment has ${fragmentIds.length} IDs, mesh has ${mesh.count} instances`);
                            
                            // CRITICAL: Jeśli instanceColor nie istnieje, utwórz go i wypełnij białym dla wszystkich instancji
                            if (!mesh.instanceColor) {
                              console.log(`📌 Creating instanceColor buffer for ${mesh.count} instances`);
                              const count = mesh.count;
                              const colors = new Float32Array(count * 3);
                              
                              // Wypełnij domyślnym kolorem (biały = 1,1,1) dla wszystkich instancji
                              for (let i = 0; i < count; i++) {
                                colors[i * 3] = 1;     // R
                                colors[i * 3 + 1] = 1; // G
                                colors[i * 3 + 2] = 1; // B
                              }
                              
                              mesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
                              mesh.instanceColor.needsUpdate = true;
                              console.log(`✅ Created instanceColor buffer with white color for all ${count} instances`);
                            } else {
                              // Sprawdź, czy wszystkie instancje mają ustawione kolory
                              // Jeśli nie, wypełnij białym kolorem
                              const existingColors = mesh.instanceColor.array as Float32Array;
                              const count = mesh.count;
                              let needsInit = false;
                              
                              // Sprawdź, czy wszystkie kolory są ustawione (nie są zerami)
                              for (let i = 0; i < count; i++) {
                                const r = existingColors[i * 3];
                                const g = existingColors[i * 3 + 1];
                                const b = existingColors[i * 3 + 2];
                                
                                // Jeśli wszystkie wartości są 0, to znaczy że kolor nie był ustawiony
                                if (r === 0 && g === 0 && b === 0) {
                                  needsInit = true;
                                  existingColors[i * 3] = 1;
                                  existingColors[i * 3 + 1] = 1;
                                  existingColors[i * 3 + 2] = 1;
                                }
                              }
                              
                              if (needsInit) {
                                mesh.instanceColor.needsUpdate = true;
                                console.log(`✅ Initialized missing colors in instanceColor buffer`);
                              }
                            }
                            
                            // CRITICAL: Ustaw kolor TYLKO dla pinowanej instancji
                            // Mapuj expressID na indeks instancji
                            const instanceIDsArray = Array.from(instanceIDs);
                            console.log(`📌 Pinning ${instanceIDsArray.length} instance(s) (expressIDs), mapping to instance indices`);
                            
                            // Ustaw kolor dla pinowanej instancji - mapuj expressID na indeks
                            instanceIDsArray.forEach((expressID: number) => {
                              const instanceIndex = fragmentIds.indexOf(expressID);
                              if (instanceIndex === -1) {
                                console.warn(`⚠️ ExpressID ${expressID} not found in fragment.ids!`);
                                return;
                              }
                              
                              // CRITICAL: Zapamiętaj oryginalny kolor przed pinowaniem
                              if (!originalColorsRef.current.has(elementIdStr)) {
                                // Sprawdź, jaki kolor ma teraz instancja
                                let originalR = 1, originalG = 1, originalB = 1; // Domyślnie biały
                                
                                if (mesh.instanceColor) {
                                  const colorArray = mesh.instanceColor.array as Float32Array;
                                  originalR = colorArray[instanceIndex * 3];
                                  originalG = colorArray[instanceIndex * 3 + 1];
                                  originalB = colorArray[instanceIndex * 3 + 2];
                                  
                                  // Jeśli kolor jest czarny (0,0,0), to prawdopodobnie nie był ustawiony - użyj białego
                                  if (originalR === 0 && originalG === 0 && originalB === 0) {
                                    originalR = 1;
                                    originalG = 1;
                                    originalB = 1;
                                  }
                                }
                                
                                originalColorsRef.current.set(elementIdStr, {
                                  fragmentId: fragID,
                                  instanceIndex: instanceIndex,
                                  color: { r: originalR, g: originalG, b: originalB }
                                });
                                
                                console.log(`📌 Saved original color for element ${elementIdStr}:`, { r: originalR, g: originalG, b: originalB });
                              }
                              
                              const color = new THREE.Color(targetColor);
                              mesh.setColorAt(instanceIndex, color);
                              console.log(`📌 Set pin color ${targetColor.toString(16)} for expressID ${expressID} (instance index ${instanceIndex})`);
                            });
                            
                            // Dla pozostałych instancji: jeśli instanceColor nie istnieje lub instancja nie ma koloru, ustaw biały
                            // Ale NIE zmieniaj kolorów instancji, które już mają ustawione kolory (mogą być pinowane)
                            if (!mesh.instanceColor) {
                              // Jeśli instanceColor nie istnieje, utwórz go i wypełnij białym dla wszystkich
                              const count = mesh.count;
                              const colors = new Float32Array(count * 3);
                              for (let i = 0; i < count; i++) {
                                colors[i * 3] = 1;
                                colors[i * 3 + 1] = 1;
                                colors[i * 3 + 2] = 1;
                              }
                              mesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
                              mesh.instanceColor.needsUpdate = true;
                              console.log(`📌 Created instanceColor buffer with white for all ${count} instances`);
                            } else {
                              // Jeśli instanceColor istnieje, ustaw biały TYLKO dla instancji, które nie są pinowane i nie mają koloru
                              // Mapuj expressID na indeksy instancji
                              const pinnedInstanceIndices = new Set<number>();
                              instanceIDsArray.forEach((expressID: number) => {
                                const instanceIndex = fragmentIds.indexOf(expressID);
                                if (instanceIndex !== -1) {
                                  pinnedInstanceIndices.add(instanceIndex);
                                }
                              });
                              
                              const colorArray = mesh.instanceColor.array as Float32Array;
                              const count = mesh.count;
                              let fixedCount = 0;
                              
                              for (let i = 0; i < count; i++) {
                                // Pomiń instancje, które są właśnie pinowane
                                if (pinnedInstanceIndices.has(i)) {
                                  continue;
                                }
                                
                                const r = colorArray[i * 3];
                                const g = colorArray[i * 3 + 1];
                                const b = colorArray[i * 3 + 2];
                                
                                // Jeśli kolor jest czarny (0,0,0) lub bardzo ciemny, ustaw biały
                                // Ale jeśli ma jakiś kolor (np. z poprzedniego pinowania), zachowaj go
                                if (r === 0 && g === 0 && b === 0) {
                                  colorArray[i * 3] = 1;
                                  colorArray[i * 3 + 1] = 1;
                                  colorArray[i * 3 + 2] = 1;
                                  fixedCount++;
                                }
                              }
                              
                              if (fixedCount > 0) {
                                mesh.instanceColor.needsUpdate = true;
                                console.log(`📌 Fixed ${fixedCount} black instances to white (preserved ${count - fixedCount - pinnedInstanceIndices.size} other colors)`);
                              }
                            }
                            
                            if (mesh.instanceColor) {
                              mesh.instanceColor.needsUpdate = true;
                            }
                            
                            // Upewnij się, że materiał używa kolorów instancji
                            // CRITICAL: Sprawdź stan przed zmianą
                            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                            console.log(`📌 Checking materials for fragment ${fragID}:`, {
                              materialCount: materials.length,
                              hasInstanceColor: !!mesh.instanceColor,
                              instanceCount: mesh.count,
                              instanceIDsBeingColored: Array.from(instanceIDs)
                            });
                            
                            materials.forEach((mat: any, index: number) => {
                              if (mat) {
                                const hadVertexColors = mat.vertexColors;
                                // CRITICAL: Użyj THREE.VertexColors zamiast true dla InstancedMesh
                                mat.vertexColors = THREE.VertexColors;
                                mat.needsUpdate = true;
                                console.log(`📌 Material ${index}: vertexColors changed from ${hadVertexColors} to THREE.VertexColors`);
                                console.log(`📌 Material ${index} properties:`, {
                                  type: mat.type,
                                  color: mat.color ? mat.color.getHexString() : 'no color',
                                  vertexColors: mat.vertexColors,
                                  needsUpdate: mat.needsUpdate
                                });
                              }
                            });
                            
                              // CRITICAL: Sprawdź, czy wszystkie instancje mają ustawione kolory
                              if (mesh.instanceColor) {
                                const colorArray = mesh.instanceColor.array as Float32Array;
                                const count = mesh.count;
                                let blackCount = 0;
                                let whiteCount = 0;
                                let otherCount = 0;
                                
                                // Sprawdź kolory dla pierwszych 3 instancji (dla debugowania)
                                const sampleColors: any[] = [];
                                for (let i = 0; i < Math.min(3, count); i++) {
                                  const r = colorArray[i * 3];
                                  const g = colorArray[i * 3 + 1];
                                  const b = colorArray[i * 3 + 2];
                                  sampleColors.push({ instance: i, r, g, b });
                                }
                                
                                for (let i = 0; i < count; i++) {
                                  const r = colorArray[i * 3];
                                  const g = colorArray[i * 3 + 1];
                                  const b = colorArray[i * 3 + 2];
                                  
                                  if (r === 0 && g === 0 && b === 0) {
                                    blackCount++;
                                  } else if (Math.abs(r - 1) < 0.01 && Math.abs(g - 1) < 0.01 && Math.abs(b - 1) < 0.01) {
                                    whiteCount++;
                                  } else {
                                    otherCount++;
                                  }
                                }
                                
                                console.log(`📌 InstanceColor status after pinning:`, {
                                  totalInstances: count,
                                  blackInstances: blackCount,
                                  whiteInstances: whiteCount,
                                  otherColorInstances: otherCount,
                                  pinnedInstanceIDs: Array.from(instanceIDs),
                                  sampleColors: sampleColors,
                                  instanceColorBufferExists: !!mesh.instanceColor,
                                  instanceColorNeedsUpdate: mesh.instanceColor.needsUpdate
                                });
                                
                                // Sprawdź kolor dla pinowanej instancji - mapuj expressID na indeks
                                instanceIDs.forEach((expressID: number) => {
                                  const instanceIndex = fragmentIds.indexOf(expressID);
                                  if (instanceIndex === -1) {
                                    console.warn(`⚠️ Cannot check color: ExpressID ${expressID} not found in fragment.ids!`);
                                    return;
                                  }
                                  
                                  const r = colorArray[instanceIndex * 3];
                                  const g = colorArray[instanceIndex * 3 + 1];
                                  const b = colorArray[instanceIndex * 3 + 2];
                                  console.log(`📌 Pinned expressID ${expressID} (instance index ${instanceIndex}) color:`, { r, g, b, hex: `#${Math.round(r*255).toString(16).padStart(2,'0')}${Math.round(g*255).toString(16).padStart(2,'0')}${Math.round(b*255).toString(16).padStart(2,'0')}` });
                                });
                              
                              // Jeśli są czarne instancje, które nie powinny być czarne, wypełnij je białym
                              // Mapuj expressID na indeksy instancji
                              const pinnedInstanceIndices = new Set<number>();
                              instanceIDs.forEach((expressID: number) => {
                                const instanceIndex = fragmentIds.indexOf(expressID);
                                if (instanceIndex !== -1) {
                                  pinnedInstanceIndices.add(instanceIndex);
                                }
                              });
                              
                              if (blackCount > 0 && blackCount !== pinnedInstanceIndices.size) {
                                console.warn(`⚠️ Found ${blackCount} black instances that shouldn't be black! Fixing...`);
                                for (let i = 0; i < count; i++) {
                                  // Sprawdź, czy ta instancja nie jest pinowana
                                  const isPinned = pinnedInstanceIndices.has(i);
                                  if (!isPinned) {
                                    const r = colorArray[i * 3];
                                    const g = colorArray[i * 3 + 1];
                                    const b = colorArray[i * 3 + 2];
                                    
                                    // Jeśli jest czarna, ustaw na białą
                                    if (r === 0 && g === 0 && b === 0) {
                                      colorArray[i * 3] = 1;
                                      colorArray[i * 3 + 1] = 1;
                                      colorArray[i * 3 + 2] = 1;
                                      console.log(`📌 Fixed black instance index ${i} to white`);
                                    }
                                  }
                                }
                                mesh.instanceColor.needsUpdate = true;
                              }
                            }
                          } else if (mesh instanceof THREE.Mesh) {
                            // Dla zwykłego Mesh, ustaw kolor materiału
                            console.log(`📌 Setting color for regular Mesh`);
                            if (Array.isArray(mesh.material)) {
                              mesh.material.forEach((mat: any) => {
                                if (mat && mat.color) {
                                  mat.color.setHex(targetColor);
                                  mat.needsUpdate = true;
                                }
                              });
                            } else if (mesh.material && (mesh.material as any).color) {
                              (mesh.material as any).color.setHex(targetColor);
                              (mesh.material as any).needsUpdate = true;
                            }
                          }
                        } else {
                          console.warn(`⚠️ Fragment ${fragID} found but mesh or material is missing`);
                        }
                      } else {
                        // To jest inny fragment - nie modyfikuj go
                        // console.log(`⏭️ Skipping fragment ${child.fragment.id} (not target ${fragID})`);
                      }
                    }
                  });
                    
                    if (!foundFragment) {
                      console.error(`❌ Fragment ${fragID} not found in scene! Total fragments: ${totalFragments}`);
                    }
                  } else {
                    console.error(`❌ Scene not available!`);
                  }
                }
                console.log(`✅ Applied color ${targetColor.toString(16)} to pinned element ${elementIdStr} only`);
              } catch (e) {
                console.error('❌ Error setting pin colors:', e);
              }
              
              setPinnedElements((prev: Map<string, string>) => {
                const newMap = new Map(prev);
                newMap.set(elementIdStr, styleName);
                return newMap;
              });
              console.log(`✅ Element ${elementIdStr} pinned with style ${styleName}`);
            }
          } catch (error) {
            console.error("❌ Error pinning element:", error);
          }
          */
        
        // Normalny tryb - zawsze pokaż properties
        // Znajdź właściwy model dla tego expressID (nie używaj model z closure!)
        let elementModel = null;
        for (const m of loadedModelsRef.current) {
          try {
            // Sprawdź czy ten model zawiera ten expressID
            for (const item of (m.items || [])) {
              const ids = (item as any).ids;
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
              
              if (idArray.includes(expressID)) {
                elementModel = m;
                break;
              }
            }
            if (elementModel) break;
          } catch (error) {
            // Próbuj następny model
          }
        }
        
        // Jeśli nie znaleziono modelu, użyj pierwszego dostępnego
        if (!elementModel && loadedModelsRef.current.length > 0) {
          elementModel = loadedModelsRef.current[0];
        }
        
        if (elementModel) {
          // Wyczyść panel Properties przed renderowaniem nowych właściwości
          // (to wymusza aktualizację nawet jeśli element jest już wybrany)
          try {
            // Sprawdź czy viewer.ui.projects istnieje
            const propertiesPanel = viewer.ui?.projects?.active?.uiElements?.get("Properties");
            if (propertiesPanel) {
              // Wyczyść zawartość panelu przed renderowaniem
              try {
                // Spróbuj wyczyścić panel przez ustawienie widoczności
                propertiesPanel.visible = false;
                // Krótkie opóźnienie aby panel się zamknął, potem otwórz i renderuj
                setTimeout(() => {
                  propertiesPanel.visible = true;
                  // Wymuś renderowanie właściwości dla nowego elementu
                  propertiesProcessor.renderProperties(elementModel, expressID);
                  console.log(`📋 Rendering properties for expressID ${expressID} from model ${elementModel.modelId || 'unknown'}`);
                }, 10);
              } catch (error) {
                // Jeśli coś pójdzie nie tak, po prostu renderuj
                console.warn('⚠️ Error updating properties panel, rendering anyway:', error);
                propertiesProcessor.renderProperties(elementModel, expressID);
                console.log(`📋 Rendering properties for expressID ${expressID} from model ${elementModel.modelId || 'unknown'}`);
              }
            } else {
              // Jeśli panel nie istnieje, po prostu renderuj
              propertiesProcessor.renderProperties(elementModel, expressID);
              console.log(`📋 Rendering properties for expressID ${expressID} from model ${elementModel.modelId || 'unknown'}`);
            }
          } catch (error) {
            // Jeśli viewer.ui.projects nie istnieje, po prostu renderuj
            console.warn('⚠️ Properties panel not available, rendering anyway:', error);
            propertiesProcessor.renderProperties(elementModel, expressID);
            console.log(`📋 Rendering properties for expressID ${expressID} from model ${elementModel.modelId || 'unknown'}`);
          }
        } else {
          console.warn(`⚠️ No model found for expressID ${expressID}`);
        }
        
        // Jeśli tryb volume measurement jest aktywny, oblicz objętość
        if (isVolumeModeRef.current && volumeMeasurerRef.current) {
          console.log("📦 Volume mode active - calculating volume for element:", elementIdStr);
          try {
            const volume = await volumeMeasurerRef.current.calculateVolumeForSelection(
              selection,
              loadedModelsRef.current
            );
            console.log(`📦 Calculated volume: ${volume.toFixed(volumeMeasurerRef.current.rounding)} ${volumeMeasurerRef.current.units}`);
          } catch (error) {
            console.error("❌ Error calculating volume:", error);
          }
        }
        
        // Zapisz ID zaznaczonego elementu dla komentarzy
        setSelectedElementId(elementIdStr);
        
        // Spróbuj pobrać nazwę elementu z właściwego modelu
        if (elementModel) {
          try {
            const properties = await elementModel.getProperties(expressID);
            const name = properties?.Name?.value || properties?.type || `Element ${expressID}`;
            setSelectedElementName(name);
            console.log(`📝 Element name: ${name} (expressID: ${expressID})`);
          } catch (error) {
            setSelectedElementName(`Element ${expressID}`);
          }
        } else {
          setSelectedElementName(`Element ${expressID}`);
        }

        // Dodaj sekcję komentarzy do panelu Properties
        setTimeout(() => {
          addCommentsToPropertiesPanel(elementIdStr);
        }, 500);
        
        // Dodaj objętość do properties panelu (jeśli tryb volume jest aktywny)
        if (isVolumeModeRef.current && volumeMeasurerRef.current) {
          setTimeout(() => {
            addVolumeToPropertiesPanel(elementIdStr);
          }, 600);
        }
      });
      
      // Obsługa kliknięcia w pusty obszar - odznacz element
      highlighter.events.select.onClear.add(() => {
        console.log("🔄 Selection cleared - deselecting element");
        setSelectedElementId(undefined);
        setSelectedElementName(undefined);
      });
    });

    // --- TOOLBAR ---
    const mainToolbar = new OBC.Toolbar(viewer);
    mainToolbar.addChild(
      ifcLoader.uiElement.get("main"),
      propertiesProcessor.uiElement.get("main")
    );
    viewer.ui.addToolbar(mainToolbar);

    // Cleanup function
    return () => {
      if (viewerContainerRef.current) {
        viewerContainerRef.current.removeEventListener('click', handleDimensionClickWithDelete);
        viewerContainerRef.current.removeEventListener('mousemove', handleDimensionMove);
        viewerContainerRef.current.removeEventListener('dblclick', handleDoubleClick, { capture: true });
        
        // Also remove from canvas
        const canvas = viewerContainerRef.current.querySelector('canvas');
        if (canvas) {
          canvas.removeEventListener('dblclick', handleDoubleClick, { capture: true });
        }
        
        // Cleanup scissors preview line
        if (scissorsPreviewLineRef.current && viewerRef.current) {
          const scene = (viewerRef.current.scene as any).get();
          if (scene) {
            scene.remove(scissorsPreviewLineRef.current);
            scissorsPreviewLineRef.current.geometry.dispose();
            if (scissorsPreviewLineRef.current.material instanceof THREE.Material) {
              scissorsPreviewLineRef.current.material.dispose();
            }
          }
        }
      }
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      if (viewerRef.current) {
        viewerRef.current.dispose();
        viewerRef.current = null;
      }
    };
  }, []);

  // Synchronizacja motywu z tłem viewera i oświetleniem
  useEffect(() => {
    // Małe opóźnienie aby upewnić się że viewer jest gotowy
    const timer = setTimeout(() => {
      if (!viewerRef.current) return;

      const viewer = viewerRef.current;
      const sceneComponent = viewer.scene as OBC.SimpleScene;
      const scene = sceneComponent.get();

      // Znajdź światła w scenie
      const ambientLight = scene.children.find(
        (child: THREE.Object3D) => child instanceof THREE.AmbientLight
      ) as THREE.AmbientLight | undefined;
      
      const directionalLight = scene.children.find(
        (child: THREE.Object3D) => child instanceof THREE.DirectionalLight
      ) as THREE.DirectionalLight | undefined;

      // Zmień kolor tła i intensywność świateł w zależności od motywu
      if (theme === "dark") {
        scene.background = new THREE.Color(0x202932); // Ciemny granatowy
        // Tryb nocny - stonowane, ciemne oświetlenie
        if (ambientLight) ambientLight.intensity = 0.6;
        if (directionalLight) directionalLight.intensity = 0.5;
      } else {
        scene.background = new THREE.Color(0xE6E7E4); // Jasny szary
        // Tryb dzienny - mocne, rozświetlone oświetlenie
        if (ambientLight) ambientLight.intensity = 2.5;
        if (directionalLight) directionalLight.intensity = 1.5;
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [theme]);

  // Zapisz stan kamery
  // Funkcja do zapisywania akcji w historii
  const saveAction = (action: Action) => {
    if (isRestoringState.current) {
      console.log('⏸️ Skipping save - restoring state');
      return;
    }
    
    // Usuń wszystkie akcje po aktualnym indeksie (jeśli użytkownik zrobił undo i potem nową akcję)
    actionHistory.current = actionHistory.current.slice(0, historyIndex.current + 1);
    
    // Dodaj nową akcję
    actionHistory.current.push(action);
    historyIndex.current = actionHistory.current.length - 1;
    
    console.log(`💾 Action saved: ${action.type}, history size: ${actionHistory.current.length}, index: ${historyIndex.current}`);
  };
  
  const saveCameraState = () => {
    if (!viewerRef.current || isRestoringState.current) return;
    
    try {
      const camera = viewerRef.current.camera as OBC.OrthoPerspectiveCamera;
      if (!camera || !camera.controls || !camera.get) return;
      
      const controls = camera.controls;
      const threeCamera = camera.get() as THREE.PerspectiveCamera;
      
      if (!threeCamera || !threeCamera.position) return;
      
      // Sprawdź czy getTarget zwraca prawidłową wartość
      const targetVector = new THREE.Vector3();
      const target = controls.getTarget ? controls.getTarget(targetVector) : targetVector;
      
      if (!target) return;
      
      const cameraState: CameraState = {
        position: threeCamera.position.clone(),
        target: target.clone(),
      };
      
      const action: Action = {
        type: 'camera',
        data: cameraState,
        timestamp: Date.now(),
      };
      
      saveAction(action);
    } catch (error) {
      console.warn('⚠️ Could not save camera state:', error);
    }
  };

  // Undo - cofnij ostatnią akcję
  const handleUndo = () => {
    console.log("🔍 Undo attempt:", {
      historyIndex: historyIndex.current,
      historyLength: actionHistory.current.length,
      history: actionHistory.current.map((a: Action) => ({ type: a.type, timestamp: a.timestamp }))
    });
    
    if (historyIndex.current <= 0 || !viewerRef.current) {
      console.log("⚠️ Cannot undo - at the beginning of history", {
        historyIndex: historyIndex.current,
        historyLength: actionHistory.current.length
      });
      return;
    }
    
    historyIndex.current--;
    const action = actionHistory.current[historyIndex.current];
    
    if (!action) {
      console.warn('⚠️ No action found at index', historyIndex.current);
      historyIndex.current++;
      return;
    }
    
    console.log(`⏪ Undo - restoring state to: ${action.type}`, historyIndex.current);
    
    // Przywróć stan w zależności od typu akcji
    if (action.type === 'camera') {
      const cameraState = action.data as CameraState;
      // Sprawdź czy stan kamery jest prawidłowy
      if (!cameraState || !cameraState.position || !cameraState.target) {
        console.warn('⚠️ Invalid camera state in history');
        isRestoringState.current = false;
        return;
      }
      
      const camera = viewerRef.current.camera as OBC.OrthoPerspectiveCamera;
      if (!camera || !camera.get || !camera.controls) {
        console.warn('⚠️ Camera not available for undo');
        isRestoringState.current = false;
        return;
      }
      
      const threeCamera = camera.get() as THREE.PerspectiveCamera;
      if (!threeCamera || !threeCamera.position) {
        console.warn('⚠️ Three.js camera not available for undo');
        isRestoringState.current = false;
        return;
      }
      
      threeCamera.position.copy(cameraState.position);
      camera.controls.setLookAt(
        cameraState.position.x,
        cameraState.position.y,
        cameraState.position.z,
        cameraState.target.x,
        cameraState.target.y,
        cameraState.target.z,
        false
      );
    } else if (action.type === 'dimension_add') {
      // Cofnij dodanie wymiaru = usuń ostatni wymiar
      if (!dimensionsRef.current) {
        console.warn('⚠️ Dimensions tool not available for undo');
        isRestoringState.current = false;
        historyIndex.current++; // Cofnij zmianę indeksu
        return;
      }
      const dimensionData = action.data as DimensionData;
      dimensionsRef.current.deleteMeasurementSilent(dimensionData.group);
      console.log('⏪ Dimension removed (undo add)');
    } else if (action.type === 'dimension_delete') {
      // Cofnij usunięcie wymiaru = dodaj wymiar z powrotem
      if (!dimensionsRef.current) {
        console.warn('⚠️ Dimensions tool not available for undo');
        isRestoringState.current = false;
        historyIndex.current++; // Cofnij zmianę indeksu
        return;
      }
      const dimensionData = action.data as DimensionData;
      dimensionsRef.current.restoreMeasurement(dimensionData);
      console.log('⏪ Dimension restored (undo delete)');
      
      // Dla wymiarów nie ma problemu z controlend, więc możemy szybciej zresetować flagę
      setTimeout(() => {
        isRestoringState.current = false;
      }, 100);
    }
  };

  // Redo - przywróć cofniętą akcję
  const handleRedo = () => {
    if (historyIndex.current >= actionHistory.current.length - 1 || !viewerRef.current) {
      console.log("⚠️ Cannot redo - at the end of history", {
        historyIndex: historyIndex.current,
        historyLength: actionHistory.current.length
      });
      return;
    }
    
    historyIndex.current++;
    const action = actionHistory.current[historyIndex.current];
    
    if (!action) {
      console.warn('⚠️ No action found at index', historyIndex.current);
      historyIndex.current--;
      return;
    }
    
    console.log(`⏩ Redo - applying action: ${action.type}`, historyIndex.current);
    
    // Zastosuj akcję ponownie
    if (action.type === 'camera') {
      const cameraState = action.data as CameraState;
      // Sprawdź czy stan kamery jest prawidłowy
      if (!cameraState || !cameraState.position || !cameraState.target) {
        console.warn('⚠️ Invalid camera state in history');
        isRestoringState.current = false;
        return;
      }
      
      const camera = viewerRef.current.camera as OBC.OrthoPerspectiveCamera;
      if (!camera || !camera.get || !camera.controls) {
        console.warn('⚠️ Camera not available for redo');
        isRestoringState.current = false;
        return;
      }
      
      const threeCamera = camera.get() as THREE.PerspectiveCamera;
      if (!threeCamera || !threeCamera.position) {
        console.warn('⚠️ Three.js camera not available for redo');
        isRestoringState.current = false;
        return;
      }
      
      threeCamera.position.copy(cameraState.position);
      
      // Ustaw flagę przed zmianą kamery, aby nie zapisać nowego stanu
      isRestoringState.current = true;
      
      camera.controls.setLookAt(
        cameraState.position.x,
        cameraState.position.y,
        cameraState.position.z,
        cameraState.target.x,
        cameraState.target.y,
        cameraState.target.z,
        false
      );
      
      // Wydłuż timeout, aby upewnić się, że event controlend nie zapisze nowego stanu
      // controlend ma debounce 300ms, więc potrzebujemy co najmniej 500ms
      setTimeout(() => {
        isRestoringState.current = false;
        console.log('✅ Restore state flag cleared (redo)');
      }, 600);
    } else if (action.type === 'dimension_add') {
      // Ponów dodanie wymiaru
      if (!dimensionsRef.current) {
        console.warn('⚠️ Dimensions tool not available for redo');
        isRestoringState.current = false;
        historyIndex.current--; // Cofnij zmianę indeksu
        return;
      }
      const dimensionData = action.data as DimensionData;
      dimensionsRef.current.restoreMeasurement(dimensionData);
      console.log('⏩ Dimension restored (redo add)');
      
      // Dla wymiarów nie ma problemu z controlend, więc możemy szybciej zresetować flagę
      setTimeout(() => {
        isRestoringState.current = false;
      }, 100);
    } else if (action.type === 'dimension_delete') {
      // Ponów usunięcie wymiaru
      if (!dimensionsRef.current) {
        console.warn('⚠️ Dimensions tool not available for redo');
        isRestoringState.current = false;
        historyIndex.current--; // Cofnij zmianę indeksu
        return;
      }
      const dimensionData = action.data as DimensionData;
      dimensionsRef.current.deleteMeasurementSilent(dimensionData.group);
      console.log('⏩ Dimension removed (redo delete)');
      
      // Dla wymiarów nie ma problemu z controlend, więc możemy szybciej zresetować flagę
      setTimeout(() => {
        isRestoringState.current = false;
      }, 100);
    }
  };

  // Funkcja do liczenia elementów z loadedModels (fallback gdy brak danych z backendu)
  const countElementsFromModels = (): number => {
    let count = 0;
    const loadedModels = getLoadedModels();
    for (const model of loadedModels) {
      for (const item of (model.items || [])) {
        const ids = (item as any).ids;
        if (!ids) continue;

        if (Array.isArray(ids)) {
          count += ids.length;
        } else if (ids instanceof Set || ids instanceof Map) {
          count += ids.size;
        } else if (typeof ids === "object") {
          count += Object.keys(ids).length;
        }
      }
    }
    return count;
  };

  // Obsługa eksportu dokumentacji do Excela
  const handleExport = async (exportAll: boolean) => {
    try {
      const loadedModels = getLoadedModels();

      if (loadedModels.length === 0) {
        alert("Brak załadowanych modeli IFC.");
        return;
      }

      const totalElementsCount =
        elements.length > 0 ? elements.length : countElementsFromModels();

      if (exportAll && totalElementsCount === 0) {
        alert("Brak elementów do eksportu.");
        return;
      }

      if (!exportAll && selectedElements.length === 0) {
        alert("Brak zaznaczonych elementów do eksportu.");
        return;
      }

      console.log(
        `📊 Starting export: ${exportAll ? "all" : "selected"} elements`
      );

      await exportElementsToExcel(
        elements,
        loadedModels,
        selectedElements,
        costs || undefined,
        exportAll,
        getAllComments()
      );
    } catch (error) {
      console.error("❌ Error in handleExport:", error);
      alert("Błąd podczas eksportu: " + (error as Error).message);
    }
  };

  // Funkcja wyszukiwania elementów
  const searchElements = async (query: string) => {
    const results: Array<{
      expressID: number;
      name: string;
      type: string;
      properties: Record<string, any>;
    }> = [];

    // Try API search first
    try {
      // Convert elements to API format
      const elementsForAPI: any[] = [];
      for (const model of loadedModelsRef.current) {
        try {
          const allIDs = await model.getAllPropertiesOfType(0);
          if (allIDs && Object.keys(allIDs).length > 0) {
            for (const id of Object.keys(allIDs)) {
              try {
                const props = await model.getProperties(Number(id));
                if (props) {
                  elementsForAPI.push({
                    global_id: props.GlobalId?.value || id,
                    type_name: props.type || 'Unknown',
                    name: props.Name?.value || `Element ${id}`,
                    properties: props,
                  });
                }
              } catch (e) {
                // Skip individual errors
              }
            }
          }
        } catch (e) {
          // Skip model errors
        }
      }

      if (elementsForAPI.length > 0) {
        const apiResults = await api.search.searchElements(query, elementsForAPI);
        
        // Convert API results to local format
        for (const apiResult of apiResults) {
          // Find matching element in loaded models
          const expressID = parseInt(apiResult.global_id || '0');
          if (expressID) {
            results.push({
              expressID,
              name: apiResult.name || `Element ${expressID}`,
              type: apiResult.type_name || 'Unknown',
              properties: apiResult.properties || {},
            });
          }
        }
        
        if (results.length > 0) {
          console.log(`✅ Found ${results.length} results via API`);
          return results;
        }
      }
    } catch (error) {
      console.warn('⚠️ API search failed, falling back to local search:', error);
    }

    // Fallback to local search
    const lowerQuery = query.toLowerCase();

    for (const model of loadedModelsRef.current) {
      try {
        // Pobierz wszystkie ID elementów z modelu
        const allIDs = await model.getAllPropertiesOfType(0); // 0 = wszystkie typy
        
        if (!allIDs || Object.keys(allIDs).length === 0) {
          // Jeśli getAllPropertiesOfType nie działa, spróbuj iterować przez fragmenty
          model.items.forEach((fragment: any) => {
            if (fragment.ids) {
              fragment.ids.forEach(async (id: number) => {
                try {
                  const props = await model.getProperties(id);
                  if (props) {
                    const name = props.Name?.value || props.type || `Element ${id}`;
                    const type = props.type || 'Unknown';
                    
                    // Sprawdź czy pasuje do zapytania
                    if (
                      name.toLowerCase().includes(lowerQuery) ||
                      type.toLowerCase().includes(lowerQuery) ||
                      id.toString().includes(lowerQuery)
                    ) {
                      results.push({
                        expressID: id,
                        name,
                        type,
                        properties: {
                          Name: name,
                          Type: type,
                          GlobalId: props.GlobalId?.value || 'N/A',
                          ObjectType: props.ObjectType?.value || 'N/A',
                        }
                      });
                    }
                  }
                } catch (error) {
                  // Ignoruj błędy dla pojedynczych elementów
                }
              });
            }
          });
        } else {
          // Przeszukaj wszystkie właściwości
          for (const [idStr, props] of Object.entries(allIDs)) {
            const id = parseInt(idStr);
            const properties = props as any;
            
            const name = properties.Name?.value || properties.type || `Element ${id}`;
            const type = properties.type || 'Unknown';
            
            // Sprawdź czy pasuje do zapytania
            if (
              name.toLowerCase().includes(lowerQuery) ||
              type.toLowerCase().includes(lowerQuery) ||
              id.toString().includes(lowerQuery) ||
              (properties.GlobalId?.value || '').toLowerCase().includes(lowerQuery)
            ) {
              results.push({
                expressID: id,
                name,
                type,
                properties: {
                  Name: name,
                  Type: type,
                  GlobalId: properties.GlobalId?.value || 'N/A',
                  ObjectType: properties.ObjectType?.value || 'N/A',
                }
              });
            }
          }
        }
      } catch (error) {
        console.error('Error searching in model:', error);
      }
    }

    console.log(`🔍 Found ${results.length} results for query: "${query}"`);
    return results;
  };


  // Funkcja obsługi wyboru elementu z wyników wyszukiwania
  const handleSearchSelect = async (expressID: number) => {
    if (!highlighterRef.current || loadedModelsRef.current.length === 0) return;

    try {
      const highlighter = highlighterRef.current;
      
      // Znajdź fragment zawierający ten element
      let foundFragment = null;
      for (const model of loadedModelsRef.current) {
        for (const fragment of model.items) {
          if (fragment.ids && fragment.ids.includes(expressID)) {
            foundFragment = fragment;
            break;
          }
        }
        if (foundFragment) break;
      }

      if (foundFragment) {
        // Wyczyść poprzednie zaznaczenie
        highlighter.clear();
        
        // Zaznacz element - użyj właściwego formatu FragmentIdMap
        const fragmentIdMap: { [key: string]: Set<number> } = {
          [foundFragment.fragment.id]: new Set([expressID])
        };
        // Użyj domyślnej grupy (pusty string)
        await highlighter.highlightByID('', fragmentIdMap);
        
        // Pobierz nazwę elementu i wyświetl właściwości
        const model = foundFragment.fragment.mesh.parent;
        const properties = await model.getProperties(expressID);
        const name = properties?.Name?.value || properties?.type || `Element ${expressID}`;
        
        setSelectedElementId(expressID.toString());
        setSelectedElementName(name);
        
        console.log(`🔍 Selected element: ${name} (ID: ${expressID})`);
      }
    } catch (error) {
      console.error('Error selecting search result:', error);
    }
  };

  // Funkcja do splittingu fragmentu na dwie części (wybrane i niewybrane)
  const splitFragment = (
    originalMesh: THREE.InstancedMesh,
    allIDs: number[],
    idsToShow: Set<number>,
    idsToHide: Set<number>,
    fragmentId: string
  ): { visibleMesh: THREE.InstancedMesh | null; hiddenMesh: THREE.InstancedMesh | null } => {
    try {
      console.log(`🔨 Splitting fragment ${fragmentId}: ${idsToShow.size} visible, ${idsToHide.size} hidden`);
      
      const geometry = originalMesh.geometry;
      const material = originalMesh.material;
      
      // Stwórz mesh dla widocznych elementów
      let visibleMesh: THREE.InstancedMesh | null = null;
      if (idsToShow.size > 0) {
        visibleMesh = new THREE.InstancedMesh(geometry, material, idsToShow.size);
        visibleMesh.frustumCulled = false;
        
        let visibleIndex = 0;
        const matrix = new THREE.Matrix4();
        
        allIDs.forEach((id, originalIndex) => {
          if (idsToShow.has(id)) {
            originalMesh.getMatrixAt(originalIndex, matrix);
            visibleMesh!.setMatrixAt(visibleIndex, matrix);
            
            // Kopiuj także kolor jeśli istnieje
            if (originalMesh.instanceColor) {
              const r = originalMesh.instanceColor.getX(originalIndex);
              const g = originalMesh.instanceColor.getY(originalIndex);
              const b = originalMesh.instanceColor.getZ(originalIndex);
              
              if (!visibleMesh!.instanceColor) {
                const colors = new Float32Array(idsToShow.size * 3);
                visibleMesh!.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
              }
              visibleMesh!.instanceColor.setXYZ(visibleIndex, r, g, b);
            }
            
            visibleIndex++;
          }
        });
        
        visibleMesh.instanceMatrix.needsUpdate = true;
        if (visibleMesh.instanceColor) {
          visibleMesh.instanceColor.needsUpdate = true;
        }
        
        console.log(`✅ Created visible mesh with ${idsToShow.size} instances`);
      }
      
      // Stwórz mesh dla ukrytych elementów (będzie ukryty)
      let hiddenMesh: THREE.InstancedMesh | null = null;
      if (idsToHide.size > 0) {
        hiddenMesh = new THREE.InstancedMesh(geometry, material, idsToHide.size);
        hiddenMesh.visible = false; // Od razu ukryty
        hiddenMesh.frustumCulled = false;
        
        let hiddenIndex = 0;
        const matrix = new THREE.Matrix4();
        
        allIDs.forEach((id, originalIndex) => {
          if (idsToHide.has(id)) {
            originalMesh.getMatrixAt(originalIndex, matrix);
            hiddenMesh!.setMatrixAt(hiddenIndex, matrix);
            
            if (originalMesh.instanceColor) {
              const r = originalMesh.instanceColor.getX(originalIndex);
              const g = originalMesh.instanceColor.getY(originalIndex);
              const b = originalMesh.instanceColor.getZ(originalIndex);
              
              if (!hiddenMesh!.instanceColor) {
                const colors = new Float32Array(idsToHide.size * 3);
                hiddenMesh!.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
              }
              hiddenMesh!.instanceColor.setXYZ(hiddenIndex, r, g, b);
            }
            
            hiddenIndex++;
          }
        });
        
        hiddenMesh.instanceMatrix.needsUpdate = true;
        if (hiddenMesh.instanceColor) {
          hiddenMesh.instanceColor.needsUpdate = true;
        }
        
        console.log(`✅ Created hidden mesh with ${idsToHide.size} instances (will be invisible)`);
      }
      
      return { visibleMesh, hiddenMesh };
    } catch (error) {
      console.error(`❌ Error splitting fragment ${fragmentId}:`, error);
      return { visibleMesh: null, hiddenMesh: null };
    }
  };

  // Funkcje zarządzania selekcją
  const addToSelection = async (expressID: number) => {
    // Pobierz informacje o elemencie
    let elementInfo: SelectedElement | null = null;
    
    for (const model of loadedModelsRef.current) {
      try {
        const properties = await model.getProperties(expressID);
        if (properties) {
          elementInfo = {
            expressID,
            name: properties.Name?.value || properties.type || `Element ${expressID}`,
            type: properties.type || 'Unknown',
          };
          break;
        }
      } catch (error) {
        // Próbuj następny model
      }
    }

    if (elementInfo) {
      // Użyj funkcji aktualizującej stan, aby uniknąć race condition
      // To zapewnia, że sprawdzamy najnowszy stan, nawet jeśli funkcja jest wywoływana szybko
      setSelectedElements((prev: SelectedElement[]) => {
        console.log(`🔍 Checking selection for expressID ${expressID}, current selection size: ${prev.length}`);
        console.log(`🔍 Current selection IDs:`, prev.map(el => el.expressID));
        
        // Sprawdź czy element już jest w selekcji (używając aktualnego stanu)
        if (prev.some((el: SelectedElement) => el.expressID === expressID)) {
          console.log(`⚠️ Element ${expressID} already in selection, skipping`);
          return prev; // Nie zmieniaj stanu
        }
        
        console.log(`✅ Adding element to selection:`, elementInfo);
        const newSelection = [...prev, elementInfo!];
        console.log(`✅ New selection size: ${newSelection.length}, IDs:`, newSelection.map(el => el.expressID));
        
        // Save selection to backend API (użyj setTimeout aby nie blokować aktualizacji UI)
        setTimeout(async () => {
          try {
            const elementIds = newSelection.map((el) => el.expressID.toString());
            await selectionsAPI.createSelection(
              `Selection ${new Date().toLocaleString()}`,
              elementIds,
              { created_at: new Date().toISOString() }
            );
            console.log('✅ Selection saved to backend');
          } catch (error) {
            console.warn('⚠️ Failed to save selection to backend:', error);
          }
        }, 100);
        
        return newSelection;
      });
    } else {
      console.warn(`⚠️ Could not get element info for expressID ${expressID}`);
    }
  };

  const removeFromSelection = (expressID: number) => {
    setSelectedElements((prev: SelectedElement[]) => prev.filter((el: SelectedElement) => el.expressID !== expressID));
    console.log('❌ Removed from selection:', expressID);
  };

  const clearSelection = () => {
    setSelectedElements([]);
    console.log('🗑️ Cleared selection');
  };

  const isolateElements = async () => {
    if (!viewerRef.current || selectedElements.length === 0) return;
    
    // Save isolation to backend API
    try {
      const elementIds = selectedElements.map((el) => el.expressID.toString());
      const selection = await selectionsAPI.createSelection(
        `Isolated Selection ${new Date().toLocaleString()}`,
        elementIds,
        { isolated: true, created_at: new Date().toISOString() }
      );
      await selectionsAPI.isolateSelection(selection.id);
      console.log('✅ Isolation saved to backend');
    } catch (error) {
      console.warn('⚠️ Failed to save isolation to backend:', error);
    }

    // Jeśli Hider jest dostępny, użyj go
    if (hiderRef.current) {
      try {
        const selectedIDs = new Set(selectedElements.map((el: SelectedElement) => el.expressID));
        
        console.log('🔍 Starting isolation for', selectedElements.length, 'elements using Hider');
        console.log('Selected IDs:', Array.from(selectedIDs));
        
        // Build ModelIdMap for Hider
        const map: any = {};
        
        // Przejdź przez wszystkie modele i fragmenty
        for (const model of loadedModelsRef.current) {
          const modelId = model.modelId || model.uuid || String(loadedModelsRef.current.indexOf(model));
          const idsInModel = new Set<number>();
          
          console.log('Processing model', modelId, 'with', model.items.length, 'fragments');
          
          for (const item of model.items) {
            if (!item || !item.mesh || !item.ids) continue;
            
            const allIDs = item.ids || [];
            
            // Dodaj tylko wybrane ID do mapy
            allIDs.forEach((id: number) => {
              if (selectedIDs.has(id)) {
                idsInModel.add(id);
              }
            });
          }
          
          if (idsInModel.size > 0) {
            map[modelId] = idsInModel;
            console.log(`✅ Model ${modelId}: ${idsInModel.size} elements to isolate`);
          }
        }
        
        // Use Hider to isolate selected elements
        if (Object.keys(map).length > 0 && hiderRef.current.isolate) {
          await hiderRef.current.isolate(map);
          setIsIsolated(true);
          console.log('✅ Isolation complete using Hider');
        } else {
          console.warn('⚠️ No elements found to isolate');
        }
      } catch (error) {
        console.error('❌ Error isolating elements with Hider:', error);
        // Fallback do starej metody
        console.log('🔄 Falling back to manual isolation');
      }
    } else {
      console.warn('⚠️ Hider not available - isolation feature disabled');
    }
  };

  const unisolateElements = async () => {
    if (!viewerRef.current) return;

    // Jeśli Hider jest dostępny, użyj go
    if (hiderRef.current && hiderRef.current.set) {
      try {
        console.log('👁️ Starting unisolation - restoring all elements using Hider');
        
        // Use Hider to reset visibility (show all)
        await hiderRef.current.set(true);
        
        // Clear all references (legacy support)
        hiddenFragmentsRef.current.clear();
        originalFragmentsRef.current.clear();
        splitFragmentsRef.current.clear();
        
        setIsIsolated(false);
        console.log('✅ Unisolation complete - all elements visible');
      } catch (error) {
        console.error('❌ Error unisolating elements:', error);
      }
    } else {
      console.warn('⚠️ Hider not available - unisolation feature disabled');
      // Fallback - przywróć widoczność ręcznie
      for (const model of loadedModelsRef.current) {
        for (const item of model.items) {
          if (item && item.mesh) {
            item.mesh.visible = true;
          }
        }
      }
      setIsIsolated(false);
    }
  };

  const handleSelectionElementClick = async (expressID: number) => {
    // Podświetl element w modelu
    if (!highlighterRef.current || loadedModelsRef.current.length === 0) return;

    try {
      const highlighter = highlighterRef.current;
      
      // Znajdź fragment zawierający ten element
      let foundFragment = null;
      for (const model of loadedModelsRef.current) {
        for (const fragment of model.items) {
          if (fragment.ids && fragment.ids.includes(expressID)) {
            foundFragment = fragment;
            break;
          }
        }
        if (foundFragment) break;
      }

      if (foundFragment) {
        highlighter.clear();
        const fragmentIdMap: { [key: string]: Set<number> } = {
          [foundFragment.fragment.id]: new Set([expressID])
        };
        await highlighter.highlightByID('', fragmentIdMap);
      }
    } catch (error) {
      console.error('Error highlighting element from selection:', error);
    }
  };

  const handleActionSelect = (action: string) => {
    setActiveAction(action);
    console.log("Selected action:", action);
    
    // Obsługa Export (eksport dokumentacji)
    if (action === "export") {
      setShowExportDialog(true);
      console.log("📊 Export dialog enabled");
      return;
    }
    
    // Wyłącz dialog eksportu gdy wybrana jest inna akcja
    if (showExportDialog && action !== "export") {
      setShowExportDialog(false);
      console.log("📊 Export dialog disabled");
    }
    
    // Obsługa przycisku Comment
    if (action === "comment") {
      setShowCommentPanel(true);
      console.log("💬 Comment panel enabled");
      return;
    }
    
    // Wyłącz panel komentarzy gdy wybrana jest inna akcja lub move
    if (showCommentPanel && action !== "comment") {
      setShowCommentPanel(false);
      console.log("💬 Comment panel disabled");
    }
    
    // Obsługa Undo/Redo
    if (action === "undo") {
      handleUndo();
      return;
    }
    
    if (action === "redo") {
      handleRedo();
      return;
    }
    
    // Obsługa Pin
    if (action === "pin") {
      setIsPinMode(true);
      console.log("📌 Pin mode enabled");
      return;
    }
    
    // Wyłącz pin mode gdy wybrana jest inna akcja lub move
    if (isPinMode && action !== "pin") {
      setIsPinMode(false);
      console.log("📌 Pin mode disabled");
    }
    
    // Obsługa Dimension (wymiarowanie)
    if (action === "dimension") {
      setIsDimensionMode(true);
      setIsVolumeMode(false);
      
      if (dimensionsRef.current) {
        dimensionsRef.current.enable();
        // Wyłącz pin mode jeśli jest aktywny
        setIsPinMode(false);
      }
      console.log("📏 Dimension mode enabled");
      return;
    }
    
    // Wyłącz dimension mode gdy wybrana jest inna akcja lub move
    if (isDimensionMode && action !== "dimension") {
      setIsDimensionMode(false);
      if (dimensionsRef.current) {
        dimensionsRef.current.disable();
      }
      console.log("📏 Dimension mode disabled");
    }
    
    // Obsługa Volume Measurement
    if (action === "volume") {
      setIsVolumeMode(true);
      setIsDimensionMode(false);
      if (dimensionsRef.current) {
        dimensionsRef.current.disable();
      }
      if (volumeMeasurerRef.current) {
        volumeMeasurerRef.current.enabled = true;
      }
      console.log("📦 Volume measurement mode enabled");
      return;
    }
    
    // Wyłącz volume mode gdy wybrana jest inna akcja lub move
    if (isVolumeMode && action !== "volume") {
      setIsVolumeMode(false);
      if (volumeMeasurerRef.current) {
        volumeMeasurerRef.current.enabled = false;
      }
      console.log("📦 Volume measurement mode disabled");
    }
    
    // Obsługa Search (wyszukiwanie)
    if (action === "search") {
      setShowSearchPanel(true);
      console.log("🔍 Search panel enabled");
      return;
    }
    
    // Wyłącz panel wyszukiwania gdy wybrana jest inna akcja lub move
    if (showSearchPanel && action !== "search") {
      setShowSearchPanel(false);
      console.log("🔍 Search panel disabled");
    }
    
    // Obsługa Selection (selekcja i izolacja)
    if (action === "selection") {
      setShowSelectionPanel(true);
      console.log("🎯 Selection panel enabled");
      return;
    }
    
    // Wyłącz panel selekcji gdy wybrana jest inna akcja lub move
    if (showSelectionPanel && action !== "selection") {
      setShowSelectionPanel(false);
      console.log("🎯 Selection panel disabled");
    }
    
    // Obsługa Visibility (panel widoczności kategorii)
    if (action === "visibility") {
      setShowVisibilityPanel(true);
      console.log("👁️ Visibility panel enabled");
      return;
    }
    
    // Wyłącz panel widoczności gdy wybrana jest inna akcja lub move
    if (showVisibilityPanel && action !== "visibility") {
      setShowVisibilityPanel(false);
      console.log("👁️ Visibility panel disabled");
    }
    
    // Obsługa Views (panel widoków 2D)
    if (action === "views") {
      setShowViewsPanel(true);
      console.log("📐 Views panel enabled");
      return;
    }
    
    // Wyłącz panel widoków gdy wybrana jest inna akcja lub move
    if (showViewsPanel && action !== "views") {
      setShowViewsPanel(false);
      console.log("📐 Views panel disabled");
    }
    
    
    // Screenshot functionality
    if (action === "camera") {
      handleScreenshot();
      return;
    }
  };
  
  const handleScreenshot = () => {
    if (!viewerRef.current) {
      console.warn('⚠️ Cannot capture screenshot: viewer not ready');
      return;
    }
    
    try {
      // Pobierz renderer z OpenBIM Components
      const rendererComponent = viewerRef.current.renderer;
      if (!rendererComponent) {
        console.warn('⚠️ Cannot capture screenshot: renderer not found');
        return;
      }
      
      const renderer = rendererComponent.get() as THREE.WebGLRenderer;
      if (!renderer || !renderer.domElement) {
        console.warn('⚠️ Cannot capture screenshot: WebGL renderer not available');
        return;
      }
      
      // Upewnij się, że scena jest zrenderowana
      const scene = viewerRef.current.scene?.get();
      const camera = viewerRef.current.camera?.get();
      
      if (scene && camera) {
        renderer.render(scene, camera);
      }
      
      // Przechwyć obraz z canvas renderera
      const dataURL = renderer.domElement.toDataURL('image/png');
      
      // Utwórz link do pobrania
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      link.download = `screenshot-${timestamp}.png`;
      link.href = dataURL;
      
      // Pobierz plik
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('📸 Screenshot captured and downloaded');
    } catch (error) {
      console.error('❌ Error capturing screenshot:', error);
      alert('Błąd podczas przechwytywania zrzutu ekranu: ' + (error as Error).message);
    }
  };

  const handleAddComment = (text: string, elementId?: string, elementName?: string) => {
    addComment(text, elementId, elementName);
    
    // Odśwież sekcję komentarzy w Properties jeśli dodano komentarz do zaznaczonego elementu
    if (elementId) {
      setTimeout(() => {
        addCommentsToPropertiesPanel(elementId);
      }, 100);
    }
  };

  const handleDeleteComment = (commentId: string) => {
    deleteComment(commentId);
    
    // Odśwież sekcję komentarzy w Properties po usunięciu
    if (selectedElementId) {
      setTimeout(() => {
        addCommentsToPropertiesPanel(selectedElementId);
      }, 100);
    }
  };

  const handleCloseCommentPanel = () => {
    setShowCommentPanel(false);
  };

  const addCommentsToPropertiesPanel = (elementId: string) => {
    // Szukaj panelu Properties
    const selectors = [
      '[data-tooeen-name="properties"]',
      '.properties-panel',
      '#properties',
      '[class*="properties"]',
      '[class*="Properties"]',
      'div[style*="position"]'
    ];
    
    let propertiesPanel: Element | null = null;
    
    for (const selector of selectors) {
      const found = document.querySelector(selector);
      if (found) {
        propertiesPanel = found;
        break;
      }
    }
    
    // Jeśli nie znaleziono standardowych selektorów, szukaj po zawartości tekstu
    if (!propertiesPanel) {
      const allDivs = Array.from(document.querySelectorAll('div'));
      const possiblePanel = allDivs.find(div => {
        const text = div.textContent || '';
        return text.includes('Element Properties') || 
               text.includes('BEAM') || 
               text.includes('IfcBeam') ||
               text.includes('Properties');
      });
      
      if (possiblePanel) {
        propertiesPanel = possiblePanel;
      } else {
        return; // Nie znaleziono panelu Properties
      }
    }

    // Usuń poprzednią sekcję komentarzy jeśli istnieje
    const existingCommentsSection = propertiesPanel.querySelector('.custom-comments-section');
    if (existingCommentsSection) {
      existingCommentsSection.remove();
    }
    
    // Pobierz komentarze dla tego elementu - używamy ref aby mieć najnowsze dane
    const elementComments = commentsRef.current.filter((comment: Comment) => comment.elementId === elementId);
    
    // Utwórz sekcję komentarzy
    try {
      const commentsSection = document.createElement('div');
      commentsSection.className = 'custom-comments-section';
      commentsSection.style.cssText = `
        margin-top: 16px;
        padding: 12px;
        background-color: hsl(var(--muted) / 0.3);
        border: 1px solid hsl(var(--border));
        border-radius: 8px;
      `;

      // Nagłówek sekcji z możliwością rozwijania/zwijania
      const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 0px;
      padding-bottom: 8px;
      border-bottom: 1px solid hsl(var(--border));
      font-weight: 600;
      font-size: 14px;
      color: hsl(var(--foreground));
      cursor: pointer;
      user-select: none;
    `;
      
      const arrowIcon = document.createElement('span');
      arrowIcon.innerHTML = '▼';
      arrowIcon.style.cssText = `
        transition: transform 0.2s;
        font-size: 10px;
        color: hsl(var(--muted-foreground));
      `;
      
      header.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: hsl(var(--primary))">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        Komentarze (${elementComments.length})
        <span style="font-size: 10px; color: hsl(var(--muted-foreground)); margin-left: 8px;">ID: ${elementId}</span>
      `;
      header.prepend(arrowIcon);
      commentsSection.appendChild(header);
      
      // Kontener na zawartość komentarzy
      const contentContainer = document.createElement('div');
      contentContainer.style.cssText = `
        margin-top: 12px;
        display: none;
      `;
      
      // Funkcja rozwijania/zwijania
      let isExpanded = false;
      header.addEventListener('click', () => {
        isExpanded = !isExpanded;
        contentContainer.style.display = isExpanded ? 'block' : 'none';
        arrowIcon.style.transform = isExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
      });

      // Lista komentarzy lub komunikat o braku komentarzy
      if (elementComments.length > 0) {
        elementComments.forEach((comment: Comment) => {
          const commentDiv = document.createElement('div');
          commentDiv.style.cssText = `
            background-color: hsl(var(--background));
            padding: 8px;
            margin-bottom: 8px;
            border-radius: 6px;
            border: 1px solid hsl(var(--border) / 0.5);
          `;

          const date = new Date(comment.timestamp);
          const dateStr = date.toLocaleString("pl-PL", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });

          commentDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 4px;">
              <span style="font-size: 11px; color: hsl(var(--muted-foreground));">${dateStr}</span>
              <button 
                class="delete-comment-btn" 
                data-comment-id="${comment.id}"
                style="
                  background: none;
                  border: none;
                  cursor: pointer;
                  padding: 2px;
                  color: hsl(var(--muted-foreground));
                  transition: color 0.2s;
                "
                onmouseover="this.style.color='hsl(var(--destructive))'"
                onmouseout="this.style.color='hsl(var(--muted-foreground))'"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 6h18"></path>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                </svg>
              </button>
            </div>
            <p style="font-size: 13px; color: hsl(var(--foreground)); white-space: pre-wrap; word-break: break-word;">${comment.text}</p>
          `;

          // Dodaj event listener do przycisku usuwania
          const deleteBtn = commentDiv.querySelector('.delete-comment-btn');
          if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              handleDeleteComment(comment.id);
              // Odśwież sekcję
              setTimeout(() => addCommentsToPropertiesPanel(elementId), 50);
            });
          }

          contentContainer.appendChild(commentDiv);
        });
      } else {
        // Brak komentarzy - pokaż komunikat
        const emptyState = document.createElement('div');
        emptyState.style.cssText = `
          text-align: center;
          padding: 16px 8px;
          color: hsl(var(--muted-foreground));
          font-size: 13px;
        `;
        emptyState.innerHTML = `
          <p style="margin-bottom: 8px;">Brak komentarzy dla tego elementu</p>
        `;
        contentContainer.appendChild(emptyState);
      }

      // Dodaj hint o dodawaniu komentarzy
      const hint = document.createElement('p');
      hint.style.cssText = `
        font-size: 11px;
        color: hsl(var(--muted-foreground));
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid hsl(var(--border) / 0.5);
      `;
      hint.textContent = elementComments.length > 0 
        ? 'Otwórz panel komentarzy 💬 aby dodać więcej' 
        : 'Kliknij ikonę 💬 na pasku narzędzi aby dodać komentarz';
      contentContainer.appendChild(hint);
      
      // Dodaj kontener z zawartością do sekcji komentarzy
      commentsSection.appendChild(contentContainer);

      // Dodaj sekcję do panelu Properties
      propertiesPanel.appendChild(commentsSection);
      
    } catch (error) {
      console.error("Error adding comments section to properties panel:", error);
    }
  };

  const addVolumeToPropertiesPanel = (elementId: string) => {
    if (!volumeMeasurerRef.current) return;
    
    // Szukaj panelu Properties (użyj tej samej logiki co addCommentsToPropertiesPanel)
    const selectors = [
      '[data-tooeen-name="properties"]',
      '.properties-panel',
      '#properties',
      '[class*="properties"]',
      '[class*="Properties"]',
      'div[style*="position"]'
    ];
    
    let propertiesPanel: Element | null = null;
    
    for (const selector of selectors) {
      const found = document.querySelector(selector);
      if (found) {
        propertiesPanel = found;
        break;
      }
    }
    
    // Jeśli nie znaleziono standardowych selektorów, szukaj po zawartości tekstu
    if (!propertiesPanel) {
      const allDivs = Array.from(document.querySelectorAll('div'));
      const possiblePanel = allDivs.find(div => {
        const text = div.textContent || '';
        return text.includes('Element Properties') || 
               text.includes('BEAM') || 
               text.includes('IfcBeam') ||
               text.includes('Properties');
      });
      
      if (possiblePanel) {
        propertiesPanel = possiblePanel;
      } else {
        return; // Nie znaleziono panelu Properties
      }
    }

    // Usuń poprzednią sekcję objętości jeśli istnieje
    const existingVolumeSection = propertiesPanel.querySelector('.custom-volume-section');
    if (existingVolumeSection) {
      existingVolumeSection.remove();
    }
    
    // Pobierz objętość dla tego elementu
    const volume = volumeMeasurerRef.current.getVolumeForElement(elementId);
    
    // Utwórz sekcję objętości
    try {
      const volumeSection = document.createElement('div');
      volumeSection.className = 'custom-volume-section';
      volumeSection.style.cssText = `
        margin-top: 16px;
        padding: 12px;
        background-color: hsl(var(--muted) / 0.3);
        border: 1px solid hsl(var(--border));
        border-radius: 8px;
      `;

      // Nagłówek sekcji
      const header = document.createElement('div');
      header.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
        font-weight: 600;
        font-size: 14px;
        color: hsl(var(--foreground));
      `;
      
      header.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: hsl(var(--primary))">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
        </svg>
        Objętość
      `;
      volumeSection.appendChild(header);
      
      // Wyświetl objętość
      const volumeValue = document.createElement('div');
      volumeValue.style.cssText = `
        font-size: 18px;
        font-weight: 700;
        color: hsl(var(--primary));
        margin-bottom: 8px;
      `;
      
      if (volume !== null && volume > 0) {
        volumeValue.textContent = `${volume.toFixed(volumeMeasurerRef.current.rounding)} ${volumeMeasurerRef.current.units}`;
      } else {
        volumeValue.textContent = 'Nie obliczono';
        volumeValue.style.color = 'hsl(var(--muted-foreground))';
        volumeValue.style.fontSize = '14px';
        volumeValue.style.fontWeight = '400';
      }
      volumeSection.appendChild(volumeValue);
      
      // Informacja
      const info = document.createElement('p');
      info.style.cssText = `
        font-size: 11px;
        color: hsl(var(--muted-foreground));
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid hsl(var(--border) / 0.5);
      `;
      info.textContent = volume !== null && volume > 0
        ? 'Objętość obliczona z geometrii elementu'
        : 'Kliknij na element w trybie Volume aby obliczyć objętość';
      volumeSection.appendChild(info);
      
      // Dodaj sekcję do panelu Properties (przed sekcją komentarzy jeśli istnieje)
      const commentsSection = propertiesPanel.querySelector('.custom-comments-section');
      if (commentsSection) {
        propertiesPanel.insertBefore(volumeSection, commentsSection);
      } else {
        propertiesPanel.appendChild(volumeSection);
      }
      
    } catch (error) {
      console.error("Error adding volume section to properties panel:", error);
    }
  };

  const handleCommentClick = async (elementId: string) => {
    console.log("Comment clicked, highlighting element:", elementId);
    
    if (!viewerRef.current || !highlighterRef.current) {
      console.log("Viewer or highlighter not ready");
      return;
    }

    try {
      const viewer = viewerRef.current;
      const highlighter = highlighterRef.current;
      const expressID = parseInt(elementId);

      // Pobierz wszystkie fragmenty z modelu
      const fragments = Object.values(viewer.scene?.get()?.children || [])
        .filter((child: any) => child.fragment);

      // Znajdź fragment zawierający ten element
      for (const fragment of fragments as any[]) {
        if (fragment.fragment) {
          const ids = fragment.fragment.ids;
          if (ids && ids.includes(expressID)) {
            // Podświetl element - użyj Set zamiast Array
            const fragmentIdMap: { [key: string]: Set<number> } = {
              [fragment.fragment.id]: new Set([expressID])
            };
            await highlighter.highlightByID("", fragmentIdMap);
            
            // Zaktualizuj stan zaznaczonego elementu
            setSelectedElementId(elementId);
            
            // Pobierz nazwę elementu
            try {
              const model = fragment.fragment.mesh.parent;
              const properties = await model.getProperties(expressID);
              const name = properties?.Name?.value || properties?.type || `Element ${expressID}`;
              setSelectedElementName(name);
            } catch (error) {
              setSelectedElementName(`Element ${expressID}`);
            }
            
            console.log("Element highlighted successfully");
            break;
          }
        }
      }
    } catch (error) {
      console.error("Error highlighting element:", error);
    }
  };

  // Funkcja do lokalnego ładowania pliku IFC (bez backendu)
  const handleLocalFileLoad = async (file: File) => {
    if (!ifcLoaderRef.current || !viewerRef.current) {
      console.error('IFC Loader or Viewer not initialized');
      handleError('Viewer nie jest jeszcze gotowy. Spróbuj ponownie za chwilę.');
      return;
    }

    try {
      setIsLoading(true);
      console.log('🚀 Loading IFC file locally:', file.name);
      
      // Przeczytaj plik jako ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      
      console.log('📦 File data prepared:', data.length, 'bytes');
      
      // Załaduj plik przez OpenBIM Components
      const model = await ifcLoaderRef.current.load(data);
      
      console.log('✅ IFC file loaded successfully:', model);
      
      // Dodaj model do loadedModelsRef dla funkcji wyszukiwania
      loadedModelsRef.current.push(model);
      
      // Pobierz fragmenty (meshes) z modelu i dodaj do listy obiektów dla narzędzi
      const viewer = viewerRef.current;
      const scene = viewer.scene?.get();
      
      if (scene) {
        // Zbierz wszystkie meshe z fragmentów
        const meshes: THREE.Object3D[] = [];
        scene.traverse((child: any) => {
          if (child.isMesh && child.geometry) {
            meshes.push(child);
          }
        });
        
        // Aktualizuj modelObjectsRef dla narzędzi wymiarowania
        modelObjectsRef.current = meshes;
        console.log(`📐 Loaded ${meshes.length} objects for dimension tool`);
        
        // Dopasuj kamerę do modelu
        if (viewer.camera && meshes.length > 0) {
          try {
            // Oblicz bounding box całego modelu
            const box = new THREE.Box3();
            meshes.forEach(mesh => {
              try {
                const meshBox = new THREE.Box3().setFromObject(mesh);
                if (meshBox && !box.isEmpty() || !meshBox.isEmpty()) {
                  box.union(meshBox);
                }
              } catch (err) {
                console.warn('Could not add mesh to bounding box:', err);
              }
            });
            
            // Sprawdź czy box jest prawidłowy
            if (box.isEmpty()) {
              throw new Error('Bounding box is empty');
            }
            
            // Oblicz środek i rozmiar
            const center = new THREE.Vector3();
            box.getCenter(center);
            const size = new THREE.Vector3();
            box.getSize(size);
            
            // Sprawdź czy center i size są prawidłowe
            if (!center || isNaN(center.x) || isNaN(center.y) || isNaN(center.z)) {
              throw new Error('Invalid center coordinates');
            }
            
            const maxDim = Math.max(size.x, size.y, size.z);
            if (maxDim === 0 || isNaN(maxDim)) {
              throw new Error('Invalid model dimensions');
            }
            
            // Ustaw kamerę - dla OrthoPerspectiveCamera
            const cameraComponent = viewer.camera as any;
            if (!cameraComponent || !cameraComponent.get) {
              throw new Error('Camera component not available');
            }
            
            const camera = cameraComponent.get() as THREE.PerspectiveCamera;
            if (!camera || !camera.position) {
              throw new Error('Camera not available');
            }
            
            // Oblicz odpowiednią odległość kamery bazując na rozmiarze modelu i FOV
            const fov = camera.fov || 60;
            const distance = maxDim / (2 * Math.tan((fov * Math.PI) / 360)) * 1.5;
            
            // Ustaw pozycję kamery pod kątem 45° (lepszy widok izometryczny)
            const offset = distance / Math.sqrt(3);
            camera.position.set(
              center.x + offset,
              center.y + offset,
              center.z + offset
            );
            
            // Zaktualizuj target kontrolek używając setLookAt (najbardziej niezawodne)
            if (cameraComponent.controls && cameraComponent.controls.setLookAt) {
              cameraComponent.controls.setLookAt(
                camera.position.x,
                camera.position.y,
                camera.position.z,
                center.x,
                center.y,
                center.z,
                false
              );
            } else if (cameraComponent.controls && cameraComponent.controls.target) {
              // Fallback: ustaw target bezpośrednio
              cameraComponent.controls.target.set(center.x, center.y, center.z);
              camera.lookAt(center);
            }
            
            // Zaktualizuj kontrolki
            if (cameraComponent.controls && cameraComponent.controls.update) {
              cameraComponent.controls.update();
            }
            
            camera.updateProjectionMatrix();
            
            console.log('📷 Camera fitted to model:', { 
              center: center.toArray(), 
              size: size.toArray(), 
              distance,
              cameraPosition: camera.position.toArray()
            });
          } catch (cameraError) {
            console.warn('⚠️ Could not fit camera to model:', cameraError);
            
            // Fallback: prostsze ustawienie kamery
            try {
              const cameraComponent = viewer.camera as any;
              if (cameraComponent && cameraComponent.get) {
                const camera = cameraComponent.get() as THREE.PerspectiveCamera;
                if (camera) {
                  camera.position.set(50, 50, 50);
                  camera.lookAt(0, 0, 0);
                  camera.updateProjectionMatrix();
                  
                  // Spróbuj także zaktualizować kontrolki
                  if (cameraComponent.controls && cameraComponent.controls.setLookAt) {
                    cameraComponent.controls.setLookAt(50, 50, 50, 0, 0, 0, false);
                  }
                  
                  console.log('📷 Using fallback camera position');
                }
              }
            } catch (fallbackError) {
              console.error('❌ Camera setup completely failed:', fallbackError);
            }
          }
        }
      }
      
      // Poinformuj użytkownika o sukcesie
      handleParsed({
        elements: [],
        costs: null,
        element_count: 0,
        costs_calculated: false,
      });
      
      // Wyczyść komunikat o błędzie
      handleError('');
      
      // Wymuś odświeżenie renderera
      if (viewer.renderer) {
        try {
          const renderer = (viewer.renderer as any).get();
          if (renderer && renderer.render) {
            const scene = viewer.scene?.get();
            const camera = (viewer.camera as any).get();
            if (scene && camera) {
              renderer.render(scene, camera);
              console.log('🎨 Forced renderer update');
            }
          }
        } catch (renderError) {
          console.warn('Could not force render update:', renderError);
        }
      }
      
      setIsLoading(false);
      
      console.log('🎉 Model loaded and displayed successfully!');
    } catch (error: any) {
      console.error('❌ Error loading IFC file:', error);
      handleError(`Błąd ładowania pliku: ${error.message || 'Nieznany błąd'}`);
      setIsLoading(false);
    }
  };

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header z nazwą aplikacji */}
      <header className={theme === 'dark' ? 'header-dark' : 'header-light'} style={{
        borderBottom: theme === 'dark' ? '1px solid #374151' : '1px solid #e5e7eb',
        padding: '12px 20px',
        backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
        zIndex: 100,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        flexShrink: 0,
      }}>
        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          color: theme === 'dark' ? '#f9fafb' : '#111827',
          margin: 0,
        }}>
          IFC Construction Calculator
        </h1>
        <p style={{
          fontSize: '0.875rem',
          color: theme === 'dark' ? '#9ca3af' : '#6b7280',
          margin: '4px 0 0 0',
        }}>
          Wizualizacja i analiza konstrukcji budowlanych
        </p>
      </header>

      <div 
        ref={viewerContainerRef} 
        style={{ 
          width: '100%', 
          flex: 1, 
          position: 'relative',
          touchAction: 'none', // Ważne dla kontrolek kamery
          overflow: 'visible',
          minHeight: 0,
        }}
      >
        <ActionBar onActionSelect={handleActionSelect} />

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
              onTypeVisibilityChange={handleTypeVisibilityChange}
              onShowAll={showAllTypes}
              onHideAll={hideAllTypes}
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
                  setSelectedPinColor(colorOption.color);
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
      
      {showCommentPanel && (
        <CommentPanel
          comments={getAllComments()}
          selectedElementId={selectedElementId}
          selectedElementName={selectedElementName}
          onAddComment={handleAddComment}
          onDeleteComment={handleDeleteComment}
          onClose={handleCloseCommentPanel}
          onCommentClick={handleCommentClick}
        />
      )}

      {/* Panel opcji wymiarowania */}
      <DimensionOptionsPanel
        isOpen={isDimensionMode}
        orthogonalMode={dimensionOrthogonal}
        snapToPoints={dimensionSnap}
        alignToEdgeMode={alignToEdgeMode}
        onOrthogonalChange={setDimensionOrthogonal}
        onSnapChange={setDimensionSnap}
        onAlignToEdgeChange={setAlignToEdgeMode}
      />

      {/* Panel opcji pomiaru objętości */}
      {volumeMeasurerRef.current && (
        <VolumeOptionsPanel
          isOpen={isVolumeMode}
          volumeMeasurer={volumeMeasurerRef.current}
          onEnabledChange={(enabled) => {
            if (volumeMeasurerRef.current) {
              volumeMeasurerRef.current.enabled = enabled;
            }
          }}
          onVisibleChange={(visible) => {
            if (volumeMeasurerRef.current) {
              volumeMeasurerRef.current.visible = visible;
            }
          }}
          onColorChange={(color) => {
            if (volumeMeasurerRef.current) {
              volumeMeasurerRef.current.color = new THREE.Color(color);
            }
          }}
          onModeChange={(mode) => {
            if (volumeMeasurerRef.current && volumeMeasurerRef.current.mode !== undefined) {
              volumeMeasurerRef.current.mode = mode;
            }
          }}
          onUnitsChange={(units) => {
            if (volumeMeasurerRef.current) {
              volumeMeasurerRef.current.units = units;
            }
          }}
          onPrecisionChange={(precision) => {
            if (volumeMeasurerRef.current) {
              volumeMeasurerRef.current.rounding = precision;
            }
          }}
          onDeleteAll={() => {
            if (volumeMeasurerRef.current && volumeMeasurerRef.current.list) {
              volumeMeasurerRef.current.list.clear();
              console.log('✅ All volume measurements deleted');
            }
          }}
          onLogValues={async () => {
            if (!volumeMeasurerRef.current) return;
            
            try {
              const values: number[] = [];
              const measurer = volumeMeasurerRef.current;
              
              if (measurer.list && measurer.list[Symbol.iterator]) {
                for (const volume of measurer.list) {
                  if (volume.getValue && typeof volume.getValue === 'function') {
                    const value = await volume.getValue();
                    values.push(value);
                  }
                }
              }
              
              console.log('📦 Volume measurement values:', values);
              if (values.length === 0) {
                console.log('⚠️ No volume measurements found');
              }
            } catch (error) {
              console.error('❌ Error getting volume values:', error);
            }
          }}
        />
      )}

      {/* Panel wyszukiwania */}
      {showSearchPanel && (
        <SearchPanel
          onClose={() => setShowSearchPanel(false)}
          onSelectElement={handleSearchSelect}
          searchFunction={searchElements}
          onAddToSelection={addToSelection}
        />
      )}

      {/* Panel selekcji i izolacji */}
      {showSelectionPanel && viewerRef.current && (
        <SelectionPanel
          selectedElements={selectedElements}
          isIsolated={isIsolated}
          onClose={() => setShowSelectionPanel(false)}
          onRemoveElement={removeFromSelection}
          onClearSelection={clearSelection}
          onIsolate={isolateElements}
          onUnisolate={unisolateElements}
          onSelectElement={handleSelectionElementClick}
          fragmentsManager={(viewerRef.current as any).fragments || getFragmentsManager(viewerRef.current)}
          loadedModels={getLoadedModels()}
        />
      )}

      {/* Panel widoczności kategorii */}
      {showVisibilityPanel && viewerRef.current && hiderRef.current && (
        <VisibilityPanel
          hider={hiderRef.current}
          fragmentsManager={(viewerRef.current as any).fragments || getFragmentsManager(viewerRef.current)}
          loadedModels={getLoadedModels()}
          onClose={() => setShowVisibilityPanel(false)}
        />
      )}

      {/* Panel widoków 2D */}
      {showViewsPanel && viewsManagerRef.current && (
        <ViewsPanel
          viewsManager={viewsManagerRef.current}
          onClose={() => {
            setShowViewsPanel(false);
            setIsAddSectionMode(false); // Cancel add section mode when closing panel
            setIsScissorsMode(false); // Cancel scissors mode when closing panel
          }}
          onAddSectionMode={() => {
            setIsAddSectionMode(!isAddSectionMode);
            if (!isAddSectionMode) setIsScissorsMode(false); // Disable scissors when enabling add section
            console.log('🔄 Add Section Mode:', !isAddSectionMode);
          }}
          isAddSectionMode={isAddSectionMode}
          onScissorsMode={(enabled: boolean) => {
            setIsScissorsMode(enabled);
            if (enabled) setIsAddSectionMode(false); // Disable add section when enabling scissors
            console.log('✂️ Scissors Mode:', enabled);
          }}
          isScissorsMode={isScissorsMode}
        />
      )}

      {/* Dialog eksportu dokumentacji */}
      <ExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        onExport={handleExport}
        totalElements={elements.length > 0 ? elements.length : countElementsFromModels()}
        selectedElementsCount={selectedElements.length}
        hasCosts={!!costs}
      />

      </div>
    </div>
  );
};

export default Viewer;

