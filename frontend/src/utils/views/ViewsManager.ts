import * as THREE from 'three';
import * as OBC from 'openbim-components';
import { View, SectionViewOptions, StoreyInfo } from '../../types/views';
import { ViewRepository } from './ViewRepository';
import { ViewFactory } from './ViewFactory';
import { CameraManager } from './CameraManager';
import { ClippingPlaneService } from './ClippingPlaneService';
import { SectionHelperService } from './SectionHelperService';
import { SectionCuttingService } from './SectionCuttingService';
import { getLoadedModels } from '../../lib/thatopen';

/**
 * Views Manager - Facade/Orchestrator
 * Single Responsibility: Orchestrate all view-related operations
 * Dependency Inversion: Depends on abstractions (services), not concrete implementations
 * 
 * This class acts as a Facade pattern, providing a simple interface
 * to the complex subsystem of view management services.
 */
export class ViewsManager {
  private repository: ViewRepository;
  private factory: ViewFactory;
  private cameraManager: CameraManager;
  private clippingService: ClippingPlaneService;
  private cuttingService: SectionCuttingService;
  private helperService: SectionHelperService;
  private viewer: OBC.Components;

  constructor(
    viewer: OBC.Components,
    scene: THREE.Scene,
    camera: THREE.Camera,
    raycaster: any
  ) {
    this.viewer = viewer;
    this.repository = new ViewRepository();
    this.factory = new ViewFactory(viewer);
    this.cameraManager = new CameraManager(viewer, camera);
    this.clippingService = new ClippingPlaneService(viewer, scene);
    this.cuttingService = new SectionCuttingService(this.clippingService);
    this.helperService = new SectionHelperService(scene);
  }

  /**
   * Get all views
   */
  getAllViews(): View[] {
    return this.repository.getAll();
  }

  /**
   * Get view by ID
   */
  getView(viewId: string): View | undefined {
    return this.repository.getById(viewId);
  }

  /**
   * Create a storey view
   */
  async createStoreyView(storeyName: string, elevation: number): Promise<View | null> {
    const view = await this.factory.createStoreyView(storeyName, elevation);
    if (view) {
      this.repository.save(view);
    }
    return view;
  }

  /**
   * Create a section view from normal and point
   */
  async createSectionView(
    normal: THREE.Vector3,
    point: THREE.Vector3,
    options?: SectionViewOptions
  ): Promise<View | null> {
    return this.createSectionViewWithNormal(normal, point, options);
  }

  /**
   * Create a section view with normal and point (alias for createSectionView)
   * Kept for backward compatibility
   */
  async createSectionViewWithNormal(
    normal: THREE.Vector3,
    point: THREE.Vector3,
    options?: SectionViewOptions
  ): Promise<View | null> {
    const view = await this.factory.createSectionView(normal, point, options);
    if (view) {
      this.repository.save(view);
      
      // Create section cut and helper for section views
      if (view.normal && view.point) {
        this.cuttingService.applySectionCut(view.id, view);
        this.helperService.createHelper(view.id, view, view.normal, view.point, view.range || 10);
      }
    }
    return view;
  }

  /**
   * Create section view from two points (scissors tool)
   */
  async createSectionViewFromPoints(
    point1: THREE.Vector3,
    point2: THREE.Vector3,
    cameraDirection: THREE.Vector3,
    options?: SectionViewOptions
  ): Promise<View | null> {
    const view = await this.factory.createSectionViewFromPoints(point1, point2, cameraDirection, options);
    if (view) {
      this.repository.save(view);
      
      // Create section cut and helper
      if (view.normal && view.point) {
        this.cuttingService.applySectionCut(view.id, view);
        this.helperService.createHelper(view.id, view, view.normal, view.point, view.range || 10);
      }
    }
    return view;
  }

  /**
   * Open a view
   */
  async openView(viewId: string): Promise<boolean> {
    try {
      const view = this.repository.getById(viewId);
      if (!view) {
        console.warn(`⚠️ View not found: ${viewId}`);
        return false;
      }

      // Save current camera state if no view is active
      if (!this.repository.getActiveViewId()) {
        this.cameraManager.saveState();
      }

      // Close current view if active
      const activeViewId = this.repository.getActiveViewId();
      if (activeViewId) {
        await this.closeActiveView();
      }

      // For section views, preserve camera and only apply section cut
      if (view.type === 'section' && view.normal && view.point) {
        this.cuttingService.applySectionCut(viewId, view);
        view.active = true;
        this.repository.setActiveViewId(viewId);
        console.log(`✅ Opened section view: ${view.name} (camera preserved, section cut applied)`);
        return true;
      }

      // For other views, set camera position
      if ((view as any).cameraPosition && (view as any).cameraTarget) {
        const success = this.cameraManager.setCamera(
          (view as any).cameraPosition,
          (view as any).cameraTarget
        );
        
        if (success) {
          view.active = true;
          this.repository.setActiveViewId(viewId);
          console.log(`✅ Opened view: ${view.name}`);
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('❌ Error opening view:', error);
      return false;
    }
  }

  /**
   * Close active view
   */
  async closeActiveView(): Promise<boolean> {
    try {
      const activeViewId = this.repository.getActiveViewId();
      if (!activeViewId) {
        return false;
      }

      const view = this.repository.getById(activeViewId);
      if (view) {
        view.active = false;
        
        // Remove section cut if this was a section view
        if (view.type === 'section') {
          this.cuttingService.removeSectionCut(activeViewId);
        }
      }

      this.repository.setActiveViewId(null);
      console.log('✅ Closed active view');
      return true;
    } catch (error) {
      console.error('❌ Error closing view:', error);
      return false;
    }
  }

  /**
   * Delete a view
   */
  async deleteView(viewId: string): Promise<boolean> {
    try {
      const view = this.repository.getById(viewId);
      if (!view) {
        return false;
      }

      // Remove section cut and helper if section view
      if (view.type === 'section') {
        this.cuttingService.removeSectionCut(viewId);
        this.helperService.removeHelper(viewId);
      }

      // Remove from repository
      const deleted = this.repository.delete(viewId);
      
      // If this was the active view, clear active view ID
      if (this.repository.getActiveViewId() === viewId) {
        this.repository.setActiveViewId(null);
      }

      return deleted;
    } catch (error) {
      console.error('❌ Error deleting view:', error);
      return false;
    }
  }

  /**
   * Toggle section helper visibility
   */
  toggleSectionHelperVisibility(viewId: string): boolean {
    return this.helperService.toggleVisibility(viewId);
  }

  /**
   * Check if section helper is visible
   */
  isSectionHelperVisible(viewId: string): boolean {
    return this.helperService.isVisible(viewId);
  }

  /**
   * Update section plane offset
   */
  updateSectionPlane(viewId: string, offset: number, updateCamera: boolean = true): boolean {
    const view = this.repository.getById(viewId);
    if (!view || view.type !== 'section' || !view.normal || !view.point) {
      return false;
    }

    // Calculate new point based on offset
    const newPoint = view.point.clone().addScaledVector(view.normal, offset);
    
    // Update section cut
    this.cuttingService.updateSectionCut(viewId, view, newPoint);

    // Update helper position
    this.helperService.removeHelper(viewId);
    this.helperService.createHelper(viewId, view, view.normal, newPoint, view.range || 10);

    // Update view point
    view.point = newPoint;

    return true;
  }

  /**
   * Get active view
   */
  getActiveView(): View | null {
    const activeViewId = this.repository.getActiveViewId();
    if (!activeViewId) {
      return null;
    }
    return this.repository.getById(activeViewId) || null;
  }

  /**
   * Extract storeys from model
   */
  async extractStoreysFromModel(model: any): Promise<StoreyInfo[]> {
    return this.factory.extractStoreysFromModel(model);
  }

  /**
   * Create elevation view
   */
  async createElevationView(
    direction: 'north' | 'south' | 'east' | 'west',
    name?: string
  ): Promise<View | null> {
    const view = await this.factory.createElevationView(direction, name);
    if (view) {
      this.repository.save(view);
    }
    return view;
  }

  /**
   * Create standard views (elevations, top view)
   */
  async createStandardViews(): Promise<View[]> {
    const createdViews: View[] = [];

    console.log('🏗️ Creating standard views (elevations, top view)...');

    try {
      // Create top view
      const topView = await this.createStoreyView('Top View', 0);
      if (topView) {
        // Override camera position for top-down view
        (topView as any).cameraPosition = new THREE.Vector3(0, 100, 0);
        (topView as any).cameraTarget = new THREE.Vector3(0, 0, 0);
        this.repository.save(topView);
        createdViews.push(topView);
        console.log('  ✅ Created Top View');
      }

      // Create elevation views
      const elevations = ['north', 'south', 'east', 'west'] as const;
      for (const direction of elevations) {
        const elevationView = await this.createElevationView(direction);
        if (elevationView) {
          createdViews.push(elevationView);
          console.log(`  ✅ Created ${direction.charAt(0).toUpperCase() + direction.slice(1)} Elevation`);
        }
      }
    } catch (error) {
      console.error('❌ Error creating standard views:', error);
    }

    console.log(`✅ Created ${createdViews.length} standard view(s)`);
    return createdViews;
  }

  /**
   * Create storey views from loaded models
   */
  async createStoreyViewsFromModels(): Promise<View[]> {
    const loadedModels = getLoadedModels();
    const createdViews: View[] = [];

    console.log(`🏗️ Creating views from ${loadedModels.length} loaded model(s)...`);

    if (loadedModels.length === 0) {
      console.warn('⚠️ No loaded models available, creating standard views only');
      const standardViews = await this.createStandardViews();
      return standardViews;
    }

    // First, always create standard views (elevations, top view)
    const standardViews = await this.createStandardViews();
    createdViews.push(...standardViews);

    // Then, try to extract storeys from models
    for (let i = 0; i < loadedModels.length; i++) {
      const model = loadedModels[i];
      try {
        console.log(`📦 Processing model ${i + 1}/${loadedModels.length} for storeys...`);
        const storeys = await this.factory.extractStoreysFromModel(model);

        console.log(`  Found ${storeys.length} storeys in model ${i + 1}`);

        for (const storey of storeys) {
          // Skip if it's the default view (we already have standard views)
          if (storey.name === 'Default View') continue;

          const view = await this.createStoreyView(storey.name, storey.elevation);
          if (view) {
            createdViews.push(view);
            console.log(`  ✅ Created storey view: ${view.name}`);
          }
        }
      } catch (error) {
        console.error(`❌ Error processing model ${i + 1}:`, error);
      }
    }

    console.log(`✅ Created ${createdViews.length} total view(s) (${standardViews.length} standard + ${createdViews.length - standardViews.length} storeys)`);
    return createdViews;
  }
}
