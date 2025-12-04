# Views Feature - Modular Architecture

This directory contains the modular, SOLID-compliant implementation of the Views Feature for managing 2D views in IFC models.

## 📁 Structure

```
views/
├── index.ts                    # Public API exports
├── ViewsManager.ts             # Facade/Orchestrator
├── ViewRepository.ts           # Data storage (Repository Pattern)
├── ViewFactory.ts              # View creation (Factory Pattern)
├── CameraManager.ts            # Camera state management
├── ClippingPlaneService.ts     # Clipping plane operations
├── SectionCuttingService.ts   # Section cutting logic
└── SectionHelperService.ts     # Visual helper management
```

## 🚀 Quick Start

```typescript
import { enableViewsFeature, ViewsManager } from "../utils/views";

// Initialize
const viewsManager = enableViewsFeature(viewer, scene, camera, raycaster);

// Create a section view
const view = await viewsManager.createSectionView(normal, point, {
  name: "My Section",
  range: 20
});

// Open the view
await viewsManager.openView(view.id);
```

## 📖 Documentation

For detailed documentation, see:
- [Full Documentation](../../../../docks/FRONTEND_VIEWS_REFACTORING.md)

## 🏗️ Architecture Principles

- **Single Responsibility**: Each class has one reason to change
- **Open/Closed**: Open for extension, closed for modification
- **Dependency Inversion**: Depend on abstractions, not concretions
- **Repository Pattern**: Data access abstraction
- **Factory Pattern**: Object creation encapsulation
- **Facade Pattern**: Simplified interface to complex subsystem

## 🔧 Services

### ViewsManager
Main orchestrator - use this for most operations.

### ViewRepository
Data storage - manages view persistence.

### ViewFactory
View creation - creates different types of views.

### CameraManager
Camera operations - saves/restores camera state.

### ClippingPlaneService
Clipping planes - manages section view clipping.

### SectionCuttingService
Section cutting - applies/removes section cuts.

### SectionHelperService
Visual helpers - manages green plane helpers.

## 📝 Notes

- All services follow SOLID principles
- Backward compatible with old `viewsFeature.ts` API
- Fully typed with TypeScript
- Easy to test and extend
