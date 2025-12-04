# Przykład Użycia: Obliczanie Kosztów Całej Budowli

## 1. Prosty Przepływ (Automatyczny)

### Frontend - Jeden Request

```javascript
// frontend/src/components/IFCUploader.jsx

const handleFileUpload = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    // Jeden request - parsowanie + obliczanie kosztów
    const response = await fetch(
      'http://localhost:8000/api/ifc/parse?calculate_costs=true',
      {
        method: 'POST',
        body: formData
      }
    );
    
    const data = await response.json();
    
    // data zawiera:
    // {
    //   elements: [...],        // Elementy z IFC
    //   costs: {...},           // Koszty całej budowli
    //   element_count: 3017,
    //   costs_calculated: true
    // }
    
    if (data.costs) {
      console.log('=== KOSZT CAŁEJ BUDOWLI ===');
      console.log('Całkowity koszt:', data.costs.summary.grand_total, 'PLN');
      console.log('Materiały:', data.costs.summary.total_material_cost, 'PLN');
      console.log('Złącza:', data.costs.summary.total_connection_cost, 'PLN');
      console.log('Robocizna:', data.costs.summary.total_labor_cost, 'PLN');
      
      // Wyświetl w UI
      setTotalCost(data.costs.summary.grand_total);
      setCostBreakdown(data.costs.summary);
    }
    
    // Ustaw elementy dla wizualizacji
    setElements(data.elements);
    
  } catch (error) {
    console.error('Błąd:', error);
  }
};
```

## 2. Struktura Odpowiedzi

### Przykładowa Odpowiedź z API

```json
{
  "elements": [
    {
      "global_id": "3ijbB$3n14CQY4N27uP2iQ",
      "type_name": "IfcBeam",
      "name": "Beam HK542-8-22*400-92",
      "properties": {
        "MATERIAL": "STEEL/S355",
        "BaseQuantities.NetWeight": "1204.2528",
        "CONNECTION_CODE": "Welded"
      }
    },
    // ... 3017 elementów
  ],
  "costs": {
    "project_name": "IFC Project",
    "summary": {
      "total_material_cost": 225000.50,
      "total_connection_cost": 45000.00,
      "total_labor_cost": 80000.00,
      "total_surface_treatment_cost": 20000.00,
      "total_other_cost": 5000.00,
      "grand_total": 375000.50,
      "category_totals": {
        "material": 225000.50,
        "connection": 45000.00,
        "labor": 80000.00,
        "surface_treatment": 20000.00
      }
    },
    "element_costs": [
      {
        "element_id": "3ijbB$3n14CQY4N27uP2iQ",
        "element_type": "IfcBeam",
        "element_name": "Beam HK542-8-22*400-92",
        "cost_items": [
          {
            "category": "material",
            "item_type": "STEEL/S355",
            "quantity": 1204.25,
            "unit": "kg",
            "unit_price": 4.50,
            "total_price": 5419.13,
            "description": "STEEL/S355 material"
          },
          {
            "category": "connection",
            "item_type": "welding",
            "quantity": 0.5,
            "unit": "m",
            "unit_price": 25.00,
            "total_price": 12.50,
            "description": "Welding cost"
          }
        ],
        "subtotal": 5431.63,
        "waste_factor": 0.05,
        "waste_cost": 271.58,
        "total": 5703.21
      },
      // ... koszty dla każdego elementu
    ]
  },
  "element_count": 3017,
  "costs_calculated": true
}
```

## 3. Komponenty UI dla Wyświetlania Kosztów

### 3.1. Podsumowanie Kosztów (Sidebar)

```jsx
// components/CostSummary.jsx
import React from 'react';
import './CostSummary.css';

function CostSummary({ costs }) {
  if (!costs) {
    return (
      <div className="cost-summary">
        <p>Kliknij "Prześlij i Parsuj" aby obliczyć koszty</p>
      </div>
    );
  }
  
  const summary = costs.summary;
  
  return (
    <div className="cost-summary">
      <h2>💰 Koszt Projektu</h2>
      
      <div className="total-cost-card">
        <div className="total-label">Całkowity Koszt</div>
        <div className="total-value">
          {summary.grand_total.toLocaleString('pl-PL', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })} PLN
        </div>
      </div>
      
      <div className="breakdown">
        <h3>Podział kosztów</h3>
        
        <div className="breakdown-item">
          <span className="label">Materiały:</span>
          <span className="value">
            {summary.total_material_cost.toLocaleString('pl-PL', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })} PLN
          </span>
        </div>
        
        <div className="breakdown-item">
          <span className="label">Złącza i spajenia:</span>
          <span className="value">
            {summary.total_connection_cost.toLocaleString('pl-PL', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })} PLN
          </span>
        </div>
        
        <div className="breakdown-item">
          <span className="label">Robocizna:</span>
          <span className="value">
            {summary.total_labor_cost.toLocaleString('pl-PL', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })} PLN
          </span>
        </div>
        
        <div className="breakdown-item">
          <span className="label">Powierzchnie:</span>
          <span className="value">
            {summary.total_surface_treatment_cost.toLocaleString('pl-PL', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })} PLN
          </span>
        </div>
      </div>
      
      <details className="details">
        <summary>Szczegóły per element ({costs.element_costs.length} elementów)</summary>
        <div className="element-costs-list">
          {costs.element_costs.slice(0, 10).map(elementCost => (
            <div key={elementCost.element_id} className="element-cost-item">
              <div className="element-name">{elementCost.element_name}</div>
              <div className="element-total">
                {elementCost.total.toLocaleString('pl-PL', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })} PLN
              </div>
              <div className="element-items">
                {elementCost.cost_items.map((item, idx) => (
                  <div key={idx} className="cost-item">
                    • {item.description}: {item.total_price.toFixed(2)} PLN
                  </div>
                ))}
              </div>
            </div>
          ))}
          {costs.element_costs.length > 10 && (
            <div className="more-items">
              ... i {costs.element_costs.length - 10} więcej elementów
            </div>
          )}
        </div>
      </details>
    </div>
  );
}

export default CostSummary;
```

### 3.2. Integracja z Głównym Komponentem

```jsx
// App.jsx lub główny komponent
import CostSummary from './components/CostSummary';

function App() {
  const [elements, setElements] = useState([]);
  const [costs, setCosts] = useState(null);
  
  const handleFileUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(
      'http://localhost:8000/api/ifc/parse?calculate_costs=true',
      {
        method: 'POST',
        body: formData
      }
    );
    
    const data = await response.json();
    
    setElements(data.elements);
    setCosts(data.costs);  // ← Ustaw koszty
    
    if (data.costs) {
      alert(`Koszt całkowity: ${data.costs.summary.grand_total.toFixed(2)} PLN`);
    }
  };
  
  return (
    <div className="app">
      <div className="sidebar">
        <IFCUploader onFileUpload={handleFileUpload} />
        <CostSummary costs={costs} />  {/* ← Wyświetl koszty */}
      </div>
      <div className="main">
        <Viewer3D elements={elements} />
      </div>
    </div>
  );
}
```

## 4. API Endpoint (Już Gotowe!)

Endpoint `/api/ifc/parse` już obsługuje automatyczne obliczanie kosztów:

```bash
# Automatyczne obliczanie kosztów (domyślnie)
POST /api/ifc/parse?calculate_costs=true
Content-Type: multipart/form-data
file: <ifc_file>

# Bez obliczania kosztów
POST /api/ifc/parse?calculate_costs=false

# Z konkretnym cennikiem
POST /api/ifc/parse?calculate_costs=true&price_list_id=custom_2024
```

## 5. Alternatywa: Osobne Wywołanie

Jeśli chcesz przeliczyć koszty z innym cennikiem:

```javascript
// 1. Najpierw parse (bez kosztów lub z domyślnym)
const parseResponse = await fetch('/api/ifc/parse?calculate_costs=false', {
  method: 'POST',
  body: formData
});
const {elements} = await parseResponse.json();

// 2. Potem oblicz koszty z innym cennikiem
const costResponse = await fetch('/api/costs/calculate', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    elements: elements,
    price_list_id: 'custom_price_list_2024'
  })
});
const costs = await costResponse.json();
```

## 6. Podsumowanie

### ✅ Jak To Działa:

1. **Użytkownik** → Przesyła plik IFC przez UI
2. **Frontend** → `POST /api/ifc/parse?calculate_costs=true`
3. **API Gateway** → 
   - Parsuje IFC (IFC Parser Service)
   - Automatycznie oblicza koszty (Cost Calculator Service)
4. **API Gateway** → Zwraca elementy + koszty
5. **Frontend** → Wyświetla:
   - Wizualizację 3D (z elementów)
   - Podsumowanie kosztów (z costs.summary)
   - Szczegóły per element (z costs.element_costs)

### 📊 Co Dostaniesz:

- **Całkowity koszt budowli**: `costs.summary.grand_total`
- **Podział na kategorie**: materiały, złącza, robocizna, etc.
- **Koszt każdego elementu**: `costs.element_costs[]`
- **Szczegóły każdego kosztu**: `cost_items` w każdym elemencie

**Jeden request = wszystko gotowe!** 🎉

