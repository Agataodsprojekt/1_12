/**
 * Simple Hider implementation for openbim-components
 * Provides Hider-like API using mesh.visible for compatibility
 */

import * as THREE from 'three';

export interface ModelIdMap {
  [modelId: string]: Set<number>;
}

export class SimpleHider {
  private hiddenItems: Map<string, Set<number>> = new Map();
  private originalVisibility: Map<string, Map<number, boolean>> = new Map();
  private loadedModels: any[] = [];

  constructor(loadedModels: any[] = []) {
    this.loadedModels = loadedModels;
  }

  /**
   * Update loaded models reference
   */
  setModels(models: any[]) {
    this.loadedModels = models;
  }

  /**
   * Isolate elements - show only specified elements
   */
  async isolate(map: ModelIdMap): Promise<void> {
    try {
      // Save current visibility state
      this.saveVisibilityState();

      // Hide all elements first
      this.hideAll();

      // Show only elements in the map
      for (const [modelId, idsToShow] of Object.entries(map)) {
        const model = this.findModelById(modelId);
        if (!model) {
          console.warn(`⚠️ Model ${modelId} not found in loadedModels`);
          continue;
        }

        console.log(`📋 Processing model ${modelId} for isolation, ${idsToShow.size} IDs to show`);

        for (const item of model.items || []) {
          if (!item || !item.mesh) continue;

          const mesh = item.mesh;
          
          // Convert item.ids to array (handle different formats)
          let allIDs: number[] = [];
          const itemIds = (item as any)?.ids;
          if (itemIds) {
            if (Array.isArray(itemIds)) {
              allIDs = itemIds;
            } else if (itemIds instanceof Set) {
              allIDs = Array.from(itemIds);
            } else if (itemIds instanceof Map) {
              allIDs = Array.from(itemIds.keys());
            } else if (typeof itemIds === 'object') {
              // Try to convert object keys to numbers
              try {
                allIDs = Object.keys(itemIds).map(k => parseInt(k)).filter(k => !isNaN(k));
              } catch (e) {
                // Ignore
              }
            }
          }
          
          // Skip if no IDs found
          if (allIDs.length === 0) continue;

          // Check if any of the IDs in this fragment should be visible
          const hasVisibleId = allIDs.some((id: number) => idsToShow.has(id));

          if (hasVisibleId) {
            // Show this mesh
            mesh.visible = true;
            console.log(`✅ Showing mesh for fragment with ${allIDs.length} IDs, ${allIDs.filter(id => idsToShow.has(id)).length} visible`);
            
            // Store which IDs should be visible
            const fragmentId = item.id || String(model.items.indexOf(item));
            if (!this.hiddenItems.has(fragmentId)) {
              this.hiddenItems.set(fragmentId, new Set());
            }
            
            // Mark visible IDs
            allIDs.forEach((id: number) => {
              if (idsToShow.has(id)) {
                this.hiddenItems.get(fragmentId)!.delete(id);
              } else {
                this.hiddenItems.get(fragmentId)!.add(id);
              }
            });
          } else {
            // Keep hidden
            mesh.visible = false;
          }
        }
      }

      console.log('✅ SimpleHider: Isolation complete');
    } catch (error) {
      console.error('❌ SimpleHider: Error isolating:', error);
      throw error;
    }
  }

  /**
   * Set visibility - true to show all, false to hide specified elements
   */
  async set(visible: boolean, map?: ModelIdMap): Promise<void> {
    if (visible) {
      // Show all elements
      await this.showAll();
    } else if (map) {
      // Hide specified elements
      await this.hide(map);
    }
  }

  /**
   * Hide specified elements
   */
  async hide(map: ModelIdMap): Promise<void> {
    try {
      this.saveVisibilityState();

      for (const [modelId, idsToHide] of Object.entries(map)) {
        const model = this.findModelById(modelId);
        if (!model) {
          console.warn(`⚠️ Model ${modelId} not found in loadedModels`);
          continue;
        }

        console.log(`📋 Processing model ${modelId} for hiding, ${idsToHide.size} IDs to hide`);

        for (const item of model.items || []) {
          if (!item || !item.mesh) continue;

          const mesh = item.mesh;
          
          // Convert item.ids to array (handle different formats)
          let allIDs: number[] = [];
          const itemIds = (item as any)?.ids;
          if (itemIds) {
            if (Array.isArray(itemIds)) {
              allIDs = itemIds;
            } else if (itemIds instanceof Set) {
              allIDs = Array.from(itemIds);
            } else if (itemIds instanceof Map) {
              allIDs = Array.from(itemIds.keys());
            } else if (typeof itemIds === 'object') {
              // Try to convert object keys to numbers
              try {
                allIDs = Object.keys(itemIds).map(k => parseInt(k)).filter(k => !isNaN(k));
              } catch (e) {
                // Ignore
              }
            }
          }
          
          // Skip if no IDs found
          if (allIDs.length === 0) continue;

          // Check if all IDs in this fragment should be hidden
          const allHidden = allIDs.every((id: number) => idsToHide.has(id));
          const someHidden = allIDs.some((id: number) => idsToHide.has(id));

          if (allHidden) {
            // Hide entire mesh
            mesh.visible = false;
            console.log(`❌ Hiding entire mesh (all ${allIDs.length} IDs hidden)`);
          } else if (someHidden) {
            // Partial hiding - for now, hide entire mesh
            // In future, could implement fragment splitting here
            mesh.visible = false;
            console.log(`❌ Hiding mesh (${allIDs.filter(id => idsToHide.has(id)).length} of ${allIDs.length} IDs hidden)`);
          }

          // Store hidden IDs
          const fragmentId = item.id || String(model.items.indexOf(item));
          if (!this.hiddenItems.has(fragmentId)) {
            this.hiddenItems.set(fragmentId, new Set());
          }
          allIDs.forEach((id: number) => {
            if (idsToHide.has(id)) {
              this.hiddenItems.get(fragmentId)!.add(id);
            }
          });
        }
      }

      console.log('✅ SimpleHider: Hide complete');
    } catch (error) {
      console.error('❌ SimpleHider: Error hiding:', error);
      throw error;
    }
  }

  /**
   * Show all elements
   */
  async showAll(): Promise<void> {
    try {
      let shownCount = 0;
      for (const model of this.loadedModels) {
        for (const item of model.items || []) {
          if (item && item.mesh) {
            item.mesh.visible = true;
            shownCount++;
          }
        }
      }

      // Clear hidden items tracking
      this.hiddenItems.clear();
      this.originalVisibility.clear();

      console.log(`✅ SimpleHider: All ${shownCount} elements visible`);
    } catch (error) {
      console.error('❌ SimpleHider: Error showing all:', error);
      throw error;
    }
  }

  /**
   * Hide all elements
   */
  private hideAll(): void {
    let hiddenCount = 0;
    for (const model of this.loadedModels) {
      for (const item of model.items || []) {
        if (item && item.mesh) {
          item.mesh.visible = false;
          hiddenCount++;
        }
      }
    }
    console.log(`👁️ Hid ${hiddenCount} meshes`);
  }

  /**
   * Save current visibility state
   */
  private saveVisibilityState(): void {
    for (const model of this.loadedModels) {
      const modelId = model.modelId || model.uuid || 'default';
      if (!this.originalVisibility.has(modelId)) {
        this.originalVisibility.set(modelId, new Map());
      }

      for (const item of model.items || []) {
        if (item && item.mesh) {
          const fragmentId = item.id || String(model.items.indexOf(item));
          const key = `${modelId}:${fragmentId}`;
          const visibilityMap = this.originalVisibility.get(modelId)!;
          visibilityMap.set(fragmentId, item.mesh.visible);
        }
      }
    }
  }

  /**
   * Find model by ID
   */
  private findModelById(modelId: string): any | null {
    for (const model of this.loadedModels) {
      const id = model.modelId || model.uuid || String(this.loadedModels.indexOf(model));
      if (id === modelId) {
        return model;
      }
    }
    return null;
  }
}

