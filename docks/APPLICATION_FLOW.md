# 🔄 Przepływ Aplikacji - Od Frontendu do Backendu

## 📋 Przegląd Architektury

Aplikacja IFC Construction Calculator składa się z:
- **Frontend** (React + TypeScript + OpenBIM Components) - Port **3000**
- **API Gateway** (FastAPI) - Port **8000**
- **Mikroserwisy** (FastAPI) - Porty **5001-5005**
- **PostgreSQL** - Port **5432**

---

## 🎯 Frontend (Port 3000)

### Technologie:
- **React 18** + **TypeScript**
- **Vite** (build tool)
- **OpenBIM Components** (wizualizacja 3D)
- **Tailwind CSS** + **shadcn/ui** (UI)
- **Axios** (HTTP client)

### Komponenty Główne:

#### 1. **IFCUploader** (`src/components/IFCUploader.tsx`)
- **Funkcja:** Upload pliku IFC przez użytkownika
- **Akcja:** Po wyborze pliku wywołuje `api.parseIFC(file)`

#### 2. **Viewer** (`src/pages/Viewer.tsx`)
- **Funkcja:** Główny widok z wizualizacją 3D
- **Zawiera:**
  - Viewer 3D (OpenBIM Components)
  - ActionBar (narzędzia: pin, comment, undo/redo)
  - CommentPanel (komentarze do elementów)
  - Sidebar z komponentami

#### 3. **CostSummary** (`src/components/CostSummary.tsx`)
- **Funkcja:** Wyświetla podsumowanie kosztów
- **Dane:** Otrzymuje `costs` z hooka `useIFCData`

#### 4. **ElementsList** (`src/components/ElementsList.tsx`)
- **Funkcja:** Lista wszystkich elementów IFC
- **Dane:** Otrzymuje `elements` z hooka `useIFCData`

#### 5. **VisibilityControls** (`src/components/VisibilityControls.tsx`)
- **Funkcja:** Kontrola widoczności typów elementów
- **Dane:** Zarządza `visibleTypes` przez hook `useIFCData`

### Hooks:

#### **useIFCData** (`src/hooks/useIFCData.ts`)
- **Stan:** `elements`, `costs`, `isLoading`, `error`, `visibleTypes`
- **Funkcje:** `handleParsed()`, `handleError()`, `handleTypeVisibilityChange()`

#### **useComments** (`src/hooks/useComments.ts`)
- **Funkcja:** Zarządzanie komentarzami (localStorage)
- **Dane:** Komentarze powiązane z elementami IFC

#### **useViewerHistory** (`src/hooks/useViewerHistory.ts`)
- **Funkcja:** Historia kamery (undo/redo)
- **Dane:** Stany kamery w viewerze 3D

### API Client:

#### **api.ts** (`src/lib/api.ts`)
```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = {
  parseIFC: async (file: File): Promise<ParseResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await axios.post<ParseResponse>(
      `${API_URL}/api/ifc/parse?calculate_costs=true`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000, // 5 minut
      }
    );
    
    return response.data;
  },
};
```

**Endpoint używany:**
- `POST http://localhost:8000/api/ifc/parse?calculate_costs=true`

---

## 🌐 API Gateway (Port 8000)

### Funkcja:
- **Punkt wejścia** do systemu backendowego
- **Routing** żądań do odpowiednich mikroserwisów
- **Orchestracja** - łączenie odpowiedzi z wielu serwisów
- **Agregacja** danych

### Endpointy Publiczne:

| Endpoint | Method | Opis | Routing do |
|----------|--------|------|------------|
| `/api/ifc/parse` | POST | Parsowanie IFC + obliczanie kosztów | `ifc-parser-service:5001` → `cost-calculator-service:5003` |
| `/api/ifc/elements` | GET | Pobierz sparsowane elementy | `ifc-parser-service:5001` |
| `/api/calculations/static` | POST | Obliczenia statyczne | `calculation-engine-service:5002` |
| `/api/calculations/strength` | POST | Analiza wytrzymałości | `calculation-engine-service:5002` |
| `/api/costs/calculate` | POST | Obliczanie kosztów | `cost-calculator-service:5003` |
| `/api/visualization/scene` | POST | Generowanie sceny 3D | `3d-data-service:5004` |
| `/api/projects` | POST | Utworzenie projektu | `database-manager-service:5005` |
| `/api/projects/{id}` | GET | Pobierz projekt | `database-manager-service:5005` |
| `/api/health` | GET | Health check | - |

### Zmienne Środowiskowe:
```env
DATABASE_URL=postgresql://ifc_user:ifc_password@postgres:5432/ifc_construction_db
IFC_PARSER_URL=http://ifc-parser-service:5001
CALCULATION_ENGINE_URL=http://calculation-engine-service:5002
COST_CALCULATOR_URL=http://cost-calculator-service:5003
3D_DATA_URL=http://3d-data-service:5004
DB_MANAGER_URL=http://database-manager-service:5005
```

---

## 🔧 Mikroserwisy

### 1. IFC Parser Service (Port 5001)

**Odpowiedzialność:** Parsowanie plików IFC, ekstrakcja elementów, właściwości i geometrii

**Endpointy:**
- `POST /api/ifc/parse` - Parsuje plik IFC, zwraca elementy
- `GET /api/ifc/elements` - Zwraca sparsowane elementy
- `GET /api/ifc/health` - Health check

**Technologie:** `ifcopenshell`, `numpy`

**Co robi:**
1. Otwiera plik IFC używając `ifcopenshell`
2. Ekstrahuje wszystkie elementy (`IfcProduct`)
3. Wyciąga właściwości (Psets, Type properties)
4. Oblicza macierze transformacji (placement matrices)
5. Wyciąga granice geometrii (geometry bounds)
6. Zwraca listę elementów z danymi

**Przykładowa odpowiedź:**
```json
{
  "elements": [
    {
      "id": "12345",
      "type_name": "IfcBeam",
      "name": "Beam-001",
      "properties": {...},
      "geometry": {...}
    }
  ]
}
```

---

### 2. Cost Calculator Service (Port 5003)

**Odpowiedzialność:** Obliczanie kosztów materiałów, złączy, robocizny

**Endpointy:**
- `POST /api/costs/calculate` - Oblicza koszty dla elementów
- `GET /api/costs/health` - Health check

**Technologie:** Provider Pattern, Rule-based system (JSON)

**Co robi:**
1. Przyjmuje listę elementów z IFC
2. Używa **Provider Pattern** do obliczania różnych typów kosztów:
   - `MaterialCostProvider` - koszty materiałów
   - `ConnectionCostProvider` - koszty złączy/spojenia
3. Ładuje reguły biznesowe z plików JSON (`rules/*.json`)
4. Oblicza koszty dla każdego elementu
5. Sumuje koszty na poziomie projektu
6. Zwraca szczegółowy breakdown kosztów

**Przykładowa odpowiedź:**
```json
{
  "summary": {
    "total": 150000.00,
    "materials": 100000.00,
    "connections": 30000.00,
    "labor": 20000.00
  },
  "element_costs": [
    {
      "element_id": "12345",
      "costs": {...}
    }
  ]
}
```

---

### 3. Calculation Engine Service (Port 5002)

**Odpowiedzialność:** Obliczenia konstrukcyjne (statyka, wytrzymałość, weryfikacja)

**Endpointy:**
- `POST /api/calculations/static` - Obliczenia statyczne
- `POST /api/calculations/strength` - Analiza wytrzymałości
- `GET /api/calculations/health` - Health check

**Technologie:** `numpy`, `scipy` (planowane)

**Status:** ⚠️ Placeholder - wymaga implementacji algorytmów

---

### 4. 3D Data Service (Port 5004)

**Odpowiedzialność:** Przygotowanie danych geometrycznych do wizualizacji 3D

**Endpointy:**
- `POST /api/visualization/scene` - Generuje dane sceny 3D
- `GET /api/visualization/health` - Health check

**Technologie:** `trimesh`, `numpy`

**Status:** ⚠️ Placeholder - obecnie frontend renderuje bezpośrednio z danych IFC

---

### 5. Database Manager Service (Port 5005)

**Odpowiedzialność:** Zarządzanie danymi w bazie PostgreSQL (CRUD dla projektów, elementów, obliczeń)

**Endpointy:**
- `POST /api/projects` - Utworzenie projektu
- `GET /api/projects/{id}` - Pobierz projekt
- `GET /api/projects/health` - Health check

**Technologie:** PostgreSQL, SQLAlchemy (planowane)

**Status:** ⚠️ Placeholder - wymaga implementacji repozytoriów

---

## 💾 PostgreSQL (Port 5432)

**Funkcja:** Baza danych dla wszystkich mikroserwisów

**Konfiguracja:**
```env
POSTGRES_DB=ifc_construction_db
POSTGRES_USER=ifc_user
POSTGRES_PASSWORD=ifc_password
```

**Używane przez:**
- Wszystkie mikroserwisy (przez `DATABASE_URL`)

---

## 🔄 Główny Przepływ Danych

### Scenariusz: Upload IFC + Obliczanie Kosztów

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. FRONTEND (Port 3000)                                         │
│    └─ Użytkownik wybiera plik IFC                               │
│    └─ IFCUploader → api.parseIFC(file)                          │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ POST /api/ifc/parse?calculate_costs=true
                            │ Content-Type: multipart/form-data
                            │ Body: FormData { file: File }
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. API GATEWAY (Port 8000)                                      │
│    └─ Odbiera żądanie                                           │
│    └─ Routuje do ifc-parser-service                             │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ POST http://ifc-parser-service:5001/api/ifc/parse
                            │ (wewnętrzna sieć Docker)
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. IFC PARSER SERVICE (Port 5001)                               │
│    └─ Parsuje plik IFC (ifcopenshell)                           │
│    └─ Ekstrahuje elementy, właściwości, geometrię                │
│    └─ Zwraca: {"elements": [...]}                               │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ Response: {elements: [...]}
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. API GATEWAY (Port 8000)                                      │
│    └─ Otrzymuje elementy z IFC Parser                            │
│    └─ Routuje do cost-calculator-service                        │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ POST http://cost-calculator-service:5003/api/costs/calculate
                            │ Body: {elements: [...]}
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. COST CALCULATOR SERVICE (Port 5003)                          │
│    └─ Oblicza koszty (MaterialCostProvider, ConnectionCostProvider)│
│    └─ Ładuje reguły z JSON                                       │
│    └─ Zwraca: {"summary": {...}, "element_costs": [...]}        │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ Response: {summary: {...}, element_costs: [...]}
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. API GATEWAY (Port 8000)                                      │
│    └─ Agreguje odpowiedzi:                                      │
│       - elements (z IFC Parser)                                 │
│       - costs (z Cost Calculator)                               │
│    └─ Zwraca: {elements, costs}                                 │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP 200 OK
                            │ Response: {
                            │   elements: [...],
                            │   costs: {
                            │     summary: {...},
                            │     element_costs: [...]
                            │   }
                            │ }
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. FRONTEND (Port 3000)                                         │
│    └─ Otrzymuje odpowiedź                                       │
│    └─ useIFCData.handleParsed(data)                             │
│    └─ Aktualizuje stan:                                         │
│       - elements                                                 │
│       - costs                                                    │
│       - visibleTypes                                             │
│    └─ Renderuje:                                                │
│       - CostSummary (koszty)                                    │
│       - ElementsList (lista elementów)                           │
│       - VisibilityControls (kontrola widoczności)               │
│    └─ (Opcjonalnie) Ładuje IFC do OpenBIM Components           │
│       dla wizualizacji 3D                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Diagram Portów i Komunikacji

```
┌─────────────────────────────────────────────────────────────────┐
│                         UŻYTKOWNIK                              │
│                      (Przeglądarka)                             │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP
                            │
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND (React)                                               │
│  Port: 3000                                                     │
│  URL: http://localhost:3000                                     │
│                                                                  │
│  - IFCUploader                                                   │
│  - Viewer (OpenBIM Components)                                  │
│  - CostSummary                                                   │
│  - ElementsList                                                  │
│  - VisibilityControls                                            │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ POST http://localhost:8000/api/ifc/parse
                            │
┌─────────────────────────────────────────────────────────────────┐
│  API GATEWAY (FastAPI)                                          │
│  Port: 8000                                                     │
│  URL: http://localhost:8000                                     │
│                                                                  │
│  - Routing                                                       │
│  - Orchestration                                                 │
│  - Aggregation                                                   │
└─────────────────────────────────────────────────────────────────┘
                            │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│ IFC PARSER    │  │ COST CALC    │  │ CALC ENGINE   │
│ Port: 5001    │  │ Port: 5003   │  │ Port: 5002    │
└───────────────┘  └───────────────┘  └───────────────┘
        │                    │                    │
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                             ▼
                    ┌───────────────┐
                    │ 3D DATA       │
                    │ Port: 5004    │
                    └───────────────┘
                             │
                             ▼
                    ┌───────────────┐
                    │ DB MANAGER    │
                    │ Port: 5005    │
                    └───────────────┘
                             │
                             ▼
                    ┌───────────────┐
                    │ POSTGRESQL    │
                    │ Port: 5432    │
                    └───────────────┘
```

---

## 🔍 Szczegóły Komunikacji

### Request Flow (Frontend → Backend):

1. **Frontend** (`localhost:3000`)
   - Użytkownik wybiera plik IFC
   - `IFCUploader` tworzy `FormData`
   - `api.parseIFC()` wysyła POST do `http://localhost:8000/api/ifc/parse?calculate_costs=true`

2. **API Gateway** (`localhost:8000`)
   - Odbiera żądanie
   - Sprawdza query param `calculate_costs=true`
   - Routuje do `ifc-parser-service:5001/api/ifc/parse` (wewnętrzna sieć Docker)
   - Czeka na odpowiedź z elementami

3. **IFC Parser Service** (`ifc-parser-service:5001`)
   - Parsuje plik IFC
   - Zwraca `{elements: [...]}`

4. **API Gateway** (kontynuacja)
   - Otrzymuje elementy
   - Routuje do `cost-calculator-service:5003/api/costs/calculate`
   - Przekazuje elementy w body

5. **Cost Calculator Service** (`cost-calculator-service:5003`)
   - Oblicza koszty
   - Zwraca `{summary: {...}, element_costs: [...]}`

6. **API Gateway** (finalizacja)
   - Agreguje odpowiedzi: `{elements, costs}`
   - Zwraca do frontendu

7. **Frontend** (odpowiedź)
   - Otrzymuje `{elements, costs}`
   - `useIFCData.handleParsed()` aktualizuje stan
   - Komponenty renderują dane

### Response Structure:

```typescript
interface ParseResponse {
  elements: IFCElement[];
  costs: {
    summary: {
      total: number;
      materials: number;
      connections: number;
      labor: number;
    };
    element_costs: Array<{
      element_id: string;
      costs: {...};
    }>;
  };
}
```

---

## 🐳 Docker Compose - Sieć i Porty

### Sieć Docker:
- Wszystkie serwisy są w tej samej sieci Docker
- Komunikacja wewnętrzna: `http://service-name:port`
- Komunikacja zewnętrzna: `http://localhost:port`

### Mapowanie Portów:

| Serwis | Port Kontenera | Port Hosta | URL Zewnętrzny |
|--------|----------------|------------|----------------|
| Frontend | 3000 | 3000 | `http://localhost:3000` |
| API Gateway | 8000 | 8000 | `http://localhost:8000` |
| IFC Parser | 5001 | 5001 | `http://localhost:5001` |
| Calculation Engine | 5002 | 5002 | `http://localhost:5002` |
| Cost Calculator | 5003 | 5003 | `http://localhost:5003` |
| 3D Data Service | 5004 | 5004 | `http://localhost:5004` |
| Database Manager | 5005 | 5005 | `http://localhost:5005` |
| PostgreSQL | 5432 | 5432 | `localhost:5432` |

### Komunikacja Wewnętrzna (Docker):
- API Gateway → IFC Parser: `http://ifc-parser-service:5001`
- API Gateway → Cost Calculator: `http://cost-calculator-service:5003`
- Wszystkie serwisy → PostgreSQL: `postgresql://ifc_user:ifc_password@postgres:5432/ifc_construction_db`

### Komunikacja Zewnętrzna (Przeglądarka):
- Frontend → API Gateway: `http://localhost:8000`

---

## ✅ Podsumowanie

### Frontend (Port 3000):
- React + TypeScript + OpenBIM Components
- Upload IFC → wywołuje `POST /api/ifc/parse?calculate_costs=true`
- Wyświetla elementy, koszty, wizualizację 3D

### API Gateway (Port 8000):
- Punkt wejścia do backendu
- Routuje żądania do mikroserwisów
- Agreguje odpowiedzi

### Mikroserwisy (Porty 5001-5005):
- **IFC Parser (5001)**: Parsuje IFC → zwraca elementy
- **Cost Calculator (5003)**: Oblicza koszty → zwraca breakdown
- **Calculation Engine (5002)**: Obliczenia konstrukcyjne (placeholder)
- **3D Data (5004)**: Przygotowanie danych 3D (placeholder)
- **Database Manager (5005)**: CRUD w PostgreSQL (placeholder)

### PostgreSQL (Port 5432):
- Baza danych dla wszystkich serwisów

### Przepływ:
1. Frontend → API Gateway (8000)
2. API Gateway → IFC Parser (5001)
3. API Gateway → Cost Calculator (5003)
4. API Gateway → Frontend (agregowana odpowiedź)

---

**Ostatnia aktualizacja:** 2024

