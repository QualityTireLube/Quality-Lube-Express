# Print Client - M1 iMac Installation Guide

## Quick Installation (5 minutes)

### Step 1: Install the App
```bash
# Remove old version
sudo rm -rf "/Applications/Print Client.app"

# Mount DMG and copy app
open "~/Desktop/Print Client-1.0.16-arm64.dmg"
# Drag "Print Client.app" from DMG to Applications folder
```

### Step 2: Bypass Gatekeeper (Critical for M1 Macs)
```bash
# Remove quarantine (this bypasses the "unidentified developer" block)
sudo xattr -rd com.apple.quarantine "/Applications/Print Client.app"
sudo xattr -c "/Applications/Print Client.app"

# Fix permissions for M1
sudo chmod -R 755 "/Applications/Print Client.app"
sudo chown -R $(whoami):staff "/Applications/Print Client.app"
```

### Step 3: Create Easy Launch Options

**Desktop Shortcut:**
```bash
# Create a command file on desktop
cat > ~/Desktop/Print\ Client.command << 'EOF'
#!/bin/bash
/Applications/Print\ Client.app/Contents/MacOS/Print\ Client
EOF
chmod +x ~/Desktop/Print\ Client.command
```

**Dock Shortcut:**
- Drag `Print Client.app` from Applications to your Dock

### Step 4: First Launch
```bash
# Test run from terminal (recommended first time)
/Applications/Print\ Client.app/Contents/MacOS/Print\ Client
```

## Troubleshooting M1 Issues

### If macOS Still Blocks the App:
1. **System Preferences** → **Security & Privacy** → **General**
2. Look for "Print Client was blocked..." message
3. Click **"Allow Anyway"**
4. Try launching again

### If Python Issues Persist:
The v1.0.16 includes automatic Python fallback:
- Tries bundled Python first
- Falls back to Homebrew Python (`/opt/homebrew/bin/python3`)
- Falls back to system Python (`/usr/bin/python3`)

### Alternative Launch Methods:
```bash
# From terminal (always works)
open -a "Print Client"

# Direct executable
/Applications/Print\ Client.app/Contents/MacOS/Print\ Client

# Via desktop shortcut
~/Desktop/Print\ Client.command
```

## Apple Silicon Optimizations

✅ **Native ARM64 Build** - Optimized for M1/M2 processors  
✅ **Python Fallback System** - Works with M1 Python installations  
✅ **Gatekeeper Bypass** - Removes code signing restrictions  
✅ **Permission Management** - Proper M1 file permissions  

## Success Indicators

When working correctly, you should see:
```
🔄 Starting Flask server...
⚠️  Bundled Python not found, using system Python (Homebrew)
✅ Successfully loaded app from http://localhost:7011
```

The app will open and Flask dashboard will be accessible on port 7011.