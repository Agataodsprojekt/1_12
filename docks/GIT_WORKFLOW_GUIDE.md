# 🔀 Git Workflow Guide - Profesjonalne Zarządzanie Repozytorium

## 🔒 Konfiguracja Repozytorium - Prywatne Repo dla Zespołu

### Wybór Platformy i Typu Repo

**Rekomendacja: Prywatne Repozytorium** 🔐

Dla projektu zespołowego (5-6 osób) najlepsze jest **jedno prywatne repozytorium**, dostępne tylko dla członków projektu.

### Platformy z Darmowymi Prywatnymi Repo:

#### 1. **GitHub** ⭐ (Rekomendowane)
- ✅ Darmowe prywatne repo (nieograniczona liczba)
- ✅ Do 3 współpracowników w darmowym planie (wystarczy dla 5-6 osób)
- ✅ Prosty interfejs
- ✅ Dobre narzędzia do code review
- ✅ GitHub Actions (CI/CD) - 2000 minut/miesiąc darmowo

**Ograniczenia:**
- ⚠️ W darmowym planie: max 3 współpracowników (ale możesz użyć GitHub Teams - $4/user/miesiąc)
- ⚠️ Lepsze opcje w płatnych planach

#### 2. **GitLab** ⭐⭐ (Najlepsze dla zespołów)
- ✅ **Nieskończona liczba prywatnych repo**
- ✅ **Nieskończona liczba współpracowników** (darmowo!)
- ✅ Wbudowany CI/CD (2000 minut/miesiąc)
- ✅ Więcej funkcji out-of-the-box
- ✅ Self-hosted option (jeśli potrzebne)

**Zalety dla zespołów:**
- Idealne dla 5-6 osobowych zespołów
- Wszystko darmowo
- Lepsze narzędzia do zarządzania projektem

#### 3. **Bitbucket**
- ✅ Darmowe prywatne repo
- ✅ Do 5 użytkowników w darmowym planie
- ✅ Integracja z Jira (jeśli używasz)

### Rekomendacja: **GitLab** dla zespołów 5-6 osobowych

**Dlaczego GitLab?**
- ✅ Wszystko darmowo (nieskończeni współpracownicy)
- ✅ Więcej funkcji dla zespołów
- ✅ Lepsze zarządzanie projektem
- ✅ CI/CD wbudowany

**Alternatywa: GitHub** jeśli preferujesz prostszy interfejs

---

### Konfiguracja Prywatnego Repo

#### Krok 1: Utworzenie Repozytorium

**Na GitLab:**
1. Zaloguj się na [gitlab.com](https://gitlab.com)
2. Kliknij "New project" → "Create blank project"
3. Nazwa: `ifc-construction-calculator`
4. **Visibility: Private** 🔒
5. Initialize repository with README (opcjonalnie)

**Na GitHub:**
1. Zaloguj się na [github.com](https://github.com)
2. Kliknij "New repository"
3. Nazwa: `ifc-construction-calculator`
4. **Private** 🔒
5. Initialize with README (opcjonalnie)

#### Krok 2: Dodanie Członków Zespołu

**GitLab:**
```
Project → Settings → Members → Invite members
- Dodaj email każdego członka
- Rola: Developer (lub Maintainer dla leadera)
- Access expiration: (opcjonalnie)
```

**GitHub:**
```
Settings → Collaborators → Add people
- Dodaj username każdego członka
- Rola: Write (lub Admin dla leadera)
```

**Role i Permissions:**

| Rola | Może | Nie może |
|------|------|----------|
| **Guest** | Przeglądać kod | Edytować |
| **Reporter** | Przeglądać, zgłaszać issues | Edytować kod |
| **Developer** | Edytować kod, tworzyć PR | Merge do main, zarządzać repo |
| **Maintainer** | Wszystko oprócz usuwania repo | Usuwać repo |
| **Owner** | Wszystko | - |

**Rekomendacja:**
- **Leader (Ty):** Owner/Maintainer
- **Członkowie zespołu:** Developer (mogą edytować, tworzyć PR, ale merge wymaga approval)

#### Krok 3: Branch Protection Rules

**Ochrona `main` branch:**

**GitLab:**
```
Settings → Repository → Protected branches
- Branch: main
- Allowed to merge: Maintainers
- Allowed to push: No one (tylko przez MR)
```

**GitHub:**
```
Settings → Branches → Add rule
- Branch name pattern: main
- ✅ Require pull request reviews (min 1)
- ✅ Require status checks to pass
- ✅ Require branches to be up to date
- ✅ Do not allow force pushes
- ✅ Do not allow deletions
```

#### Krok 4: Initial Push

```bash
# W katalogu projektu
git init
git add .
git commit -m "feat: initial project setup with Clean Architecture"

# Dodaj remote
git remote add origin https://gitlab.com/your-username/ifc-construction-calculator.git
# lub
git remote add origin https://github.com/your-username/ifc-construction-calculator.git

# Push
git branch -M main
git push -u origin main
```

---

### Zarządzanie Dostępem

#### Kto ma dostęp?

**Członkowie projektu:**
- ✅ Wszyscy członkowie zespołu (5-6 osób)
- ✅ Rola: Developer (mogą edytować, tworzyć PR)

**Osoby zewnętrzne:**
- ❌ Brak dostępu (repo prywatne)
- ✅ Można dodać później (np. mentor, klient - jako Guest/Reporter)

#### Jak dodać nowego członka?

**GitLab:**
1. Project → Settings → Members
2. "Invite members"
3. Wpisz email lub username
4. Wybierz rolę: Developer
5. Wyślij zaproszenie

**GitHub:**
1. Settings → Collaborators
2. "Add people"
3. Wpisz username
4. Wybierz rolę: Write
5. Wyślij zaproszenie

#### Jak usunąć członka?

**GitLab/GitHub:**
- Settings → Members/Collaborators
- Kliknij "Remove" przy danym użytkowniku

---

### Bezpieczeństwo Prywatnego Repo

#### Best Practices:

1. **Nie commituj secrets:**
   - `.env` files (już w `.gitignore`)
   - API keys
   - Passwords
   - Certificates

2. **Używaj Environment Variables:**
   - W CI/CD
   - W lokalnym środowisku
   - W Docker (docker-compose.yml z env files)

3. **Code Review:**
   - Wszystkie zmiany przez PR
   - Minimum 1 approval przed merge

4. **Audit Log:**
   - GitLab/GitHub logują wszystkie działania
   - Możesz zobaczyć kto co zmienił

5. **Two-Factor Authentication (2FA):**
   - Wymagaj 2FA dla wszystkich członków
   - Settings → Security → Two-Factor Authentication

---

### Alternatywne Podejścia

#### Opcja 1: Jeden Monorepo (Rekomendowane) ⭐
```
ifc-construction-calculator/
├── api-gateway/
├── ifc-parser-service/
├── cost-calculator-service/
├── frontend/
└── ...
```

**Zalety:**
- ✅ Wszystko w jednym miejscu
- ✅ Łatwe współdzielenie kodu
- ✅ Jeden CI/CD pipeline
- ✅ Prostsze zarządzanie

**Wady:**
- ⚠️ Większy repo (ale Git to obsłuży)

#### Opcja 2: Multi-Repo (Dla większych projektów)
```
ifc-api-gateway/
ifc-parser-service/
ifc-cost-calculator/
ifc-frontend/
```

**Zalety:**
- ✅ Niezależne deploymenty
- ✅ Różne zespoły, różne repo

**Wady:**
- ⚠️ Trudniejsze zarządzanie
- ⚠️ Więcej konfiguracji
- ⚠️ Trudniejsze współdzielenie

**Rekomendacja:** Monorepo dla 5-6 osobowego zespołu

---

### Konfiguracja dla Zespołu

#### Checklist przed rozpoczęciem:

- [ ] Utworzone prywatne repo (GitLab/GitHub)
- [ ] Dodani wszyscy członkowie zespołu
- [ ] Ustawione role (Developer dla członków, Maintainer dla leadera)
- [ ] Skonfigurowane Branch Protection Rules dla `main`
- [ ] Initial commit i push wykonany
- [ ] Wszyscy członkowie mają dostęp
- [ ] 2FA włączone (opcjonalnie, ale rekomendowane)
- [ ] README.md z instrukcjami
- [ ] GIT_WORKFLOW_GUIDE.md dostępny dla wszystkich

#### Pierwsze kroki dla członków zespołu:

```bash
# 1. Sklonuj repo
git clone https://gitlab.com/your-username/ifc-construction-calculator.git
# lub
git clone https://github.com/your-username/ifc-construction-calculator.git

# 2. Przejdź do katalogu
cd ifc-construction-calculator

# 3. Przeczytaj dokumentację
cat README.md
cat GIT_WORKFLOW_GUIDE.md

# 4. Skonfiguruj lokalne środowisko
docker-compose up --build

# 5. Utwórz testowy branch
git checkout -b feature/test-branch
# ... zrób zmiany ...
git add .
git commit -m "feat: test commit"
git push origin feature/test-branch
# Utwórz PR na GitLab/GitHub
```

---

## 📋 Przegląd Strategii Git Workflow

### 1. **GitHub Flow** (Rekomendowane dla małych zespołów) ⭐

**Zalety:**
- ✅ Prosty i łatwy do zrozumienia
- ✅ Szybki feedback (ciągły deployment)
- ✅ Idealny dla małych zespołów (5-6 osób)
- ✅ Dobry dla projektów z częstymi release'ami

**Struktura:**
```
main (production-ready)
  └── feature/xxx (branche feature)
```

**Workflow:**
1. `main` - zawsze gotowy do produkcji
2. Tworzenie brancha `feature/nazwa-funkcji` z `main`
3. Commity na branchu feature
4. Pull Request do `main`
5. Code Review
6. Merge → automatyczny deployment

---

### 2. **Git Flow** (Dla większych projektów z wersjonowaniem)

**Zalety:**
- ✅ Formalne wersjonowanie (v1.0.0, v1.1.0)
- ✅ Oddzielne branche dla development i release
- ✅ Hotfixes bez wpływu na development

**Struktura:**
```
main (production)
  └── develop (development)
      ├── feature/xxx
      ├── release/v1.0.0
      └── hotfix/xxx
```

**Workflow:**
- `main` - production code
- `develop` - integration branch
- `feature/*` - nowe funkcje
- `release/*` - przygotowanie do release
- `hotfix/*` - szybkie poprawki w produkcji

---

### 3. **GitLab Flow** (Z environment branches)

**Zalety:**
- ✅ Branche środowiskowe (staging, production)
- ✅ Dobry dla CI/CD pipelines
- ✅ Upstream first principle

**Struktura:**
```
main → staging → production
  └── feature/xxx
```

---

## 🎯 Rekomendacja dla Naszego Projektu

### **GitHub Flow + Semantic Versioning** ⭐⭐⭐

**Dlaczego?**
- Mały zespół (5-6 osób)
- Częste iteracje i feedback
- Łatwe onboardowanie nowych członków
- Współpraca z Clean Architecture (każdy pracuje na swoim serwisie)

**Struktura Branchy:**

```
main                    # Production-ready code
  ├── feature/ifc-parser-improvements
  ├── feature/cost-calculation-rules
  ├── feature/frontend-3d-optimization
  ├── feature/database-models
  ├── bugfix/placement-matrix-fix
  └── docs/architecture-update
```

---

## 📝 Branch Naming Convention

### Format:
```
{type}/{short-description}
```

### Typy:
- `feature/` - Nowe funkcje
- `bugfix/` - Naprawa błędów
- `hotfix/` - Krytyczne poprawki (z main)
- `refactor/` - Refaktoring bez zmiany funkcjonalności
- `docs/` - Tylko dokumentacja
- `test/` - Tylko testy
- `chore/` - Maintenance (dependencies, config)

### Przykłady:
```
feature/automatic-cost-calculation
feature/frontend-element-visibility-controls
bugfix/ifc-placement-matrix-extraction
refactor/cost-provider-architecture
docs/api-endpoints-documentation
test/integration-tests-ifc-parser
chore/update-docker-compose
```

---

## 💬 Commit Message Convention

### Format (Conventional Commits):
```
{type}({scope}): {subject}

{body}

{footer}
```

### Typy:
- `feat:` - Nowa funkcja
- `fix:` - Naprawa błędu
- `docs:` - Zmiany w dokumentacji
- `style:` - Formatowanie (nie zmienia logiki)
- `refactor:` - Refaktoring
- `test:` - Dodanie/zmiana testów
- `chore:` - Maintenance tasks
- `perf:` - Optymalizacja wydajności

### Scope (opcjonalny):
- `ifc-parser` - IFC Parser Service
- `cost-calculator` - Cost Calculator Service
- `api-gateway` - API Gateway
- `frontend` - Frontend React
- `docker` - Docker configuration
- `docs` - Dokumentacja

### Przykłady:

```bash
feat(ifc-parser): add automatic cost calculation on parse

When calculate_costs=true, API Gateway automatically calls
Cost Calculator Service after IFC parsing.

Closes #42

---

fix(frontend): correct placement matrix translation extraction

Fixed indices for translation in column-major matrix format.
Translation now correctly extracted from indices 12, 13, 14.

Fixes #38

---

docs(api-gateway): update endpoint examples with direct routes

Updated FLOW_DOCUMENTATION.md and API_EXAMPLES.md to use
direct endpoints instead of generic routing.

---

refactor(cost-calculator): implement provider pattern for cost calculation

- Created ICostProvider interface
- Implemented MaterialCostProvider and ConnectionCostProvider
- Added JsonRuleLoader for business rules

BREAKING CHANGE: CostService now requires IRuleLoader dependency
```

---

## 🔄 Pull Request Workflow

### 1. **Tworzenie PR**

**Template:**
```markdown
## Opis
Krótki opis zmian

## Typ zmiany
- [ ] Feature
- [ ] Bugfix
- [ ] Refactor
- [ ] Docs
- [ ] Test

## Zmiany
- [ ] Zmiana 1
- [ ] Zmiana 2

## Testy
Jak przetestowałeś zmiany?

## Checklist
- [ ] Kod działa lokalnie
- [ ] Testy przechodzą
- [ ] Dokumentacja zaktualizowana
- [ ] Brak konfliktów z main
- [ ] Code review wykonane
```

### 2. **Code Review Process**

**Zasady:**
- Minimum 1 approval przed merge
- Wszystkie komentarze muszą być rozwiązane
- CI/CD musi przejść (jeśli skonfigurowane)

**Review Checklist:**
- [ ] Kod zgodny z Clean Architecture
- [ ] Brak duplikacji kodu
- [ ] Error handling
- [ ] Dokumentacja/docstrings
- [ ] Testy (jeśli dotyczy)

### 3. **Merge Strategy**

**Rekomendacja: Squash and Merge**
- Czysta historia w `main`
- Jeden commit = jeden PR
- Łatwiejsze rollbacki

**Alternatywa: Merge Commit**
- Zachowuje pełną historię branchy
- Więcej commitów w historii

---

## 🏷️ Tagging i Releases

### Semantic Versioning (SemVer)

**Format:** `v{MAJOR}.{MINOR}.{PATCH}`

- **MAJOR** - Breaking changes
- **MINOR** - Nowe funkcje (backward compatible)
- **PATCH** - Bugfixes

### Przykłady:
```bash
v0.1.0  # Initial release
v0.2.0  # Added cost calculation
v0.2.1  # Fixed placement matrix bug
v1.0.0  # First stable release
v1.1.0  # Added calculation engine
```

### Tworzenie Release:

```bash
# 1. Update version w kodzie (jeśli potrzebne)
# 2. Merge do main
# 3. Tag
git tag -a v0.2.0 -m "Release v0.2.0: Cost calculation feature"
git push origin v0.2.0

# 4. GitHub/GitLab automatycznie utworzy release notes
```

---

## 📁 .gitignore Strategy

### Pliki do ignorowania:

```gitignore
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
env/
venv/
ENV/
.venv
pip-log.txt
pip-delete-this-directory.txt
.pytest_cache/
.coverage
htmlcov/
*.egg-info/
dist/
build/

# Node.js / React
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnp/
.pnp.js
.DS_Store
*.log

# IDEs
.vscode/
.idea/
*.swp
*.swo
*~

# Docker
.dockerignore

# Environment variables
.env
.env.local
.env.*.local

# Uploads / Temporary files
uploads/
*.ifc  # IFC files (duże, nie powinny być w repo)
temp/
tmp/

# Database
*.db
*.sqlite
*.sqlite3

# Logs
logs/
*.log

# OS
.DS_Store
Thumbs.db

# Project specific
common-package/*.egg-info/
common-package/dist/
common-package/build/
```

---

## 🔧 Git Hooks (Opcjonalne, ale przydatne)

### Pre-commit Hook (przykład):

```bash
#!/bin/sh
# .git/hooks/pre-commit

# Formatowanie kodu (black, prettier)
black --check .
prettier --check "frontend/src/**/*.{js,jsx}"

# Linting
flake8 .
eslint frontend/src/

# Testy (jeśli szybkie)
pytest tests/unit/ -q
```

**Narzędzia:**
- `pre-commit` (Python) - framework dla git hooks
- `husky` (Node.js) - dla frontendu

---

## 👥 Collaboration Best Practices

### 1. **Podział Pracy**

Każdy członek zespołu pracuje na swoim serwisie:
- Developer 1: `ifc-parser-service`
- Developer 2: `cost-calculator-service`
- Developer 3: `api-gateway`
- Developer 4: `frontend`
- Developer 5: `database-manager-service`

**Zasada:** Mniej konfliktów = każdy w swoim katalogu

### 2. **Communication**

- **Issues** - dla bugów i feature requests
- **Pull Requests** - dla code review
- **Discussions** - dla pytań i dyskusji
- **Projects** - dla zarządzania zadaniami (Kanban)

### 3. **Branch Protection Rules**

**Dla `main` branch:**
- ✅ Require pull request reviews (min 1)
- ✅ Require status checks to pass
- ✅ Require branches to be up to date
- ✅ Do not allow force pushes
- ✅ Do not allow deletions

---

## 🚀 CI/CD Integration

### GitHub Actions / GitLab CI

**Przykładowy workflow:**

```yaml
# .github/workflows/test.yml
name: Test and Build

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
      - name: Run tests
        run: pytest
      - name: Lint
        run: flake8 .

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Build Docker images
        run: docker-compose build
      - name: Run integration tests
        run: docker-compose up -d && pytest tests/integration/
```

---

## 📊 Issue Management

### Issue Templates

**Bug Report:**
```markdown
## Opis błędu
...

## Kroki do reprodukcji
1. ...
2. ...

## Oczekiwane zachowanie
...

## Środowisko
- OS: ...
- Python: ...
- Docker: ...
```

**Feature Request:**
```markdown
## Opis funkcji
...

## Uzasadnienie
...

## Proponowane rozwiązanie
...

## Alternatywy
...
```

### Labels:

- `bug` - Błąd
- `feature` - Nowa funkcja
- `enhancement` - Ulepszenie
- `documentation` - Dokumentacja
- `question` - Pytanie
- `help wanted` - Potrzebna pomoc
- `good first issue` - Dobre dla początkujących
- `priority: high/medium/low` - Priorytet
- `service: ifc-parser/cost-calculator/etc` - Serwis

---

## 🎯 Rekomendowany Workflow dla Zespołu

### Dla Nowej Funkcji:

```bash
# 1. Zaktualizuj main
git checkout main
git pull origin main

# 2. Utwórz branch feature
git checkout -b feature/automatic-cost-calculation

# 3. Pracuj na branchu
# ... kodowanie ...
git add .
git commit -m "feat(cost-calculator): add automatic cost calculation"

# 4. Push branch
git push origin feature/automatic-cost-calculation

# 5. Utwórz Pull Request na GitHub/GitLab
# 6. Code Review
# 7. Merge do main
```

### Dla Hotfix:

```bash
# 1. Z main
git checkout main
git pull origin main

# 2. Utwórz hotfix branch
git checkout -b hotfix/critical-bug-fix

# 3. Napraw błąd
# ... kodowanie ...
git commit -m "fix(api-gateway): fix critical routing bug"

# 4. Merge do main i develop (jeśli używasz Git Flow)
git checkout main
git merge hotfix/critical-bug-fix
git tag v0.2.1
git push origin main --tags
```

---

## 📚 Przydatne Komendy Git

```bash
# Sprawdź status
git status

# Zobacz różnice
git diff

# Zobacz historię
git log --oneline --graph --all

# Stash (tymczasowe zapisanie zmian)
git stash
git stash pop

# Cherry-pick (przenieś commit z innego brancha)
git cherry-pick <commit-hash>

# Rebase (uprość historię)
git rebase main

# Squash commits (przed PR)
git rebase -i HEAD~3
```

---

## 🎓 Dla Nowych Członków Zespołu

### Onboarding Checklist:

1. ✅ Sklonuj repozytorium
2. ✅ Przeczytaj `README.md` i `TEAM_ONBOARDING.md`
3. ✅ Skonfiguruj środowisko lokalne (Docker)
4. ✅ Przeczytaj `ARCHITECTURE.md`
5. ✅ Zapoznaj się z `GIT_WORKFLOW_GUIDE.md` (ten dokument)
6. ✅ Utwórz testowy branch i PR
7. ✅ Zapoznaj się z code review process

---

## 🔍 Code Review Guidelines

### Dla Reviewerów:

**Sprawdź:**
- [ ] Czy kod działa zgodnie z opisem PR?
- [ ] Czy jest zgodny z Clean Architecture?
- [ ] Czy nie ma duplikacji?
- [ ] Czy error handling jest odpowiedni?
- [ ] Czy są testy (jeśli dotyczy)?
- [ ] Czy dokumentacja jest zaktualizowana?

**Komentarze:**
- Bądź konstruktywny
- Sugeruj rozwiązania, nie tylko problemy
- Doceniaj dobre rozwiązania
- Pytaj, nie krytykuj

### Dla Autorów PR:

- Odpowiadaj na wszystkie komentarze
- Nie bierz komentarzy osobiście
- Pytaj, jeśli coś nie jest jasne
- Dziękuj za review

---

## 📦 Release Process

### Przygotowanie Release:

1. **Update dokumentacji**
   - `CHANGELOG.md`
   - `README.md` (jeśli potrzebne)
   - Version numbers

2. **Merge do main**
   - Wszystkie PR merged
   - Wszystkie testy przechodzą

3. **Tag release**
   ```bash
   git tag -a v0.2.0 -m "Release v0.2.0"
   git push origin v0.2.0
   ```

4. **Deployment**
   - Automatyczny (jeśli CI/CD)
   - Lub manual (docker-compose)

5. **Release Notes**
   - GitHub/GitLab automatycznie generuje z commitów
   - Można edytować ręcznie

---

## 🎯 Podsumowanie - Quick Reference

### Branch Strategy:
- `main` - production-ready
- `feature/*` - nowe funkcje
- `bugfix/*` - naprawy błędów
- `hotfix/*` - krytyczne poprawki

### Commit Format:
```
{type}({scope}): {subject}
```

### PR Process:
1. Create branch from `main`
2. Work and commit
3. Push and create PR
4. Code review
5. Merge to `main`

### Release:
- Semantic versioning (v0.1.0)
- Tag releases
- Update CHANGELOG

---

**Ostatnia aktualizacja:** 2024

