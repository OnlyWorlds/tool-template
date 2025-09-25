# AI Assistant Instructions

**For AI Assistants (Claude, ChatGPT, Cursor, etc.): This is an OnlyWorlds tool template optimized for rapid transformation.**

## Primary Mission

**When user requests customization/modification of this template:**
1. **Read `TEMPLATE-MODIFICATION-GUIDE.md`** - Contains complete patterns and implementation instructions with decision matrix, file dependency rules, and copy-paste implementation commands
2. **Identify user's goal** - Map to one of 5 transformation patterns
3. **Follow exact file modification instructions** - Guide provides precise steps
4. **Validate with provided commands** - Ensure successful transformation

## Project Context

This is a **TypeScript-based OnlyWorlds tool template** designed for transformation. Users download this to build custom world-building tools. Your job: help them modify it efficiently and safely using the TEMPLATE-MODIFICATION-GUIDE.md.

**Template is designed for rapid transformation** - Users want to modify it for specific purposes (quest managers, character tools, map builders, etc.) rather than use it as-is.

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

### Actual File Structure (TypeScript)
```
src/
├── app.ts           # Main entry point
├── api.ts           # OnlyWorlds SDK integration
├── auth.ts          # Authentication via SDK
├── viewer.ts        # Element display system
├── editor.ts        # Create element modal
├── inline-editor.ts # Click-to-edit functionality
├── field-renderer.ts # Field display logic
├── compatibility.ts # SDK integration layer (CRITICAL - never remove)
└── [other modules]  # Supporting functionality
```

### Critical Files for LLMs
- **`src/compatibility.ts`** - Core integration, required by api.ts and viewer.ts
- **`src/auth.ts`** - Authentication, required for all API access
- **`TEMPLATE-MODIFICATION-GUIDE.md`** - Complete modification instructions for LLMs

## LLM Guidelines for Template Modification

### Before Any Changes
```bash
npm run build && npm start  # Must work before modification
```

### Safe Modification Rules
- ✅ **Safe to remove**: `src/theme.ts`, `src/import-export.ts`, CSS files, `index.html` (if replacing UI)
- ⚠️ **Modify carefully**: `src/compatibility.ts` ELEMENT_TYPES array for focused tools
- ❌ **Never remove**: `src/compatibility.ts`, `src/auth.ts`, `@onlyworlds/sdk` dependency

### Common LLM Tasks
1. **"Make it API-only"** → Remove UI files, keep auth.ts + api.ts + compatibility.ts
2. **"Add visualization"** → Install library, create src/features/, integrate in viewer.ts
3. **"Focus on characters"** → Modify compatibility.ts ELEMENT_TYPES array
4. **"Convert to React"** → Keep API layer, replace all UI files

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