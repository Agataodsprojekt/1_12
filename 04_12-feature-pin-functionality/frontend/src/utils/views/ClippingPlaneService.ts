import * as THREE from 'three';
import * as OBC from 'openbim-components';
import { getLoadedModels } from '../../lib/thatopen';

/**
 * Clipping Plane Service
 * Single Responsibility: Manage clipping planes for section views
 */
export class ClippingPlaneService {
  private viewer: OBC.Components;
  private scene: THREE.Scene;
  private clippingPlanes: Map<string, THREE.Plane> = new Map();
  private activeClippingPlane: THREE.Plane | null = null;
  private renderer: any = null;

  constructor(viewer: OBC.Components, scene: THREE.Scene) {
    this.viewer = viewer;
    this.scene = scene;
    this.initializeRenderer();
  }

  private initializeRenderer(): void {
    if (this.viewer.renderer) {
      this.renderer = this.viewer.renderer;
      try {
        if (this.renderer.get && typeof this.renderer.get === 'function') {
          const threeRenderer = this.renderer.get();
          if (threeRenderer && threeRenderer.localClippingEnabled !== undefined) {
            threeRenderer.localClippingEnabled = true;
            console.log('✅ Enabled local clipping in renderer');
          }
        } else if ((this.renderer as any).domElement) {
          const threeRenderer = (this.renderer as any).domElement?.renderer;
          if (threeRenderer && threeRenderer.localClippingEnabled !== undefined) {
            threeRenderer.localClippingEnabled = true;
            console.log('✅ Enabled local clipping in renderer (via domElement)');
          }
        }
      } catch (e) {
        console.warn('⚠️ Could not enable local clipping:', e);
      }
    }
  }

  /**
   * Create and apply clipping plane for a view
   */
  applyClippingPlane(viewId: string, normal: THREE.Vector3, point: THREE.Vector3): void {
    try {
      const normalizedNormal = normal.clone().normalize();
      const planeConstant = -point.dot(normalizedNormal);
      const plane = new THREE.Plane(normalizedNormal, planeConstant);
      
      this.clippingPlanes.set(viewId, plane);
      this.activeClippingPlane = plane;
      
      // Apply to all meshes in the scene
      this.applyToMeshes(plane);
      
      console.log(`✅ Applied clipping plane for view: ${viewId}`);
    } catch (error) {
      console.error('❌ Error applying clipping plane:', error);
    }
  }

  /**
   * Remove clipping plane for a view
   */
  removeClippingPlane(viewId: string): void {
    const plane = this.clippingPlanes.get(viewId);
    if (plane) {
      this.clippingPlanes.delete(viewId);
      
      if (this.activeClippingPlane === plane) {
        this.activeClippingPlane = null;
      }
      
      // Remove from all meshes
      this.removeFromMeshes(plane);
      
      console.log(`✅ Removed clipping plane for view: ${viewId}`);
    }
  }

  /**
   * Get active clipping plane
   */
  getActiveClippingPlane(): THREE.Plane | null {
    return this.activeClippingPlane;
  }

  /**
   * Apply clipping plane to all meshes in the scene
   */
  private applyToMeshes(plane: THREE.Plane): void {
    if (!this.scene) return;

    // Get all meshes from loaded models (including InstancedMesh)
    const loadedModels = getLoadedModels();
    const allMeshes: (THREE.Mesh | THREE.InstancedMesh)[] = [];

    for (const model of loadedModels) {
      if (model.items && Array.isArray(model.items)) {
        for (const item of model.items) {
          if (item.mesh) {
            if (item.mesh instanceof THREE.Mesh || item.mesh instanceof THREE.InstancedMesh) {
              allMeshes.push(item.mesh);
            }
          }
        }
      }
    }

    // Also try to get meshes directly from scene
    try {
      this.scene.traverse((object: THREE.Object3D) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.InstancedMesh) {
          if (!allMeshes.includes(object)) {
            allMeshes.push(object);
          }
        }
      });
    } catch (e) {
      console.warn('⚠️ Could not traverse scene for meshes:', e);
    }

    console.log(`📦 Found ${allMeshes.length} meshes to apply clipping`);

    let appliedCount = 0;
    let instancedCount = 0;
    let regularCount = 0;
    let noMaterialCount = 0;

    allMeshes.forEach((mesh) => {
      if (!mesh.material) {
        noMaterialCount++;
        return;
      }

      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      
      materials.forEach((material: THREE.Material) => {
        if (!(material instanceof THREE.Material)) {
          return;
        }

        // Initialize clipping planes array if needed
        if (!material.clippingPlanes) {
          material.clippingPlanes = [];
        }

        // Remove any existing clipping planes with similar normal
        // This prevents duplicates when applying the same plane multiple times
        material.clippingPlanes = material.clippingPlanes.filter((p: THREE.Plane) => {
          // Keep planes that are significantly different (different normal direction)
          const dotProduct = p.normal.dot(plane.normal);
          return !(Math.abs(dotProduct - 1) < 0.01 || Math.abs(dotProduct + 1) < 0.01);
        });

        // Add the new clipping plane (clone it to avoid reference issues)
        const planeClone = new THREE.Plane(plane.normal.clone(), plane.constant);
        material.clippingPlanes.push(planeClone);
        material.clipIntersection = false; // Clip everything on the negative side of plane
        material.needsUpdate = true;
        appliedCount++;

        if (mesh instanceof THREE.InstancedMesh) {
          instancedCount++;
        } else {
          regularCount++;
        }
      });
    });

    // Set global clipping plane in renderer if available
    if (this.renderer) {
      try {
        const threeRenderer = this.renderer.get ? this.renderer.get() : this.renderer;
        if (threeRenderer && threeRenderer.clippingPlanes) {
          threeRenderer.clippingPlanes = [plane];
          console.log('✅ Set global clipping plane in renderer:', plane);
        }
      } catch (e) {
        console.warn('⚠️ Could not set global clipping plane:', e);
      }
    }

    // Ensure localClippingEnabled is true
    try {
      const threeRenderer = this.renderer?.get ? this.renderer.get() : this.renderer;
      if (threeRenderer && threeRenderer.localClippingEnabled !== undefined) {
        threeRenderer.localClippingEnabled = true;
        console.log('✅ Ensured localClippingEnabled is true');
      }
    } catch (e) {
      console.warn('⚠️ Could not ensure localClippingEnabled:', e);
    }

    console.log(`✅ Applied clipping plane to ${appliedCount} materials (${instancedCount} InstancedMesh, ${regularCount} Mesh, ${noMaterialCount} no material)`);
    
    if (appliedCount === 0) {
      console.warn('⚠️ WARNING: No materials found to apply clipping plane!');
      console.warn('   This might mean meshes don\'t have materials or clipping is not supported.');
    }
  }

  /**
   * Remove clipping plane from all meshes
   */
  private removeFromMeshes(plane: THREE.Plane): void {
    if (!this.scene) return;

    // Get all meshes from loaded models (including InstancedMesh)
    const loadedModels = getLoadedModels();
    const allMeshes: (THREE.Mesh | THREE.InstancedMesh)[] = [];

    for (const model of loadedModels) {
      if (model.items && Array.isArray(model.items)) {
        for (const item of model.items) {
          if (item.mesh) {
            if (item.mesh instanceof THREE.Mesh || item.mesh instanceof THREE.InstancedMesh) {
              allMeshes.push(item.mesh);
            }
          }
        }
      }
    }

    // Also try to get meshes directly from scene
    try {
      this.scene.traverse((object: THREE.Object3D) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.InstancedMesh) {
          if (!allMeshes.includes(object)) {
            allMeshes.push(object);
          }
        }
      });
    } catch (e) {
      console.warn('⚠️ Could not traverse scene for meshes:', e);
    }

    // Remove clipping plane from all meshes
    let removedCount = 0;
    for (const mesh of allMeshes) {
      if (mesh.material) {
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const material of materials) {
          if (material instanceof THREE.Material && material.clippingPlanes) {
            const beforeCount = material.clippingPlanes.length;
            // Remove planes with similar normal and constant (not by reference!)
            material.clippingPlanes = material.clippingPlanes.filter((p: THREE.Plane) => {
              // Remove planes with similar normal and constant
              const dotProduct = p.normal.dot(plane.normal);
              const constantDiff = Math.abs(p.constant - plane.constant);
              // Keep planes that are different (different normal direction OR different constant)
              return !(Math.abs(dotProduct - 1) < 0.01 && constantDiff < 0.1);
            });
            if (material.clippingPlanes.length < beforeCount) {
              material.needsUpdate = true;
              removedCount++;
            }
          }
        }
      }
    }

    // Clear global clipping planes in renderer
    try {
      if (this.renderer && this.renderer.get) {
        const threeRenderer = this.renderer.get();
        if (threeRenderer && threeRenderer.clippingPlanes) {
          threeRenderer.clippingPlanes = [];
        }
      }
    } catch (e) {
      console.warn('⚠️ Could not clear global clipping planes:', e);
    }

    console.log(`✅ Removed clipping plane from ${removedCount} materials in ${allMeshes.length} meshes`);
  }
}
