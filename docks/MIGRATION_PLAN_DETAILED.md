# Szczegółowy Plan Migracji Frontendu - Funkcjonalność 1:1

## Data: 2025-01-27

## Cel
Przeniesienie **całej funkcjonalności** z obecnego frontendu do nowego frontendu koleżanki, zachowując:
- ✅ **Funkcjonalność 1:1** - wszystko co działa teraz musi działać po migracji
- ✅ **Architekturę nowego frontendu** - TypeScript, komponenty, routing, struktura
- ✅ **Łatwość rozbudowy** - kod zgodny z best practices, łatwy do rozwijania

---

## 1. Analiza funkcjonalności obecnego frontendu

### 1.1. Komponenty i ich odpowiedzialność

#### `App.jsx` (główny komponent)
**Funkcjonalność:**
- ✅ Zarządzanie stanem: `ifcElements`, `costs`, `isLoading`, `error`, `visibleTypes`
- ✅ Obsługa callbacków: `handleIFCParsed`, `handleError`, `handleLoading`, `handleTypeVisibilityChange`
- ✅ Layout: header + sidebar + viewer-container
- ✅ Renderowanie: IFCUploader, error messages, loading states, info panel, cost summary, visibility controls, elements list

**Stan:**
```javascript
- ifcElements: []           // Tablica elementów IFC z backendu
- costs: null               // Obiekt z kosztami {summary: {grand_total, total_material_cost, ...}}
- isLoading: false          // Status ładowania
- error: null               // Komunikat błędu
- visibleTypes: {}          // Mapowanie typów elementów do widoczności {typeName: true/false}
```

#### `IFCUploader.jsx`
**Funkcjonalność:**
- ✅ Wybór pliku .ifc
- ✅ Walidacja pliku (.ifc extension)
- ✅ Upload do backendu: `POST /api/ifc/parse?calculate_costs=true`
- ✅ Obsługa FormData
- ✅ Timeout: 300000ms (5 minut)
- ✅ Callback `onParsed` z danymi: `{elements, costs, elementCount, costsCalculated}`
- ✅ Callback `onError` z komunikatem błędu
- ✅ Callback `onLoading` z statusem
- ✅ Wyświetlanie statusu uploadu
- ✅ Przycisk "Wyczyść" do resetowania

**API Backend:**
```
POST /api/ifc/parse?calculate_costs=true
Content-Type: multipart/form-data
Body: FormData z plikiem 'file'

Response:
{
  elements: Array<IFCElement>,
  costs: {
    summary: {
      grand_total: number,
      total_material_cost: number,
      total_connection_cost: number,
      total_labor_cost: number
    }
  },
  element_count: number,
  costs_calculated: boolean
}
```

#### `Viewer3D.jsx`
**Funkcjonalność:**
- ✅ Renderowanie 3D z Three.js
- ✅ Przyjmuje props: `elements` (Array), `visibleTypes` (Object)
- ✅ Tworzenie sceny, kamery, renderera
- ✅ Renderowanie elementów na podstawie danych z backendu:
  - Position z `placement_matrix` lub `position`
  - Dimensions z `properties` lub domyślne wartości
  - Geometry: BoxGeometry, CylinderGeometry (w zależności od typu)
  - Colors: różne kolory dla różnych typów (Beam, Column, Wall, etc.)
- ✅ Kontrola widoczności: ukrywanie/pokazywanie meshes na podstawie `visibleTypes`
- ✅ Orbit controls (własna implementacja)
- ✅ Auto-adjust camera do wszystkich elementów
- ✅ Konwersja jednostek: mm → m (IFC używa mm, Three.js używa m)

**Struktura danych elementu:**
```typescript
interface IFCElement {
  type_name: string;           // "IfcBeam", "IfcColumn", etc.
  global_id: string;
  name?: string;
  position?: [number, number, number];
  placement_matrix?: number[]; // 16-elementowa macierz (4x4)
  properties?: {
    Width?: string | number;
    Height?: string | number;
    Depth?: string | number;
    Length?: string | number;
    _geometry_size?: string;    // JSON string z [width, height, depth]
    [key: string]: any;
  };
}
```

### 1.2. Funkcjonalności UI

#### Panel informacyjny (w sidebar)
1. **Liczba elementów** - `ifcElements.length`
2. **Wyświetlanie kosztów:**
   - Grand total (duży, wyeksponowany)
   - Breakdown: Materiały, Złącza, Robocizna (jeśli > 0)
   - Formatowanie: `toLocaleString('pl-PL', {minimumFractionDigits: 2, maximumFractionDigits: 2})`
   - Komunikat jeśli koszty nie zostały obliczone
3. **Kontrola widoczności:**
   - Przyciski "Pokaż wszystkie" / "Ukryj wszystkie"
   - Checkboxy dla każdego typu elementu z liczbą elementów: `typeName (count)`
   - Domyślnie wszystkie widoczne
4. **Lista elementów:**
   - Collapsible details section
   - Pierwsze 10 elementów: `type_name - name`
   - "... i X więcej" jeśli więcej niż 10

#### Layout
- **Header**: Tytuł + opis
- **Sidebar** (350px): IFCUploader + info panel + controls
- **Viewer** (flex: 1): Pełnoekranowy viewer 3D

---

## 2. Architektura nowego frontendu

### 2.1. Struktura katalogów (zachować)
```
src/
├── App.tsx                    # Routing
├── main.tsx
├── index.css                  # Tailwind + CSS variables
├── pages/
│   ├── SignIn.tsx            # ✅ Zachować
│   ├── SignUp.tsx            # ✅ Zachować
│   └── Viewer.tsx            # ⚠️ Rozszerzyć
├── components/
│   ├── IFCUploader.tsx       # ⚠️ Utworzyć (migracja)
│   ├── CostSummary.tsx       # ⚠️ Utworzyć (migracja)
│   ├── VisibilityControls.tsx # ⚠️ Utworzyć (migracja)
│   ├── ElementsList.tsx      # ⚠️ Utworzyć (migracja)
│   ├── ActionBar.tsx         # ✅ Zachować
│   ├── CommentPanel.tsx      # ✅ Zachować
│   └── ui/                    # ✅ Zachować wszystkie
├── contexts/
│   └── ThemeContext.tsx       # ✅ Zachować
├── hooks/
│   ├── useComments.ts         # ✅ Zachować
│   ├── useTheme.ts           # ✅ Zachować
│   ├── useViewerHistory.ts  # ✅ Zachować
│   └── useIFCData.ts         # ⚠️ Utworzyć (nowy hook)
└── lib/
    ├── utils.ts              # ✅ Zachować
    └── api.ts                # ⚠️ Utworzyć (API client)
```

### 2.2. Zasady architektury (zachować)

1. **TypeScript** - wszystkie komponenty w TSX
2. **Komponenty funkcjonalne** - React hooks, nie klasy
3. **Separation of concerns:**
   - `pages/` - strony routingu
   - `components/` - komponenty UI
   - `hooks/` - logika biznesowa
   - `contexts/` - globalny stan
   - `lib/` - utilities i API
4. **Styling:**
   - Tailwind CSS dla layoutu
   - CSS variables dla motywu
   - shadcn/ui dla komponentów
5. **Type safety:**
   - Interfejsy TypeScript dla wszystkich danych
   - Strict mode w tsconfig.json

---

## 3. Plan migracji - krok po kroku

### Krok 1: Przygotowanie infrastruktury

#### 1.1. Utworzenie typów TypeScript
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

#### 1.2. Utworzenie API client
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

#### 1.3. Utworzenie hooka do zarządzania danymi IFC
**Plik:** `src/hooks/useIFCData.ts`
```typescript
import { useState, useCallback } from 'react';
import { IFCElement, Costs } from '@/types/ifc';

export function useIFCData() {
  const [elements, setElements] = useState<IFCElement[]>([]);
  const [costs, setCosts] = useState<Costs | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visibleTypes, setVisibleTypes] = useState<Record<string, boolean>>({});

  const handleParsed = useCallback((data: { elements: IFCElement[]; costs: Costs | null }) => {
    const elementsArray = Array.isArray(data.elements) ? data.elements : [];
    setElements(elementsArray);
    setCosts(data.costs);
    setError(null);

    // Initialize visible types - all visible by default
    const types: Record<string, boolean> = {};
    elementsArray.forEach((element) => {
      const typeName = element.type_name || 'Unknown';
      if (!types[typeName]) {
        types[typeName] = true;
      }
    });
    setVisibleTypes(types);
  }, []);

  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setElements([]);
    setVisibleTypes({});
  }, []);

  const handleTypeVisibilityChange = useCallback((typeName: string, visible: boolean) => {
    setVisibleTypes((prev) => ({
      ...prev,
      [typeName]: visible,
    }));
  }, []);

  const showAllTypes = useCallback(() => {
    setVisibleTypes((prev) => {
      const allVisible: Record<string, boolean> = {};
      Object.keys(prev).forEach((type) => {
        allVisible[type] = true;
      });
      return allVisible;
    });
  }, []);

  const hideAllTypes = useCallback(() => {
    setVisibleTypes((prev) => {
      const allHidden: Record<string, boolean> = {};
      Object.keys(prev).forEach((type) => {
        allHidden[type] = false;
      });
      return allHidden;
    });
  }, []);

  const clear = useCallback(() => {
    setElements([]);
    setCosts(null);
    setError(null);
    setVisibleTypes({});
  }, []);

  return {
    elements,
    costs,
    isLoading,
    error,
    visibleTypes,
    setIsLoading,
    handleParsed,
    handleError,
    handleTypeVisibilityChange,
    showAllTypes,
    hideAllTypes,
    clear,
  };
}
```

---

### Krok 2: Migracja IFCUploader

#### 2.1. Utworzenie komponentu IFCUploader.tsx
**Plik:** `src/components/IFCUploader.tsx`

**Funkcjonalność (1:1 z obecnego):**
- ✅ Wybór pliku .ifc
- ✅ Walidacja rozszerzenia
- ✅ Upload do backendu
- ✅ Callbacki: onParsed, onError, onLoading
- ✅ Wyświetlanie statusu
- ✅ Przycisk "Wyczyść"

**Różnice:**
- TypeScript zamiast JavaScript
- shadcn/ui Button zamiast własnych klas CSS
- Tailwind CSS zamiast własnych stylów
- Użycie hooka `useIFCData` (opcjonalnie) lub props

**Implementacja:**
```typescript
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { ParseResponse } from '@/types/ifc';
import { Upload, X } from 'lucide-react';

interface IFCUploaderProps {
  onParsed: (data: ParseResponse) => void;
  onError: (error: string) => void;
  onLoading: (loading: boolean) => void;
}

export function IFCUploader({ onParsed, onError, onLoading }: IFCUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.name.endsWith('.ifc')) {
        setFile(selectedFile);
        setUploadStatus('');
        onError(''); // Clear previous errors
      } else {
        onError('Proszę wybrać plik .ifc');
        setFile(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      onError('Proszę wybrać plik .ifc');
      return;
    }

    try {
      onLoading(true);
      setUploadStatus('Wysyłanie pliku...');

      const data = await api.parseIFC(file);
      
      setUploadStatus('Plik przesłany pomyślnie!');
      onParsed(data);
    } catch (error: any) {
      console.error('Błąd podczas przesyłania pliku:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Nieznany błąd';
      onError(`Błąd: ${errorMessage}`);
    } finally {
      onLoading(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    setUploadStatus('');
    onParsed({ elements: [], costs: null, element_count: 0, costs_calculated: false });
    onError('');
    // Reset file input
    const fileInput = document.getElementById('ifc-file-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Prześlij plik IFC</h2>
      
      <div className="space-y-2">
        <input
          id="ifc-file-input"
          type="file"
          accept=".ifc"
          onChange={handleFileChange}
          className="hidden"
        />
        <label
          htmlFor="ifc-file-input"
          className="flex items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
        >
          <div className="text-center">
            <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {file ? file.name : 'Wybierz plik .ifc'}
            </p>
          </div>
        </label>
      </div>

      {file && (
        <div className="p-3 bg-muted rounded-lg text-sm">
          <p><strong>Plik:</strong> {file.name}</p>
          <p><strong>Rozmiar:</strong> {(file.size / 1024 / 1024).toFixed(2)} MB</p>
        </div>
      )}

      <div className="flex gap-2">
        <Button onClick={handleUpload} disabled={!file} className="flex-1">
          Prześlij i Parsuj
        </Button>
        {file && (
          <Button onClick={handleClear} variant="outline">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {uploadStatus && (
        <div className="p-3 bg-primary/10 text-primary rounded-lg text-sm text-center">
          {uploadStatus}
        </div>
      )}
    </div>
  );
}
```

---

### Krok 3: Migracja wyświetlania kosztów

#### 3.1. Utworzenie komponentu CostSummary.tsx
**Plik:** `src/components/CostSummary.tsx`

**Funkcjonalność (1:1 z obecnego):**
- ✅ Wyświetlanie grand_total (duży, wyeksponowany)
- ✅ Breakdown: Materiały, Złącza, Robocizna (jeśli > 0)
- ✅ Formatowanie: `toLocaleString('pl-PL', {minimumFractionDigits: 2, maximumFractionDigits: 2})`
- ✅ Komunikat jeśli koszty nie zostały obliczone

**Implementacja:**
```typescript
import { Costs } from '@/types/ifc';
import { DollarSign } from 'lucide-react';

interface CostSummaryProps {
  costs: Costs | null;
}

export function CostSummary({ costs }: CostSummaryProps) {
  if (!costs?.summary) {
    return (
      <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground">
        Koszty nie zostały obliczone. Parsowanie zakończone sukcesem.
      </div>
    );
  }

  const { summary } = costs;
  const formatCurrency = (value: number) =>
    value.toLocaleString('pl-PL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <div className="space-y-4 p-4 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg border border-primary/20">
      <div className="flex items-center gap-2">
        <DollarSign className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Koszt Projektu</h3>
      </div>
      
      <div className="text-center p-4 bg-background/50 rounded-lg">
        <div className="text-3xl font-bold text-primary">
          {formatCurrency(summary.grand_total)} PLN
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between items-center p-2 bg-background/30 rounded">
          <span className="text-sm font-medium">Materiały:</span>
          <span className="text-sm font-semibold">
            {formatCurrency(summary.total_material_cost)} PLN
          </span>
        </div>
        <div className="flex justify-between items-center p-2 bg-background/30 rounded">
          <span className="text-sm font-medium">Złącza:</span>
          <span className="text-sm font-semibold">
            {formatCurrency(summary.total_connection_cost)} PLN
          </span>
        </div>
        {summary.total_labor_cost > 0 && (
          <div className="flex justify-between items-center p-2 bg-background/30 rounded">
            <span className="text-sm font-medium">Robocizna:</span>
            <span className="text-sm font-semibold">
              {formatCurrency(summary.total_labor_cost)} PLN
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

### Krok 4: Migracja kontroli widoczności

#### 4.1. Utworzenie komponentu VisibilityControls.tsx
**Plik:** `src/components/VisibilityControls.tsx`

**Funkcjonalność (1:1 z obecnego):**
- ✅ Przyciski "Pokaż wszystkie" / "Ukryj wszystkie"
- ✅ Checkboxy dla każdego typu z liczbą elementów
- ✅ Domyślnie wszystkie widoczne

**Implementacja:**
```typescript
import { IFCElement } from '@/types/ifc';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox'; // Jeśli dostępny, lub własny
import { Eye, EyeOff } from 'lucide-react';

interface VisibilityControlsProps {
  elements: IFCElement[];
  visibleTypes: Record<string, boolean>;
  onTypeVisibilityChange: (typeName: string, visible: boolean) => void;
  onShowAll: () => void;
  onHideAll: () => void;
}

export function VisibilityControls({
  elements,
  visibleTypes,
  onTypeVisibilityChange,
  onShowAll,
  onHideAll,
}: VisibilityControlsProps) {
  // Group elements by type
  const typeCounts: Record<string, number> = {};
  elements.forEach((element) => {
    const typeName = element.type_name || 'Unknown';
    typeCounts[typeName] = (typeCounts[typeName] || 0) + 1;
  });

  const sortedTypes = Object.keys(typeCounts).sort();

  return (
    <div className="space-y-4">
      <h4 className="font-semibold">Wyświetlanie elementów</h4>
      
      <div className="flex gap-2">
        <Button onClick={onShowAll} variant="outline" size="sm" className="flex-1">
          <Eye className="w-4 h-4 mr-2" />
          Pokaż wszystkie
        </Button>
        <Button onClick={onHideAll} variant="outline" size="sm" className="flex-1">
          <EyeOff className="w-4 h-4 mr-2" />
          Ukryj wszystkie
        </Button>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {sortedTypes.map((typeName) => {
          const count = typeCounts[typeName];
          const isVisible = visibleTypes[typeName] !== false;
          
          return (
            <label
              key={typeName}
              className="flex items-center gap-2 p-2 rounded hover:bg-accent cursor-pointer"
            >
              <input
                type="checkbox"
                checked={isVisible}
                onChange={(e) => onTypeVisibilityChange(typeName, e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm flex-1">
                {typeName} <span className="text-muted-foreground">({count})</span>
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
```

---

### Krok 5: Migracja listy elementów

#### 5.1. Utworzenie komponentu ElementsList.tsx
**Plik:** `src/components/ElementsList.tsx`

**Funkcjonalność (1:1 z obecnego):**
- ✅ Collapsible details section
- ✅ Pierwsze 10 elementów: `type_name - name`
- ✅ "... i X więcej" jeśli więcej niż 10

**Implementacja:**
```typescript
import { IFCElement } from '@/types/ifc';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'; // Jeśli dostępny
import { ChevronDown } from 'lucide-react';

interface ElementsListProps {
  elements: IFCElement[];
}

export function ElementsList({ elements }: ElementsListProps) {
  const displayCount = 10;
  const displayElements = elements.slice(0, displayCount);
  const remainingCount = elements.length - displayCount;

  return (
    <details className="mt-4">
      <summary className="cursor-pointer font-medium text-sm hover:text-primary">
        Szczegóły elementów
      </summary>
      <ul className="mt-2 space-y-1 text-sm">
        {displayElements.map((element, index) => (
          <li key={index} className="text-muted-foreground">
            <strong className="text-foreground">{element.type_name || 'Unknown'}</strong>
            {element.name && ` - ${element.name}`}
          </li>
        ))}
        {remainingCount > 0 && (
          <li className="text-muted-foreground italic">
            ... i {remainingCount} więcej
          </li>
        )}
      </ul>
    </details>
  );
}
```

---

### Krok 6: Rozszerzenie Viewer.tsx

#### 6.1. Integracja z danymi z backendu

**Problem:** Obecny Viewer.tsx ładuje pliki IFC bezpośrednio (FragmentIfcLoader), ale potrzebujemy renderować dane z backendu.

**Rozwiązanie:** Dodać tryb renderowania z danych z backendu (obecny Viewer3D.jsx) lub przekonwertować dane z backendu do formatu OpenBIM Components.

**Opcja A: Dual mode Viewer**
- Tryb 1: Ładowanie pliku IFC (obecna funkcjonalność)
- Tryb 2: Renderowanie z danych backendu (nowa funkcjonalność)

**Opcja B: Konwersja danych**
- Konwertować dane z backendu do formatu OpenBIM Components
- Użyć FragmentManager do tworzenia fragmentów

**Rekomendacja:** Opcja A - dual mode, zachować obie funkcjonalności.

**Implementacja (szkic):**
```typescript
// W Viewer.tsx dodać props:
interface ViewerProps {
  elements?: IFCElement[];        // Dane z backendu
  visibleTypes?: Record<string, boolean>; // Kontrola widoczności
  mode?: 'file' | 'backend';      // Tryb pracy
}

// W komponencie:
const Viewer = ({ elements, visibleTypes, mode = 'file' }: ViewerProps) => {
  // ... istniejący kod dla trybu 'file'
  
  // Dodać useEffect dla trybu 'backend':
  useEffect(() => {
    if (mode === 'backend' && elements && elements.length > 0) {
      // Renderowanie elementów z danych backendu
      // Użyć FragmentManager lub bezpośrednio Three.js
      renderElementsFromBackend(elements, visibleTypes);
    }
  }, [elements, visibleTypes, mode]);
  
  // ...
};
```

**Alternatywa:** Utworzyć osobny komponent `Viewer3D.tsx` dla danych z backendu (jak obecny), ale z TypeScript i Tailwind.

---

### Krok 7: Integracja w Viewer page

#### 7.1. Zmodyfikować `pages/Viewer.tsx`

**Funkcjonalność:**
- ✅ Integracja wszystkich komponentów
- ✅ Layout: sidebar + viewer (jak obecny App.jsx)
- ✅ Zarządzanie stanem przez `useIFCData` hook
- ✅ Renderowanie: IFCUploader, CostSummary, VisibilityControls, ElementsList, Viewer

**Layout:**
```typescript
<div className="flex flex-col h-screen">
  <header className="border-b p-4">
    <h1 className="text-2xl font-bold">IFC Construction Calculator</h1>
    <p className="text-muted-foreground">Wizualizacja i analiza konstrukcji budowlanych</p>
  </header>
  
  <div className="flex flex-1 overflow-hidden">
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
    
    <main className="flex-1 relative">
      <Viewer 
        elements={elements} 
        visibleTypes={visibleTypes}
        mode="backend"
      />
    </main>
  </div>
</div>
```

---

## 4. Checklist migracji

### Faza 1: Infrastruktura
- [ ] Utworzyć `src/types/ifc.ts` z interfejsami
- [ ] Utworzyć `src/lib/api.ts` z API client
- [ ] Utworzyć `src/hooks/useIFCData.ts`
- [ ] Dodać `axios` do dependencies (jeśli brakuje)

### Faza 2: Komponenty
- [ ] Utworzyć `src/components/IFCUploader.tsx`
- [ ] Utworzyć `src/components/CostSummary.tsx`
- [ ] Utworzyć `src/components/VisibilityControls.tsx`
- [ ] Utworzyć `src/components/ElementsList.tsx`
- [ ] Utworzyć `src/components/ErrorDisplay.tsx` (opcjonalnie)
- [ ] Utworzyć `src/components/LoadingDisplay.tsx` (opcjonalnie)
- [ ] Utworzyć `src/components/InfoPanel.tsx` (opcjonalnie)

### Faza 3: Viewer
- [ ] Rozszerzyć `src/pages/Viewer.tsx` o tryb backend
- [ ] Dodać renderowanie elementów z danych backendu
- [ ] Zintegrować kontrolę widoczności z Viewer
- [ ] Przetestować renderowanie 3D

### Faza 4: Integracja
- [ ] Zintegrować wszystkie komponenty w Viewer page
- [ ] Dodać layout (sidebar + viewer)
- [ ] Przetestować pełny flow: upload → parsowanie → wizualizacja → koszty

### Faza 5: Testy
- [ ] Dodać testy dla nowych komponentów
- [ ] Przetestować integrację z backendem
- [ ] Przetestować wszystkie funkcjonalności 1:1

---

## 5. Zachowanie architektury

### 5.1. Zasady

1. **TypeScript strict mode** - wszystkie komponenty w TSX
2. **Komponenty funkcjonalne** - React hooks, nie klasy
3. **Separation of concerns** - każdy komponent ma jedną odpowiedzialność
4. **Reusable hooks** - logika biznesowa w hooks
5. **Type safety** - interfejsy dla wszystkich danych
6. **Tailwind CSS** - styling przez utility classes
7. **shadcn/ui** - komponenty UI z biblioteki

### 5.2. Struktura plików

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

### 5.3. Naming conventions

- **Komponenty:** PascalCase (`IFCUploader.tsx`)
- **Hooks:** camelCase z prefiksem `use` (`useIFCData.ts`)
- **Types:** PascalCase (`IFCElement`, `CostSummary`)
- **Utils:** camelCase (`api.ts`, `utils.ts`)

---

## 6. Testowanie funkcjonalności 1:1

### 6.1. Checklist funkcjonalności

#### IFCUploader
- [ ] Wybór pliku .ifc działa
- [ ] Walidacja rozszerzenia działa
- [ ] Upload do backendu działa
- [ ] Timeout 5 minut działa
- [ ] Callbacki są wywoływane poprawnie
- [ ] Status uploadu jest wyświetlany
- [ ] Przycisk "Wyczyść" resetuje stan

#### Wyświetlanie kosztów
- [ ] Grand total jest wyświetlany
- [ ] Breakdown (Materiały, Złącza, Robocizna) jest wyświetlany
- [ ] Formatowanie waluty jest poprawne (pl-PL, 2 miejsca)
- [ ] Komunikat gdy koszty nie zostały obliczone

#### Kontrola widoczności
- [ ] Przycisk "Pokaż wszystkie" działa
- [ ] Przycisk "Ukryj wszystkie" działa
- [ ] Checkboxy zmieniają widoczność
- [ ] Liczba elementów jest wyświetlana
- [ ] Domyślnie wszystkie widoczne

#### Viewer 3D
- [ ] Elementy są renderowane
- [ ] Position z placement_matrix działa
- [ ] Dimensions z properties działa
- [ ] Kolory dla różnych typów działają
- [ ] Kontrola widoczności działa
- [ ] Orbit controls działają
- [ ] Auto-adjust camera działa

#### Layout
- [ ] Header jest wyświetlany
- [ ] Sidebar ma szerokość 350px (lub podobną)
- [ ] Viewer zajmuje resztę przestrzeni
- [ ] Responsive design działa (opcjonalnie)

---

## 7. Podsumowanie

### Co zostaje z nowego frontendu:
- ✅ Architektura (TypeScript, routing, struktura)
- ✅ Komponenty UI (shadcn/ui)
- ✅ ThemeContext (dark/light mode)
- ✅ ActionBar, CommentPanel
- ✅ Hooks (useComments, useTheme, useViewerHistory)
- ✅ Testy

### Co jest migrowane z obecnego frontendu:
- ✅ IFCUploader (z integracją backendu)
- ✅ Wyświetlanie kosztów
- ✅ Kontrola widoczności
- ✅ Lista elementów
- ✅ Viewer 3D (renderowanie z danych backendu)
- ✅ Layout (sidebar + viewer)

### Rezultat:
- ✅ Funkcjonalność 1:1 z obecnego frontendu
- ✅ Architektura z nowego frontendu
- ✅ Łatwość rozbudowy w przyszłości

---

**Następne kroki:**
1. Przedyskutować plan z zespołem
2. Utworzyć branch dla migracji
3. Rozpocząć od Fazy 1 (infrastruktura)
4. Testować każdy krok
5. Code review przed merge

