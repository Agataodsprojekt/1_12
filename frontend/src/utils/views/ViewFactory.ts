import * as THREE from 'three';
import * as OBC from 'openbim-components';
import { View, SectionViewOptions, StoreyInfo } from '../../types/views';
import { getLoadedModels } from '../../lib/thatopen';

/**
 * View Factory
 * Single Responsibility: Create different types of views
 * Open/Closed Principle: Open for extension (new view types), closed for modification
 */
export class ViewFactory {
  private viewer: OBC.Components;
  private viewsComponent: any = null; // OBC.Views if available
  private worldsComponent: any = null; // OBC.Worlds if available

  constructor(viewer: OBC.Components) {
    this.viewer = viewer;
    this.initializeComponents();
  }

  private initializeComponents(): void {
    try {
      if ((OBC as any).Views) {
        this.viewsComponent = new (OBC as any).Views(this.viewer);
        console.log('✅ OBC.Views initialized');
      }
      if ((OBC as any).Worlds) {
        this.worldsComponent = new (OBC as any).Worlds(this.viewer);
        console.log('✅ OBC.Worlds initialized');
      }
    } catch (error) {
      console.warn('⚠️ Error initializing Views/Worlds components:', error);
    }
  }

  /**
   * Create a storey view
   */
  async createStoreyView(storeyName: string, elevation: number): Promise<View | null> {
    try {
      const viewId = `storey-${storeyName}-${Date.now()}`;
      
      // Try to use OBC.Views if available
      if (this.viewsComponent && typeof this.viewsComponent.create === 'function') {
        const world = await this.viewsComponent.create();
        const view: View = {
          id: viewId,
          name: storeyName,
          type: 'storey',
          world,
          active: false,
        };
        return view;
      }

      // Custom implementation
      const view: View = {
        id: viewId,
        name: storeyName,
        type: 'storey',
        active: false,
      };

      // Calculate camera position
      const { position, target } = this.calculateStoreyCamera(storeyName, elevation);
      (view as any).cameraPosition = position;
      (view as any).cameraTarget = target;

      console.log(`✅ Created storey view: ${storeyName} at elevation ${elevation}`);
      return view;
    } catch (error) {
      console.error('❌ Error creating storey view:', error);
      return null;
    }
  }

  /**
   * Create a section view with normal and point
   */
  async createSectionView(
    normal: THREE.Vector3,
    point: THREE.Vector3,
    options?: SectionViewOptions
  ): Promise<View | null> {
    try {
      const viewId = `section-${Date.now()}`;
      const viewName = options?.name || `Section ${viewId}`;
      const range = options?.range || 10;
      const helpersVisible = options?.helpersVisible !== false;
      const fromScissors = options?.fromScissors || false;

      // Determine final normal and point based on mode
      let finalNormal: THREE.Vector3;
      let finalPoint: THREE.Vector3;

      if (fromScissors) {
        // For scissors: plane passes through the line, no inversion/offset
        finalNormal = normal.clone().normalize();
        finalPoint = point.clone();
      } else {
        // For double-click: invert normal and add offset
        finalNormal = normal.clone().negate().normalize();
        finalPoint = point.clone().addScaledVector(normal, 1);
      }

      // Try to use OBC.Views if available
      if (this.viewsComponent && typeof this.viewsComponent.create === 'function') {
        const world = this.worldsComponent ? await this.worldsComponent.create() : null;
        const view: View = {
          id: viewId,
          name: viewName,
          type: 'section',
          world,
          active: false,
          normal: finalNormal,
          point: finalPoint,
          range,
          helpersVisible,
        };
        return view;
      }

      // Custom implementation
      const view: View = {
        id: viewId,
        name: viewName,
        type: 'section',
        active: false,
        normal: finalNormal,
        point: finalPoint,
        range,
        helpersVisible,
      };

      // Store scissors-specific data if applicable
      if (fromScissors) {
        (view as any).fromScissors = true;
        if (options?.scissorsPoint1 && options?.scissorsPoint2) {
          (view as any).scissorsPoint1 = options.scissorsPoint1.clone();
          (view as any).scissorsPoint2 = options.scissorsPoint2.clone();
        }
      }

      // Calculate camera position for section view
      const cameraPos = finalPoint.clone().addScaledVector(finalNormal, range);
      (view as any).cameraPosition = cameraPos;
      (view as any).cameraTarget = finalPoint;

      console.log(`✅ Created section view: ${viewName}`);
      return view;
    } catch (error) {
      console.error('❌ Error creating section view:', error);
      return null;
    }
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
    try {
      // Calculate line direction
      const lineDirection = new THREE.Vector3().subVectors(point2, point1);
      const lineLength = lineDirection.length();
      lineDirection.normalize();

      // Calculate normal: perpendicular to both line direction and camera direction
      let normal = new THREE.Vector3().crossVectors(lineDirection, cameraDirection);
      const normalLength = normal.length();

      // Handle edge case where normal is zero
      if (normalLength < 0.001) {
        const cameraUp = new THREE.Vector3(0, 1, 0);
        normal = new THREE.Vector3().crossVectors(lineDirection, cameraUp);
        if (normal.length() < 0.001) {
          const cameraRight = new THREE.Vector3(1, 0, 0);
          normal = new THREE.Vector3().crossVectors(lineDirection, cameraRight);
        }
      }

      normal.normalize();

      // Use midpoint of the line
      const midpoint = new THREE.Vector3().addVectors(point1, point2).multiplyScalar(0.5);
      const calculatedRange = options?.range || Math.max(lineLength * 2, 30);

      // Create section view with scissors flag
      return this.createSectionView(normal, midpoint, {
        ...options,
        range: calculatedRange,
        fromScissors: true,
        scissorsPoint1: point1,
        scissorsPoint2: point2,
      });
    } catch (error) {
      console.error('❌ Error creating section view from points:', error);
      return null;
    }
  }

  /**
   * Calculate camera position for storey view
   */
  private calculateStoreyCamera(storeyName: string, elevation: number): {
    position: THREE.Vector3;
    target: THREE.Vector3;
  } {
    let modelCenter = new THREE.Vector3(0, 0, 0);
    let modelSize = new THREE.Vector3(50, 50, 50);

    try {
      const loadedModels = getLoadedModels();
      if (loadedModels.length > 0) {
        const box = new THREE.Box3();
        for (const model of loadedModels) {
          if (model.items && Array.isArray(model.items)) {
            for (const item of model.items) {
              if (item.mesh) {
                const itemBox = new THREE.Box3().setFromObject(item.mesh);
                if (!box.isEmpty() || !itemBox.isEmpty()) {
                  box.union(itemBox);
                }
              }
            }
          }
        }
        if (!box.isEmpty()) {
          box.getCenter(modelCenter);
          box.getSize(modelSize);
        }
      }
    } catch (e) {
      // Use defaults
    }

    let cameraPosition: THREE.Vector3;
    let cameraTarget: THREE.Vector3;

    if (storeyName.toLowerCase().includes('top')) {
      const height = Math.max(modelSize.x, modelSize.y, modelSize.z) * 1.5;
      cameraPosition = new THREE.Vector3(modelCenter.x, modelCenter.y + height, modelCenter.z);
      cameraTarget = new THREE.Vector3(modelCenter.x, modelCenter.y, modelCenter.z);
    } else {
      const height = Math.max(modelSize.x, modelSize.z) * 1.2;
      cameraPosition = new THREE.Vector3(modelCenter.x, elevation + height, modelCenter.z);
      cameraTarget = new THREE.Vector3(modelCenter.x, elevation, modelCenter.z);
    }

    return { position: cameraPosition, target: cameraTarget };
  }

  /**
   * Create an elevation view
   */
  async createElevationView(
    direction: 'north' | 'south' | 'east' | 'west',
    name?: string
  ): Promise<View | null> {
    try {
      const viewId = `elevation-${direction}-${Date.now()}`;
      const viewName = name || `${direction.charAt(0).toUpperCase() + direction.slice(1)} Elevation`;

      const view: View = {
        id: viewId,
        name: viewName,
        type: 'elevation',
        active: false,
      };

      // Calculate camera position based on direction
      const { position, target } = this.calculateElevationCamera(direction);
      (view as any).cameraPosition = position;
      (view as any).cameraTarget = target;

      console.log(`✅ Created elevation view: ${viewName}`);
      return view;
    } catch (error) {
      console.error('❌ Error creating elevation view:', error);
      return null;
    }
  }

  /**
   * Calculate camera position for elevation view
   */
  private calculateElevationCamera(direction: 'north' | 'south' | 'east' | 'west'): {
    position: THREE.Vector3;
    target: THREE.Vector3;
  } {
    let modelCenter = new THREE.Vector3(0, 0, 0);
    let modelSize = new THREE.Vector3(50, 50, 50);

    try {
      const loadedModels = getLoadedModels();
      if (loadedModels.length > 0) {
        const box = new THREE.Box3();
        for (const model of loadedModels) {
          if (model.items && Array.isArray(model.items)) {
            for (const item of model.items) {
              if (item.mesh) {
                const itemBox = new THREE.Box3().setFromObject(item.mesh);
                if (!box.isEmpty() || !itemBox.isEmpty()) {
                  box.union(itemBox);
                }
              }
            }
          }
        }
        if (!box.isEmpty()) {
          box.getCenter(modelCenter);
          box.getSize(modelSize);
        }
      }
    } catch (e) {
      // Use defaults
    }

    const distance = Math.max(modelSize.x, modelSize.y, modelSize.z) * 1.5;
    const height = modelCenter.y + modelSize.y * 0.5;
    let cameraPosition: THREE.Vector3;

    switch (direction) {
      case 'north':
        cameraPosition = new THREE.Vector3(modelCenter.x, height, modelCenter.z + distance);
        break;
      case 'south':
        cameraPosition = new THREE.Vector3(modelCenter.x, height, modelCenter.z - distance);
        break;
      case 'east':
        cameraPosition = new THREE.Vector3(modelCenter.x + distance, height, modelCenter.z);
        break;
      case 'west':
        cameraPosition = new THREE.Vector3(modelCenter.x - distance, height, modelCenter.z);
        break;
    }

    const cameraTarget = new THREE.Vector3(modelCenter.x, height, modelCenter.z);
    return { position: cameraPosition, target: cameraTarget };
  }

  /**
   * Extract storeys from IFC model
   */
  async extractStoreysFromModel(model: any): Promise<StoreyInfo[]> {
    const storeys: StoreyInfo[] = [];
    const processedIds = new Set<number>();

    console.log('🔍 Extracting storeys from model...');

    try {
      // Method 1: Try to get IfcBuildingStorey from model properties
      if (model && typeof model.getAllPropertiesOfType === 'function') {
        try {
          const storeyProps = await model.getAllPropertiesOfType(0, 'IfcBuildingStorey');
          if (storeyProps && Array.isArray(storeyProps)) {
            console.log(`📊 Found ${storeyProps.length} storeys via getAllPropertiesOfType`);
            for (const prop of storeyProps) {
              const name = prop.Name?.value || prop.type || 'Storey';
              const elevation = prop.Elevation?.value || 0;
              storeys.push({ name, elevation });
              console.log(`  - Storey: ${name} at elevation ${elevation}`);
            }
          }
        } catch (e) {
          console.log('⚠️ getAllPropertiesOfType failed, trying alternative method:', e);
        }
      }

      // Method 2: Try to iterate through model items
      if (storeys.length === 0 && model.items && Array.isArray(model.items)) {
        console.log(`📋 Iterating through ${model.items.length} model items to find storeys...`);
        let checkedCount = 0;
        const maxChecks = 100;

        for (const item of model.items) {
          if (checkedCount >= maxChecks) break;

          try {
            let ids: number[] = [];
            if (item.ids) {
              if (Array.isArray(item.ids)) {
                ids = item.ids;
              } else if (item.ids instanceof Set) {
                ids = Array.from(item.ids);
              } else if (item.ids instanceof Map) {
                ids = Array.from(item.ids.keys());
              }
            }

            for (const id of ids.slice(0, 5)) {
              if (checkedCount >= maxChecks) break;
              if (processedIds.has(id)) continue;
              processedIds.add(id);
              checkedCount++;

              try {
                const props = await model.getProperties(id);
                if (props && (props.type === 'IfcBuildingStorey' || props.type?.includes('Storey') || props.type?.toLowerCase().includes('storey'))) {
                  const name = props.Name?.value || props.Name || props.type || `Storey ${storeys.length + 1}`;
                  const elevation = props.Elevation?.value || props.Elevation || 0;

                  const isDuplicate = storeys.some(s => s.name === name && s.elevation === elevation);
                  if (!isDuplicate) {
                    storeys.push({ name, elevation });
                    console.log(`  ✅ Found storey: ${name} at elevation ${elevation}`);
                  }
                  break;
                }
              } catch (e) {
                // Continue to next ID
              }
            }
          } catch (e) {
            // Continue to next item
          }
        }

        console.log(`📊 Checked ${checkedCount} IDs, found ${storeys.length} storeys`);
      }

      // Method 3: Fallback - create default view if no storeys found
      if (storeys.length === 0) {
        console.log('⚠️ No storeys found, creating default view');
        storeys.push({ name: 'Default View', elevation: 0 });
      }
    } catch (error) {
      console.warn('⚠️ Error extracting storeys:', error);
      if (storeys.length === 0) {
        storeys.push({ name: 'Default View', elevation: 0 });
      }
    }

    console.log(`✅ Extracted ${storeys.length} storeys from model`);
    return storeys;
  }
}
