import * as THREE from 'three';
import * as OBC from 'openbim-components';
import { CameraState } from '../../types/views';

/**
 * Camera Manager
 * Single Responsibility: Manage camera position and state
 */
export class CameraManager {
  private viewer: OBC.Components;
  private camera: THREE.Camera;
  private originalCameraState?: CameraState;

  constructor(viewer: OBC.Components, camera: THREE.Camera) {
    this.viewer = viewer;
    this.camera = camera;
  }

  /**
   * Save current camera state
   */
  saveState(): void {
    try {
      const cameraComponent = this.viewer.camera as any;
      if (cameraComponent && cameraComponent.get && cameraComponent.controls) {
        const camera = cameraComponent.get();
        const controls = cameraComponent.controls;
        
        if (camera && controls) {
          this.originalCameraState = {
            position: camera.position.clone(),
            target: controls.target ? controls.target.clone() : new THREE.Vector3()
          };
          console.log('💾 Saved current camera state');
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not save camera state:', error);
    }
  }

  /**
   * Get saved camera state
   */
  getSavedState(): CameraState | undefined {
    return this.originalCameraState;
  }

  /**
   * Set camera position and target
   */
  setCamera(position: THREE.Vector3, target: THREE.Vector3, animate: boolean = false): boolean {
    try {
      const cameraComponent = this.viewer.camera as any;
      if (cameraComponent && cameraComponent.get) {
        const camera = cameraComponent.get();
        const controls = cameraComponent.controls;
        
        if (!camera || !controls) {
          console.warn('⚠️ Camera or controls not available');
          return false;
        }
        
        // Set camera position
        camera.position.copy(position);
        
        // Set camera target
        if (controls.setLookAt) {
          controls.setLookAt(
            position.x, position.y, position.z,
            target.x, target.y, target.z,
            animate
          );
        } else if (controls.target) {
          controls.target.copy(target);
          camera.lookAt(target);
        }
        
        // Update controls
        if (controls.update) {
          controls.update();
        }
        
        // Update camera projection matrix
        if (camera.updateProjectionMatrix) {
          camera.updateProjectionMatrix();
        }
        
        return true;
      }
    } catch (error) {
      console.error('❌ Could not set camera position:', error);
      return false;
    }
    return false;
  }

  /**
   * Restore saved camera state
   */
  restoreState(): boolean {
    if (!this.originalCameraState) {
      return false;
    }
    
    return this.setCamera(
      this.originalCameraState.position,
      this.originalCameraState.target
    );
  }
}
