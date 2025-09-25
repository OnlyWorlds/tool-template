# OnlyWorlds Tool Template - Customization Guide

**Transform this template for any world-building purpose**

This guide shows you how to modify the template's three independent layers to build exactly what you need.

## LLM Quick Reference

**Before any modification:**
```bash
# Verify current state
npm run build && npm start  # Must work before changes
```

**Most common request: "Add [visualization/feature] to the template"**
```bash
# 1. Install library (example: D3.js)
npm install d3

# 2. Add to import map in index.html after line 47:
"d3": "./node_modules/d3/dist/d3.min.js"

# 3. Create feature file
# src/features/data-visualization.ts

# 4. Import in src/viewer.ts after line 12:
import { DataVisualization } from './features/data-visualization.js';

# 5. Validate
npm run build && npm start
```

---

## Architecture

```
UI Layer      → src/viewer.ts, src/editor.ts, src/inline-editor.ts, index.html, css/
API Layer     → src/api.ts, src/auth.ts, src/import-export.ts
Foundation    → src/compatibility.ts, @onlyworlds/sdk, package.json
```

**Key principle**: Each layer can be modified independently without breaking the others.

---

## Common Customization Approaches

### **Remove Features (API-Only Tools)**
For CLIs, bots, data processing scripts:

**Keep**: `src/auth.ts`, `src/api.ts`, `src/compatibility.ts`, `package.json`, `tsconfig.json`
**Remove**: All UI files (`index.html`, `css/`, remaining `src/` files)

```typescript
// Example: World backup script
import { authManager } from './dist/auth.js';
import { apiService } from './dist/api.js';

await authManager.authenticate(apiKey, pin);
const data = await apiService.getElements('character');
// Process data...
```

### **Focus on Specific Element Types**
For character managers, location atlases, timeline tools:

**Modify**: `src/compatibility.ts`
```typescript
// Character-focused tool
get ELEMENT_TYPES() {
    return ['character', 'family', 'species'];
}

// Geography tool
get ELEMENT_TYPES() {
    return ['location', 'zone', 'map', 'pin'];
}

// Timeline tool
get ELEMENT_TYPES() {
    return ['event', 'narrative'];
}
```

**Optional UI cleanup**:
```css
/* Hide sidebar for single-type tools */
.sidebar { display: none; }
.element-list-container { margin-left: 0; }
```

### **Add New Capabilities**
For maps, graphs, AI features, real-time collaboration:

**Extend**: Create new files in `src/features/` or `src/visualizations/`
**Integrate**: Import and use in `src/viewer.ts` or `src/app.ts`
**Dependencies**: Add to `package.json`, update import map in `index.html`

```typescript
// Example: Add map visualization
// src/features/world-map.ts
import L from 'leaflet';
export class WorldMap {
    async init(container: HTMLElement) {
        const map = L.map(container);
        const locations = await apiService.getElements('location');
        // Plot locations...
    }
}

// Integrate in src/viewer.ts
import { WorldMap } from './features/world-map.js';
```

### **Replace UI Framework**
For React, Vue, Svelte, mobile apps:

**Keep**: `src/auth.ts`, `src/api.ts`, `src/compatibility.ts` (API layer intact)
**Replace**: All UI files with your framework's components
**Access data**: Import API services into your components

```typescript
// React example
import { apiService } from './api';
export function CharacterList() {
    const [characters, setCharacters] = useState([]);
    useEffect(() => {
        apiService.getElements('character').then(setCharacters);
    }, []);
    // Render...
}
```

### **Build Something Unique**
For game engines, analytics dashboards, text adventures:

**Approach**: Treat OnlyWorlds as your data backend, build custom frontend
**Strategy**: Keep authentication and API access, replace everything else
**Benefit**: Full creative freedom while maintaining data compatibility

---

## Implementation Steps

### 1. Analyze Current Structure
```bash
# See what files use what
grep -r "ELEMENT_TYPES" src/
grep -r "import.*compatibility" src/

# Verify current build
npm run build
```

### 2. Make Changes
- Modify files as needed
- Keep original code in comments for rollback
- Add new dependencies to `package.json` if needed

### 3. Test Changes
```bash
npm run build       # Must compile without errors
npm start          # Must serve without errors
# Test in browser - check console (F12) for errors
```

### 4. Verify Functionality
- Authentication still works
- Element operations (create, read, update, delete) still work
- New features integrate properly
- Performance remains good (< 2 second load)

---

## Critical Dependencies

**Never remove without replacement**:
- `src/compatibility.ts` - Used by api.ts, viewer.ts, editor.ts
- `src/auth.ts` - Required for OnlyWorlds API access
- `@onlyworlds/sdk` - Provides type definitions and API methods

**Safe to remove**: `src/theme.ts`, `src/import-export.ts`

**File dependency chain**:
```
compatibility.ts ← api.ts ← viewer.ts, editor.ts ← app.ts
auth.ts ← api.ts
```

---

## Adding External Libraries

### 1. Install dependency
```bash
npm install leaflet vis-network d3 # etc.
```

### 2. Add to import map (index.html)
```json
{
    "imports": {
        "@onlyworlds/sdk": "./node_modules/@onlyworlds/sdk/dist/index.mjs",
        "leaflet": "./node_modules/leaflet/dist/leaflet-src.esm.js"
    }
}
```

### 3. Import in TypeScript
```typescript
import L from 'leaflet';
```

### 4. Handle TypeScript types
```bash
# For libraries without built-in types
npm install @types/leaflet @types/d3

# Most modern libraries include types
# For complex type issues, use temporary workaround:
const options = {
    edges: { smooth: { enabled: true } }
} as any;
```

---

## Performance & Error Handling

### Large Datasets (1000+ elements)
- Use `requestAnimationFrame` for DOM updates
- Implement pagination for visualizations
- Cache API responses: `const cache = new Map()`
- Limit concurrent calls: `Promise.all(chunks)`

### Error Handling Pattern
```typescript
// Graceful degradation
try {
    const data = await apiService.getElements(type);
    return data.success ? data.data : [];
} catch (error) {
    console.warn(`Failed to load ${type}:`, error);
    return []; // Don't crash, return empty
}

// UI error boundaries
if (container && this.feature) {
    try {
        await this.feature.init();
    } catch (error) {
        container.innerHTML = '<div class="error">Feature failed to load</div>';
    }
}
```

### Mobile Optimization
```css
/* Touch-friendly controls */
.controls button {
    min-height: 44px; /* Apple's touch target */
    padding: 12px;
}

/* Prevent zoom on double-tap */
.network-graph {
    touch-action: pan-x pan-y;
}

/* Responsive breakpoints */
@media (max-width: 768px) {
    .graph-view-container { flex-direction: column; }
    .info-panel { width: 100%; }
}
```

---

## Testing Your Modifications

**Build validation**:
```bash
npm run validate    # TypeScript check
npm run build      # Compilation
npm start         # Server start
```

**Functionality validation**:
- All buttons/features work
- No console errors (F12)
- API operations successful
- Performance acceptable

**Rollback if needed**:
```bash
# Restore from comments or git
git checkout -- src/compatibility.ts
npm run build
```

---

## Common Issues

**Build fails**: Check TypeScript imports use `.js` extensions
**Blank page**: Check browser console, verify API credentials, ensure ELEMENT_TYPES returns array
**Changes not visible**: Edit `src/` not `dist/`, run `npm run build` after changes

### **Quick Fix Reference** - For Common Issues

**❌ Build Fails**
- Missing `.js` extension in imports → Add `.js` to all relative imports
- Module not found → Check import map in index.html, run `npm install`
- TypeScript errors → Use `as any` for complex third-party types

**❌ Runtime Fails**
- Blank page → Check console (F12), verify `ONLYWORLDS.ELEMENT_TYPES` is array
- API errors → Verify auth credentials, check network tab for 403/401
- Elements not loading → Ensure ELEMENT_TYPES includes target type

**❌ Performance Issues**
- Slow with 1000+ elements → Use `requestAnimationFrame`, implement pagination
- Memory leaks → Clean up event listeners, use WeakMap for references

---

## Recommended Libraries

**Maps**: Leaflet, Mapbox GL JS, OpenLayers
**Graphs**: vis-network, D3.js, Cytoscape.js
**Charts**: Chart.js, Recharts, Observable Plot
**UI Frameworks**: React, Vue, Svelte, Angular
**Utilities**: date-fns, lodash-es, uuid
**Real-time**: Socket.io, Pusher, Ably

---

## For AI Assistants

### **Decision Matrix** - Choose Pattern by User Request

| User Request Type | Pattern | Files to Modify | Files to Keep | Validation |
|---|---|---|---|---|
| "CLI tool", "data script", "API only" | **Remove UI** | Delete: index.html, css/, src/viewer.ts, src/editor.ts | Keep: src/auth.ts, src/api.ts, src/compatibility.ts, package.json | `npm run build` compiles without UI |
| "Character manager", "location atlas" | **Focus Types** | Modify: src/compatibility.ts ELEMENT_TYPES | Keep: All other files | UI shows only specified types |
| "Add visualization", "integrate X" | **Enhance** | Add: src/features/, Modify: package.json imports | Keep: All existing functionality | Original CRUD + new features work |
| "React app", "Vue conversion" | **Replace UI** | Replace: All UI files | Keep: src/auth.ts, src/api.ts, src/compatibility.ts | API calls work in new framework |
| "Game engine", "mobile app" | **Custom Build** | Use: API layer only | Keep: Authentication and data access | API integration successful |

### **File Dependency Rules** - Critical for Safe Modifications

**❌ NEVER remove without replacement:**
- `src/compatibility.ts` - Required by api.ts, viewer.ts, editor.ts
- `src/auth.ts` - Required for all OnlyWorlds API access
- `@onlyworlds/sdk` in package.json - Provides types and API methods

**✅ Safe to remove/modify:**
- `src/theme.ts`, `src/import-export.ts` (optional features)
- All CSS files (visual only)
- `index.html` (if replacing UI framework)

**Dependency chain (do not break):**
```
compatibility.ts ← api.ts ← viewer.ts, editor.ts ← app.ts
auth.ts ← api.ts
```

### **Common Implementation Patterns**

**Pattern: Remove UI → API-only tool**
```bash
# Files to keep
keep: src/auth.ts src/api.ts src/compatibility.ts package.json tsconfig.json
# Files to remove
remove: index.html css/ src/viewer.ts src/editor.ts src/inline-editor.ts src/app.ts
# Validation
npm run build && node -e "import('./dist/api.js').then(api => console.log('API ready'))"
```

**Pattern: Focus on specific element types**
```typescript
// Modify src/compatibility.ts
get ELEMENT_TYPES() {
    return ['character', 'family'];  // Instead of Object.keys(FIELD_SCHEMA).sort()
}
```

**Pattern: Add external library**
```bash
# 1. Install
npm install library-name
# 2. Add to import map in index.html
"library-name": "./node_modules/library-name/dist/index.js"
# 3. Create feature module
src/features/new-feature.ts
# 4. Import in src/viewer.ts
import { NewFeature } from './features/new-feature.js';
```

### **Validation Checklist** - Ensure Success

**Build validation:**
```bash
npm run validate  # TypeScript check - must pass
npm run build    # Compilation - must succeed
npm start       # Server start - must serve without errors
```

**Functionality validation:**
- ✅ Authentication works (can connect to OnlyWorlds API)
- ✅ Element operations work (create, read, update, delete)
- ✅ New features integrate without breaking existing functionality
- ✅ No console errors in browser (F12 developer tools)
- ✅ Performance acceptable (< 2 second initial load)

**Common failure points to check:**
- Import statements use `.js` extensions (TypeScript requirement)
- Import map in index.html includes all new libraries
- ELEMENT_TYPES returns an array (not undefined/null)
- API credentials are valid and world exists

---

*The template is designed to be transformed. Use the OnlyWorlds API as your stable foundation and build anything on top.*