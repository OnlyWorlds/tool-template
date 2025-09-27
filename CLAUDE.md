# AI Assistant Instructions

**For AI Assistants (Claude, ChatGPT, Cursor, etc.): This is an OnlyWorlds tool template optimized for rapid transformation.**

## Primary Mission

**When user requests customization/modification of this template:**
1. **Read `TEMPLATE-MODIFICATION-GUIDE.md`** - Contains complete patterns and implementation instructions with decision matrix, file dependency rules, and copy-paste implementation commands
2. **Identify user's goal** - Map to one of 5 transformation patterns
3. **Follow exact file modification instructions** - Guide provides precise steps
4. **Validate with provided commands** - Ensure successful transformation

## Project Context

This is a **TypeScript-based OnlyWorlds tool template** with **dual-mode functionality** designed for transformation. Users download this to build custom world-building tools. Your job: help them modify it efficiently and safely using the TEMPLATE-MODIFICATION-GUIDE.md.

**Template is designed for rapid transformation** - Users want to modify it for specific purposes (quest managers, character tools, map builders, etc.) rather than use it as-is.

**Dual-Mode System**: The template supports both **Online Mode** (connects to OnlyWorlds.com API) and **Local Mode** (works offline with JSON files).

## OnlyWorlds API Quick Reference

- **Endpoint**: `https://www.onlyworlds.com/api/worldapi/{element_type}/`
- **Authentication**: `API-Key` and `API-Pin` headers (not X-prefixed)
- **Base Fields**: All elements share: id, name, description, supertype, subtype, image_url, world, created_at, updated_at
- **22 Element Types**: Ability, Character, Collective, Construct, Creature, Event, Family, Institution, Language, Law, Location, Map, Marker, Narrative, Object, Phenomenon, Pin, Relation, Species, Title, Trait, Zone

## Code Architecture Patterns

### Key Implementation Details

**Inline Editing System**:
- Click-to-edit fields with auto-save after 2 seconds
- Visual feedback: yellow (editing) → blue (saving) → green (saved)
- Keyboard: Ctrl+Enter to save, Escape to cancel

**Relationship Management**:
- UUID fields auto-detect target type from field names
- Single and multi-select relationship pickers
- Graceful handling of broken references

**Educational Patterns**:
- ES modules without build step
- Manual UUIDv7 generation with comments
- Debouncing and state management examples
- Clear separation of concerns
 

### Critical Files for LLMs
- **`src/compatibility.ts`** - Core integration, required by api.ts and viewer.ts
- **`src/auth.ts`** - Online authentication, required for API access
- **`src/modes/mode-router.ts`** - Central routing between online/local modes (clean, no defensive code)
- **`src/modes/local-storage.ts`** - Local storage engine (localStorage CRUD)
- **`src/app.ts`** - Main app with state management (CSS-driven visibility)
- **`css/01-base.css`** - Contains app state management CSS rules for element visibility
- **`src/llm/responses-config.ts`** - AI prompts & configuration (easily editable)
- **`TEMPLATE-MODIFICATION-GUIDE.md`** - Complete modification instructions for LLMs

## LLM Guidelines for Template Modification

### Before Any Changes
```bash
npm run build && npm start  # Must work before modification
```

### Safe Modification Rules
- ✅ **Safe to remove**: `src/theme.ts`, `src/import-export.ts`, `src/llm/` (entire folder), `src/modes/` (entire folder), `src/ui/` (entire folder), individual CSS files `css/08-import-export.css` through `css/12-export-modal.css`, `index.html` (if replacing UI)
- ⚠️ **Modify carefully**: `src/compatibility.ts` ELEMENT_TYPES array for focused tools, `src/llm/responses-config.ts` for AI behavior, `src/modes/` for offline functionality
- ❌ **Never remove**: `src/compatibility.ts`, `src/auth.ts`, `@onlyworlds/sdk` dependency, `css/01-base.css` through `css/07-mobile.css`
- ⚠️ **Memory leak prevention**: Use `while (container.firstChild) container.removeChild(container.firstChild)` instead of `innerHTML = ''`

### Styling Rules
- **Granular CSS**: 12 files from `css/01-base.css` to `css/12-export-modal.css` - each optional feature removable independently
- **Never hardcode colors** - Always use CSS variables from `css/01-base.css`
- **Button classes**: `.btn-primary`, `.btn-validate`, `.btn-secondary` - don't mix or misuse

### Common LLM Tasks
1. **"Make it API-only"** → Remove UI files, keep auth.ts + api.ts + compatibility.ts
2. **"Add visualization"** → Install library, create src/features/, integrate in viewer.ts
3. **"Focus on characters"** → Modify compatibility.ts ELEMENT_TYPES array
4. **"Convert to React"** → Keep API layer, replace all UI files
5. **"Remove AI features"** → Delete `src/llm/` folder, remove chat icon from viewer.ts
6. **"Customize AI behavior"** → Edit `src/llm/responses-config.ts` prompts and settings
7. **"Remove offline mode"** → Delete `src/modes/` and `src/ui/` folders, simplify app.ts
8. **"Offline-only tool"** → Keep `src/modes/local-storage.ts`, remove online auth
9. **"Add new middle column mode"** → ⚠️ Must restore `.element-list-container` HTML structure when switching modes

### Validation After Changes
```bash
npm run build    # Must compile without errors
npm start       # Must serve without errors
# Check browser console (F12) - no JavaScript errors
```

## Resources for LLMs

- **🎯 TEMPLATE-MODIFICATION-GUIDE.md** - Primary resource with all modification patterns - always read this when starting work on the project.
- **OnlyWorlds SDK Docs**: Embedded in @onlyworlds/sdk package
- **API Reference**: https://www.onlyworlds.com/api/docs

## Quick Pattern Reference

| User Request | Pattern | Key Files |
|---|---|---|
| "CLI tool", "script" | Remove UI | Keep: auth.ts, api.ts, compatibility.ts |
| "Character manager" | Focus Types | Modify: compatibility.ts ELEMENT_TYPES |
| "Add maps/graphs" | Enhance | Add: src/features/, Update: package.json |
| "React app" | Replace UI | Keep: API layer, Replace: UI files |
| "Custom tool" | Transform | Use: API + auth, Build: anything |