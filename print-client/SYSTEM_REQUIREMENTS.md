# 🖨️ Print Client v1.0.18 - System Requirements & Setup

## 📋 **System Requirements**

### **macOS Requirements**
- **macOS**: 10.14 (Mojave) or later
- **Architecture**: Intel (x64) or Apple Silicon (ARM64)
- **Python**: 3.11+ with Flask package
- **Memory**: 512MB RAM minimum
- **Storage**: 200MB free space

### **Python Dependencies**
- **Python 3.11+** (3.13 recommended)
- **Flask 2.0+** for web dashboard
- **Automatic Installation**: The app can install Flask automatically

## 🚀 **Quick Setup (Recommended)**

### **Option 1: Automated Setup**
```bash
# Download and run the Python setup script
curl -O https://your-domain.com/setup-python-dependencies.sh
chmod +x setup-python-dependencies.sh
./setup-python-dependencies.sh
```

### **Option 2: Manual Setup**
```bash
# 1. Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. Install Python
brew install python

# 3. Install Flask
pip3 install flask

# 4. Launch Print Client
open -a "Print Client"
```

## 🔧 **Advanced Configuration**

### **Python Installation Paths**
Print Client automatically searches these locations:
1. **Bundled Python** (future versions): `/Contents/Resources/python/bin/python3`
2. **Homebrew (Apple Silicon)**: `/opt/homebrew/bin/python3`
3. **Homebrew (Intel)**: `/usr/local/bin/python3`
4. **System Python**: `/usr/bin/python3`
5. **Version-Specific Paths**: `/opt/homebrew/opt/python@3.*/bin/python3`

### **Environment Variables**
Optional environment variables for advanced users:
```bash
export PRINT_CLIENT_PYTHON="/path/to/your/python3"
export PRINT_CLIENT_PORT=7011
export FLASK_ENV=production
```

### **Custom Python Installation**
If you have Python in a custom location:
```bash
# Create a symlink to a standard location
sudo ln -s /your/custom/python3 /opt/homebrew/bin/python3

# Or add to PATH
export PATH="/your/custom/python/bin:$PATH"
```

## 🩺 **Troubleshooting**

### **"Python 3 not found" Error**
```bash
# Check if Python is installed
python3 --version

# If not installed:
brew install python

# Test Flask availability
python3 -c "import flask; print('Flask', flask.__version__)"

# If Flask not found:
pip3 install flask
```

### **"Flask not found" Error**
```bash
# Install Flask with user flag
pip3 install flask --user

# Or system-wide (may need sudo)
pip3 install flask

# For M1 Macs with permission issues:
pip3 install flask --user --break-system-packages
```

### **Permission Issues**
```bash
# Fix app permissions
sudo xattr -rd com.apple.quarantine "/Applications/Print Client.app"
sudo chmod -R 755 "/Applications/Print Client.app"

# Fix Python permissions
sudo chown -R $(whoami) /opt/homebrew/lib/python*
```

### **Port Conflicts**
If port 7011 is in use:
```bash
# Find what's using the port
lsof -i :7011

# Kill the process (replace PID)
kill -9 <PID>

# Or use a different port
export PRINT_CLIENT_PORT=7012
```

## 📊 **Verification Commands**

### **Check Python Installation**
```bash
# List all Python versions
ls -la /opt/homebrew/bin/python*
ls -la /usr/local/bin/python*
ls -la /usr/bin/python*

# Test specific Python
/opt/homebrew/bin/python3 --version
/opt/homebrew/bin/python3 -c "import flask; print('Flask OK')"
```

### **Check Print Client Status**
```bash
# Check if app is running
ps aux | grep "Print Client"

# Check if Flask is responding
curl http://localhost:7011/

# View app logs (if running from terminal)
/Applications/Print\ Client.app/Contents/MacOS/Print\ Client
```

## 🌐 **Network Configuration**

### **Default URLs**
- **Dashboard**: http://localhost:7011
- **API**: http://localhost:7011/api
- **Health Check**: http://localhost:7011/health

### **Firewall Settings**
If using macOS firewall, allow incoming connections for Print Client:
1. **System Preferences** → **Security & Privacy** → **Firewall**
2. Click **Firewall Options**
3. Add **Print Client** and set to **Allow incoming connections**

## 📞 **Support Information**

### **Log Locations**
- **App Logs**: Console.app → Search "Print Client"
- **Python Errors**: Terminal output when running app directly
- **System Info**: `/tmp/print-client-python-info.json` (after setup)

### **Diagnostic Commands**
```bash
# Generate system report
system_profiler SPSoftwareDataType SPHardwareDataType > ~/Desktop/print-client-system-info.txt

# Python environment report
pip3 list > ~/Desktop/print-client-python-packages.txt

# Network status
netstat -an | grep 7011 > ~/Desktop/print-client-network-status.txt
```

---

**Print Client v1.0.18** - Smart Python detection with comprehensive error handling