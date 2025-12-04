# Kompletny Plan Migracji - Wszystkie Funkcjonalności

## Data: 2025-01-27

## Cel
Połączenie **WSZYSTKICH funkcjonalności** z obu frontendów w jedną całość:
- ✅ Funkcjonalności z obecnego frontendu (backend integration)
- ✅ Funkcjonalności z nowego frontendu koleżanki (OpenBIM Components, komentarze, pinowanie, etc.)
- ✅ Architektura nowego frontendu (TypeScript, routing, komponenty, struktura)

---

## 1. Pełna lista funkcjonalności do zaimplementowania

### 1.1. Z obecnego frontendu (backend integration)

#### IFCUploader
- ✅ Upload pliku .ifc do backendu
- ✅ Endpoint: `POST /api/ifc/parse?calculate_costs=true`
- ✅ Timeout: 300000ms (5 minut)
- ✅ Callbacki: onParsed, onError, onLoading
- ✅ Wyświetlanie statusu uploadu
- ✅ Przycisk "Wyczyść"

#### Wyświetlanie kosztów
- ✅ Panel z grand_total (duży, wyeksponowany)
- ✅ Breakdown: Materiały, Złącza, Robocizna
- ✅ Formatowanie waluty (pl-PL, 2 miejsca)
- ✅ Komunikat gdy koszty nie zostały obliczone

#### Kontrola widoczności
- ✅ Przyciski "Pokaż wszystkie" / "Ukryj wszystkie"
- ✅ Checkboxy dla każdego typu elementu z liczbą
- ✅ Domyślnie wszystkie widoczne

#### Lista elementów
- ✅ Collapsible details section
- ✅ Pierwsze 10 elementów: `type_name - name`
- ✅ "... i X więcej" jeśli więcej niż 10

#### Viewer 3D (z danych backendu)
- ✅ Renderowanie elementów z danych backendu
- ✅ Position z `placement_matrix` lub `position`
- ✅ Dimensions z `properties` lub domyślne
- ✅ Geometry: BoxGeometry, CylinderGeometry
- ✅ Colors: różne kolory dla typów (Beam, Column, Wall, etc.)
- ✅ Kontrola widoczności meshes
- ✅ Orbit controls
- ✅ Auto-adjust camera

#### Layout
- ✅ Header: tytuł + opis
- ✅ Sidebar (350px): IFCUploader + info panel + controls
- ✅ Viewer (flex: 1): pełnoekranowy viewer 3D

---

### 1.2. Z nowego frontendu koleżanki (OpenBIM Components)

#### Routing
- ✅ SignIn page (`/signin`)
- ✅ SignUp page (`/signup`)
- ✅ Viewer page (`/viewer`)
- ✅ Redirect z `/` do `/signin`

#### OpenBIM Components Viewer
- ✅ FragmentIfcLoader - ładowanie plików IFC
- ✅ FragmentHighlighter - podświetlanie elementów
- ✅ IfcPropertiesProcessor - przetwarzanie właściwości IFC
- ✅ PostproductionRenderer - zaawansowany renderer
- ✅ OrthoPerspectiveCamera - kontrola kamery
- ✅ SimpleGrid - siatka
- ✅ Properties panel - wyświetlanie właściwości elementów

#### Komentarze
- ✅ CommentPanel - panel z komentarzami
- ✅ useComments hook - zarządzanie komentarzami
- ✅ Komentarze ogólne i przypisane do elementów
- ✅ Dodawanie/usuwanie komentarzy
- ✅ Wyświetlanie komentarzy w Properties panel
- ✅ Kliknięcie komentarza podświetla element

#### Pinowanie elementów
- ✅ Tryb pinowania (toggle)
- ✅ Paleta kolorów (6 kolorów)
- ✅ Oznaczanie elementów kolorami
- ✅ Zapis stanu pinowanych elementów

#### Undo/Redo kamery
- ✅ Historia stanów kamery
- ✅ Undo - przywróć poprzedni stan
- ✅ Redo - przywróć następny stan
- ✅ Auto-save stanu kamery po interakcji

#### ActionBar
- ✅ Pasek narzędzi na dole ekranu
- ✅ Przyciski: Undo, Redo, Move, Pin, Lighting, Dimensions, Camera, Comment, Share
- ✅ Toggle dark/light mode
- ✅ Tooltips

#### Dark/Light mode
- ✅ ThemeContext - zarządzanie motywem
- ✅ Toggle w ActionBar
- ✅ Synchronizacja z tłem viewera i oświetleniem
- ✅ Zapis w localStorage

#### Architektura
- ✅ TypeScript strict mode
- ✅ Struktura katalogów (pages/, components/, hooks/, contexts/, lib/)
- ✅ shadcn/ui komponenty
- ✅ Tailwind CSS
- ✅ Testy (Vitest)

---

## 2. Strategia integracji - Dual Mode Viewer

### 2.1. Problem
- **Obecny frontend**: Renderuje dane z backendu (przetworzone elementy)
- **Nowy frontend**: Ładuje pliki IFC bezpośrednio (FragmentIfcLoader)

### 2.2. Rozwiązanie: Dual Mode Viewer

Viewer będzie obsługiwał **dwa tryby**:

#### Tryb 1: Backend Mode (dane z backendu)
- Renderowanie elementów z danych otrzymanych z backendu
- Użycie Three.js bezpośrednio (jak obecny Viewer3D.jsx)
- Integracja z kontrolą widoczności
- Wyświetlanie kosztów

#### Tryb 2: File Mode (plik IFC)
- Ładowanie pliku IFC bezpośrednio
- Użycie OpenBIM Components (FragmentIfcLoader)
- Wszystkie funkcje koleżanki (komentarze, pinowanie, properties panel, etc.)

#### Przełączanie trybów
- Backend Mode: gdy użytkownik używa IFCUploader (upload do backendu)
- File Mode: gdy użytkownik ładuje plik lokalnie (drag & drop lub przycisk w ActionBar)

---

## 3. Struktura po integracji

```
src/
├── App.tsx                    # Routing (SignIn/SignUp/Viewer)
├── main.tsx
├── index.css                  # Tailwind + CSS variables
│
├── pages/
│   ├── SignIn.tsx            # ✅ Zachować (koleżanka)
│   ├── SignUp.tsx            # ✅ Zachować (koleżanka)
│   └── Viewer.tsx            # ⚠️ Rozszerzyć (dual mode)
│
├── components/
│   ├── IFCUploader.tsx       # ⚠️ Utworzyć (migracja z obecnego)
│   ├── CostSummary.tsx       # ⚠️ Utworzyć (migracja z obecnego)
│   ├── VisibilityControls.tsx # ⚠️ Utworzyć (migracja z obecnego)
│   ├── ElementsList.tsx      # ⚠️ Utworzyć (migracja z obecnego)
│   ├── ActionBar.tsx         # ✅ Zachować (koleżanka)
│   ├── CommentPanel.tsx      # ✅ Zachować (koleżanka)
│   ├── Viewer3DBackend.tsx  # ⚠️ Utworzyć (renderowanie z danych backendu)
│   └── ui/                   # ✅ Zachować wszystkie (koleżanka)
│
├── contexts/
│   └── ThemeContext.tsx      # ✅ Zachować (koleżanka)
│
├── hooks/
│   ├── useComments.ts        # ✅ Zachować (koleżanka)
│   ├── useTheme.ts           # ✅ Zachować (koleżanka)
│   ├── useViewerHistory.ts  # ✅ Zachować (koleżanka)
│   └── useIFCData.ts         # ⚠️ Utworzyć (nowy - zarządzanie danymi z backendu)
│
├── lib/
│   ├── utils.ts              # ✅ Zachować (koleżanka)
│   └── api.ts                # ⚠️ Utworzyć (API client dla backendu)
│
└── types/
    └── ifc.ts                # ⚠️ Utworzyć (TypeScript interfaces)
```

---

## 4. Szczegółowy plan implementacji

### Faza 1: Infrastruktura i typy

#### 1.1. Utworzyć typy TypeScript
**Plik:** `src/types/ifc.ts`
```typescript
export interface IFCElement {
  type_name: string;
  global_id: string;
  name?: string;
  position?: [number, number, number];
  placement_matrix?: number[];
  properties?: Record<string, any>;
}

export interface CostSummary {
  grand_total: number;
  total_material_cost: number;
  total_connection_cost: number;
  total_labor_cost: number;
}

export interface Costs {
  summary: CostSummary;
}

export interface ParseResponse {
  elements: IFCElement[];
  costs: Costs | null;
  element_count: number;
  costs_calculated: boolean;
}
```

#### 1.2. Utworzyć API client
**Plik:** `src/lib/api.ts`
```typescript
import axios from 'axios';
import { ParseResponse } from '@/types/ifc';

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

#### 1.3. Utworzyć hook useIFCData
**Plik:** `src/hooks/useIFCData.ts`
- Zarządzanie stanem: elements, costs, isLoading, error, visibleTypes
- Funkcje: handleParsed, handleError, handleTypeVisibilityChange, showAllTypes, hideAllTypes, clear

---

### Faza 2: Komponenty z obecnego frontendu

#### 2.1. IFCUploader.tsx
- Migracja z obecnego IFCUploader.jsx
- TypeScript + shadcn/ui Button
- Integracja z api.parseIFC

#### 2.2. CostSummary.tsx
- Migracja logiki wyświetlania kosztów z App.jsx
- Tailwind CSS styling
- Wsparcie dla dark/light mode

#### 2.3. VisibilityControls.tsx
- Migracja kontroli widoczności z App.jsx
- shadcn/ui komponenty
- Integracja z Viewer3DBackend

#### 2.4. ElementsList.tsx
- Migracja listy elementów z App.jsx
- Tailwind CSS styling

---

### Faza 3: Viewer3DBackend - renderowanie z danych backendu

#### 3.1. Utworzyć Viewer3DBackend.tsx
**Funkcjonalność:**
- Renderowanie elementów z danych backendu (jak obecny Viewer3D.jsx)
- Three.js bezpośrednio
- Position z placement_matrix lub position
- Dimensions z properties lub domyślne
- Geometry: BoxGeometry, CylinderGeometry
- Colors: różne kolory dla typów
- Kontrola widoczności meshes
- Orbit controls
- Auto-adjust camera

**Różnice od obecnego:**
- TypeScript zamiast JavaScript
- Props: `elements: IFCElement[]`, `visibleTypes: Record<string, boolean>`
- Integracja z ThemeContext (dark/light mode dla tła)

---

### Faza 4: Rozszerzenie Viewer.tsx - Dual Mode

#### 4.1. Zmodyfikować Viewer.tsx

**Dodać props:**
```typescript
interface ViewerProps {
  mode?: 'file' | 'backend';
  backendElements?: IFCElement[];
  backendVisibleTypes?: Record<string, boolean>;
}
```

**Logika:**
- Jeśli `mode === 'backend'` i `backendElements` istnieją:
  - Renderuj `Viewer3DBackend` z danymi z backendu
  - Ukryj OpenBIM Components toolbar (lub pokaż tylko ActionBar)
- Jeśli `mode === 'file'` lub brak `backendElements`:
  - Renderuj OpenBIM Components Viewer (obecna funkcjonalność koleżanki)
  - Wszystkie funkcje: komentarze, pinowanie, properties panel, etc.

**Layout:**
- Sidebar (jeśli mode === 'backend'): IFCUploader + CostSummary + VisibilityControls + ElementsList
- Viewer: Dual mode renderer
- ActionBar: zawsze widoczny (dla obu trybów)
- CommentPanel: zawsze dostępny (dla obu trybów)

---

### Faza 5: Integracja w Viewer page

#### 5.1. Zmodyfikować pages/Viewer.tsx

**Layout:**
```typescript
<div className="flex flex-col h-screen">
  <header className="border-b p-4">
    <h1 className="text-2xl font-bold">IFC Construction Calculator</h1>
    <p className="text-muted-foreground">Wizualizacja i analiza konstrukcji budowlanych</p>
  </header>
  
  <div className="flex flex-1 overflow-hidden">
    {/* Sidebar - tylko w trybie backend */}
    {mode === 'backend' && elements.length > 0 && (
      <aside className="w-80 border-r overflow-y-auto p-4 space-y-4">
        <IFCUploader {...uploaderProps} />
        {error && <ErrorDisplay error={error} />}
        {isLoading && <LoadingDisplay />}
        {elements.length > 0 && (
          <>
            <InfoPanel elementCount={elements.length} />
            <CostSummary costs={costs} />
            <VisibilityControls {...visibilityProps} />
            <ElementsList elements={elements} />
          </>
        )}
      </aside>
    )}
    
    {/* Viewer - dual mode */}
    <main className="flex-1 relative">
      <Viewer 
        mode={mode}
        backendElements={elements}
        backendVisibleTypes={visibleTypes}
      />
    </main>
  </div>
</div>
```

**Stan:**
- Użyj `useIFCData` hook dla danych z backendu
- Użyj istniejących hooks (useComments, useTheme) dla funkcji koleżanki
- Zarządzaj trybem: `mode` state (ustawiany przez IFCUploader lub przycisk w ActionBar)

---

### Faza 6: Integracja funkcji koleżanki z trybem backend

#### 6.1. Komentarze w trybie backend
- Komentarze mogą być przypisane do elementów (używając `global_id` lub `expressID`)
- CommentPanel działa w obu trybach
- W trybie backend: kliknięcie komentarza podświetla element w Viewer3DBackend

#### 6.2. Pinowanie w trybie backend
- Pinowanie elementów z kolorami (jak w trybie file)
- Zapis stanu pinowanych elementów
- Integracja z Viewer3DBackend (zmiana kolorów meshes)

#### 6.3. Undo/Redo w trybie backend
- Historia kamery działa w obu trybach
- useViewerHistory hook współpracuje z Viewer3DBackend

#### 6.4. Dark/Light mode
- Działa w obu trybach
- Synchronizacja z tłem Viewer3DBackend

---

## 5. Przepływ użytkownika

### Scenariusz 1: Upload do backendu (Backend Mode)
1. Użytkownik loguje się (SignIn)
2. Przechodzi do Viewer (`/viewer`)
3. W sidebarze widzi IFCUploader
4. Wybiera plik .ifc i klika "Prześlij i Parsuj"
5. Backend parsuje plik i oblicza koszty
6. Dane są wyświetlane:
   - Sidebar: koszty, kontrola widoczności, lista elementów
   - Viewer: renderowanie 3D z danych backendu (Viewer3DBackend)
7. Użytkownik może:
   - Kontrolować widoczność elementów
   - Oglądać koszty
   - Dodawać komentarze (CommentPanel)
   - Pinować elementy (ActionBar → Pin)
   - Używać Undo/Redo kamery
   - Przełączać dark/light mode

### Scenariusz 2: Ładowanie pliku lokalnie (File Mode)
1. Użytkownik loguje się (SignIn)
2. Przechodzi do Viewer (`/viewer`)
3. W ActionBar klika przycisk "Load IFC" (lub drag & drop)
4. Plik jest ładowany bezpośrednio przez FragmentIfcLoader
5. Viewer wyświetla model z OpenBIM Components
6. Użytkownik może:
   - Oglądać properties elementów (kliknięcie na element)
   - Dodawać komentarze
   - Pinować elementy
   - Używać wszystkich funkcji OpenBIM Components

### Przełączanie trybów
- Backend Mode → File Mode: przycisk "Load Local File" w ActionBar
- File Mode → Backend Mode: przycisk "Upload to Backend" w ActionBar (lub IFCUploader w sidebarze)

---

## 6. Checklist implementacji

### Faza 1: Infrastruktura
- [ ] Utworzyć `src/types/ifc.ts`
- [ ] Utworzyć `src/lib/api.ts`
- [ ] Utworzyć `src/hooks/useIFCData.ts`
- [ ] Dodać `axios` do dependencies

### Faza 2: Komponenty z obecnego frontendu
- [ ] Utworzyć `src/components/IFCUploader.tsx`
- [ ] Utworzyć `src/components/CostSummary.tsx`
- [ ] Utworzyć `src/components/VisibilityControls.tsx`
- [ ] Utworzyć `src/components/ElementsList.tsx`
- [ ] Utworzyć `src/components/InfoPanel.tsx` (opcjonalnie)
- [ ] Utworzyć `src/components/ErrorDisplay.tsx` (opcjonalnie)
- [ ] Utworzyć `src/components/LoadingDisplay.tsx` (opcjonalnie)

### Faza 3: Viewer3DBackend
- [ ] Utworzyć `src/components/Viewer3DBackend.tsx`
- [ ] Zaimplementować renderowanie z danych backendu
- [ ] Zintegrować kontrolę widoczności
- [ ] Zintegrować ThemeContext (dark/light mode)
- [ ] Przetestować renderowanie

### Faza 4: Rozszerzenie Viewer.tsx
- [ ] Dodać props: mode, backendElements, backendVisibleTypes
- [ ] Zaimplementować logikę dual mode
- [ ] Zintegrować Viewer3DBackend
- [ ] Zachować funkcjonalność OpenBIM Components

### Faza 5: Integracja w Viewer page
- [ ] Zmodyfikować `src/pages/Viewer.tsx`
- [ ] Dodać layout z sidebar (dla trybu backend)
- [ ] Zintegrować wszystkie komponenty
- [ ] Zarządzać trybem (mode state)

### Faza 6: Integracja funkcji koleżanki
- [ ] Komentarze w trybie backend
- [ ] Pinowanie w trybie backend
- [ ] Undo/Redo w trybie backend
- [ ] Dark/Light mode w obu trybach

### Faza 7: Testy i dokumentacja
- [ ] Przetestować Backend Mode (upload → parsowanie → wizualizacja → koszty)
- [ ] Przetestować File Mode (ładowanie pliku → OpenBIM Components)
- [ ] Przetestować przełączanie trybów
- [ ] Przetestować wszystkie funkcje w obu trybach
- [ ] Zaktualizować dokumentację

---

## 7. Zachowanie architektury

### 7.1. Zasady
1. **TypeScript strict mode** - wszystkie komponenty w TSX
2. **Komponenty funkcjonalne** - React hooks, nie klasy
3. **Separation of concerns** - każdy komponent ma jedną odpowiedzialność
4. **Reusable hooks** - logika biznesowa w hooks
5. **Type safety** - interfejsy dla wszystkich danych
6. **Tailwind CSS** - styling przez utility classes
7. **shadcn/ui** - komponenty UI z biblioteki

### 7.2. Struktura plików
```
src/
├── types/           # TypeScript interfaces
├── lib/            # Utilities, API clients
├── hooks/          # Custom hooks (logika biznesowa)
├── contexts/       # React contexts (globalny stan)
├── components/     # Komponenty UI
│   ├── ui/        # shadcn/ui komponenty
│   └── ...        # Własne komponenty
└── pages/          # Strony routingu
```

---

## 8. Podsumowanie

### Co zostaje z nowego frontendu koleżanki:
- ✅ Architektura (TypeScript, routing, struktura)
- ✅ OpenBIM Components Viewer (File Mode)
- ✅ Komentarze (CommentPanel, useComments)
- ✅ Pinowanie elementów
- ✅ Undo/Redo kamery
- ✅ ActionBar
- ✅ Dark/Light mode (ThemeContext)
- ✅ SignIn/SignUp pages
- ✅ Testy

### Co jest migrowane z obecnego frontendu:
- ✅ IFCUploader (z integracją backendu)
- ✅ Wyświetlanie kosztów
- ✅ Kontrola widoczności
- ✅ Lista elementów
- ✅ Viewer3DBackend (renderowanie z danych backendu)
- ✅ Layout (sidebar + viewer)

### Rezultat:
- ✅ **Wszystkie funkcjonalności** z obu frontendów
- ✅ **Dual Mode Viewer** - Backend Mode i File Mode
- ✅ **Architektura** z nowego frontendu
- ✅ **Łatwość rozbudowy** w przyszłości

---

**Następne kroki:**
1. Przedyskutować plan z zespołem
2. Utworzyć branch dla migracji
3. Rozpocząć od Fazy 1 (infrastruktura)
4. Migrować krok po kroku
5. Testować każdy krok
6. Code review przed merge

