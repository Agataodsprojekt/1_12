# IFC Construction Calculator

System obliczeniowy konstrukcji z plików IFC - Clean Architecture + Mikroserwisy

## 🏗️ Architektura

System składa się z mikroserwisów opartych na Clean Architecture:

- **API Gateway** (port 8000) - Routing i orchestracja żądań
- **IFC Parser Service** (port 5001) - Parsowanie plików IFC
- **Calculation Engine Service** (port 5002) - Obliczenia konstrukcji
- **Cost Calculator Service** (port 5003) - Kalkulacja kosztów
- **3D Data Service** (port 5004) - Generowanie danych geometrycznych
- **Database Manager Service** (port 5005) - Zarządzanie bazą danych
- **PostgreSQL** (port 5432) - Baza danych

## 🚀 Quick Start

### Najłatwiejszy sposób (Docker):

```bash
# Uruchom wszystko na raz
docker-compose up --build

# Wszystkie serwisy będą dostępne na:
# - API Gateway: http://localhost:8000
# - Swagger docs: http://localhost:8000/docs
```

### Lokalnie (bez Dockera):

1. Zainstaluj wspólną bibliotekę:
```bash
cd common-package
pip install -e .
```

2. Zainstaluj zależności każdego serwisu:
```bash
cd ../api-gateway && pip install -r requirements.txt && pip install -e ../common-package
cd ../ifc-parser-service && pip install -r requirements.txt && pip install -e ../common-package
# ... i tak dalej
```

3. Uruchom każdy serwis osobno (w osobnych terminalach):
```bash
cd api-gateway && python main.py
cd ifc-parser-service && python main.py
# ... itd.
```

**Lub użyj skryptu (Windows):**
```powershell
.\run_all.ps1
```

## 🧪 Testowanie

```bash
# Test czy wszystkie serwisy działają
python test_all_services.py
```

## 📡 API Endpoints

Wszystkie endpointy przez API Gateway (port 8000):

### Przykłady:

```bash
# Obliczenia statyczne
POST http://localhost:8000/api/calculations/static
{
  "elements": [...],
  "loads": {"dead_load": 100}
}

# Kalkulacja kosztów
POST http://localhost:8000/api/costs/calculate
{
  "elements": [...]
}

# Generowanie sceny 3D
POST http://localhost:8000/api/visualization/scene
{
  "elements": [...]
}
```

**Pełna dokumentacja:** http://localhost:8000/docs (Swagger)

## 📁 Struktura Projektu

```
ifc-construction-calculator/
├── api-gateway/              # API Gateway
├── ifc-parser-service/        # Parsowanie IFC
├── calculation-engine-service/ # Obliczenia
├── cost-calculator-service/   # Koszty
├── 3d-data-service/           # 3D visualization
├── database-manager-service/  # Baza danych
├── common-package/            # Wspólna biblioteka
└── docker-compose.yml         # Docker setup
```

## 📚 Dokumentacja

### Główne Dokumenty:
- [ARCHITECTURE.md](ARCHITECTURE.md) - Szczegółowa architektura systemu
- [TEAM_ONBOARDING.md](TEAM_ONBOARDING.md) - Przewodnik dla zespołu
- [ENDPOINTS_AND_MODULES.md](ENDPOINTS_AND_MODULES.md) - Mapowanie endpointów i odpowiedzialności
- [RESTART_GUIDE.md](RESTART_GUIDE.md) - Instrukcje restartowania serwisów
- [FLOW_DOCUMENTATION.md](FLOW_DOCUMENTATION.md) - Przepływ danych
- [API_EXAMPLES.md](API_EXAMPLES.md) - Przykłady użycia API
- [GIT_WORKFLOW_GUIDE.md](GIT_WORKFLOW_GUIDE.md) - **Git workflow i best practices** ⭐
- [REPO_SETUP.md](REPO_SETUP.md) - **Konfiguracja prywatnego repozytorium** 🔒

### Dokumentacja Kosztów:
- [COST_ARCHITECTURE.md](COST_ARCHITECTURE.md) - Architektura obliczania kosztów
- [COST_CALCULATION_FLOW.md](COST_CALCULATION_FLOW.md) - Przepływ obliczania kosztów
- [COST_CALCULATION_PLAN.md](COST_CALCULATION_PLAN.md) - Plan rozwoju funkcji kosztów
- [COST_USAGE_EXAMPLE.md](COST_USAGE_EXAMPLE.md) - Przykłady użycia kosztów

## 🛠️ Stack Technologiczny

- **Backend**: Python 3.11+ (FastAPI)
- **Frontend**: React 18+ (TypeScript) + Three.js (planowane)
- **Database**: PostgreSQL 15+
- **DevOps**: Docker + docker-compose

## 🎯 Workflow Użytkownika

1. **Upload IFC** → Parsowanie elementów
2. **Automatyczne obliczenia** → Statyka, wytrzymałość
3. **Automatyczna kalkulacja kosztów** → Dla każdego elementu
4. **Wizualizacja 3D** → Renderowanie w przeglądarce
5. **Zapis projektu** → Do bazy danych

## 👥 Zespół

System przygotowany dla 5-osobowego zespołu z jasnym podziałem odpowiedzialności.

## 📝 Licencja

[Do uzupełnienia]
