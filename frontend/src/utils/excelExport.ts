/**
 * Utility for exporting IFC elements to Excel
 */
import { IFCElement, Costs } from '../types/ifc';
import { SelectedElement } from '../components/SelectionPanel';
import type { Comment } from '../hooks/useComments';

export interface ElementExportData {
  globalId: string;
  name: string;
  type: string;
  positionX?: number;
  positionY?: number;
  positionZ?: number;
  volume?: number;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  material?: string;
  objectType?: string;
  cost?: number;
  comments?: string;
  [key: string]: any; // For additional properties
}

/**
 * Helper function to extract value from IFC property
 */
function extractPropertyValue(prop: any): any {
  if (!prop) return null;
  if (prop.value !== undefined) return prop.value;
  if (typeof prop === 'string' || typeof prop === 'number' || typeof prop === 'boolean') return prop;
  if (prop.name !== undefined) return prop.name;
  return prop;
}

/**
 * Helper function to recursively extract all properties from an object
 */
function extractAllProperties(obj: any, prefix: string = '', result: Record<string, any> = {}): Record<string, any> {
  if (!obj || typeof obj !== 'object') return result;
  
  for (const [key, value] of Object.entries(obj)) {
    // Skip internal/metadata properties
    if (key.startsWith('_') || key === 'constructor' || key === 'prototype') continue;
    
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (value && typeof value === 'object') {
      // If it has a value property, extract it
      if ('value' in value) {
        result[fullKey] = extractPropertyValue(value);
      } else if ('name' in value && 'value' in value) {
        // For objects with both name and value, prefer name for Material
        if (key.toLowerCase().includes('material')) {
          result[fullKey] = (value as any).name || (value as any).value;
        } else {
          result[fullKey] = extractPropertyValue(value);
        }
      } else if (Array.isArray(value)) {
        // For arrays, extract values
        result[fullKey] = value.map(item => extractPropertyValue(item)).join(', ');
      } else {
        // Recursively extract nested properties
        extractAllProperties(value, fullKey, result);
      }
    } else {
      result[fullKey] = value;
    }
  }
  
  return result;
}

/**
 * Get full properties for an element from IFC model
 */
export async function getElementProperties(
  model: any,
  expressID: number
): Promise<Record<string, any>> {
  try {
    if (!model || typeof model.getProperties !== 'function') {
      return {};
    }

    const properties = await model.getProperties(expressID);
    if (!properties) {
      return {};
    }

    const result: Record<string, any> = {};

    // Extract BaseQuantities first (priority)
    const baseQuantities = (properties as any).BaseQuantities || (properties as any).IFCELEMENTQUANTITY;
    if (baseQuantities) {
      // Extract all BaseQuantities properties
      for (const [key, value] of Object.entries(baseQuantities)) {
        if (key === 'NetVolume') {
          result.volume = extractPropertyValue(value);
        } else if (key === 'NetWeight') {
          result.weight = extractPropertyValue(value);
        } else if (key === 'Length') {
          result.length = extractPropertyValue(value);
        } else if (key === 'Width') {
          result.width = extractPropertyValue(value);
        } else if (key === 'Height') {
          result.height = extractPropertyValue(value);
        } else if (key === 'OuterSurfaceArea') {
          result.surfaceArea = extractPropertyValue(value);
        } else {
          // Add other BaseQuantities with normalized key
          const normalizedKey = key.charAt(0).toLowerCase() + key.slice(1);
          result[`baseQuantities.${normalizedKey}`] = extractPropertyValue(value);
        }
      }
    }

    // Extract Material with priority on name - check multiple possible locations
    const extractMaterialValue = (materialObj: any): string | null => {
      if (!materialObj) return null;
      
      // Direct string value
      if (typeof materialObj === 'string') {
        return materialObj;
      }
      
      // Check for name property (priority for IFCMATERIAL)
      if ((materialObj as any).name) {
        return String((materialObj as any).name);
      }
      
      // Check for value property
      if ((materialObj as any).value) {
        return String((materialObj as any).value);
      }
      
      // Check for nested Material structure
      if ((materialObj as any).Material) {
        const nested = extractMaterialValue((materialObj as any).Material);
        if (nested) return nested;
      }
      
      // Try to extract from nested structure recursively
      const extracted = extractAllProperties(materialObj, 'Material');
      if (extracted['Material.name']) {
        return String(extracted['Material.name']);
      }
      if (extracted['Material.value']) {
        return String(extracted['Material.value']);
      }
      
      // Check for common Material property names
      const materialKeys = ['Name', 'name', 'Value', 'value', 'MaterialName', 'materialName'];
      for (const key of materialKeys) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((materialObj as any)[key]) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return String((materialObj as any)[key]);
        }
      }
      
      return null;
    };

    // Check Material in various possible locations
    let materialValue: string | null = null;
    const anyProps = properties as any;
    
    // Priority 1: Material (direct)
    if (anyProps.Material) {
      materialValue = extractMaterialValue(anyProps.Material);
    }
    
    // Priority 2: MATERIAL (uppercase)
    if (!materialValue && anyProps.MATERIAL) {
      materialValue = extractMaterialValue(anyProps.MATERIAL);
    }
    
    // Priority 3: IFCMATERIAL (as shown in UI)
    if (!materialValue && anyProps.IFCMATERIAL) {
      materialValue = extractMaterialValue(anyProps.IFCMATERIAL);
    }
    
    // Priority 4: IfcMaterial (camelCase)
    if (!materialValue && anyProps.IfcMaterial) {
      materialValue = extractMaterialValue(anyProps.IfcMaterial);
    }
    
    // Priority 5: ifcMaterial (lowercase)
    if (!materialValue && anyProps.ifcMaterial) {
      materialValue = extractMaterialValue(anyProps.ifcMaterial);
    }
    
    // Priority 6: MaterialAssociations
    if (!materialValue && anyProps.MaterialAssociations) {
      const associations = Array.isArray(anyProps.MaterialAssociations) 
        ? anyProps.MaterialAssociations 
        : [anyProps.MaterialAssociations];
      
      for (const assoc of associations as any[]) {
        if (assoc && assoc.RelatingMaterial) {
          materialValue = extractMaterialValue(assoc.RelatingMaterial);
          if (materialValue) break;
        }
        if (assoc && assoc.Material) {
          materialValue = extractMaterialValue(assoc.Material);
          if (materialValue) break;
        }
      }
    }
    
    // Priority 7: HasAssociations (check for Material associations)
    if (!materialValue && anyProps.HasAssociations) {
      const associations = Array.isArray(anyProps.HasAssociations) 
        ? anyProps.HasAssociations 
        : [anyProps.HasAssociations];
      
      for (const assoc of associations as any[]) {
        if (assoc && (assoc.type === 'IFCRELASSOCIATESMATERIAL' || assoc.type === 'IfcRelAssociatesMaterial')) {
          if (assoc.RelatingMaterial) {
            materialValue = extractMaterialValue(assoc.RelatingMaterial);
            if (materialValue) break;
          }
          if (assoc.Material) {
            materialValue = extractMaterialValue(assoc.Material);
            if (materialValue) break;
          }
        }
      }
    }
    
    // If material found, add it
    if (materialValue) {
      result.material = materialValue;
      result.ifcMaterial = materialValue; // Also add as ifcMaterial for clarity
    }

    // Extract common properties
    if (anyProps.Name) {
      result.name = extractPropertyValue(anyProps.Name);
    }
    if (anyProps.GlobalId) {
      result.globalId = extractPropertyValue(anyProps.GlobalId);
    }
    if (anyProps.ObjectType) {
      result.objectType = extractPropertyValue(anyProps.ObjectType);
    }
    if (anyProps.Type) {
      result.type = extractPropertyValue(anyProps.Type);
    }

    // Extract all other properties recursively
    extractAllProperties(anyProps, '', result);
    
    // Also check PropertySets if they exist
    if (anyProps.PropertySets && Array.isArray(anyProps.PropertySets)) {
      for (const propSet of anyProps.PropertySets as any[]) {
        if (propSet && propSet.Properties && Array.isArray(propSet.Properties)) {
          for (const prop of propSet.Properties as any[]) {
            if (prop.Name && prop.NominalValue) {
              const propName = extractPropertyValue(prop.Name);
              const propValue = extractPropertyValue(prop.NominalValue);
              if (propName && propValue !== null && propValue !== undefined) {
                result[propName] = propValue;
                
                // If this is a Material property, also set it as material if not already set
                const propNameLower = String(propName).toLowerCase();
                if ((propNameLower === 'material' || propNameLower === 'ifcmaterial' || propNameLower.includes('material')) && !result.material) {
                  result.material = String(propValue);
                  result.ifcMaterial = String(propValue);
                }
              }
            }
          }
        }
      }
    }

    // Check for direct properties object
    if (anyProps.properties && typeof anyProps.properties === 'object') {
      extractAllProperties(anyProps.properties, '', result);
    }

    // AGGRESSIVE SEARCH: Look for Material in ALL keys (case-insensitive)
    if (!result.material) {
      const searchForMaterial = (obj: any, path: string = ''): string | null => {
        if (!obj || typeof obj !== 'object') return null;
        
        for (const [key, value] of Object.entries(obj)) {
          const keyLower = String(key).toLowerCase();
          
          // Check if key contains "material"
          if (keyLower.includes('material') && value) {
            const materialVal = extractMaterialValue(value);
            if (materialVal) {
              return materialVal;
            }
          }
          
          // Recursively search nested objects (but limit depth to avoid infinite loops)
          if (value && typeof value === 'object' && path.split('.').length < 5) {
            const nested = searchForMaterial(value, path ? `${path}.${key}` : key);
            if (nested) return nested;
          }
        }
        
        return null;
      };
      
      const foundMaterial = searchForMaterial(anyProps);
      if (foundMaterial) {
        result.material = foundMaterial;
        result.ifcMaterial = foundMaterial;
      }
    }

    // Also check if Material was found by extractAllProperties but with different key
    if (!result.material) {
      for (const [key, value] of Object.entries(result)) {
        const keyLower = String(key).toLowerCase();
        if (keyLower.includes('material') && value) {
          // If value is an object, try to extract name or value
          let materialVal: unknown = value;
          if (value && typeof value === 'object') {
            materialVal = (value as any).name || (value as any).value || (value as any).Name || (value as any).Value || String(value);
          }
          result.material = String(materialVal);
          result.ifcMaterial = String(materialVal);
          break;
        }
      }
    }
    
    // FINAL ATTEMPT: Deep search in ALL nested structures for anything that looks like Material
    if (!result.material) {
      const deepSearch = (obj: any, depth: number = 0): string | null => {
        if (depth > 6 || !obj || typeof obj !== 'object') return null;
        
        // Check if this object itself is a Material (has Name property with material-like value)
        if ((obj as any).Name || (obj as any).name) {
          const name = String(
            (obj as any).Name?.value ||
            (obj as any).name?.value ||
            (obj as any).Name ||
            (obj as any).name ||
            ''
          );
          if (name && (name.toLowerCase().includes('steel') || name.toLowerCase().includes('s355') || name.includes('/'))) {
            return name;
          }
        }
        
        // Check all properties recursively
        for (const [key, value] of Object.entries(obj)) {
          if (key.startsWith('_') || key === 'constructor') continue;
          
          const keyLower = String(key).toLowerCase();
          
          // If key suggests Material
          if (keyLower.includes('material') && value) {
            const found = extractMaterialValue(value) || deepSearch(value, depth + 1);
            if (found) return found;
          }
          
          // If value is an object, search recursively
          if (value && typeof value === 'object' && !Array.isArray(value)) {
            const found = deepSearch(value, depth + 1);
            if (found) return found;
          }
          
          // If value is array, check first element
          if (Array.isArray(value) && value.length > 0) {
            const found = deepSearch(value[0], depth + 1);
            if (found) return found;
          }
        }
        
        return null;
      };
      
      const found = deepSearch(anyProps);
      if (found) {
        result.material = found;
        result.ifcMaterial = found;
      }
    }

    return result;
  } catch (error) {
    console.warn(`Failed to get properties for element ${expressID}:`, error);
    return {};
  }
}

/**
 * Convert element data to export format
 */
function elementToExportData(
  element: IFCElement,
  ifcProperties?: Record<string, any>,
  cost?: number
): ElementExportData {
  const data: ElementExportData = {
    globalId: element.global_id || '',
    name: element.name || '',
    type: element.type_name || '',
  };

  // Add position
  if (element.position) {
    data.positionX = element.position[0];
    data.positionY = element.position[1];
    data.positionZ = element.position[2];
  }

  // Add ALL IFC properties (not just selected ones)
  if (ifcProperties) {
    // Copy all properties to data object
    Object.assign(data, ifcProperties);
    
    // Ensure standard properties are set (may be overridden by ifcProperties)
    if (ifcProperties.volume !== undefined) data.volume = ifcProperties.volume;
    if (ifcProperties.weight !== undefined) data.weight = ifcProperties.weight;
    if (ifcProperties.length !== undefined) data.length = ifcProperties.length;
    if (ifcProperties.width !== undefined) data.width = ifcProperties.width;
    if (ifcProperties.height !== undefined) data.height = ifcProperties.height;
    if (ifcProperties.material) data.material = ifcProperties.material;
    if (ifcProperties.objectType) data.objectType = ifcProperties.objectType;
  }

  // Add any additional properties from element.properties (from backend)
  if (element.properties) {
    Object.assign(data, element.properties);
    
    // Check for Material in element.properties (case-insensitive search)
    if (!data.material) {
      for (const [key, value] of Object.entries(element.properties)) {
        const keyLower = String(key).toLowerCase();
        if (keyLower.includes('material') && value) {
          // Try to extract Material value
          let materialVal: string | null = null;
          if (typeof value === 'string') {
            materialVal = value;
          } else if (value && typeof value === 'object') {
            if ((value as any).name) {
              materialVal = String((value as any).name);
            } else if ((value as any).value) {
              materialVal = String((value as any).value);
            } else {
              materialVal = String(value);
            }
          } else {
            materialVal = String(value);
          }
          
          if (materialVal) {
            data.material = materialVal;
            (data as any).ifcMaterial = materialVal;
            break;
          }
        }
      }
    }
  }

  // Add cost if available
  if (cost !== undefined) {
    data.cost = cost;
  }

  return data;
}

/**
 * Group elements by type
 */
function groupElementsByType(elements: ElementExportData[]): Map<string, ElementExportData[]> {
  const grouped = new Map<string, ElementExportData[]>();

  for (const element of elements) {
    const type = element.type || 'Unknown';
    if (!grouped.has(type)) {
      grouped.set(type, []);
    }
    grouped.get(type)!.push(element);
  }

  return grouped;
}

/**
 * Collect all unique property keys from elements
 */
function collectAllPropertyKeys(elements: ElementExportData[]): string[] {
  const allKeys = new Set<string>();
  
  // Standard keys that should always be first
  const standardKeys = [
    'globalId',
    'name',
    'type',
    'positionX',
    'positionY',
    'positionZ',
  ];
  
  // BaseQuantities keys (priority order)
  const baseQuantityKeys = [
    'volume',
    'weight',
    'length',
    'width',
    'height',
    'surfaceArea',
  ];
  
  // Material keys
  const materialKey = 'material';
  const ifcMaterialKey = 'ifcMaterial';
  const commentsKey = 'comments';
  
  // Collect all keys from all elements
  for (const element of elements) {
    for (const key of Object.keys(element)) {
      // Skip cost - will be added separately if available
      if (key === 'cost') continue;
      allKeys.add(key);
    }
  }
  
  // Build ordered column list
  const orderedColumns: string[] = [];
  
  // 1. Standard keys (always first)
  for (const key of standardKeys) {
    if (allKeys.has(key)) {
      orderedColumns.push(key);
      allKeys.delete(key);
    }
  }
  
  // 2. BaseQuantities keys
  for (const key of baseQuantityKeys) {
    if (allKeys.has(key)) {
      orderedColumns.push(key);
      allKeys.delete(key);
    }
  }
  
  // 3. Material (and IFC Material)
  if (allKeys.has(materialKey)) {
    orderedColumns.push(materialKey);
    allKeys.delete(materialKey);
  }
  if (allKeys.has(ifcMaterialKey)) {
    orderedColumns.push(ifcMaterialKey);
    allKeys.delete(ifcMaterialKey);
  }
  // 4. Comments (jeśli są)
  if (allKeys.has(commentsKey)) {
    orderedColumns.push(commentsKey);
    allKeys.delete(commentsKey);
  }
  
  // 5. Other BaseQuantities (with prefix)
  const otherBaseQuantities = Array.from(allKeys)
    .filter(key => key.startsWith('baseQuantities.'))
    .sort();
  orderedColumns.push(...otherBaseQuantities);
  otherBaseQuantities.forEach(key => allKeys.delete(key));
  
  // 6. All other keys alphabetically
  const otherKeys = Array.from(allKeys).sort();
  orderedColumns.push(...otherKeys);
  
  return orderedColumns;
}

/**
 * Convert property key to column header name
 */
function propertyKeyToColumnName(key: string): string {
  // Handle special cases
  const mapping: Record<string, string> = {
    'globalId': 'Global ID',
    'name': 'Name',
    'type': 'Type',
    'positionX': 'Position X (m)',
    'positionY': 'Position Y (m)',
    'positionZ': 'Position Z (m)',
    'volume': 'Volume (m³)',
    'weight': 'Weight (kg)',
    'length': 'Length (m)',
    'width': 'Width (m)',
    'height': 'Height (m)',
    'surfaceArea': 'Surface Area (m²)',
    'material': 'Material',
    'ifcMaterial': 'IFC Material',
    'comments': 'Comments',
    'objectType': 'Object Type',
  };
  
  if (mapping[key]) {
    return mapping[key];
  }
  
  // Handle IFCMATERIAL variations
  if (key.toLowerCase() === 'ifcmaterial' || key === 'IFCMATERIAL') {
    return 'IFC Material';
  }
  
  // Convert camelCase to Title Case
  const titleCase = key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
  
  // Handle baseQuantities prefix
  if (key.startsWith('baseQuantities.')) {
    const propName = key.replace('baseQuantities.', '');
    return `BaseQuantities.${propName.charAt(0).toUpperCase() + propName.slice(1)}`;
  }
  
  return titleCase;
}

/**
 * Create summary sheet data
 */
function createSummarySheet(costs: Costs | null, elementCount: number): any[][] {
  const rows: any[][] = [
    ['IFC Construction Calculator - Documentation Export'],
    ['Generated:', new Date().toLocaleString('pl-PL')],
    ['Total Elements:', elementCount],
    [],
  ];

  if (costs && costs.summary) {
    rows.push(['Cost Summary']);
    rows.push(['Grand Total:', costs.summary.grand_total?.toFixed(2) || '0.00', 'PLN']);
    rows.push(['Material Cost:', costs.summary.total_material_cost?.toFixed(2) || '0.00', 'PLN']);
    rows.push(['Connection Cost:', costs.summary.total_connection_cost?.toFixed(2) || '0.00', 'PLN']);
    rows.push(['Labor Cost:', costs.summary.total_labor_cost?.toFixed(2) || '0.00', 'PLN']);
  }

  return rows;
}

/**
 * Export elements to Excel file
 */
export async function exportElementsToExcel(
  elements: IFCElement[],
  loadedModels: any[],
  selectedElements?: SelectedElement[],
  costs?: Costs | null,
  exportAll: boolean = true,
  comments?: Comment[]
): Promise<void> {
  try {
    // Dynamic import of xlsx library
    let XLSX: any;
    try {
      const xlsxModule = await import('xlsx');
      // Sprawdź różne możliwe eksporty biblioteki xlsx
      if ((xlsxModule as any).default) {
        XLSX = (xlsxModule as any).default;
      } else if ((xlsxModule as any).utils) {
        // Jeśli moduł ma już utils, użyj go bezpośrednio
        XLSX = xlsxModule;
      } else {
        XLSX = xlsxModule;
      }
      
      // Walidacja - sprawdź czy XLSX ma wymagane metody
      if (!XLSX || !XLSX.utils || !XLSX.utils.book_new || !XLSX.utils.aoa_to_sheet) {
        throw new Error('Biblioteka xlsx nie ma wymaganych metod. Sprawdź instalację.');
      }
    } catch (importError) {
      alert('Biblioteka xlsx nie jest zainstalowana lub jest uszkodzona. Uruchom: npm install xlsx');
      console.error('Failed to import xlsx:', importError);
      return;
    }
    // Filter elements based on exportAll flag
    let elementsToExport: IFCElement[] = [];
    
    if (exportAll) {
      elementsToExport = elements;
    } else {
      // Export only selected elements
      if (!selectedElements || selectedElements.length === 0) {
        alert('Brak zaznaczonych elementów do eksportu.');
        return;
      }

      // Try to match selected elements with IFCElement by name/type
      // If not found, we'll create a basic element from selectedElement data
      const matchedElements: IFCElement[] = [];
      for (const sel of selectedElements) {
        const matched = elements.find(
          el => el.name === sel.name || el.type_name === sel.type
        );
        if (matched) {
          matchedElements.push(matched);
        } else {
          // Create a basic IFCElement from selectedElement
          matchedElements.push({
            global_id: `expressID_${sel.expressID}`,
            type_name: sel.type,
            name: sel.name,
          });
        }
      }
      elementsToExport = matchedElements;
    }

    // Don't show alert if we're exporting all and will fetch from loadedModels
    if (elementsToExport.length === 0 && !exportAll) {
      alert('Brak elementów do eksportu.');
      return;
    }

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Create summary sheet if costs are available
    if (costs) {
      const summaryData = createSummarySheet(costs, elementsToExport.length);
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
    }

    // Collect all element data with properties
    const elementData: ElementExportData[] = [];
    const costMap = new Map<string, number>(); // global_id -> cost

    // TODO: Map costs to elements if detailed cost data is available
    // For now, we'll use summary costs divided by element count as approximation
    if (costs && costs.summary && elementsToExport.length > 0) {
      const avgCost = costs.summary.grand_total / elementsToExport.length;
      elementsToExport.forEach(el => {
        costMap.set(el.global_id, avgCost);
      });
    }

    // Map komentarzy po expressID (elementId w komentarzu to string z expressID)
    const commentsByExpressId = new Map<number, Comment[]>();
    if (comments && comments.length > 0) {
      for (const comment of comments) {
        if (!comment.elementId) continue;
        const id = Number(comment.elementId);
        if (!Number.isFinite(id)) continue;
        const list = commentsByExpressId.get(id) || [];
        list.push(comment);
        commentsByExpressId.set(id, list);
      }
    }

    // Fetch properties for each element
    console.log(`📊 Fetching properties for ${elementsToExport.length} elements...`);
    
    // Build a map of expressID to element
    const expressIdToElementMap = new Map<number, { element: IFCElement; selectedElement?: SelectedElement }>();
    
    // If exporting selected, we have expressIDs in selectedElements, but here we assume
    // mapping from backend data/global IDs is done at viewer level and only pass elements.
    // For now, we just iterate models and map by global_id when possible.

    // If exporting selected elements, always use expressIDs directly from selectedElements
    if (!exportAll && selectedElements && selectedElements.length > 0) {
      console.log('📊 Exporting selected elements using expressIDs directly...');
      
      const expressIDsToExport = selectedElements.map(sel => sel.expressID).filter(id => id !== undefined);
      
      for (const model of loadedModels) {
        for (const expressID of expressIDsToExport) {
          try {
            const props = await model.getProperties(expressID);
            if (props) {
              const globalId = (props as any).GlobalId?.value || (props as any).global_id || `expressID_${expressID}`;
              const typeName = (props as any).type || (props as any).Type?.value || 'Unknown';
              const name = (props as any).Name?.value || (props as any).name || '';
              
              // Create IFCElement from properties
              const element: IFCElement = {
                global_id: globalId,
                type_name: String(typeName),
                name: String(name),
              };
              
              const selectedElement = selectedElements.find(sel => sel.expressID === expressID);
              
              if (!expressIdToElementMap.has(expressID)) {
                expressIdToElementMap.set(expressID, { element, selectedElement });
              }
            }
          } catch {
            // Skip this element if properties can't be retrieved
          }
        }
      }
    } else if (elementsToExport.length === 0 && loadedModels.length > 0) {
      // If elementsToExport is empty and exporting all, extract all elements from loadedModels
      console.log('📊 No elements from backend, extracting all elements from loaded models...');
      
      for (const model of loadedModels) {
        try {
          for (const item of (model.items || [])) {
            const ids = (item as any).ids;
            if (!ids) continue;

            const idArray: number[] = Array.isArray(ids)
              ? ids
              : ids instanceof Set || ids instanceof Map
              ? Array.from(ids as Set<number> | Map<number, unknown>).map((v: any) =>
                  typeof v === "number" ? v : Array.isArray(v) ? v[0] : Number(v)
                )
              : typeof ids === "object"
              ? Object.keys(ids).map((k) => Number(k))
              : [];

            for (const expressID of idArray) {
              try {
                const props = await model.getProperties(expressID);
                if (props) {
                  const globalId = (props as any).GlobalId?.value || (props as any).global_id || `expressID_${expressID}`;
                  const typeName = (props as any).type || (props as any).Type?.value || 'Unknown';
                  const name = (props as any).Name?.value || (props as any).name || '';
                  
                  // Create IFCElement from properties
                  const element: IFCElement = {
                    global_id: globalId,
                    type_name: String(typeName),
                    name: String(name),
                  };
                  
                  if (!expressIdToElementMap.has(expressID)) {
                    expressIdToElementMap.set(expressID, { element });
                  }
                }
              } catch {
                // Skip this element
              }
            }
          }
        } catch (e) {
          console.warn('Error extracting elements from model:', e);
        }
      }
    } else {
      // For all elements from backend, try to find expressIDs by searching models and matching by global_id
      console.log('📊 Matching elements from backend with models by global_id...');
      for (const model of loadedModels) {
        try {
          for (const item of (model.items || [])) {
            const ids = (item as any).ids;
            if (!ids) continue;

            const idArray: number[] = Array.isArray(ids)
              ? ids
              : ids instanceof Set || ids instanceof Map
              ? Array.from(ids as Set<number> | Map<number, unknown>).map((v: any) =>
                  typeof v === "number" ? v : Array.isArray(v) ? v[0] : Number(v)
                )
              : typeof ids === "object"
              ? Object.keys(ids).map((k) => Number(k))
              : [];

            for (const expressID of idArray) {
              try {
                const props = await model.getProperties(expressID);
                if (props) {
                  const globalId = (props as any).GlobalId?.value || (props as any).global_id;
                  if (globalId) {
                    const matchingElement = elementsToExport.find(
                      el => el.global_id === globalId
                    );
                    if (matchingElement && !expressIdToElementMap.has(expressID)) {
                      expressIdToElementMap.set(expressID, { element: matchingElement });
                    }
                  }
                }
              } catch {
                // Skip this element
              }
            }
          }
        } catch (e) {
          console.warn('Error building expressID map:', e);
        }
      }
    }
    
    for (const [expressID, { element }] of expressIdToElementMap.entries()) {
      // Find the model containing this element
      let elementProperties: Record<string, any> = {};

      // Get properties using expressID
      for (const model of loadedModels) {
        try {
          elementProperties = await getElementProperties(model, expressID);
          if (Object.keys(elementProperties).length > 0) {
            break;
          }
        } catch {
          // Continue to next model
        }
      }

      // Convert to export data
      const cost = costMap.get(element.global_id);
      const exportData = elementToExportData(element, elementProperties, cost);

      // Dodaj komentarze przypisane do tego elementu (po expressID)
      const elementComments = commentsByExpressId.get(expressID);
      if (elementComments && elementComments.length > 0) {
        const commentsText = elementComments
          .map((c) => {
            const date = new Date(c.timestamp);
            const dateStr = date.toLocaleString("pl-PL");
            return `[${dateStr}] ${c.text}`;
          })
          .join("\n---\n");
        exportData.comments = commentsText;
      }

      elementData.push(exportData);
    }

    // Group by type
    const groupedElements = groupElementsByType(elementData);

    // Sprawdź czy są jakieś dane do eksportu
    if (elementData.length === 0) {
      alert('Brak danych do eksportu. Upewnij się, że model IFC jest załadowany.');
      return;
    }

    // Create sheet for each type
    for (const [type, typeElements] of groupedElements) {
      if (typeElements.length === 0) continue;
      
      // Upewnij się że type jest stringiem
      const typeKey = String(type || 'Unknown');

      // Collect all property keys for this type (dynamic columns)
      const propertyKeys = collectAllPropertyKeys(typeElements);
      
      // Convert keys to column names
      const columnHeaders = propertyKeys.map(key => propertyKeyToColumnName(key));
      
      // Add cost column if available
      if (costs) {
        columnHeaders.push('Cost (PLN)');
      }

      // Create data rows
      const rows: any[][] = [columnHeaders];

      for (const element of typeElements) {
        // Build row dynamically based on property keys
        const row: any[] = [];
        
        for (const key of propertyKeys) {
          const value = (element as any)[key];
          
          // Format value based on type
          if (value === null || value === undefined) {
            row.push('');
          } else if (typeof value === 'number') {
            row.push(value);
          } else if (typeof value === 'boolean') {
            row.push(value ? 'TRUE' : 'FALSE');
          } else {
            row.push(String(value));
          }
        }
        
        // Add cost if available
        if (costs) {
          const costValue = typeof element.cost === 'number' ? element.cost.toFixed(2) : '';
          row.push(costValue);
        }

        rows.push(row);
      }

      // Create worksheet - upewnij się że rows są poprawnie sformatowane
      // Sprawdź czy wszystkie wiersze są tablicami i czy mają poprawne dane
      const validRows = rows.filter(row => {
        if (!Array.isArray(row)) return false;
        // Sprawdź czy wszystkie wartości w wierszu są poprawne
        return row.every(cell => 
          cell === null || 
          cell === undefined || 
          typeof cell === 'string' || 
          typeof cell === 'number' || 
          typeof cell === 'boolean'
        );
      }).map(row => 
        // Konwertuj wszystkie wartości na bezpieczne typy
        row.map(cell => {
          if (cell === null || cell === undefined) return '';
          if (typeof cell === 'number') return cell;
          if (typeof cell === 'boolean') return cell ? 'TRUE' : 'FALSE';
          return String(cell);
        })
      );
      
      if (validRows.length === 0) {
        console.warn(`No valid rows for type ${type}, skipping sheet`);
        continue;
      }
      
      let worksheet;
      try {
        // Dodatkowa walidacja przed utworzeniem arkusza
        if (!validRows || validRows.length === 0) {
          console.warn(`No valid rows for type ${typeKey}`);
          continue;
        }
        
        // Sprawdź czy pierwszy wiersz (nagłówki) jest poprawny
        if (!Array.isArray(validRows[0])) {
          console.error(`First row is not an array for type ${typeKey}:`, validRows[0]);
          continue;
        }
        
        worksheet = XLSX.utils.aoa_to_sheet(validRows);
        
        if (!worksheet) {
          console.error(`Failed to create worksheet for type ${typeKey}`);
          continue;
        }
      } catch (error) {
        console.error(`Error creating worksheet for type ${typeKey}:`, error);
        console.error('Error details:', {
          type: typeKey,
          rowsCount: validRows.length,
          firstRow: validRows[0],
          errorMessage: (error as Error).message,
          errorStack: (error as Error).stack
        });
        continue;
      }

      // Set column widths (based on column headers)
      const colWidths = columnHeaders.map((_, i) => {
        if (i === 0) return { wch: 40 }; // Global ID
        if (i === 1) return { wch: 30 }; // Name
        if (i === 2) return { wch: 20 }; // Type
        return { wch: 15 }; // Other columns
      });
      (worksheet as any)['!cols'] = colWidths;

      // Add sheet to workbook (sanitize sheet name - Excel has 31 char limit)
      // Upewnij się że typeKey jest stringiem
      const sheetName = typeKey.length > 31 ? typeKey.substring(0, 31) : typeKey;
      // Usuń nieprawidłowe znaki z nazwy arkusza (Excel nie pozwala na niektóre znaki)
      const sanitizedSheetName = sheetName.replace(/[\\\/\?\*\[\]:]/g, '_');
      
      try {
        XLSX.utils.book_append_sheet(workbook, worksheet, sanitizedSheetName);
      } catch (error) {
        console.error(`Error adding sheet ${sanitizedSheetName}:`, error);
        // Spróbuj z prostszą nazwą
        const fallbackName = `Sheet_${groupedElements.size}`;
        XLSX.utils.book_append_sheet(workbook, worksheet, fallbackName);
      }
    }

    // Sprawdź czy workbook ma jakieś arkusze
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      alert('Nie udało się utworzyć żadnych arkuszy. Sprawdź konsolę przeglądarki dla szczegółów.');
      console.error('Workbook has no sheets. Element data:', elementData.length);
      return;
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `IFC_Documentation_${timestamp}.xlsx`;

    // Write file
    try {
      XLSX.writeFile(workbook, filename);
      console.log(`✅ Exported ${elementData.length} elements to ${filename}`);
      console.log(`📊 Created ${workbook.SheetNames.length} sheets:`, workbook.SheetNames);
    } catch (writeError) {
      console.error('Error writing file:', writeError);
      alert('Błąd podczas zapisywania pliku: ' + (writeError as Error).message);
      throw writeError;
    }
  } catch (error) {
    console.error('❌ Error exporting to Excel:', error);
    alert('Błąd podczas eksportu do Excela: ' + (error as Error).message);
  }
}


