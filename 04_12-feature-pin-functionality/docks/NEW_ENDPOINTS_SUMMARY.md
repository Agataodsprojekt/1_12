# Nowe Endpointy - Podsumowanie

## 📊 Dodane Endpointy

### 1. **3d-data-service** - Zarządzanie wizualizacją

#### Views (Widoki)
```
POST   /api/visualization/views
       Body: { project_id, name, type, data }
       Utworzenie nowego widoku (storey, elevation, section)

GET    /api/visualization/views/{project_id}
       Pobranie wszystkich widoków projektu

PUT    /api/visualization/views/{view_id}
       Body: { ...view_data }
       Aktualizacja widoku

DELETE /api/visualization/views/{view_id}
       Usunięcie widoku
```

#### Pins (Piny)
```
POST   /api/visualization/pins
       Body: { project_id, element_id, color }
       Przypięcie elementu z kolorem

DELETE /api/visualization/pins/{project_id}/{element_id}
       Odpięcie elementu

GET    /api/visualization/pins/{project_id}
       Pobranie wszystkich pinów projektu

PUT    /api/visualization/pins/{project_id}/{element_id}
       Query: ?color=#000000
       Zmiana koloru pina
```

#### Selections (Selekcje)
```
POST   /api/visualization/selections
       Body: { project_id, name, element_ids, metadata }
       Utworzenie selekcji

GET    /api/visualization/selections/{project_id}
       Pobranie wszystkich selekcji projektu

POST   /api/visualization/selections/{selection_id}/isolate
       Izolacja elementów w selekcji

POST   /api/visualization/selections/{selection_id}/show
       Pokazanie elementów w selekcji

POST   /api/visualization/selections/{selection_id}/hide
       Ukrycie elementów w selekcji
```

---

### 2. **database-manager-service** - Komentarze

#### Comments (Komentarze)
```
POST   /api/projects/{project_id}/comments
       Body: { text, element_id?, element_name?, metadata? }
       Dodanie komentarza

GET    /api/projects/{project_id}/comments
       Query: ?element_id=xxx (opcjonalnie)
       Pobranie komentarzy projektu lub elementu

GET    /api/projects/{project_id}/comments/{element_id}
       Pobranie komentarzy dla konkretnego elementu

PUT    /api/projects/{project_id}/comments/{comment_id}
       Body: { text, ... }
       Edycja komentarza

DELETE /api/projects/{project_id}/comments/{comment_id}
       Usunięcie komentarza
```

---

### 3. **calculation-engine-service** - Pomiary

#### Measurements (Pomiary)
```
POST   /api/calculations/dimensions
       Body: { point1: {x, y, z}, point2: {x, y, z}, project_id }
       Obliczenie wymiaru między dwoma punktami

POST   /api/calculations/volume
       Body: { points: [{x, y, z}, ...], project_id }
       Obliczenie objętości z punktów

GET    /api/calculations/measurements/{project_id}
       Pobranie wszystkich pomiarów projektu
```

---

### 4. **ifc-parser-service** - Wyszukiwanie

#### Search & Filter (Wyszukiwanie i filtrowanie)
```
POST   /api/ifc/search
       Body: { query: "string", elements: [...] }
       Wyszukiwanie elementów po query string

POST   /api/ifc/filter
       Body: { filters: {type_name?, name?, properties?}, elements: [...] }
       Filtrowanie elementów po kryteriach

GET    /api/ifc/elements/{element_id}
       Pobranie szczegółów elementu (placeholder - wymaga elements w body)
```

---

## 📋 Przykłady użycia

### Utworzenie widoku sekcji
```bash
POST /api/visualization/views
{
  "project_id": "proj-123",
  "name": "Section 1",
  "type": "section",
  "data": {
    "normal": {"x": 0, "y": 1, "z": 0},
    "point": {"x": 0, "y": 0, "z": 0},
    "range": 20
  }
}
```

### Przypięcie elementu
```bash
POST /api/visualization/pins
{
  "project_id": "proj-123",
  "element_id": "12345",
  "color": "#000000"
}
```

### Dodanie komentarza
```bash
POST /api/projects/proj-123/comments
{
  "text": "To jest ważny element",
  "element_id": "12345",
  "element_name": "Beam-01"
}
```

### Obliczenie wymiaru
```bash
POST /api/calculations/dimensions
{
  "point1": {"x": 0, "y": 0, "z": 0},
  "point2": {"x": 10, "y": 0, "z": 0},
  "project_id": "proj-123"
}
```

### Wyszukiwanie elementów
```bash
POST /api/ifc/search
{
  "query": "beam",
  "elements": [...]
}
```

---

## 🔄 Integracja z API Gateway

Wszystkie endpointy są dostępne przez API Gateway na porcie 8000:

```
http://localhost:8000/api/visualization/...
http://localhost:8000/api/projects/...
http://localhost:8000/api/calculations/...
http://localhost:8000/api/ifc/...
```

---

## ⚠️ Uwagi

1. **Storage**: Obecnie używane jest przechowywanie w pamięci (in-memory). W produkcji należy zastąpić bazą danych.

2. **Autoryzacja**: Endpointy nie mają jeszcze autoryzacji - należy dodać w przyszłości.

3. **Walidacja**: Niektóre endpointy wymagają dodatkowej walidacji danych wejściowych.

4. **Elementy w ifc-parser-service**: Endpointy `/search` i `/filter` wymagają przekazania elementów w body - w przyszłości powinny być przechowywane w bazie danych.

---

## ✅ Status

- ✅ **3d-data-service**: Views, Pins, Selections - dodane
- ✅ **database-manager-service**: Comments - dodane
- ✅ **calculation-engine-service**: Dimensions, Volume, Measurements - dodane
- ✅ **ifc-parser-service**: Search, Filter - dodane

**Gotowe do integracji z frontendem!**
