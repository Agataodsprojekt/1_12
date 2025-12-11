# Changelog

Wszystkie znaczące zmiany w projekcie będą dokumentowane w tym pliku.

Format oparty na [Keep a Changelog](https://keepachangelog.com/pl/1.0.0/),
a projekt używa [Semantic Versioning](https://semver.org/lang/pl/).

## [Unreleased]

### Added
- **Camera Controls Toolbar**: Osobny mały toolbar po prawej stronie z przyciskami Home i Fit View
- **Home Button**: Przywraca kamerę do początkowego stanu z płynną animacją
- **Fit View Button**: Automatycznie dopasowuje widok do wszystkich załadowanych modeli
- **Enhanced Grid with Fade-out**: Wielowarstwowy grid z efektem zanikania w oddali
- **Theme-aware Grid Colors**: Automatyczne dostosowanie kolorów siatki do trybu dark/light

### Changed
- **Grid Implementation**: Próba integracji ThatOpen Grid (OBC.Grids) z fallback do wielowarstwowego systemu
- **Grid Appearance**: Zmniejszona intensywność siatki (opacity 0.35) dla bardziej subtelnego wyglądu
- **Grid Colors**: 
  - Dark mode: 0x4a4a4a (subtelny szary)
  - Light mode: 0x999999 (ciemniejszy szary)
- **Camera Controls**: Przyciski Home i Fit przeniesione z ActionBar do osobnego toolbara po prawej stronie

### Fixed
- **Grid Fade-out**: Siatka teraz zanika w oddali, przechodząc płynnie w kolor tła
- **Grid Visibility**: Poprawiono widoczność siatki w obu trybach (dark/light)
- **Grid Intensity**: Zmniejszono rażący efekt siatki w obu trybach

---

## 📅 2025-11-25 (Część 2) - Wysłanie Aplikacji do GitHub

### 🎯 Cel
Inicjalizacja i wysłanie całego projektu Chmura do publicznego repozytorium GitHub.

### ✨ Wykonane Działania

#### 1. 🔧 Inicjalizacja Repozytorium Git
- Zainicjowano nowe repozytorium git w projekcie
- Dodano wszystkie pliki do staging area (219 plików, 78,039 linii kodu)
- Utworzono pierwszy commit: "Initial commit: Full Chmura application with all services and frontend"

#### 2. 📤 Push do GitHub
- **Repozytorium**: https://github.com/Agataodsprojekt/25_11
- Utworzono gałąź `main`
- Pomyślnie wysłano wszystkie pliki do zdalnego repozytorium

#### 3. 📦 Wysłane Komponenty

**Backend Services (mikrousługi):**
- ✅ `api-gateway` - Brama API z orchestracją
- ✅ `ifc-parser-service` - Parser plików IFC
- ✅ `cost-calculator-service` - Kalkulator kosztów z regułami biznesowymi
- ✅ `database-manager-service` - Zarządzanie projektami
- ✅ `calculation-engine-service` - Silnik obliczeń
- ✅ `3d-data-service` - Serwis wizualizacji 3D

**Frontend:**
- ✅ Aplikacja React + TypeScript + Vite
- ✅ Wszystkie komponenty UI (IFCUploader, Viewer3D, CostSummary, ElementsList, etc.)
- ✅ Nowe narzędzia 3D (DimensionTool, SearchPanel, SelectionPanel)
- ✅ Hooks i konteksty (useIFCData, useComments, useViewerHistory, ThemeContext)
- ✅ Konfiguracja Tailwind CSS
- ✅ Pliki WASM dla web-ifc

**Konfiguracja i Infrastruktura:**
- ✅ `docker-compose.yml` - Orchestracja kontenerów
- ✅ Dockerfiles dla wszystkich serwisów
- ✅ Pliki requirements.txt z zależnościami Python
- ✅ package.json z zależnościami Node.js
- ✅ Skrypty uruchomieniowe (`run_all.ps1`, `run_all.sh`)
- ✅ Pliki `.gitignore` dla Python i Node.js

**Dokumentacja:**
- ✅ README.md główny
- ✅ Cały folder `docks/` z dokumentacją techniczną:
  - ARCHITECTURE.md - Architektura systemu
  - API_EXAMPLES.md - Przykłady użycia API
  - COST_CALCULATION_FLOW.md - Przepływ kalkulacji kosztów
  - DOCKER_SETUP.md - Instrukcje Docker
  - FRONTEND_FEATURES.md - Funkcjonalności frontendu
  - GIT_WORKFLOW_GUIDE.md - Workflow Git
  - TEAM_ONBOARDING.md - Onboarding zespołu
  - I wiele więcej...

**Dane i Zasoby:**
- ✅ Plik testowy IFC (`KONSTRUKCJA_NAWA_III.ifc`)
- ✅ Reguły kalkulacji kosztów (JSON):
  - calculation_rules.json
  - connection_costs.json
  - labor_rates.json
  - material_prices.json
  - waste_factors.json
- ✅ Pakiet wspólny (`common-package`) z Result pattern

**Szablony GitHub:**
- ✅ `.github/ISSUE_TEMPLATE/` - Szablony zgłoszeń (bug_report, feature_request)
- ✅ `.github/PULL_REQUEST_TEMPLATE.md` - Szablon Pull Request

### 📊 Statystyki Push

```
📁 Plików: 219
📝 Linii kodu: 78,039
🔧 Języki: Python, TypeScript, JavaScript, JSON, Markdown, YAML, Dockerfile
📦 Wielkość: ~8.5 MB (z plikiem IFC)
🌳 Gałąź: main
```

### 🎯 Struktura Repozytorium

```
25_11/
├── api-gateway/
├── ifc-parser-service/
├── cost-calculator-service/
├── database-manager-service/
├── calculation-engine-service/
├── 3d-data-service/
├── common-package/
├── frontend/
├── docks/
├── docker-compose.yml
├── README.md
└── run_all scripts
```

### ✅ Stan Projektu

- 🟢 Wszystkie pliki zostały pomyślnie wysłane
- 🟢 Historia Git zachowana (1 commit)
- 🟢 Repozytorium gotowe do współpracy zespołowej
- 🟢 Dokumentacja kompletna i aktualna
- 🟢 Konfiguracja Docker gotowa do uruchomienia

### 🔄 Następne Kroki

1. **Dla Zespołu:**
   - Sklonować repozytorium: `git clone https://github.com/Agataodsprojekt/25_11.git`
   - Przeczytać dokumentację w `docks/TEAM_ONBOARDING.md`
   - Skonfigurować lokalne środowisko według `docks/DOCKER_SETUP.md`

2. **Rozwój:**
   - Utworzyć gałęzie feature dla nowych funkcjonalności
   - Stosować Pull Requests dla zmian
   - Aktualizować CHANGELOG.md przy każdej zmianie

3. **Deployment:**
   - Skonfigurować CI/CD (GitHub Actions)
   - Przygotować środowisko produkcyjne
   - Ustawić zmienne środowiskowe

### 🙏 Uwagi
- Repozytorium jest publiczne - każdy może je zobaczyć
- Branch protection rules nie są jeszcze skonfigurowane
- Zalecane: ustawienie ochrony gałęzi `main` i wymaganie review przed merge

---

## 📅 2025-11-25 (Część 1) - Integracja Zaawansowanych Narzędzi 3D i Tryb Offline

### 🎯 Cel Sesji
Połączenie aplikacji "that-open-editor" (zaawansowane narzędzia 3D) z aplikacją "Chmura" (backend mikrousług + integracja IFC) oraz dodanie możliwości pracy offline bez backendu.

### ✨ Dodane Funkcjonalności

#### 1. 🚀 Tryb Lokalnego Ładowania IFC
- **Opis**: Możliwość ładowania plików IFC bezpośrednio w przeglądarce bez potrzeby uruchomienia backendu
- **Technologia**: OpenBIM Components `FragmentIfcLoader`
- **Komponenty**:
  - `IFCUploader.tsx` - dodano prop `onLocalLoad` i przycisk "🚀 Załaduj lokalnie"
  - `Viewer.tsx` - dodano funkcję `handleLocalFileLoad()` wykorzystującą `FragmentIfcLoader`
  - Przechowywanie referencji `ifcLoaderRef` dla dostępu do loadera
- **Use Case**: Praca bez dostępu do backendu / rozwój frontendu / prezentacje offline
- **Pliki**: 
  - `frontend/src/components/IFCUploader.tsx` (zmodyfikowano)
  - `frontend/src/pages/Viewer.tsx` (zmodyfikowano)

#### 2. 📐 Zaawansowane Wymiarowanie (Dimensioning Tool)
- **Opis**: Narzędzie do precyzyjnego wymiarowania elementów 3D
- **Funkcje**:
  - Wymiarowanie ortogonalne (snap do osi X/Y/Z)
  - Snap to points (przyciąganie do wierzchołków)
  - Align to edge (równoległe/prostopadłe do krawędzi)
  - Architektoniczne znaczniki wymiarów
  - Dynamiczne etykiety z wartościami w metrach
- **Kontrola**: Panel opcji `DimensionOptionsPanel` z przełącznikami
- **Interakcja**: Shift + klik dla tworzenia wymiarów
- **Pliki**:
  - `frontend/src/utils/SimpleDimensionTool.ts` (nowy)
  - `frontend/src/components/DimensionOptionsPanel.tsx` (nowy)
  - `frontend/src/components/icons/DimensionIcon.tsx` (nowy)

#### 3. 🔍 Wyszukiwarka Elementów IFC
- **Opis**: Real-time wyszukiwanie elementów w modelu 3D
- **Funkcje**:
  - Wyszukiwanie po nazwie i typie elementu
  - Lista wyników z highlightingiem
  - Opcja dodania do multi-selekcji
  - Wyświetlanie liczby znalezionych elementów
- **Interakcja**: Panel boczny z polem wyszukiwania
- **Pliki**:
  - `frontend/src/components/SearchPanel.tsx` (nowy)

#### 4. ✅ Multi-Selekcja i Izolacja Widoku
- **Opis**: Zaznaczanie wielu elementów i izolacja widoku
- **Funkcje**:
  - Ctrl + klik dla dodania/usunięcia z selekcji
  - Lista zaznaczonych elementów
  - Izolacja widoku (ukrycie niewybranych elementów)
  - Fragment splitting dla precyzyjnej izolacji
  - Przywracanie pełnego widoku
- **Interakcja**: Panel zarządzania selekcją
- **Pliki**:
  - `frontend/src/components/SelectionPanel.tsx` (nowy)

#### 5. ⏮️ System Undo/Redo
- **Opis**: Historia akcji z możliwością cofania
- **Obsługiwane akcje**:
  - Ruchy kamery (pozycja + rotacja)
  - Tworzenie wymiarów
  - Usuwanie wymiarów
- **Kontrola**: Przyciski w ActionBar + skróty klawiszowe
- **Pliki**:
  - `frontend/src/hooks/useViewerHistory.ts` (nowy)

#### 6. 🎨 Poprawki Interfejsu
- **Nagłówek aplikacji**: "IFC Construction Calculator"
- **Opis**: "Wizualizacja i analiza konstrukcji budowlanych"
- **Fix**: Zastąpienie CSS variables (HSL) bezpośrednimi wartościami hex dla poprawnego wyświetlania

### 🔧 Poprawki Techniczne

#### Naprawione Błędy
1. **IFCUploader Props Mismatch**
   - Problem: Niezgodność interfejsów (`onLoading` vs `setIsLoading`)
   - Rozwiązanie: Ujednolicenie props w `IFCUploader.tsx` i `Viewer.tsx`

2. **CSS Variables nie działają w inline styles**
   - Problem: `hsl(var(--background))` nie był rozwiązywany
   - Rozwiązanie: Użycie bezpośrednich wartości hex (#ffffff, #1f2937, etc.)

3. **Network Error przy braku backendu**
   - Problem: Frontend wymagał działającego backendu
   - Rozwiązanie: Dodanie trybu lokalnego ładowania IFC

4. **"data.subarray is not a function" przy lokalnym ładowaniu**
   - Problem: FragmentIfcLoader nie obsługuje bezpośrednio obiektu File
   - Rozwiązanie: Konwersja pliku do Uint8Array przez `file.arrayBuffer()`
   - Kod:
     ```typescript
     const arrayBuffer = await file.arrayBuffer();
     const data = new Uint8Array(arrayBuffer);
     const model = await ifcLoaderRef.current.load(data);
     ```

5. **Brakujące pliki WASM dla web-ifc**
   - Problem: Pliki `web-ifc.wasm` i `web-ifc-mt.wasm` nie były w folderze public
   - Rozwiązanie: Skopiowanie plików WASM z that-open-editor
   - Pliki: `frontend/public/web-ifc.wasm`, `frontend/public/web-ifc-mt.wasm`

6. **Konfiguracja Vite dla WASM i SharedArrayBuffer**
   - Problem: Brak nagłówków CORS potrzebnych dla web-ifc
   - Rozwiązanie: Dodanie nagłówków w `vite.config.ts`:
     ```typescript
     headers: {
       'Cross-Origin-Embedder-Policy': 'require-corp',
       'Cross-Origin-Opener-Policy': 'same-origin',
     }
     ```

7. **"A highlight with this name already exists" - duplikacja grup highlightera**
   - Problem: `highlighter.setup()` już tworzy domyślne grupy, próba dodania ich ponownie powodowała błąd
   - Objawy: Przyciski nie reagowały na kliknięcia, błąd w konsoli
   - Rozwiązanie: 
     - Usunięto ręczne dodawanie grup `highlighter.add("select", [])` i `highlighter.add("pin", [])`
     - Zmieniono wszystkie wywołania `highlightByID('select', ...)` na `highlightByID('', ...)`
     - Używamy teraz domyślnej grupy highlightera zamiast nazwanych grup

8. **Przyciski IFCUploader niemożliwe do kliknięcia**
   - Problem: Panel IFCUploader był widoczny ale niemożliwy do kliknięcia
   - Przyczyna: Canvas Three.js przechwytywał wszystkie eventy myszy
   - Rozwiązanie:
     - Dodano tło, obramowanie i cień do panelu IFCUploader dla lepszej widoczności
     - Zwiększono z-index panelu do 1000
     - Dodano `pointerEvents: 'auto'` do wszystkich paneli UI
     - Dodano reguły CSS w `index.css` zapewniające że UI ma priorytet nad canvas:
       ```css
       div[style*="position: absolute"] {
         pointer-events: auto !important;
       }
       ```
   - **WAŻNE**: Przyciski są disabled dopóki nie wybierzesz pliku .ifc przez kliknięcie w pole "Wybierz plik .ifc"

9. **Model się ładuje ale nie wyświetla na scenie**
   - Problem: Po lokalnym załadowaniu pliku IFC, model był w pamięci ale niewidoczny w viewerze
   - Przyczyna: 
     - Fragmenty modelu nie były dodawane do listy obiektów dla narzędzi 3D
     - Kamera nie była dopasowana do modelu
     - `modelObjectsRef` nie był aktualizowany
   - Rozwiązanie:
     - Po załadowaniu modelu, zbieramy wszystkie meshe ze sceny (`scene.traverse`)
     - Aktualizujemy `modelObjectsRef.current` dla narzędzi wymiarowania
     - Obliczamy bounding box całego modelu (THREE.Box3)
     - Automatycznie ustawiamy kamerę w odpowiedniej pozycji i odległości
     - Aktualizujemy `controls.target` aby kamera była skierowana na środek modelu
   - Rezultat: Model jest teraz widoczny i wszystkie narzędzia 3D działają poprawnie

### 📊 Statystyki

#### Pliki Zmodyfikowane: 4
- `frontend/src/components/IFCUploader.tsx`
- `frontend/src/pages/Viewer.tsx`
- `frontend/vite.config.ts`
- `docks/CHANGELOG.md`

#### Pliki Dodane: 9
- `frontend/src/utils/SimpleDimensionTool.ts` (~500 linii)
- `frontend/src/components/DimensionOptionsPanel.tsx` (~150 linii)
- `frontend/src/components/SearchPanel.tsx` (~120 linii)
- `frontend/src/components/SelectionPanel.tsx` (~180 linii)
- `frontend/src/components/icons/DimensionIcon.tsx` (~30 linii)
- `frontend/src/hooks/useViewerHistory.ts` (~80 linii)
- `frontend/public/KONSTRUKCJA_NAWA_III.ifc` (plik testowy, 8.16 MB)
- `frontend/public/web-ifc.wasm` (WebAssembly dla parsowania IFC)
- `frontend/public/web-ifc-mt.wasm` (WebAssembly multi-threaded)

#### Całkowita Liczba Linii Kodu: ~1060+ nowych linii

### 🏗️ Architektura

#### Zachowana Struktura Chmura
✅ Wszystkie 6 mikrousług backendu (API Gateway, IFC Parser, Calculation Engine, Cost Calculator, 3D Data Service, Database Manager)
✅ Docker Compose konfiguracja
✅ PostgreSQL integracja
✅ Oryginalne komponenty frontendu (IFCUploader, CostSummary, VisibilityControls, ElementsList)
✅ Integracja API (`lib/api.ts`, `hooks/useIFCData.ts`)

#### Dodane z that-open-editor
➕ Zaawansowane narzędzia 3D
➕ System undo/redo
➕ Wyszukiwarka i multi-selekcja
➕ Ulepszone komponenty UI

### 🎯 Następne Kroki

1. **Uruchomienie backendu lokalnie** (bez Dockera):
   - Zainstalować PostgreSQL lub użyć SQLite
   - Uruchomić mikrousługi przez `run_all.ps1`

2. **Rozszerzenie funkcjonalności offline**:
   - Mock API dla kosztów
   - Lokalne obliczenia

3. **Testy**:
   - Dodać testy dla nowych komponentów
   - Przetestować integrację z backendem

### 🙏 Uwagi
- Aplikacja działa w trybie offline z lokalnym ładowaniem IFC
- Koszty nie są obliczane w trybie lokalnym (wymagany backend)
- Wszystkie narzędzia 3D działają niezależnie od backendu

---

## [0.1.0] - 2024-XX-XX

### Added
- Initial project structure with Clean Architecture
- Microservices architecture (API Gateway, IFC Parser, Cost Calculator, etc.)
- Docker and docker-compose setup
- React frontend with Three.js visualization
- Cost calculation with Provider Pattern
- Business rules system (JSON files)
- Comprehensive documentation

### Changed

### Deprecated

### Removed

### Fixed

### Security

---

## [0.1.0] - 2024-XX-XX

### Added
- Initial release
- Basic IFC parsing functionality
- 3D visualization with Three.js
- Cost calculation architecture
- API Gateway with direct endpoints
- Automatic cost calculation on IFC parse

---

## Template dla przyszłych release'ów:

```markdown
## [0.2.0] - 2024-XX-XX

### Added
- Nowa funkcja 1
- Nowa funkcja 2

### Changed
- Zmiana w istniejącej funkcji

### Fixed
- Naprawa błędu 1
- Naprawa błędu 2

### Deprecated
- Funkcja, która będzie usunięta w przyszłości

### Removed
- Usunięta funkcja

### Security
- Poprawka bezpieczeństwa
```

