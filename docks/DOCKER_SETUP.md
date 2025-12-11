# 🐳 Docker Compose Setup Guide

## Szybki Start

### 1. Uruchomienie całego backendu (wszystkie serwisy)

```bash
cd C:\ProjektyPublic\ifc-construction-calculator
docker-compose up --build
```

To uruchomi:
- **PostgreSQL** (port 5432)
- **API Gateway** (port 8000) - główny endpoint dla frontendu
- **IFC Parser Service** (port 5001)
- **Calculation Engine Service** (port 5002)
- **Cost Calculator Service** (port 5003)
- **3D Data Service** (port 5004)
- **Database Manager Service** (port 5005)
- **Frontend** (port 3000) - opcjonalnie, jeśli chcesz uruchomić frontend w Dockerze

### 2. Uruchomienie tylko backendu (bez frontendu)

Jeśli chcesz uruchomić frontend lokalnie (`npm run dev`), możesz wyłączyć frontend-client:

```bash
docker-compose up --build api-gateway ifc-parser-service calculation-engine-service cost-calculator-service 3d-data-service database-manager-service postgres
```

Lub edytuj `docker-compose.yml` i zakomentuj sekcję `frontend-client`.

### 3. Uruchomienie w tle (detached mode)

```bash
docker-compose up -d --build
```

### 4. Zatrzymanie serwisów

```bash
docker-compose down
```

### 5. Zatrzymanie i usunięcie wolumenów (czysta baza)

```bash
docker-compose down -v
```

## 🔗 Endpointy

### API Gateway (główny endpoint dla frontendu)
- **URL**: `http://localhost:8000`
- **Health Check**: `http://localhost:8000/api/health`

### Frontend
- **URL**: `http://localhost:3000` (jeśli uruchomiony w Dockerze)
- **Lokalnie**: `http://localhost:3000` (jeśli używasz `npm run dev`)

## 📋 Weryfikacja Integracji

### 1. Sprawdź czy API Gateway działa:
```bash
curl http://localhost:8000/api/health
```

### 2. Sprawdź czy frontend łączy się z backendem:
- Otwórz `http://localhost:3000`
- Przejdź do `/viewer`
- Spróbuj załadować plik `.ifc`

### 3. Sprawdź logi:
```bash
docker-compose logs -f api-gateway
```

## 🔧 Konfiguracja

### Zmienne środowiskowe dla frontendu

Jeśli uruchamiasz frontend lokalnie (nie w Dockerze), ustaw zmienną środowiskową:

**Windows PowerShell:**
```powershell
$env:VITE_API_URL="http://localhost:8000"
npm run dev
```

**Windows CMD:**
```cmd
set VITE_API_URL=http://localhost:8000
npm run dev
```

**Linux/Mac:**
```bash
export VITE_API_URL=http://localhost:8000
npm run dev
```

Lub utwórz plik `.env` w katalogu `frontend/`:
```
VITE_API_URL=http://localhost:8000
```

## ✅ Weryfikacja Integracji Frontend ↔ Backend

### Struktura danych

Frontend wysyła:
- **Endpoint**: `POST /api/ifc/parse?calculate_costs=true`
- **Body**: `FormData` z plikiem `.ifc`

Backend zwraca:
```json
{
  "elements": [
    {
      "global_id": "...",
      "type_name": "...",
      "name": "...",
      "position": [x, y, z],
      "placement_matrix": [...],
      "properties": {...}
    }
  ],
  "costs": {
    "summary": {
      "grand_total": 12345.67,
      "total_material_cost": 10000.00,
      "total_connection_cost": 2000.00,
      "total_labor_cost": 345.67
    },
    "element_costs": [...]
  },
  "element_count": 123,
  "costs_calculated": true
}
```

Frontend oczekuje dokładnie tej struktury - ✅ **Zintegrowane poprawnie!**

## 🐛 Troubleshooting

### Problem: Frontend nie łączy się z backendem

1. Sprawdź czy API Gateway działa:
   ```bash
   curl http://localhost:8000/api/health
   ```

2. Sprawdź zmienną środowiskową `VITE_API_URL` w frontendzie

3. Sprawdź logi:
   ```bash
   docker-compose logs api-gateway
   ```

### Problem: Błąd CORS

API Gateway powinien mieć skonfigurowany CORS. Sprawdź konfigurację w `api-gateway/presentation/api/main.py`.

### Problem: Timeout przy parsowaniu dużych plików

Timeout jest ustawiony na 5 minut (300 sekund) w:
- Frontend: `frontend/src/lib/api.ts` - `timeout: 300000`
- API Gateway: `api-gateway/presentation/api/routers/gateway.py` - `timeout=300.0`

Możesz zwiększyć te wartości dla większych plików.

## 📝 Notatki

- Frontend używa endpointu `/api/ifc/parse?calculate_costs=true` - to jest poprawny endpoint API Gateway
- API Gateway automatycznie:
  1. Parsuje plik IFC przez `ifc-parser-service`
  2. Oblicza koszty przez `cost-calculator-service` (jeśli `calculate_costs=true`)
  3. Zwraca połączoną odpowiedź do frontendu
- Wszystkie typy TypeScript w frontendzie są zgodne ze strukturą odpowiedzi backendu

