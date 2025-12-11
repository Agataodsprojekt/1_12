# Quick Test - Szybki Test Wszystkich Serwisów

## 🧪 Test Kompletnego Workflow

### 1. Uruchom wszystko

```bash
docker-compose up --build
```

### 2. Test przez API Gateway (wszystkie serwisy na raz)

```bash
# Test parsowania IFC + automatyczne obliczanie kosztów
curl -X POST "http://localhost:8000/api/ifc/parse?calculate_costs=true" \
  -F "file=@test.ifc"

# Test obliczania kosztów (osobne)
curl -X POST http://localhost:8000/api/costs/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "elements": [
      {
        "global_id": "test-001",
        "type_name": "IfcBeam",
        "name": "Beam-01",
        "properties": {"Material": "Concrete"}
      }
    ]
  }'
```

### 3. Test równoległy (agregacja)

```bash
curl -X POST http://localhost:8000/api/gateway/aggregate \
  -H "Content-Type: application/json" \
  -d '{
    "requests": [
      {
        "service": "calculation-engine",
        "endpoint": "/api/calculations/static",
        "method": "POST",
        "data": {
          "elements": [{"global_id": "test-001"}]
        }
      },
      {
        "service": "cost-calculator",
        "endpoint": "/api/costs/calculate",
        "method": "POST",
        "data": {
          "elements": [{"global_id": "test-001"}]
        }
      },
      {
        "service": "3d-data",
        "endpoint": "/api/visualization/scene",
        "method": "POST",
        "data": {
          "elements": [{"global_id": "test-001"}]
        }
      }
    ]
  }'
```

## ✅ Oczekiwane odpowiedzi

Wszystkie powinny zwracać:
- Status 200
- JSON response
- Dane (mock dla teraz, prawdziwe później)

