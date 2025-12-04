# Przepływ Aplikacji - Flow Documentation

## 🎯 Przegląd

System składa się z:
- **Frontend (React + Three.js)** - Interfejs użytkownika
- **API Gateway** - Routing i orchestracja
- **Mikroserwisy** - Logika biznesowa
- **PostgreSQL** - Baza danych

---

## 📊 Główny Przepływ Dane

```
┌─────────────┐
│   Frontend  │
│  (React)    │
└──────┬──────┘
       │ HTTP REST API
       │ JSON
       ↓
┌─────────────────┐
│   API Gateway   │
│  (FastAPI)      │
│  Port: 8000     │
└──────┬──────────┘
       │
       ├──→ IFC Parser Service (5001)
       ├──→ Calculation Engine (5002)
       ├──→ Cost Calculator (5003)
       ├──→ 3D Data Service (5004)
       └──→ Database Manager (5005)
```

---

## 🔄 Scenariusz 1: Upload i Parsowanie Pliku IFC + Automatyczne Obliczanie Kosztów

### Krok po kroku:

```
1. Użytkownik wybiera plik .ifc w React
   │
   ↓
2. Frontend wysyła POST /api/ifc/parse?calculate_costs=true
   Content-Type: multipart/form-data
   Body: { file: File }
   │
   ↓
3. API Gateway:
   a) Routuje do IFC Parser Service
      POST http://ifc-parser-service:5001/api/ifc/parse
      │
      ↓
   b) IFC Parser Service:
      - Parsuje plik IFC (ifcopenshell)
      - Ekstrahuje elementy, właściwości, geometrię
      - Zwraca: {"elements": [...]}
      │
      ↓
   c) Jeśli calculate_costs=true:
      API Gateway automatycznie wywołuje Cost Calculator Service
      POST http://cost-calculator-service:5003/api/costs/calculate
      Body: {"elements": [...]}
      │
      ↓
   d) Cost Calculator Service:
      - Oblicza koszty materiałów, złączy, robocizny
      - Zwraca: {"summary": {...}, "element_costs": [...]}
   │
   ↓
4. API Gateway zwraca zunifikowaną odpowiedź do Frontend:
   {
     "elements": [
       {
         "global_id": "xxx",
         "type_name": "IfcBeam",
         "name": "Beam-01",
         "properties": {...},
         "placement_matrix": [...]
       }
     ],
     "costs": {
       "summary": {
         "grand_total": 375000.50,
         "total_material_cost": 225000.50,
         "total_connection_cost": 45000.00
       },
       "element_costs": [...]
     },
     "element_count": 3017,
     "costs_calculated": true
   }
   │
   ↓
5. Frontend:
   - Wyświetla listę elementów
   - Wyświetla koszty w sidebarze
   - Renderuje wizualizację 3D (Three.js)
```

---

## 🔄 Scenariusz 2: Wizualizacja 3D

**Uwaga:** Obecnie frontend renderuje bezpośrednio z danych IFC (Three.js), ale można użyć 3D Data Service do optymalizacji.

```
1. Frontend ma już dane z IFC Parser (z Scenariusza 1)
   │
   ↓
2. Opcja A: Bezpośrednie renderowanie (obecne)
   Frontend używa Three.js do renderowania elementów z danych IFC
   - Tworzy meshes z placement_matrix
   - Używa geometry bounds z properties
   - Renderuje w czasie rzeczywistym
   │
   ↓
3. Opcja B: Przez 3D Data Service (przyszłość)
   Frontend wysyła do API Gateway:
   POST /api/visualization/scene
   {
     "elements": [...],
     "options": {
       "color_by": "cost",  // lub "material", "type"
       "quality": "high"
     }
   }
   │
   ↓
4. API Gateway → 3D Data Service
   POST http://3d-data-service:5004/api/visualization/scene
   │
   ↓
5. 3D Data Service:
   - Przetwarza geometrię z elementów
   - Generuje vertices, faces, colors
   - Formatuje dla Three.js
   │
   ↓
6. Zwraca dane geometryczne:
   {
     "vertices": [x, y, z, ...],
     "faces": [i, j, k, ...],
     "colors": [r, g, b, ...],
     "metadata": {...}
   }
   │
   ↓
7. Frontend (Three.js):
   - Tworzy scenę 3D
   - Renderuje geometrię
   - Interaktywna wizualizacja
```

---

## 🔄 Scenariusz 3: Obliczenia Konstrukcji

```
1. Użytkownik zaznacza elementy w UI
   │
   ↓
2. Frontend → API Gateway:
   POST /api/calculations/static
   {
     "elements": [...], // zaznaczone elementy
     "loads": {
       "dead_load": 100,  // kN/m²
       "live_load": 50,
       "wind_load": 20
     }
   }
   │
   ↓
3. API Gateway → Calculation Engine Service
   POST http://calculation-engine-service:5002/api/calculations/static
   │
   ↓
4. Calculation Engine Service:
   - Analiza statyczna (numpy/scipy)
   - Obliczenia wytrzymałościowe
   - Weryfikacja normowa
   │
   ↓
5. Zwraca wyniki:
   {
     "results": {
       "reactions": [...],
       "stresses": [...],
       "displacements": [...],
       "safety_factors": {...}
     }
   }
   │
   ↓
6. Frontend wyświetla wyniki + aktualizuje wizualizację
```

---

## 🔄 Scenariusz 4: Kalkulacja Kosztów (Osobne Wywołanie)

**Uwaga:** Koszty są automatycznie obliczane przy parsowaniu IFC (Scenariusz 1), ale można też wywołać osobno:

```
1. Użytkownik chce przeliczyć koszty z innym cennikiem
   │
   ↓
2. Frontend → API Gateway:
   POST /api/costs/calculate
   {
     "elements": [...],
     "price_list_id": "pl-2024-custom"
   }
   │
   ↓
3. API Gateway → Cost Calculator Service
   POST http://cost-calculator-service:5003/api/costs/calculate
   │
   ↓
4. Cost Calculator Service:
   - Ładuje reguły biznesowe z JSON (rules/*.json)
   - Używa Provider Pattern:
     * MaterialCostProvider - koszty materiałów
     * ConnectionCostProvider - koszty złączy/spojenia
   - Kalkuluje koszty dla każdego elementu
   - Sumuje koszty na poziomie projektu
   │
   ↓
5. Zwraca breakdown kosztów:
   {
     "summary": {
       "grand_total": 375000.50,
       "total_material_cost": 225000.50,
       "total_connection_cost": 45000.00,
       "total_labor_cost": 80000.00
     },
     "element_costs": [
       {
         "element_id": "xxx",
         "element_name": "Beam-01",
         "total": 5703.21,
         "cost_items": [
           {
             "category": "material",
             "item_type": "STEEL/S355",
             "quantity": 1204.25,
             "unit": "kg",
             "unit_price": 4.50,
             "total_price": 5419.13
           },
           {
             "category": "connection",
             "item_type": "welding",
             "quantity": 0.5,
             "unit": "m",
             "unit_price": 25.00,
             "total_price": 12.50
           }
         ]
       }
     ]
   }
   │
   ↓
6. Frontend wyświetla koszty w sidebarze + szczegóły
```

---

## 🔄 Scenariusz 5: Zapis Projektu

```
1. Użytkownik zapisuje projekt
   │
   ↓
2. Frontend → API Gateway:
   POST /api/projects
   {
     "name": "Project 1",
     "description": "Hala przemysłowa",
     "metadata": {
       "ifc_file": "KONSTRUKCJA_NAWA_III.ifc",
       "element_count": 3017
     }
   }
   │
   ↓
3. API Gateway → Database Manager Service
   POST http://database-manager-service:5005/api/projects
   │
   ↓
4. Database Manager Service:
   - Zapisuje projekt do PostgreSQL
   - Zwraca: {"project_id": "xxx", "created_at": "..."}
   │
   ↓
5. Frontend otrzymuje ID projektu i może zapisać elementy/koszty/obliczenia
```

**Alternatywa: Agregacja (dla kompleksowego zapisu):**
```
POST /api/gateway/aggregate
{
  "requests": [
    {
      "service": "database-manager",
      "endpoint": "/api/projects",
      "method": "POST",
      "data": { "name": "Project 1", ... }
    },
    {
      "service": "database-manager",
      "endpoint": "/api/projects/{id}/elements",
      "method": "POST",
      "data": { "elements": [...] }
    }
  ]
}
```

---

## 🔄 Scenariusz 6: Kompleksowy Workflow (Import → Koszty → Wizualizacja)

**Uproszczony przepływ (obecny):**

```
1. Upload IFC + Automatyczne Obliczanie Kosztów
   Frontend → POST /api/ifc/parse?calculate_costs=true
   │
   ↓
   API Gateway:
   ├─→ IFC Parser Service → {"elements": [...]}
   └─→ Cost Calculator Service → {"costs": {...}}
   │
   ↓ Zwraca: {elements, costs, element_count, costs_calculated}
   │
2. Frontend:
   - Wyświetla listę elementów (sidebar)
   - Wyświetla koszty (sidebar - podsumowanie + szczegóły)
   - Renderuje wizualizację 3D (Three.js - bezpośrednio z elementów)
   - Umożliwia włączanie/wyłączanie typów elementów
```

**Rozszerzony przepływ (przyszłość - z obliczeniami):**

```
1. Upload IFC + Koszty (jak wyżej)
   │
   ↓
2. Obliczenia konstrukcyjne (opcjonalnie)
   Frontend → POST /api/calculations/static
   │
   ↓ Zwraca: calculation_results
   │
3. Frontend:
   - Wyświetla tabelę elementów
   - Pokazuje koszty (automatycznie z kroku 1)
   - Pokazuje wyniki obliczeń (z kroku 2)
   - Renderuje 3D z kolorowaniem według kosztów/obciążeń
```

---

## 🏗️ Komunikacja między Mikroserwisami

### Bezpośrednia komunikacja (przez API Gateway)

```
Service A ──→ API Gateway ──→ Service B
```

**Zasada:** Mikroserwisy NIE komunikują się bezpośrednio między sobą.
- Wszystko przez API Gateway
- Centralizacja routing
- Łatwiejsze monitorowanie
- Możliwość agregacji odpowiedzi

### Przykład: Calculation Engine potrzebuje danych z IFC Parser

```
1. Calculation Engine otrzymuje request z elementami
2. Jeśli potrzebuje więcej danych:
   → Zwraca błąd: "Missing geometry data"
   │
   ↓
3. Frontend wykrywa błąd
4. Frontend najpierw wywołuje IFC Parser
5. Frontend potem wywołuje Calculation Engine z pełnymi danymi
```

**Alternatywa (przyszłość):**
- API Gateway może agregować odpowiedzi
- Gateway wywołuje IFC Parser → Calculation Engine automatycznie

---

## 📡 API Gateway - Funkcje

### 1. Bezpośrednie Endpointy (Rekomendowane)

```python
# Parsowanie IFC + automatyczne koszty
POST /api/ifc/parse?calculate_costs=true
Content-Type: multipart/form-data
Body: { file: File }

# Obliczenia statyczne
POST /api/calculations/static
Body: { "elements": [...], "loads": {...} }

# Obliczanie kosztów (osobne)
POST /api/costs/calculate
Body: { "elements": [...], "price_list_id": "..." }

# Generowanie sceny 3D
POST /api/visualization/scene
Body: { "elements": [...], "options": {...} }

# Zapis projektu
POST /api/projects
Body: { "name": "...", "description": "..." }
```

### 2. Generyczne Routing (Zaawansowane)

```python
POST /api/gateway/route
{
  "service": "calculation-engine",
  "endpoint": "/api/calculations/static",
  "method": "POST",
  "data": {...}
}
```

### 3. Agregacja (Dla wielu żądań)

```python
POST /api/gateway/aggregate
{
  "requests": [
    {"service": "ifc-parser", "endpoint": "/api/ifc/parse", ...},
    {"service": "cost-calculator", "endpoint": "/api/costs/calculate", ...}
  ]
}
```

### 4. Health Checks
```
GET /api/health
→ Sprawdza wszystkie serwisy
→ Zwraca status każdego
```

---

## 💾 Przepływ Danych przez Bazę

```
┌─────────────────┐
│ Database Manager│
│     Service     │
└────────┬────────┘
         │ SQLAlchemy
         ↓
┌─────────────────┐
│   PostgreSQL    │
│   Port: 5432    │
└─────────────────┘
```

**Które serwisy zapisują do bazy?**

- **Database Manager Service** - Główny serwis do CRUD
- **Inne serwisy** - Tylko READ (opcjonalnie)
- **Zasada:** Database Manager jest single source of truth

---

## 🎨 Frontend - Przepływ Stanu

```
React Component State:
├── ifcElements: []          // Z IFC Parser
├── calculationResults: {}    // Z Calculation Engine
├── costs: {}                 // Z Cost Calculator
├── scene3D: {}              // Z 3D Data Service
└── project: {}              // Z Database Manager

React Query:
- Cache'uje odpowiedzi z API
- Automatyczna synchronizacja
- Offline support (future)
```

---

## ⚡ Przykładowe Requesty (cURL)

### Upload IFC + Automatyczne Koszty
```bash
curl -X POST "http://localhost:8000/api/ifc/parse?calculate_costs=true" \
  -F "file=@model.ifc"
```

### Obliczenia Statyczne
```bash
curl -X POST http://localhost:8000/api/calculations/static \
  -H "Content-Type: application/json" \
  -d '{
    "elements": [...],
    "loads": {"dead_load": 100, "live_load": 50}
  }'
```

### Obliczanie Kosztów (Osobne)
```bash
curl -X POST http://localhost:8000/api/costs/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "elements": [...],
    "price_list_id": "pl-2024"
  }'
```

---

## 🔒 Bezpieczeństwo (Future)

```
Frontend → JWT Token → API Gateway → Mikroserwisy
                           │
                           └──→ Weryfikacja tokenu
                                → Autoryzacja (RBAC)
                                → Rate Limiting
```

---

## 📊 Monitoring (Future)

```
Mikroserwisy → Metrics → Prometheus
                    ↓
                Grafana Dashboard
```

---

## Podsumowanie Przepływu

1. **Frontend** zawsze komunikuje się z **API Gateway**
2. **API Gateway** routuje do odpowiedniego **Mikroserwisu**
3. **Mikroserwisy** wykonują logikę i zwracają JSON
4. **Database Manager** zarządza bazą danych
5. **Frontend** agreguje odpowiedzi i wyświetla użytkownikowi

**Zasady:**
- ✅ Wszystko przez API Gateway
- ✅ JSON jako format komunikacji
- ✅ Async/await dla równoległych requestów
- ✅ Error handling na każdym poziomie

