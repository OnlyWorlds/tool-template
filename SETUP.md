# OnlyWorlds Tool Template - Setup Guide

## 🚀 Quick Start

You have two simple options to run this tool locally:

### Option 1: Python
Most Mac and Linux systems have Python pre-installed.

```bash
python start.py
```

If `python` doesn't work, try `python3`:
```bash
python3 start.py
```

### Option 2: Node.js
Most web developers have Node.js installed.

```bash
npm start
```

That's it! Your browser will open automatically at http://localhost:8080

## 📥 Installation Guide

### Don't have Python or Node.js?

#### For Windows Users
**Recommended: Install Node.js**
1. Go to https://nodejs.org
2. Download the LTS version
3. Run the installer
4. Open Command Prompt or PowerShell
5. Run: `npm start`

#### For Mac/Linux Users
**Check if you have Python:**
```bash
python --version
# or
python3 --version
```

If not installed:
- **Mac**: Python comes pre-installed, or install via https://python.org
- **Linux**: `sudo apt-get install python3` (Ubuntu/Debian) or `sudo yum install python3` (RedHat/Fedora)

## 🔧 Troubleshooting

### Common Issues and Solutions

| Problem | Solution |
|---------|----------|
| `python: command not found` | Try `python3` instead, or install Python |
| `npm: command not found` | Install Node.js from https://nodejs.org |
| Port 8080 already in use | Change the port in start.py (line 24) or use `npx serve -s . -l 8081` |
| Browser doesn't open | Manually navigate to http://localhost:8080 |
| CORS errors | You must use the server - don't open index.html directly |
| TypeScript errors | Run `npm run build` to compile TypeScript, check console for errors |
| Module not found errors | Ensure `npm install` and `npm run build` completed successfully |

### Why Do I Need a Server?

Web browsers have security restrictions (CORS) that prevent local HTML files from making API requests. Running a local server bypasses this restriction safely, allowing the tool to communicate with the OnlyWorlds API.

## 📝 First Time Setup

1. **Get Your API Credentials**
   - Sign up at https://www.onlyworlds.com
   - Navigate to your API settings
   - Copy your API Key (10 digits) and PIN (4 digits)

2. **Build the TypeScript (First Time Only)**
   ```bash
   npm install
   npm run build
   ```

3. **Run the Tool**
   - Use either `python start.py` or `npm start`
   - Browser opens automatically

4. **Connect to OnlyWorlds**
   - Enter your API Key and PIN
   - Click "load world"
   - Start creating and managing your world elements!

## 💡 Developer Tips

### Change the Default Port
For Python, edit `start.py` line 24:
```python
port = 8081  # Change to any available port
```

For Node.js:
```bash
npx serve -s . -l 8081
```

### Test with Different Browsers
The tool works with all modern browsers:
- Chrome/Edge (Recommended)
- Firefox
- Safari
- Opera

## 🌐 Deployment Options

Once you've customized your tool, you can host it online:

### GitHub Pages (Free)
1. Push to GitHub repository
2. Enable Pages in repository settings
3. Your tool is live at `https://[username].github.io/[repository]`

### Netlify (Free tier available)
1. Connect your GitHub repository
2. Auto-deploys on every push
3. Custom domains supported

### Vercel (Free tier available)
1. Import your GitHub repository
2. Zero configuration needed
3. Great for Next.js if you upgrade later

## 📚 Next Steps

1. **Explore the TypeScript Code**
   - `src/app.ts` - Main application controller
   - `src/auth.ts` - OnlyWorlds SDK authentication
   - `src/api.ts` - SDK-based API operations
   - `src/viewer.ts` - Element browsing and display
   - `src/editor.ts` - Element creation modal
   - `src/inline-editor.ts` - Direct field editing
   - `src/field-renderer.ts` - Dynamic field rendering
   - `src/auto-save.ts` - Auto-save management
   - `src/relationship-editor.ts` - UUID relationship handling
   - `src/compatibility.ts` - Element type constants and field mapping

2. **Development Workflow**
   - Edit TypeScript files in `src/`
   - Run `npm run build` to compile to `dist/`
   - Use `npm run build:watch` for automatic compilation
   - TypeScript provides full IntelliSense and type safety

3. **Make It Your Own**
   - Customize the styling in `css/styles.css`
   - Add new TypeScript modules in `src/`
   - Leverage full OnlyWorlds SDK capabilities
   - Create specialized tools for specific element types

4. **Share Your Creation**
   - Join the [Discord Community](https://discord.gg/twCjqvVBwb)
   - Share your tools and get feedback
   - Help others learn from your TypeScript code

## 🆘 Getting Help

- **API Documentation**: https://www.onlyworlds.com/api/docs
- **Developer Guide**: https://onlyworlds.github.io/
- **GitHub Issues**: https://github.com/OnlyWorlds/tool-template/issues
- **Discord Community**: https://discord.gg/twCjqvVBwb

---

**Remember**: This template is designed for learning. The code is intentionally simple and well-commented. Don't hesitate to experiment and break things - that's how you learn!