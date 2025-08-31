# OnlyWorlds Tool Template

A clean, minimal template for building tools that interact with the OnlyWorlds API. Perfect for beginners to learn the OnlyWorlds ecosystem and create world-building applications.

## 🚀 Quick Start

### Option 1: Python (Mac/Linux usually have this)
```bash
python start.py
```
or
```bash
python3 start.py
```

### Option 2: Node.js (Web developers usually have this)
```bash
npm start
```

**Don't have either?**
- **Windows** → Install Node.js: https://nodejs.org
- **Mac/Linux** → You probably have Python, try `python --version`

Browser opens automatically at http://localhost:8080

## 🔑 Getting Started

1. **Download or clone this repository**

2. **Run one of the commands above**

3. **Enter your OnlyWorlds credentials**
   - Get them from [onlyworlds.com](https://www.onlyworlds.com)
   - API Key: 10 digits
   - PIN: 4 digits

4. **Click "Connect" to start building!**

## ✨ What This Template Does

- **Full CRUD Operations** - Create, Read, Update, Delete all element types
- **All 22 Element Types** - Complete OnlyWorlds support
- **Inline Editing** - Click any field to edit, auto-saves after 2 seconds
- **Relationship Management** - Link elements together with smart pickers
- **Clean Interface** - Responsive, modern design
- **Educational Code** - Well-commented vanilla JavaScript for learning

## 📁 Project Structure

```
tool-template/
├── index.html           # Main application (loads ES modules)
├── css/
│   └── styles.css       # Styling
├── js/                  # Modern ES modules architecture
│   ├── app.js           # Main entry point & application controller
│   ├── constants.js     # Element types and field definitions
│   ├── auth.js          # Authentication management
│   ├── api.js           # OnlyWorlds API integration
│   ├── viewer.js        # Element display and listing
│   ├── editor.js        # Create new elements modal
│   ├── inline-editor.js # Direct field editing (refactored)
│   ├── field-renderer.js # Field rendering logic (extracted)
│   ├── auto-save.js     # Auto-save management (extracted)
│   ├── relationship-editor.js # UUID relationship handling
│   ├── field-types.js   # Field type definitions
│   ├── type-manager.js  # Supertype/subtype management
│   ├── import-export.js # World export to JSON
│   └── theme.js         # Dark/light mode management
├── start.py             # Python server launcher
└── package.json         # Node.js configuration
```

## 🎯 Key Features for Developers

### Inline Editing Experience
- Click any field to edit immediately (no "edit mode")
- Auto-saves after 2 seconds of inactivity
- Visual feedback: yellow = editing, blue = saving, green = saved
- Keyboard shortcuts: Ctrl+Enter to save, Escape to cancel

### Smart Relationship Handling
- UUID fields automatically show relationship picker
- Type detection from field names (e.g., `character_id` → Character type)
- Single and multiple selection support
- Graceful handling of broken references

### Educational Design
- **Modern ES Modules** - Clean imports/exports, no build step required
- **Modular architecture** - Clear separation of concerns
- **Extensive comments** - Learn patterns like debouncing, state management
- **Manual UUID v7 generation** - Understanding time-ordered IDs
- **Refactored for clarity** - Inline editor split into focused modules

## 🛠️ Customization Ideas

### Quick Customizations
- **Colors**: Edit CSS variables in `css/styles.css`
- **Fields**: Add custom fields in `js/constants.js`
- **Validation**: Enhance form validation in `js/editor.js`

### Build Your Own Tool
This template is designed to be extended:

- **Visualizers** - Add maps, timelines, relationship graphs
- **Generators** - Create content programmatically
- **Analyzers** - Extract insights from world data
- **Converters** - Import/export to other formats
- **Games** - Build interactive experiences with your world data

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| `python: command not found` | Try `python3` instead, or install from python.org |
| `npm: command not found` | Install Node.js from nodejs.org |
| Port 8080 already in use | Edit start.py or use `npm start -- -l 8081` |
| CORS errors | Make sure you're using the server, not opening index.html directly |
| Authentication fails | Check API Key (10 digits) and PIN (4 digits) |
| No elements showing | Create some elements at onlyworlds.com first |

## 📚 Resources

- **[API Documentation](https://www.onlyworlds.com/api/docs)** - Complete API reference
- **[Developer Guide](https://onlyworlds.github.io/)** - Tutorials and best practices
- **[GitHub](https://github.com/OnlyWorlds/OnlyWorlds)** - Main OnlyWorlds repository
- **[Discord Community](https://discord.gg/twCjqvVBwb)** - Get help and share your tools

## 🚀 Advanced Usage

### Alternative Ports
```bash
# Python with different port
python start.py  # (edit line 24 in start.py to change port)

# Node with different port
npx serve -s . -l 8081
```

### Growing Your Tool
Once you're ready to add frameworks or build tools:
```bash
# Add a framework
npm install react vue svelte

# Add TypeScript
npm install --save-dev typescript

# Add a bundler
npm install --save-dev vite webpack parcel
```

## 💡 Tips for Building Tools

1. **Start Simple** - Get basic CRUD working first
2. **Test Edge Cases** - Empty worlds, broken references, slow connections
3. **Follow Conventions** - Use the standard field names and types
4. **Handle Errors Gracefully** - Users might have network issues
5. **Keep It Educational** - Your tool might be someone's first look at the API

## 🤝 Contributing

This template is meant to be forked and modified! Share your tools with the OnlyWorlds community.

## 📄 License

MIT License - Free to use and modify for any OnlyWorlds tools.

---

**Ready to build?** This template gives you everything needed to create OnlyWorlds tools. Simple enough for beginners, flexible enough for any application.

*Made with ❤️ for the OnlyWorlds community*