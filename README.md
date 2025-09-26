# OnlyWorlds Tool Template

A clean, minimal template for building tools and games using the OnlyWorlds standard and API.  

## Using This Template

### For New Tools (Recommended)
Use GitHub's template feature to create your own tool:

#### Create a new repository
1. **Click "Use this template"** (green button, top right)
2. **Select "Create a new repository"**
3. **Name your repository** (e.g. `my-perfect-tool`)
4. **Set to Public** for free GitHub Pages hosting

This creates a clean new repository without any backward connection to this template.

#### Clone the repository
1. **Click  "<> Code"** (green button, top right)
2. **Copy the HTTPS URL** 
3. **Open a terminal on your computer**
4. **Run `git clone [HTTPS-URL]`**
5. **Open the created folder in your IDE of choice** (VSCode, Cursor, etc.)

This enables you track and control changes you make to files in that folder.

## Quick Start

### Prerequisites
You need **Node.js 18+** installed for TypeScript compilation and package management.
- **Install Node.js**: https://nodejs.org (includes npm)
- **Check installation**: `node --version` and `npm --version`
- **Minimum versions**: Node.js 18.x, npm 8.x

### First Time Setup
```bash
npm install    # Install dependencies (including @onlyworlds/sdk) - run once
```

### Running Locally
```bash
npm run dev    # Build TypeScript + start server
```

### Alternative 
```bash
npm run build && python start.py    # Manual build + python server
```

Both options serve at http://localhost:8080

## Dual-Mode System

The template supports two distinct modes:

### 🌐 **Online Mode**
- **Connect**: Enter API key + PIN from [onlyworlds.com](https://www.onlyworlds.com)
- **Features**: Full API integration, real-time sync, collaboration
- **Use case**: Working with shared worlds, live data, team projects

### 💾 **Local Mode**
- **Connect**: Click "Switch to Local" to work with JSON files
- **Import**: File upload, clipboard paste, and drag & drop with validation
- **Features**: Offline operation, localStorage persistence, privacy
- **Use case**: Working offline, trying the tool, private local worlds

### Mode Switching
- **Button states**: "online"/"local" (main button) + "switch to local"/"import json" (mode button)
- **Safe switching**: Clears UI between modes, maintains data separation
- **Persistent preference**: Remembers your preferred mode

## AI Chat Setup (Optional)

The template includes an AI assistant powered by OpenAI's **Responses API** (released March 2025). To enable it:

1. **Click the robot icon** next to "Elements" in the sidebar
2. **The AI will introduce itself** and ask for your OpenAI API key
3. **Get an API key** from [platform.openai.com](https://platform.openai.com/api-keys) and paste it in the chat
4. **Start chatting** about your world!

The setup feels like a natural conversation - the AI guides you through the process and tests the connection automatically.

**Security**: API keys are stored in your browser's localStorage and only used for direct API calls. They're never logged or transmitted to any other servers.

## Deployment

### GitHub Pages (Recommended) 

1. **Push your changes** to your GitHub repository
2. **Go to Settings** → **Pages** (in your repository)
3. **Set Source** to "GitHub Actions"
4. **Your tool will be live** at `https://[username].github.io/[repository-name]`

The template includes a pre-configured `.github/workflows/deploy.yml` that automatically:
- ✅ Installs Node.js 20 with npm caching
- ✅ Builds TypeScript to JavaScript (`npm run build`)
- ✅ Deploys to GitHub Pages on every push to main
 

## What This Template Offers

- **Dual-Mode Operation** - Work online (OnlyWorlds.com API) or offline (local JSON files)
- **Full CRUD Operations** - Create, Read, Update, Delete all element types in both modes
- **All 22 Element Types** - Complete OnlyWorlds support with dynamic detection
- **Inline Editing** - Click any field to edit, auto-saves after 2 seconds
- **Relationship Management** - Link elements together with smart pickers and broken reference handling
- **JSON Import/Export** - File upload, clipboard paste, and drag & drop support
- **AI Chat Assistant** - Optional OpenAI integration for discussing your world (requires API key)
- **Clean Interface** - Responsive, modern design with clear mode indicators
- **TypeScript + SDK** - Full type safety using an OnlyWorlds SDK 

## Project Structure

```
tool-template/
├── index.html           # Main application (loads compiled modules)
├── css/
│   └── styles.css       # Styling with dual-mode UI
├── src/                 # TypeScript source code (SDK-based)
│   ├── app.ts           # Main entry point with dual-mode support
│   ├── auth.ts          # Online authentication management via SDK
│   ├── api.ts           # OnlyWorlds SDK integration
│   ├── viewer.ts        # Element display and listing
│   ├── editor.ts        # Create new elements modal
│   ├── inline-editor.ts # Direct field editing system
│   ├── field-renderer.ts # Field rendering logic
│   ├── auto-save.ts     # Auto-save management
│   ├── relationship-editor.ts # UUID relationship handling
│   ├── import-export.ts # World export to JSON (OnlyWorlds format)
│   ├── theme.ts         # Dark/light mode management
│   ├── compatibility.ts # SDK integration & type definitions
│   ├── modes/           # Dual-Mode System
│   │   ├── mode-router.ts    # Routes API calls between online/local
│   │   ├── local-storage.ts  # localStorage-based CRUD engine
│   │   └── local-auth.ts     # Local mode authentication
│   ├── ui/              # UI Components
│   │   ├── import-dialog.ts  # JSON import UI (file/paste/drag-drop)
│   │   └── mode-indicator.ts # Mode switching interface
│   └── llm/             # AI Chat functionality (optional)
│       ├── responses-service.ts # OpenAI API integration
│       ├── responses-ui.ts      # Chat interface
│       └── responses-config.ts  # Prompts & configuration
├── dist/                # Compiled JavaScript modules
│   └── *.js            # TypeScript compiled output
├── start.py             # Python server launcher
├── package.json         # Node.js configuration
└── tsconfig.json        # TypeScript configuration
```
 
 
## Mobile Support
**Desktop-first design** - Optimized for desktop development workflows. Basic mobile responsiveness included but complex editing works best on desktop.  

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `npm: command not found` | Install Node.js from nodejs.org |
| `Module loading errors` | Use `npm start` instead of Python server for proper MIME types |
| `TypeScript errors` | Run `npm run build` to check compilation |
| Port 8080 already in use | Use `npm start -- -l 8081` or edit start.py |
| CORS errors | Use the server, don't open index.html directly |
| `@onlyworlds/sdk not found` | Run `npm install` to install dependencies |
| Broken references show errors | The template handles this gracefully - check console for details |
| Rare API errors on page refresh | Expected during initialization - template waits for auth readiness |
| Can't find "Use this template" button | Make sure you're logged into GitHub and viewing the main repository page | 

Make sure to use the [OnlyWorlds Discord](https://discord.gg/twCjqvVBwb) to ask any technical or creative questions.

## Customization

🤖 **Using AI Assistants**: This template is optimized for AI-powered development. **If using Claude Code, it will automatically read `CLAUDE.md`**. For other AI tools (Codex, Cursor, etc.), **provide (and rename at will) the `CLAUDE.md` file** to your AI assistant for context and modification instructions.

## Styling System

The template uses a **comprehensive CSS variable system** for consistent theming:

### Color Palette
- **Primary**: `--brand-primary` (#2E7D32) - Dark green for primary actions
- **Status Colors**: `--status-success`, `--status-error`, `--status-warning`, `--status-info`
- **Background Variants**: All status colors have `-bg` variants for light backgrounds
- **Theme Support**: Automatic light/dark mode via CSS variables

### Button Classes
- **`.btn-primary`** - Primary action buttons (dark green)
- **`.btn-validate`** - Validation buttons with special states
- **`.btn-secondary`** - Secondary actions
- **`.btn-small`** - Smaller variant for compact spaces

### Best Practices
- **Never hardcode colors** - Always use CSS variables
- **Consistent button usage** - Use semantic class names
- **Theme-aware styling** - Colors automatically adapt to light/dark mode
- **Avoid CSS conflicts** - Don't duplicate class definitions; later ones override earlier ones
- **Check hover colors** - Dark mode hover colors can appear unexpectedly bright

### **Template Architecture (3 Independent Layers)**
```
UI Layer      → src/viewer.ts, src/editor.ts, index.html, css/
API Layer     → src/api.ts, src/auth.ts, src/compatibility.ts
Foundation    → @onlyworlds/sdk, package.json
```

### **5 Proven Customization Patterns**
1. **💼 Remove Features (API-only)** - For CLIs, bots, data processing
2. **🎯 Focus on Specific Types** - Character managers, location atlases
3. **➕ Add New Capabilities** - Maps, graphs, AI features, visualizations
4. **♾️ Replace UI Framework** - React, Vue, Svelte, mobile apps
5. **🚀 Build Something Unique** - Game engines, analytics, anything

**🎯 [Template Modification Guide](TEMPLATE-MODIFICATION-GUIDE.md)** - LLM-optimized with decision matrix, exact commands, and troubleshooting

### **🤖 AI Chat Features**

The template includes an **optional AI assistant** powered by OpenAI's **Responses API**:

- **Chat Interface**: Click the robot icon next to "Elements" to open chat in middle column
- **Conversational Setup**: The AI will ask for your OpenAI API key in a natural chat flow
- **Smart Context Configuration**: Widget-based interface to choose exactly what world information to include
- **Context Control**: Include world data, selected elements, or specific categories with token estimates
- **World-Building Focused**: Tuned to discuss existing elements, not suggest new content
- **Conversation Persistence**: Automatic via OpenAI's server-side state management
- **Secure Storage**: API keys stored in browser localStorage, never transmitted elsewhere
- **Easy Configuration**: Modify prompts in `src/llm/responses-config.ts`
- **Completely Optional**: Delete `src/llm/` folder to remove all AI features

 

## Unit Tests

Basic setup is included that uses **Vitest** for TypeScript + ES modules. Tests in `tests/` directory demonstrate authentication, API mocking, and data transformations. Extend or ignore as needed.

```bash
npm test           # Run tests
npm run test:watch # Watch mode
```

## Resources

- **[OnlyWorlds Documentation](https://onlyworlds.github.io/)** - Complete documentation, including developer support and an example guide for extending this tool
- **[API Documentation](https://www.onlyworlds.com/api/docs)** - Complete API reference
- **[GitHub](https://github.com/OnlyWorlds/OnlyWorlds)** - Main OnlyWorlds repository 
 

## License

MIT License - Free to use and modify for any purpose.

 