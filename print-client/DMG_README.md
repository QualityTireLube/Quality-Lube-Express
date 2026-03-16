# 🖨️ Print Client v1.0.16 - M1 iMac Installation

## 🚀 **Quick Install (Recommended)**

**Open Terminal and run:**
```bash
cd "/Volumes/Print Client 1.0.16" && ./install-print-client-m1.sh
```

## 📱 **One-Liner Install**
```bash
sudo rm -rf "/Applications/Print Client.app" && cp -R "/Volumes/Print Client 1.0.16/Print Client.app" /Applications/ && sudo xattr -rd com.apple.quarantine "/Applications/Print Client.app" && echo "✅ Installed! Launch from Applications"
```

## 🎯 **Manual Install**
1. **Drag** `Print Client.app` to `Applications` folder
2. **Remove Quarantine** (Important for M1 Macs):
   ```bash
   sudo xattr -rd com.apple.quarantine "/Applications/Print Client.app"
   ```
3. **Launch** from Applications or run:
   ```bash
   /Applications/Print\ Client.app/Contents/MacOS/Print\ Client
   ```

## 🌐 **Access URLs**
- **Print Dashboard**: http://localhost:7011
- **Health Check**: http://localhost:7011/health

## ✨ **What's New in v1.0.16**
- ✅ **Python Fallback System** - Works on any Mac even without bundled Python
- ✅ **M1/Apple Silicon Optimized** - Native ARM64 build
- ✅ **Improved Error Handling** - Better diagnostics and recovery

## 🔧 **Troubleshooting**

### If macOS blocks the app:
1. **System Preferences** → **Security & Privacy** → **General**
2. Click **"Allow Anyway"** next to Print Client
3. Try launching again

### If Terminal shows "Permission Denied":
```bash
chmod +x "/Volumes/Print Client 1.0.16/install-print-client-m1.sh"
```

### Alternative Launch Methods:
```bash
# From Applications
open -a "Print Client"

# Direct terminal launch
/Applications/Print\ Client.app/Contents/MacOS/Print\ Client

# Check if running
ps aux | grep "Print Client"
```

## 📞 **Support**
- **Flask Server Port**: 7011
- **Expected Output**: `✅ Successfully loaded app from http://localhost:7011`
- **Python Fallback**: Uses system Python if bundled fails

---
**Print Client v1.0.16** - Optimized for Apple Silicon Macs