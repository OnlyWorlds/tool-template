# OnlyWorlds Template Modification Guide

**Transform this template for any world-building purpose**

This guide shows you how to modify the template's three independent layers to build exactly what you need.

## Quick Reference

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
 



## **Performance & Error Handling**

**Large datasets (1000+ elements)**:
- Use `requestAnimationFrame` for DOM updates (already used in viewer.ts)
- Implement pagination: display 50-100 elements at a time
- Cache API responses: `const cache = new Map()`

**Error handling pattern** (uses Result types, not exceptions):
```typescript
// Template uses Result pattern - check .success property
const result = await apiService.getElements(type);
if (result.success) {
    // Handle success case
    this.displayElements(result.data);
} else {
    // Handle error using typed error system
    const errorState = mapApiErrorToUiState(result.error, retryHandler);
    renderErrorState(errorState, container);
}

// Or use pattern matching helper:
matchApiResult(result, {
    success: (data) => this.displayElements(data),
    authError: (message) => handleAuthError(message),
    networkError: (message, statusCode) => handleNetworkError(message, statusCode),
    // ... other error types
});
```

---

## **Quick Fixes**

**❌ Build fails**: Add `.js` to imports, check import map, use `as any` for library types
**❌ Blank page**: Check console (F12), verify ELEMENT_TYPES is array
**❌ API errors**: Check auth credentials, ensure world access

---

## **Decision Matrix** - Choose Pattern by User Request

| User Request Type | Pattern | Files to Modify | Files to Keep | Validation |
|---|---|---|---|---|
| "CLI tool", "data script", "API only" | **Remove UI** | Delete: index.html, css/, src/viewer.ts, src/editor.ts | Keep: src/auth.ts, src/api.ts, src/compatibility.ts, package.json | `npm run build` compiles without UI |
| "Character manager", "location atlas" | **Focus Types** | Modify: src/compatibility.ts ELEMENT_TYPES | Keep: All other files | UI shows only specified types |
| "Add visualization", "integrate X" | **Enhance** | Add: src/features/, Modify: import map | Keep: All existing functionality | Original CRUD + new features work |
| "React app", "Vue conversion" | **Replace UI** | Replace: All UI files | Keep: src/auth.ts, src/api.ts, src/compatibility.ts | API calls work in new framework |
| "Game engine", "mobile app" | **Custom Build** | Use: API layer only | Keep: Authentication and data access | API integration successful |

## **File Safety Rules**

**❌ Never remove**: `src/compatibility.ts`, `src/auth.ts`, `@onlyworlds/sdk`
**✅ Safe to remove**: `src/theme.ts`, `src/import-export.ts`, CSS files, `index.html` (if replacing UI)

**Dependency chain**:
```
compatibility.ts ← api.ts ← viewer.ts, editor.ts ← app.ts
auth.ts ← api.ts
```

## **UI Customization**

**Page identity**: Update `<title>` and main heading in `index.html`

**Theme styling**: Modify CSS custom properties in `css/styles.css`
```css
:root {
    --brand-primary: #your-color;
    --brand-secondary: #your-accent;
    --status-error: #your-error-color;
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
.status-active { color: var(--brand-primary); }
.priority-high { border-left: 3px solid var(--status-error); }
.category-special { background: var(--bg-secondary); }
```

## **Implementation Patterns**

**API-only tool**: Remove UI files, keep API layer
```bash
rm index.html css/ src/viewer.ts src/editor.ts src/inline-editor.ts src/app.ts
```

**Focus element types**: Edit `src/compatibility.ts` ELEMENT_TYPES
```typescript
// Before: All 22 element types
get ELEMENT_TYPES() { return Object.keys(FIELD_SCHEMA).sort(); }
// After: Your specific types
get ELEMENT_TYPES() { return ['character', 'location', 'event']; }
```

**Add external library**:
```bash
# 1. Install
npm install library-name

# 2. Add to import map in index.html (after line with @onlyworlds/sdk):
"library-name": "./node_modules/library-name/dist/index.js"

# 3. Create feature module: src/features/feature-name.ts

# 4. Import in src/viewer.ts:
import { Feature } from './features/feature-name.js';

# 5. Handle TypeScript types:
npm install @types/library-name  # or use 'as any'
```

## **Validation**
```bash
npm run build && npm start  # Must work
# Check browser console (F12) - no errors
# Test auth + CRUD operations
```
 