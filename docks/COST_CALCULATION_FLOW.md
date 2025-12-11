# Przepływ Obliczania Kosztów Całej Budowli z IFC

## 1. Przegląd Przepływu

```
1. Użytkownik → Przesyła plik IFC do API Gateway
2. API Gateway → Parsuje IFC (IFC Parser Service)
3. API Gateway → Oblicza koszty (Cost Calculator Service)
4. API Gateway → Zwraca: elementy + koszty
5. Frontend → Wyświetla: wizualizacja 3D + koszty
```

## 2. Opcje Implementacji

### OPCA A: Automatyczne Obliczanie po Parsowaniu (Rekomendowane)

**Przepływ**:
```
Frontend → POST /api/ifc/parse → API Gateway
  ↓
API Gateway → IFC Parser Service (parse)
  ↓
API Gateway → Cost Calculator Service (calculate_costs)
  ↓
API Gateway → Zwraca: {elements: [...], costs: {...}}
```

**Zalety**:
- ✅ Jeden request = wszystko gotowe
- ✅ Użytkownik nie musi pamiętać o osobnym wywołaniu
- ✅ Mniej ruchu sieciowego

**Implementacja**: Endpoint `/api/ifc/parse` automatycznie wywołuje obliczanie kosztów

### OPCA B: Osobny Endpoint (Elastyczność)

**Przepływ**:
```
Frontend → POST /api/ifc/parse → Dostaje elementy
Frontend → POST /api/costs/calculate → Dostaje koszty
```

**Zalety**:
- ✅ Możliwość obliczania kosztów dla różnych cenników
- ✅ Możliwość przeliczenia bez re-parsowania
- ✅ Lepsze dla dużych projektów (parsowanie osobno, koszty osobno)

**Implementacja**: Dwa osobne endpointy

## 3. Rekomendowane Rozwiązanie: HYBRYDOWE

**Domyślnie**: Automatyczne obliczanie kosztów po parsowaniu  
**Opcjonalnie**: Możliwość wyłączenia automatycznego obliczania lub przeliczenia z innym cennikiem

## 4. Implementacja

### 4.1. Rozszerzenie Endpoint Parsowania

```python
# api-gateway/presentation/api/routers/gateway.py

@router.post("/ifc/parse")
async def parse_ifc(
    file: UploadFile = File(...),
    calculate_costs: bool = True,  # ← Nowy parametr
    price_list_id: Optional[str] = None,  # ← Opcjonalny cennik
    container: Container = Depends(get_container)
):
    """Parse IFC file and optionally calculate costs"""
    # 1. Parse IFC
    elements = await _parse_ifc_file(file, container)
    
    # 2. Calculate costs if requested
    costs = None
    if calculate_costs:
        costs = await _calculate_costs_for_elements(
            elements, 
            price_list_id, 
            container
        )
    
    return {
        "elements": elements,
        "costs": costs,
        "element_count": len(elements)
    }

async def _parse_ifc_file(file: UploadFile, container: Container):
    """Parse IFC file - helper function"""
    # ... istniejący kod ...
    
async def _calculate_costs_for_elements(
    elements: List[Dict], 
    price_list_id: Optional[str],
    container: Container
):
    """Calculate costs for elements - helper function"""
    orchestration = container.orchestration_service()
    result = await orchestration.route_request(
        service_name="cost-calculator",
        endpoint="/api/costs/calculate",
        method="POST",
        data={
            "elements": elements,
            "price_list_id": price_list_id
        }
    )
    
    if result.is_failure:
        return None  # Nie przerywamy jeśli obliczanie kosztów się nie uda
    
    return result.value
```

### 4.2. Osobny Endpoint (dla elastyczności)

```python
@router.post("/costs/calculate")
async def calculate_costs(
    request: CostCalculationRequest,
    container: Container = Depends(get_container)
):
    """Calculate costs for elements (standalone endpoint)"""
    # ... już istnieje ...
```

## 5. Przykład Użycia w Frontend

### Wariant A: Automatyczne (Prosty)

```javascript
// Frontend - automatyczne obliczanie kosztów
async function uploadAndParseIFC(file) {
  const formData = new FormData();
  formData.append('file', file);
  
  // Jeden request - wszystko w jednym
  const response = await fetch('/api/ifc/parse?calculate_costs=true', {
    method: 'POST',
    body: formData
  });
  
  const data = await response.json();
  
  // Mamy elementy I koszty od razu!
  console.log('Elements:', data.elements);
  console.log('Costs:', data.costs);
  console.log('Total cost:', data.costs.summary.grand_total);
  
  return data;
}
```

### Wariant B: Osobne Wywołania (Elastyczny)

```javascript
// Frontend - osobne wywołania
async function uploadAndCalculateCosts(file) {
  // 1. Parse IFC
  const parseResponse = await fetch('/api/ifc/parse', {
    method: 'POST',
    body: formData
  });
  const {elements} = await parseResponse.json();
  
  // 2. Calculate costs (możemy użyć innego cennika)
  const costResponse = await fetch('/api/costs/calculate', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      elements: elements,
      price_list_id: 'custom_price_list_2024'
    })
  });
  const costs = await costResponse.json();
  
  return {elements, costs};
}
```

## 6. Struktura Odpowiedzi

### Odpowiedź z `/api/ifc/parse` (z obliczaniem kosztów)

```json
{
  "elements": [
    {
      "global_id": "3ijbB$3n14CQY4N27uP2iQ",
      "type_name": "IfcBeam",
      "name": "Beam HK542-8-22*400-92",
      "properties": {...},
      "placement_matrix": [...]
    },
    ...
  ],
  "costs": {
    "project_name": "IFC Project",
    "summary": {
      "total_material_cost": 50000.00,
      "total_connection_cost": 5000.00,
      "total_labor_cost": 10000.00,
      "grand_total": 65000.00,
      "category_totals": {
        "material": 50000.00,
        "connection": 5000.00,
        "labor": 10000.00
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
      ...
    ]
  },
  "element_count": 3017
}
```

## 7. UI w Frontend

### Komponent Wyświetlania Kosztów

```jsx
// components/CostSummary.jsx
function CostSummary({ costs }) {
  if (!costs) return null;
  
  const summary = costs.summary;
  
  return (
    <div className="cost-summary">
      <h2>Koszt Całkowity</h2>
      <div className="total-cost">
        {summary.grand_total.toFixed(2)} PLN
      </div>
      
      <div className="breakdown">
        <div>Materiały: {summary.total_material_cost.toFixed(2)} PLN</div>
        <div>Złącza: {summary.total_connection_cost.toFixed(2)} PLN</div>
        <div>Robocizna: {summary.total_labor_cost.toFixed(2)} PLN</div>
      </div>
      
      <details>
        <summary>Szczegóły per element</summary>
        {costs.element_costs.map(elementCost => (
          <div key={elementCost.element_id}>
            <h3>{elementCost.element_name}</h3>
            <div>Koszt: {elementCost.total.toFixed(2)} PLN</div>
            <ul>
              {elementCost.cost_items.map((item, idx) => (
                <li key={idx}>
                  {item.description}: {item.total_price.toFixed(2)} PLN
                </li>
              ))}
            </ul>
          </div>
        ))}
      </details>
    </div>
  );
}
```

## 8. Optymalizacja dla Dużych Projektów

### Problem
Parsowanie 3017 elementów + obliczanie kosztów może zająć dużo czasu.

### Rozwiązanie: Async/Background Jobs (Przyszłość)

```python
# Endpoint z job queue
@router.post("/ifc/parse-with-costs")
async def parse_ifc_with_costs_async(
    file: UploadFile = File(...),
    container: Container = Depends(get_container)
):
    """Parse IFC and calculate costs - returns job ID"""
    job_id = str(uuid.uuid4())
    
    # Start background task
    await background_tasks.add_task(
        parse_and_calculate_costs,
        job_id,
        file,
        container
    )
    
    return {"job_id": job_id, "status": "processing"}

@router.get("/ifc/parse-status/{job_id}")
async def get_parse_status(job_id: str):
    """Get status of parsing job"""
    # Check Redis/cache for job status
    return {"status": "completed", "result": {...}}
```

## 9. Rekomendowany Przepływ (MVP)

### KROK 1: Automatyczne Obliczanie (Proste)

```python
# api-gateway/presentation/api/routers/gateway.py

@router.post("/ifc/parse")
async def parse_ifc(
    file: UploadFile = File(...),
    calculate_costs: bool = True,  # Domyślnie TRUE
    container: Container = Depends(get_container)
):
    """Parse IFC and optionally calculate costs"""
    # 1. Parse
    import httpx
    settings = container.settings()
    files = {"file": (file.filename, await file.read(), file.content_type)}
    
    async with httpx.AsyncClient(timeout=120.0) as client:
        # Parse IFC
        parse_response = await client.post(
            f"{settings.ifc_parser_url}/api/ifc/parse",
            files=files
        )
        parse_response.raise_for_status()
        elements = parse_response.json()
        
        # 2. Calculate costs if requested
        costs = None
        if calculate_costs and elements:
            cost_response = await client.post(
                f"{settings.cost_calculator_url}/api/costs/calculate",
                json={"elements": elements}
            )
            if cost_response.status_code == 200:
                costs = cost_response.json()
        
        return {
            "elements": elements,
            "costs": costs,
            "element_count": len(elements) if elements else 0
        }
```

### KROK 2: Frontend Integration

```javascript
// frontend/src/components/IFCUploader.jsx

const handleFileUpload = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const response = await fetch(
      'http://localhost:8000/api/ifc/parse?calculate_costs=true',
      {
        method: 'POST',
        body: formData
      }
    );
    
    const data = await response.json();
    
    // Set elements for visualization
    setElements(data.elements);
    
    // Set costs for display
    setCosts(data.costs);
    
    if (data.costs) {
      console.log('Total cost:', data.costs.summary.grand_total, 'PLN');
    }
  } catch (error) {
    console.error('Error:', error);
  }
};
```

## 10. Podsumowanie

### Przepływ Dla Użytkownika

1. **Użytkownik** → Przesyła plik IFC
2. **System** → Parsuje IFC + Automatycznie oblicza koszty
3. **System** → Zwraca elementy + koszty w jednej odpowiedzi
4. **Frontend** → Wyświetla:
   - Wizualizację 3D elementów
   - Podsumowanie kosztów (total, breakdown)
   - Szczegóły kosztów per element

### Endpoint-y

- **POST `/api/ifc/parse?calculate_costs=true`** → Parsowanie + koszty (automatyczne)
- **POST `/api/costs/calculate`** → Tylko koszty (dla przeliczeń z innym cennikiem)

### Struktura Odpowiedzi

```json
{
  "elements": [...],  // Elementy z IFC
  "costs": {          // Koszty całej budowli
    "summary": {
      "grand_total": 65000.00
    },
    "element_costs": [...]  // Koszty per element
  }
}
```

**Wniosek**: Jeden request = wszystko gotowe! 🎉

