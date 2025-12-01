# 🔒 Konfiguracja Prywatnego Repozytorium - Quick Start

## 🎯 Cel

Utworzenie **jednego prywatnego repozytorium** dostępnego tylko dla członków projektu (5-6 osób).

---

## 🚀 Szybki Start

### Krok 1: Wybór Platformy

**Rekomendacja: GitLab** (darmowe, nieskończeni współpracownicy)

**Alternatywa: GitHub** (prostszy interfejs, ale limit współpracowników w darmowym planie)

### Krok 2: Utworzenie Repo

#### GitLab:
1. Zaloguj się na [gitlab.com](https://gitlab.com)
2. Kliknij **"New project"** → **"Create blank project"**
3. **Nazwa:** `ifc-construction-calculator`
4. **Visibility:** 🔒 **Private**
5. ✅ Initialize repository with README (opcjonalnie)
6. Kliknij **"Create project"**

#### GitHub:
1. Zaloguj się na [github.com](https://github.com)
2. Kliknij **"New repository"** (ikonka +)
3. **Repository name:** `ifc-construction-calculator`
4. **Visibility:** 🔒 **Private**
5. ✅ Add a README file (opcjonalnie)
6. Kliknij **"Create repository"**

---

## 👥 Dodanie Członków Zespołu

### GitLab:

1. W projekcie: **Settings** → **Members**
2. Kliknij **"Invite members"**
3. Wpisz **email** lub **username** każdego członka
4. **Role:** `Developer` (dla członków) lub `Maintainer` (dla leadera)
5. Kliknij **"Invite"**

**Role:**
- **Developer** - może edytować kod, tworzyć PR, ale merge wymaga approval
- **Maintainer** - może wszystko oprócz usuwania repo
- **Owner** - pełny dostęp

### GitHub:

1. W projekcie: **Settings** → **Collaborators**
2. Kliknij **"Add people"**
3. Wpisz **username** każdego członka
4. **Role:** `Write` (dla członków) lub `Admin` (dla leadera)
5. Kliknij **"Add [username] to this repository"**

---

## 🔐 Ochrona Branch `main`

### GitLab:

1. **Settings** → **Repository** → **Protected branches**
2. Kliknij **"Expand"** przy "main"
3. **Allowed to merge:** `Maintainers`
4. **Allowed to push:** `No one` (tylko przez Merge Request)
5. Zapisz

### GitHub:

1. **Settings** → **Branches**
2. Kliknij **"Add rule"**
3. **Branch name pattern:** `main`
4. Zaznacz:
   - ✅ Require pull request reviews before merging (min 1)
   - ✅ Require status checks to pass
   - ✅ Require branches to be up to date
   - ✅ Do not allow force pushes
   - ✅ Do not allow deletions
5. Kliknij **"Create"**

---

## 📤 Initial Push

```bash
# W katalogu projektu
cd ifc-construction-calculator

# Inicjalizacja (jeśli jeszcze nie)
git init

# Dodaj wszystkie pliki
git add .

# Pierwszy commit
git commit -m "feat: initial project setup with Clean Architecture"

# Dodaj remote (GitLab)
git remote add origin https://gitlab.com/your-username/ifc-construction-calculator.git

# LUB (GitHub)
git remote add origin https://github.com/your-username/ifc-construction-calculator.git

# Ustaw main branch
git branch -M main

# Push
git push -u origin main
```

---

## ✅ Checklist Konfiguracji

- [ ] Repozytorium utworzone (Private)
- [ ] Wszyscy członkowie zespołu dodani
- [ ] Role ustawione (Developer dla członków)
- [ ] Branch Protection Rules skonfigurowane
- [ ] Initial commit i push wykonany
- [ ] Wszyscy członkowie mogą klonować repo
- [ ] README.md z instrukcjami dostępny
- [ ] GIT_WORKFLOW_GUIDE.md dostępny

---

## 🔍 Weryfikacja

### Sprawdź czy wszystko działa:

```bash
# Członek zespołu powinien móc:
git clone https://gitlab.com/your-username/ifc-construction-calculator.git
# lub
git clone https://github.com/your-username/ifc-construction-calculator.git

cd ifc-construction-calculator
git checkout -b feature/test
# ... zmiany ...
git add .
git commit -m "test: verify access"
git push origin feature/test
```

---

## 🆘 Troubleshooting

### Problem: "Permission denied"

**Rozwiązanie:**
- Sprawdź czy jesteś dodany jako Collaborator/Member
- Sprawdź czy repo jest Private (nie Public)
- Sprawdź czy masz odpowiednią rolę (Developer/Write)

### Problem: "Cannot push to main"

**Rozwiązanie:**
- To jest poprawne! `main` jest chroniony
- Utwórz branch: `git checkout -b feature/your-feature`
- Push branch: `git push origin feature/your-feature`
- Utwórz Pull/Merge Request

### Problem: "Repository not found"

**Rozwiązanie:**
- Sprawdź czy repo jest Private
- Sprawdź czy jesteś dodany jako Member
- Sprawdź URL (czy jest poprawny)

---

## 📚 Dalsze Kroki

1. Przeczytaj [GIT_WORKFLOW_GUIDE.md](GIT_WORKFLOW_GUIDE.md)
2. Zapoznaj się z [TEAM_ONBOARDING.md](TEAM_ONBOARDING.md)
3. Przetestuj workflow (utwórz testowy PR)

---

**Gotowe!** 🎉 Repozytorium jest skonfigurowane i gotowe do pracy zespołowej.

