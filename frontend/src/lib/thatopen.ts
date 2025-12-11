/**
 * Shared instances of OpenBIM Components
 * Only Hider and FragmentsManager are shared - Viewer should be created per component
 */

import * as OBC from 'openbim-components';
import { SimpleHider } from '../utils/SimpleHider';

// Singleton instances - only for Hider and FragmentsManager
let fragmentsManagerInstance: any | null = null;
let hiderInstance: SimpleHider | null = null;
let loadedModelsRef: any[] = [];

/**
 * Get or initialize FragmentsManager from viewer
 */
export function getFragmentsManager(viewer: OBC.Components): any | null {
  if (fragmentsManagerInstance) {
    return fragmentsManagerInstance;
  }

  // Try different ways to get FragmentsManager
  try {
    // Method 1: viewer.fragments
    if ((viewer as any).fragments) {
      fragmentsManagerInstance = (viewer as any).fragments;
      console.log('✅ Found FragmentsManager via viewer.fragments');
      return fragmentsManagerInstance;
    }

    // Method 2: viewer.get(OBC.FragmentsManager)
    if (typeof (viewer as any).get === 'function') {
      try {
        fragmentsManagerInstance = (viewer as any).get(OBC.FragmentsManager);
        if (fragmentsManagerInstance) {
          console.log('✅ Found FragmentsManager via viewer.get()');
          return fragmentsManagerInstance;
        }
      } catch (e) {
        // Continue
      }
    }

    // Method 3: Check if FragmentsManager is a component
    if (OBC.FragmentsManager) {
      // FragmentsManager might need to be initialized
      console.log('⚠️ FragmentsManager class exists but instance not found');
    }
  } catch (error) {
    console.warn('⚠️ Error getting FragmentsManager:', error);
  }

  return null;
}

/**
 * Get or create SimpleHider instance
 */
export function getHider(): SimpleHider {
  if (!hiderInstance) {
    hiderInstance = new SimpleHider(loadedModelsRef);
    console.log('✅ Created shared SimpleHider instance');
  }
  return hiderInstance;
}

/**
 * Update loaded models in hider
 */
export function updateHiderModels(models: any[]) {
  loadedModelsRef = models;
  if (hiderInstance) {
    hiderInstance.setModels(models);
    console.log('✅ Updated SimpleHider with', models.length, 'models');
  }
}

/**
 * Get loaded models reference
 */
export function getLoadedModels(): any[] {
  return loadedModelsRef;
}

/**
 * Set loaded models
 */
export function setLoadedModels(models: any[]) {
  loadedModelsRef = models;
  updateHiderModels(models);
}

/**
 * Reset all instances (for cleanup)
 */
export function resetInstances() {
  fragmentsManagerInstance = null;
  hiderInstance = null;
  loadedModelsRef = [];
  console.log('🗑️ Reset all shared instances');
}

export { OBC };

