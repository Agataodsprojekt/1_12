# Jak wysłać zmiany na GitHub z PowerShell

## Szybki przewodnik

### 1. Sprawdź status repozytorium
```powershell
git status
```

### 2. Jeśli masz nowe zmiany - dodaj je do staging
```powershell
git add .
```

### 3. Utwórz commit (jeśli jeszcze nie zrobiłeś)
```powershell
git commit -m "Opis zmian"
```

### 4. Wypchnij zmiany na GitHub
```powershell
# Wypchnij na aktualny branch (04_12_v1)
git push origin 04_12_v1

# Lub krócej, jeśli branch jest już ustawiony jako tracking:
git push
```

### 5. Jeśli branch nie istnieje na GitHub - utwórz go:
```powershell
git push -u origin 04_12_v1
```

## Obecna sytuacja

- **Branch:** `04_12_v1`
- **Status:** Working tree clean
- **Commit do wypchnięcia:** `46ffed7 - Add export functionality, fix camera tool, fix selection panel bugs`

## Komenda do wykonania teraz:

Jeśli wszystko jest gotowe:

```powershell
git push origin 04_12_v1
```

### Jeśli pojawi się błąd "non-fast-forward":

To znaczy, że na GitHub są nowsze zmiany. Najpierw pobierz i zsynchronizuj:

```powershell
# Opcja 1: Pull z rebase (zalecane - zachowuje czystą historię)
git pull origin 04_12_v1 --rebase
git push origin 04_12_v1

# Opcja 2: Pull z merge (tworzy merge commit)
git pull origin 04_12_v1
git push origin 04_12_v1
```

## Uwagi

- Jeśli pojawi się błąd dotyczący autoryzacji, może być potrzebne:
  - Ustawienie SSH key
  - Użycie Personal Access Token (PAT) zamiast hasła
  - Sprawdzenie remote URL: `git remote -v`

