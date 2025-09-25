# OnlyWorlds Tool Template - Customization Guide

**For developers and AI assistants building on this template**

This template is designed as **modular building blocks** you can mix, match, and extend. Here are the most common customization patterns.

## 🏗️ Architecture Overview

The template has **three main layers**:

```
┌─── UI Layer (TypeScript) ───────────────┐
│ • src/viewer.ts (display elements)     │
│ • src/editor.ts (create new elements)  │
│ • src/inline-editor.ts (edit in place) │
│ • src/field-renderer.ts (input types)  │
│ • src/auto-save.ts (save management)   │
│ • src/theme.ts (dark/light mode)       │
└─────────────────────────────────────────┘
┌─── API Layer (TypeScript + SDK) ────────┐
│ • src/api.ts (SDK-based operations)    │
│ • src/auth.ts (SDK authentication)      │
│ • src/relationship-editor.ts (UUID)     │
│ • src/import-export.ts (JSON export)   │
└─────────────────────────────────────────┘
┌─── Foundation Layer (TypeScript) ───────┐
│ • src/compatibility.ts (types, icons)   │
│ • @onlyworlds/sdk (field definitions)   │
│ • Compiled to dist/ for browser use    │
└─────────────────────────────────────────┘
```

## 🎯 Common Customization Patterns

### Pattern 1: API-Only Integration
**Use case**: Embed OnlyWorlds data into existing applications, build CLIs, or create backend services.

**Keep these files**:
```
✅ src/auth.ts          # SDK authentication
✅ src/api.ts           # SDK-based operations
✅ src/compatibility.ts # Element types & constants
✅ package.json         # SDK dependency
```

**Remove these files**:
```
❌ All UI files (src/viewer.ts, src/editor.ts, src/inline-editor.ts, etc.)
❌ src/theme.ts
❌ src/app.ts (main UI controller)
❌ index.html, css/
```

**Example usage**:
```typescript
import { authManager } from './dist/auth.js';
import { apiService } from './dist/api.js';

await authManager.authenticate(apiKey, pin);
const characters = await apiService.getElements('character');
```

### Pattern 2: Different UI Framework
**Use case**: Replace the vanilla JS UI with React, Vue, Svelte, or any modern framework.

**Keep these files**:
```
✅ src/auth.ts, src/api.ts, src/compatibility.ts
✅ src/relationship-editor.ts (for UUID handling)
✅ src/auto-save.ts (adapt the logic)
✅ @onlyworlds/sdk (provides full type definitions)
```

**Replace these files**:
```
🔄 src/viewer.ts → YourFrameworkViewer.tsx/vue/svelte
🔄 src/editor.ts → YourFrameworkEditor.tsx/vue/svelte
🔄 src/inline-editor.ts → YourFrameworkInlineEditor.tsx/vue/svelte
🔄 src/app.ts → YourFrameworkApp.tsx/vue/svelte
```

**Pro tip**: The @onlyworlds/sdk provides full TypeScript definitions for all 22 element types, eliminating the need for manual field definitions.

**Bonus**: The template is already TypeScript-based, so you get full type safety and IntelliSense for all OnlyWorlds operations.

### Pattern 3: Specialized Tool (Single Element Type)
**Use case**: Build a character manager, location explorer, or timeline viewer.

#### **Step-by-Step Implementation: Character Manager Example**

**Step 1: Analyze Current Structure**
First, understand what you're modifying:
```bash
# See which files use ELEMENT_TYPES
grep -r "ELEMENT_TYPES" src/
```

**Step 2: Modify Element Type Filter**
In `src/compatibility.ts`, find this section:
```typescript
// BEFORE (lines 12-16):
    // Dynamic element types from SDK FIELD_SCHEMA
    get ELEMENT_TYPES() {
        return Object.keys(FIELD_SCHEMA).sort();
    },
```

Replace with:
```typescript
// AFTER:
    // Dynamic element types from SDK FIELD_SCHEMA - CHARACTER-ONLY TOOL
    get ELEMENT_TYPES() {
        // Original: return Object.keys(FIELD_SCHEMA).sort();
        // Character-only customization:
        return ['character'];
    },
```

**Step 3: Build and Test**
```bash
npm run build    # Compile TypeScript
npm start       # Start development server
```

**Step 4: Verify Success** ✅
Open http://localhost:8080 and confirm:
- [ ] Only "Character" category appears in left sidebar
- [ ] No other element types (locations, objects, etc.) are shown
- [ ] Create button only allows character creation
- [ ] All functionality still works

**Step 5: Optional UI Simplification**
For a cleaner single-type interface, also modify:

In `src/viewer.ts` (around line 79), remove category selection:
```typescript
// BEFORE: Loop through all categories
ONLYWORLDS.ELEMENT_TYPES.forEach((type: ElementType) => {
    // ... category list building
});

// AFTER: Direct character display (no category selection)
this.showCategory('character');
```

**Rollback Instructions** 🔄
If something breaks, revert `src/compatibility.ts`:
```typescript
// Restore original:
get ELEMENT_TYPES() {
    return Object.keys(FIELD_SCHEMA).sort();
},
```
Then run `npm run build` again.

### Pattern 4: Enhanced Features
**Use case**: Add maps, timelines, advanced search, AI generation, or custom visualizations.

**Extend these areas**:
```
📁 src/visualizations/     # New folder for maps, charts, timelines
📁 src/ai-features/        # New folder for AI-powered tools
📁 src/advanced-search/    # New folder for complex queries
🔄 src/viewer.ts           # Add visualization modes
🔄 src/compatibility.ts    # Add new field types or metadata
```

**The API layer stays the same** - just add new UI capabilities on top.

### Pattern 5: Embedded Widget
**Use case**: Add OnlyWorlds element picker to your existing app.

**Create a minimal version**:
```
✅ src/auth.ts, src/api.ts, src/compatibility.ts
✅ src/relationship-editor.ts (for the picker UI)
❌ Full viewer/editor interfaces
🔄 Create ElementPicker.ts with just the selection UI
```

## 🤖 LLM Development Guidelines

### For AI Assistants Working on This Project

**When asked to modify this template:**

#### **🎯 Step 1: Identify the Pattern**
Match user request to one of the 5 patterns above.

#### **🔍 Step 2: Analyze Before Modifying**
**ALWAYS do this first:**
```bash
# Examine current file structure
ls -la src/

# Find dependencies of files you plan to modify
grep -r "import.*compatibility" src/
grep -r "ELEMENT_TYPES" src/

# Check build status before making changes
npm run build
```

#### **⚠️ Step 3: Critical Dependencies**
**NEVER remove these without replacement:**
- `src/compatibility.ts` ← Used by src/api.ts, src/viewer.ts, src/editor.ts
- `src/auth.ts` ← Required for any OnlyWorlds API access
- `@onlyworlds/sdk` ← Provides all type definitions and API methods

**Safe to modify/remove:**
- `src/theme.ts` (standalone)
- `src/import-export.ts` (standalone)
- Any individual UI file (if replacing with different framework)

#### **🧪 Step 4: Always Test Changes**
After modifications:
```bash
npm run build     # Must compile without errors
npm start        # Must serve without issues
```

#### **🆘 Step 5: Rollback if Needed**
Keep original code in comments:
```typescript
// Original: return Object.keys(FIELD_SCHEMA).sort();
// Modified for character-only:
return ['character'];
```

**Common requests and responses:**

| User Request | Pattern | Key Files to Modify |
|-------------|---------|-------------------|
| "Remove the UI, just keep API access" | Pattern 1 | Keep: auth.ts, api.ts, compatibility.ts |
| "Convert to React/Vue" | Pattern 2 | Replace: viewer.ts, editor.ts, app.ts |
| "Make a character-only tool" | Pattern 3 | Modify: compatibility.ts (ELEMENT_TYPES) |
| "Add a map view" | Pattern 4 | Extend: Add new visualization modules |
| "Element picker widget" | Pattern 5 | Create: Minimal picker component |

### File Dependencies Map
**Before removing any file, check these dependencies:**

```
src/compatibility.ts ← (used by) src/api.ts, src/viewer.ts, src/editor.ts
@onlyworlds/sdk ← (used by) src/api.ts, src/auth.ts
src/auth.ts ← (used by) src/api.ts, src/app.ts
src/api.ts ← (used by) src/viewer.ts, src/editor.ts, src/auto-save.ts, src/app.ts
```

**Safe to remove independently**: src/theme.ts, src/import-export.ts

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
1. Field types are automatically provided by @onlyworlds/sdk
2. Add custom rendering logic to `src/field-renderer.ts`
3. Update `src/compatibility.ts` for custom field mappings if needed

### Adding New Element Types
1. OnlyWorlds supports custom element types beyond the standard 22
2. The SDK automatically detects available types
3. Add to `ELEMENT_TYPES` in `src/compatibility.ts` for UI display

### Adding Authentication Methods
1. Extend `src/auth.ts` with new authentication patterns
2. Keep SDK client interface for API compatibility
3. Update `src/app.ts` authentication flow

---

## 🆘 **Troubleshooting Common Issues**

### **Build Errors**

**Problem**: `npm run build` fails with TypeScript errors
```
error TS2345: Argument of type 'string' is not assignable...
```
**Solution**:
1. Check if you modified type definitions incorrectly
2. Ensure all imports still resolve
3. Run `npm install` to refresh dependencies

**Problem**: Module not found errors
```
Cannot resolve module './compatibility.js'
```
**Solution**:
- TypeScript imports need `.js` extension for compiled output
- Check file was properly renamed/moved
- Verify `tsconfig.json` hasn't been modified

### **Runtime Errors**

**Problem**: Blank page or "Element type undefined" errors
**Solution**:
1. Check browser console for JavaScript errors
2. Verify @onlyworlds/sdk is properly installed (`npm install`)
3. Confirm OnlyWorlds API credentials are working
4. Check that `FIELD_SCHEMA` from SDK is accessible

**Problem**: "Cannot read property of undefined" in relationships
**Solution**:
- Custom element types may break relationship detection
- Check `src/compatibility.ts` field mappings are correct

### **Server Issues**

**Problem**: `npm start` fails or server won't start
**Solution**:
```bash
# Kill any existing server on port 8080
lsof -ti:8080 | xargs kill -9

# Try alternative port
npm run start -- -l 8081
```

### **Validation Checklist**

After any customization, verify these work:
- [ ] `npm run build` completes without errors
- [ ] Server starts with `npm start`
- [ ] Page loads at http://localhost:8080
- [ ] Authentication works with valid credentials
- [ ] Element creation/editing functions properly
- [ ] No console errors in browser developer tools

---