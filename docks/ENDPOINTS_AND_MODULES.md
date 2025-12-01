# 📡 Endpointy i Odpowiedzialności Modułów

## 🔗 Przepływ Endpointów - Weryfikacja Połączeń

### ✅ Wszystkie Endpointy są Połączone

---

## 📋 API Gateway (Port 8000)

**Odpowiedzialność:** Punkt wejścia do systemu, routing i orchestracja żądań

### Endpointy Publiczne (dla Frontendu):

| Endpoint | Method | Opis | Połączenie z Mikroserwisem |
|----------|--------|------|---------------------------|
| `/api/ifc/parse` | POST | Parsowanie IFC + obliczanie kosztów | ✅ `ifc-parser-service` → `cost-calculator-service` |
| `/api/ifc/elements` | GET | Pobierz sparsowane elementy | ✅ `ifc-parser-service` |
| `/api/calculations/static` | POST | Obliczenia statyczne | ✅ `calculation-engine-service` |
| `/api/calculations/strength` | POST | Analiza wytrzymałości | ✅ `calculation-engine-service` |
| `/api/costs/calculate` | POST | Obliczanie kosztów | ✅ `cost-calculator-service` |
| `/api/visualization/scene` | POST | Generowanie sceny 3D | ✅ `3d-data-service` |
| `/api/projects` | POST | Utworzenie projektu | ✅ `database-manager-service` |
| `/api/projects/{id}` | GET | Pobierz projekt | ✅ `database-manager-service` |
| `/api/gateway/route` | POST | Generyczne routowanie | ✅ Dowolny mikroserwis |
| `/api/gateway/aggregate` | POST | Agregacja wielu żądań | ✅ Wiele mikroserwisów |

### Endpointy Health Check:
- `/api/health` - Health check API Gateway

---

## 🔧 IFC Parser Service (Port 5001)

**Odpowiedzialność:** Parsowanie plików IFC, ekstrakcja elementów, właściwości i geometrii

### Endpointy:

| Endpoint | Method | Opis | Używany przez |
|----------|--------|------|---------------|
| `/api/ifc/parse` | POST | Parsuje plik IFC, zwraca elementy | ✅ API Gateway `/api/ifc/parse` |
| `/api/ifc/elements` | GET | Zwraca sparsowane elementy (placeholder) | ✅ API Gateway `/api/ifc/elements` |
| `/api/ifc/health` | GET | Health check | ✅ Monitoring |

### Co robi:
- Otwiera plik IFC używając `ifcopenshell`
- Ekstrahuje wszystkie elementy (`IfcProduct`)
- Wyciąga właściwości (Psets, Type properties)
- Oblicza macierze transformacji (placement matrices)
- Wyciąga granice geometrii (geometry bounds)
- Zwraca listę elementów z danymi

**Technologie:** `ifcopenshell`, `numpy`

---

## 💰 Cost Calculator Service (Port 5003)

**Odpowiedzialność:** Obliczanie kosztów materiałów, złączy, robocizny i innych kosztów

### Endpointy:

| Endpoint | Method | Opis | Używany przez |
|----------|--------|------|---------------|
| `/api/costs/calculate` | POST | Oblicza koszty dla elementów | ✅ API Gateway `/api/costs/calculate` i `/api/ifc/parse` |
| `/api/costs/health` | GET | Health check | ✅ Monitoring |

### Co robi:
- Przyjmuje listę elementów z IFC
- Używa **Provider Pattern** do obliczania różnych typów kosztów:
  - `MaterialCostProvider` - koszty materiałów
  - `ConnectionCostProvider` - koszty złączy/spojenia
- Ładuje reguły biznesowe z plików JSON (`rules/*.json`)
- Oblicza koszty dla każdego elementu
- Sumuje koszty na poziomie projektu
- Zwraca szczegółowy breakdown kosztów

**Technologie:** Provider Pattern, Rule-based system (JSON)

---

## 📐 Calculation Engine Service (Port 5002)

**Odpowiedzialność:** Obliczenia konstrukcyjne (statyka, wytrzymałość, weryfikacja)

### Endpointy:

| Endpoint | Method | Opis | Używany przez |
|----------|--------|------|---------------|
| `/api/calculations/static` | POST | Obliczenia statyczne | ✅ API Gateway `/api/calculations/static` |
| `/api/calculations/strength` | POST | Analiza wytrzymałości | ✅ API Gateway `/api/calculations/strength` |
| `/api/calculations/health` | GET | Health check | ✅ Monitoring |

### Co robi:
- Przyjmuje elementy z IFC + obciążenia
- Wykonuje obliczenia statyczne (siły, momenty)
- Weryfikuje wytrzymałość elementów
- Zwraca wyniki obliczeń (naprężenia, ugięcia, etc.)

**Technologie:** `numpy`, `scipy` (planowane)

**Status:** Placeholder - wymaga implementacji algorytmów

---

## 🎨 3D Data Service (Port 5004)

**Odpowiedzialność:** Przygotowanie danych geometrycznych do wizualizacji 3D

### Endpointy:

| Endpoint | Method | Opis | Używany przez |
|----------|--------|------|---------------|
| `/api/visualization/scene` | POST | Generuje dane sceny 3D | ✅ API Gateway `/api/visualization/scene` |
| `/api/visualization/health` | GET | Health check | ✅ Monitoring |

### Co robi:
- Przyjmuje elementy z IFC
- Konwertuje geometrię IFC na format dla Three.js
- Przygotowuje dane sceny (meshes, materials, lights)
- Zwraca dane gotowe do renderowania

**Technologie:** `trimesh`, `numpy`

**Status:** Placeholder - obecnie frontend renderuje bezpośrednio z danych IFC

---

## 💾 Database Manager Service (Port 5005)

**Odpowiedzialność:** Zarządzanie danymi w bazie PostgreSQL (CRUD dla projektów, elementów, obliczeń)

### Endpointy:

| Endpoint | Method | Opis | Używany przez |
|----------|--------|------|---------------|
| `/api/projects` | POST | Utworzenie projektu | ✅ API Gateway `/api/projects` |
| `/api/projects/{id}` | GET | Pobierz projekt | ✅ API Gateway `/api/projects/{id}` |
| `/api/projects/health` | GET | Health check | ✅ Monitoring |

### Co robi:
- Zapisuje projekty do bazy danych
- Zapisuje elementy IFC
- Zapisuje wyniki obliczeń
- Zapisuje koszty
- Udostępnia historię zmian

**Technologie:** PostgreSQL, SQLAlchemy (planowane)

**Status:** Placeholder - wymaga implementacji repozytoriów

---

## 🎯 Frontend (Port 3000)

**Odpowiedzialność:** Interfejs użytkownika, wizualizacja 3D, prezentacja danych

### Komponenty:
- `IFCUploader` - Upload i parsowanie plików IFC
- `Viewer3D` - Wizualizacja 3D (Three.js)
- `App` - Główny komponent, zarządzanie stanem

### Endpointy używane:
- `POST /api/ifc/parse?calculate_costs=true` - Parsowanie + koszty
- (Planowane) `POST /api/visualization/scene` - Generowanie sceny
- (Planowane) `POST /api/projects` - Zapis projektu

**Technologie:** React, Three.js, Axios

---

## 🔄 Główny Przepływ Danych

### Scenariusz 1: Upload IFC + Obliczanie Kosztów

```
Frontend
  │
  ├─ POST /api/ifc/parse?calculate_costs=true
  │
  ↓
API Gateway
  │
  ├─→ POST ifc-parser-service:5001/api/ifc/parse
  │   └─→ Zwraca: {"elements": [...]}
  │
  ├─→ POST cost-calculator-service:5003/api/costs/calculate
  │   └─→ Zwraca: {"summary": {...}, "element_costs": [...]}
  │
  └─→ Zwraca do Frontend: {elements, costs}
```

### Scenariusz 2: Obliczenia Konstrukcyjne

```
Frontend
  │
  ├─ POST /api/calculations/static
  │
  ↓
API Gateway
  │
  └─→ POST calculation-engine-service:5002/api/calculations/static
      └─→ Zwraca: {results: {...}}
```

### Scenariusz 3: Zapis Projektu

```
Frontend
  │
  ├─ POST /api/projects
  │
  ↓
API Gateway
  │
  └─→ POST database-manager-service:5005/api/projects
      └─→ Zapisuje do PostgreSQL
```

---

## ✅ Weryfikacja Połączeń

### Połączenia API Gateway → Mikroserwisy:

| API Gateway Endpoint | Mikroserwis | Endpoint Mikroserwisu | Status |
|---------------------|-------------|----------------------|--------|
| `/api/ifc/parse` | `ifc-parser-service` | `/api/ifc/parse` | ✅ Połączone |
| `/api/ifc/elements` | `ifc-parser-service` | `/api/ifc/elements` | ✅ Połączone |
| `/api/calculations/static` | `calculation-engine-service` | `/api/calculations/static` | ✅ Połączone |
| `/api/calculations/strength` | `calculation-engine-service` | `/api/calculations/strength` | ✅ Połączone |
| `/api/costs/calculate` | `cost-calculator-service` | `/api/costs/calculate` | ✅ Połączone |
| `/api/visualization/scene` | `3d-data-service` | `/api/visualization/scene` | ✅ Połączone |
| `/api/projects` | `database-manager-service` | `/api/projects` | ✅ Połączone |
| `/api/projects/{id}` | `database-manager-service` | `/api/projects/{id}` | ✅ Połączone |

### Połączenia wewnętrzne (mikroserwis → mikroserwis):

| Z | Do | Endpoint | Status |
|---|----|----------|--------|
| `api-gateway` | `ifc-parser-service` | `/api/ifc/parse` | ✅ Działa |
| `api-gateway` | `cost-calculator-service` | `/api/costs/calculate` | ✅ Działa |
| `api-gateway` | `calculation-engine-service` | `/api/calculations/static` | ✅ Połączone (placeholder) |
| `api-gateway` | `3d-data-service` | `/api/visualization/scene` | ✅ Połączone (placeholder) |
| `api-gateway` | `database-manager-service` | `/api/projects` | ✅ Połączone (placeholder) |

---

## 📊 Podsumowanie Odpowiedzialności

### 🎯 API Gateway
- **Za co odpowiedzialny:** Routing, orchestracja, agregacja odpowiedzi
- **Nie jest odpowiedzialny za:** Logikę biznesową, parsowanie IFC, obliczenia

### 🔧 IFC Parser Service
- **Za co odpowiedzialny:** Parsowanie IFC, ekstrakcja elementów i właściwości
- **Nie jest odpowiedzialny za:** Obliczanie kosztów, wizualizację, zapis do bazy

### 💰 Cost Calculator Service
- **Za co odpowiedzialny:** Obliczanie kosztów (materiały, złącza, robocizna)
- **Nie jest odpowiedzialny za:** Parsowanie IFC, obliczenia konstrukcyjne

### 📐 Calculation Engine Service
- **Za co odpowiedzialny:** Obliczenia konstrukcyjne (statyka, wytrzymałość)
- **Nie jest odpowiedzialny za:** Parsowanie IFC, obliczanie kosztów

### 🎨 3D Data Service
- **Za co odpowiedzialny:** Przygotowanie danych do wizualizacji 3D
- **Nie jest odpowiedzialny za:** Renderowanie (to robi frontend), parsowanie IFC

### 💾 Database Manager Service
- **Za co odpowiedzialny:** Zarządzanie danymi w bazie (CRUD)
- **Nie jest odpowiedzialny za:** Logikę biznesową, obliczenia

### 🎯 Frontend
- **Za co odpowiedzialny:** UI/UX, wizualizacja 3D, prezentacja danych
- **Nie jest odpowiedzialny za:** Logikę biznesową, parsowanie IFC, obliczenia

---

## 🔍 Status Implementacji

| Moduł | Status | Uwagi |
|-------|--------|-------|
| API Gateway | ✅ Działa | Wszystkie endpointy połączone |
| IFC Parser Service | ✅ Działa | Parsuje IFC, zwraca elementy |
| Cost Calculator Service | ✅ Działa | Oblicza koszty, używa provider pattern |
| Calculation Engine Service | ⚠️ Placeholder | Endpointy istnieją, brak algorytmów |
| 3D Data Service | ⚠️ Placeholder | Endpointy istnieją, frontend renderuje bezpośrednio |
| Database Manager Service | ⚠️ Placeholder | Endpointy istnieją, brak implementacji CRUD |
| Frontend | ✅ Działa | Upload, wizualizacja 3D, wyświetlanie kosztów |

---

## 🎯 Wnioski

### ✅ Wszystkie endpointy są połączone poprawnie!

1. **API Gateway** poprawnie routuje do wszystkich mikroserwisów
2. **Orchestration Service** ma mapowanie wszystkich serwisów
3. **Frontend** używa poprawnych endpointów
4. **Komunikacja** między serwisami działa (HTTP REST API)

### ⚠️ Do uzupełnienia:

1. **Calculation Engine** - wymaga implementacji algorytmów
2. **3D Data Service** - można użyć do optymalizacji (obecnie frontend renderuje bezpośrednio)
3. **Database Manager** - wymaga implementacji repozytoriów i modeli

### ✅ Gotowe do użycia:

- Parsowanie IFC ✅
- Obliczanie kosztów ✅
- Wizualizacja 3D ✅
- Routing i orchestracja ✅

---

**Ostatnia aktualizacja:** 2024

