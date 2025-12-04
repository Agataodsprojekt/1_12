/**
 * API client for backend communication
 * Handles IFC file parsing, cost calculation, and all visualization features
 */

import axios from 'axios';
import { ParseResponse } from '../types/ifc';
import * as THREE from 'three';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Types
export interface View {
  id: string;
  project_id: string;
  name: string;
  type: 'storey' | 'elevation' | 'section';
  data?: any;
  created_at?: string;
  updated_at?: string;
}

export interface Pin {
  element_id: string;
  color: string;
  project_id: string;
  created_at?: string;
}

export interface Selection {
  id: string;
  project_id: string;
  name: string;
  element_ids: string[];
  metadata?: any;
  created_at?: string;
}

export interface Comment {
  id: string;
  project_id: string;
  text: string;
  element_id?: string;
  element_name?: string;
  metadata?: any;
  created_at?: string;
  updated_at?: string;
}

export interface Measurement {
  id: string;
  project_id: string;
  type: 'dimension' | 'volume';
  data: any;
  created_at?: string;
}

export const api = {
  /**
   * Parse IFC file and calculate costs
   */
  parseIFC: async (file: File): Promise<ParseResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await axios.post<ParseResponse>(
      `${API_URL}/api/ifc/parse?calculate_costs=true`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000,
      }
    );
    
    return response.data;
  },

  // Views API
  views: {
    create: async (projectId: string, name: string, type: string, data: any): Promise<View> => {
      const response = await axios.post<View>(`${API_URL}/api/visualization/views`, {
        project_id: projectId,
        name,
        type,
        data,
      });
      return response.data;
    },

    getAll: async (projectId: string): Promise<View[]> => {
      const response = await axios.get<{ views: View[] }>(`${API_URL}/api/visualization/views/${projectId}`);
      return response.data.views;
    },

    update: async (viewId: string, viewData: any): Promise<View> => {
      try {
        const response = await axios.put<View>(`${API_URL}/api/visualization/views/${viewId}`, viewData);
        return response.data;
      } catch (error: any) {
        // If view doesn't exist (404), return a local view object instead of throwing
        // This allows locally created views to work without backend sync
        if (error?.response?.status === 404) {
          return {
            id: viewId,
            project_id: '',
            name: '',
            type: 'section',
            ...viewData,
          } as View;
        }
        throw error;
      }
    },

    delete: async (viewId: string): Promise<void> => {
      await axios.delete(`${API_URL}/api/visualization/views/${viewId}`);
    },
  },

  // Pins API
  pins: {
    create: async (projectId: string, elementId: string, color: string): Promise<Pin> => {
      const response = await axios.post<Pin>(`${API_URL}/api/visualization/pins`, {
        project_id: projectId,
        element_id: elementId,
        color,
      });
      return response.data;
    },

    delete: async (projectId: string, elementId: string): Promise<void> => {
      await axios.delete(`${API_URL}/api/visualization/pins/${projectId}/${elementId}`);
    },

    getAll: async (projectId: string): Promise<Pin[]> => {
      const response = await axios.get<{ pins: Pin[] }>(`${API_URL}/api/visualization/pins/${projectId}`);
      return response.data.pins;
    },

    update: async (projectId: string, elementId: string, color: string): Promise<Pin> => {
      const response = await axios.put<Pin>(
        `${API_URL}/api/visualization/pins/${projectId}/${elementId}?color=${encodeURIComponent(color)}`
      );
      return response.data;
    },
  },

  // Selections API
  selections: {
    create: async (projectId: string, name: string, elementIds: string[], metadata?: any): Promise<Selection> => {
      const response = await axios.post<Selection>(`${API_URL}/api/visualization/selections`, {
        project_id: projectId,
        name,
        element_ids: elementIds,
        metadata,
      });
      return response.data;
    },

    getAll: async (projectId: string): Promise<Selection[]> => {
      const response = await axios.get<{ selections: Selection[] }>(
        `${API_URL}/api/visualization/selections/${projectId}`
      );
      return response.data.selections;
    },

    isolate: async (selectionId: string): Promise<void> => {
      await axios.post(`${API_URL}/api/visualization/selections/${selectionId}/isolate`);
    },

    show: async (selectionId: string): Promise<void> => {
      await axios.post(`${API_URL}/api/visualization/selections/${selectionId}/show`);
    },

    hide: async (selectionId: string): Promise<void> => {
      await axios.post(`${API_URL}/api/visualization/selections/${selectionId}/hide`);
    },
  },

  // Comments API
  comments: {
    create: async (projectId: string, text: string, elementId?: string, elementName?: string): Promise<Comment> => {
      const response = await axios.post<Comment>(`${API_URL}/api/projects/${projectId}/comments`, {
        text,
        element_id: elementId,
        element_name: elementName,
      });
      return response.data;
    },

    getAll: async (projectId: string, elementId?: string): Promise<Comment[]> => {
      const url = elementId
        ? `${API_URL}/api/projects/${projectId}/comments/${elementId}`
        : `${API_URL}/api/projects/${projectId}/comments`;
      const response = await axios.get<{ comments: Comment[] }>(url);
      return response.data.comments;
    },

    update: async (projectId: string, commentId: string, text: string): Promise<Comment> => {
      const response = await axios.put<Comment>(`${API_URL}/api/projects/${projectId}/comments/${commentId}`, {
        text,
      });
      return response.data;
    },

    delete: async (projectId: string, commentId: string): Promise<void> => {
      await axios.delete(`${API_URL}/api/projects/${projectId}/comments/${commentId}`);
    },
  },

  // Measurements API
  measurements: {
    calculateDimension: async (
      point1: THREE.Vector3,
      point2: THREE.Vector3,
      projectId: string
    ): Promise<Measurement> => {
      const response = await axios.post<Measurement>(`${API_URL}/api/calculations/dimensions`, {
        point1: { x: point1.x, y: point1.y, z: point1.z },
        point2: { x: point2.x, y: point2.y, z: point2.z },
        project_id: projectId,
      });
      return response.data;
    },

    calculateVolume: async (points: THREE.Vector3[], projectId: string): Promise<Measurement> => {
      const response = await axios.post<Measurement>(`${API_URL}/api/calculations/volume`, {
        points: points.map((p) => ({ x: p.x, y: p.y, z: p.z })),
        project_id: projectId,
      });
      return response.data;
    },

    getAll: async (projectId: string): Promise<Measurement[]> => {
      const response = await axios.get<{ measurements: Measurement[] }>(
        `${API_URL}/api/calculations/measurements/${projectId}`
      );
      return response.data.measurements;
    },
  },

  // Search API
  search: {
    searchElements: async (query: string, elements: any[]): Promise<any[]> => {
      const response = await axios.post<{ elements: any[] }>(`${API_URL}/api/ifc/search`, {
        query,
        elements,
      });
      return response.data.elements;
    },

    filterElements: async (filters: any, elements: any[]): Promise<any[]> => {
      const response = await axios.post<{ elements: any[] }>(`${API_URL}/api/ifc/filter`, {
        filters,
        elements,
      });
      return response.data.elements;
    },
  },
};

