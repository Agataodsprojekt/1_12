# Przykłady API - API Examples

## 🚀 Podstawowe użycie API Gateway

### 1. Upload i parsowanie pliku IFC + Automatyczne Obliczanie Kosztów

```javascript
// Frontend (React) - REKOMENDOWANE SPOSÓB
import axios from 'axios';

const formData = new FormData();
formData.append('file', file);

// Automatyczne obliczanie kosztów (domyślnie włączone)
const response = await axios.post(
  'http://localhost:8000/api/ifc/parse?calculate_costs=true',
  formData,
  {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    timeout: 300000  // 5 minut (parsowanie + koszty może zająć czas)
  }
);

// Odpowiedź zawiera elementy I koszty:
const { elements, costs, element_count, costs_calculated } = response.data;

if (costs) {
  console.log('Całkowity koszt:', costs.summary.grand_total, 'PLN');
  console.log('Materiały:', costs.summary.total_material_cost, 'PLN');
  console.log('Złącza:', costs.summary.total_connection_cost, 'PLN');
}
```

**Bez automatycznego obliczania kosztów:**
```javascript
const response = await axios.post(
  'http://localhost:8000/api/ifc/parse?calculate_costs=false',
  formData
);
// Zwraca tylko: {elements: [...], costs: null}
```

### 2. Pobranie elementów IFC

```javascript
// Bezpośredni endpoint (rekomendowany)
const response = await fetch('http://localhost:8000/api/ifc/elements');
const data = await response.json();
console.log(data.elements);
```

**Alternatywa (generyczne routowanie):**
```javascript
const response = await fetch('http://localhost:8000/api/gateway/route', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    service: 'ifc-parser',
    endpoint: '/api/ifc/elements',
    method: 'GET'
  })
});
```

### 3. Obliczenia konstrukcji

```javascript
// Bezpośredni endpoint (rekomendowany)
const response = await fetch('http://localhost:8000/api/calculations/static', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    elements: [
      {
        global_id: 'xxx',
        type_name: 'IfcBeam',
        properties: {...},
        placement_matrix: [...]
      }
    ],
    loads: {
      dead_load: 100,  // kN/m²
      live_load: 50,
      wind_load: 20
    }
  })
});

const results = await response.json();
// results zawiera: reactions, stresses, displacements, safety_factors
```

### 4. Kalkulacja kosztów (Osobne Wywołanie)

**Uwaga:** Koszty są automatycznie obliczane przy parsowaniu IFC (patrz przykład 1), ale można też wywołać osobno:

```javascript
// Bezpośredni endpoint (rekomendowany)
const response = await fetch('http://localhost:8000/api/costs/calculate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    elements: elementList,
    price_list_id: 'pl-2024-01'  // opcjonalny cennik
  })
});

const costs = await response.json();
// costs zawiera:
// {
//   "summary": {
//     "grand_total": 375000.50,
//     "total_material_cost": 225000.50,
//     "total_connection_cost": 45000.00,
//     "total_labor_cost": 80000.00
//   },
//   "element_costs": [
//     {
//       "element_id": "xxx",
//       "element_name": "Beam-01",
//       "total": 5703.21,
//       "cost_items": [...]
//     }
//   ]
// }
```

### 5. Generowanie danych 3D

**Uwaga:** Obecnie frontend renderuje bezpośrednio z danych IFC (Three.js), ale można użyć 3D Data Service:

```javascript
// Bezpośredni endpoint
const response = await fetch('http://localhost:8000/api/visualization/scene', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    elements: elementList,
    options: {
      color_by: 'cost',  // lub 'material', 'type'
      show_edges: true,
      quality: 'high'
    }
  })
});

const sceneData = await response.json();
// sceneData zawiera: vertices, faces, colors, metadata
```

### 6. Zapis projektu

```javascript
// Bezpośredni endpoint (rekomendowany)
const response = await fetch('http://localhost:8000/api/projects', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Projekt Hala',
    description: 'Hala przemysłowa',
    metadata: {
      ifc_file: 'KONSTRUKCJA_NAWA_III.ifc',
      element_count: 3017
    }
  })
});

const project = await response.json();
// project zawiera: project_id, created_at, version
```

---

## 🔄 Kompleksowy Workflow (React Hook)

```javascript
// hooks/useIfcWorkflow.js
import { useState } from 'react';
import axios from 'axios';

export const useIfcWorkflow = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    elements: null,
    calculations: null,
    costs: null,
    scene3D: null
  });

  const processIfcFile = async (file) => {
    setLoading(true);
    setError(null);

    try {
      // 1. Upload i parsowanie IFC + automatyczne obliczanie kosztów
      const formData = new FormData();
      formData.append('file', file);
      
      const parseResponse = await axios.post(
        '/api/ifc/parse?calculate_costs=true',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          timeout: 300000  // 5 minut
        }
      );

      const { elements, costs } = parseResponse.data;
      setData(prev => ({ ...prev, elements, costs }));

      // 2. Opcjonalnie: Obliczenia konstrukcyjne (jeśli potrzebne)
      const calcResponse = await axios.post('/api/calculations/static', {
        elements: elements,
        loads: {
          dead_load: 100,
          live_load: 50
        }
      });

      setData(prev => ({
        ...prev,
        calculations: calcResponse.data.results
      }));

      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return { processIfcFile, data, loading, error };
};
```

---

## 📝 TypeScript Types (dla Frontend)

```typescript
// types/api.ts

interface GatewayRequest {
  service: 'ifc-parser' | 'calculation-engine' | 'cost-calculator' | 
           '3d-data' | 'database-manager';
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
}

interface IfcElement {
  global_id: string;
  type_name: string;
  name: string;
  properties: Record<string, string>;
  placement_matrix?: number[];
}

interface CalculationResult {
  reactions: number[];
  stresses: number[];
  displacements: number[];
  safety_factors: Record<string, number>;
}

interface CostBreakdown {
  total_cost: number;
  material_cost: number;
  labor_cost: number;
  overhead: number;
  breakdown: Array<{
    element_id: string;
    cost: number;
    details: Record<string, any>;
  }>;
}

interface Scene3D {
  vertices: number[];
  faces: number[];
  colors: number[];
  metadata: {
    bounding_box: number[];
    element_count: number;
  };
}
```

---

## 🛠️ Utility Function (React)

```javascript
// utils/apiClient.js

const API_BASE = 'http://localhost:8000/api';

export const apiClient = {
  // Bezpośrednie endpointy (rekomendowane)
  async parseIfc(file, calculateCosts = true) {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(
      `${API_BASE}/ifc/parse?calculate_costs=${calculateCosts}`,
      {
        method: 'POST',
        body: formData
      }
    );
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }
    
    return response.json();
  },

  async calculateStatic(elements, loads) {
    const response = await fetch(`${API_BASE}/calculations/static`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ elements, loads })
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }
    
    return response.json();
  },

  async calculateCosts(elements, priceListId = null) {
    const response = await fetch(`${API_BASE}/costs/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        elements,
        price_list_id: priceListId
      })
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }
    
    return response.json();
  },

  async generateScene(elements, options = {}) {
    const response = await fetch(`${API_BASE}/visualization/scene`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ elements, options })
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }
    
    return response.json();
  },

  // Generyczne routowanie (dla zaawansowanych przypadków)
  async request(service, endpoint, method = 'GET', data = null) {
    const response = await fetch(`${API_BASE}/gateway/route`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        service,
        endpoint,
        method,
        data
      })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  }
};
```

---

## 🎯 Przykład użycia w React Component

```javascript
// components/IfcProcessor.jsx
import { useState } from 'react';
import { apiClient } from '../utils/apiClient';
import { Visualization3D } from './Visualization3D';

export const IfcProcessor = () => {
  const [elements, setElements] = useState([]);
  const [calculations, setCalculations] = useState(null);
  const [costs, setCosts] = useState(null);
  const [scene3D, setScene3D] = useState(null);

  const handleFileUpload = async (file) => {
    try {
      // 1. Parse IFC + automatyczne obliczanie kosztów (jeden request!)
      const parseResult = await apiClient.parseIfc(file, true);
      // parseResult zawiera: {elements, costs, element_count, costs_calculated}
      
      setElements(parseResult.elements);
      setCosts(parseResult.costs);  // Koszty już obliczone!

      // 2. Opcjonalnie: Obliczenia konstrukcyjne (jeśli potrzebne)
      const calcResult = await apiClient.calculateStatic(parseResult.elements, {
        dead_load: 100,
        live_load: 50
      });
      setCalculations(calcResult.results);

      // 3. Opcjonalnie: Generowanie sceny 3D (obecnie frontend renderuje bezpośrednio)
      // const vizResult = await apiClient.generateScene(parseResult.elements);
      // setScene3D(vizResult);
    } catch (error) {
      console.error('Error processing IFC:', error);
    }
  };

  return (
    <div>
      <input type="file" onChange={(e) => handleFileUpload(e.target.files[0])} />
      
      {scene3D && <Visualization3D sceneData={scene3D} />}
      
      {elements.length > 0 && (
        <table>
          {/* Render elements */}
        </table>
      )}
      
      {costs && (
        <div>
          <h3>Koszt całkowity: {costs.total_cost} PLN</h3>
        </div>
      )}
    </div>
  );
};
```

