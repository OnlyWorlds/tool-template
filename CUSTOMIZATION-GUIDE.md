# OnlyWorlds Tool Template - Customization Guide

**Transform this template for any world-building purpose**

This guide shows you how to modify the template's three independent layers to build exactly what you need.

## LLM Quick Reference

**Before any modification:**
```bash
# Verify current state
npm run build && npm start  # Must work before changes
```

**Example: Add visualization library**
```bash
npm install d3
# Add to import map in index.html:
"d3": "./node_modules/d3/dist/d3.min.js"
# Create src/features/visualization.ts
# Import in src/viewer.ts:
import { Visualization } from './features/visualization.js';
# Validate:
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


---


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

# For complex type issues:
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
 

---


### **Quick Fixes**

**❌ Build fails**: Add `.js` to imports, check import map, use `as any` for library types
**❌ Blank page**: Check console (F12), verify ELEMENT_TYPES is array
**❌ API errors**: Check auth credentials, ensure world access
**❌ Slow loading**: Use `requestAnimationFrame`, pagination for 1000+ elements

---

## Common Libraries
**Visualization**: D3.js, vis-network, Chart.js, Leaflet
**UI Frameworks**: React, Vue, Svelte
**Utilities**: date-fns, lodash-es

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

### **Critical Files - Never Remove**
- `src/compatibility.ts` - Core integration layer
- `src/auth.ts` - API authentication
- `@onlyworlds/sdk` - Type definitions

**Safe to remove**: `src/theme.ts`, `src/import-export.ts`, CSS files, `index.html` (if replacing UI)

### **UI Customization**

**Page identity**: Update `<title>` and main heading in `index.html`

**Theme styling**: Modify CSS custom properties in `css/styles.css`
```css
:root {
    --primary-color: #your-color;
    --accent-color: #your-accent;
}
```

**Element display**: Add domain-specific logic in `src/viewer.ts` displayElements()
```typescript
// Add custom display elements
let customDisplay = '';
if (element.status || element.priority || element.category) {
    customDisplay = `<span class="custom-indicator">${element.status}</span>`;
}
// Insert in elementCard.innerHTML template
```

**Status styling**: Add domain-specific CSS classes
```css
.status-active { color: var(--success-color); }
.priority-high { border-left: 3px solid var(--danger-color); }
.category-special { background: var(--info-background); }
```

### **Implementation Patterns**

**API-only tool**: Remove UI files, keep API layer
```bash
rm index.html css/ src/viewer.ts src/editor.ts src/inline-editor.ts src/app.ts
```

**Focus element types**: Modify `src/compatibility.ts`
```typescript
// Before: All 22 element types
get ELEMENT_TYPES() { return Object.keys(FIELD_SCHEMA).sort(); }
// After: Your focused types
get ELEMENT_TYPES() { return ['type1', 'type2', 'type3']; }
```

**Add library**: Install → Import map → Feature module → Integrate
```bash
npm install library-name
# Add to index.html import map, create src/features/, import in viewer.ts
```

### **Validation**
```bash
npm run build && npm start  # Must work
# Check browser console (F12) - no errors
# Test auth + CRUD operations
```

---

*The template is designed to be transformed. Use the OnlyWorlds API as your stable foundation and build anything on top.*