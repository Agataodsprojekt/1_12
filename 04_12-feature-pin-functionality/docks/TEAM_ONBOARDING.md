# 🚀 Przewodnik Onboarding dla Zespołu

## Witajcie w projekcie IFC Construction Calculator! 🏗️

Ten przewodnik pomoże każdemu członkowi zespołu szybko zrozumieć projekt i zacząć pracę nad swoim segmentem.

---

## 📋 Spis Treści

1. [Przegląd projektu](#przegląd-projektu)
2. [Szybki start](#szybki-start)
3. [Struktura projektu](#struktura-projektu)
4. [Podział pracy](#podział-pracy)
5. [Dokumentacja](#dokumentacja)
6. [Przydatne komendy](#przydatne-komendy)

---

## 1. Przegląd Projektu

### Co to jest?

**IFC Construction Calculator** to aplikacja do:
- 📁 Importowania plików IFC (Industry Foundation Classes) - standardowe pliki z projektami budowlanymi
- 💰 Obliczania kosztów konstrukcji (materiały, złącza, robocizna)
- 📐 Wykonywania obliczeń konstrukcyjnych (statyka, wytrzymałość)
- 🎨 Wizualizacji 3D konstrukcji w przeglądarce

### Architektura

```
┌─────────────┐
│   Frontend  │  React + Three.js (wizualizacja 3D)
│   (React)   │
└──────┬──────┘
       │ HTTP
┌──────▼────────────────────────────────────────┐
│           API Gateway (FastAPI)                │
│          Punkt wejścia do systemu              │
└───┬──────┬──────┬──────┬──────┬───────────────┘
    │      │      │      │      │
    ▼      ▼      ▼      ▼      ▼
 ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌──────────┐
 │IFC  │ │Cost │ │Calc │ │3D   │ │Database  │
 │Parse│ │Calc │ │Eng  │ │Data │ │Manager   │
 └─────┘ └─────┘ └─────┘ └─────┘ └──────────┘
```

### Technologie

- **Backend**: Python 3.10+ (FastAPI)
- **Frontend**: React + Three.js
- **Baza danych**: PostgreSQL
- **Konteneryzacja**: Docker + Docker Compose
- **Architektura**: Clean Architecture + Mikroserwisy

---

## 2. Szybki Start

### Krok 1: Przygotowanie środowiska

```bash
# 1. Sklonuj repozytorium
git clone <repo-url>
cd ifc-construction-calculator

# 2. Upewnij się, że masz zainstalowane:
# - Docker Desktop (lub Docker + Docker Compose)
# - Node.js 18+ (dla frontendu)
# - Python 3.10+ (opcjonalnie, do lokalnego dev)
```

### Krok 2: Uruchomienie całego systemu

```bash
# Z poziomu głównego katalogu projektu
docker-compose up --build
```

To uruchomi wszystkie mikroserwisy:
- ✅ API Gateway (port 8000)
- ✅ IFC Parser Service (port 5001)
- ✅ Cost Calculator Service (port 5003)
- ✅ Calculation Engine Service (port 5002)
- ✅ 3D Data Service (port 5004)
- ✅ Database Manager Service (port 5005)
- ✅ PostgreSQL (port 5432)
- ✅ Frontend (port 3000)

### Krok 3: Sprawdź czy działa

1. **Frontend**: Otwórz http://localhost:3000
2. **API Gateway**: Otwórz http://localhost:8000/docs (Swagger UI)
3. **Test**: Prześlij plik .ifc przez UI

### Krok 4: Prześlij testowy plik IFC

1. Otwórz http://localhost:3000
2. Kliknij "Wybierz plik .ifc"
3. Wybierz plik IFC (np. `KONSTRUKCJA_NAWA_III.ifc`)
4. Kliknij "Prześlij i Parsuj"
5. ✅ Powinieneś zobaczyć:
   - Wizualizację 3D konstrukcji
   - Koszt całej budowli w sidebarze
   - Listę elementów z możliwością włączania/wyłączania

---

## 3. Struktura Projektu

```
ifc-construction-calculator/
│
├── 📁 api-gateway/              # Punkt wejścia do systemu
│   ├── domain/                 # Logika biznesowa
│   ├── application/            # Dependency Injection
│   ├── infrastructure/         # HTTP klient, orchestration
│   └── presentation/           # FastAPI endpoints
│
├── 📁 ifc-parser-service/       # Parsowanie plików IFC
│   └── (podobna struktura Clean Architecture)
│
├── 📁 cost-calculator-service/   # Obliczanie kosztów
│   ├── domain/                 # Entitites, interfaces
│   ├── infrastructure/        # Implementacje (providers, rules)
│   └── rules/                  # JSON z regułami biznesowymi
│
├── 📁 calculation-engine-service/ # Obliczenia konstrukcyjne
├── 📁 3d-data-service/          # Przygotowanie danych 3D
├── 📁 database-manager-service/  # Zarządzanie bazą danych
│
├── 📁 frontend/                  # React aplikacja
│   └── src/
│       ├── components/         # Komponenty React
│       │   ├── IFCUploader.jsx # Upload plików
│       │   └── Viewer3D.jsx   # Wizualizacja 3D
│       └── App.jsx             # Główny komponent
│
├── 📁 common-package/            # Współdzielone narzędzia
│   └── ifc_common/
│       ├── result.py           # Result pattern (error handling)
│       └── settings.py         # Base settings
│
└── 📄 docker-compose.yml        # Orchestracja wszystkich serwisów
```

### Każdy mikroserwis ma strukturę Clean Architecture:

```
microservice/
├── domain/              # Warstwa domeny (najważniejsza!)
│   ├── entities/      # Obiekty biznesowe
│   └── interfaces/     # Kontrakty (interfejsy)
│
├── application/        # Warstwa aplikacji
│   └── container.py    # Dependency Injection
│
├── infrastructure/    # Warstwa infrastruktury
│   ├── services/      # Implementacje serwisów
│   ├── config/        # Konfiguracja
│   └── repositories/  # Dostęp do danych
│
└── presentation/       # Warstwa prezentacji
    └── api/           # FastAPI endpoints
```

**Zasada**: Zależności idą tylko w jedną stronę: `presentation` → `application` → `domain` ← `infrastructure`

---

## 4. Podział Pracy

### 🎯 Jak zacząć pracę nad swoim segmentem?

### Osoba 1-2: **Cost Calculator Service** 💰

**Zadania:**
- Rozbudowa reguł biznesowych w `rules/*.json`
- Implementacja nowych cost providers (np. `SurfaceTreatmentCostProvider`)
- Integracja z zewnętrznymi cennikami

**Gdzie szukać:**
- 📁 `cost-calculator-service/`
- 📄 `COST_ARCHITECTURE.md` - architektura obliczania kosztów
- 📄 `COST_CALCULATION_PLAN.md` - plan rozwoju
- 📄 `cost-calculator-service/rules/README.md` - jak dodawać reguły

**Przykładowe zadanie:**
```
1. Otwórz cost-calculator-service/rules/material_prices.json
2. Dodaj nowy materiał: "STEEL/S420"
3. Przetestuj przez API: POST /api/costs/calculate
```

### Osoba 3: **Calculation Engine Service** 📐

**Zadania:**
- Implementacja obliczeń statycznych
- Implementacja obliczeń wytrzymałościowych
- Integracja z bibliotekami obliczeniowymi (np. numpy, scipy)

**Gdzie szukać:**
- 📁 `calculation-engine-service/`
- 📄 `ARCHITECTURE.md` - ogólna architektura

**Przykładowe zadanie:**
```
1. Otwórz calculation-engine-service/infrastructure/services/
2. Stwórz calculation_service.py z podstawowymi obliczeniami
3. Dodaj endpoint w presentation/api/routers/calculations.py
```

### Osoba 4: **Frontend (React)** 🎨

**Zadania:**
- Ulepszanie UI/UX
- Dodanie nowych funkcji wizualizacji (np. wybór elementów, pomiar)
- Integracja z API

**Gdzie szukać:**
- 📁 `frontend/src/`
- 📄 `frontend/README.md`

**Przykładowe zadanie:**
```
1. Otwórz frontend/src/components/Viewer3D.jsx
2. Dodaj możliwość zaznaczania elementów (highlight)
3. Wyświetl właściwości zaznaczonego elementu
```

### Osoba 5: **Database Manager Service** 💾

**Zadania:**
- Projektowanie schematu bazy danych
- Implementacja repozytoriów (CRUD)
- Migracje bazy danych

**Gdzie szukać:**
- 📁 `database-manager-service/`
- 📄 `ARCHITECTURE.md`

**Przykładowe zadanie:**
```
1. Stwórz modele domenowe dla Project, Element, Calculation
2. Zaimplementuj repozytoria z operacjami CRUD
3. Dodaj migracje SQLAlchemy
```

### Osoba 6 (Ty): **Orchestration & Integration** 🔧

**Zadania:**
- Koordynacja pracy zespołu
- Integracja wszystkich serwisów
- Rozwiązywanie problemów technicznych

**Gdzie szukać:**
- 📁 `api-gateway/` - orchestracja
- 📄 `ARCHITECTURE.md` - dokumentacja architektury

---

## 5. Dokumentacja

### 📚 Główne dokumenty:

1. **`ARCHITECTURE.md`** - Dlaczego projekt jest tak skonstruowany
2. **`COST_ARCHITECTURE.md`** - Architektura obliczania kosztów
3. **`COST_CALCULATION_FLOW.md`** - Przepływ obliczania kosztów
4. **`COST_USAGE_EXAMPLE.md`** - Przykłady użycia kosztów w kodzie
5. **`COST_CALCULATION_PLAN.md`** - Plan rozwoju funkcji kosztów

### 🔍 Gdzie szukać informacji?

**Pytanie**: "Jak działa obliczanie kosztów?"
→ **Odpowiedź**: Zobacz `COST_ARCHITECTURE.md` + `cost-calculator-service/domain/interfaces/`

**Pytanie**: "Jak dodać nowy endpoint?"
→ **Odpowiedź**: Zobacz `api-gateway/presentation/api/routers/` (przykłady)

**Pytanie**: "Jak działa parsowanie IFC?"
→ **Odpowiedź**: Zobacz `ifc-parser-service/infrastructure/services/ifc_parser_service.py`

**Pytanie**: "Jak działa wizualizacja 3D?"
→ **Odpowiedź**: Zobacz `frontend/src/components/Viewer3D.jsx`

---

## 6. Przydatne Komendy

### Docker

```bash
# Uruchom wszystko
docker-compose up --build

# Uruchom tylko jeden serwis
docker-compose up api-gateway

# Zobacz logi konkretnego serwisu
docker-compose logs -f cost-calculator-service

# Zatrzymaj wszystko
docker-compose down

# Zatrzymaj i usuń wolumeny
docker-compose down -v
```

### Debugging

```bash
# Wejdź do kontenera
docker-compose exec cost-calculator-service bash

# Uruchom testy (gdy będą dostępne)
docker-compose exec cost-calculator-service pytest

# Sprawdź status wszystkich serwisów
docker-compose ps
```

### Frontend (lokalny dev)

```bash
cd frontend
npm install
npm run dev
```

### Backend (lokalny dev, opcjonalnie)

```bash
# W katalogu mikroserwisu
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 5003
```

---

## 7. Workflow Pracy

### ✅ Zalecany workflow:

1. **Zrozum zadanie**
   - Przeczytaj dokumentację
   - Sprawdź istniejący kod
   - Zidentyfikuj miejsca do zmian

2. **Stwórz branch**
   ```bash
   git checkout -b feature/twoja-funkcjonalnosc
   ```

3. **Rozwijaj w Clean Architecture**
   - Najpierw `domain/` (interfejsy, entitites)
   - Potem `infrastructure/` (implementacje)
   - Na końcu `presentation/` (endpoints)

4. **Testuj lokalnie**
   - Uruchom `docker-compose up`
   - Przetestuj przez Swagger UI (http://localhost:8000/docs)
   - Przetestuj przez frontend

5. **Commit i Push**
   ```bash
   git add .
   git commit -m "feat: dodaj funkcjonalność X"
   git push origin feature/twoja-funkcjonalnosc
   ```

---

## 8. Najczęstsze Pytania (FAQ)

### ❓ "Gdzie jest baza danych?"

Baza PostgreSQL jest w Dockerze. Dane są w wolumenie `postgres_data`.

### ❓ "Jak dodać nowy mikroserwis?"

1. Stwórz katalog z strukturą Clean Architecture
2. Dodaj do `docker-compose.yml`
3. Dodaj URL do `api-gateway/infrastructure/config/settings.py`
4. Dodaj routing w `api-gateway/infrastructure/services/orchestration_service.py`

### ❓ "Jak działa komunikacja między serwisami?"

Poprzez HTTP REST API. API Gateway używa `httpx` do wywołań innych serwisów.

### ❓ "Gdzie są reguły biznesowe dla kosztów?"

W `cost-calculator-service/rules/*.json`. Można je modyfikować bez zmiany kodu!

### ❓ "Jak dodać nowy typ kosztu?"

1. Stwórz nowy provider w `cost-calculator-service/infrastructure/services/` (np. `LaborCostProvider.py`)
2. Zaimplementuj interfejs `ICostProvider`
3. Dodaj do `CostService` w `application/container.py`

---

## 9. Kontakt i Wsparcie

### 🤝 Jeśli masz pytania:

- Sprawdź dokumentację w tym katalogu
- Zobacz przykłady w istniejącym kodzie
- Zadaj pytanie w zespole

### 📝 Zgłaszanie problemów:

Jeśli coś nie działa:
1. Sprawdź logi: `docker-compose logs -f <service-name>`
2. Sprawdź czy wszystkie serwisy działają: `docker-compose ps`
3. Sprawdź dokumentację w `ARCHITECTURE.md`

---

## 10. Następne Kroki

Po przeczytaniu tego przewodnika:

1. ✅ Uruchom projekt lokalnie (`docker-compose up`)
2. ✅ Przetestuj podstawowy flow (prześlij IFC, zobacz koszty)
3. ✅ Wybierz segment do pracy (patrz sekcja "Podział Pracy")
4. ✅ Przeczytaj odpowiednią dokumentację (ARCHITECTURE.md, COST_ARCHITECTURE.md)
5. ✅ Zacznij od małej zmiany (np. dodaj nową regułę w JSON)
6. ✅ Zobacz jak działa cały system

---

## 🎉 Powodzenia!

Ten projekt ma solidną podstawę:
- ✅ Clean Architecture (łatwe do zrozumienia)
- ✅ Mikroserwisy (równoległa praca)
- ✅ Docker (jednolita środowisko)
- ✅ Dokumentacja (wiedza dostępna)
- ✅ Działające MVP (można od razu testować)

**Możesz od razu zacząć pracę nad swoim segmentem!** 🚀

---

*Ostatnia aktualizacja: 2024*

