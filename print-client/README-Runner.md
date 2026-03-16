# Print Client Runner

A simple executable script to run the Print Client on any computer.

## Quick Start

### macOS / Linux

1. Open Terminal
2. Navigate to the print-client folder
3. Run:
   ```bash
   ./run-print-client.sh
   ```

### Windows

1. Double-click `run-print-client.bat`
   
   OR
   
2. Open Command Prompt, navigate to the print-client folder, and run:
   ```cmd
   run-print-client.bat
   ```

## What the Script Does

The script automatically handles three steps:

### Step 1: Check for Python
- Checks if Python 3 is installed on your system
- If Python is NOT installed, it provides installation instructions for your OS
- Supports macOS (Homebrew), Linux (apt/dnf), and Windows

### Step 2: Install Dependencies (First Run Only)
- Creates a virtual environment (`print_client_env/`)
- Installs required Python packages:
  - Flask
  - requests
  - python-socketio
  - websocket-client
  - PyPDF2
- Creates a flag file (`.deps_installed`) to skip this step on future runs

### Step 3: Run Print Client
- Starts the Print Client dashboard
- Dashboard available at: http://localhost:7010 (or next available port)

## Installing Python

### macOS

**Option 1: Homebrew (Recommended)**
```bash
# Install Homebrew first (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Python
brew install python
```

**Option 2: Download from python.org**
- Visit: https://www.python.org/downloads/macos/
- Download and run the installer

### Windows

**Option 1: python.org (Recommended)**
- Visit: https://www.python.org/downloads/windows/
- Download and run the installer
- ⚠️ **IMPORTANT**: Check "Add Python to PATH" during installation

**Option 2: Microsoft Store**
- Open Microsoft Store
- Search for "Python"
- Install Python 3.11 or 3.12

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install python3 python3-pip python3-venv
```

### Linux (Fedora/RHEL)
```bash
sudo dnf install python3 python3-pip
```

## Troubleshooting

### "Python not found" error
- Make sure Python is installed (see installation instructions above)
- On Windows, ensure "Add Python to PATH" was checked during installation
- Try restarting your terminal/command prompt after installing Python

### "Failed to create virtual environment"
- On Linux, install venv: `sudo apt install python3-venv`
- On macOS, reinstall Python: `brew reinstall python`

### Dependencies fail to install
- Check your internet connection
- Try running with elevated permissions (sudo on macOS/Linux, Run as Administrator on Windows)

### Port already in use
- The script automatically finds an available port (7010-7020)
- If all ports are in use, close other applications using those ports

## Files Created

After first run, these files/folders are created:

```
print-client/
├── print_client_env/     # Python virtual environment (dependencies)
├── .deps_installed       # Flag file (indicates dependencies are installed)
└── ...
```

## Resetting Dependencies

To force reinstall of dependencies:

```bash
# macOS/Linux
rm -rf print_client_env .deps_installed

# Windows
rmdir /s /q print_client_env
del .deps_installed
```

Then run the script again.
