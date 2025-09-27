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
Mode Layer    → src/modes/ (mode-router.ts, local-storage.ts, local-auth.ts)
UI Components → src/ui/ (import-dialog.ts, mode-indicator.ts)
API Layer     → src/api.ts, src/auth.ts, src/import-export.ts
AI Layer      → src/llm/ (responses-service.ts, responses-ui.ts, responses-config.ts)
Foundation    → src/compatibility.ts, @onlyworlds/sdk, package.json
```

**Key principle**: Each layer can be modified independently without breaking the others.

**Dual-Mode System**: The template supports both online (OnlyWorlds.com API) and offline (localStorage) modes through the Mode Layer.

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
**❌ Initialization race**: Template now waits for auth readiness before showing UI - very rare auth errors during startup are expected and harmless

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
**✅ Safe to remove**: `src/theme.ts`, `src/import-export.ts`, `src/llm/` (entire folder), CSS files, `index.html` (if replacing UI)
**⚠️ Remove carefully**: `src/modes/` (entire folder), `src/ui/` (entire folder) - only if you don't want dual-mode functionality

**Dependency chain**:
```
compatibility.ts ← api.ts ← viewer.ts, editor.ts ← app.ts
auth.ts ← api.ts
```

## **UI Customization**

**⚠️ Memory Leak Warning**: Never use `innerHTML = ''` to clear containers with event listeners:

```typescript
// ❌ Bad: Creates memory leaks
container.innerHTML = '';

// ✅ Good: Proper cleanup
while (container.firstChild) {
  container.removeChild(container.firstChild);
}
```

**⚠️ Middle Column Architecture Warning**: The `.element-list-container` is shared between the element viewer and AI chat. If you add new "modes" that replace this container's content, ensure proper restoration:

```typescript
// Bad: Just clearing content
container.innerHTML = '';

// Good: Restore expected DOM structure
container.innerHTML = `
  <div class="list-header">...</div>
  <div id="element-list" class="element-list">...</div>
`;
```

**Page identity**: Update `<title>` and main heading in `index.html`

**CSS Architecture**: The template uses 12 modular CSS files for granular customization:

*Foundation Files* (required):
- `css/01-base.css` - CSS variables, reset, utilities
- `css/02-auth.css` - Authentication bar and mode switching
- `css/03-layout.css` - Core layout, buttons, app structure
- `css/04-components.css` - Modals, forms, loading indicators
- `css/05-elements.css` - Element lists, cards, detail views
- `css/06-editor.css` - Complex inline editing system (644+ lines)

*Optional Files* (individually removable):
- `css/07-mobile.css` - Responsive styles (desktop-first approach)
- `css/08-import-export.css` - Import/Export functionality and JSON validation
- `css/09-chat.css` - AI Chat interface with message bubbles
- `css/10-context.css` - Context configuration panel with widgets
- `css/11-dual-mode.css` - Online/Local mode switching UI
- `css/12-export-modal.css` - Local mode export functionality

**Theme styling**: Modify CSS custom properties in `css/01-base.css`
```css
:root {
    --brand-primary: #your-color;
    --brand-secondary: #your-accent;
    --status-error: #your-error-color;
}
```

**Granular feature removal**: Delete individual CSS files to remove specific features (e.g., `css/09-chat.css` removes AI chat, `css/08-import-export.css` removes import/export)

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

# 6. If you get "bare specifier" errors, check browser console
# Add internal dependencies to import map as needed:
"library-name/internal/module": "./node_modules/library-name/internal/module.js"
```

## **Testing**

Uses **Vitest** (zero-config TypeScript + ES modules). Basic unit tests demonstrate SDK mocking, authentication flows, and data transformations. User should indicate their unit/integration testing preferences and requirements. 

**Key patterns:**
- `vi.mock('@onlyworlds/sdk')` - Mock SDK
- `vi.stubGlobal('localStorage')` - Mock browser APIs
- `await expect(promise).resolves.toBe()` - Async testing

**Add tests for your modifications:**
```bash
npm test              # Run tests
npm run test:watch    # Watch mode
```

## **AI Chat Layer (Optional)**

**Architecture**: OpenAI Responses API integration in `src/llm/` folder

**Remove AI features**:
```bash
# Complete removal
rm -rf src/llm/
rm css/09-chat.css css/10-context.css
# Remove chat toggle from viewer.ts (line with 'chat-toggle-btn')
# Remove import from app.ts (line with './llm/responses-ui.js')
# Remove CSS links from index.html
```

**Customize AI behavior**:
```bash
# Edit prompts and settings
nano src/llm/responses-config.ts
# Modify SYSTEM_PROMPT, AI_CONFIG, UI_LABELS
```

**Replace with different AI provider**:
```bash
# Keep UI layer
# Replace src/llm/responses-service.ts with new provider integration
# Update src/llm/responses-config.ts for new API requirements
```

**Environment setup**:
- No `.env` files needed - uses conversational API key setup
- Click robot icon → AI asks for OpenAI API key in chat → paste key directly
- API keys detected automatically, validated, and stored in browser localStorage
- Chat shows friendly setup messages if no key provided
- Conversations persist via OpenAI's server-side state management

---

## **Validation**
```bash
npm run build && npm start  # Must work
npm test                    # All tests pass
# Check browser console (F12) - no errors
```
 