import * as THREE from 'three';
import { View } from '../../types/views';

/**
 * Section Helper Service
 * Single Responsibility: Manage visual helpers (green planes) for section views
 */
export class SectionHelperService {
  private scene: THREE.Scene;
  private sectionHelpers: Map<string, THREE.Object3D> = new Map();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Create visual helper for section view
   */
  createHelper(
    viewId: string,
    view: View,
    normal: THREE.Vector3,
    point: THREE.Vector3,
    range: number
  ): void {
    try {
      const isVisible = view?.helpersVisible !== false;
      
      // Calculate plane size
      const planeSize = this.calculatePlaneSize(view, range);
      
      // Calculate helper position (midpoint for scissors, provided point for others)
      const helperPosition = this.calculateHelperPosition(view, point);
      
      // Log detailed position info
      if ((view as any).fromScissors) {
        const p1 = (view as any).scissorsPoint1;
        const p2 = (view as any).scissorsPoint2;
        const calculatedMidpoint = p1 && p2 
          ? new THREE.Vector3().addVectors(
              p1 instanceof THREE.Vector3 ? p1 : new THREE.Vector3(p1.x, p1.y, p1.z),
              p2 instanceof THREE.Vector3 ? p2 : new THREE.Vector3(p2.x, p2.y, p2.z)
            ).multiplyScalar(0.5)
          : null;
        
        console.log('📍 Helper position calculated:', {
          point1: p1 ? { x: p1.x || p1.x, y: p1.y || p1.y, z: p1.z || p1.z } : null,
          point2: p2 ? { x: p2.x || p2.x, y: p2.y || p2.y, z: p2.z || p2.z } : null,
          calculatedMidpoint: calculatedMidpoint ? { x: calculatedMidpoint.x, y: calculatedMidpoint.y, z: calculatedMidpoint.z } : null,
          helperPosition: { x: helperPosition.x, y: helperPosition.y, z: helperPosition.z },
          originalPoint: { x: point.x, y: point.y, z: point.z }
        });
      } else {
        console.log('📍 Helper position calculated:', {
          helperPosition: { x: helperPosition.x, y: helperPosition.y, z: helperPosition.z },
          originalPoint: { x: point.x, y: point.y, z: point.z }
        });
      }
      
      // Create custom mesh instead of PlaneHelper for full control over positioning
      const normalizedNormal = normal.clone().normalize();
      
      console.log('✂️ Creating custom plane helper:', {
        normal: { x: normalizedNormal.x, y: normalizedNormal.y, z: normalizedNormal.z },
        helperPosition: { x: helperPosition.x, y: helperPosition.y, z: helperPosition.z },
        planeSize: planeSize,
        note: 'Creating custom mesh positioned at midpoint (user points)'
      });
      
      // Create geometry and material
      const geometry = new THREE.PlaneGeometry(planeSize, planeSize);
      const material = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5,
        depthWrite: false
      });
      
      // Create mesh
      const planeMesh = new THREE.Mesh(geometry, material);
      
      // Create helper group to hold the mesh
      const helper = new THREE.Group();
      helper.add(planeMesh);
      
      // Position helper at midpoint - this is where the visual plane will be displayed
      helper.position.copy(helperPosition);
      helper.scale.set(1, 1, 1);
      helper.visible = isVisible;
      helper.matrixAutoUpdate = true;
      helper.renderOrder = 1000;
      
      // Configure helper with proper orientation - use the same normal as clipping plane
      // This ensures the helper plane has exactly the same orientation as the cutting plane
      // First, set base orientation to match the cutting plane exactly
      this.configureHelper(helper, normalizedNormal, isVisible);
      
      // For scissors tool, we need to ensure the plane is oriented correctly
      // The plane should be perpendicular to the normal (same as cutting plane)
      // Then rotate around normal so diagonal aligns with user's line
      if ((view as any).fromScissors) {
        const scissorsPoint1 = (view as any).scissorsPoint1;
        const scissorsPoint2 = (view as any).scissorsPoint2;
        if (scissorsPoint1 && scissorsPoint2) {
          try {
            // Convert to Vector3 if needed
            const p1 = scissorsPoint1 instanceof THREE.Vector3 
              ? scissorsPoint1 
              : new THREE.Vector3(scissorsPoint1.x, scissorsPoint1.y, scissorsPoint1.z);
            const p2 = scissorsPoint2 instanceof THREE.Vector3 
              ? scissorsPoint2 
              : new THREE.Vector3(scissorsPoint2.x, scissorsPoint2.y, scissorsPoint2.z);
            // Apply additional rotation around normal to align diagonal with user's line
            // This rotation is applied AFTER the base orientation, so it doesn't change the plane's angle
            this.rotateHelperForDiagonal(helper, normalizedNormal, p1, p2);
          } catch (error) {
            console.warn('⚠️ Failed to rotate helper for diagonal alignment:', error);
          }
        }
      }
      
      // Add to scene
      this.scene.add(helper);
      
      // Ensure position is set to midpoint after adding to scene
      helper.position.copy(helperPosition);
      helper.scale.set(1, 1, 1);
      helper.updateMatrixWorld(true);
      
      // Force position and scale again after matrix update (PlaneHelper may reset it)
      helper.position.copy(helperPosition);
      helper.scale.set(1, 1, 1);
      helper.updateMatrixWorld(true);
      
      // Verify helper position and orientation after adding to scene
      // Get helper's world-space normal (should match cutting plane normal)
      const helperWorldZ = new THREE.Vector3(0, 0, 1);
      helperWorldZ.applyQuaternion(helper.quaternion);
      helperWorldZ.normalize();
      
      const normalMatch = Math.abs(helperWorldZ.dot(normalizedNormal));
      
      console.log('✅ Helper added to scene:', {
        helperPosition: { x: helper.position.x, y: helper.position.y, z: helper.position.z },
        expectedMidpoint: { x: helperPosition.x, y: helperPosition.y, z: helperPosition.z },
        planeNormal: { x: normalizedNormal.x, y: normalizedNormal.y, z: normalizedNormal.z },
        helperWorldZ: { x: helperWorldZ.x, y: helperWorldZ.y, z: helperWorldZ.z },
        normalMatch: normalMatch,
        orientationMatches: normalMatch > 0.99,
        helperQuaternion: { x: helper.quaternion.x, y: helper.quaternion.y, z: helper.quaternion.z, w: helper.quaternion.w },
        helperScale: { x: helper.scale.x, y: helper.scale.y, z: helper.scale.z },
        helperVisible: helper.visible,
        planeSize: planeSize,
        note: 'Custom mesh positioned at midpoint (user points), orientation should match cutting plane'
      });
      
      // Store helper
      this.sectionHelpers.set(viewId, helper);
      
      console.log(`✅ Created section helper for view: ${viewId}, visible: ${isVisible}, size: ${planeSize}`);
    } catch (error) {
      console.warn('⚠️ Could not create section helper:', error);
    }
  }

  /**
   * Calculate plane size based on view type
   */
  private calculatePlaneSize(view: View, range: number): number {
    let planeSize = range * 2;
    
    // For scissors tool, use the length of the line segment as the square side
    // This way the square's side = user's line length, and diagonal = line length * sqrt(2)
    if ((view as any).fromScissors) {
      const scissorsPoint1 = (view as any).scissorsPoint1;
      const scissorsPoint2 = (view as any).scissorsPoint2;
      
      if (scissorsPoint1 && scissorsPoint2) {
        const point1 = scissorsPoint1 instanceof THREE.Vector3 
          ? scissorsPoint1 
          : new THREE.Vector3(scissorsPoint1.x, scissorsPoint1.y, scissorsPoint1.z);
        const point2 = scissorsPoint2 instanceof THREE.Vector3 
          ? scissorsPoint2 
          : new THREE.Vector3(scissorsPoint2.x, scissorsPoint2.y, scissorsPoint2.z);
        
        // Use the line length directly as the square side
        // This means: square side = line length, diagonal = line length * sqrt(2)
        const lineLength = point1.distanceTo(point2);
        planeSize = Math.max(lineLength, 0.1); // Minimum 0.1 to prevent errors
        
        console.log('📐 Plane size calculated for scissors:', {
          point1: { x: point1.x, y: point1.y, z: point1.z },
          point2: { x: point2.x, y: point2.y, z: point2.z },
          lineLength: lineLength,
          planeSize: planeSize,
          diagonalLength: lineLength * Math.sqrt(2),
          note: 'Square side = line length, so diagonal = line length * sqrt(2)'
        });
      }
    } else {
      // For non-scissors views, apply limits
      planeSize = Math.max(planeSize, 20);
      planeSize = Math.min(planeSize, 200);
    }
    
    return planeSize;
  }

  /**
   * Calculate helper position
   */
  private calculateHelperPosition(view: View, point: THREE.Vector3): THREE.Vector3 {
    if ((view as any).fromScissors) {
      const scissorsPoint1 = (view as any).scissorsPoint1;
      const scissorsPoint2 = (view as any).scissorsPoint2;
      
      if (scissorsPoint1 && scissorsPoint2) {
        const point1 = scissorsPoint1 instanceof THREE.Vector3 
          ? scissorsPoint1 
          : new THREE.Vector3(scissorsPoint1.x, scissorsPoint1.y, scissorsPoint1.z);
        const point2 = scissorsPoint2 instanceof THREE.Vector3 
          ? scissorsPoint2 
          : new THREE.Vector3(scissorsPoint2.x, scissorsPoint2.y, scissorsPoint2.z);
        
        // Return midpoint
        return new THREE.Vector3().addVectors(point1, point2).multiplyScalar(0.5);
      }
    }
    
    return point;
  }

  /**
   * Rotate helper around normal so that diagonal aligns with user's line
   * This is applied AFTER the base orientation is set to match the cutting plane
   */
  private rotateHelperForDiagonal(
    helper: THREE.Object3D,
    normal: THREE.Vector3,
    point1: THREE.Vector3,
    point2: THREE.Vector3
  ): void {
    // The line between point1 and point2 should be a diagonal of the square
    const lineDirection = new THREE.Vector3().subVectors(point2, point1).normalize();
    
    // Project line direction onto the plane (remove component along normal)
    const lineDotNormal = lineDirection.dot(normal);
    const lineOnPlane = lineDirection.clone().sub(normal.clone().multiplyScalar(lineDotNormal)).normalize();
    
    // Get the current X axis of the helper (after base orientation)
    const localX = new THREE.Vector3(1, 0, 0);
    localX.applyQuaternion(helper.quaternion);
    
    // Project localX onto the plane (remove component along normal)
    const localXOnPlane = localX.clone().sub(normal.clone().multiplyScalar(localX.dot(normal))).normalize();
    
    // Calculate angle between localXOnPlane and lineOnPlane
    const dotProduct = localXOnPlane.dot(lineOnPlane);
    const crossProduct = localXOnPlane.cross(lineOnPlane).dot(normal);
    let angle = Math.atan2(crossProduct, dotProduct);
    
    // Adjust angle so diagonal (45 degrees) aligns with line
    // Diagonal in square is at 45 degrees from X axis
    angle -= Math.PI / 4;
    
    // Normalize angle to [-PI, PI] range
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    
    // Create rotation quaternion around normal and apply to existing quaternion
    const rotationQuaternion = new THREE.Quaternion().setFromAxisAngle(normal, angle);
    helper.quaternion.multiply(rotationQuaternion);
    
    console.log('🔄 Rotated helper for diagonal alignment:', {
      normal: { x: normal.x, y: normal.y, z: normal.z },
      lineDirection: { x: lineDirection.x, y: lineDirection.y, z: lineDirection.z },
      lineOnPlane: { x: lineOnPlane.x, y: lineOnPlane.y, z: lineOnPlane.z },
      localXOnPlane: { x: localXOnPlane.x, y: localXOnPlane.y, z: localXOnPlane.z },
      rotationAngle: angle * 180 / Math.PI,
      note: 'Applied rotation around normal to align diagonal with user line'
    });
  }

  /**
   * Configure helper orientation and material
   * Orients the plane to be perpendicular to the normal (same as cutting plane)
   */
  private configureHelper(
    helper: THREE.Object3D,
    normal: THREE.Vector3,
    isVisible: boolean
  ): void {
    helper.scale.set(1, 1, 1);
    helper.visible = isVisible;
    helper.matrixAutoUpdate = true;
    helper.renderOrder = 1000;
    
    // Orient helper to be perpendicular to normal
    // PlaneGeometry is in XY plane with Z as normal, so we rotate Z to align with normal
    const defaultZ = new THREE.Vector3(0, 0, 1);
    const quaternion = new THREE.Quaternion();
    
    if (Math.abs(normal.dot(defaultZ)) > 0.99) {
      // Normal is almost parallel to Z, no rotation needed
      quaternion.identity();
    } else {
      // Rotate Z axis to align with normal
      quaternion.setFromUnitVectors(defaultZ, normal);
    }
    
    helper.quaternion.copy(quaternion);
    
    // Configure material - get mesh from helper children
    const mesh = helper.children[0] as THREE.Mesh;
    if (mesh && mesh.material) {
      const material = mesh.material as THREE.MeshBasicMaterial;
      material.depthWrite = false;
      material.transparent = true;
      material.opacity = 0.5;
      material.side = THREE.DoubleSide;
      material.needsUpdate = true;
    }
  }


  /**
   * Toggle helper visibility
   */
  toggleVisibility(viewId: string): boolean {
    const helper = this.sectionHelpers.get(viewId);
    if (helper) {
      helper.visible = !helper.visible;
      return helper.visible;
    }
    return false;
  }

  /**
   * Check if helper is visible
   */
  isVisible(viewId: string): boolean {
    const helper = this.sectionHelpers.get(viewId);
    return helper ? helper.visible : false;
  }

  /**
   * Remove helper
   */
  removeHelper(viewId: string): void {
    const helper = this.sectionHelpers.get(viewId);
    if (helper) {
      this.scene.remove(helper);
      
      // Dispose geometry and material
      try {
        const mesh = (helper as any).planeMesh || (helper as any).mesh || (helper.children?.[0]);
        if (mesh) {
          if (mesh.geometry) {
            mesh.geometry.dispose();
          }
          if (mesh.material) {
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            materials.forEach((mat: THREE.Material) => {
              if (mat instanceof THREE.Material) {
                mat.dispose();
              }
            });
          }
        }
      } catch (e) {
        console.warn('⚠️ Error disposing helper:', e);
      }
      
      this.sectionHelpers.delete(viewId);
      console.log(`🗑️ Removed section helper for view: ${viewId}`);
    }
  }

  /**
   * Get helper by view ID
   */
  getHelper(viewId: string): THREE.Object3D | undefined {
    return this.sectionHelpers.get(viewId);
  }
}
