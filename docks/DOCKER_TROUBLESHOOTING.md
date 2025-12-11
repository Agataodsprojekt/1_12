# 🐳 Docker Troubleshooting Guide

## Problem: "The system cannot find the file specified" / "dockerDesktopLinuxEngine"

### Rozwiązanie:

**Docker Desktop nie jest uruchomiony!**

1. **Uruchom Docker Desktop:**
   - Znajdź "Docker Desktop" w menu Start Windows
   - Uruchom aplikację
   - Poczekaj aż Docker Desktop się uruchomi (ikona w zasobniku systemowym przestanie się animować)

2. **Sprawdź czy Docker działa:**
   ```powershell
   docker ps
   ```
   Jeśli zobaczysz listę kontenerów (lub pustą listę bez błędu), Docker działa poprawnie.

3. **Spróbuj ponownie:**
   ```powershell
   cd C:\ProjektyPublic\ifc-construction-calculator
   docker-compose up --build
   ```

## Inne możliwe problemy:

### Problem: Docker Desktop się nie uruchamia

1. Sprawdź czy Docker Desktop jest zainstalowany:
   - Otwórz "Programy i funkcje" w Windows
   - Szukaj "Docker Desktop"

2. Jeśli nie jest zainstalowany:
   - Pobierz z: https://www.docker.com/products/docker-desktop/
   - Zainstaluj i uruchom ponownie komputer

### Problem: "WSL 2 installation is incomplete"

Docker Desktop wymaga WSL 2 na Windows.

1. Sprawdź czy WSL 2 jest zainstalowany:
   ```powershell
   wsl --list --verbose
   ```

2. Jeśli nie, zainstaluj WSL 2:
   ```powershell
   wsl --install
   ```
   Następnie uruchom ponownie komputer.

### Problem: Port już zajęty

Jeśli port jest już zajęty, możesz:
1. Zatrzymać proces używający portu
2. Zmienić port w `docker-compose.yml`

### Problem: Brak uprawnień

Uruchom PowerShell jako Administrator i spróbuj ponownie.

## Szybka weryfikacja:

```powershell
# 1. Sprawdź wersję Dockera
docker --version

# 2. Sprawdź czy Docker działa
docker ps

# 3. Sprawdź czy docker-compose działa
docker-compose --version

# 4. Sprawdź status Docker Desktop
# (ikona w zasobniku systemowym powinna być zielona/niebieska)
```

## Alternatywa: Uruchomienie bez Dockera

Jeśli Docker nie działa, możesz uruchomić serwisy lokalnie (wymaga Python i wszystkich zależności):

Zobacz plik `run_all.ps1` lub `run_all.sh` w głównym katalogu projektu.

