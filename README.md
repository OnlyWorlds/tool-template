# OnlyWorlds Tool Template

A clean, minimal template for building tools that interact with the OnlyWorlds API. Perfect for beginners to get started with world-building data management.

## 🚀 Quick Start

1. **Get your credentials** from [onlyworlds.com](https://www.onlyworlds.com)
2. **Open** `index.html` in your browser
3. **Enter** your 10-digit API Key and 4-digit PIN
4. **Click** "validate" to connect
5. **Start exploring** your world!

## ✨ Features

- **Simple Authentication** - API Key and PIN validation
- **Full CRUD Operations** - Create, Read, Update, Delete
- **All 22 Element Types** - Complete OnlyWorlds support
- **Search & Filter** - Find elements quickly
- **Clean Interface** - Responsive, modern design
- **Beginner Friendly** - Well-structured, documented code

## 📁 Project Structure

```
tool-template/
├── index.html          # Main application
├── css/
│   └── styles.css      # Styling
└── js/
    ├── constants.js    # OnlyWorlds configuration
    ├── auth.js         # Authentication module
    ├── api.js          # API service layer
    ├── viewer.js       # Element display logic
    ├── editor.js       # Create/edit functionality
    └── app.js          # Main controller
```

## 🛠️ How It Works

### Authentication (`auth.js`)
- Validates API credentials with OnlyWorlds
- Fetches world metadata
- Manages authentication state

### API Service (`api.js`)
- Handles all OnlyWorlds API calls
- Implements proper UUID v7 generation
- Manages element caching
- Provides CRUD operations

### Element Viewer (`viewer.js`)
- Displays elements by category
- Shows detailed element information
- Handles search and filtering
- Updates counts dynamically

### Element Editor (`editor.js`)
- Modal-based create/edit interface
- Form validation
- Element type selection
- Save and update functionality

### Main App (`app.js`)
- Coordinates all modules
- Handles initialization
- Manages UI state
- Input validation

## 🎨 Customization

### Styling
Modify `css/styles.css` to change colors:
```css
:root {
    --primary-color: #6200ea;
    --secondary-color: #03dac6;
    --background: #ffffff;
}
```

### Extending Functionality
The modular architecture makes it easy to add features:

- **Export/Import** - Add data portability
- **Batch Operations** - Process multiple elements
- **Visualizations** - Create maps, timelines, graphs
- **Advanced Filters** - Complex search queries
- **Offline Mode** - Cache data locally

## 🔧 Running Locally

### Option 1: Direct File
```bash
# Simply open in browser
open index.html
```

### Option 2: Local Server (Recommended)
```bash
# Python
python -m http.server 8000

# Node.js
npx http-server

# PHP
php -S localhost:8000
```

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| CORS Error | Use a local server instead of `file://` |
| Auth Fails | Check API Key (10 digits) and PIN (4 digits) |
| No Elements | Create elements at onlyworlds.com first |
| Network Error | Check internet connection and API status |

## 📚 Resources

- **[Developer Guide](https://onlyworlds.github.io/docs/developer-support/my-first-tool.html)** - Complete tutorial for extending this template
- **[API Documentation](https://www.onlyworlds.com/api/docs)** - Full API reference
- **[OnlyWorlds GitHub](https://github.com/OnlyWorlds/OnlyWorlds)** - Official repository
- **[Discord Community](https://discord.gg/twCjqvVBwb)** - Get help and share tools

## 🤝 Contributing

This template is designed to be forked and extended! Ideas:

 

## 📄 License

Free to use and modify for OnlyWorlds tools.

---

**Ready to build something amazing?** Check out the [complete developer guide](https://onlyworlds.github.io/docs/developer-support/my-first-tool.html) for detailed tutorials on extending this template!

*Built for the OnlyWorlds community* 🌍