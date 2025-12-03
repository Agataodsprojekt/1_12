/**
 * Views Feature - 2D Views management for IFC models
 * Supports storeys, elevations, and cross-sections from double-click
 */

import * as OBC from 'openbim-components';
import * as THREE from 'three';
import { getLoadedModels } from '../lib/thatopen';

export interface View {
  id: string;
  name: string;
  type: 'storey' | 'elevation' | 'section';
  world?: any; // OBC.World if available
  camera?: THREE.Camera;
  active?: boolean;
  // Properties for section views
  normal?: THREE.Vector3;      // Normal vector of the section plane
  point?: THREE.Vector3;        // Point on the section plane
  range?: number;               // Range/distance of the section view (default: 10)
  helpersVisible?: boolean;     // Whether to show visual helpers (default: false)
}

export class ViewsManager {
  private viewer: OBC.Components;
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private views: Map<string, View> = new Map();
  private activeViewId: string | null = null;
  private originalCamera?: THREE.Camera;
  private originalCameraPosition?: THREE.Vector3;
  private originalCameraTarget?: THREE.Vector3;
  private viewsComponent: any = null; // OBC.Views if available
  private worldsComponent: any = null; // OBC.Worlds if available
  private raycaster: any = null;
  private sectionHelpers: Map<string, THREE.Object3D> = new Map(); // Visual helpers for sections
  private clippingPlanes: Map<string, THREE.Plane> = new Map(); // Clipping planes for sections
  private activeClippingPlane: THREE.Plane | null = null; // Currently active clipping plane
  private renderer: any = null; // Renderer reference for enabling clipping

  constructor(
    viewer: OBC.Components,
    scene: THREE.Scene,
    camera: THREE.Camera,
    raycaster: any
  ) {
    this.viewer = viewer;
    this.scene = scene;
    this.camera = camera;
    this.raycaster = raycaster;
    
    // Get renderer reference for clipping
    if (viewer.renderer) {
      this.renderer = viewer.renderer;
      // Enable local clipping in renderer
      try {
        if (this.renderer.get && typeof this.renderer.get === 'function') {
          const threeRenderer = this.renderer.get();
          if (threeRenderer && threeRenderer.localClippingEnabled !== undefined) {
            threeRenderer.localClippingEnabled = true;
            console.log('✅ Enabled local clipping in renderer');
          }
        } else if ((this.renderer as any).domElement) {
          // Try to get renderer from domElement
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

    // Try to use OBC.Views if available
    this.initializeViewsComponent();
  }

  private initializeViewsComponent() {
    try {
      // Check if OBC.Views exists
      if ((OBC as any).Views) {
        this.viewsComponent = new (OBC as any).Views(this.viewer);
        console.log('✅ OBC.Views initialized');
      } else {
        console.log('⚠️ OBC.Views not available, using custom implementation');
      }

      // Check if OBC.Worlds exists
      if ((OBC as any).Worlds) {
        this.worldsComponent = new (OBC as any).Worlds(this.viewer);
        console.log('✅ OBC.Worlds initialized');
      } else {
        console.log('⚠️ OBC.Worlds not available, using custom implementation');
      }
    } catch (error) {
      console.warn('⚠️ Error initializing Views/Worlds components:', error);
    }
  }

  /**
   * Create a view from a storey (floor level)
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
        this.views.set(viewId, view);
        return view;
      }

      // Custom implementation: create a top-down view at the storey elevation
      const view: View = {
        id: viewId,
        name: storeyName,
        type: 'storey',
        active: false,
      };

      // Store view camera settings (position and target)
      // For top view, position camera high above, looking down
      // For storey views, position at elevation + offset
      let cameraPosition: THREE.Vector3;
      let cameraTarget: THREE.Vector3;
      
      // Try to get model bounds for better positioning
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
      
      if (storeyName.toLowerCase().includes('top')) {
        // Top view - camera high above, looking straight down at model center
        const height = Math.max(modelSize.x, modelSize.y, modelSize.z) * 1.5;
        cameraPosition = new THREE.Vector3(modelCenter.x, modelCenter.y + height, modelCenter.z);
        cameraTarget = new THREE.Vector3(modelCenter.x, modelCenter.y, modelCenter.z);
      } else {
        // Storey view - camera at elevation + offset, looking at elevation
        const height = Math.max(modelSize.x, modelSize.z) * 1.2;
        cameraPosition = new THREE.Vector3(modelCenter.x, elevation + height, modelCenter.z);
        cameraTarget = new THREE.Vector3(modelCenter.x, elevation, modelCenter.z);
      }
      
      // Store camera settings in view (we'll use these when opening the view)
      (view as any).cameraPosition = cameraPosition;
      (view as any).cameraTarget = cameraTarget;
      
      this.views.set(viewId, view);
      console.log(`✅ Created storey view: ${storeyName} at elevation ${elevation}`);
      return view;
    } catch (error) {
      console.error('❌ Error creating storey view:', error);
      return null;
    }
  }

  /**
   * Create a section view from double-click on a surface
   * This is the old method - kept for backward compatibility
   */
  async createSectionView(
    point: THREE.Vector3,
    normal: THREE.Vector3,
    name?: string
  ): Promise<View | null> {
    // Use the new method with default options
    return this.createSectionViewWithNormal(normal, point, { name });
  }

  /**
   * Create a section view from two points (scissors tool)
   * The plane will be perpendicular to the camera view direction and pass through the line
   */
  async createSectionViewFromPoints(
    point1: THREE.Vector3,
    point2: THREE.Vector3,
    cameraDirection: THREE.Vector3,
    options?: {
      name?: string;
      range?: number;
      helpersVisible?: boolean;
    }
  ): Promise<View | null> {
    try {
      console.log('✂️ Creating section from points:', {
        point1,
        point2,
        cameraDirection
      });
      
      // Calculate the direction of the line (from point1 to point2)
      const lineDirection = new THREE.Vector3().subVectors(point2, point1);
      const lineLength = lineDirection.length();
      lineDirection.normalize();
      
      console.log('   Line direction:', lineDirection, 'length:', lineLength);
      
      // Calculate normal: perpendicular to both line direction and camera direction
      // This creates a plane that cuts along the line and is perpendicular to the view
      let normal = new THREE.Vector3().crossVectors(lineDirection, cameraDirection);
      const normalLength = normal.length();
      
      console.log('   Initial normal:', normal, 'length:', normalLength);
      
      // If normal is zero or too small (line is parallel to camera), use camera up vector
      if (normalLength < 0.001) {
        console.log('   ⚠️ Line parallel to camera, using up vector');
        const cameraUp = new THREE.Vector3(0, 1, 0);
        normal = new THREE.Vector3().crossVectors(lineDirection, cameraUp);
        if (normal.length() < 0.001) {
          // If still zero, use right vector
          const cameraRight = new THREE.Vector3(1, 0, 0);
          normal = new THREE.Vector3().crossVectors(lineDirection, cameraRight);
        }
      }
      
      normal.normalize();
      console.log('   Final normal:', normal);
      
      // Use midpoint of the line as the point on the plane
      const midpoint = new THREE.Vector3().addVectors(point1, point2).multiplyScalar(0.5);
      console.log('   Midpoint:', midpoint);
      
      // Calculate range based on line length - make plane large enough to see the line
      // The plane should extend beyond the line endpoints
      const calculatedRange = options?.range || Math.max(lineLength * 2, 30);
      
      console.log('   Creating section with:', {
        normal,
        midpoint,
        range: calculatedRange,
        lineLength,
        point1,
        point2
      });
      
      // Verify the plane will pass through both points
      // For a plane to pass through a point, the point must satisfy: normal.dot(point - planePoint) = 0
      // So we need to ensure that both points are in the plane defined by normal and midpoint
      const dist1 = Math.abs(normal.dot(new THREE.Vector3().subVectors(point1, midpoint)));
      const dist2 = Math.abs(normal.dot(new THREE.Vector3().subVectors(point2, midpoint)));
      console.log('   Plane verification - dist1 from plane:', dist1, 'dist2 from plane:', dist2);
      
      if (dist1 > 0.1 || dist2 > 0.1) {
        console.warn('   ⚠️ Warning: Plane may not pass through both points! Recalculating normal...');
        // The line direction should be in the plane, so normal should be perpendicular to lineDirection
        // Recalculate normal to ensure it's perpendicular to lineDirection
        const correctedNormal = new THREE.Vector3().crossVectors(lineDirection, cameraDirection);
        if (correctedNormal.length() > 0.001) {
          correctedNormal.normalize();
          normal = correctedNormal;
          console.log('   ✅ Corrected normal:', normal);
          
          // Verify again
          const newDist1 = Math.abs(normal.dot(new THREE.Vector3().subVectors(point1, midpoint)));
          const newDist2 = Math.abs(normal.dot(new THREE.Vector3().subVectors(point2, midpoint)));
          console.log('   After correction - dist1:', newDist1, 'dist2:', newDist2);
        }
      }
      
      // Create section view - pass a flag to indicate this is from scissors tool
      // so we don't invert/offset the plane
      // Also pass the cutting points so we can calculate plane size based on cut length
      return this.createSectionViewWithNormal(normal, midpoint, {
        ...options,
        range: calculatedRange,
        fromScissors: true, // Flag to indicate this is from scissors tool
        scissorsPoint1: point1, // Store cutting points for plane size calculation
        scissorsPoint2: point2
      });
    } catch (error) {
      console.error('❌ Error creating section view from points:', error);
      return null;
    }
  }

  /**
   * Create a section view with normal and point (based on the provided code)
   * Inverts the normal and adds offset to point as per the example
   */
  async createSectionViewWithNormal(
    normal: THREE.Vector3,
    point: THREE.Vector3,
    options?: {
      name?: string;
      range?: number;
      helpersVisible?: boolean;
      fromScissors?: boolean; // Flag to indicate this is from scissors tool
      scissorsPoint1?: THREE.Vector3; // First point of scissors cut (for plane size calculation)
      scissorsPoint2?: THREE.Vector3; // Second point of scissors cut (for plane size calculation)
    }
  ): Promise<View | null> {
    try {
      const viewId = `section-${Date.now()}`;
      const viewName = options?.name || `Section ${this.views.size + 1}`;
      const range = options?.range || 10;
      const helpersVisible = options?.helpersVisible !== false; // Default to true
      const fromScissors = options?.fromScissors || false;

      // For scissors tool, we want the plane to pass exactly through the line
      // So we don't invert or offset - use the normal and point as-is
      // For other methods (double-click), we invert and offset as before
      let finalNormal: THREE.Vector3;
      let finalPoint: THREE.Vector3;
      
      if (fromScissors) {
        // For scissors: plane passes through the line, no inversion/offset
        finalNormal = normal.clone().normalize();
        finalPoint = point.clone();
        console.log('✂️ Scissors mode: using normal and point as-is');
      } else {
        // For double-click: invert normal and add offset (original behavior)
        finalNormal = normal.clone().negate().normalize();
        finalPoint = point.clone().addScaledVector(normal, 1);
        console.log('🖱️ Double-click mode: inverted normal and offset point');
      }

      // Try to use OBC.Views if available
      if (this.viewsComponent && typeof this.viewsComponent.create === 'function') {
        try {
          // Check if create accepts normal and point parameters
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
          this.views.set(viewId, view);
          
          // Try to create view using OBC API if it supports it
          if (typeof this.viewsComponent.create === 'function' && world) {
            // This might not work if API is different, but we'll try
            console.log('✅ Created section view using OBC.Views (if available)');
          }
          
          return view;
        } catch (e) {
          console.log('⚠️ OBC.Views.create() failed, using custom implementation:', e);
        }
      }

      // Custom implementation: create a view perpendicular to the surface
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

      // Calculate camera position and target
      // Camera should be positioned along the normal, at distance = range
      // Looking at the point
      const cameraPosition = finalPoint.clone().addScaledVector(finalNormal, range);
      const cameraTarget = finalPoint.clone();

      // Store camera settings in view
      (view as any).cameraPosition = cameraPosition;
      (view as any).cameraTarget = cameraTarget;
      
      this.views.set(viewId, view);
      
      // Store flag for helper creation
      (view as any).fromScissors = fromScissors;
      
      // Store scissors cutting points if provided (for plane size calculation)
      if (fromScissors && options?.scissorsPoint1 && options?.scissorsPoint2) {
        (view as any).scissorsPoint1 = options.scissorsPoint1.clone();
        (view as any).scissorsPoint2 = options.scissorsPoint2.clone();
        console.log(`   Stored scissors points: point1=(${options.scissorsPoint1.x.toFixed(2)}, ${options.scissorsPoint1.y.toFixed(2)}, ${options.scissorsPoint1.z.toFixed(2)}), point2=(${options.scissorsPoint2.x.toFixed(2)}, ${options.scissorsPoint2.y.toFixed(2)}, ${options.scissorsPoint2.z.toFixed(2)})`);
      }
      
      // Create clipping plane for this section
      // The plane constant is calculated as -point.dot(normal)
      const clippingPlane = new THREE.Plane(finalNormal.clone().normalize(), -finalPoint.dot(finalNormal));
      this.clippingPlanes.set(viewId, clippingPlane);
      
      // Store initial offset for slider (0 = initial position)
      (view as any).initialOffset = 0;
      
      // Create visual helper (always visible for sections so user can see the plane)
      // For scissors tool, helper will calculate size from cut length
      // For other methods, use range
      const helperRange = fromScissors ? range : Math.max(range, 20);
      this.createSectionHelper(viewId, finalNormal, finalPoint, helperRange);
      
      console.log(`✅ Created section view: ${viewName}`);
      console.log(`   Normal:`, finalNormal);
      console.log(`   Point:`, finalPoint);
      console.log(`   Range: ${range}`);
      console.log(`   From scissors: ${fromScissors}`);
      console.log(`   Clipping plane created`);
      return view;
    } catch (error) {
      console.error('❌ Error creating section view:', error);
      return null;
    }
  }

  /**
   * Create visual helper for section view (plane visualization)
   * This helper is interactive and can be moved
   */
  private createSectionHelper(
    viewId: string,
    normal: THREE.Vector3,
    point: THREE.Vector3,
    range: number
  ): void {
    try {
      const view = this.views.get(viewId);
      const isVisible = view?.helpersVisible !== false; // Default to true if not set
      
      // Calculate appropriate size for the plane helper
      let planeSize = range * 2;
      
      // If this is from scissors tool, calculate size based on the cutting line length
      if (view && (view as any).fromScissors) {
        // Check if we have the cutting points stored
        const scissorsPoint1 = (view as any).scissorsPoint1;
        const scissorsPoint2 = (view as any).scissorsPoint2;
        
        console.log(`   Checking for scissors points: point1=${scissorsPoint1 ? 'found' : 'missing'}, point2=${scissorsPoint2 ? 'found' : 'missing'}`);
        
        if (scissorsPoint1 && scissorsPoint2) {
          // Ensure points are Vector3 instances
          const point1 = scissorsPoint1 instanceof THREE.Vector3 
            ? scissorsPoint1 
            : new THREE.Vector3(scissorsPoint1.x, scissorsPoint1.y, scissorsPoint1.z);
          const point2 = scissorsPoint2 instanceof THREE.Vector3 
            ? scissorsPoint2 
            : new THREE.Vector3(scissorsPoint2.x, scissorsPoint2.y, scissorsPoint2.z);
          
          // Calculate the length of the user's cut
          const cutLength = point1.distanceTo(point2);
          
          console.log(`   ===== SCISSORS CUT CALCULATION =====`);
          console.log(`   Point1: (${point1.x.toFixed(2)}, ${point1.y.toFixed(2)}, ${point1.z.toFixed(2)})`);
          console.log(`   Point2: (${point2.x.toFixed(2)}, ${point2.y.toFixed(2)}, ${point2.z.toFixed(2)})`);
          console.log(`   Calculated cutLength: ${cutLength.toFixed(4)} units`);
          
          // Use the exact cut length as the plane size
          // User wants the plane side to be exactly the same length as the cut line
          // No compensation factor - use exact length
          planeSize = cutLength;
          
          console.log(`   Setting planeSize = cutLength = ${cutLength.toFixed(4)}`);
          console.log(`   ====================================`);
        } else {
          // Fallback: use range-based calculation if cutting points are not available
          console.log('   ⚠️ No cutting points available, using range-based size');
          planeSize = range * 2;
        }
      }
      
      // Ensure reasonable size bounds
      // For scissors tool: use EXACT cut length - no minimum, no maximum
      // User wants the plane side to be exactly the same length as the cut line
      // For other views: keep the old limits
      const planeSizeBeforeBounds = planeSize;
      if (view && (view as any).fromScissors) {
        // NO minimum limit for scissors - use exact cut length
        // Even if it's very small, it should match what the user drew
        // No maximum limit either - plane size should match cut length exactly
        // Only apply a tiny minimum (0.1) to prevent division by zero or rendering issues
        planeSize = Math.max(planeSize, 0.1); // Absolute minimum 0.1 units to prevent errors
        if (planeSize !== planeSizeBeforeBounds && planeSizeBeforeBounds < 0.1) {
          console.log(`   ⚠️ planeSize adjusted from ${planeSizeBeforeBounds.toFixed(4)} to ${planeSize.toFixed(4)} (absolute minimum 0.1 to prevent errors)`);
        }
      } else {
        // For non-scissors views, keep the old limits
        planeSize = Math.max(planeSize, 20); // Minimum 20 units
        planeSize = Math.min(planeSize, 200); // Maximum 200 units to prevent huge planes
      }
      
      console.log(`   ===== CREATING PLANE HELPER =====`);
      console.log(`   Final planeSize: ${planeSize.toFixed(4)}`);
      console.log(`   Range: ${range}`);
      console.log(`   This will create a ${planeSize.toFixed(4)} x ${planeSize.toFixed(4)} square plane`);
      console.log(`   =================================`);
      
      // Normalize normal vector before calculating plane constant
      const normalizedNormal = normal.clone().normalize();
      
      // For scissors tool, use the midpoint between the two cutting points
      // This ensures the plane passes through the line drawn by the user
      // For other views, use the provided point
      let helperPosition = point;
      if (view && (view as any).fromScissors) {
        const scissorsPoint1 = (view as any).scissorsPoint1;
        const scissorsPoint2 = (view as any).scissorsPoint2;
        
        if (scissorsPoint1 && scissorsPoint2) {
          // Calculate midpoint between the two cutting points
          // This is the point where the plane should pass through (on the line)
          const point1 = scissorsPoint1 instanceof THREE.Vector3 
            ? scissorsPoint1 
            : new THREE.Vector3(scissorsPoint1.x, scissorsPoint1.y, scissorsPoint1.z);
          const point2 = scissorsPoint2 instanceof THREE.Vector3 
            ? scissorsPoint2 
            : new THREE.Vector3(scissorsPoint2.x, scissorsPoint2.y, scissorsPoint2.z);
          
          // Use midpoint - this is where the plane should be positioned
          // The plane will pass through both point1 and point2 because:
          // 1. The plane normal is perpendicular to the line direction
          // 2. The plane passes through midpoint
          // 3. Both points are equidistant from midpoint along the line
          helperPosition = new THREE.Vector3().addVectors(point1, point2).multiplyScalar(0.5);
          
          console.log(`   📍 Positioning helper at midpoint of user's line:`);
          console.log(`      User point1: (${point1.x.toFixed(2)}, ${point1.y.toFixed(2)}, ${point1.z.toFixed(2)})`);
          console.log(`      User point2: (${point2.x.toFixed(2)}, ${point2.y.toFixed(2)}, ${point2.z.toFixed(2)})`);
          console.log(`      Helper position (midpoint): (${helperPosition.x.toFixed(2)}, ${helperPosition.y.toFixed(2)}, ${helperPosition.z.toFixed(2)})`);
          
          // Verify that both points are in the plane (distance should be ~0)
          const dist1 = Math.abs(normalizedNormal.dot(new THREE.Vector3().subVectors(point1, helperPosition)));
          const dist2 = Math.abs(normalizedNormal.dot(new THREE.Vector3().subVectors(point2, helperPosition)));
          console.log(`      Verification - point1 distance from plane: ${dist1.toFixed(4)}, point2: ${dist2.toFixed(4)}`);
          if (dist1 > 0.01 || dist2 > 0.01) {
            console.warn(`      ⚠️ Warning: Points may not be exactly in the plane!`);
          } else {
            console.log(`      ✅ Both points are in the plane`);
          }
        } else {
          console.log(`   ⚠️ Scissors points not found, using provided point`);
        }
      }
      
      // CRITICAL FIX: Calculate plane constant so the plane passes through helperPosition
      // For PlaneHelper: plane constant defines where the plane passes through in world space
      // We calculate it so the plane passes through helperPosition (midpoint of user's line for scissors)
      const planeConstant = -helperPosition.dot(normalizedNormal);
      const plane = new THREE.Plane(normalizedNormal, planeConstant);
      
      if (view && (view as any).fromScissors) {
        console.log(`   🔵 Scissors tool: Plane constant calculated so plane passes through midpoint of user's line`);
        console.log(`      Helper position (midpoint): (${helperPosition.x.toFixed(2)}, ${helperPosition.y.toFixed(2)}, ${helperPosition.z.toFixed(2)})`);
        console.log(`      Plane constant: ${planeConstant.toFixed(4)}`);
      } else {
        console.log(`   🔵 Plane constant calculated: ${planeConstant.toFixed(4)} (for position: ${helperPosition.x.toFixed(2)}, ${helperPosition.y.toFixed(2)}, ${helperPosition.z.toFixed(2)})`);
      }
      
      // DEBUG: Log exact values being passed to PlaneHelper
      console.log(`   🔵 Creating PlaneHelper with:`);
      console.log(`      - plane.normal: (${normalizedNormal.x.toFixed(4)}, ${normalizedNormal.y.toFixed(4)}, ${normalizedNormal.z.toFixed(4)})`);
      console.log(`      - plane.constant: ${planeConstant.toFixed(4)}`);
      console.log(`      - size parameter: ${planeSize.toFixed(4)}`);
      console.log(`      - color: 0x00ff00 (green)`);
      console.log(`   🔵 This should create a square plane with side length = ${planeSize.toFixed(4)}`);
      
      const helper = new THREE.PlaneHelper(plane, planeSize, 0x00ff00); // Green plane
      
      // DEBUG: Verify the helper was created correctly and try to access/modify geometry
      console.log(`   ✅ PlaneHelper created`);
      
      // Try to access the internal mesh and geometry to verify/override size
      // PlaneHelper internally creates a mesh with PlaneGeometry
      // We can try to access it and verify the size
      try {
        // PlaneHelper stores the mesh in different ways depending on Three.js version
        // Try common property names
        const mesh = (helper as any).planeMesh || (helper as any).mesh || (helper.children?.[0]);
        if (mesh && mesh.geometry) {
          const geo = mesh.geometry as THREE.PlaneGeometry;
          const currentWidth = geo.parameters?.width || (geo as any).width || 'unknown';
          const currentHeight = geo.parameters?.height || (geo as any).height || 'unknown';
          
          console.log(`   ===== GEOMETRY DEBUG =====`);
          console.log(`   📐 BEFORE RECREATION:`);
          console.log(`      Geometry size: ${currentWidth} x ${currentHeight}`);
          console.log(`      Mesh scale: (${mesh.scale.x.toFixed(4)}, ${mesh.scale.y.toFixed(4)}, ${mesh.scale.z.toFixed(4)})`);
          console.log(`      Mesh position: (${mesh.position.x.toFixed(4)}, ${mesh.position.y.toFixed(4)}, ${mesh.position.z.toFixed(4)})`);
          console.log(`      Helper scale: (${helper.scale.x.toFixed(4)}, ${helper.scale.y.toFixed(4)}, ${helper.scale.z.toFixed(4)})`);
          console.log(`      Expected planeSize: ${planeSize.toFixed(4)}`);
          
          // CRITICAL: Ensure mesh scale is 1,1,1 (no scaling that could affect visual size)
          mesh.scale.set(1, 1, 1);
          console.log(`   🔧 Mesh scale set to: (${mesh.scale.x.toFixed(4)}, ${mesh.scale.y.toFixed(4)}, ${mesh.scale.z.toFixed(4)})`);
          
          // Always recreate geometry with exact size to ensure it matches
          // This gives us full control over the plane dimensions
          console.log(`   🔧 Recreating geometry with exact size: ${planeSize.toFixed(4)} x ${planeSize.toFixed(4)}`);
          
          // Dispose old geometry
          geo.dispose();
          
          // Create new geometry with exact size
          const newGeometry = new THREE.PlaneGeometry(planeSize, planeSize);
          mesh.geometry = newGeometry;
          
          // Verify the new geometry
          const newWidth = newGeometry.parameters?.width || (newGeometry as any).width;
          const newHeight = newGeometry.parameters?.height || (newGeometry as any).height;
          
          console.log(`   📐 AFTER RECREATION:`);
          console.log(`      New geometry size: ${newWidth} x ${newHeight}`);
          console.log(`      Mesh scale: (${mesh.scale.x.toFixed(4)}, ${mesh.scale.y.toFixed(4)}, ${mesh.scale.z.toFixed(4)})`);
          console.log(`      Helper scale: (${helper.scale.x.toFixed(4)}, ${helper.scale.y.toFixed(4)}, ${helper.scale.z.toFixed(4)})`);
          
          // Calculate effective visual size (geometry size * scale)
          const effectiveWidth = typeof newWidth === 'number' ? newWidth * mesh.scale.x : 'unknown';
          const effectiveHeight = typeof newHeight === 'number' ? newHeight * mesh.scale.y : 'unknown';
          console.log(`      Effective visual size (geometry * scale): ${effectiveWidth} x ${effectiveHeight}`);
          
          // Ensure mesh scale is still 1,1,1 after geometry update
          mesh.scale.set(1, 1, 1);
          mesh.updateMatrix();
          
          console.log(`   📐 FINAL CHECK:`);
          console.log(`      Mesh scale after update: (${mesh.scale.x.toFixed(4)}, ${mesh.scale.y.toFixed(4)}, ${mesh.scale.z.toFixed(4)})`);
          console.log(`      =========================`);
        } else {
          console.log(`   ⚠️ Could not access helper mesh/geometry directly`);
        }
      } catch (e) {
        console.log(`   ⚠️ Error accessing helper geometry:`, e);
      }
      
      // Position the helper at origin - plane position is controlled by plane.constant
      helper.position.set(0, 0, 0);
      
      // Ensure helper scale is 1,1,1 (no scaling that could affect visual size)
      helper.scale.set(1, 1, 1);
      
      // Orient the helper so the plane is perpendicular to the normal
      // PlaneHelper displays a plane in its local XY plane (perpendicular to local Z axis)
      // We need to rotate it so that its local Z axis points in the direction of the normal
      // This makes the plane perpendicular to the normal in world space
      
      // Create a quaternion that rotates the default Z axis (0,0,1) to align with the normal
      const defaultZ = new THREE.Vector3(0, 0, 1);
      const quaternion = new THREE.Quaternion();
      
      // Handle edge case where normal is parallel to default Z
      if (Math.abs(normalizedNormal.dot(defaultZ)) > 0.99) {
        // Normal is almost parallel to Z, use identity quaternion (no rotation needed)
        quaternion.identity();
      } else {
        // Rotate from default Z to normal direction
        quaternion.setFromUnitVectors(defaultZ, normalizedNormal);
      }
      
      helper.quaternion.copy(quaternion);
      
      console.log(`   Helper positioned at origin (0,0,0) - plane position controlled by plane.constant`);
      console.log(`   Plane constant: ${planeConstant.toFixed(4)} (plane passes through: ${helperPosition.x.toFixed(2)}, ${helperPosition.y.toFixed(2)}, ${helperPosition.z.toFixed(2)})`);
      console.log(`   Helper normal: (${normalizedNormal.x.toFixed(3)}, ${normalizedNormal.y.toFixed(3)}, ${normalizedNormal.z.toFixed(3)})`);
      console.log(`   Helper quaternion: (${quaternion.x.toFixed(3)}, ${quaternion.y.toFixed(3)}, ${quaternion.z.toFixed(3)}, ${quaternion.w.toFixed(3)})`);
      console.log(`   Helper scale: (${helper.scale.x.toFixed(3)}, ${helper.scale.y.toFixed(3)}, ${helper.scale.z.toFixed(3)})`);
      console.log(`   Helper size: ${planeSize.toFixed(2)} x ${planeSize.toFixed(2)}`);
      
      helper.visible = isVisible; // Use view-specific visibility state
      
      // Improve stability - enable auto-update for proper positioning
      helper.matrixAutoUpdate = true; // Changed to true to allow position updates
      helper.renderOrder = 1000; // Render after other objects
      
      // Make material more stable (disable depth write to prevent flickering)
      if (helper.material instanceof THREE.Material) {
        helper.material.depthWrite = false;
        helper.material.transparent = true;
        helper.material.opacity = 0.5; // Make it semi-transparent
        helper.material.side = THREE.DoubleSide; // Show both sides
        helper.material.needsUpdate = true;
      }
      
      // Store view ID in helper for reference
      (helper as any).viewId = viewId;
      (helper as any).sectionPoint = point.clone();
      (helper as any).sectionNormal = normalizedNormal.clone();
      
      // Add helper to scene
      this.scene.add(helper);
      
      // CRITICAL: PlaneHelper position is controlled by plane.constant, NOT helper.position
      // Keep helper at origin (0,0,0) - plane position is already set via plane.constant
      // Only ensure scale is correct
      helper.position.set(0, 0, 0);
      helper.scale.set(1, 1, 1);
      
      // Update matrix world after adding to scene
      helper.updateMatrixWorld();
      
      // Force position and scale again after matrix update (PlaneHelper may reset them)
      helper.position.set(0, 0, 0);
      helper.scale.set(1, 1, 1);
      helper.updateMatrixWorld(true);
      
      // Final verification after adding to scene
      console.log(`   ===== FINAL VERIFICATION AFTER ADDING TO SCENE =====`);
      console.log(`   📍 Position:`);
      console.log(`      helper.position: (${helper.position.x.toFixed(4)}, ${helper.position.y.toFixed(4)}, ${helper.position.z.toFixed(4)})`);
      console.log(`      Expected: (0, 0, 0) - plane position controlled by plane.constant`);
      console.log(`      Plane passes through: (${helperPosition.x.toFixed(4)}, ${helperPosition.y.toFixed(4)}, ${helperPosition.z.toFixed(4)})`);
      console.log(`      helper.matrixWorld translation: (${helper.matrixWorld.elements[12].toFixed(4)}, ${helper.matrixWorld.elements[13].toFixed(4)}, ${helper.matrixWorld.elements[14].toFixed(4)})`);
      
      console.log(`   📏 Scale:`);
      console.log(`      helper.scale: (${helper.scale.x.toFixed(4)}, ${helper.scale.y.toFixed(4)}, ${helper.scale.z.toFixed(4)})`);
      
      // If scale was changed, force it back to 1,1,1
      if (Math.abs(helper.scale.x - 1) > 0.001 || Math.abs(helper.scale.y - 1) > 0.001 || Math.abs(helper.scale.z - 1) > 0.001) {
        console.log(`      ⚠️ Scale was changed! Forcing back to (1,1,1)`);
        helper.scale.set(1, 1, 1);
        helper.updateMatrixWorld(true);
        console.log(`      ✅ Scale forced to: (${helper.scale.x.toFixed(4)}, ${helper.scale.y.toFixed(4)}, ${helper.scale.z.toFixed(4)})`);
      }
      
      // Check mesh scale again and force helper scale to 1,1,1 if it was changed
      try {
        const mesh = (helper as any).planeMesh || (helper as any).mesh || (helper.children?.[0]);
        if (mesh) {
          console.log(`      mesh.scale: (${mesh.scale.x.toFixed(4)}, ${mesh.scale.y.toFixed(4)}, ${mesh.scale.z.toFixed(4)})`);
          
          // CRITICAL FIX: If helper.scale is not 1,1,1, we need to compensate in geometry size
          // PlaneHelper may internally scale the helper, so we need to account for that
          if (Math.abs(helper.scale.x - 1) > 0.001 || Math.abs(helper.scale.y - 1) > 0.001) {
            console.log(`      ⚠️ Helper scale is not 1,1,1: (${helper.scale.x.toFixed(4)}, ${helper.scale.y.toFixed(4)}, ${helper.scale.z.toFixed(4)})`);
            console.log(`      🔧 Adjusting geometry size to compensate for helper scale`);
            
            // Calculate required geometry size to get desired visual size
            const requiredWidth = planeSize / helper.scale.x;
            const requiredHeight = planeSize / helper.scale.y;
            
            if (mesh.geometry) {
              const oldGeo = mesh.geometry as THREE.PlaneGeometry;
              oldGeo.dispose();
              
              // Create new geometry with adjusted size
              const adjustedGeometry = new THREE.PlaneGeometry(requiredWidth, requiredHeight);
              mesh.geometry = adjustedGeometry;
              
              console.log(`      ✅ Geometry adjusted to: ${requiredWidth.toFixed(4)} x ${requiredHeight.toFixed(4)}`);
              console.log(`      📐 Expected visual size: ${(requiredWidth * helper.scale.x).toFixed(4)} x ${(requiredHeight * helper.scale.y).toFixed(4)}`);
            }
          }
          
          if (mesh.geometry) {
            const geo = mesh.geometry as THREE.PlaneGeometry;
            const geoWidth = geo.parameters?.width || (geo as any).width || 'unknown';
            const geoHeight = geo.parameters?.height || (geo as any).height || 'unknown';
            console.log(`      mesh.geometry size: ${geoWidth} x ${geoHeight}`);
            
            // Calculate final visual size (geometry * mesh.scale * helper.scale)
            if (typeof geoWidth === 'number' && typeof geoHeight === 'number') {
              const finalWidth = geoWidth * mesh.scale.x * helper.scale.x;
              const finalHeight = geoHeight * mesh.scale.y * helper.scale.y;
              console.log(`      FINAL VISUAL SIZE (geometry * mesh.scale * helper.scale): ${finalWidth.toFixed(4)} x ${finalHeight.toFixed(4)}`);
              console.log(`      Expected size: ${planeSize.toFixed(4)} x ${planeSize.toFixed(4)}`);
              if (Math.abs(finalWidth - planeSize) > 0.01 || Math.abs(finalHeight - planeSize) > 0.01) {
                console.log(`      ⚠️ SIZE MISMATCH! Difference: width=${(finalWidth - planeSize).toFixed(4)}, height=${(finalHeight - planeSize).toFixed(4)}`);
              } else {
                console.log(`      ✅ Size matches expected!`);
              }
            }
          }
        }
      } catch (e) {
        console.log(`      ⚠️ Could not check mesh:`, e);
      }
      
      console.log(`   ====================================================`);
      
      this.sectionHelpers.set(viewId, helper);
      
      console.log(`✅ Created section helper for view: ${viewId}, visible: ${isVisible}, size: ${planeSize}`);
      console.log(`   Plane constant: ${planeConstant.toFixed(4)} (plane passes through: ${helperPosition.x.toFixed(2)}, ${helperPosition.y.toFixed(2)}, ${helperPosition.z.toFixed(2)}), normal: (${normalizedNormal.x.toFixed(3)}, ${normalizedNormal.y.toFixed(3)}, ${normalizedNormal.z.toFixed(3)})`);
    } catch (error) {
      console.warn('⚠️ Could not create section helper:', error);
    }
  }
  
  /**
   * Toggle visibility of a specific section helper
   */
  toggleSectionHelperVisibility(viewId: string): boolean {
    const view = this.views.get(viewId);
    if (!view || view.type !== 'section') {
      console.warn(`⚠️ View ${viewId} is not a section view`);
      return false;
    }
    
    // Toggle visibility state
    const newVisibility = !(view.helpersVisible !== false); // Default to true, so toggle to false
    view.helpersVisible = newVisibility;
    
    // Update the helper
    const helper = this.sectionHelpers.get(viewId);
    if (helper) {
      helper.visible = newVisibility;
      console.log(`✅ Section helper ${viewId} visibility: ${newVisibility ? 'ON' : 'OFF'}`);
    }
    
    return newVisibility;
  }
  
  /**
   * Get visibility state of a specific section helper
   */
  isSectionHelperVisible(viewId: string): boolean {
    const view = this.views.get(viewId);
    if (!view || view.type !== 'section') {
      return false;
    }
    return view.helpersVisible !== false; // Default to true
  }

  /**
   * Update section plane position (move along normal)
   * @param viewId - ID of the section view
   * @param offset - Offset to move the plane along its normal
   * @param updateCamera - Whether to update camera position (default: true, set to false if user manually changed view)
   */
  updateSectionPlane(viewId: string, offset: number, updateCamera: boolean = true): boolean {
    const view = this.views.get(viewId);
    if (!view || !view.normal || !view.point) {
      console.warn('⚠️ Cannot update section plane - view, normal, or point missing');
      return false;
    }

    // Ensure point and normal are THREE.Vector3 instances
    let currentPoint: THREE.Vector3;
    let currentNormal: THREE.Vector3;
    
    if (view.point instanceof THREE.Vector3) {
      currentPoint = view.point;
    } else if (view.point && typeof view.point === 'object' && 'x' in view.point && 'y' in view.point && 'z' in view.point) {
      // Convert plain object to Vector3
      currentPoint = new THREE.Vector3((view.point as any).x, (view.point as any).y, (view.point as any).z);
    } else {
      console.error('❌ view.point is not a valid Vector3:', view.point);
      return false;
    }
    
    if (view.normal instanceof THREE.Vector3) {
      currentNormal = view.normal;
    } else if (view.normal && typeof view.normal === 'object' && 'x' in view.normal && 'y' in view.normal && 'z' in view.normal) {
      // Convert plain object to Vector3
      currentNormal = new THREE.Vector3((view.normal as any).x, (view.normal as any).y, (view.normal as any).z).normalize();
    } else {
      console.error('❌ view.normal is not a valid Vector3:', view.normal);
      return false;
    }

    console.log(`🔧 Updating section plane for view: ${viewId}, offset: ${offset}`);
    console.log(`   Current point:`, currentPoint);
    console.log(`   Current normal:`, currentNormal);

    // Move point along normal (offset is in units along the normal)
    const newPoint = currentPoint.clone().addScaledVector(currentNormal, offset);
    view.point = newPoint; // Store as Vector3
    view.normal = currentNormal; // Ensure normal is Vector3

    console.log(`   New point:`, newPoint);

    // Update clipping plane
    const clippingPlane = this.clippingPlanes.get(viewId);
    if (clippingPlane) {
      // Update plane constant based on new point
      clippingPlane.constant = -newPoint.dot(currentNormal);
      console.log(`   Updated clipping plane constant: ${clippingPlane.constant}`);
    } else {
      // Create new clipping plane if it doesn't exist
      const newPlane = new THREE.Plane(currentNormal.clone().normalize(), -newPoint.dot(currentNormal));
      this.clippingPlanes.set(viewId, newPlane);
      console.log(`   Created new clipping plane`);
    }

    // Update helper visual
    const helper = this.sectionHelpers.get(viewId);
    if (helper && helper instanceof THREE.PlaneHelper) {
      const plane = new THREE.Plane(currentNormal.clone().normalize(), -newPoint.dot(currentNormal));
      helper.plane.copy(plane);
      helper.position.copy(newPoint);
      // Manually update matrix since we disabled auto-update for stability
      if (!helper.matrixAutoUpdate) {
        helper.updateMatrix();
      }
      helper.updateMatrixWorld();
      console.log(`   Updated helper plane`);
    }

    // Update camera position if view is active AND updateCamera is true
    // Only update camera if user hasn't manually changed the view
    if (updateCamera && view.active && (view as any).cameraPosition && (view as any).cameraTarget) {
      const newCameraPos = newPoint.clone().addScaledVector(currentNormal, view.range || 10);
      (view as any).cameraPosition = newCameraPos;
      (view as any).cameraTarget = newPoint;
      
      // Update actual camera if view is active
      try {
        const cameraComponent = this.viewer.camera as any;
        if (cameraComponent && cameraComponent.get && cameraComponent.controls) {
          const camera = cameraComponent.get();
          const controls = cameraComponent.controls;
          
          camera.position.copy(newCameraPos);
          if (controls.setLookAt) {
            controls.setLookAt(
              newCameraPos.x, newCameraPos.y, newCameraPos.z,
              newPoint.x, newPoint.y, newPoint.z,
              false
            );
          }
          if (controls.update) controls.update();
          if (camera.updateProjectionMatrix) camera.updateProjectionMatrix();
        }
      } catch (e) {
        console.warn('⚠️ Could not update camera:', e);
      }
    } else if (!updateCamera) {
      console.log('📷 Camera update skipped - user manually changed view');
    }

    // Re-apply clipping to all meshes with updated plane
    this.applyClippingPlane(viewId);

    console.log(`✅ Updated section plane for view: ${viewId}, offset: ${offset}`);
    return true;
  }

  /**
   * Apply clipping plane to all meshes in the scene
   */
  private applyClippingPlane(viewId: string): void {
    const clippingPlane = this.clippingPlanes.get(viewId);
    if (!clippingPlane) {
      console.warn('⚠️ No clipping plane found for view:', viewId);
      return;
    }

    console.log('🔧 Applying clipping plane:', {
      normal: clippingPlane.normal,
      constant: clippingPlane.constant
    });

    // Get all meshes from loaded models (including InstancedMesh)
    const loadedModels = getLoadedModels();
    const allMeshes: (THREE.Mesh | THREE.InstancedMesh)[] = [];

    for (const model of loadedModels) {
      if (model.items && Array.isArray(model.items)) {
        for (const item of model.items) {
          if (item.mesh) {
            // Accept both Mesh and InstancedMesh
            if (item.mesh instanceof THREE.Mesh || item.mesh instanceof THREE.InstancedMesh) {
              allMeshes.push(item.mesh);
            }
          }
        }
      }
    }

    // Also try to get meshes directly from scene
    try {
      this.scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.InstancedMesh) {
          // Avoid duplicates
          if (!allMeshes.includes(object)) {
            allMeshes.push(object);
          }
        }
      });
    } catch (e) {
      console.warn('⚠️ Could not traverse scene for meshes:', e);
    }

    console.log(`📦 Found ${allMeshes.length} meshes to apply clipping`);

    // Apply clipping plane to all meshes
    let appliedCount = 0;
    let instancedCount = 0;
    let regularCount = 0;
    let noMaterialCount = 0;
    
    for (const mesh of allMeshes) {
      if (!mesh.material) {
        noMaterialCount++;
        continue;
      }
      
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) {
        if (!(material instanceof THREE.Material)) {
          continue;
        }
        
        // Initialize clipping planes array if needed
        if (!material.clippingPlanes) {
          material.clippingPlanes = [];
        }
        
        // Remove any existing clipping planes with similar normal
        const beforeCount = material.clippingPlanes.length;
        material.clippingPlanes = material.clippingPlanes.filter((p: THREE.Plane) => {
          // Keep planes that are significantly different (different normal direction)
          const dotProduct = p.normal.dot(clippingPlane.normal);
          return !(Math.abs(dotProduct - 1) < 0.01 || Math.abs(dotProduct + 1) < 0.01);
        });
        
        // Add the new clipping plane (clone it to avoid reference issues)
        const planeClone = new THREE.Plane(clippingPlane.normal.clone(), clippingPlane.constant);
        material.clippingPlanes.push(planeClone);
        material.clipIntersection = false; // Clip everything on the negative side of plane
        material.needsUpdate = true;
        appliedCount++;
        
        if (mesh instanceof THREE.InstancedMesh) {
          instancedCount++;
        } else {
          regularCount++;
        }
        
        // Debug log for first few materials
        if (appliedCount <= 3) {
          console.log(`   Material ${appliedCount}:`, {
            type: material.type,
            clippingPlanesCount: material.clippingPlanes.length,
            clipIntersection: material.clipIntersection,
            meshType: mesh instanceof THREE.InstancedMesh ? 'InstancedMesh' : 'Mesh'
          });
        }
      }
    }

    // Also try to set global clipping planes in renderer (for InstancedMesh support)
    // Global clipping planes work for all meshes, including InstancedMesh
    try {
      if (this.renderer && this.renderer.get) {
        const threeRenderer = this.renderer.get();
        if (threeRenderer) {
          // Set global clipping planes (this affects all rendered objects)
          if (threeRenderer.clippingPlanes !== undefined) {
            // Clone the plane to avoid reference issues
            const globalPlane = new THREE.Plane(clippingPlane.normal.clone(), clippingPlane.constant);
            threeRenderer.clippingPlanes = [globalPlane];
            console.log('✅ Set global clipping plane in renderer:', {
              normal: globalPlane.normal,
              constant: globalPlane.constant
            });
          }
          // Ensure local clipping is enabled (required for per-material clipping)
          if (threeRenderer.localClippingEnabled !== undefined) {
            threeRenderer.localClippingEnabled = true;
            console.log('✅ Ensured localClippingEnabled is true');
          }
        } else {
          console.warn('⚠️ Could not get Three.js renderer from OBC renderer');
        }
      } else {
        console.warn('⚠️ Renderer or renderer.get() not available');
      }
    } catch (e) {
      console.warn('⚠️ Could not set global clipping plane:', e);
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
  private removeClippingPlane(viewId: string): void {
    const clippingPlane = this.clippingPlanes.get(viewId);
    if (!clippingPlane) return;

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

    // Remove clipping plane from all meshes
    let removedCount = 0;
    for (const mesh of allMeshes) {
      if (mesh.material) {
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const material of materials) {
          if (material instanceof THREE.Material && material.clippingPlanes) {
            const beforeCount = material.clippingPlanes.length;
            material.clippingPlanes = material.clippingPlanes.filter((p: THREE.Plane) => {
              // Remove planes with similar normal and constant
              const dotProduct = p.normal.dot(clippingPlane.normal);
              const constantDiff = Math.abs(p.constant - clippingPlane.constant);
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

    // Clear global clipping planes
    try {
      if (this.renderer && this.renderer.get) {
        const threeRenderer = this.renderer.get();
        if (threeRenderer && threeRenderer.clippingPlanes) {
          threeRenderer.clippingPlanes = [];
        }
      }
    } catch (e) {
      // Ignore
    }

    console.log(`✅ Removed clipping plane from ${removedCount} materials in ${allMeshes.length} meshes`);
  }

  /**
   * Remove section helper
   */
  private removeSectionHelper(viewId: string): void {
    const helper = this.sectionHelpers.get(viewId);
    if (helper) {
      this.scene.remove(helper);
      if (helper instanceof THREE.PlaneHelper) {
        helper.dispose();
      }
      this.sectionHelpers.delete(viewId);
      console.log(`🗑️ Removed section helper for view: ${viewId}`);
    }
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
      // For elevations, we want to look at the model from the side
      // Try to get model bounding box to position camera better
      let modelCenter = new THREE.Vector3(0, 0, 0);
      let modelSize = new THREE.Vector3(50, 50, 50); // Default size
      
      // Try to calculate actual model bounds
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
      
      const distance = Math.max(modelSize.x, modelSize.y, modelSize.z) * 1.5; // Distance based on model size
      const height = modelCenter.y + modelSize.y * 0.5; // Camera height at model center
      let cameraPosition: THREE.Vector3;
      let cameraTarget = new THREE.Vector3(modelCenter.x, height, modelCenter.z); // Look at model center

      switch (direction) {
        case 'north':
          // Looking from north (positive Z), camera at north side
          cameraPosition = new THREE.Vector3(modelCenter.x, height, modelCenter.z + distance);
          break;
        case 'south':
          // Looking from south (negative Z), camera at south side
          cameraPosition = new THREE.Vector3(modelCenter.x, height, modelCenter.z - distance);
          break;
        case 'east':
          // Looking from east (positive X), camera at east side
          cameraPosition = new THREE.Vector3(modelCenter.x + distance, height, modelCenter.z);
          break;
        case 'west':
          // Looking from west (negative X), camera at west side
          cameraPosition = new THREE.Vector3(modelCenter.x - distance, height, modelCenter.z);
          break;
      }

      // Store camera settings in view
      (view as any).cameraPosition = cameraPosition;
      (view as any).cameraTarget = cameraTarget;
      
      this.views.set(viewId, view);
      console.log(`✅ Created elevation view: ${viewName}`);
      return view;
    } catch (error) {
      console.error('❌ Error creating elevation view:', error);
      return null;
    }
  }

  /**
   * Open/activate a view
   */
  async openView(viewId: string): Promise<boolean> {
    try {
      const view = this.views.get(viewId);
      if (!view) {
        console.warn(`⚠️ View not found: ${viewId}`);
        return false;
      }

      // Save current camera state if no view is active
      if (!this.activeViewId) {
        this.saveCurrentCameraState();
      }

      // Deactivate current view
      if (this.activeViewId) {
        await this.closeActiveView();
      }

      // Try to use OBC.Views if available
      if (this.viewsComponent && view.world && typeof this.viewsComponent.goTo === 'function') {
        await this.viewsComponent.goTo(view.world);
        view.active = true;
        this.activeViewId = viewId;
        console.log(`✅ Opened view: ${view.name}`);
        return true;
      }

      // For section views, preserve camera position and only apply clipping plane
      if (view.type === 'section' && view.normal && view.point) {
        // Apply clipping plane without changing camera position
        this.applyClippingPlane(viewId);
        this.activeClippingPlane = this.clippingPlanes.get(viewId) || null;
        view.active = true;
        this.activeViewId = viewId;
        console.log(`✅ Opened section view: ${view.name} (camera preserved, clipping plane applied)`);
        return true;
      }

      // Custom implementation: set camera position (for non-section views)
      if ((view as any).cameraPosition && (view as any).cameraTarget) {
        // Try to set camera position and target using camera controls
        const cameraPos = (view as any).cameraPosition as THREE.Vector3;
        const cameraTarget = (view as any).cameraTarget as THREE.Vector3;
        
        // Try to access camera controls from viewer
        try {
          const cameraComponent = this.viewer.camera as any;
          if (cameraComponent && cameraComponent.get) {
            const camera = cameraComponent.get();
            const controls = cameraComponent.controls;
            
            if (!camera || !controls) {
              console.warn('⚠️ Camera or controls not available');
              return false;
            }
            
            // Set camera position first
            camera.position.copy(cameraPos);
            
            // Set camera target using setLookAt (most reliable method)
            if (controls.setLookAt) {
              controls.setLookAt(
                cameraPos.x, cameraPos.y, cameraPos.z,
                cameraTarget.x, cameraTarget.y, cameraTarget.z,
                false // animate parameter
              );
            } else if (controls.target) {
              // Fallback: set target directly
              controls.target.copy(cameraTarget);
              camera.lookAt(cameraTarget);
            }
            
            // Update controls
            if (controls.update) {
              controls.update();
            }
            
            // Update camera projection matrix
            if (camera.updateProjectionMatrix) {
              camera.updateProjectionMatrix();
            }
            
            console.log(`✅ Camera set for view: ${view.name}`);
            console.log(`   Position: (${cameraPos.x.toFixed(2)}, ${cameraPos.y.toFixed(2)}, ${cameraPos.z.toFixed(2)})`);
            console.log(`   Target: (${cameraTarget.x.toFixed(2)}, ${cameraTarget.y.toFixed(2)}, ${cameraTarget.z.toFixed(2)})`);
          } else {
            console.warn('⚠️ Camera component.get() not available');
            return false;
          }
        } catch (error) {
          console.error('❌ Could not set camera position:', error);
          return false;
        }
        
        view.active = true;
        this.activeViewId = viewId;
        console.log(`✅ Opened view: ${view.name} (custom implementation)`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Error opening view:', error);
      return false;
    }
  }

  /**
   * Close the active view and restore original camera
   */
  async closeActiveView(): Promise<boolean> {
    try {
      if (!this.activeViewId) {
        return false;
      }

      const view = this.views.get(this.activeViewId);
      if (view) {
        view.active = false;
        
        // Remove clipping plane if this was a section view
        if (view.type === 'section') {
          this.removeClippingPlane(this.activeViewId);
          this.activeClippingPlane = null;
          console.log('✅ Removed clipping plane');
        }
      }

      // Restore original camera state
      if (this.originalCamera && this.originalCameraPosition && this.originalCameraTarget) {
        // Restore camera position and target
        // This would require access to camera controls
        console.log('✅ Restored original camera state');
      }

      this.activeViewId = null;
      console.log('✅ Closed active view');
      return true;
    } catch (error) {
      console.error('❌ Error closing view:', error);
      return false;
    }
  }

  /**
   * Delete a view
   */
  async deleteView(viewId: string): Promise<boolean> {
    try {
      const view = this.views.get(viewId);
      if (!view) {
        return false;
      }

      // If it's the active view, close it first
      if (this.activeViewId === viewId) {
        await this.closeActiveView();
      }

      // Remove section helper and clipping plane if it exists
      if (view.type === 'section') {
        this.removeSectionHelper(viewId);
        this.removeClippingPlane(viewId);
        this.clippingPlanes.delete(viewId);
      }

      // Try to use OBC.Views if available
      if (this.viewsComponent && view.world && typeof this.viewsComponent.delete === 'function') {
        await this.viewsComponent.delete(view.world);
      }

      this.views.delete(viewId);
      console.log(`✅ Deleted view: ${view.name}`);
      return true;
    } catch (error) {
      console.error('❌ Error deleting view:', error);
      return false;
    }
  }

  /**
   * Get all views
   */
  getAllViews(): View[] {
    return Array.from(this.views.values());
  }

  /**
   * Get active view
   */
  getActiveView(): View | null {
    if (!this.activeViewId) return null;
    return this.views.get(this.activeViewId) || null;
  }

  /**
   * Get view by ID
   */
  getView(viewId: string): View | null {
    return this.views.get(viewId) || null;
  }

  /**
   * Save current camera state
   */
  private saveCurrentCameraState() {
    // This would save the current camera position and target
    // Implementation depends on camera type (OrthoPerspectiveCamera)
    console.log('💾 Saved current camera state');
  }

  /**
   * Create standard views (elevations, top view) that should always be available
   */
  async createStandardViews(): Promise<View[]> {
    const createdViews: View[] = [];
    
    console.log('🏗️ Creating standard views (elevations, top view)...');
    
    try {
      // Create top view (widok z góry)
      const topView = await this.createStoreyView('Top View', 0);
      if (topView) {
        // Override camera position for top-down view
        (topView as any).cameraPosition = new THREE.Vector3(0, 100, 0);
        (topView as any).cameraTarget = new THREE.Vector3(0, 0, 0);
        createdViews.push(topView);
        console.log('  ✅ Created Top View');
      }
      
      // Create elevation views
      const elevations = ['north', 'south', 'east', 'west'] as const;
      for (const direction of elevations) {
        const elevationView = await this.createElevationView(direction);
        if (elevationView) {
          createdViews.push(elevationView);
          console.log(`  ✅ Created ${direction.charAt(0).toUpperCase() + direction.slice(1)} Elevation`);
        }
      }
    } catch (error) {
      console.error('❌ Error creating standard views:', error);
    }
    
    console.log(`✅ Created ${createdViews.length} standard view(s)`);
    return createdViews;
  }

  /**
   * Automatically create views from storeys in loaded IFC models
   */
  async createStoreyViewsFromModels(): Promise<View[]> {
    const loadedModels = getLoadedModels();
    const createdViews: View[] = [];

    console.log(`🏗️ Creating views from ${loadedModels.length} loaded model(s)...`);

    if (loadedModels.length === 0) {
      console.warn('⚠️ No loaded models available, creating standard views only');
      // Even without models, create standard views
      const standardViews = await this.createStandardViews();
      return standardViews;
    }

    // First, always create standard views (elevations, top view)
    const standardViews = await this.createStandardViews();
    createdViews.push(...standardViews);

    // Then, try to extract storeys from models
    for (let i = 0; i < loadedModels.length; i++) {
      const model = loadedModels[i];
      try {
        console.log(`📦 Processing model ${i + 1}/${loadedModels.length} for storeys...`);
        // Try to get storeys from model
        const storeys = await this.extractStoreysFromModel(model);
        
        console.log(`  Found ${storeys.length} storeys in model ${i + 1}`);
        
        for (const storey of storeys) {
          // Skip if it's the default view (we already have standard views)
          if (storey.name === 'Default View') continue;
          
          const view = await this.createStoreyView(storey.name, storey.elevation);
          if (view) {
            createdViews.push(view);
            console.log(`  ✅ Created storey view: ${view.name}`);
          }
        }
      } catch (error) {
        console.error(`❌ Error processing model ${i + 1}:`, error);
      }
    }

    console.log(`✅ Created ${createdViews.length} total view(s) (${standardViews.length} standard + ${createdViews.length - standardViews.length} storeys)`);
    return createdViews;
  }

  /**
   * Extract storeys from IFC model
   */
  private async extractStoreysFromModel(model: any): Promise<Array<{ name: string; elevation: number }>> {
    const storeys: Array<{ name: string; elevation: number }> = [];
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

      // Method 2: Try to iterate through ALL model items and check properties
      if (storeys.length === 0 && model.items && Array.isArray(model.items)) {
        console.log(`📋 Iterating through ${model.items.length} model items to find storeys...`);
        let checkedCount = 0;
        const maxChecks = 100; // Limit to avoid too many async calls
        
        for (const item of model.items) {
          if (checkedCount >= maxChecks) break;
          
          try {
            // Get IDs from item
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
            
            // Check IDs for storey properties (check more IDs per item)
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
                  
                  // Check if we already have this storey (avoid duplicates)
                  const isDuplicate = storeys.some(s => s.name === name && s.elevation === elevation);
                  if (!isDuplicate) {
                    storeys.push({ name, elevation });
                    console.log(`  ✅ Found storey: ${name} at elevation ${elevation}`);
                  }
                  break; // Found storey in this item, move to next
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

      // Method 3: If still no storeys, try to get all properties and filter
      if (storeys.length === 0 && model && typeof model.getAllPropertiesOfType === 'function') {
        try {
          // Try without type parameter
          const allProps = await model.getAllPropertiesOfType(0);
          if (allProps && Array.isArray(allProps)) {
            console.log(`📊 Checking ${allProps.length} properties for storeys...`);
            for (const prop of allProps.slice(0, 200)) { // Limit to first 200
              if (prop.type === 'IfcBuildingStorey' || prop.type?.includes('Storey')) {
                const name = prop.Name?.value || prop.type || 'Storey';
                const elevation = prop.Elevation?.value || 0;
                storeys.push({ name, elevation });
                console.log(`  ✅ Found storey: ${name} at elevation ${elevation}`);
              }
            }
          }
        } catch (e) {
          console.log('⚠️ getAllPropertiesOfType(0) failed:', e);
        }
      }

      // Method 4: Fallback - create a default view if no storeys found
      if (storeys.length === 0) {
        console.log('⚠️ No storeys found, creating default view');
        // Try to get bounding box to determine a reasonable elevation
        let defaultElevation = 0;
        if (model.items && model.items.length > 0) {
          // Simple heuristic: use first item's position or 0
          defaultElevation = 0;
        }
        storeys.push({ name: 'Default View', elevation: defaultElevation });
        console.log('  ✅ Created default view');
      }
    } catch (error) {
      console.warn('⚠️ Error extracting storeys:', error);
      // Fallback: create at least one view
      if (storeys.length === 0) {
        storeys.push({ name: 'Default View', elevation: 0 });
      }
    }

    console.log(`✅ Extracted ${storeys.length} storeys from model`);
    return storeys;
  }
}

/**
 * Initialize Views feature
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

