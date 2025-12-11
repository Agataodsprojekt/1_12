# Viewer.tsx Refactoring Plan

## 📊 Current State
- **File Size**: 3889 lines
- **Main Component**: Single monolithic component
- **Issues**: Hard to maintain, test, and extend

## 🎯 Goal
Break down `Viewer.tsx` into smaller, maintainable modules following SOLID principles.

## 📋 Refactoring Strategy

### Phase 1: Custom Hooks ✅ (In Progress)
Extract business logic into reusable hooks:

1. ✅ **usePins** - Pin functionality (completed)
2. ⏳ **useDimensions** - Dimension tool logic
3. ⏳ **useVolume** - Volume measurement logic
4. ⏳ **useScissors** - Scissors tool logic
5. ⏳ **useViews** - Views management logic
6. ⏳ **useSelection** - Element selection logic
7. ⏳ **useViewer** - Viewer initialization and core setup

### Phase 2: Context API
Create shared context for viewer state:

- **ViewerContext** - Provides viewer, scene, camera to all components
- Reduces prop drilling
- Centralized state management

### Phase 3: Component Extraction
Break down UI into smaller components:

1. **Viewer3D** - Main 3D canvas container
2. **Toolbar** - Action bar with tool buttons
3. **PanelsContainer** - Container for all side panels
4. **ViewerControls** - Camera and view controls

### Phase 4: Main Component Refactoring
Refactor `Viewer.tsx` to:
- Use custom hooks
- Use context for shared state
- Compose smaller components
- Keep only orchestration logic

## 📁 Target Structure

```
frontend/src/
├── hooks/
│   ├── usePins.ts ✅
│   ├── useDimensions.ts
│   ├── useVolume.ts
│   ├── useScissors.ts
│   ├── useViews.ts
│   ├── useSelection.ts
│   └── useViewer.ts
├── contexts/
│   └── ViewerContext.tsx
├── components/
│   ├── Viewer3D.tsx
│   ├── Toolbar.tsx
│   ├── PanelsContainer.tsx
│   └── ViewerControls.tsx
└── pages/
    └── Viewer.tsx (refactored, ~500 lines)
```

## ✅ Benefits

1. **Maintainability**: Each hook/component has single responsibility
2. **Testability**: Hooks and components can be tested independently
3. **Reusability**: Hooks can be reused in other components
4. **Readability**: Smaller files are easier to understand
5. **Performance**: Better code splitting and lazy loading opportunities

## 🚀 Next Steps

1. Complete remaining custom hooks
2. Create ViewerContext
3. Extract UI components
4. Refactor main Viewer component
5. Test thoroughly
6. Update documentation

---

**Status**: Phase 1 in progress (usePins completed)
