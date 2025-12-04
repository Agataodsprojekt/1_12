# IFC Construction Calculator - Frontend

Frontend aplikacji do wizualizacji i analizy konstrukcji budowlanych z plików IFC.

## Technologie

- **React 18** - Framework UI
- **Vite** - Build tool
- **Three.js** - Wizualizacja 3D
- **Axios** - HTTP client

## Struktura

```
frontend/
├── src/
│   ├── components/
│   │   ├── IFCUploader.jsx    # Komponent uploadu plików IFC
│   │   └── Viewer3D.jsx        # Komponent wizualizacji 3D (Three.js)
│   ├── App.jsx                # Główny komponent aplikacji
│   ├── main.jsx               # Entry point
│   └── index.css              # Globalne style
├── package.json
├── vite.config.js
└── Dockerfile
```

## Funkcjonalności

1. **Upload plików .ifc**
   - Drag & drop lub wybór pliku
   - Walidacja formatu
   - Progress indicator

2. **Wizualizacja 3D**
   - Renderowanie elementów konstrukcji
   - Interaktywna kamera (rotate, zoom, pan)
   - Różne kolory dla różnych typów elementów:
     - Beams (belki) - niebieski
     - Columns (słupy) - czerwony
     - Walls (ściany) - zielony
     - Slabs (płyty) - żółty

3. **Informacje o elementach**
   - Lista wszystkich elementów
   - Szczegóły każdego elementu
   - Właściwości materiałowe

## Uruchomienie lokalnie

```bash
cd frontend
npm install
npm run dev
```

Aplikacja będzie dostępna na `http://localhost:3000`

## Uruchomienie z Docker

Frontend jest zintegrowany z `docker-compose.yml`:

```bash
docker-compose up frontend-client
```

## Zmienne środowiskowe

- `VITE_API_URL` - URL do API Gateway (domyślnie: `http://localhost:8000`)

## Integracja z Backendem

Frontend komunikuje się z backendem przez API Gateway:

```
Frontend → POST /api/ifc/parse (multipart/form-data)
         → API Gateway
         → IFC Parser Service
         → Response: { elements: [...] }
```

## Funkcje do rozbudowy

- [ ] Lepsze parsowanie geometrii z IFC (zamiast prostych boxów)
- [ ] Export do różnych formatów
- [ ] Wybór elementów i szczegółowe informacje
- [ ] Różne tryby wyświetlania (wireframe, solid, etc.)
- [ ] Legenda i kontrolki kamery

