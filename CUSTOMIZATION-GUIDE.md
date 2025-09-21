# OnlyWorlds Tool Template - Customization Guide

**For developers and AI assistants building on this template**

This template is designed as **modular building blocks** you can mix, match, and extend. Here are the most common customization patterns.

## 🏗️ Architecture Overview

The template has **three main layers**:

```
┌─── UI Layer ────────────────────────────┐
│ • viewer.js (display elements)         │
│ • editor.js (create new elements)      │
│ • inline-editor.js (edit in place)     │
│ • field-renderer.js (input types)      │
│ • auto-save.js (save management)       │
│ • theme.js (dark/light mode)           │
└─────────────────────────────────────────┘
┌─── API Layer ───────────────────────────┐
│ • api.js (CRUD operations)             │
│ • auth.js (authentication)             │
│ • relationship-editor.js (UUID links)  │
│ • import-export.js (JSON export)       │
└─────────────────────────────────────────┘
┌─── Foundation Layer ────────────────────┐
│ • constants.js (element types, icons)  │
│ • field-types.js (field definitions)   │
│ • type-manager.js (supertype/subtype)  │
└─────────────────────────────────────────┘
```

## 🎯 Common Customization Patterns

### Pattern 1: API-Only Integration
**Use case**: Embed OnlyWorlds data into existing applications, build CLIs, or create backend services.

**Keep these files**:
```
✅ auth.js          # Authentication
✅ api.js           # CRUD operations
✅ constants.js     # Element types
✅ field-types.js   # Field definitions
```

**Remove these files**:
```
❌ All UI files (viewer.js, editor.js, inline-editor.js, etc.)
❌ theme.js
❌ app.js (main UI controller)
❌ index.html, css/
```

**Example usage**:
```javascript
import { authManager } from './js/auth.js';
import OnlyWorldsAPI from './js/api.js';

const api = new OnlyWorldsAPI(authManager);
await authManager.authenticate(apiKey, pin);
const characters = await api.getElements('character');
```

### Pattern 2: Different UI Framework
**Use case**: Replace the vanilla JS UI with React, Vue, Svelte, or any modern framework.

**Keep these files**:
```
✅ auth.js, api.js, constants.js, field-types.js
✅ relationship-editor.js (for UUID handling)
✅ auto-save.js (adapt the logic)
```

**Replace these files**:
```
🔄 viewer.js → YourFrameworkViewer.jsx/vue/svelte
🔄 editor.js → YourFrameworkEditor.jsx/vue/svelte
🔄 inline-editor.js → YourFrameworkInlineEditor.jsx/vue/svelte
🔄 app.js → YourFrameworkApp.jsx/vue/svelte
```

**Pro tip**: The field-types.js and constants.js contain all the OnlyWorlds schema knowledge your new UI will need.

**For TypeScript users**: Consider migrating to [@onlyworlds/sdk](https://www.npmjs.com/package/@onlyworlds/sdk) which provides full type safety and TypeScript definitions for all OnlyWorlds elements.

### Pattern 3: Specialized Tool (Single Element Type)
**Use case**: Build a character manager, location explorer, or timeline viewer.

**Modify these files**:
```
🔄 constants.js → Filter to your element types
🔄 viewer.js → Remove category switching
🔄 editor.js → Simplify for single type
```

**Example**: Character-only tool
```javascript
// In constants.js
export const ALLOWED_TYPES = ['character'];
export const ELEMENT_TYPES = ['character']; // Remove other 21 types
```

### Pattern 4: Enhanced Features
**Use case**: Add maps, timelines, advanced search, AI generation, or custom visualizations.

**Extend these areas**:
```
📁 js/visualizations/     # New folder for maps, charts, timelines
📁 js/ai-features/        # New folder for AI-powered tools
📁 js/advanced-search/    # New folder for complex queries
🔄 viewer.js              # Add visualization modes
🔄 constants.js           # Add new field types or metadata
```

**The API layer stays the same** - just add new UI capabilities on top.

### Pattern 5: Embedded Widget
**Use case**: Add OnlyWorlds element picker to your existing app.

**Create a minimal version**:
```
✅ auth.js, api.js, constants.js
✅ relationship-editor.js (for the picker UI)
❌ Full viewer/editor interfaces
🔄 Create ElementPicker.js with just the selection UI
```

## 🤖 LLM Development Guidelines

### For AI Assistants Working on This Project

**When asked to modify this template:**

1. **Identify the user's pattern** from the 5 patterns above
2. **Preserve the API layer** unless specifically asked to change it
3. **Respect module boundaries** - each .js file has a clear purpose
4. **Check dependencies** before removing files:
   - `constants.js` is needed by almost everything
   - `field-types.js` is needed for form handling
   - `auth.js` is needed for any API access

**Common requests and responses:**

| User Request | Recommended Approach |
|-------------|---------------------|
| "Remove the UI, just keep API access" | Use Pattern 1: API-Only |
| "Convert to React/Vue" | Use Pattern 2: Different UI Framework |
| "Make a character-only tool" | Use Pattern 3: Specialized Tool |
| "Add a map view" | Use Pattern 4: Enhanced Features |
| "I want an element picker for my app" | Use Pattern 5: Embedded Widget |

### File Dependencies Map
**Before removing any file, check these dependencies:**

```
constants.js ← (used by) api.js, viewer.js, editor.js, field-types.js
field-types.js ← (used by) inline-editor.js, field-renderer.js, api.js
auth.js ← (used by) api.js, app.js
api.js ← (used by) viewer.js, editor.js, auto-save.js, app.js
```

**Safe to remove independently**: theme.js, import-export.js, type-manager.js

**Remove carefully**: Any file imported by others

## 🎨 Styling and Themes

**CSS is modular too**:
```
css/styles.css contains:
• CSS variables for easy theming
• Component-based styles (.element-list, .modal, etc.)
• Responsive design patterns
```

**To customize appearance**:
1. **Simple**: Modify CSS variables at the top of styles.css
2. **Advanced**: Replace entire sections (keep .element-list structure)
3. **Complete**: Replace with your own CSS framework

## 🔧 Common Extensions

### Adding New Field Types
1. Update `field-types.js` with new type definition
2. Add rendering logic to `field-renderer.js`
3. Update `constants.js` if needed for element-specific fields

### Adding New Element Types
1. OnlyWorlds supports custom element types beyond the standard 22
2. Add to `ELEMENT_TYPES` in `constants.js`
3. API will handle it automatically

### Adding Authentication Methods
1. Extend `auth.js` with new authentication patterns
2. Keep the `getHeaders()` interface for API compatibility
3. Update `app.js` authentication flow
 
 