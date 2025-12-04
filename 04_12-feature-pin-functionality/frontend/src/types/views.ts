import * as THREE from 'three';

/**
 * Types and interfaces for Views feature
 */

export type ViewType = 'storey' | 'elevation' | 'section';

export interface View {
  id: string;
  name: string;
  type: ViewType;
  world?: any; // OBC.World if available
  camera?: THREE.Camera;
  active?: boolean;
  // Properties for section views
  normal?: THREE.Vector3;      // Normal vector of the section plane
  point?: THREE.Vector3;        // Point on the section plane
  range?: number;               // Range/distance of the section view (default: 10)
  helpersVisible?: boolean;     // Whether to show visual helpers (default: false)
}

export interface SectionViewOptions {
  name?: string;
  range?: number;
  helpersVisible?: boolean;
  fromScissors?: boolean;
  scissorsPoint1?: THREE.Vector3;
  scissorsPoint2?: THREE.Vector3;
}

export interface StoreyInfo {
  name: string;
  elevation: number;
}

export interface CameraState {
  position: THREE.Vector3;
  target: THREE.Vector3;
}
