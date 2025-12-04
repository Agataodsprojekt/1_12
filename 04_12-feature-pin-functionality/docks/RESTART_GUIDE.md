# 🔄 Przewodnik Restartowania Serwisów

## Szybki Restart (Kiedy zmieniłeś kod)

### 1. Restart pojedynczego serwisu

```powershell
# Przejdź do katalogu projektu
cd "C:\Users\maggi\OneDrive\Pulpit\Bielik przygotowania\ifc-construction-calculator"

# Restart konkretnego serwisu
docker-compose restart <nazwa-serwisu>
```

**Przykłady:**
```powershell
# Restart frontendu (gdy zmieniłeś kod React)
docker-compose restart frontend-client

# Restart API Gateway (gdy zmieniłeś kod w api-gateway)
docker-compose restart api-gateway

# Restart Cost Calculator (gdy zmieniłeś kod w cost-calculator-service)
docker-compose restart cost-calculator-service

# Restart IFC Parser (gdy zmieniłeś kod w ifc-parser-service)
docker-compose restart ifc-parser-service
```

### 2. Restart wszystkich serwisów

```powershell
cd "C:\Users\maggi\OneDrive\Pulpit\Bielik przygotowania\ifc-construction-calculator"
docker-compose restart
```

---

## Kiedy używać jakiego restartu?

### ✅ `docker-compose restart` - Szybki restart (bez przebudowy)

**Użyj gdy:**
- Zmieniłeś kod w plikach (volume mount - zmiany są widoczne od razu)
- Chcesz szybko zrestartować serwis
- Nie zmieniłeś `requirements.txt`, `Dockerfile`, ani zależności

**Przykład:**
```powershell
# Zmieniłeś kod w frontend/src/App.jsx
docker-compose restart frontend-client
```

### 🔨 `docker-compose up --build -d` - Przebudowa i restart

**Użyj gdy:**
- Zmieniłeś `requirements.txt` (dodałeś nową bibliotekę Python)
- Zmieniłeś `Dockerfile`
- Zmieniłeś `package.json` (dodałeś nową bibliotekę npm)
- Zmieniłeś strukturę projektu
- Pierwszy raz uruchamiasz projekt

**Przykład:**
```powershell
# Dodałeś nową bibliotekę do requirements.txt
docker-compose up --build -d cost-calculator-service
```

### 🛑 `docker-compose down` + `docker-compose up -d` - Pełny restart

**Użyj gdy:**
- Coś się zepsuło i chcesz zacząć od zera
- Zmieniłeś `docker-compose.yml`
- Chcesz wyczyścić wszystkie kontenery i uruchomić na nowo

**Przykład:**
```powershell
# Zatrzymaj wszystko
docker-compose down

# Uruchom na nowo
docker-compose up -d
```

---

## Szczegółowe Instrukcje

### Scenariusz 1: Zmieniłeś kod w frontendzie (React)

```powershell
# 1. Przejdź do katalogu projektu
cd "C:\Users\maggi\OneDrive\Pulpit\Bielik przygotowania\ifc-construction-calculator"

# 2. Restart frontendu
docker-compose restart frontend-client

# 3. Sprawdź czy działa (opcjonalnie)
docker-compose logs --tail=10 frontend-client
```

**Uwaga:** Frontend ma volume mount (`./frontend:/app`), więc zmiany w kodzie są widoczne od razu po restarcie!

### Scenariusz 2: Zmieniłeś kod w backendzie (Python)

```powershell
# 1. Przejdź do katalogu projektu
cd "C:\Users\maggi\OneDrive\Pulpit\Bielik przygotowania\ifc-construction-calculator"

# 2. Restart konkretnego serwisu
docker-compose restart cost-calculator-service

# 3. Sprawdź logi (czy nie ma błędów)
docker-compose logs --tail=20 cost-calculator-service
```

**Uwaga:** Backend ma volume mount (`./cost-calculator-service:/app`), więc zmiany w kodzie są widoczne od razu po restarcie!

### Scenariusz 3: Dodałeś nową bibliotekę Python

```powershell
# 1. Przejdź do katalogu projektu
cd "C:\Users\maggi\OneDrive\Pulpit\Bielik przygotowania\ifc-construction-calculator"

# 2. Przebuduj i uruchom serwis (--build przebuduje obraz)
docker-compose up --build -d cost-calculator-service

# 3. Sprawdź logi
docker-compose logs --tail=20 cost-calculator-service
```

### Scenariusz 4: Coś się zepsuło - pełny restart

```powershell
# 1. Przejdź do katalogu projektu
cd "C:\Users\maggi\OneDrive\Pulpit\Bielik przygotowania\ifc-construction-calculator"

# 2. Zatrzymaj wszystkie serwisy
docker-compose down

# 3. Uruchom wszystko na nowo
docker-compose up -d

# 4. Sprawdź status wszystkich serwisów
docker-compose ps
```

---

## Przydatne Komendy

### Sprawdzanie statusu

```powershell
# Status wszystkich serwisów
docker-compose ps

# Status konkretnego serwisu
docker-compose ps frontend-client
```

### Sprawdzanie logów

```powershell
# Ostatnie 20 linii logów wszystkich serwisów
docker-compose logs --tail=20

# Ostatnie 50 linii logów konkretnego serwisu
docker-compose logs --tail=50 frontend-client

# Logi w czasie rzeczywistym (live)
docker-compose logs -f frontend-client
```

### Zatrzymywanie serwisów

```powershell
# Zatrzymaj wszystkie serwisy
docker-compose stop

# Zatrzymaj konkretny serwis
docker-compose stop frontend-client
```

### Usuwanie serwisów (z danymi)

```powershell
# Zatrzymaj i usuń kontenery (zachowuje dane w wolumenach)
docker-compose down

# Zatrzymaj i usuń kontenery + wolumeny (usuwa dane!)
docker-compose down -v
```

---

## Lista Nazw Serwisów

Używaj tych nazw w komendach `docker-compose restart <nazwa>`:

- `frontend-client` - Frontend React
- `api-gateway` - API Gateway
- `ifc-parser-service` - IFC Parser Service
- `cost-calculator-service` - Cost Calculator Service
- `calculation-engine-service` - Calculation Engine Service
- `3d-data-service` - 3D Data Service
- `database-manager-service` - Database Manager Service
- `postgres` - PostgreSQL Database

---

## Najczęstsze Sytuacje

### "Zmieniłem kod w React, ale nie widzę zmian"

```powershell
docker-compose restart frontend-client
```

### "Dodałem nową bibliotekę do requirements.txt"

```powershell
docker-compose up --build -d <nazwa-serwisu>
```

### "Wszystko się zepsuło, chcę zacząć od zera"

```powershell
docker-compose down
docker-compose up --build -d
```

### "Chcę zobaczyć co się dzieje w serwisie"

```powershell
docker-compose logs -f <nazwa-serwisu>
```

### "Chcę sprawdzić czy wszystkie serwisy działają"

```powershell
docker-compose ps
```

---

## Szybka Referencja

| Co chcesz zrobić | Komenda |
|------------------|---------|
| Restart pojedynczego serwisu | `docker-compose restart <nazwa>` |
| Restart wszystkich serwisów | `docker-compose restart` |
| Przebuduj i uruchom serwis | `docker-compose up --build -d <nazwa>` |
| Zatrzymaj wszystko | `docker-compose down` |
| Uruchom wszystko | `docker-compose up -d` |
| Zobacz logi | `docker-compose logs -f <nazwa>` |
| Status serwisów | `docker-compose ps` |

---

## Uwagi

1. **Volume Mounts**: Większość serwisów ma volume mounts, więc zmiany w kodzie są widoczne od razu po restarcie (bez przebudowy obrazu).

2. **Hot Reload**: Frontend React ma hot reload - niektóre zmiany są widoczne bez restartu!

3. **Backend**: Backend Python (FastAPI) wymaga restartu po zmianach w kodzie.

4. **Baza danych**: PostgreSQL nie wymaga restartu przy zmianach w kodzie aplikacji.

5. **Czas restartu**: Restart pojedynczego serwisu zajmuje kilka sekund. Przebudowa obrazu może zająć kilka minut.

---

## Przykład: Pełny Workflow

```powershell
# 1. Przejdź do projektu
cd "C:\Users\maggi\OneDrive\Pulpit\Bielik przygotowania\ifc-construction-calculator"

# 2. Zmieniłeś kod w frontend/src/App.jsx
# (edytujesz plik w edytorze)

# 3. Restart frontendu
docker-compose restart frontend-client

# 4. Sprawdź logi (czy działa)
docker-compose logs --tail=10 frontend-client

# 5. Otwórz przeglądarkę: http://localhost:3000
# Zmiany powinny być widoczne!
```

---

**Gotowe!** Teraz wiesz jak restartować serwisy. 🚀

