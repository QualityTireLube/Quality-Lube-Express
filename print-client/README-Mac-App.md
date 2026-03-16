# Print Client - Mac App

This guide explains how to build and use the Print Client as a native Mac application.

## 🚀 Quick Start

### Prerequisites

1. **macOS** - This build is designed for macOS only
2. **Node.js** (v16 or higher) - [Download here](https://nodejs.org/) or `brew install node`
3. **Python 3** (v3.11 or higher) - [Download here](https://www.python.org/) or `brew install python`
4. **Xcode Command Line Tools** - Run: `xcode-select --install`

### One-Click Build & Install

The simplest way to build and install the Mac app:

```bash
cd print-client
./build-mac-app-simple.sh --install
```

This will:
1. ✅ Check all prerequisites
2. ✅ Create Python virtual environment with all dependencies
3. ✅ Install Node.js dependencies
4. ✅ Build the React frontend
5. ✅ Generate app icons (if needed)
6. ✅ Build the Mac application
7. ✅ Install to `/Applications`

After installation, you can:
- Find "Print Client" in **Spotlight** (Cmd+Space)
- Launch from **Launchpad**
- Drag to **Dock** for quick access

### Build Options

```bash
# Build only (don't install)
./build-mac-app-simple.sh

# Build with auto-install
./build-mac-app-simple.sh --install

# Clean build (removes all build artifacts first)
./build-mac-app-simple.sh --clean

# Clean build with auto-install
./build-mac-app-simple.sh --clean --install
```

### Development Mode

For development with hot-reload:

```bash
./run-dev.sh
```

Options:
```bash
# Run Flask backend only
./run-dev.sh --flask-only

# Run Electron app only (assumes Flask is running)
./run-dev.sh --electron-only

# Setup dependencies before running
./run-dev.sh --setup
```

### Manual Build Process

If you prefer to build manually:

```bash
# 1. Install Python dependencies (use Homebrew Python for best compatibility)
/opt/homebrew/bin/python3 -m venv venv  # Apple Silicon
# or: /usr/local/bin/python3 -m venv venv  # Intel Mac
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# 2. Install Node.js dependencies
npm install

# 3. Install frontend dependencies (if frontend exists)
if [ -d "frontend" ]; then
  cd frontend && npm install && cd ..
fi

# 4. Generate icons (if needed)
./scripts/generate-icons.sh

# 5. Build Mac app
npm run build:mac-simple
```

### Icon Generation

To regenerate the app icon from SVG:

```bash
./scripts/generate-icons.sh
```

Or manually:
```bash
cd assets
qlmanage -t -s 1024 -o . icon.svg
mv icon.svg.png icon_1024.png
mkdir -p icon.iconset
sips -z 16 16 icon_1024.png --out icon.iconset/icon_16x16.png
sips -z 32 32 icon_1024.png --out icon.iconset/icon_16x16@2x.png
sips -z 32 32 icon_1024.png --out icon.iconset/icon_32x32.png
sips -z 64 64 icon_1024.png --out icon.iconset/icon_32x32@2x.png
sips -z 128 128 icon_1024.png --out icon.iconset/icon_128x128.png
sips -z 256 256 icon_1024.png --out icon.iconset/icon_128x128@2x.png
sips -z 256 256 icon_1024.png --out icon.iconset/icon_256x256.png
sips -z 512 512 icon_1024.png --out icon.iconset/icon_256x256@2x.png
sips -z 512 512 icon_1024.png --out icon.iconset/icon_512x512.png
sips -z 1024 1024 icon_1024.png --out icon.iconset/icon_512x512@2x.png
iconutil -c icns icon.iconset -o icon.icns
rm -rf icon.iconset
```

## 📱 App Features

### Native Mac Experience
- **Dock Icon** - App appears in the Dock with proper icon
- **Menu Bar** - Native macOS menu with File, Edit, View, Window, Help
- **Keyboard Shortcuts** - Standard Mac shortcuts (Cmd+N, Cmd+O, etc.)
- **Spotlight Search** - App appears in Spotlight search
- **Launchpad** - App appears in Launchpad
- **Dark Mode** - Supports macOS Dark Mode
- **Native Window Controls** - Close, minimize, maximize buttons

### Print Client Features
- **Template Editor** - Create and edit label templates
- **Print Queue Management** - Monitor and manage print jobs
- **Printer Configuration** - Setup and configure printers
- **Real-time Status** - Live updates on print job status
- **Offline Capability** - Works without internet connection

## 🛠️ Development

### Development Mode
```bash
npm run dev
```
This starts the app in development mode with:
- Hot reloading
- Developer tools open
- Debug logging enabled

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start the app |
| `npm run dev` | Start in development mode |
| `npm run build` | Build React frontend + Electron app |
| `npm run build:mac` | Build Mac app with DMG |
| `npm run build:mac-simple` | Build Mac app (directory only, faster) |
| `npm run dist:mac` | Build distributable Mac app |
| `npm run dist:dmg` | Build DMG installer |
| `npm run pack:mac` | Package app without distribution |

### Shell Scripts

| Script | Description |
|--------|-------------|
| `./build-mac-app-simple.sh` | One-click build and install |
| `./run-dev.sh` | Development mode runner |
| `./scripts/generate-icons.sh` | Generate app icons from SVG |

## 📦 Distribution

### Building for Distribution
```bash
npm run dist:mac
```

This creates:
- `Print Client.dmg` - Installer disk image
- `Print Client.zip` - Compressed app bundle

### Code Signing (Optional)
For distribution outside your Mac, you'll need to code sign the app:

1. **Get an Apple Developer Account**
2. **Set environment variables:**
   ```bash
   export APPLE_ID="your-apple-id@example.com"
   export APPLE_ID_PASS="your-app-specific-password"
   export APPLE_TEAM_ID="your-team-id"
   ```
3. **Build with signing:**
   ```bash
   npm run dist:mac
   ```

## 🔧 Configuration

### App Settings
The app configuration is stored in:
- `print_client_config.json` - Main configuration
- `venv/` - Python virtual environment
- `static/dist/` - Built React frontend

### Customization
- **App Icon**: Replace `assets/icon.icns`
- **App Name**: Edit `package-electron.json` → `productName`
- **Bundle ID**: Edit `package-electron.json` → `appId`

## 🐛 Troubleshooting

### Common Issues

**App won't start:**
```bash
# Check if Flask server is running
lsof -i :7010

# Check app logs
Console.app → Search for "Print Client"
```

**Build fails:**
```bash
# Clean and rebuild
rm -rf node_modules
rm -rf frontend/node_modules
rm -rf dist
npm install
cd frontend && npm install && cd ..
./build-mac-app.sh
```

**Permission denied:**
```bash
# Fix permissions
sudo chown -R $(whoami) /Applications/Print\ Client.app
chmod +x /Applications/Print\ Client.app/Contents/MacOS/*
```

### Debug Mode
To run with debug logging:
```bash
NODE_ENV=development npm run dev
```

## 📋 File Structure

```
print-client/
├── electron-main.js          # Main Electron process
├── preload.js               # Preload script for security
├── package.json             # Electron package configuration
├── build-mac-app-simple.sh  # One-click build & install script
├── run-dev.sh              # Development mode runner
├── print_dashboard_insepctionapp.py  # Flask backend
├── requirements.txt         # Python dependencies
├── venv/                   # Python virtual environment (bundled with app)
├── assets/
│   ├── icon.svg            # Source icon (SVG)
│   ├── icon.png            # Icon (1024x1024 PNG)
│   ├── icon.icns           # macOS app icon
│   ├── entitlements.mac.plist  # macOS entitlements
│   └── dmg-background.png  # DMG installer background
├── scripts/
│   ├── generate-icons.sh   # Icon generation script
│   └── notarize.js         # Code signing script
├── dist/                   # Built app (generated)
│   └── mac-arm64/          # or mac/ for Intel
│       └── Print Client.app
└── README-Mac-App.md       # This file
```

## 🔧 How It Works

### Python Virtual Environment Bundling

The app bundles a Python virtual environment (`venv/`) with all dependencies. This ensures:
- ✅ No Python installation required on target machine (if bundled venv matches architecture)
- ✅ Consistent dependency versions
- ✅ Isolated from system Python

The Electron main process (`electron-main.js`) handles Python detection in this priority:
1. **Bundled venv** - Uses `Resources/venv/bin/python3` if available
2. **Homebrew Python** - Falls back to `/opt/homebrew/bin/python3` (Apple Silicon) or `/usr/local/bin/python3` (Intel)
3. **System Python** - Uses `/usr/bin/python3` as last resort

### PYTHONPATH Configuration

When using system Python with bundled venv, the app sets `PYTHONPATH` to point to the bundled `site-packages` directory. This allows the bundled Flask and other dependencies to be used even with system Python.

## 🔄 Updates

### Auto-Updates
The app includes auto-update functionality using `electron-updater`. Updates are checked on app startup.

### Manual Updates
To update manually:
1. Download the new version
2. Replace the existing app in `/Applications`
3. Restart the app

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the main Print Client documentation
3. Check the console logs for error messages
4. Ensure all prerequisites are installed

## 🎯 Next Steps

After building the Mac app:
1. **Test thoroughly** - Ensure all features work as expected
2. **Create installer** - Use the DMG for easy installation
3. **Distribute** - Share with your team or customers
4. **Monitor** - Watch for any issues in production use

The Mac app provides a native experience while maintaining all the functionality of the web-based Print Client! 