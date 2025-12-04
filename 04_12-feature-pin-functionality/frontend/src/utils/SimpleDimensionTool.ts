import * as THREE from 'three';

interface SnapPoint {
  position: THREE.Vector3;
  type: 'vertex' | 'edge' | 'midpoint' | 'center';
  normal?: THREE.Vector3;
}

interface EdgeReference {
  start: THREE.Vector3;
  end: THREE.Vector3;
  direction: THREE.Vector3;
  line: THREE.Line | null;
}

export class SimpleDimensionTool {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private raycaster: THREE.Raycaster;
  private points: THREE.Vector3[] = [];
  private measurements: THREE.Group[] = [];
  private markers: THREE.Mesh[] = [];
  private tempGroup: THREE.Group | null = null;
  private tempMarker: THREE.Mesh | null = null;
  private snapMarker: THREE.Mesh | null = null;
  private snapPointMarkers: THREE.Mesh[] = []; // Małe zielone kwadraty pokazujące punkty snap
  public enabled: boolean = false;
  public onMeasurementCreated: ((data: { group: THREE.Group; start: THREE.Vector3; end: THREE.Vector3 }) => void) | null = null;

  // Opcje wymiarowania
  public orthogonalMode: boolean = false;
  public snapToPoints: boolean = false;
  public alignToEdgeMode: 'none' | 'parallel' | 'perpendicular' = 'none';
  private snapThreshold: number = 0.5; // Próg przyciągania w jednostkach modelu (zwiększony dla lepszego działania)
  
  // Krawędź odniesienia
  private referenceEdge: EdgeReference | null = null;
  private isSelectingEdge: boolean = false;

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Line = { threshold: 1.0 }; // Duży threshold dla łatwiejszego klikania
    this.raycaster.params.Points = { threshold: 1.0 };
  }

  public handleClick(event: MouseEvent, objects: THREE.Object3D[]): void {
    if (!this.enabled) return;

    // Jeśli tryb wyrównania do krawędzi jest włączony i nie mamy jeszcze krawędzi odniesienia
    if (this.alignToEdgeMode !== 'none' && !this.referenceEdge) {
      this.selectReferenceEdge(event, objects);
      return;
    }

    const point = this.getPoint(event, objects);
    if (!point) return;

    this.addPoint(point);
  }

  public handleMouseMove(event: MouseEvent, objects: THREE.Object3D[]): void {
    if (!this.enabled) return;

    const point = this.getPoint(event, objects);
    if (!point) {
      this.clearSnapMarker();
      this.clearSnapPointMarkers(); // Wyczyść małe kwadraty
      if (this.points.length === 1) {
        this.clearPreview();
      }
      return;
    }

    // Pokaż wszystkie punkty snap w pobliżu jako małe zielone kwadraty
    if (this.snapToPoints && this.points.length < 2) {
      this.showAllNearbySnapPoints(point, objects);
      this.showSnapMarker(point); // Główny marker na najbliższym punkcie
    } else {
      this.clearSnapMarker();
      this.clearSnapPointMarkers();
    }

    // Pokaż podgląd wymiaru
    if (this.points.length === 1) {
      this.updatePreview(point);
    }
  }

  // Czyści podgląd i snap marker (używane gdy Shift nie jest wciśnięty)
  public clearPreviewAndSnap(): void {
    this.clearPreview();
    this.clearSnapMarker();
    this.clearSnapPointMarkers(); // Wyczyść małe kwadraty
  }

  private getPoint(event: MouseEvent, objects: THREE.Object3D[]): THREE.Vector3 | null {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    this.raycaster.setFromCamera(mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(objects, true);

    if (intersects.length === 0) return null;

    let point = intersects[0].point.clone();

    // Jeśli snap jest włączony, znajdź najbliższy punkt charakterystyczny
    if (this.snapToPoints) {
      const snapPoint = this.findNearestSnapPoint(point, intersects[0].object);
      if (snapPoint) {
        point = snapPoint.position;
      }
    }

    // Jeśli tryb ortogonalny jest włączony i mamy już pierwszy punkt
    if (this.orthogonalMode && this.points.length === 1 && !this.referenceEdge) {
      point = this.getOrthogonalPoint(this.points[0], point);
    }

    // Jeśli mamy krawędź odniesienia i już pierwszy punkt
    if (this.referenceEdge && this.points.length === 1) {
      point = this.getAlignedToEdgePoint(this.points[0], point);
    }

    return point;
  }

  // Wyświetl wszystkie punkty snap w pobliżu (małe zielone kwadraty)
  private showAllNearbySnapPoints(clickPoint: THREE.Vector3, objects: THREE.Object3D[]): void {
    // Wyczyść poprzednie markery
    this.clearSnapPointMarkers();
    
    if (!this.snapToPoints) return;
    
    const allSnapPoints: SnapPoint[] = [];
    
    // Zbierz punkty snap ze wszystkich obiektów w pobliżu kursora
    objects.forEach(obj => {
      const processObject = (o: THREE.Object3D) => {
        if (o instanceof THREE.Mesh && o.geometry) {
          const geometry = o.geometry;
          const worldMatrix = o.matrixWorld;
          const position = geometry.attributes.position;
          
          if (position) {
            // Ograniczamy liczbę wierzchołków (wydajność)
            const step = Math.max(1, Math.floor(position.count / 50));
            
            for (let i = 0; i < position.count; i += step) {
              const vertex = new THREE.Vector3();
              vertex.fromBufferAttribute(position, i);
              vertex.applyMatrix4(worldMatrix);
              
              // Tylko punkty w rozsądnej odległości od kursora
              if (vertex.distanceTo(clickPoint) < this.snapThreshold * 3) {
                allSnapPoints.push({ position: vertex, type: 'vertex' });
              }
            }
            
            // Dodaj środek elementu
            geometry.computeBoundingBox();
            if (geometry.boundingBox) {
              const center = new THREE.Vector3();
              geometry.boundingBox.getCenter(center);
              center.applyMatrix4(worldMatrix);
              
              if (center.distanceTo(clickPoint) < this.snapThreshold * 3) {
                allSnapPoints.push({ position: center, type: 'center' });
              }
              
              // Rogi bounding box
              const min = geometry.boundingBox.min.clone().applyMatrix4(worldMatrix);
              const max = geometry.boundingBox.max.clone().applyMatrix4(worldMatrix);
              
              if (min.distanceTo(clickPoint) < this.snapThreshold * 3) {
                allSnapPoints.push({ position: min, type: 'vertex' });
              }
              if (max.distanceTo(clickPoint) < this.snapThreshold * 3) {
                allSnapPoints.push({ position: max, type: 'vertex' });
              }
            }
          }
        }
      };
      
      processObject(obj);
      obj.traverse(processObject);
    });
    
    // Utwórz małe zielone kwadraty dla każdego punktu
    allSnapPoints.forEach(sp => {
      const marker = this.createSnapPointMarker(sp.position);
      this.scene.add(marker);
      this.snapPointMarkers.push(marker);
    });
  }
  
  // Utwórz mały zielony kwadrat dla punktu snap
  private createSnapPointMarker(position: THREE.Vector3): THREE.Mesh {
    const size = 0.05;
    const geometry = new THREE.BoxGeometry(size, size, size);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00FF00, // Jasna zieleń
      transparent: true,
      opacity: 0.7,
      depthTest: false,
      depthWrite: false
    });
    
    const marker = new THREE.Mesh(geometry, material);
    marker.position.copy(position);
    marker.renderOrder = 1002;
    
    // Dodaj losowy offset czasowy dla animacji
    (marker as any).animationOffset = Math.random() * Math.PI * 2;
    
    return marker;
  }
  
  // Wyczyść wszystkie markery punktów snap
  private clearSnapPointMarkers(): void {
    this.snapPointMarkers.forEach(marker => {
      this.scene.remove(marker);
    });
    this.snapPointMarkers = [];
  }

  private findNearestSnapPoint(clickPoint: THREE.Vector3, object: THREE.Object3D): SnapPoint | null {
    const snapPoints: SnapPoint[] = [];
    
    console.log('🧲 Finding snap points for object:', object.type);

    // Funkcja do przetwarzania pojedynczego obiektu
    const processObject = (obj: THREE.Object3D) => {
      if (obj instanceof THREE.Mesh && obj.geometry) {
        const geometry = obj.geometry;
        const worldMatrix = obj.matrixWorld;

        // Pobierz wierzchołki
        const position = geometry.attributes.position;
        if (position) {
          // Ograniczamy liczbę wierzchołków do analizy (wydajność)
          const step = Math.max(1, Math.floor(position.count / 100));
          const vertices: THREE.Vector3[] = [];
          
          for (let i = 0; i < position.count; i += step) {
            const vertex = new THREE.Vector3();
            vertex.fromBufferAttribute(position, i);
            vertex.applyMatrix4(worldMatrix);
            vertices.push(vertex);
          }

          // Dodaj wierzchołki
          vertices.forEach(v => {
            snapPoints.push({ position: v, type: 'vertex' });
          });

          // Dodaj środek geometrii (ważny punkt!)
          geometry.computeBoundingBox();
          if (geometry.boundingBox) {
            const center = new THREE.Vector3();
            geometry.boundingBox.getCenter(center);
            center.applyMatrix4(worldMatrix);
            snapPoints.push({ position: center, type: 'center' });
            
            // Dodaj rogi bounding box (początek i koniec elementu)
            const min = geometry.boundingBox.min.clone().applyMatrix4(worldMatrix);
            const max = geometry.boundingBox.max.clone().applyMatrix4(worldMatrix);
            snapPoints.push({ position: min, type: 'vertex' });
            snapPoints.push({ position: max, type: 'vertex' });
            
            // Dodaj środki krawędzi bounding box
            const midX = new THREE.Vector3((min.x + max.x) / 2, min.y, min.z);
            const midY = new THREE.Vector3(min.x, (min.y + max.y) / 2, min.z);
            const midZ = new THREE.Vector3(min.x, min.y, (min.z + max.z) / 2);
            snapPoints.push({ position: midX, type: 'midpoint' });
            snapPoints.push({ position: midY, type: 'midpoint' });
            snapPoints.push({ position: midZ, type: 'midpoint' });
          }
        }
      }
    };

    // Przetwórz kliknięty obiekt i jego dzieci
    processObject(object);
    object.traverse(processObject);
    
    console.log('🧲 Found', snapPoints.length, 'snap points');

    // Znajdź najbliższy punkt w promieniu snapThreshold
    let nearestPoint: SnapPoint | null = null;
    let minDistance = this.snapThreshold;

    snapPoints.forEach(sp => {
      const distance = clickPoint.distanceTo(sp.position);
      if (distance < minDistance) {
        minDistance = distance;
        nearestPoint = sp;
      }
    });
    
    if (nearestPoint) {
      console.log('🧲 Snap found! Type:', nearestPoint.type, 'Distance:', minDistance.toFixed(3));
    }

    return nearestPoint;
  }

  private selectReferenceEdge(event: MouseEvent, objects: THREE.Object3D[]): void {
    console.log('📏 Selecting reference edge, mode:', this.alignToEdgeMode);
    
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    this.raycaster.setFromCamera(mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(objects, true);

    console.log('📏 Intersects found:', intersects.length);

    if (intersects.length === 0) {
      console.log('📏 No intersects found!');
      return;
    }

    const intersect = intersects[0];
    const clickPoint = intersect.point;
    console.log('📏 Click point:', clickPoint);
    console.log('📏 Intersected object:', intersect.object);

    // Pobierz normalną powierzchni z przecięcia
    let edgeDirection: THREE.Vector3;
    
    if (intersect.face) {
      // Użyj normalnej powierzchni do określenia kierunku krawędzi
      const normal = intersect.face.normal.clone();
      if (intersect.object instanceof THREE.Mesh) {
        normal.transformDirection(intersect.object.matrixWorld);
      }
      
      // Znajdź główną oś najbliższą do normalnej
      const absNormal = new THREE.Vector3(
        Math.abs(normal.x),
        Math.abs(normal.y),
        Math.abs(normal.z)
      );
      
      // Wybierz kierunek prostopadły do normalnej (wzdłuż powierzchni)
      if (absNormal.z > absNormal.x && absNormal.z > absNormal.y) {
        // Normalna wzdłuż Z, więc krawędź w płaszczyźnie XY
        edgeDirection = new THREE.Vector3(1, 0, 0);
      } else if (absNormal.y > absNormal.x) {
        // Normalna wzdłuż Y, więc krawędź w płaszczyźnie XZ
        edgeDirection = new THREE.Vector3(1, 0, 0);
      } else {
        // Normalna wzdłuż X, więc krawędź w płaszczyźnie YZ
        edgeDirection = new THREE.Vector3(0, 1, 0);
      }
    } else {
      // Fallback - użyj osi X
      edgeDirection = new THREE.Vector3(1, 0, 0);
    }

    // Utwórz widoczną linię krawędzi odniesienia
    const edgeLength = 2.0; // Długość wizualizacji krawędzi
    const start = clickPoint.clone().sub(edgeDirection.clone().multiplyScalar(edgeLength / 2));
    const end = clickPoint.clone().add(edgeDirection.clone().multiplyScalar(edgeLength / 2));

    // Usuń poprzednią linię odniesienia jeśli istnieje
    if (this.referenceEdge?.line) {
      this.scene.remove(this.referenceEdge.line);
    }

    // Utwórz wizualizację krawędzi odniesienia
    const color = this.alignToEdgeMode === 'parallel' ? 0x4CAF50 : 0x9C27B0;
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: color,
      linewidth: 5,
      depthTest: false,
      depthWrite: false
    });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    line.renderOrder = 997;
    this.scene.add(line);

    this.referenceEdge = {
      start: start,
      end: end,
      direction: edgeDirection.normalize(),
      line: line
    };

    console.log('✅ Reference edge selected:', this.alignToEdgeMode === 'parallel' ? 'PARALLEL' : 'PERPENDICULAR');
    console.log('📏 Edge direction:', edgeDirection);
    this.isSelectingEdge = false;
  }

  private findNearestEdge(clickPoint: THREE.Vector3, object: THREE.Object3D): { start: THREE.Vector3; end: THREE.Vector3; direction: THREE.Vector3 } | null {
    console.log('📏 Finding nearest edge for object:', object);
    let nearestEdge: { start: THREE.Vector3; end: THREE.Vector3; direction: THREE.Vector3 } | null = null;
    let minDistance = this.snapThreshold * 3; // Zwiększony próg dla łatwiejszego wykrycia
    let edgesChecked = 0;

    // Przeszukaj obiekt i wszystkie jego dzieci
    const processObject = (obj: THREE.Object3D) => {
      if (obj instanceof THREE.Mesh && obj.geometry) {
        const geometry = obj.geometry;
        const worldMatrix = obj.matrixWorld;
        const position = geometry.attributes.position;

        if (!position) {
          console.log('📏 No position attribute in geometry');
          return;
        }
        
        console.log('📏 Processing mesh with', position.count, 'vertices');

        // Pobierz wierzchołki w przestrzeni globalnej
        const vertices: THREE.Vector3[] = [];
        for (let i = 0; i < position.count; i++) {
          const vertex = new THREE.Vector3();
          vertex.fromBufferAttribute(position, i);
          vertex.applyMatrix4(worldMatrix);
          vertices.push(vertex);
        }

        // Sprawdź krawędzie (połączenia wierzchołków)
        const index = geometry.index;
        if (index) {
          // Geometria indeksowana - używamy indeksów
          for (let i = 0; i < index.count; i += 3) {
            const indices = [
              index.getX(i),
              index.getX(i + 1),
              index.getX(i + 2)
            ];

            // Sprawdź każdą krawędź trójkąta
            const edges = [
              [indices[0], indices[1]],
              [indices[1], indices[2]],
              [indices[2], indices[0]]
            ];

            edges.forEach(([idx1, idx2]) => {
              if (idx1 < vertices.length && idx2 < vertices.length) {
                const v1 = vertices[idx1];
                const v2 = vertices[idx2];
                
                // Oblicz odległość punktu od krawędzi
                const distance = this.distanceToLineSegment(clickPoint, v1, v2);
                
                if (distance < minDistance) {
                  minDistance = distance;
                  const direction = new THREE.Vector3().subVectors(v2, v1).normalize();
                  nearestEdge = {
                    start: v1.clone(),
                    end: v2.clone(),
                    direction: direction
                  };
                  edgesChecked++;
                }
              }
            });
          }
          console.log('📏 Indexed geometry -', index.count / 3, 'triangles checked');
        } else {
          // Geometria nieindeksowana - łącz kolejne wierzchołki
          console.log('📏 Non-indexed geometry -', vertices.length, 'vertices');
          for (let i = 0; i < vertices.length - 1; i++) {
            const v1 = vertices[i];
            const v2 = vertices[i + 1];
            
            const distance = this.distanceToLineSegment(clickPoint, v1, v2);
            
            if (distance < minDistance) {
              minDistance = distance;
              const direction = new THREE.Vector3().subVectors(v2, v1).normalize();
              nearestEdge = {
                start: v1.clone(),
                end: v2.clone(),
                direction: direction
              };
              edgesChecked++;
            }
          }
        }
      }
    };

    // Wywołaj processObject na klikniętym obiekcie i jego dzieciach
    processObject(object);
    object.traverse(processObject);
    
    console.log('📏 Edges checked:', edgesChecked, 'Nearest edge:', nearestEdge, 'Min distance:', minDistance);

    // Jeśli nie znaleziono krawędzi blisko punktu, użyj uproszczonej metody
    // Znajdź najdłuższą krawędź z bounding box
    if (!nearestEdge && object instanceof THREE.Mesh && object.geometry) {
      console.log('📏 No edge found close enough, using bounding box edges');
      object.geometry.computeBoundingBox();
      if (object.geometry.boundingBox) {
        const bbox = object.geometry.boundingBox;
        const worldMatrix = object.matrixWorld;
        
        // Pobierz rogi bounding box w przestrzeni globalnej
        const corners = [
          new THREE.Vector3(bbox.min.x, bbox.min.y, bbox.min.z).applyMatrix4(worldMatrix),
          new THREE.Vector3(bbox.max.x, bbox.min.y, bbox.min.z).applyMatrix4(worldMatrix),
          new THREE.Vector3(bbox.max.x, bbox.max.y, bbox.min.z).applyMatrix4(worldMatrix),
          new THREE.Vector3(bbox.min.x, bbox.max.y, bbox.min.z).applyMatrix4(worldMatrix),
          new THREE.Vector3(bbox.min.x, bbox.min.y, bbox.max.z).applyMatrix4(worldMatrix),
          new THREE.Vector3(bbox.max.x, bbox.min.y, bbox.max.z).applyMatrix4(worldMatrix),
          new THREE.Vector3(bbox.max.x, bbox.max.y, bbox.max.z).applyMatrix4(worldMatrix),
          new THREE.Vector3(bbox.min.x, bbox.max.y, bbox.max.z).applyMatrix4(worldMatrix),
        ];
        
        // Krawędzie bounding box
        const bboxEdges = [
          [corners[0], corners[1]], // bottom front
          [corners[1], corners[2]], // right front
          [corners[2], corners[3]], // top front
          [corners[3], corners[0]], // left front
          [corners[4], corners[5]], // bottom back
          [corners[5], corners[6]], // right back
          [corners[6], corners[7]], // top back
          [corners[7], corners[4]], // left back
          [corners[0], corners[4]], // bottom left
          [corners[1], corners[5]], // bottom right
          [corners[2], corners[6]], // top right
          [corners[3], corners[7]], // top left
        ];
        
        // Znajdź najbliższą krawędź z bounding box
        bboxEdges.forEach(([v1, v2]) => {
          const distance = this.distanceToLineSegment(clickPoint, v1, v2);
          if (distance < minDistance) {
            minDistance = distance;
            const direction = new THREE.Vector3().subVectors(v2, v1).normalize();
            nearestEdge = {
              start: v1,
              end: v2,
              direction: direction
            };
          }
        });
        
        console.log('📏 Using bounding box edge:', nearestEdge);
      }
    }

    return nearestEdge;
  }

  private distanceToLineSegment(point: THREE.Vector3, lineStart: THREE.Vector3, lineEnd: THREE.Vector3): number {
    const line = new THREE.Vector3().subVectors(lineEnd, lineStart);
    const lineLength = line.length();
    
    if (lineLength === 0) return point.distanceTo(lineStart);
    
    const t = Math.max(0, Math.min(1, new THREE.Vector3().subVectors(point, lineStart).dot(line) / (lineLength * lineLength)));
    const projection = new THREE.Vector3().addVectors(lineStart, line.multiplyScalar(t));
    
    return point.distanceTo(projection);
  }

  private getAlignedToEdgePoint(startPoint: THREE.Vector3, endPoint: THREE.Vector3): THREE.Vector3 {
    if (!this.referenceEdge) return endPoint;

    const direction = this.referenceEdge.direction.clone().normalize();
    const delta = new THREE.Vector3().subVectors(endPoint, startPoint);
    
    if (this.alignToEdgeMode === 'parallel') {
      // Rzutuj wektor na kierunek krawędzi odniesienia (równolegle)
      const projectionLength = delta.dot(direction);
      const projection = direction.clone().multiplyScalar(projectionLength);
      const result = new THREE.Vector3().addVectors(startPoint, projection);
      
      console.log('📏 Parallel alignment:', 
        'Start:', startPoint, 
        'End:', endPoint, 
        'Aligned:', result,
        'Direction:', direction);
      
      return result;
    } else if (this.alignToEdgeMode === 'perpendicular') {
      // Znajdź kierunek prostopadły do krawędzi odniesienia
      // Utwórz płaszczyznę prostopadłą do krawędzi
      const perpDirection1 = new THREE.Vector3();
      if (Math.abs(direction.x) < 0.9) {
        perpDirection1.crossVectors(direction, new THREE.Vector3(1, 0, 0)).normalize();
      } else {
        perpDirection1.crossVectors(direction, new THREE.Vector3(0, 1, 0)).normalize();
      }
      
      const perpDirection2 = new THREE.Vector3().crossVectors(direction, perpDirection1).normalize();
      
      // Rzutuj delta na oba kierunki prostopadłe
      const proj1 = delta.dot(perpDirection1);
      const proj2 = delta.dot(perpDirection2);
      
      // Wybierz dominujący kierunek prostopadły
      let perpVector: THREE.Vector3;
      if (Math.abs(proj1) > Math.abs(proj2)) {
        perpVector = perpDirection1.clone().multiplyScalar(proj1);
      } else {
        perpVector = perpDirection2.clone().multiplyScalar(proj2);
      }
      
      const result = new THREE.Vector3().addVectors(startPoint, perpVector);
      
      console.log('📏 Perpendicular alignment:', 
        'Start:', startPoint, 
        'End:', endPoint, 
        'Aligned:', result,
        'Direction:', direction);
      
      return result;
    }

    return endPoint;
  }

  private getOrthogonalPoint(startPoint: THREE.Vector3, endPoint: THREE.Vector3): THREE.Vector3 {
    const delta = new THREE.Vector3().subVectors(endPoint, startPoint);
    
    // Znajdź dominującą oś (największą różnicę)
    const absDelta = new THREE.Vector3(
      Math.abs(delta.x),
      Math.abs(delta.y),
      Math.abs(delta.z)
    );

    const orthogonalPoint = startPoint.clone();

    // Wybierz kierunek z największą różnicą
    if (absDelta.x >= absDelta.y && absDelta.x >= absDelta.z) {
      // Wymiar wzdłuż osi X
      orthogonalPoint.x = endPoint.x;
    } else if (absDelta.y >= absDelta.x && absDelta.y >= absDelta.z) {
      // Wymiar wzdłuż osi Y
      orthogonalPoint.y = endPoint.y;
    } else {
      // Wymiar wzdłuż osi Z
      orthogonalPoint.z = endPoint.z;
    }

    return orthogonalPoint;
  }

  private showSnapMarker(position: THREE.Vector3): void {
    this.clearSnapMarker();

    const geometry = new THREE.SphereGeometry(0.08, 16, 16); // Zwiększony rozmiar
    const material = new THREE.MeshBasicMaterial({
      color: 0x00FF00, // Jasnozielony kolor dla lepszej widoczności
      transparent: true,
      opacity: 0.9,
      depthTest: false,
      depthWrite: false
    });
    this.snapMarker = new THREE.Mesh(geometry, material);
    this.snapMarker.position.copy(position);
    this.snapMarker.renderOrder = 1001;
    this.scene.add(this.snapMarker);

    // Dodaj pulsujący efekt
    const scale = 1 + Math.sin(Date.now() * 0.01) * 0.3;
    this.snapMarker.scale.setScalar(scale);
  }

  private clearSnapMarker(): void {
    if (this.snapMarker) {
      this.scene.remove(this.snapMarker);
      this.snapMarker = null;
    }
  }

  private addPoint(point: THREE.Vector3): void {
    console.log('📏 Point added:', point);

    // Dodaj mały, subtelny marker
    const marker = this.createMarker(point, 0xff4444, false);
    this.scene.add(marker);
    this.markers.push(marker);

    this.points.push(point);

    if (this.points.length === 2) {
      this.createMeasurement();
      this.clearPreview();
      this.clearSnapMarker();
      
      // Usuń markery punktów po utworzeniu wymiaru
      this.markers.forEach((m) => this.scene.remove(m));
      this.markers = [];
      
      this.points = [];
    }
  }

  private createMarker(position: THREE.Vector3, color: number, temporary: boolean): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(0.02, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: temporary,
      opacity: temporary ? 0.7 : 1,
      depthTest: false,
      depthWrite: false
    });
    const marker = new THREE.Mesh(geometry, material);
    marker.position.copy(position);
    marker.renderOrder = 999;
    return marker;
  }

  private updatePreview(endPoint: THREE.Vector3): void {
    this.clearPreview();

    const startPoint = this.points[0];
    const distance = startPoint.distanceTo(endPoint);

    // Utwórz grupę tymczasową
    this.tempGroup = this.createDimensionGroup(startPoint, endPoint, distance, true);
    this.scene.add(this.tempGroup);

    // Tymczasowy marker
    this.tempMarker = this.createMarker(endPoint, 0x4CAF50, true);
    this.scene.add(this.tempMarker);
  }

  private clearPreview(): void {
    if (this.tempGroup) {
      this.scene.remove(this.tempGroup);
      this.tempGroup = null;
    }
    if (this.tempMarker) {
      this.scene.remove(this.tempMarker);
      this.tempMarker = null;
    }
  }

  private createMeasurement(): void {
    const start = this.points[0];
    const end = this.points[1];
    const distance = start.distanceTo(end);

    console.log(`📏 Creating measurement: ${distance.toFixed(3)} meters`);

    const group = this.createDimensionGroup(start, end, distance, false);
    this.scene.add(group);
    this.measurements.push(group);
    
    // Wywołaj callback jeśli jest ustawiony (dla undo/redo)
    if (this.onMeasurementCreated) {
      this.onMeasurementCreated({
        group: group,
        start: start.clone(),
        end: end.clone()
      });
    }
  }

  private createDimensionGroup(
    start: THREE.Vector3,
    end: THREE.Vector3,
    distance: number,
    temporary: boolean
  ): THREE.Group {
    const group = new THREE.Group();

    // Kolory
    const lineColor = temporary ? 0x4CAF50 : 0x2196F3;
    const opacity = temporary ? 0.7 : 1;

    // Główna linia wymiarowa
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: lineColor,
      linewidth: 1,
      transparent: temporary,
      opacity: opacity,
      depthTest: false,
      depthWrite: false
    });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    line.renderOrder = 998;
    group.add(line);

    // Strzałki na końcach
    this.createArrow(group, start, end, lineColor, temporary);
    this.createArrow(group, end, start, lineColor, temporary);

    // Etykieta w środku
    const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    const label = this.createLabel(distance, temporary);
    label.position.copy(midPoint);
    group.add(label);

    return group;
  }

  private createArrow(
    group: THREE.Group,
    position: THREE.Vector3,
    targetPosition: THREE.Vector3,
    color: number,
    temporary: boolean
  ): void {
    // Znak architektoniczny - ukośna kreska pod kątem 45°
    const direction = new THREE.Vector3().subVectors(targetPosition, position).normalize();
    
    const tickLength = 0.12; // Długość kreski
    const tickWidth = 0.015; // Grubość kreski
    
    // Oblicz kierunek prostopadły do linii wymiaru
    const perpendicular = new THREE.Vector3();
    if (Math.abs(direction.y) < 0.99) {
      perpendicular.crossVectors(direction, new THREE.Vector3(0, 1, 0)).normalize();
    } else {
      perpendicular.crossVectors(direction, new THREE.Vector3(1, 0, 0)).normalize();
    }
    
    // Utwórz ukośną kreskę (45° od kierunku wymiaru)
    const tickStart = position.clone()
      .add(perpendicular.clone().multiplyScalar(tickLength / 2))
      .sub(direction.clone().multiplyScalar(tickLength / 2));
    
    const tickEnd = position.clone()
      .sub(perpendicular.clone().multiplyScalar(tickLength / 2))
      .add(direction.clone().multiplyScalar(tickLength / 2));
    
    // Utwórz geometrię linii dla kreski
    const tickGeometry = new THREE.BufferGeometry().setFromPoints([tickStart, tickEnd]);
    const tickMaterial = new THREE.LineBasicMaterial({
      color: color,
      linewidth: 3,
      transparent: temporary,
      opacity: temporary ? 0.7 : 1,
      depthTest: false,
      depthWrite: false
    });
    
    const tick = new THREE.Line(tickGeometry, tickMaterial);
    tick.renderOrder = 998;
    
    group.add(tick);
  }

  private createLabel(distance: number, temporary: boolean): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return new THREE.Sprite();

    // Zwiększ rozdzielczość dla lepszej jakości
    const scale = 4;
    canvas.width = 256 * scale;
    canvas.height = 80 * scale;

    // Tło z gradientem i obramowaniem
    const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
    if (temporary) {
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      gradient.addColorStop(1, 'rgba(240, 250, 245, 0.95)');
    } else {
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
      gradient.addColorStop(1, 'rgba(245, 248, 255, 0.98)');
    }

    // Zaokrąglony prostokąt
    const radius = 12 * scale;
    const padding = 8 * scale;
    this.roundRect(context, padding, padding, canvas.width - 2 * padding, canvas.height - 2 * padding, radius);
    context.fillStyle = gradient;
    context.fill();

    // Obramowanie
    context.strokeStyle = temporary ? 'rgba(76, 175, 80, 0.4)' : 'rgba(33, 150, 243, 0.5)';
    context.lineWidth = 3 * scale;
    this.roundRect(context, padding, padding, canvas.width - 2 * padding, canvas.height - 2 * padding, radius);
    context.stroke();

    // Cień na tekście dla lepszej czytelności
    context.shadowColor = 'rgba(0, 0, 0, 0.2)';
    context.shadowBlur = 4 * scale;
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 2 * scale;

    // Tekst
    context.font = `Bold ${56 * scale}px Inter, Arial, sans-serif`;
    context.fillStyle = '#1f2937';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(`${distance.toFixed(2)}m`, canvas.width / 2, canvas.height / 2);

    // Usuń cień dla kolejnych operacji
    context.shadowColor = 'transparent';

    // Utwórz sprite
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false
    });
    
    const sprite = new THREE.Sprite(spriteMaterial);
    // Zmniejsz rozmiar sprite'a
    sprite.scale.set(0.8, 0.25, 1);
    sprite.renderOrder = 1000;

    return sprite;
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  public clear(): void {
    this.points = [];
    
    // Usuń wszystkie pomiary
    this.measurements.forEach((group) => this.scene.remove(group));
    this.measurements = [];
    
    // Usuń wszystkie markery
    this.markers.forEach((marker) => this.scene.remove(marker));
    this.markers = [];
    
    // Usuń podgląd
    this.clearPreview();
    this.clearSnapMarker();
    this.clearSnapPointMarkers();
    this.clearReferenceEdge();
    
    console.log('📏 All measurements cleared');
  }

  public enable(): void {
    this.enabled = true;
    this.points = [];
    console.log('📏 Dimension tool enabled');
  }

  public disable(): void {
    this.enabled = false;
    this.points = [];
    this.clearPreview();
    this.clearSnapMarker();
    this.clearSnapPointMarkers();
    this.clearReferenceEdge();
    console.log('📏 Dimension tool disabled');
  }

  private clearReferenceEdge(): void {
    if (this.referenceEdge?.line) {
      this.scene.remove(this.referenceEdge.line);
    }
    this.referenceEdge = null;
    this.isSelectingEdge = false;
  }

  // Anulowanie bieżącego wymiaru (ESC)
  public cancelCurrentMeasurement(): void {
    if (this.points.length > 0) {
      console.log('📏 Canceling current measurement');
      
      // Usuń ostatni marker jeśli istnieje
      if (this.markers.length > 0) {
        const lastMarker = this.markers.pop();
        if (lastMarker) {
          this.scene.remove(lastMarker);
        }
      }
      
      // Wyczyść punkty i podgląd
      this.points = [];
      this.clearPreview();
      this.clearSnapMarker();
    }
  }

  // Zaznaczanie wymiaru do usunięcia (Ctrl + kliknięcie)
  public handleRightClick(event: MouseEvent, objects: THREE.Object3D[]): THREE.Group | null {
    console.log('🔍 handleRightClick called');
    
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    console.log('🔍 Mouse position:', mouse.x.toFixed(3), mouse.y.toFixed(3));
    this.raycaster.setFromCamera(mouse, this.camera);
    
    // Sprawdź czy kliknięto w jakiś wymiar
    let nearestMeasurement: THREE.Group | null = null;
    let minDistance = 5.0; // Bardzo duży próg dla łatwiejszego klikania
    
    console.log('🔍 Checking', this.measurements.length, 'measurements for selection');

    this.measurements.forEach((group) => {
      // Sprawdź odległość od każdego dziecka w grupie
      group.children.forEach((child) => {
        if (child instanceof THREE.Line) {
          // Dla linii - sprawdź raycast
          const intersects = this.raycaster.intersectObject(child, false);
          if (intersects.length > 0) {
            const distance = intersects[0].distance;
            console.log('📏 Line intersect at distance:', distance);
            if (distance < minDistance) {
              minDistance = distance;
              nearestMeasurement = group;
            }
          }
        } else if (child instanceof THREE.Mesh) {
          // Dla mesh (markery, strzałki)
          const intersects = this.raycaster.intersectObject(child, false);
          if (intersects.length > 0) {
            const distance = intersects[0].distance;
            console.log('📏 Mesh intersect at distance:', distance);
            if (distance < minDistance) {
              minDistance = distance;
              nearestMeasurement = group;
            }
          }
        } else if (child instanceof THREE.Sprite) {
          // Dla sprite'ów (etykiety) - sprawdź odległość 2D na ekranie
          const spritePos = child.position.clone();
          spritePos.project(this.camera);
          
          const distance2D = Math.sqrt(
            Math.pow(spritePos.x - mouse.x, 2) + 
            Math.pow(spritePos.y - mouse.y, 2)
          );
          
          // Jeśli kliknięcie jest blisko sprite'a (w promieniu 0.1 w przestrzeni NDC)
          if (distance2D < 0.15) {
            console.log('📏 Sprite clicked at 2D distance:', distance2D);
            // Użyj odległości 3D jako priorytetu
            const distance3D = this.raycaster.ray.distanceToPoint(child.position);
            if (distance3D < minDistance) {
              minDistance = distance3D;
              nearestMeasurement = group;
            }
          }
        }
      });
    });

    if (nearestMeasurement) {
      console.log('📏 Measurement found for selection!');
    } else {
      console.log('📏 No measurement found near click');
    }

    return nearestMeasurement;
  }

  public deleteMeasurement(measurement: THREE.Group): void {
    const index = this.measurements.indexOf(measurement);
    if (index > -1) {
      this.scene.remove(measurement);
      this.measurements.splice(index, 1);
      console.log('📏 Measurement deleted');
    }
  }

  // Usunięcie bez powiadamiania (dla undo/redo)
  public deleteMeasurementSilent(measurement: THREE.Group): void {
    const index = this.measurements.indexOf(measurement);
    if (index > -1) {
      this.scene.remove(measurement);
      this.measurements.splice(index, 1);
    }
  }

  // Przywracanie wymiaru (dla undo/redo)
  public restoreMeasurement(data: { group: THREE.Group; start: THREE.Vector3; end: THREE.Vector3 }): void {
    this.scene.add(data.group);
    this.measurements.push(data.group);
  }

  // Pobierz dane konkretnego wymiaru (dla zapisania w historii)
  public getMeasurementData(group: THREE.Group): { group: THREE.Group; start: THREE.Vector3; end: THREE.Vector3 } | null {
    // Znajdź punkty start i end z grupy
    let start: THREE.Vector3 | null = null;
    let end: THREE.Vector3 | null = null;
    
    group.children.forEach((child) => {
      if (child instanceof THREE.Mesh && child.geometry instanceof THREE.SphereGeometry) {
        if (!start) {
          start = child.position.clone();
        } else if (!end) {
          end = child.position.clone();
        }
      }
    });
    
    if (!start || !end) {
      // Fallback - znajdź punkty z linii
      group.children.forEach((child) => {
        if (child instanceof THREE.Line) {
          const positions = child.geometry.getAttribute('position');
          if (positions && positions.count >= 2) {
            start = new THREE.Vector3().fromBufferAttribute(positions, 0);
            end = new THREE.Vector3().fromBufferAttribute(positions, 1);
          }
        }
      });
    }
    
    return start && end ? { group: group, start: start.clone(), end: end.clone() } : null;
  }

  // Pobierz dane ostatniego wymiaru (dla zapisania w historii)
  public getLastMeasurementData(): { group: THREE.Group; start: THREE.Vector3; end: THREE.Vector3 } | null {
    if (this.measurements.length === 0) return null;
    const lastGroup = this.measurements[this.measurements.length - 1];
    return this.getMeasurementData(lastGroup);
  }

  // Podświetlanie wymiaru (do zaznaczania przed usunięciem)
  public highlightMeasurement(measurement: THREE.Group, highlight: boolean): void {
    const highlightColor = 0xFF0000; // Czerwony dla zaznaczenia do usunięcia
    const normalColor = 0x2196F3; // Niebieski normalny kolor
    
    measurement.children.forEach((child) => {
      if (child instanceof THREE.Line) {
        const material = child.material as THREE.LineBasicMaterial;
        material.color.setHex(highlight ? highlightColor : normalColor);
      } else if (child instanceof THREE.Mesh) {
        const material = child.material as THREE.MeshBasicMaterial;
        material.color.setHex(highlight ? highlightColor : normalColor);
      }
    });
  }

  // Metoda do resetowania krawędzi odniesienia (wywoływana gdy zmienia się tryb)
  public resetReferenceEdge(): void {
    this.clearReferenceEdge();
    if (this.alignToEdgeMode !== 'none') {
      console.log('📏 Click on an edge to set as reference');
    }
  }

  // Animacja snap markera
  public updateSnapMarker(): void {
    if (this.snapMarker) {
      const scale = 1 + Math.sin(Date.now() * 0.01) * 0.2;
      this.snapMarker.scale.setScalar(scale);
    }
  }

  // Aktualizacja wymiarów - skalowanie etykiet względem kamery
  public update(): void {
    // Aktualizuj wszystkie pomiary
    this.measurements.forEach((group) => {
      group.children.forEach((child) => {
        if (child instanceof THREE.Sprite) {
          this.updateSpriteScale(child);
        }
      });
    });

    // Aktualizuj podgląd tymczasowy
    if (this.tempGroup) {
      this.tempGroup.children.forEach((child) => {
        if (child instanceof THREE.Sprite) {
          this.updateSpriteScale(child);
        }
      });
    }

    // Aktualizuj snap marker
    this.updateSnapMarker();
    
    // Animuj małe kwadraty punktów snap (obracanie)
    const time = Date.now() * 0.002;
    this.snapPointMarkers.forEach((marker) => {
      const offset = (marker as any).animationOffset || 0;
      marker.rotation.x = time + offset;
      marker.rotation.y = time + offset;
      marker.rotation.z = time * 0.5 + offset;
      
      // Lekka pulsacja
      const scale = 1 + Math.sin(time * 2 + offset) * 0.2;
      marker.scale.setScalar(scale);
    });
  }

  private updateSpriteScale(sprite: THREE.Sprite): void {
    // Oblicz odległość od kamery
    const distance = sprite.position.distanceTo(this.camera.position);
    
    // Podstawowa skala sprite'a
    const baseScaleX = 0.8;
    const baseScaleY = 0.25;
    
    // Współczynnik skalowania na podstawie odległości
    // Im dalej, tym większy sprite (aby wyglądał na stałej wielkości)
    const scaleFactor = distance * 0.15;
    
    // Zastosuj skalowanie
    sprite.scale.set(
      baseScaleX * scaleFactor,
      baseScaleY * scaleFactor,
      1
    );
  }
}

