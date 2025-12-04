/**
 * Views Feature - Modular Architecture
 * 
 * This module provides a clean, SOLID-compliant architecture for managing 2D views in IFC models.
 * 
 * Architecture:
 * - ViewRepository: Data storage (Repository Pattern)
 * - ViewFactory: View creation (Factory Pattern)
 * - CameraManager: Camera state management
 * - ClippingPlaneService: Clipping plane operations
 * - SectionHelperService: Visual helper management
 * - ViewsManager: Facade/Orchestrator (Facade Pattern)
 * 
 * Principles:
 * - Single Responsibility: Each class has one reason to change
 * - Open/Closed: Open for extension, closed for modification
 * - Liskov Substitution: Services can be replaced with implementations
 * - Interface Segregation: Small, focused interfaces
 * - Dependency Inversion: Depend on abstractions, not concretions
 */

import * as THREE from 'three';
import * as OBC from 'openbim-components';
import { ViewsManager } from './ViewsManager';

export { ViewsManager } from './ViewsManager';
export { ViewRepository } from './ViewRepository';
export { ViewFactory } from './ViewFactory';
export { CameraManager } from './CameraManager';
export { ClippingPlaneService } from './ClippingPlaneService';
export { SectionCuttingService } from './SectionCuttingService';
export { SectionHelperService } from './SectionHelperService';
export * from '../../types/views';

/**
 * Enable views feature - factory function for backward compatibility
 * This maintains the same API as the old viewsFeature.ts
 */
export function enableViewsFeature(
  viewer: OBC.Components,
  scene: THREE.Scene,
  camera: THREE.Camera,
  raycaster: any
): ViewsManager {
  const viewsManager = new ViewsManager(viewer, scene, camera, raycaster);
  console.log('✅ Views feature enabled');
  return viewsManager;
}
