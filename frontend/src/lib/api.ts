/**
 * API client for backend communication
 * Handles IFC file parsing and cost calculation
 */

import axios from 'axios';
import { ParseResponse } from '../types/ifc';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = {
  /**
   * Parse IFC file and calculate costs
   * @param file - IFC file to parse
   * @returns Parsed elements and calculated costs
   */
  parseIFC: async (file: File): Promise<ParseResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await axios.post<ParseResponse>(
      `${API_URL}/api/ifc/parse?calculate_costs=true`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000, // 5 minut timeout (parsowanie + obliczanie kosztów może zająć więcej czasu)
      }
    );
    
    return response.data;
  },
};

