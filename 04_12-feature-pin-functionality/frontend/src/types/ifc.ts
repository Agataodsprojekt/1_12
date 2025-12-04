/**
 * TypeScript interfaces for IFC data structures
 * Used for communication with backend API
 */

export interface IFCElement {
  type_name: string;
  global_id: string;
  name?: string;
  position?: [number, number, number];
  placement_matrix?: number[];
  properties?: Record<string, any>;
}

export interface CostSummary {
  grand_total: number;
  total_material_cost: number;
  total_connection_cost: number;
  total_labor_cost: number;
}

export interface Costs {
  summary: CostSummary;
}

export interface ParseResponse {
  elements: IFCElement[];
  costs: Costs | null;
  element_count: number;
  costs_calculated: boolean;
}

