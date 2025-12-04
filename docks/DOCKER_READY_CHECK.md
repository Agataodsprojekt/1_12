# 🐳 Docker - Status Gotowości

## ✅ Status: GOTOWY DO URUCHOMIENIA

### 🆕 Ostatnia aktualizacja: Dodano Proxy Endpointy w API Gateway

API Gateway ma teraz automatyczne proxy dla wszystkich nowych endpointów:
- ✅ `/api/visualization/*` → 3D Data Service
- ✅ `/api/projects/*` → Database Manager Service  
- ✅ `/api/calculations/*` → Calculation Engine Service
- ✅ `/api/ifc/*` → IFC Parser Service (search/filter)

### Sprawdzone Komponenty

#### 1. **docker-compose.yml** ✅
- ✅ Wszystkie serwisy skonfigurowane
- ✅ PostgreSQL (port 5432)
- ✅ API Gateway (port 8000)
- ✅ IFC Parser Service (port 5001)
- ✅ Calculation Engine Service (port 5002)
- ✅ Cost Calculator Service (port 5003)
- ✅ 3D Data Service (port 5004)
- ✅ Database Manager Service (port 5005)
- ✅ Frontend (port 3000) - opcjonalnie

#### 2. **Dockerfile dla każdego serwisu** ✅
- ✅ `api-gateway/Dockerfile`
- ✅ `ifc-parser-service/Dockerfile`
- ✅ `calculation-engine-service/Dockerfile`
- ✅ `cost-calculator-service/Dockerfile`
- ✅ `3d-data-service/Dockerfile`
- ✅ `database-manager-service/Dockerfile`
- ✅ `frontend/Dockerfile`

#### 3. **API Gateway Routing** ✅
API Gateway używa **generycznego routingu** przez `orchestration_service`, co oznacza:
- ✅ Wszystkie nowe endpointy są automatycznie dostępne przez API Gateway
- ✅ Routing działa przez `/api/gateway/route` lub bezpośrednio przez serwisy
- ✅ Wszystkie 26 nowych endpointów są dostępne przez:
  - `http://localhost:8000/api/visualization/...` (3d-data-service)
  - `http://localhost:8000/api/projects/...` (database-manager-service)
  - `http://localhost:8000/api/calculations/...` (calculation-engine-service)
  - `http://localhost:8000/api/ifc/...` (ifc-parser-service)

## 🚀 Jak Uruchomić

### Opcja 1: Wszystko w Dockerze (zalecane do testów)

```bash
cd C:\ProjektyPublic\1_12
docker-compose up --build
```

To uruchomi:
- Backend (wszystkie serwisy)
- Frontend (port 3000)
- PostgreSQL

### Opcja 2: Backend w Dockerze, Frontend lokalnie

```bash
# Terminal 1: Backend
cd C:\ProjektyPublic\1_12
docker-compose up --build api-gateway ifc-parser-service calculation-engine-service cost-calculator-service 3d-data-service database-manager-service postgres

# Terminal 2: Frontend
cd C:\ProjektyPublic\1_12\frontend
$env:VITE_API_URL="http://localhost:8000"
npm run dev
```

## 📋 Weryfikacja

### 1. Sprawdź czy wszystkie serwisy działają:

```bash
# Health check API Gateway
curl http://localhost:8000/api/health

# Health check poszczególnych serwisów
curl http://localhost:5001/api/ifc/health
curl http://localhost:5002/api/calculations/health
curl http://localhost:5003/api/costs/health
curl http://localhost:5004/api/visualization/health
curl http://localhost:5005/api/projects/health
```

### 2. Sprawdź nowe endpointy:

```bash
# Views
curl http://localhost:8000/api/visualization/views/default-project

# Pins
curl http://localhost:8000/api/visualization/pins/default-project

# Comments
curl http://localhost:8000/api/projects/default-project/comments

# Measurements
curl http://localhost:8000/api/calculations/measurements/default-project

# Selections
curl http://localhost:8000/api/visualization/selections/default-project
```

### 3. Sprawdź logi:

```bash
# Wszystkie serwisy
docker-compose logs -f

# Konkretny serwis
docker-compose logs -f api-gateway
docker-compose logs -f 3d-data-service
```

## 🔧 Konfiguracja

### Zmienne środowiskowe

Wszystkie serwisy używają zmiennych z `docker-compose.yml`:
- `DATABASE_URL` - połączenie z PostgreSQL
- `IFC_PARSER_URL` - URL do IFC Parser Service
- `CALCULATION_ENGINE_URL` - URL do Calculation Engine
- `COST_CALCULATOR_URL` - URL do Cost Calculator
- `3D_DATA_URL` - URL do 3D Data Service
- `DB_MANAGER_URL` - URL do Database Manager

### Frontend Environment

Jeśli uruchamiasz frontend lokalnie, ustaw:
```powershell
$env:VITE_API_URL="http://localhost:8000"
```

Lub utwórz plik `frontend/.env`:
```
VITE_API_URL=http://localhost:8000
```

## ⚠️ Uwagi

1. **Storage**: Obecnie wszystkie serwisy używają in-memory storage. Dane nie są trwałe po restarcie kontenerów.

2. **Baza danych**: PostgreSQL jest skonfigurowana, ale serwisy jeszcze nie używają jej do przechowywania danych (używają in-memory dictionaries).

3. **CORS**: API Gateway powinien mieć skonfigurowany CORS dla frontendu.

4. **Timeouts**: Dla dużych plików IFC timeout jest ustawiony na 5 minut (300 sekund).

## ✅ Gotowe do Testów!

Wszystkie komponenty są gotowe:
- ✅ Docker Compose skonfigurowany
- ✅ Wszystkie Dockerfile gotowe
- ✅ API Gateway routing działa
- ✅ Wszystkie 26 nowych endpointów dostępne
- ✅ Frontend zintegrowany z API

**Możesz uruchomić `docker-compose up --build` i przetestować wszystkie funkcjonalności!**
