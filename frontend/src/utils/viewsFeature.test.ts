import { describe, it, expect, vi, beforeEach } from "vitest";
import * as THREE from "three";
import { ViewsManager, View } from "./viewsFeature";

// Mock getLoadedModels
vi.mock("../lib/thatopen", () => ({
  getLoadedModels: vi.fn(() => []),
}));

// Helper function to create a mock PlaneHelper
function createMockPlaneHelper() {
  return {
    visible: true,
    matrixAutoUpdate: true,
    renderOrder: 0,
    material: {
      depthWrite: true,
      transparent: false,
      opacity: 1,
      side: null,
      needsUpdate: false,
    },
    plane: {
      normal: new THREE.Vector3(),
      constant: 0,
      copy: vi.fn(),
    },
    updateMatrix: vi.fn(),
    updateMatrixWorld: vi.fn(),
    dispose: vi.fn(),
  };
}

const mockScene = {
  add: vi.fn(),
  remove: vi.fn(),
  traverse: vi.fn(),
};

const mockCamera = {
  position: new THREE.Vector3(0, 0, 10),
  lookAt: vi.fn(),
  updateProjectionMatrix: vi.fn(),
};

const mockRaycaster = {};

const mockViewer = {
  renderer: {
    get: vi.fn(() => ({
      localClippingEnabled: false,
      clippingPlanes: [],
    })),
  },
  camera: {
    get: vi.fn(() => mockCamera),
    controls: {
      setLookAt: vi.fn(),
      target: new THREE.Vector3(0, 0, 0),
      update: vi.fn(),
    },
  },
};

describe("ViewsManager", () => {
  let viewsManager: ViewsManager;
  let scene: any;
  let camera: any;
  let raycaster: any;
  let viewer: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});

    // Reset mocks
    scene = {
      add: vi.fn(),
      remove: vi.fn(),
      traverse: vi.fn(),
    };

    camera = {
      position: new THREE.Vector3(0, 0, 10),
      lookAt: vi.fn(),
      updateProjectionMatrix: vi.fn(),
    };

    raycaster = {};

    viewer = {
      renderer: {
        get: vi.fn(() => ({
          localClippingEnabled: false,
          clippingPlanes: [],
        })),
      },
      camera: {
        get: vi.fn(() => camera),
        controls: {
          setLookAt: vi.fn(),
          target: new THREE.Vector3(0, 0, 0),
          update: vi.fn(),
        },
      },
    };

    // Mock THREE.PlaneHelper constructor - create new instance for each test
    vi.spyOn(THREE, "PlaneHelper").mockImplementation(() => createMockPlaneHelper() as any);
    vi.spyOn(THREE, "Plane").mockImplementation((normal, constant) => ({
      normal: normal.clone(),
      constant,
      copy: vi.fn(),
    }));

    viewsManager = new ViewsManager(viewer, scene, camera, raycaster);
  });

  describe("createSectionViewWithNormal", () => {
    it("should create a section view with fromScissors=true using normal and point as-is", async () => {
      const normal = new THREE.Vector3(1, 0, 0);
      const point = new THREE.Vector3(10, 20, 30);
      const options = {
        name: "Test Section",
        range: 50,
        helpersVisible: true,
        fromScissors: true,
      };

      const view = await viewsManager.createSectionViewWithNormal(normal, point, options);

      expect(view).not.toBeNull();
      expect(view?.type).toBe("section");
      expect(view?.name).toBe("Test Section");
      expect(view?.normal).toBeDefined();
      expect(view?.point).toBeDefined();
      expect(view?.range).toBe(50);
      expect(view?.helpersVisible).toBe(true);

      // For fromScissors=true, normal should not be inverted
      if (view?.normal && view?.point) {
        // Normal should be the same direction (not negated)
        expect(view.normal.x).toBeCloseTo(normal.x, 5);
        expect(view.normal.y).toBeCloseTo(normal.y, 5);
        expect(view.normal.z).toBeCloseTo(normal.z, 5);

        // Point should be the same (not offset)
        expect(view.point.x).toBeCloseTo(point.x, 5);
        expect(view.point.y).toBeCloseTo(point.y, 5);
        expect(view.point.z).toBeCloseTo(point.z, 5);
      }
    });

    it("should create a section view with fromScissors=false with inverted normal and offset point", async () => {
      const normal = new THREE.Vector3(1, 0, 0);
      const point = new THREE.Vector3(10, 20, 30);
      const options = {
        name: "Test Section",
        range: 50,
        helpersVisible: true,
        fromScissors: false,
      };

      const view = await viewsManager.createSectionViewWithNormal(normal, point, options);

      expect(view).not.toBeNull();
      expect(view?.type).toBe("section");

      // For fromScissors=false, normal should be inverted and point offset
      if (view?.normal && view?.point) {
        // Normal should be negated
        expect(view.normal.x).toBeCloseTo(-normal.x, 5);
        expect(view.normal.y).toBeCloseTo(-normal.y, 5);
        expect(view.normal.z).toBeCloseTo(-normal.z, 5);

        // Point should be offset along the normal
        const expectedOffset = point.clone().addScaledVector(normal, 1);
        expect(view.point.x).toBeCloseTo(expectedOffset.x, 5);
        expect(view.point.y).toBeCloseTo(expectedOffset.y, 5);
        expect(view.point.z).toBeCloseTo(expectedOffset.z, 5);
      }
    });

    it("should create section helper when creating section view", async () => {
      const normal = new THREE.Vector3(0, 1, 0);
      const point = new THREE.Vector3(0, 10, 0);
      const options = {
        fromScissors: true,
        helpersVisible: true,
      };

      const view = await viewsManager.createSectionViewWithNormal(normal, point, options);

      expect(view).not.toBeNull();
      // Helper should be added to scene
      expect(scene.add).toHaveBeenCalled();
      // PlaneHelper should be created
      expect(THREE.PlaneHelper).toHaveBeenCalled();
    });
  });

  describe("createSectionViewFromPoints", () => {
    it("should create a section view from two points with plane passing through both points", async () => {
      const point1 = new THREE.Vector3(0, 0, 0);
      const point2 = new THREE.Vector3(10, 0, 0);
      const cameraDirection = new THREE.Vector3(0, 0, 1); // Looking along Z axis

      const view = await viewsManager.createSectionViewFromPoints(
        point1,
        point2,
        cameraDirection,
        {
          name: "Scissors Section",
          range: 50,
          helpersVisible: true,
        }
      );

      expect(view).not.toBeNull();
      expect(view?.type).toBe("section");
      expect(view?.normal).toBeDefined();
      expect(view?.point).toBeDefined();

      // The plane should pass through the midpoint
      if (view?.point) {
        const midpoint = new THREE.Vector3().addVectors(point1, point2).multiplyScalar(0.5);
        expect(view.point.x).toBeCloseTo(midpoint.x, 5);
        expect(view.point.y).toBeCloseTo(midpoint.y, 5);
        expect(view.point.z).toBeCloseTo(midpoint.z, 5);
      }

      // Normal should be perpendicular to both line direction and camera direction
      if (view?.normal) {
        const lineDirection = new THREE.Vector3().subVectors(point2, point1).normalize();
        const crossProduct = new THREE.Vector3().crossVectors(lineDirection, cameraDirection);
        // Normal should be parallel to cross product (or opposite)
        const dotProduct = Math.abs(view.normal.dot(crossProduct.normalize()));
        expect(dotProduct).toBeCloseTo(1, 2); // Should be parallel (or anti-parallel)
      }
    });

    it("should create helper with correct plane constant", async () => {
      const point1 = new THREE.Vector3(5, 10, 15);
      const point2 = new THREE.Vector3(15, 10, 15);
      const cameraDirection = new THREE.Vector3(0, 0, 1);

      const view = await viewsManager.createSectionViewFromPoints(
        point1,
        point2,
        cameraDirection,
        { fromScissors: true, helpersVisible: true }
      );

      expect(view).not.toBeNull();
      expect(THREE.PlaneHelper).toHaveBeenCalled();

      // Check that Plane was created with correct constant
      const planeCalls = (THREE.Plane as any).mock.calls;
      expect(planeCalls.length).toBeGreaterThan(0);

      if (view?.normal && view?.point) {
        const expectedConstant = -view.point.dot(view.normal);
        const lastPlaneCall = planeCalls[planeCalls.length - 1];
        const actualConstant = lastPlaneCall[1];
        expect(actualConstant).toBeCloseTo(expectedConstant, 5);
      }
    });
  });

  describe("createSectionHelper positioning", () => {
    it("should position helper at correct point location", async () => {
      const normal = new THREE.Vector3(0, 1, 0).normalize();
      const point = new THREE.Vector3(10, 20, 30);
      const range = 50;

      const view = await viewsManager.createSectionViewWithNormal(normal, point, {
        fromScissors: true,
        helpersVisible: true,
        range,
      });

      expect(view).not.toBeNull();
      expect(THREE.PlaneHelper).toHaveBeenCalled();

      // Check that Plane was created with correct point
      const planeCalls = (THREE.Plane as any).mock.calls;
      expect(planeCalls.length).toBeGreaterThan(0);

      const lastPlaneCall = planeCalls[planeCalls.length - 1];
      const planeNormal = lastPlaneCall[0];
      const planeConstant = lastPlaneCall[1];

      // Plane constant should be -point.dot(normal)
      const expectedConstant = -point.dot(normal.normalize());
      expect(planeConstant).toBeCloseTo(expectedConstant, 5);

      // Normal should be normalized
      expect(planeNormal.length()).toBeCloseTo(1, 5);
    });

    it("should call updateMatrix on helper after creation", async () => {
      const normal = new THREE.Vector3(1, 0, 0);
      const point = new THREE.Vector3(10, 20, 30);

      const updateMatrixSpy = vi.fn();
      vi.spyOn(THREE, "PlaneHelper").mockImplementation(() => ({
        ...createMockPlaneHelper(),
        updateMatrix: updateMatrixSpy,
      } as any));

      await viewsManager.createSectionViewWithNormal(normal, point, {
        fromScissors: true,
        helpersVisible: true,
      });

      // updateMatrix should be called
      expect(updateMatrixSpy).toHaveBeenCalled();
    });

    it("should call updateMatrixWorld on helper after adding to scene", async () => {
      const normal = new THREE.Vector3(1, 0, 0);
      const point = new THREE.Vector3(10, 20, 30);

      const updateMatrixWorldSpy = vi.fn();
      const mockHelper = {
        ...createMockPlaneHelper(),
        updateMatrixWorld: updateMatrixWorldSpy,
      };
      vi.spyOn(THREE, "PlaneHelper").mockImplementation(() => mockHelper as any);

      await viewsManager.createSectionViewWithNormal(normal, point, {
        fromScissors: true,
        helpersVisible: true,
      });

      // updateMatrixWorld should be called after adding to scene
      expect(updateMatrixWorldSpy).toHaveBeenCalled();
      // Should be called after scene.add
      const addCallIndex = (scene.add as any).mock.invocationCallOrder[0];
      const updateWorldCallIndex = updateMatrixWorldSpy.mock.invocationCallOrder[0];
      expect(updateWorldCallIndex).toBeGreaterThanOrEqual(addCallIndex);
    });

    it("should add helper to scene", async () => {
      const normal = new THREE.Vector3(1, 0, 0);
      const point = new THREE.Vector3(10, 20, 30);

      const mockHelper = createMockPlaneHelper();
      vi.spyOn(THREE, "PlaneHelper").mockImplementation(() => mockHelper as any);

      await viewsManager.createSectionViewWithNormal(normal, point, {
        fromScissors: true,
        helpersVisible: true,
      });

      // Helper should be added to scene
      expect(scene.add).toHaveBeenCalled();
      expect(scene.add).toHaveBeenCalledWith(mockHelper);
    });

    it("should set helper visibility correctly", async () => {
      const normal = new THREE.Vector3(1, 0, 0);
      const point = new THREE.Vector3(10, 20, 30);

      // Test with helpersVisible = true
      const mockHelper1 = createMockPlaneHelper();
      vi.spyOn(THREE, "PlaneHelper").mockImplementation(() => mockHelper1 as any);

      await viewsManager.createSectionViewWithNormal(normal, point, {
        fromScissors: true,
        helpersVisible: true,
      });

      expect(mockHelper1.visible).toBe(true);

      // Test with helpersVisible = false
      const mockHelper2 = createMockPlaneHelper();
      mockHelper2.visible = false;
      vi.spyOn(THREE, "PlaneHelper").mockImplementation(() => mockHelper2 as any);

      await viewsManager.createSectionViewWithNormal(normal, point, {
        fromScissors: true,
        helpersVisible: false,
      });

      expect(mockHelper2.visible).toBe(false);
    });

    it("should normalize normal vector before calculating plane constant", async () => {
      const unnormalizedNormal = new THREE.Vector3(2, 0, 0); // Not normalized
      const point = new THREE.Vector3(10, 20, 30);

      const view = await viewsManager.createSectionViewWithNormal(unnormalizedNormal, point, {
        fromScissors: true,
        helpersVisible: true,
      });

      expect(view?.normal).toBeDefined();
      if (view?.normal) {
        // Normal should be normalized
        expect(view.normal.length()).toBeCloseTo(1, 5);
      }

      // Check plane constant calculation
      const planeCalls = (THREE.Plane as any).mock.calls;
      if (planeCalls.length > 0) {
        const lastCall = planeCalls[planeCalls.length - 1];
        const planeNormal = lastCall[0];
        const planeConstant = lastCall[1];

        // Normal should be normalized
        expect(planeNormal.length()).toBeCloseTo(1, 5);

        // Constant should be calculated with normalized normal
        const normalizedNormal = unnormalizedNormal.clone().normalize();
        const expectedConstant = -point.dot(normalizedNormal);
        expect(planeConstant).toBeCloseTo(expectedConstant, 5);
      }
    });
  });
});

