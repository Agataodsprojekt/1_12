import * as THREE from 'three';
import * as OBC from 'openbim-components';
import { View } from '../../types/views';
import { ClippingPlaneService } from './ClippingPlaneService';

/**
 * Section Cutting Service
 * Single Responsibility: Manage section cutting operations (apply/remove cuts)
 * 
 * This service orchestrates section cutting operations by coordinating
 * between clipping planes and section helpers.
 */
export class SectionCuttingService {
  private clippingService: ClippingPlaneService;
  private activeSectionViewId: string | null = null;

  constructor(clippingService: ClippingPlaneService) {
    this.clippingService = clippingService;
  }

  /**
   * Apply section cut for a view
   * This cuts the model along the section plane
   */
  applySectionCut(viewId: string, view: View): boolean {
    try {
      if (!view.normal || !view.point) {
        console.warn(`⚠️ Cannot apply section cut - view missing normal or point: ${viewId}`);
        return false;
      }

      // Convert normal and point to Vector3 if needed
      const normal = view.normal instanceof THREE.Vector3
        ? view.normal.clone()
        : new THREE.Vector3(view.normal.x, view.normal.y, view.normal.z);
      
      const point = view.point instanceof THREE.Vector3
        ? view.point.clone()
        : new THREE.Vector3(view.point.x, view.point.y, view.point.z);

      // Apply clipping plane to cut the model
      this.clippingService.applyClippingPlane(viewId, normal, point);
      
      this.activeSectionViewId = viewId;
      
      console.log(`✂️ Applied section cut for view: ${viewId} (${view.name})`);
      return true;
    } catch (error) {
      console.error(`❌ Error applying section cut for view ${viewId}:`, error);
      return false;
    }
  }

  /**
   * Remove section cut for a view
   * This restores the model by removing the clipping plane
   */
  removeSectionCut(viewId: string): boolean {
    try {
      this.clippingService.removeClippingPlane(viewId);
      
      if (this.activeSectionViewId === viewId) {
        this.activeSectionViewId = null;
      }
      
      console.log(`✂️ Removed section cut for view: ${viewId}`);
      return true;
    } catch (error) {
      console.error(`❌ Error removing section cut for view ${viewId}:`, error);
      return false;
    }
  }

  /**
   * Update section cut position
   * Moves the cutting plane to a new position
   */
  updateSectionCut(viewId: string, view: View, newPoint: THREE.Vector3): boolean {
    try {
      if (!view.normal) {
        console.warn(`⚠️ Cannot update section cut - view missing normal: ${viewId}`);
        return false;
      }

      // Remove old clipping plane
      this.removeSectionCut(viewId);
      
      // Apply new clipping plane at new position
      const normal = view.normal instanceof THREE.Vector3
        ? view.normal.clone()
        : new THREE.Vector3(view.normal.x, view.normal.y, view.normal.z);
      
      this.clippingService.applyClippingPlane(viewId, normal, newPoint);
      
      console.log(`✂️ Updated section cut position for view: ${viewId}`);
      return true;
    } catch (error) {
      console.error(`❌ Error updating section cut for view ${viewId}:`, error);
      return false;
    }
  }

  /**
   * Check if a section cut is active for a view
   */
  isSectionCutActive(viewId: string): boolean {
    return this.activeSectionViewId === viewId;
  }

  /**
   * Get active section view ID
   */
  getActiveSectionViewId(): string | null {
    return this.activeSectionViewId;
  }

  /**
   * Clear all section cuts
   */
  clearAllSectionCuts(): void {
    if (this.activeSectionViewId) {
      this.removeSectionCut(this.activeSectionViewId);
    }
    this.activeSectionViewId = null;
    console.log('✂️ Cleared all section cuts');
  }
}
