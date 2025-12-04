# Architektura Projektu IFC Construction Calculator

## 1. Ogólny Przegląd

Projekt **IFC Construction Calculator** jest aplikacją do analizy i wizualizacji konstrukcji budowlanych z plików IFC (Industry Foundation Classes). Aplikacja została zaprojektowana jako system mikroserwisów oparty o **Clean Architecture**, stworzony z myślą o pracy zespołowej i łatwej rozbudowie.

## 2. Dlaczego Clean Architecture?

### 2.1. Podział Odpowiedzialności

**Clean Architecture** zapewnia wyraźny podział warstw, gdzie każda warstwa ma jedną, jasno określoną odpowiedzialność:

- **Domain Layer**: Logika biznesowa, niezależna od technologii
- **Application Layer**: Orkiestracja i przypadki użycia
- **Infrastructure Layer**: Implementacje techniczne (API, bazy danych, parsery)
- **Presentation Layer**: Interfejs użytkownika i kontrolery API

### 2.2. Zalety dla Zespołu

1. **Równoległa praca**: Różne osoby mogą pracować nad różnymi warstwami bez konfliktów
2. **Łatwe testowanie**: Logika biznesowa jest odizolowana od szczegółów implementacji
3. **Wymiana komponentów**: Można zmienić bazę danych lub framework bez wpływu na logikę biznesową
4. **Czytelność**: Struktura jest przewidywalna i łatwa do zrozumienia

## 3. Dlaczego Mikroserwisy?

### 3.1. Modularność i Niezależność

Każdy mikroserwis jest niezależnym modułem odpowiedzialnym za konkretną domenę:

- **IFC Parser Service**: Parsowanie plików IFC
- **Calculation Engine Service**: Obliczenia konstrukcyjne
- **Cost Calculator Service**: Wyliczanie kosztów
- **3D Data Service**: Przygotowanie danych do wizualizacji
- **Database Manager Service**: Zarządzanie danymi
- **API Gateway**: Punkt wejścia i routing

### 3.2. Skalowalność

- Każdy serwis może być skalowany niezależnie (np. więcej instancji parsera przy dużych plikach)
- Różne serwisy mogą używać różnych technologii najlepiej pasujących do zadania

### 3.3. Elastyczność Technologiczna

- **Python backend**: Łatwy do nauki, bogate biblioteki (ifcopenshell, numpy)
- **React frontend**: Nowoczesny, interaktywny UI z Three.js do wizualizacji 3D
- Możliwość dodania serwisu .NET w przyszłości (np. dla istniejącego kodu IfcGenericMapper)

### 3.4. Praca Zespołowa

Każdy członek zespołu może pracować nad innym serwisem:
- Osoba A: Infrastruktura i baza danych (Database Manager)
- Osoba B: Logika obliczeniowa (Calculation Engine)
- Osoba C: Frontend i wizualizacja (React + Three.js)
- Osoba D: Parsowanie IFC (IFC Parser Service)
- Osoba E: API Gateway i orkiestracja

## 4. Struktura Katalogów i Podział Odpowiedzialności

```
ifc-construction-calculator/
├── api-gateway/           # Punkt wejścia, routing, agregacja odpowiedzi
├── ifc-parser-service/    # Parsowanie plików IFC do formatu domenowego
├── calculation-engine-service/  # Obliczenia wytrzymałościowe, statyka
├── cost-calculator-service/     # Wyliczanie kosztów materiałów i robocizny
├── 3d-data-service/       # Przygotowanie danych geometrycznych dla frontendu
├── database-manager-service/    # CRUD operacje, migracje, modele domenowe
├── frontend/              # React aplikacja z Three.js
└── common-package/        # Współdzielone utilities (Result pattern, BaseSettings)
```

### 4.1. Struktura Pojedynczego Mikroserwisu

Każdy serwis ma identyczną strukturę Clean Architecture:

```
service-name/
├── domain/
│   ├── entities/         # Encje domenowe (IfcElement, Project, etc.)
│   ├── interfaces/      # Interfejsy dla repository i services (abstrakcje)
│   └── utils/           # Narzędzia domenowe (Result pattern)
├── application/
│   └── container.py     # Dependency Injection configuration
├── infrastructure/
│   ├── repositories/    # Implementacje repository (np. PostgreSQL)
│   └── services/        # Implementacje serwisów (np. IfcParserService)
└── presentation/
    └── api/
        └── routers/     # FastAPI routers, endpoints
```

## 5. Komunikacja Między Serwisami

### 5.1. API Gateway Pattern

**API Gateway** jest jedynym punktem wejścia dla frontendu:

```
Frontend → API Gateway → Microservice 1
                       → Microservice 2
                       → Microservice 3
```

**Zalety:**
- Frontend nie musi znać adresów wszystkich serwisów
- Centralne zarządzanie CORS, autoryzacją, rate limiting
- Agregacja odpowiedzi z wielu serwisów

### 5.2. Komunikacja HTTP REST

Serwisy komunikują się ze sobą przez HTTP REST API:

- **Format**: JSON
- **Protokół**: HTTP/HTTPS
- **Idempotentność**: Operacje GET są bezpieczne, POST dla tworzenia
- **Stateless**: Każde żądanie zawiera wszystkie potrzebne dane

### 5.3. Przykład Przepływu Danych

1. **Frontend** wysyła plik IFC → **API Gateway**
2. **API Gateway** → **IFC Parser Service** (parsowanie)
3. **IFC Parser Service** zwraca elementy → **API Gateway**
4. **API Gateway** → **Database Manager Service** (zapis)
5. **API Gateway** → **3D Data Service** (przygotowanie danych wizualizacji)
6. **API Gateway** zwraca agregowaną odpowiedź → **Frontend**

## 6. Dependency Injection (DI)

### 6.1. Dlaczego DI?

- **Testowalność**: Łatwe zastępowanie zależności mockami
- **Elastyczność**: Zmiana implementacji bez modyfikacji kodu używającego
- **Czytelność**: Zależności są jawnie zadeklarowane

### 6.2. Implementacja

Używamy biblioteki `dependency-injector`:

```python
# application/container.py
from dependency_injector import containers, providers

class Container(containers.DeclarativeContainer):
    # Configuration
    config = providers.Configuration()
    
    # Services
    ifc_parser_service = providers.Factory(
        IfcParserService
    )
```

## 7. Railway Oriented Programming (Result Pattern)

### 7.1. Problem

Tradycyjne podejście z wyjątkami:
- Trudne śledzenie błędów
- Niejasne kontrakty funkcji
- Łatwo zapomnieć o obsłudze błędów

### 7.2. Rozwiązanie: Result Pattern

```python
from ifc_common.result import Result

def parse_file(file_path: str) -> Result[List[IfcElement], str]:
    try:
        elements = ...
        return Result.success(elements)
    except Exception as e:
        return Result.failure(str(e))
```

**Zalety:**
- Jawny kontrakt: funkcja zwraca `Result[T, E]`
- Wymusza obsługę błędów
- Łatwe łączenie operacji (map, bind, flat_map)

### 7.3. Przykład Użycia

```python
result = parse_file("file.ifc")
if result.is_success:
    elements = result.value
else:
    error = result.error
```

## 8. Docker i Docker Compose

### 8.1. Konteneryzacja

Każdy mikroserwis działa w osobnym kontenerze Docker:
- **Izolacja**: Serwisy nie wpływają na siebie
- **Reprodukowalność**: Identyczne środowisko na każdym komputerze
- **Łatwe wdrożenie**: Jeden kontener = jeden serwis

### 8.2. Docker Compose

Orkiestracja wszystkich serwisów:

```yaml
services:
  api-gateway:
    build: ./api-gateway
    ports:
      - "8000:8000"
  ifc-parser-service:
    build: ./ifc-parser-service
    ports:
      - "5001:5001"
  # ... pozostałe serwisy
```

**Zalety:**
- Jeden plik konfiguracyjny dla całego systemu
- Automatyczne tworzenie sieci między kontenerami
- Proste uruchomienie: `docker-compose up`

## 9. Współdzielony Package (common-package)

### 9.1. Problem Duplikacji

Bez wspólnego pakietu:
- Każdy serwis musiałby mieć własną implementację `Result`
- Duplikacja kodu i logiki
- Trudne utrzymanie spójności

### 9.2. Rozwiązanie

`common-package/ifc_common/` zawiera:
- **Result pattern**: Wspólna implementacja dla wszystkich serwisów
- **BaseSettings**: Bazowa klasa dla konfiguracji
- **Wspólne utilities**: Funkcje pomocnicze używane w wielu serwisach

**Instalacja:**
- W Dockerfile każdego serwisu: `pip install -e /app/common-package`
- W `docker-compose.yml`: volume mapping dla lokalnego developmentu

## 10. Frontend: React + Three.js

### 10.1. React

- **Komponentowy**: Każdy element UI to osobny komponent
- **Stan**: Zarządzanie stanem przez React hooks
- **Reaktywność**: Automatyczne odświeżanie UI przy zmianie danych

### 10.2. Three.js

- **Biblioteka 3D**: Renderowanie sceny 3D w WebGL
- **Interaktywność**: Kontrola kamery (orbit controls)
- **Wydajność**: Hardware-accelerated rendering

### 10.3. Komunikacja z Backendem

- **Fetch API**: Wysyłanie żądań HTTP do API Gateway
- **FormData**: Upload plików IFC
- **JSON**: Odbieranie i parsowanie odpowiedzi

## 11. Bazowanie na istniejącym kodzie (IfcGenericMapper)

### 11.1. Hybrydowe Podejście

Początkowo planowano użycie istniejącego kodu .NET (`IfcGenericMapper`), ale:
- **Kompleksowość**: Komunikacja między Python a .NET wymaga dodatkowej warstwy
- **Alternatywa**: `ifcopenshell` w Pythonie jest wystarczające dla potrzeb projektu
- **Spójność**: Jeden język (Python) dla całego backendu

### 11.2. Inspiracja z C#

Kod Python jest inspirowany implementacją C#:
- Taka sama logika ekstrakcji placement matrix
- Identyczny format macierzy (WPF Matrix3D)
- Zachowana kompatybilność z istniejącym kodem

## 12. Dlaczego ta architektura jest odpowiednia?

### 12.1. Dla Zespołu

- **Nauka**: Członkowie zespołu mogą uczyć się Clean Architecture w praktyce
- **Podział pracy**: Jasny podział odpowiedzialności
- **Code review**: Łatwe przeglądanie małych, skupionych zmian

### 12.2. Dla Projektu

- **Rozbudowa**: Łatwe dodawanie nowych funkcji jako nowych serwisów
- **Testowanie**: Każdy serwis można testować niezależnie
- **Wydajność**: Możliwość skalowania tylko potrzebnych serwisów

### 12.3. Dla Przyszłości

- **Integracja**: Łatwa integracja z zewnętrznymi systemami
- **Migracja**: Możliwość przeniesienia serwisów na chmurę
- **Technologie**: Możliwość wymiany technologii bez wpływu na całość

## 13. Podsumowanie

Projekt został zaprojektowany z myślą o:
1. **Czytelności**: Clean Architecture zapewnia jasną strukturę
2. **Skalowalności**: Mikroserwisy mogą być skalowane niezależnie
3. **Nauce**: Struktura sprzyja nauce dobrych praktyk
4. **Współpracy**: Równoległa praca wielu osób bez konfliktów
5. **Elastyczności**: Łatwa rozbudowa i modyfikacja

Każda decyzja architektoniczna była podyktowana konkretnymi potrzebami projektu i zespołu, tworząc system, który jest zarówno funkcjonalny, jak i łatwy w utrzymaniu.
