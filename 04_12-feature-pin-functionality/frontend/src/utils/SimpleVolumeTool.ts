import * as THREE from "three";

interface VolumeMeasurement {
  elementId: string;
  volume: number;
  getValue: () => Promise<number>;
}

/**
 * SimpleVolumeTool - calculates volume of selected IFC elements
 * This replaces missing volume values in IFC properties
 */
export class SimpleVolumeTool {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private measurements: Map<string, VolumeMeasurement> = new Map();
  
  public enabled: boolean = false;
  public visible: boolean = true;
  public color: THREE.Color = new THREE.Color("#494cb6");
  public units: string = "m³";
  public rounding: number = 2;
  public mode: string = "volume";
  public modes: string[] = ["volume"];
  public unitsList: string[] = ["m³", "cm³", "ft³", "in³", "L", "mL"];
  
  public list: {
    clear: () => void;
    [Symbol.iterator]: () => Generator<VolumeMeasurement>;
  };

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;
    
    // Create list iterator
    this.list = {
      clear: () => {
        this.measurements.clear();
      },
      [Symbol.iterator]: function* () {
        for (const measurement of this.measurements.values()) {
          yield measurement;
        }
      }.bind(this)
    };
  }

  /**
   * Calculate volume for selected elements
   * This is called when elements are selected via highlighter
   * First tries to get NetVolume from IFC properties, then falls back to geometry calculation
   */
  public async calculateVolumeForSelection(
    selection: { [fragmentId: string]: Set<number> },
    loadedModels: any[]
  ): Promise<number> {
    let totalVolume = 0;

    try {
      // Iterate through all fragments in selection
      for (const [fragmentId, expressIDs] of Object.entries(selection)) {
        // Find the fragment in loaded models
        for (const model of loadedModels) {
          if (!model.items || !Array.isArray(model.items)) continue;

          for (const item of model.items) {
            const fragment = (item as any).fragment || item;
            if (!fragment || fragment.id !== fragmentId) continue;

            const mesh = fragment.mesh;
            if (!mesh) continue;

            // Calculate volume for each selected expressID
            for (const expressID of expressIDs) {
              const volume = await this.calculateElementVolume(mesh, expressID, model);
              if (volume > 0) {
                totalVolume += volume;
                // Store measurement
                this.measurements.set(expressID.toString(), {
                  elementId: expressID.toString(),
                  volume: volume,
                  getValue: async () => this.convertVolume(volume)
                });
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Error calculating volume:', error);
    }

    return this.convertVolume(totalVolume);
  }

  /**
   * Calculate volume from geometry for a specific element
   * First tries to get NetVolume from IFC properties, then falls back to geometry calculation
   */
  private async calculateElementVolume(
    mesh: THREE.Object3D, 
    expressID: number,
    model: any
  ): Promise<number> {
    try {
      // Method 1: Try to get NetVolume from IFC properties (most accurate)
      if (model && typeof model.getProperties === 'function') {
        try {
          const properties = await model.getProperties(expressID);
          if (properties) {
            // Check BaseQuantities for NetVolume
            const baseQuantities = properties.BaseQuantities || properties.IFCELEMENTQUANTITY;
            if (baseQuantities && baseQuantities.NetVolume) {
              const netVolume = baseQuantities.NetVolume.value || baseQuantities.NetVolume;
              if (typeof netVolume === 'number' && netVolume > 0) {
                console.log(`📦 Using NetVolume from IFC properties for element ${expressID}: ${netVolume} m³`);
                return netVolume; // Already in m³
              }
            }
            
            // Alternative: Check for Volume property
            const volumeProp = properties.Volume || properties.volume;
            if (volumeProp) {
              const volume = volumeProp.value || volumeProp;
              if (typeof volume === 'number' && volume > 0) {
                console.log(`📦 Using Volume from IFC properties for element ${expressID}: ${volume} m³`);
                return volume;
              }
            }
          }
        } catch (e) {
          console.log(`⚠️ Could not get properties for element ${expressID}, using geometry calculation:`, e);
        }
      }

      // Method 2: Calculate from geometry using triangulation (more accurate than bounding box)
      if (mesh instanceof THREE.InstancedMesh) {
        return await this.calculateInstancedMeshVolume(mesh, expressID);
      } else if (mesh instanceof THREE.Mesh) {
        return await this.calculateMeshVolume(mesh);
      }
    } catch (error) {
      console.warn(`⚠️ Could not calculate volume for element ${expressID}:`, error);
    }
    return 0;
  }

  /**
   * Calculate volume from InstancedMesh for a specific instance
   */
  private async calculateInstancedMeshVolume(mesh: THREE.InstancedMesh, expressID: number): Promise<number> {
    try {
      // Get fragment IDs to find instance index
      const fragment = (mesh as any).fragment;
      if (!fragment || !fragment.ids) {
        console.warn(`⚠️ No fragment or ids for expressID ${expressID}`);
        return 0;
      }

      // Normalize fragment.ids to array
      let fragmentIds: number[] = [];
      if (Array.isArray(fragment.ids)) {
        fragmentIds = fragment.ids;
      } else if (fragment.ids instanceof Set) {
        fragmentIds = Array.from(fragment.ids);
      } else if (fragment.ids instanceof Map) {
        fragmentIds = Array.from(fragment.ids.keys());
      } else if (typeof fragment.ids === 'object') {
        fragmentIds = Object.keys(fragment.ids).map(Number);
      }

      const instanceIndex = fragmentIds.indexOf(expressID);
      if (instanceIndex === -1) {
        console.warn(`⚠️ ExpressID ${expressID} not found in fragment ids`);
        return 0;
      }

      // Get geometry
      const geometry = mesh.geometry;
      if (!geometry) {
        console.warn(`⚠️ No geometry for mesh`);
        return 0;
      }

      // Get transformation matrix for this instance
      const matrix = new THREE.Matrix4();
      mesh.getMatrixAt(instanceIndex, matrix);

      // Calculate volume from geometry using triangulation
      const volume = this.calculateVolumeFromTriangles(geometry, matrix);
      console.log(`📦 Calculated volume from geometry for element ${expressID}: ${volume} m³`);
      return volume;
    } catch (error) {
      console.warn(`⚠️ Error calculating InstancedMesh volume:`, error);
      return 0;
    }
  }

  /**
   * Calculate volume from regular Mesh
   */
  private async calculateMeshVolume(mesh: THREE.Mesh): Promise<number> {
    try {
      const geometry = mesh.geometry;
      if (!geometry) return 0;

      const matrix = mesh.matrixWorld;
      return this.calculateVolumeFromTriangles(geometry, matrix);
    } catch (error) {
      console.warn(`⚠️ Error calculating Mesh volume:`, error);
      return 0;
    }
  }

  /**
   * Calculate volume from geometry using triangle mesh
   * More accurate than bounding box for complex shapes (especially hollow sections)
   */
  private calculateVolumeFromTriangles(
    geometry: THREE.BufferGeometry, 
    transform: THREE.Matrix4
  ): number {
    try {
      const position = geometry.attributes.position;
      if (!position || position.count < 3) {
        console.warn('⚠️ Not enough vertices for volume calculation, falling back to bounding box');
        return this.calculateVolumeFromBoundingBox(geometry, transform);
      }

      const indices = geometry.index?.array || null;
      const positions = position.array;
      
      let volume = 0;

      if (indices) {
        // Indexed geometry
        for (let i = 0; i < indices.length; i += 3) {
          const i0 = indices[i] * 3;
          const i1 = indices[i + 1] * 3;
          const i2 = indices[i + 2] * 3;

          const v0 = new THREE.Vector3(positions[i0], positions[i0 + 1], positions[i0 + 2]);
          const v1 = new THREE.Vector3(positions[i1], positions[i1 + 1], positions[i1 + 2]);
          const v2 = new THREE.Vector3(positions[i2], positions[i2 + 1], positions[i2 + 2]);

          // Apply transform
          v0.applyMatrix4(transform);
          v1.applyMatrix4(transform);
          v2.applyMatrix4(transform);

          // Calculate signed volume of tetrahedron (origin, v0, v1, v2)
          // This gives the volume of the mesh more accurately than bounding box
          const signedVolume = v0.dot(v1.cross(v2)) / 6.0;
          volume += Math.abs(signedVolume);
        }
      } else {
        // Non-indexed geometry
        for (let i = 0; i < positions.length; i += 9) {
          const v0 = new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2]);
          const v1 = new THREE.Vector3(positions[i + 3], positions[i + 4], positions[i + 5]);
          const v2 = new THREE.Vector3(positions[i + 6], positions[i + 7], positions[i + 8]);

          // Apply transform
          v0.applyMatrix4(transform);
          v1.applyMatrix4(transform);
          v2.applyMatrix4(transform);

          // Calculate signed volume
          const signedVolume = v0.dot(v1.cross(v2)) / 6.0;
          volume += Math.abs(signedVolume);
        }
      }

      if (volume > 0) {
        console.log(`📦 Calculated volume from triangles: ${volume.toFixed(6)} m³`);
        return volume;
      } else {
        console.warn('⚠️ Volume from triangles is 0, falling back to bounding box');
        return this.calculateVolumeFromBoundingBox(geometry, transform);
      }
    } catch (error) {
      console.warn(`⚠️ Error calculating volume from triangles, falling back to bounding box:`, error);
      // Fallback to bounding box
      return this.calculateVolumeFromBoundingBox(geometry, transform);
    }
  }

  /**
   * Calculate volume from bounding box (fallback method)
   * Less accurate but faster - gives volume of bounding box, not actual geometry
   */
  private calculateVolumeFromBoundingBox(
    geometry: THREE.BufferGeometry, 
    transform: THREE.Matrix4
  ): number {
    try {
      geometry.computeBoundingBox();
      if (!geometry.boundingBox) return 0;

      const box = geometry.boundingBox.clone();
      box.applyMatrix4(transform);

      const size = box.getSize(new THREE.Vector3());
      const volume = size.x * size.y * size.z;
      
      console.log(`📦 Calculated volume from bounding box: ${volume.toFixed(6)} m³ (less accurate - bounding box volume)`);
      return volume;
    } catch (error) {
      console.warn(`⚠️ Error calculating volume from bounding box:`, error);
      return 0;
    }
  }

  /**
   * Get volume for a specific element
   */
  public getVolumeForElement(elementId: string): number | null {
    const measurement = this.measurements.get(elementId);
    return measurement ? this.convertVolume(measurement.volume) : null;
  }

  /**
   * Clear all measurements
   */
  public clear(): void {
    this.measurements.clear();
  }

  // Placeholder methods for compatibility with OBC.VolumeMeasurement interface
  public async create(): Promise<void> {
    // Not used - volume is calculated from selection
    console.log('📦 Volume measurement: Select elements to calculate volume');
  }

  public async endCreation(): Promise<void> {
    // Not used
  }

  public delete(): void {
    // Not used - use clear() instead
    this.clear();
  }

  private convertVolume(volumeInM3: number): number {
    switch (this.units) {
      case "cm³":
        return volumeInM3 * 1000000;
      case "ft³":
        return volumeInM3 * 35.3147;
      case "in³":
        return volumeInM3 * 61023.7;
      case "L":
        return volumeInM3 * 1000;
      case "mL":
        return volumeInM3 * 1000000;
      default: // m³
        return volumeInM3;
    }
  }
}

