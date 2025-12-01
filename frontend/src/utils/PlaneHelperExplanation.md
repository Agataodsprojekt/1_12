# Jak działa PlaneHelper w Three.js

## Konstruktor PlaneHelper

```typescript
new THREE.PlaneHelper(plane, size, color)
```

### Parametry:
- `plane: THREE.Plane` - płaszczyzna do wizualizacji (normal + constant)
- `size: number` - **długość boku kwadratowej płaszczyzny** (domyślnie 1)
- `color: number` - kolor wizualizacji (domyślnie 0xffff00 - żółty)

## Jak PlaneHelper rysuje płaszczyznę (uproszczona implementacja):

PlaneHelper wewnętrznie tworzy:

1. **Geometria**: `PlaneGeometry(size, size)` - kwadratowa płaszczyzna
2. **Materiał**: `MeshBasicMaterial` z podanym kolorem
3. **Mesh**: `Mesh(geometry, material)` - obiekt 3D do renderowania
4. **Pozycjonowanie**: Płaszczyzna jest zawsze w lokalnym układzie współrzędnych helpera (XY plane)
5. **Orientacja**: Helper może być obracany, aby płaszczyzna była w odpowiedniej orientacji

### Wewnętrzna logika (pseudokod):

```javascript
class PlaneHelper extends Object3D {
  constructor(plane, size = 1, color = 0xffff00) {
    super();
    
    // Tworzy kwadratową geometrię
    const geometry = new PlaneGeometry(size, size);
    
    // Tworzy materiał
    const material = new MeshBasicMaterial({
      color: color,
      side: DoubleSide,
      transparent: true,
      opacity: 0.5
    });
    
    // Tworzy mesh
    this.planeMesh = new Mesh(geometry, material);
    this.add(this.planeMesh);
    
    // Przechowuje referencję do plane
    this.plane = plane;
    
    // Rysuje linię pokazującą normalną płaszczyzny
    // (opcjonalnie, zależy od implementacji)
  }
}
```

## Ważne:

- **Parametr `size`** to dokładnie długość boku kwadratu
- Jeśli `size = 58`, płaszczyzna będzie miała wymiary 58×58 jednostek
- Płaszczyzna jest zawsze kwadratowa (nie prostokątna)
- Pozycja helpera (`helper.position`) określa gdzie jest środek płaszczyzny
- Rotacja helpera (`helper.quaternion`) określa orientację płaszczyzny

## W Twoim kodzie:

```typescript
// Linia 520
const helper = new THREE.PlaneHelper(plane, planeSize, 0x00ff00);
```

Gdzie:
- `plane` - płaszczyzna z normalną i constant = 0
- `planeSize` - powinno być równe `cutLength` (długość linii cięcia)
- `0x00ff00` - zielony kolor

Jeśli `planeSize = 58`, to płaszczyzna będzie miała bok 58 jednostek.

