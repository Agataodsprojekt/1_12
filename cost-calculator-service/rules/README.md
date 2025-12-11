# Business Rules Configuration

Ten folder zawiera pliki JSON z regułami biznesowymi do obliczania kosztów.

## Struktura Plików

### `material_prices.json`
Cennik materiałów. Format:
```json
{
  "STEEL/S355": {
    "unit": "kg",
    "price_per_unit": 4.50,
    "density_kg_m3": 7850
  },
  "CONCRETE/C30": {
    "unit": "m³",
    "price_per_unit": 450.00,
    "density_kg_m3": 2400
  }
}
```

### `labor_rates.json`
Stawki za robociznę. Format:
```json
{
  "welding": {
    "rate_per_hour": 80.00,
    "rate_per_meter": 25.00
  },
  "cutting": {
    "rate_per_hour": 60.00
  }
}
```

### `connection_costs.json`
Koszty złączy, połączeń, spoin. Format:
```json
{
  "welding": {
    "price_per_meter": 25.00,
    "price_per_operation": 50.00
  },
  "bolts": {
    "M12": {"price_per_unit": 2.50},
    "M16": {"price_per_unit": 3.50},
    "M20": {"price_per_unit": 5.00},
    "default": {"price_per_unit": 2.50}
  },
  "connection_types": {
    "rigid_frame": {"price": 150.00},
    "hinged": {"price": 80.00}
  }
}
```

### `waste_factors.json`
Współczynniki odpadów (marże). Format:
```json
{
  "STEEL/S355": 0.05,
  "STEEL/S235": 0.05,
  "CONCRETE/C30": 0.10,
  "default": 0.05
}
```

### `calculation_rules.json`
Reguły obliczania (które provider-y użyć). Format:
```json
{
  "enabled_providers": ["material", "connection", "labor"],
  "priority_order": ["material", "connection", "labor"]
}
```

## Jak Dodawać Nowe Reguły?

1. **Otwórz odpowiedni plik JSON**
2. **Dodaj nowy wpis** zgodnie z istniejącym formatem
3. **Zapisz plik** - zmiany będą automatycznie wczytane przy następnym wywołaniu

## Przykład: Dodawanie Nowego Materiału

```json
{
  "STEEL/S355": {...},
  "STEEL/S460": {
    "unit": "kg",
    "price_per_unit": 5.20,
    "density_kg_m3": 7850
  }
}
```

## Przykład: Dodawanie Nowego Typu Złącza

```json
{
  "connection_types": {
    "rigid_frame": {"price": 150.00},
    "welded_connection": {"price": 200.00},
    "bolted_connection": {"price": 120.00}
  }
}
```

## Uwagi

- Wszystkie ceny w PLN
- Wartości dziesiętne jako liczby (np. `4.50`, nie `"4.50"`)
- Współczynniki odpadów jako ułamki dziesiętne (np. `0.05` = 5%)
- Jednostki: `kg`, `m³`, `m²`, `m`, `szt` (sztuka)

