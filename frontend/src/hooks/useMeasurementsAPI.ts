import { useState, useCallback, useEffect } from 'react';
import { api, Measurement } from '../lib/api';
import { useProject } from './useProject';
import * as THREE from 'three';

/**
 * Hook for managing measurements with backend integration
 * Syncs measurement state with backend API
 */
export function useMeasurementsAPI() {
  const { projectId } = useProject();
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [useBackend, setUseBackend] = useState(true);

  // Load measurements from backend on mount
  useEffect(() => {
    if (useBackend && projectId) {
      loadMeasurementsFromBackend();
    }
  }, [projectId, useBackend]);

  const loadMeasurementsFromBackend = useCallback(async () => {
    try {
      setIsLoading(true);
      const loadedMeasurements = await api.measurements.getAll(projectId);
      setMeasurements(loadedMeasurements);
    } catch (error) {
      console.warn('⚠️ Failed to load measurements from backend:', error);
      setUseBackend(false);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const calculateDimension = useCallback(async (
    point1: THREE.Vector3,
    point2: THREE.Vector3
  ): Promise<Measurement> => {
    try {
      const measurement = await api.measurements.calculateDimension(point1, point2, projectId);
      setMeasurements((prev) => [...prev, measurement]);
      return measurement;
    } catch (error) {
      console.warn('⚠️ Failed to calculate dimension in backend:', error);
      setUseBackend(false);
      // Fallback: calculate locally
      const distance = point1.distanceTo(point2);
      const localMeasurement: Measurement = {
        id: `measurement-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        project_id: projectId,
        type: 'dimension',
        data: {
          point1: { x: point1.x, y: point1.y, z: point1.z },
          point2: { x: point2.x, y: point2.y, z: point2.z },
          distance,
        },
        created_at: new Date().toISOString(),
      };
      setMeasurements((prev) => [...prev, localMeasurement]);
      return localMeasurement;
    }
  }, [projectId]);

  const calculateVolume = useCallback(async (
    points: THREE.Vector3[]
  ): Promise<Measurement> => {
    try {
      const measurement = await api.measurements.calculateVolume(points, projectId);
      setMeasurements((prev) => [...prev, measurement]);
      return measurement;
    } catch (error) {
      console.warn('⚠️ Failed to calculate volume in backend:', error);
      setUseBackend(false);
      // Fallback: create placeholder measurement
      const localMeasurement: Measurement = {
        id: `measurement-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        project_id: projectId,
        type: 'volume',
        data: {
          points: points.map((p) => ({ x: p.x, y: p.y, z: p.z })),
          volume: 0, // Would need proper volume calculation
        },
        created_at: new Date().toISOString(),
      };
      setMeasurements((prev) => [...prev, localMeasurement]);
      return localMeasurement;
    }
  }, [projectId]);

  return {
    measurements,
    calculateDimension,
    calculateVolume,
    isLoading,
    reload: loadMeasurementsFromBackend,
  };
}
