# 📋 Analiza Wymagań Projektu - Check Structures (CS)

**Data analizy:** 2024  
**Źródło:** Opis projektu od pomysłodawcy

---

## 🎯 Przegląd Projektu

### Nazwa: **Check Structures (CS)**

**Cel:** Nowoczesny system do weryfikacji konstrukcji budowlanych

**Weryfikacja dotyczy:**
- ✅ **Jakości** - cena konstrukcji, łatwość montażu, powtarzalność
- ✅ **Bezpieczeństwa** - spełnienie wymagań EUROKOD
- ✅ **Zgodności** - zgodność geometrii z założeniami

---

## 📥 Format Wejściowy i Wyjściowy

### Wejściowy:
- **IFC w każdej wersji** (IFC2x3, IFC4, IFC4x3, etc.)

### Wyjściowy:
- **IFC w uzgodnionej wersji** (z dodatkowymi parametrami klasyfikującymi)

**⚠️ Wymagana zmiana:** Obecnie system tylko **czyta** IFC, ale nie **eksportuje** z powrotem do IFC z dodatkowymi danymi!

---

## 🔄 Przepływ Danych (Zgodnie z Opisem)

```
1. Plik IFC (wejściowy)
   ↓
2. Przetwarzanie → Dane (metadane + geometria) → Baza danych
   ↓
3. Analiza i klasyfikacja
   ↓
4. Efekt:
   - Dodatkowe parametry klasyfikujące:
     * Szczegółowa cena ✅ (mamy)
     * Nośność statyczna elementów ⚠️ (częściowo - Calculation Engine)
     * Rodzaje połączeń ✅ (mamy w cost-calculator)
   - Dodatkowe obiekty geometryczne:
     * Model prętowy dla MES (format SAF) ❌ (brakuje)
     * Powierzchnie reprezentujące przegrody ❌ (brakuje)
     * Inne obiekty geometryczne ❌ (brakuje)
   ↓
5. Plik IFC (wyjściowy) z dodatkowymi danymi ❌ (brakuje)
```

---

## 🎨 FRONTEND - Wymagania

### 1. **Środowisko:**
- ✅ Aplikacja web (mamy React)
- ✅ Lokalnie w przeglądarce (mamy)
- ✅ Three.js (mamy)

### 2. **Biblioteki Graficzne:**
- ⚠️ **THATOPENCOMPANY [TOC] oparte na fragments** ❌ (obecnie używamy tylko Three.js)
- ✅ Biblioteki popularne dla .js (React, Axios - mamy)

### 3. **Funkcjonalności:**
- ✅ Prezentacja graficzna wyników (mamy podstawową)
- ⚠️ **Ocena konstrukcji w sposób mierzalny** (wymaga implementacji)
- ⚠️ **Graficzna prezentacja oceny na modelu 3D** (wymaga implementacji)

**⚠️ Kluczowa zmiana:** Wymagana integracja z **THATOPENCOMPANY (TOC) fragments** zamiast/supplement do obecnego Three.js!

---

## 🔧 BACKEND - Analiza Obecnej Architektury

### ✅ Co mamy (zgodne z wymaganiami):

1. **IFC Parser Service** ✅
   - Parsuje IFC (ifcopenshell)
   - Ekstrahuje metadane i geometrię
   - Przenosi do struktury danych (gotowe do bazy)

2. **Cost Calculator Service** ✅
   - Szczegółowa cena konstrukcji ✅
   - Koszty połączeń ✅
   - Zgodne z wymaganiami "jakości"

3. **Calculation Engine Service** ⚠️
   - Obliczenia statyczne (częściowo)
   - **Wymaga rozszerzenia:** Weryfikacja EUROKOD, nośność statyczna

4. **Database Manager Service** ✅
   - Przechowywanie danych w bazie
   - Zgodne z wymaganiami

5. **API Gateway** ✅
   - Orchestracja serwisów
   - Zgodne z wymaganiami

### ❌ Czego brakuje:

1. **IFC Export Service** ❌
   - Eksport do IFC z dodatkowymi parametrami
   - Format wyjściowy IFC

2. **MES Export Service** ❌
   - Generowanie modelu prętowego w formacie SAF
   - Dla analizy MES

3. **Geometry Generation Service** ❌
   - Powierzchnie reprezentujące przegrody
   - Inne obiekty geometryczne

4. **Verification/Classification Service** ❌
   - Klasyfikacja elementów
   - Ocena konstrukcji w sposób mierzalny
   - Porównanie z wzorcem

5. **EUROKOD Verification** ❌
   - Weryfikacja zgodności z normami EUROKOD
   - Część Calculation Engine, ale wymaga rozszerzenia

---

## 📊 Mapowanie Wymagań na Obecną Architekturę

| Wymaganie | Status | Serwis | Uwagi |
|-----------|--------|--------|-------|
| Parsowanie IFC (każda wersja) | ✅ | IFC Parser | ifcopenshell obsługuje różne wersje |
| Przenoszenie do bazy danych | ✅ | Database Manager | Gotowe |
| Szczegółowa cena | ✅ | Cost Calculator | Implementowane |
| Nośność statyczna | ⚠️ | Calculation Engine | Wymaga rozszerzenia |
| Rodzaje połączeń | ✅ | Cost Calculator | Mamy connection costs |
| Model prętowy (SAF) | ❌ | **NOWY** | MES Export Service |
| Powierzchnie przegród | ❌ | **NOWY** | Geometry Generation |
| Eksport do IFC | ❌ | **NOWY** | IFC Export Service |
| Weryfikacja EUROKOD | ⚠️ | Calculation Engine | Wymaga rozszerzenia |
| Ocena mierzalna | ❌ | **NOWY** | Verification Service |
| TOC fragments frontend | ❌ | Frontend | Wymaga integracji |
| Graficzna prezentacja oceny | ⚠️ | Frontend | Częściowo, wymaga TOC |

---

## 🚀 Rekomendowane Zmiany i Rozszerzenia

### 1. **Frontend - Integracja TOC fragments** 🔴 WYSOKI PRIORYTET

**Obecnie:**
- Używamy tylko Three.js
- Podstawowa wizualizacja 3D

**Wymagane:**
- Integracja **THATOPENCOMPANY (TOC) fragments**
- Lepsza obsługa IFC
- Zaawansowana wizualizacja z oceną

**Działania:**
1. Zainstalować biblioteki TOC
2. Zintegrować z obecnym Viewer3D
3. Dodać wizualizację oceny na modelu 3D

### 2. **Backend - Nowe Serwisy** 🔴 WYSOKI PRIORYTET

#### A. **IFC Export Service** (port 5006)
- Eksport danych z powrotem do IFC
- Dodawanie nowych parametrów (cena, ocena, klasyfikacja)
- Konwersja do uzgodnionej wersji IFC

#### B. **MES Export Service** (port 5007)
- Generowanie modelu prętowego z IFC
- Eksport do formatu SAF
- Dla analizy MES

#### C. **Geometry Generation Service** (port 5008)
- Generowanie powierzchni reprezentujących przegrody
- Inne obiekty geometryczne
- Może być częścią 3D Data Service lub osobny

#### D. **Verification/Classification Service** (port 5009)
- Klasyfikacja elementów
- Ocena konstrukcji w sposób mierzalny
- Porównanie z wzorcem
- Generowanie raportów weryfikacji

### 3. **Rozszerzenie Istniejących Serwisów** 🟡 ŚREDNI PRIORYTET

#### A. **Calculation Engine Service**
- Rozszerzenie o weryfikację EUROKOD
- Nośność statyczna elementów
- Weryfikacja bezpieczeństwa

#### B. **IFC Parser Service**
- Lepsza obsługa różnych wersji IFC
- Walidacja zgodności z założeniami

#### C. **Frontend**
- Graficzna prezentacja oceny na modelu 3D
- Wizualizacja zgodności z normami
- Interaktywne raporty

---

## 📐 Proponowana Rozszerzona Architektura

```
┌─────────────────────────────────────────────────┐
│              FRONTEND (React + TOC)             │
│  - Three.js + TOC fragments                     │
│  - Wizualizacja 3D z oceną                      │
│  - Interaktywne raporty                         │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│            API GATEWAY (Port 8000)               │
└──────────────────┬──────────────────────────────┘
                   │
    ┌──────────────┼──────────────┬──────────────┐
    │              │              │              │
┌───▼───┐    ┌────▼────┐    ┌────▼────┐    ┌───▼────┐
│ IFC   │    │ Cost    │    │ Calc    │    │ DB     │
│ Parser│    │ Calc    │    │ Engine  │    │ Manager│
│ 5001  │    │ 5003    │    │ 5002    │    │ 5005   │
└───┬───┘    └─────────┘    └────┬────┘    └────────┘
    │                             │
    │                      ┌──────▼──────┐
    │                      │ EUROKOD     │
    │                      │ Verification│
    │                      └─────────────┘
    │
┌───▼──────────┐    ┌──────────▼──────────┐
│ IFC Export   │    │ MES Export          │
│ Service      │    │ Service              │
│ 5006         │    │ 5007                 │
└──────────────┘    └─────────────────────┘
    │
┌───▼──────────────────┐    ┌──────────▼──────────┐
│ Geometry Generation  │    │ Verification        │
│ Service              │    │ Service             │
│ 5008                 │    │ 5009                │
└──────────────────────┘    └─────────────────────┘
```

---

## 🎯 Priorytety Implementacji

### Faza 1: Podstawy (MVP) 🔴
1. ✅ IFC Parser (mamy)
2. ✅ Cost Calculator (mamy)
3. ⚠️ Frontend z TOC fragments (wymaga integracji)
4. ❌ IFC Export Service (krytyczne)

### Faza 2: Weryfikacja 🟡
1. ⚠️ Calculation Engine - EUROKOD verification
2. ❌ Verification Service - ocena mierzalna
3. ⚠️ Frontend - graficzna prezentacja oceny

### Faza 3: Zaawansowane 🟢
1. ❌ MES Export Service (SAF format)
2. ❌ Geometry Generation Service
3. ❌ Zaawansowane raporty

---

## 🔍 THATOPENCOMPANY (TOC) - Do Zbadania

**Wymagane informacje:**
- Dokumentacja TOC fragments
- Jak integrować z React/Three.js
- Obsługa IFC w TOC
- Wizualizacja oceny na modelu 3D

**Działania:**
1. Sprawdzić dokumentację TOC
2. Przykłady integracji
3. Plan migracji/rozszerzenia obecnego Viewer3D

---

## 📝 Checklist Zgodności

### ✅ Zgodne z wymaganiami:
- [x] Parsowanie IFC
- [x] Przenoszenie do bazy danych
- [x] Szczegółowa cena
- [x] Rodzaje połączeń
- [x] Aplikacja web w przeglądarce
- [x] Three.js

### ⚠️ Wymaga rozszerzenia:
- [ ] Nośność statyczna (Calculation Engine)
- [ ] Weryfikacja EUROKOD (Calculation Engine)
- [ ] Graficzna prezentacja oceny (Frontend)

### ❌ Brakuje:
- [ ] IFC Export Service
- [ ] MES Export Service (SAF)
- [ ] Geometry Generation Service
- [ ] Verification/Classification Service
- [ ] TOC fragments w Frontend
- [ ] Ocena mierzalna z porównaniem do wzorca

---

## 🎓 Wnioski

1. **Obecna architektura jest dobrym fundamentem** ✅
   - Mamy podstawowe serwisy
   - Clean Architecture pozwala na łatwe rozszerzenie

2. **Wymagane kluczowe rozszerzenia:**
   - Frontend: TOC fragments
   - Backend: IFC Export, MES Export, Verification Service

3. **Priorytet:**
   - Najpierw IFC Export (format wyjściowy)
   - Potem TOC fragments (lepsza wizualizacja)
   - Na końcu zaawansowane (MES, Geometry Generation)

4. **Zgodność z wymaganiami:**
   - ~60% zgodności (mamy podstawy)
   - ~40% wymaga implementacji/rozszerzenia

---

**Następne kroki:**
1. Zbadać THATOPENCOMPANY (TOC) fragments
2. Zaplanować integrację TOC w Frontend
3. Zaprojektować IFC Export Service
4. Rozszerzyć Calculation Engine o EUROKOD

---

**Ostatnia aktualizacja:** 2024

