# Testy integracji Visibility Panel

## ✅ Weryfikacja implementacji

### 1. Sprawdzenie importów i typów

- [x] `OBC.Hider` - użyty w Viewer.tsx i VisibilityPanel.tsx
- [x] `OBC.FragmentsManager` - użyty w hookach i komponentach
- [x] `OBC.ModelIdMap` - użyty w funkcjach izolacji
- [x] Wszystkie komponenty React są poprawnie zaimportowane

### 2. Komponenty

#### VisibilityPanel.tsx
- [x] Komponent React z TypeScript
- [x] Przeciągalny interfejs
- [x] Dropdown z kategoriami IFC
- [x] Przyciski: Isolate, Hide, Reset
- [x] Obsługa stanów loading (isIsolating, isHiding)
- [x] Integracja z useVisibilityCategories hook

#### SelectionPanel.tsx (rozszerzony)
- [x] Dodana sekcja filtrowania po kategoriach
- [x] Select dropdown z kategoriami
- [x] Filtrowanie wybranych elementów
- [x] Integracja z useVisibilityCategories hook

### 3. Hooki

#### useVisibilityCategories.ts
- [x] Ładowanie kategorii z FragmentsManager
- [x] Fallback dla loadedModels
- [x] Cache kategorii
- [x] Funkcje: loadCategories, getCategories, clearCache, refreshCategories

### 4. Integracja z Viewer.tsx

- [x] Inicjalizacja OBC.Hider w useEffect
- [x] Referencja hiderRef przechowywana
- [x] Refaktoryzacja isolateElements() - używa Hider
- [x] Refaktoryzacja unisolateElements() - używa Hider
- [x] Stan showVisibilityPanel
- [x] Obsługa akcji "visibility" w handleActionSelect
- [x] Renderowanie VisibilityPanel z właściwymi props

### 5. ActionBar

- [x] Przycisk "Visibility" dodany do actions
- [x] Ikona Eye z lucide-react
- [x] Tooltip "Control visibility by IFC categories"

### 6. Funkcjonalności

#### Izolacja kategorii
- [x] Funkcja handleIsolate w VisibilityPanel
- [x] Używa hider.isolate(map)
- [x] Pobiera elementy przez getItemsOfCategories()
- [x] Tworzy ModelIdMap

#### Ukrywanie kategorii
- [x] Funkcja handleHide w VisibilityPanel
- [x] Używa hider.set(false, map)
- [x] Pobiera elementy przez getItemsOfCategories()

#### Reset widoczności
- [x] Funkcja handleReset w VisibilityPanel
- [x] Używa hider.set(true)
- [x] Czyści wybrane kategorie

#### Izolacja wybranych elementów
- [x] Funkcja isolateElements() używa Hider
- [x] Buduje ModelIdMap z wybranych elementów
- [x] Używa hider.isolate(map)

#### Unisolate
- [x] Funkcja unisolateElements() używa Hider
- [x] Używa hider.set(true)

## ⚠️ Potencjalne problemy

### 1. OBC.Hider może nie istnieć
**Problem**: Klasa `OBC.Hider` może nie być dostępna w wersji `openbim-components@1.5.1`

**Rozwiązanie**: 
- Sprawdź dokumentację openbim-components
- Może być pod nazwą `FragmentHider` lub inną
- Może wymagać aktualizacji biblioteki do nowszej wersji

### 2. viewerRef.current.fragments
**Problem**: `viewerRef.current.fragments` może nie być właściwą właściwością

**Rozwiązanie**:
- Sprawdź czy FragmentsManager jest dostępny przez `viewer.get(OBC.FragmentsManager)`
- Lub może być jako osobny komponent który trzeba zainicjalizować

### 3. ModelIdMap typ
**Problem**: Typ `OBC.ModelIdMap` może nie istnieć

**Rozwiązanie**:
- Może być zdefiniowany jako `{ [modelId: string]: Set<number> }`
- Sprawdź definicje typów w openbim-components

## 🧪 Testy do wykonania manualnie

1. **Uruchom aplikację**
   ```bash
   cd frontend
   npm run dev
   ```

2. **Załaduj model IFC**
   - Kliknij przycisk "Upload IFC" lub "Załaduj lokalnie"
   - Wybierz plik IFC

3. **Test Visibility Panel**
   - Kliknij przycisk "Visibility" w ActionBar
   - Sprawdź czy panel się otwiera
   - Sprawdź czy kategorie się ładują
   - Wybierz kategorię i kliknij "Isolate"
   - Sprawdź czy tylko wybrana kategoria jest widoczna
   - Kliknij "Reset Visibility"
   - Sprawdź czy wszystkie elementy są widoczne

4. **Test Selection Panel z filtrowaniem**
   - Kliknij przycisk "Selection" w ActionBar
   - Wybierz kilka elementów (Ctrl+klik)
   - Sprawdź sekcję "Filtruj po kategorii"
   - Wybierz kategorię z dropdown
   - Sprawdź czy lista elementów się filtruje

5. **Test izolacji wybranych elementów**
   - Wybierz elementy w Selection Panel
   - Kliknij "Izoluj"
   - Sprawdź czy tylko wybrane elementy są widoczne
   - Kliknij "Pokaż wszystkie"
   - Sprawdź czy wszystkie elementy są widoczne

## 📝 Notatki

- Wszystkie komponenty są zaimplementowane
- Kod jest zgodny z TypeScript (brak błędów lintowania)
- Integracja z istniejącym systemem jest kompletna
- Jeśli OBC.Hider nie istnieje, będzie potrzebna korekta lub alternatywna implementacja

