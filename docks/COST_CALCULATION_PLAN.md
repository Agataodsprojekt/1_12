# Plan Implementacji Obliczania Kosztów Materiałów

## 1. Co mamy dostępne w IFC

Z analizy pliku `KONSTRUKCJA_NAWA_III.ifc` widzimy, że mamy dostęp do:

### 1.1. Dane Materiałowe
- **MATERIAL**: Nazwa materiału (np. `'STEEL/S355'`)
- **PROFILE**: Profil/przekrój (np. `'HK542-8-22*400-92'`, `'A120'`)

### 1.2. Dane Ilościowe (BaseQuantities)
- **Width/Height**: Wymiary przekroju
- **Length**: Długość elementu
- **NetVolume**: Objętość netto (np. `0.153408 m³`)
- **NetWeight**: Masa netto (np. `1204.2528 kg`)

### 1.3. Właściwości Elementu
- **TypeName**: Typ elementu (`IfcBeam`, `IfcColumn`, etc.)
- **Properties**: Wszystkie Property Sets z IFC

## 2. Co jest potrzebne do obliczenia kosztów?

### 2.1. Cennik Materiałów
```python
# Przykładowa struktura
PRICE_LIST = {
    "STEEL/S355": {
        "unit": "kg",  # jednostka cennikowa
        "price_per_unit": 4.50,  # PLN/kg
    },
    "CONCRETE/C30": {
        "unit": "m³",
        "price_per_unit": 450.00,  # PLN/m³
    },
}
```

### 2.2. Reguły Obliczania
Dla każdego typu materiału potrzebujemy wiedzieć:
- **Jaka wielkość użyć**: masa (kg) czy objętość (m³)?
- **Czy uwzględniać odpady**: np. +5% dla stali
- **Czy są dodatkowe koszty**: np. cięcie, spawanie

## 3. Poziomy Trudności

### 3.1. ✅ ŁATWE - Podstawowe Obliczenia

**Scenariusz**: Mamy NetWeight i materiał

```python
def calculate_simple_cost(element: IfcElement, price_list: Dict) -> float:
    material = element.properties.get('MATERIAL', 'UNKNOWN')
    weight = element.properties.get('BaseQuantities.NetWeight', 0)
    
    if material in price_list:
        unit_price = price_list[material]['price_per_unit']
        return weight * unit_price
    
    return 0.0
```

**Zalety:**
- Proste
- Szybkie do implementacji
- Działa dla większości elementów stalowych

**Ograniczenia:**
- Wymaga NetWeight w IFC (nie zawsze dostępne)
- Nie uwzględnia dodatkowych kosztów

### 3.2. ⚠️ ŚREDNIO TRUDNE - Obliczanie z Wymiarów

**Scenariusz**: Mamy wymiary, ale nie mamy NetWeight

```python
def calculate_from_dimensions(element: IfcElement, price_list: Dict) -> float:
    material = element.properties.get('MATERIAL', 'UNKNOWN')
    width = element.properties.get('BaseQuantities.Width', 0)  # mm
    height = element.properties.get('BaseQuantities.Height', 0)  # mm
    length = element.properties.get('BaseQuantities.Length', 0)  # mm
    
    # Oblicz objętość
    volume_m3 = (width * height * length) / 1_000_000_000  # mm³ -> m³
    
    # Oblicz masę (dla stali: gęstość ~7850 kg/m³)
    if material.startswith('STEEL'):
        density = 7850  # kg/m³
        weight = volume_m3 * density
        unit_price = price_list[material]['price_per_unit']  # PLN/kg
        return weight * unit_price
    
    # Dla betonu: użyj objętości
    elif material.startswith('CONCRETE'):
        unit_price = price_list[material]['price_per_unit']  # PLN/m³
        return volume_m3 * unit_price
    
    return 0.0
```

**Wyzwania:**
- Różne jednostki (mm vs m)
- Trzeba znać gęstość materiałów
- Profile mogą być złożone (nie prostokątne)

### 3.3. 🔴 TRUDNE - Profile i Przekroje

**Scenariusz**: Element ma profil złożony (np. `HK542-8-22*400-92`)

```python
# Profile stalowe mają specyficzne wymiary
# HK542-8-22*400-92 = HEA 400 z grubością ścianki 8mm i pasami 22mm

PROFILE_WEIGHTS = {
    'HK542-8-22*400-92': 0.92,  # kg/m - masa na metr długości
    'A120': 0.45,  # kg/m - przykładowy profil
}

def calculate_from_profile(element: IfcElement, price_list: Dict) -> float:
    profile = element.properties.get('PROFILE', '')
    length = element.properties.get('BaseQuantities.Length', 0)  # mm
    
    if profile in PROFILE_WEIGHTS:
        weight_per_meter = PROFILE_WEIGHTS[profile]
        length_m = length / 1000  # mm -> m
        weight = length_m * weight_per_meter
        
        material = element.properties.get('MATERIAL', 'STEEL/S355')
        unit_price = price_list[material]['price_per_unit']
        return weight * unit_price
    
    return 0.0
```

**Wyzwania:**
- Trzeba mieć bazę danych profili
- Różne standardy (HEA, HEB, U, L, etc.)
- Profil może nie być w bazie

### 3.4. 🔴 BARDZO TRUDNE - Pełna Kalkulacja z Odpadami i Pracą

**Scenariusz**: Kompleksowa kalkulacja z wszystkimi kosztami

```python
class CostBreakdown:
    base_material_cost: float
    waste_factor: float  # np. 5% dla stali
    cutting_cost: float
    welding_cost: float
    surface_treatment: float
    transportation: float
    total: float

def calculate_full_cost(element: IfcElement, price_list: Dict, labor_rates: Dict) -> CostBreakdown:
    # Koszt materiału
    base_cost = calculate_from_weight_or_volume(element, price_list)
    
    # Odpady
    waste_factor = get_waste_factor(element.properties.get('MATERIAL'))
    material_with_waste = base_cost * (1 + waste_factor)
    
    # Praca
    cutting_cost = calculate_cutting_cost(element, labor_rates)
    welding_cost = calculate_welding_cost(element, labor_rates)
    
    # Powierzchnia do malowania (jeśli potrzebne)
    surface_area = element.properties.get('BaseQuantities.OuterSurfaceArea', 0)
    painting_cost = surface_area * labor_rates['painting_rate']
    
    return CostBreakdown(
        base_material_cost=base_cost,
        waste_factor=waste_factor,
        cutting_cost=cutting_cost,
        welding_cost=welding_cost,
        surface_treatment=painting_cost,
        total=material_with_waste + cutting_cost + welding_cost + painting_cost
    )
```

**Wyzwania:**
- Wymaga wielu danych wejściowych
- Reguły biznesowe mogą być złożone
- Trzeba mieć cenniki robocizny

## 4. Rekomendowane Podejście - KROK PO KROKU

### Faza 1: MVP (Minimum Viable Product) - **ŁATWE**

**Cel**: Szybko pokazać działające obliczanie kosztów

```python
# cost-calculator-service/infrastructure/services/cost_service.py

async def calculate_costs(
    self,
    elements: List[Dict[str, Any]]
) -> Result[Dict[str, Any], str]:
    """Calculate costs - MVP version"""
    
    # Prosty cennik
    PRICE_LIST = {
        "STEEL/S355": {"unit": "kg", "price": 4.50},
        "STEEL/S235": {"unit": "kg", "price": 4.20},
        "CONCRETE/C30": {"unit": "m³", "price": 450.00},
    }
    
    total_cost = 0.0
    element_costs = []
    
    for element in elements:
        material = element.get('properties', {}).get('MATERIAL', '')
        weight = float(element.get('properties', {}).get('BaseQuantities.NetWeight', 0))
        
        if material in PRICE_LIST and weight > 0:
            cost = weight * PRICE_LIST[material]['price']
            total_cost += cost
            element_costs.append({
                'element_id': element.get('global_id'),
                'material': material,
                'weight': weight,
                'cost': cost
            })
    
    return Result.success({
        'total_cost': total_cost,
        'element_costs': element_costs,
        'currency': 'PLN'
    })
```

**Czas implementacji**: 1-2 dni  
**Złożoność**: Niska  
**Pokrycie**: ~70% elementów (jeśli mają NetWeight)

### Faza 2: Obliczanie z Wymiarów - **ŚREDNIE**

**Cel**: Obsługa elementów bez NetWeight

```python
# Dodaj funkcję pomocniczą
def calculate_weight_from_dimensions(element: Dict) -> float:
    """Calculate weight when NetWeight is not available"""
    width = float(element.get('properties', {}).get('BaseQuantities.Width', 0))
    height = float(element.get('properties', {}).get('BaseQuantities.Height', 0))
    length = float(element.get('properties', {}).get('BaseQuantities.Length', 0))
    
    if width == 0 or height == 0 or length == 0:
        return 0.0
    
    # Convert mm to m and calculate volume
    volume_m3 = (width * height * length) / 1_000_000_000
    
    # Steel density
    STEEL_DENSITY = 7850  # kg/m³
    return volume_m3 * STEEL_DENSITY

# Użyj w calculate_costs
weight = float(element.get('properties', {}).get('BaseQuantities.NetWeight', 0))
if weight == 0:
    weight = calculate_weight_from_dimensions(element)
```

**Czas implementacji**: +1-2 dni  
**Złożoność**: Średnia  
**Pokrycie**: ~85% elementów

### Faza 3: Profile - **ŚREDNIO-TRUDNE**

**Cel**: Obsługa profili stalowych

```python
# Dodaj bazę profili (można z pliku JSON/CSV)
PROFILE_DATABASE = {
    'HK542-8-22*400-92': {'weight_per_meter': 0.92, 'type': 'HEA'},
    'A120': {'weight_per_meter': 0.45, 'type': 'custom'},
    # ... więcej profili
}

def calculate_weight_from_profile(element: Dict) -> float:
    """Calculate weight from profile database"""
    profile = element.get('properties', {}).get('PROFILE', '')
    length = float(element.get('properties', {}).get('BaseQuantities.Length', 0))
    
    if profile in PROFILE_DATABASE:
        weight_per_m = PROFILE_DATABASE[profile]['weight_per_meter']
        length_m = length / 1000  # mm -> m
        return length_m * weight_per_m
    
    return 0.0

# Priorytet: Profile > NetWeight > Dimensions
weight = calculate_weight_from_profile(element)
if weight == 0:
    weight = float(element.get('properties', {}).get('BaseQuantities.NetWeight', 0))
if weight == 0:
    weight = calculate_weight_from_dimensions(element)
```

**Czas implementacji**: +2-3 dni  
**Złożoność**: Średnio-wysoka (trzeba zbudować bazę profili)  
**Pokrycie**: ~95% elementów stalowych

### Faza 4: Zaawansowane (Opcjonalnie) - **TRUDNE**

- Odpady i marże
- Koszty robocizny
- Powierzchnie do malowania
- Transport i logistyka

**Czas implementacji**: +tygodnie  
**Złożoność**: Wysoka  
**Wartość biznesowa**: Zależy od potrzeb

## 5. Rekomendacja

### ✅ ZACZNIJ OD MVP (Faza 1)

**Dlaczego:**
1. **Szybkie wyniki**: Działający system w 1-2 dni
2. **Weryfikacja koncepcji**: Sprawdzenie czy podejście działa
3. **Feedback użytkowników**: Zrozumienie co jest naprawdę potrzebne
4. **Inkrementalne rozwijanie**: Można dodawać funkcje stopniowo

### 📋 Plan Implementacji

1. **Dzień 1**: 
   - Stwórz strukturę cennika (plik JSON lub baza danych)
   - Zaimplementuj podstawowe `calculate_costs`
   - Testy na przykładowych elementach

2. **Dzień 2**:
   - Dodaj obliczanie z wymiarów (Faza 2)
   - Obsługa przypadków brzegowych
   - Integracja z API Gateway

3. **Tydzień 2** (jeśli potrzebne):
   - Baza profili stalowych
   - Implementacja Fazy 3
   - UI do wyświetlania kosztów

### 🔧 Struktura Cennika

```json
// price_list.json
{
  "materials": {
    "STEEL/S355": {
      "unit": "kg",
      "price_per_unit": 4.50,
      "density_kg_m3": 7850
    },
    "STEEL/S235": {
      "unit": "kg",
      "price_per_unit": 4.20,
      "density_kg_m3": 7850
    },
    "CONCRETE/C30": {
      "unit": "m³",
      "price_per_unit": 450.00,
      "density_kg_m3": 2400
    }
  },
  "profiles": {
    "HK542-8-22*400-92": {
      "weight_per_meter_kg": 0.92,
      "standard": "HEA",
      "description": "HEA 400"
    }
  },
  "waste_factors": {
    "STEEL/S355": 0.05,
    "STEEL/S235": 0.05,
    "CONCRETE/C30": 0.10
  }
}
```

## 6. Podsumowanie

**Odpowiedź na pytanie "czy będzie trudne?":**

- **MVP (Faza 1)**: ⭐ Łatwe - 1-2 dni pracy
- **Rozszerzenie (Faza 2)**: ⭐⭐ Średnie - kolejne 1-2 dni
- **Profile (Faza 3)**: ⭐⭐⭐ Średnio-trudne - potrzebna baza danych profili
- **Zaawansowane**: ⭐⭐⭐⭐ Trudne - wymaga szczegółowych reguł biznesowych

**Rekomendacja**: Zacznij od prostego MVP, które da szybkie rezultaty. Następnie rozwijaj stopniowo w oparciu o rzeczywiste potrzeby.

