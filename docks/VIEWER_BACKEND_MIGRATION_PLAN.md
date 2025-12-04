# Viewer.tsx - Backend Migration Plan

## 📊 Current Situation

**Frontend (Viewer.tsx - 3889 lines):**
- Zawiera dużo logiki biznesowej
- Zarządza stanem aplikacji
- Obsługuje wszystkie funkcjonalności lokalnie

**Backend (Mikroserwisy):**
- `ifc-parser-service` - Parsowanie IFC ✅
- `cost-calculator-service` - Kalkulacje kosztów ✅
- `calculation-engine-service` - Obliczenia statyczne/wytrzymałości ✅
- `3d-data-service` - Generowanie danych 3D (placeholder) ⚠️
- `database-manager-service` - Zarządzanie projektami ✅
- `api-gateway` - Orchestracja ✅

## 🎯 Co można przenieść do backendu?

### 1. **Zarządzanie widokami (Views)** → `3d-data-service`
**Obecnie w frontendzie:**
- Tworzenie widoków (storey, elevation, section)
- Zarządzanie widokami 2D/3D
- Przechowywanie stanu widoków

**Dlaczego do backendu:**
- Widoki powinny być zapisywane w projekcie
- Wiele użytkowników może współdzielić widoki
- Persystencja danych

**Endpointy do dodania:**
```
POST /api/visualization/views - Utwórz widok
GET /api/visualization/views/{projectId} - Pobierz widoki projektu
PUT /api/visualization/views/{viewId} - Aktualizuj widok
DELETE /api/visualization/views/{viewId} - Usuń widok
POST /api/visualization/views/section - Utwórz widok sekcji
```

### 2. **Zarządzanie komentarzami** → `database-manager-service`
**Obecnie w frontendzie:**
- Hook `useComments` - lokalne przechowywanie
- Dodawanie/usuwanie komentarzy
- Powiązanie z elementami IFC

**Dlaczego do backendu:**
- Komentarze powinny być zapisywane w bazie danych
- Współdzielenie między użytkownikami
- Historia zmian

**Endpointy do dodania:**
```
POST /api/projects/{projectId}/comments - Dodaj komentarz
GET /api/projects/{projectId}/comments - Pobierz komentarze
GET /api/projects/{projectId}/comments/{elementId} - Komentarze elementu
DELETE /api/projects/{projectId}/comments/{commentId} - Usuń komentarz
PUT /api/projects/{projectId}/comments/{commentId} - Edytuj komentarz
```

### 3. **Zarządzanie pinami** → `3d-data-service` lub `database-manager-service`
**Obecnie w frontendzie:**
- Hook `usePins` - lokalne przechowywanie
- Kolorowanie elementów
- Przechowywanie oryginalnych kolorów

**Dlaczego do backendu:**
- Piny powinny być zapisywane w projekcie
- Współdzielenie między użytkownikami
- Persystencja stanu

**Endpointy do dodania:**
```
POST /api/visualization/pins - Przypnij element
DELETE /api/visualization/pins/{elementId} - Odpiń element
GET /api/visualization/pins/{projectId} - Pobierz piny projektu
PUT /api/visualization/pins/{elementId} - Zmień kolor pina
```

### 4. **Selekcja i izolacja elementów** → `3d-data-service`
**Obecnie w frontendzie:**
- Zarządzanie selekcją elementów
- Izolacja wybranych elementów
- Zarządzanie widocznością

**Dlaczego do backendu:**
- Selekcje mogą być zapisywane jako "zestawy elementów"
- Współdzielenie selekcji między użytkownikami
- Historia selekcji

**Endpointy do dodania:**
```
POST /api/visualization/selections - Utwórz selekcję
GET /api/visualization/selections/{projectId} - Pobierz selekcje
POST /api/visualization/selections/{selectionId}/isolate - Izoluj elementy
POST /api/visualization/selections/{selectionId}/show - Pokaż elementy
POST /api/visualization/selections/{selectionId}/hide - Ukryj elementy
```

### 5. **Kalkulacje wymiarów i objętości** → `calculation-engine-service`
**Obecnie w frontendzie:**
- `SimpleDimensionTool` - wymiarowanie
- `SimpleVolumeTool` - pomiar objętości
- Wszystkie obliczenia lokalnie

**Dlaczego do backendu:**
- Weryfikacja obliczeń
- Zapisywanie pomiarów w projekcie
- Współdzielenie pomiarów

**Endpointy do dodania:**
```
POST /api/calculations/dimensions - Oblicz wymiary
POST /api/calculations/volume - Oblicz objętość
GET /api/calculations/measurements/{projectId} - Pobierz pomiary
```

### 6. **Wyszukiwanie elementów** → `ifc-parser-service` lub `3d-data-service`
**Obecnie w frontendzie:**
- Wyszukiwanie w załadowanych modelach
- Filtrowanie po właściwościach

**Dlaczego do backendu:**
- Indeksowanie elementów
- Zaawansowane wyszukiwanie
- Cache wyników

**Endpointy do dodania:**
```
POST /api/ifc/search - Wyszukaj elementy
GET /api/ifc/elements/{elementId} - Pobierz szczegóły elementu
POST /api/ifc/filter - Filtruj elementy
```

## 📋 Co zostaje w frontendzie?

### Frontend powinien mieć tylko:
1. **UI Komponenty**
   - Renderowanie 3D (Three.js)
   - Komponenty interfejsu użytkownika
   - Panels, Toolbars, Controls

2. **Obsługa interakcji**
   - Kliknięcia, przeciąganie
   - Obsługa zdarzeń myszy/klawiatury
   - Animacje i przejścia

3. **Integracja z API**
   - Wywołania REST API
   - Obsługa odpowiedzi
   - Cache lokalny (opcjonalnie)

4. **Stan UI**
   - Stan otwartych paneli
   - Aktywny tryb pracy
   - Stan renderowania

## 🏗️ Proponowana architektura

### Backend Services

#### `3d-data-service` (rozszerzony)
```
POST /api/visualization/views - Widoki
POST /api/visualization/pins - Piny
POST /api/visualization/selections - Selekcje
POST /api/visualization/scene - Dane sceny 3D
```

#### `database-manager-service` (rozszerzony)
```
POST /api/projects/{id}/comments - Komentarze
GET /api/projects/{id}/comments - Komentarze projektu
POST /api/projects/{id}/views - Widoki projektu
GET /api/projects/{id}/state - Stan projektu
```

#### `calculation-engine-service` (rozszerzony)
```
POST /api/calculations/dimensions - Wymiary
POST /api/calculations/volume - Objętość
GET /api/calculations/measurements/{projectId} - Pomiary
```

### Frontend Structure (po refaktoringu)

```
frontend/src/
├── hooks/
│   ├── useViewer.ts - Inicjalizacja viewer'a
│   ├── useAPI.ts - Wywołania API
│   └── useUIState.ts - Stan UI
├── components/
│   ├── Viewer3D.tsx - Renderowanie 3D
│   ├── Toolbar.tsx - Pasek narzędzi
│   ├── PanelsContainer.tsx - Panels
│   └── ViewerControls.tsx - Kontrolki
├── services/
│   ├── viewsService.ts - API calls dla widoków
│   ├── commentsService.ts - API calls dla komentarzy
│   ├── pinsService.ts - API calls dla pinów
│   └── selectionsService.ts - API calls dla selekcji
└── pages/
    └── Viewer.tsx (~300-500 lines) - Orchestracja
```

## 🚀 Plan migracji

### Faza 1: Przygotowanie backendu
1. Rozszerz `3d-data-service` o endpointy dla widoków, pinów, selekcji
2. Rozszerz `database-manager-service` o endpointy dla komentarzy
3. Rozszerz `calculation-engine-service` o endpointy dla pomiarów
4. Dodaj modele danych w bazie

### Faza 2: Refaktoring frontendu
1. Utwórz serwisy API (viewsService, commentsService, etc.)
2. Zastąp lokalną logikę wywołaniami API
3. Zachowaj cache lokalny dla wydajności
4. Obsługa offline (opcjonalnie)

### Faza 3: Integracja
1. Testy integracyjne
2. Obsługa błędów
3. Loading states
4. Optimistic updates

## ✅ Korzyści

1. **Separation of Concerns**: Logika biznesowa w backendzie, UI w frontendzie
2. **Współdzielenie danych**: Wiele użytkowników widzi te same dane
3. **Persystencja**: Wszystko zapisane w bazie danych
4. **Skalowalność**: Backend może obsłużyć więcej logiki
5. **Testowalność**: Łatwiej testować logikę biznesową w backendzie
6. **Bezpieczeństwo**: Walidacja i autoryzacja w backendzie

## 📝 Uwagi

- Frontend nadal będzie potrzebował lokalnego cache dla wydajności
- Niektóre operacje (np. renderowanie 3D) muszą pozostać w frontendzie
- Trzeba obsłużyć synchronizację między lokalnym cache a backendem
- Offline mode może być wyzwaniem

---

**Status**: Plan do wdrożenia
**Priorytet**: Wysoki - poprawi architekturę i skalowalność
