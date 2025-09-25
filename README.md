# OnlyWorlds Tool Template

A clean, minimal template for building tools and games using the OnlyWorlds standard and API.  

## Using This Template

### For New Tools (Recommended)
Use GitHub's template feature to create your own tool:

#### Create a new repository
1. **Click "Use this template"** (green button, top right)
2. **Select "Create a new repository"**
2. **Name your repository** (e.g. `my-perfect-tool`)
3. **Set to Public** for free GitHub Pages hosting

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
You need **Node.js** installed for TypeScript compilation and package management.
- **Install Node.js**: https://nodejs.org (includes npm)
- **Check installation**: `node --version` and `npm --version`

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

- **Full CRUD Operations** - Create, Read, Update, Delete all element types
- **All 22 Element Types** - Complete OnlyWorlds support with dynamic detection
- **Inline Editing** - Click any field to edit, auto-saves after 2 seconds
- **Relationship Management** - Link elements together with smart pickers and broken reference handling
- **Clean Interface** - Responsive, modern design
- **TypeScript + SDK** - Full type safety using an OnlyWorlds SDK 

## Project Structure

```
tool-template/
├── index.html           # Main application (loads compiled modules)
├── css/
│   └── styles.css       # Styling
├── src/                 # TypeScript source code (SDK-based)
│   ├── app.ts           # Main entry point & application controller
│   ├── auth.ts          # Authentication management via SDK
│   ├── api.ts           # OnlyWorlds SDK integration
│   ├── viewer.ts        # Element display and listing
│   ├── editor.ts        # Create new elements modal
│   ├── inline-editor.ts # Direct field editing system
│   ├── field-renderer.ts # Field rendering logic
│   ├── auto-save.ts     # Auto-save management
│   ├── relationship-editor.ts # UUID relationship handling
│   ├── import-export.ts # World export to JSON
│   ├── theme.ts         # Dark/light mode management
│   └── compatibility.ts # SDK integration & type definitions
├── dist/                # Compiled JavaScript modules
│   └── *.js            # TypeScript compiled output
├── start.py             # Python server launcher
├── package.json         # Node.js configuration
└── tsconfig.json        # TypeScript configuration
```
 
 
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

Make sure to use the [OnlyWorlds Discord](https://discord.gg/twCjqvVBwb) to ask any technical or creative questions.

## Customization

This template is designed to offer **modular building blocks** with a **dynamic, future-proof architecture**:

### **Core Features**
- **Dynamic Element Types** - Automatically detects available element types from SDK
- **Smart Field Detection** - Infers field types from actual data
- **Broken Reference Handling** - Gracefully handles deleted element references
- **TypeScript Safety** - Full compile-time checking with SDK integration

### **Common Patterns**
- **API-only integration** - Keep auth.ts + api.ts, remove UI files
- **Different UI framework** - Replace UI layer with React/Vue/Svelte
- **Specialized tools** - Focus on specific element types
- **Enhanced features** - Add maps, timelines, AI generation

→ **[Full Customization Guide](CUSTOMIZATION-GUIDE.md)** - Complete patterns and LLM-friendly documentation

## Resources

- **[OnlyWorlds Documentation](https://onlyworlds.github.io/)** - Complete documentation, including developer support and an example guide for extending this tool
- **[API Documentation](https://www.onlyworlds.com/api/docs)** - Complete API reference
- **[GitHub](https://github.com/OnlyWorlds/OnlyWorlds)** - Main OnlyWorlds repository 
 

## License

MIT License - Free to use and modify for any purpose.

 