# Architektura Systemu Obliczania Kosztów

## 1. Koncepcja: Elastyczny System Provider-ów

System został zaprojektowany jako **rozszerzalna architektura oparta na wzorcu Strategy**, gdzie każdy typ kosztu ma własnego "provider-a" (dostawcę obliczeń).

### 1.1. Dlaczego Provider-y?

**Problem**: Różne typy kosztów wymagają różnych reguł obliczania:
- Materiały → cena za kg/m³
- Złącza/spojenia → cena za sztukę/metr spawu
- Robocizna → stawka za godzinę/metr
- Powierzchnie → cena za m²

**Rozwiązanie**: Każdy typ kosztu ma własnego provider-a, który:
- Wie jak rozpoznać, czy może obliczyć koszt dla elementu
- Ma własną logikę obliczania
- Może być dodawany bez zmiany głównej logiki

## 2. Struktura Provider-ów

### 2.1. MaterialCostProvider
**Oblicza**: Koszty materiałów (stal, beton, etc.)

**Dane wejściowe**:
- MATERIAL z elementu IFC
- NetWeight lub NetVolume lub wymiary
- Cennik materiałów z `rules/material_prices.json`

**Przykład**:
```python
Element: IfcBeam
  - MATERIAL: "STEEL/S355"
  - NetWeight: 1204.25 kg
  → Koszt: 1204.25 kg × 4.50 PLN/kg = 5419.13 PLN
```

### 2.2. ConnectionCostProvider
**Oblicza**: Koszty złączy, spoin, śrub

**Dane wejściowe**:
- CONNECTION_CODE z elementu
- WeldLength (długość spawu)
- BoltCount (liczba śrub)
- Cennik złączy z `rules/connection_costs.json`

**Przykład**:
```python
Element: IfcFastener
  - CONNECTION_CODE: "Welded"
  - WeldLength: 500 mm
  → Koszt: 0.5 m × 25.00 PLN/m = 12.50 PLN

Element: IfcMechanicalFastener
  - BoltCount: 8
  - BoltSize: "M16"
  → Koszt: 8 szt × 3.50 PLN/szt = 28.00 PLN
```

### 2.3. Przyszli Provider-y (do implementacji)

#### LaborCostProvider
- Cięcie materiałów
- Montaż
- Transport

#### SurfaceTreatmentCostProvider
- Malowanie
- Powłoki antykorozyjne
- Powierzchnia z BaseQuantities.OuterSurfaceArea

## 3. System Reguł Biznesowych

### 3.1. Ładowanie Reguł (Rule Loader)

Reguły są ładowane z plików JSON w folderze `rules/`:

```
rules/
├── material_prices.json      # Cennik materiałów
├── connection_costs.json    # Koszty złączy/spoin
├── labor_rates.json         # Stawki robocizny
├── waste_factors.json       # Współczynniki odpadów
└── calculation_rules.json   # Reguły obliczania
```

### 3.2. Jak Członkowie Zespołu Dodają Reguły?

**KROK 1**: Otwórz plik JSON (np. `connection_costs.json`)

**KROK 2**: Dodaj nowy wpis:
```json
{
  "welding": {...},
  "bolts": {...},
  "new_connection_type": {
    "price": 150.00,
    "description": "Nowy typ złącza"
  }
}
```

**KROK 3**: Zapisz - zmiany są automatycznie wczytane!

**Brak potrzeby pisania kodu!** Wystarczy edycja pliku JSON.

## 4. Przepływ Obliczania Kosztów

```
1. Element IFC
   ↓
2. CostService.calculate_costs()
   ↓
3. Dla każdego elementu:
   ├─→ MaterialCostProvider.can_calculate()?
   │   └─→ TAK → MaterialCostProvider.calculate()
   │
   ├─→ ConnectionCostProvider.can_calculate()?
   │   └─→ TAK → ConnectionCostProvider.calculate()
   │
   └─→ [Przyszli provider-y]
   ↓
4. Zebranie wszystkich CostItem z wszystkich provider-ów
   ↓
5. Obliczenie waste factor (odpady)
   ↓
6. ElementCostBreakdown (podsumowanie dla elementu)
   ↓
7. ProjectCostBreakdown (podsumowanie całego projektu)
```

## 5. Szczegółowy Podział Kosztów (Cost Breakdown)

### 5.1. CostItem
Pojedynczy pozycja kosztu:
```python
CostItem(
    category="connection",        # Kategoria: material, labor, connection, etc.
    item_type="welding",          # Typ: welding, bolt_M16, etc.
    quantity=0.5,                 # Ilość: 0.5 m spawu
    unit="m",                     # Jednostka: m, kg, szt, m²
    unit_price=25.00,             # Cena jednostkowa
    total_price=12.50,            # Całkowity koszt
    description="Welding cost",   # Opis
    metadata={...}                # Dodatkowe info
)
```

### 5.2. ElementCostBreakdown
Podsumowanie dla jednego elementu:
```python
ElementCostBreakdown(
    element_id="3ijbB$3n14CQY4N27uP2iQ",
    cost_items=[...],             # Lista wszystkich kosztów
    subtotal=5419.13,            # Suma przed marżą
    waste_factor=0.05,           # 5% odpadów
    waste_cost=270.96,           # Koszt odpadów
    total=5690.09                # Całkowity koszt elementu
)
```

### 5.3. ProjectCostBreakdown
Podsumowanie całego projektu:
```python
ProjectCostBreakdown(
    project_name="IFC Project",
    element_costs=[...],          # Wszystkie elementy
    total_material_cost=50000.00,
    total_connection_cost=5000.00,
    total_labor_cost=10000.00,
    grand_total=65000.00         # Całkowity koszt projektu
)
```

## 6. Jak Dodać Nowego Provider-a?

### KROK 1: Stwórz klasę Provider-a

```python
# infrastructure/services/my_new_provider.py
from domain.interfaces.cost_provider import ICostProvider
from domain.entities.cost_breakdown import CostItem

class MyNewCostProvider(ICostProvider):
    def get_provider_name(self) -> str:
        return "my_new_cost"
    
    def can_calculate(self, element: Dict[str, Any]) -> bool:
        # Sprawdź czy ten provider może obliczyć koszt dla elementu
        return 'MyProperty' in element.get('properties', {})
    
    def calculate(self, element: Dict[str, Any], rules: Dict[str, Any]) -> List[CostItem]:
        # Oblicz koszt
        properties = element.get('properties', {})
        my_prices = rules.get('my_new_cost_prices', {})
        
        # ... logika obliczania ...
        
        return [CostItem(...)]
```

### KROK 2: Zarejestruj Provider-a

```python
# infrastructure/services/cost_service.py
from infrastructure.services.my_new_provider import MyNewCostProvider

class CostService(ICostService):
    def __init__(self, ...):
        self.providers = [
            MaterialCostProvider(),
            ConnectionCostProvider(),
            MyNewCostProvider(),  # ← Dodaj tutaj
        ]
```

### KROK 3: Dodaj reguły do JSON

```json
// rules/my_new_cost_prices.json
{
  "item_type_1": {
    "price_per_unit": 10.00,
    "unit": "szt"
  }
}
```

### KROK 4: Wczytaj reguły w RuleLoader

```python
# infrastructure/config/rules_loader.py
def get_my_new_cost_prices(self):
    file_path = os.path.join(self.rules_dir, 'my_new_cost_prices.json')
    # ...
```

**To wszystko!** Provider jest gotowy do użycia.

## 7. Wsparcie dla Spojenia/Złącza

### 7.1. Wykrywanie Złączy w IFC

ConnectionCostProvider szuka:
- `CONNECTION_CODE` w properties
- `IfcFastener`, `IfcMechanicalFastener` w type_name
- `Welding`, `Bolts`, `WeldLength`, `BoltCount` w properties

### 7.2. Obliczanie Kosztów Spojenia

**Przykład 1: Spawanie**
```python
Element ma: WeldLength = 500 mm
Reguła: price_per_meter = 25.00 PLN/m
→ Koszt = 0.5 m × 25.00 = 12.50 PLN
```

**Przykład 2: Śruby**
```python
Element ma: BoltCount = 8, BoltSize = "M16"
Reguła: M16 price_per_unit = 3.50 PLN/szt
→ Koszt = 8 × 3.50 = 28.00 PLN
```

**Przykład 3: Typ złącza**
```python
Element ma: CONNECTION_CODE = "rigid_frame"
Reguła: rigid_frame price = 150.00 PLN
→ Koszt = 150.00 PLN
```

## 8. Konfiguracja przez JSON

### 8.1. Zalety

✅ **Brak potrzeby pisania kodu** - edycja JSON wystarczy  
✅ **Łatwe zarządzanie wersjami** - pliki JSON w Git  
✅ **Szybkie zmiany** - bez rebuild-u aplikacji  
✅ **Czytelność** - łatwo sprawdzić aktualne ceny

### 8.2. Przykład: Dodanie Nowego Materiału

**Przed** (wymaga zmiany kodu):
```python
# Trzeba edytować Python
PRICE_LIST["STEEL/S460"] = {"unit": "kg", "price": 5.20}
```

**Po** (tylko JSON):
```json
{
  "STEEL/S460": {
    "unit": "kg",
    "price_per_unit": 5.20,
    "density_kg_m3": 7850
  }
}
```

## 9. Podsumowanie

### ✅ Co Jest Gotowe

1. **Architektura Provider-ów** - łatwe dodawanie nowych typów kosztów
2. **MaterialCostProvider** - obliczanie kosztów materiałów
3. **ConnectionCostProvider** - obliczanie kosztów złączy/spojenia
4. **System reguł JSON** - członkowie zespołu mogą dodawać reguły bez kodowania
5. **Szczegółowy breakdown** - pełny podział kosztów na każdym poziomie

### 🔄 Co Trzeba Zrobić

1. **Uzupełnić reguły w JSON** - członkowie zespołu dodają cenniki
2. **Dodać więcej provider-ów** - Labor, Surface Treatment, etc.
3. **Rozszerzyć ConnectionCostProvider** - więcej typów złączy
4. **Integracja z parserem IFC** - wykrywanie złączy w plikach IFC

### 🎯 Cel: Wszystko Ma Koszt

System został zaprojektowany tak, aby:
- ✅ Każdy element ma obliczony koszt
- ✅ Każde złącze ma obliczony koszt
- ✅ Każda spaw ma obliczony koszt
- ✅ Reguły mogą być dodawane przez członków zespołu bez kodowania
- ✅ Architektura jest gotowa na rozbudowę

**Nie będzie trudne** - system jest przygotowany na kompleksowe obliczanie kosztów! 🚀

