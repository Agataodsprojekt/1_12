# Historia Zmian - That Open Editor

## [2024-11-25] - Wtorek, 25 listopada 2024

### 🐳 Konteneryzacja (Docker)

#### Konfiguracja Docker
- ✨ **Dodano pełną konfigurację Docker do projektu**
  - Multi-stage Dockerfile dla optymalizacji rozmiaru obrazu
  - Stage 1: Budowanie aplikacji (Node 18 Alpine)
  - Stage 2: Produkcja (Nginx Alpine)
  - Automatyczna kopia plików WASM do katalogu dist
  
#### Docker Compose
- 🚀 **Dodano docker-compose.yml**
  - Łatwe uruchomienie aplikacji jedną komendą
  - Port mapping: 3000:80
  - Auto-restart: unless-stopped
  - Możliwość montowania własnej konfiguracji nginx
  
#### Nginx Configuration
- ⚡ **Zaawansowana konfiguracja Nginx**
  - Kompresja Gzip dla statycznych zasobów
  - Security headers (X-Frame-Options, X-Content-Type-Options, X-XSS-Protection)
  - Cache dla zasobów statycznych (1 rok)
  - Poprawny MIME type dla plików WASM
  - Wsparcie dla React Router (SPA routing)
  - Health check endpoint (/health)
  
#### Optymalizacja
- 📦 **Dodano .dockerignore**
  - Wykluczenie node_modules z obrazu
  - Wykluczenie plików deweloperskich i dokumentacji
  - Znaczne zmniejszenie rozmiaru kontekstu budowania
  - Szybsze budowanie obrazów

### 📚 Użycie Docker

#### Budowanie i uruchamianie
```bash
# Zbuduj i uruchom w trybie detached
docker-compose up -d

# Zbuduj od nowa (force rebuild)
docker-compose up -d --build

# Sprawdź logi
docker-compose logs -f

# Zatrzymaj
docker-compose down
```

#### Ręczne budowanie
```bash
# Zbuduj obraz
docker build -t that-open-editor .

# Uruchom kontener
docker run -d -p 3000:80 --name that-open-editor that-open-editor
```

#### Dostęp do aplikacji
- Aplikacja dostępna pod: http://localhost:3000
- Health check: http://localhost:3000/health

### 🎯 Korzyści z Dockera

- ✅ **Spójne środowisko** - identyczne zachowanie na różnych maszynach
- ✅ **Łatwe wdrożenie** - jedna komenda do uruchomienia
- ✅ **Izolacja** - aplikacja działa w kontrolowanym środowisku
- ✅ **Skalowalność** - łatwe skalowanie w chmurze
- ✅ **Optymalizacja** - multi-stage build redukuje rozmiar obrazu
- ✅ **Produkcyjny Nginx** - wydajne serwowanie statycznych plików

### 📊 Statystyki
- **Nowych plików:** 4 (Dockerfile, docker-compose.yml, nginx.conf, .dockerignore)
- **Rozmiar obrazu:** ~50MB (dzięki Alpine Linux i multi-stage build)
- **Czas budowania:** ~2-3 minuty (pierwsze budowanie)
- **Repository:** `that-open-editor`

---

## [2024-11-20] - Środa, 20 listopada 2024

### 🎯 Główne Funkcjonalności

#### 📏 Narzędzie Wymiarowania (Dimension Tool)
- **Dodano kompletne narzędzie wymiarowania 3D**
  - Tworzenie wymiarów poprzez Shift + klik na dwóch punktach
  - Profesjonalny wygląd wymiarów (linie, etykiety z tłem, znaki architektoniczne)
  - Adaptacyjne skalowanie etykiet względem odległości kamery
  - Wymiary zawsze zwrócone frontem do kamery (billboard effect)

#### 🎨 Wizualizacja Wymiarów
- **Profesjonalne znaki architektoniczne**
  - Ukośne kreski 45° na końcach wymiarów (zamiast strzałek)
  - Zgodne ze standardami architektonicznymi (AutoCAD, Revit)
  
- **Etykiety wymiarów**
  - Białe tło z gradientem i zaokrąglonymi rogami
  - Niebieskie obramowanie
  - Cień na tekście dla lepszej czytelności
  - Precyzja do 2 miejsc po przecinku (XX.XXm)

- **Kolory**
  - 🔴 Czerwone punkty (markery miejsc pomiaru)
  - 🟢 Zielona linia (podgląd wymiaru podczas rysowania)
  - 🔵 Niebieska linia (finalny wymiar)

#### 🧲 Przyciąganie do Punktów (Snap)
- **Inteligentne wykrywanie punktów charakterystycznych**
  - Wierzchołki elementów
  - Środki elementów (centrum bounding box)
  - Rogi bounding box (początek/koniec elementu)
  - Środki krawędzi bounding box

- **Wizualizacja punktów snap**
  - 🟩 Małe zielone kwadraty pokazujące wszystkie dostępne punkty
  - Animowane obracanie i pulsacja kwadratów
  - 🟢 Duży zielony marker na najbliższym punkcie przyciągania
  - Próg przyciągania: 0.5m

#### 📐 Opcje Wymiarowania

##### 1. Wymiary Ortogonalne
- Wymiary wyrównane do osi X, Y, Z
- Automatyczne wybieranie dominującej osi

##### 2. Wyrównanie do Krawędzi Elementu
- **Równolegle** (∥) - wymiar równoległy do wybranej powierzchni
- **Prostopadle** (⊥) - wymiar prostopadły do wybranej powierzchni
- Wizualizacja wybranej krawędzi (zielona/fioletowa linia)

#### 🎮 Sterowanie

##### Dodawanie Wymiarów
- `Shift` + klik = dodaj pierwszy punkt
- `Shift` + klik = dodaj drugi punkt (wymiar gotowy)
- `ESC` = anuluj bieżący wymiar

##### Usuwanie Wymiarów
- `Shift` + podwójne kliknięcie na wymiarze = zaznacz (zmieni kolor na czerwony)
- `Delete` = usuń zaznaczony wymiar
- `ESC` = anuluj zaznaczenie

##### Nawigacja
- **Bez Shift** = pełna kontrola kamery (obracanie, przesuwanie, zoom)
- **Z Shift** = tryb wymiarowania (kamera zablokowana)

#### ⏪ System Undo/Redo
- **Uniwersalny system historii akcji**
  - Cofanie/przywracanie dodawania wymiarów
  - Cofanie/przywracanie usuwania wymiarów
  - Cofanie/przywracanie ruchów kamery
  - Inteligentna historia (kasowanie "przyszłości" po nowej akcji)

- **Przyciski**
  - ⏪ Undo = cofnij ostatnią akcję
  - ⏩ Redo = przywróć cofniętą akcję

#### 🎛️ Panel Opcji Wymiarowania
- **Kompaktowy, przesuwany panel**
  - Przeciąganie za niebieski nagłówek
  - Dwa tryby: zwinięty (tylko ikony) i rozwinięty (pełne opisy)
  - Minimalna przestrzeń (~40px w wersji zwiniętej)

- **Tryb zwinięty (domyślny)**
  - 🔵 Ikona siatki = wymiary ortogonalne
  - 🟢 Ikona okręgu = przyciąganie do punktów
  - 🟣 Ikona ruchu = wyrównanie do krawędzi
  - Tooltips po najechaniu myszką

- **Tryb rozwinięty**
  - Pełne nazwy opcji
  - Opisy funkcjonalności
  - Instrukcje sterowania

#### 🔍 Wyszukiwarka Elementów (Search Tool)
- **Nowa funkcja wyszukiwania elementów w modelu IFC**
  - Panel wyszukiwania aktywowany przyciskiem lupy 🔍
  - Wyszukiwanie w czasie rzeczywistym (debounce 300ms)
  - Minimalna długość zapytania: 2 znaki

- **Kryteria wyszukiwania**
  - 📝 Nazwa elementu (np. "Column", "Wall")
  - 🏷️ Typ IFC (np. "IfcWall", "IfcColumn", "IfcBeam")
  - 🔢 Numer ID elementu (Express ID)
  - 🌐 GlobalId elementu
  - 📋 ObjectType elementu

- **Wyświetlanie wyników**
  - Lista wszystkich znalezionych elementów
  - Dla każdego elementu: nazwa, typ, ID
  - Możliwość rozwinięcia szczegółów (właściwości)
  - Licznik znalezionych wyników
  - Komunikaty o braku wyników lub zbyt krótkiej frazy

- **Interakcja z wynikami**
  - Kliknięcie na wynik → automatyczne zaznaczenie elementu w modelu 3D
  - Wyświetlenie właściwości zaznaczonego elementu w panelu Properties
  - **Przycisk "+" → dodanie pojedynczego elementu do selekcji wielokrotnej**
  - **🆕 Przycisk "Dodaj wszystkie" → dodanie wszystkich wyników do selekcji jednym kliknięciem** ⭐
  - Możliwość dodania komentarza do znalezionego elementu
  - Przycisk X lub wybór innego narzędzia zamyka panel

- **Wygląd panelu**
  - Pozycjonowanie: prawy górny róg (poniżej ActionBar)
  - Szerokość: 384px (96 w Tailwind)
  - Maksymalna wysokość: 80vh (przewijanie wyników)
  - Ciemny/jasny motyw zgodny z resztą aplikacji
  - Ikona lupy w nagłówku i polu wyszukiwania

- **Szybka selekcja po typach** 🚀
  - Wyszukaj np. "beam" → wyświetli wszystkie belki
  - Kliknij "Dodaj wszystkie" → wszystkie belki dodane do selekcji
  - Otwórz panel selekcji → kliknij "Izoluj"
  - Widoczne tylko belki! 🎯
  - Działa dla dowolnego typu: ściany, słupy, płyty, instalacje, itp.

#### 🎯 Selekcja Wielokrotna i Izolacja Elementów (Selection & Isolation Tool)
- **Nowe narzędzie selekcji i izolacji elementów** ⭐
  - Ikona warstw (Layers) na pasku narzędzi (przedostatnie miejsce)
  - Panel zarządzania selekcją wielokrotną
  - Funkcja izolacji widoku (ukrycie niewybranych elementów)
  - Integracja z wyszukiwarką

##### Selekcja Wielokrotna
- **Ctrl + Klik** na elemencie w modelu → dodaje do selekcji
- **Przycisk "+" w wyszukiwarce** → dodaje wynik do selekcji
- Lista wszystkich wybranych elementów w panelu
- Wyświetlanie: nazwa, typ IFC, Express ID
- Licznik wybranych elementów

##### Izolacja Widoku
- **Przycisk "Izoluj"** → ukrywa wszystkie elementy oprócz wybranych
  - Działa na poziomie fragmentów mesh
  - Zachowuje pełną geometrię wybranych elementów
  - Wydajne renderowanie (tylko wybrane elementy)
- **Przycisk "Pokaż wszystkie"** → przywraca widoczność wszystkich elementów
- **Wskaźnik stanu izolacji** → "🔍 Widoczne tylko wybrane elementy"

##### Zarządzanie Selekcją
- **Kliknięcie na element w liście** → podświetlenie w modelu 3D
- **Przycisk X na elemencie** → usunięcie z selekcji (pojedynczo)
- **Przycisk kosza** → wyczyszczenie całej selekcji
- **Automatyczne zamknięcie panelu** → przy wyborze innego narzędzia

##### Wygląd i UX
- Panel po prawej stronie (obok wyszukiwarki)
- Fioletowa kolorystyka (odróżnienie od innych paneli)
- Przyciski akcji: niebieski (Izoluj), zielony (Unisolate), czerwony (Wyczyść)
- Komunikat gdy brak elementów: "Kliknij elementy z Ctrl lub użyj wyszukiwarki"
- Tooltips dla wszystkich przycisków

##### Przypadki Użycia
1. **Analiza konstruk cji** → wybór wszystkich słupów → izolacja → pomiary
2. **Kontrola instalacji** → wyszukanie "pipe" → dodanie do selekcji → izolacja
3. **Prezentacja** → wybór konkretnych elementów → ukrycie reszty
4. **Koordynacja** → izolacja elementów na styku branż

### 🔧 Poprawki i Ulepszenia

#### Izolacja Elementów
- ✅ **Naprawiono funkcję izolacji elementów (3 iteracje)**
  
  **Iteracja 1:**
  - Problem: elementy nie były ukrywane mimo kliknięcia "Izoluj"
  - Przyczyna: niepoprawna obsługa instancjonowanej geometrii w OpenBIM Components
  
  **Iteracja 2:**
  - Problem: błąd `Cannot read properties of undefined (reading 'mesh')`
  - Przyczyna: błędne założenie o strukturze danych `model.items`
    - Kod próbował: `item.fragment.mesh` ❌
    - Powinno być: `item.mesh` ✅
  
  **Iteracja 3:**
  - Problem: fragmenty mieszane (wybrane belki + niewybrane kolumny) były "fikcyjnie ukryte"
    - Metoda `instanceColor` (czarny kolor) nie działała - elementy nadal widoczne jako ciemne sylwetki
  - Próba naprawy: przesunięcie przez `instanceMatrix` (pozycja y=-10000)
    - NIE ZADZIAŁAŁO - elementy nadal widoczne, tylko w kolorze
  
  **Iteracja 4:**
  - Problem: przesuwanie pozycji NIE DZIAŁA z OpenBIM InstancedMesh
  - Próba: skalowanie (`scale ≈ 0`) - też NIE DZIAŁA
  - Przyczyna: OpenBIM Components cachuje/ignoruje zmiany w `instanceMatrix`
  
  **Iteracja 5 (FINALNA - Fragment Splitting!):** ⭐
  - ✅ **Pełne fragmenty** (tylko niewybrane): `mesh.visible = false` - **DZIAŁA IDEALNIE**
  - ✅ **Pełne fragmenty** (tylko wybrane): `mesh.visible = true` - **DZIAŁA IDEALNIE**
  - ✅ **Fragmenty mieszane** (wybrane + niewybrane w jednym mesh): **SPLITTING!**
  
  **Mechanizm Fragment Splitting:**
  1. **Analiza fragmentu** - sprawdzenie które instancje są wybrane/niewybrane
  2. **Utworzenie 2 nowych InstancedMesh:**
     - `visibleMesh` - tylko wybrane instancje (widoczny)
     - `hiddenMesh` - tylko niewybrane instancje (ukryty: `visible = false`)
  3. **Kopiowanie danych z oryginalnego mesh:**
     - Macierze transformacji (`instanceMatrix`)
     - Kolory instancji (`instanceColor`)
     - Współdzielona geometria i materiały (wydajność!)
  4. **Zarządzanie sceną:**
     - Ukrycie oryginalnego fragmentu
     - Dodanie nowych mesh do sceny w tym samym miejscu
     - Zapisanie referencji do późniejszego przywrócenia
  5. **Przywracanie (unisolate):**
     - Usunięcie split meshes ze sceny
     - Przywrócenie widoczności oryginalnych fragmentów
     - Czyszczenie pamięci (references cleared)
  
  **Zalety rozwiązania:**
  - ✅ **100% dokładność** - pokazuje DOKŁADNIE wybrane elementy
  - ✅ **Wydajność** - geometry i materials są współdzielone (shared)
  - ✅ **Stabilność** - nie modyfikujemy oryginalnych danych modelu
  - ✅ **Odwracalność** - pełne przywrócenie oryginalnego stanu
  - ✅ **Skalowalność** - działa z dowolną liczbą fragmentów
  - ✅ **Zachowanie kolorów** - kopiuje `instanceColor` z oryginalnego mesh
  
  **Przypadki użycia:**
  - Fragment z 100 elementów: 4 belki wybrane → split na 4 + 96 → ukryj 96 ✅
  - Fragment z 50 elementów: 25 słupów wybranych → split na 25 + 25 → ukryj 25 ✅
  - Fragment z 200 elementów: 1 element wybrany → split na 1 + 199 → ukryj 199 ✅

#### Ikony Narzędzi
- ✨ **Nowa ikona wymiarowania ze strzałkami**
  - Symbol ze strzałkami w lewo i prawo
  - Litera "X" nad symbolem
  - Zwiększona grubość linii (strokeWidth: 2.5)
  - Większe wymiary dla lepszej widoczności
  - Profesjonalny wygląd symbolu wymiarowania
  - Zgodny z międzynarodowymi standardami CAD

- 🔍 **Zmiana ikony "Oświetlenie" na "Wyszukiwarkę"**
  - Żarówka (Lightbulb) → Lupa (Search)
  - Przygotowanie pod przyszłą funkcję wyszukiwania elementów w modelu
  - Tooltip: "Search elements in the model"

#### Interakcja z Przyciskami
- ✨ **Inteligentne przełączanie przycisków**
  - Przyciski trybów (dimension, pin, search, comment, move) są teraz togglable
  - Ponowne kliknięcie wyłącza narzędzie i wraca do trybu "move"
  - Przyciski akcji jednorazowych (undo, redo, camera, share) nie zmieniają aktywnego trybu
  - Koniec problemu z podświetlonymi przyciskami po wyłączeniu narzędzia

- 📌 **Naprawa paneli narzędzi**
  - Panel wyboru koloru pinezki teraz poprawnie znika po wyłączeniu przycisku pinezki
  - Panel opcji wymiarowania poprawnie znika po wyłączeniu przycisku wymiarowania
  - Panel komentarzy poprawnie znika po wyłączeniu przycisku komentarzy
  - Wszystkie panele zamykają się również przy wyborze innego narzędzia
  - Pełna synchronizacja stanu przycisków z widocznością odpowiednich paneli

#### Usunięte Elementy
- ❌ Usunięto wskaźnik osi (X/Y/Z badge) z wymiarów ortogonalnych
- ❌ Usunięto dużą niebieską podpowiedź na dole ekranu
- ❌ Automatyczne usuwanie czerwonych markerów po utworzeniu wymiaru

#### Optymalizacje
- Debounce dla zapisywania stanu kamery (300ms)
- Ograniczona liczba wierzchołków do analizy snap (co 50-ty)
- Tylko punkty snap w promieniu 1.5m od kursora
- Animacje w requestAnimationFrame dla płynności

### 📁 Nowe Pliki

#### Komponenty
- `src/utils/SimpleDimensionTool.ts` - Główna implementacja narzędzia wymiarowania
- `src/components/DimensionOptionsPanel.tsx` - Panel opcji wymiarowania
- `src/components/icons/DimensionIcon.tsx` - Własna ikona wymiarowania ze strzałkami

#### Funkcje SimpleDimensionTool
- `handleClick()` - obsługa kliknięć (dodawanie punktów)
- `handleMouseMove()` - podgląd wymiaru i punktów snap
- `handleRightClick()` - zaznaczanie wymiaru do usunięcia
- `cancelCurrentMeasurement()` - anulowanie bieżącego wymiaru
- `deleteMeasurement()` - usuwanie wymiaru
- `highlightMeasurement()` - podświetlanie wymiaru (czerwony)
- `onMeasurementCreated` - callback dla undo/redo
- `getMeasurementData()` - pobieranie danych wymiaru
- `restoreMeasurement()` - przywracanie usuniętego wymiaru
- `update()` - animacje i skalowanie (wywoływane co klatkę)

### 🎨 Szczegóły Techniczne

#### Three.js Elementy
- `THREE.Group` - kontener dla każdego wymiaru
- `THREE.Line` - linie wymiarowe
- `THREE.Sprite` - etykiety tekstowe (billboard)
- `THREE.Mesh` - markery punktów, kwadraty snap
- `THREE.BoxGeometry` - zielone kwadraty snap (0.05m)
- `THREE.SphereGeometry` - okrągłe markery (0.02m)

#### Kolory (Hex)
- `0xFF4444` - czerwone markery punktów
- `0x4CAF50` - zielony podgląd/snap aktywny
- `0x2196F3` - niebieski finalny wymiar
- `0x00FF00` - jasnozielone kwadraty snap
- `0x9C27B0` - fioletowy (wyrównanie prostopadłe)

#### Renderowanie
- `renderOrder` dla kontroli kolejności renderowania:
  - 997: krawędź odniesienia
  - 998: linie wymiarów, kreski
  - 999: markery punktów
  - 1000: etykiety tekstowe
  - 1001: snap marker (duży)
  - 1002: snap point markers (małe kwadraty)
- `depthTest: false` - wymiary zawsze widoczne (nie zasłaniane przez model)

### 📊 Statystyki
- **Commitów dzisiaj:** 15+
- **Zmienionych plików:** 3 główne (`SimpleDimensionTool.ts`, `DimensionOptionsPanel.tsx`, `Viewer.tsx`)
- **Dodanych linii kodu:** ~1500+
- **Repository:** `frontend_beginning_20_11`

---

## Legenda

- ✨ Nowa funkcjonalność
- 🔧 Poprawka
- 🎨 Zmiany wizualne
- 📝 Dokumentacja
- 🗑️ Usunięcie
- ⚡ Optymalizacja
- 🐛 Naprawa błędu

---

**Ostatnia aktualizacja:** 2024-11-20 (ongoing)

