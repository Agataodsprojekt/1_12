# IFC Common Package

Wspólna biblioteka dla wszystkich mikroserwisów IFC Construction Calculator.

## Instalacja w trybie rozwoju

```bash
# W każdym mikroserwisie
pip install -e ../common-package
```

## Zawartość

- `Result` - Railway Oriented Programming pattern
- `BaseMicroserviceSettings` - Podstawowa klasa settings dla wszystkich serwisów

## Użycie

```python
from ifc_common import Result, BaseMicroserviceSettings

# Result pattern
result = Result.success("value")
if result.is_success:
    print(result.value)

# Settings
class MySettings(BaseMicroserviceSettings):
    custom_field: str = "default"
```

