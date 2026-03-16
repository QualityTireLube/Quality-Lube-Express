"""
CUPS Management Flask routes for the Print Client Dashboard.
Handles CUPS printer system management, setup and diagnostics.
Refactored from print_dashboard_insepctionapp.py on 2024 - Section 6: Flask routes/blueprints
"""

from flask import Blueprint, request, jsonify, render_template_string
import subprocess
import sys
import os

# Create blueprint
cups_bp = Blueprint('cups', __name__)

@cups_bp.route("/cups-management")
def cups_management():
    """CUPS printer management interface"""
    return render_template_string("""
    <html>
    <head>
        <title>CUPS Management</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; }
            .command-btn { padding: 8px 15px; margin: 5px; background: #007cba; color: white; border: none; cursor: pointer; }
            .command-btn:hover { background: #005a8b; }
            .output { background: #f5f5f5; padding: 10px; margin: 10px 0; border-left: 4px solid #007cba; white-space: pre-wrap; font-family: monospace; }
            input[type="text"] { width: 300px; padding: 5px; }
        </style>
        <script>
            function runCommand(endpoint, data = {}) {
                const outputDiv = document.getElementById('output');
                outputDiv.innerHTML = 'Running command...';
                
                const formData = new FormData();
                for (const key in data) {
                    formData.append(key, data[key]);
                }
                
                fetch(endpoint, {
                    method: 'POST',
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    outputDiv.innerHTML = JSON.stringify(data, null, 2);
                })
                .catch(error => {
                    outputDiv.innerHTML = 'Error: ' + error.message;
                });
            }
            
            function getCupsInfo(endpoint) {
                fetch(endpoint)
                .then(response => response.json())
                .then(data => {
                    document.getElementById('output').innerHTML = JSON.stringify(data, null, 2);
                })
                .catch(error => {
                    document.getElementById('output').innerHTML = 'Error: ' + error.message;
                });
            }
        </script>
    </head>
    <body>
        <h1>🖨️ CUPS Printer Management</h1>
        
        <div class="section">
            <h3>📋 Printer Information</h3>
            <button class="command-btn" onclick="getCupsInfo('/get-cups-printers')">Get CUPS Printers</button>
            <button class="command-btn" onclick="getCupsInfo('/get-all-cups-info')">Get All CUPS Info</button>
            <button class="command-btn" onclick="getCupsInfo('/get-cups-status')">Get CUPS Status</button>
            <button class="command-btn" onclick="getCupsInfo('/get-cups-logs')">Get CUPS Logs</button>
        </div>
        
        <div class="section">
            <h3>🔧 Printer Setup</h3>
            <div style="margin: 10px 0;">
                <label>Brother QL-800 Setup:</label><br>
                <input type="text" id="printer-name" placeholder="Printer Name (e.g., Brother_QL_800)" value="Brother_QL_800">
                <input type="text" id="printer-uri" placeholder="Printer URI (e.g., usb://Brother/QL-800)" value="usb://Brother/QL-800">
                <button class="command-btn" onclick="setupBrotherQL800()">Setup Brother QL-800</button>
            </div>
        </div>
        
        <div class="section">
            <h3>⚡ Custom Commands</h3>
            <div style="margin: 10px 0;">
                <input type="text" id="custom-command" placeholder="Enter CUPS command (e.g., lpstat -a)" value="lpstat -a">
                <button class="command-btn" onclick="runCustomCommand()">Run Command</button>
            </div>
        </div>
        
        <div class="section">
            <h3>📤 Command Output</h3>
            <div id="output" class="output">Ready to execute commands...</div>
        </div>
        
        <script>
            function setupBrotherQL800() {
                const name = document.getElementById('printer-name').value;
                const uri = document.getElementById('printer-uri').value;
                runCommand('/setup-brother-ql800-custom', {
                    printer_name: name,
                    printer_uri: uri
                });
            }
            
            function runCustomCommand() {
                const command = document.getElementById('custom-command').value;
                runCommand('/run-cups-command', {
                    command: command
                });
            }
        </script>
    </body>
    </html>
    """)

@cups_bp.route("/setup-brother-ql800-custom", methods=["POST"])
def setup_brother_ql800_custom():
    """Setup Brother QL-800 printer with custom configuration"""
    # Import functions from main app safely
    if 'print_dashboard_insepctionapp' in sys.modules:
        main_module = sys.modules['print_dashboard_insepctionapp']
        log_message = main_module.log_message
    else:
        def log_message(msg, is_error=False):
            print(f"CUPS: {msg}")
    
    try:
        printer_name = request.form.get("printer_name", "Brother_QL_800").strip()
        printer_uri = request.form.get("printer_uri", "usb://Brother/QL-800").strip()
        
        log_message(f"Setting up Brother QL-800 printer: {printer_name} at {printer_uri}")
        
        # Add the printer using lpadmin
        commands = [
            f"lpadmin -p {printer_name} -E -v {printer_uri} -m brother_ql_800.ppd",
            f"lpoptions -p {printer_name} -o media=Custom.62x29mm",
            f"lpoptions -p {printer_name} -o Resolution=300dpi",
            f"lpoptions -p {printer_name} -o PageSize=Custom.62x29mm"
        ]
        
        results = []
        for cmd in commands:
            try:
                result = subprocess.run(cmd.split(), capture_output=True, text=True, timeout=30)
                results.append({
                    "command": cmd,
                    "returncode": result.returncode,
                    "stdout": result.stdout,
                    "stderr": result.stderr
                })
                log_message(f"Command executed: {cmd} (return code: {result.returncode})")
            except subprocess.TimeoutExpired:
                results.append({
                    "command": cmd,
                    "error": "Command timed out"
                })
                log_message(f"Command timed out: {cmd}", True)
            except Exception as e:
                results.append({
                    "command": cmd,
                    "error": str(e)
                })
                log_message(f"Command failed: {cmd} - {str(e)}", True)
        
        log_message(f"Brother QL-800 setup completed for {printer_name}")
        return jsonify({
            "success": True,
            "printer_name": printer_name,
            "printer_uri": printer_uri,
            "commands": results
        })
        
    except Exception as e:
        log_message(f"Brother QL-800 setup error: {str(e)}", True)
        return jsonify({"success": False, "error": str(e)})

@cups_bp.route("/get-cups-printers")
def get_cups_printers():
    """Get list of CUPS printers"""
    try:
        result = subprocess.run(["lpstat", "-a"], capture_output=True, text=True, timeout=10)
        printers = []
        if result.returncode == 0:
            for line in result.stdout.strip().split('\n'):
                if line.strip():
                    printers.append(line.strip())
        
        return jsonify({
            "success": True,
            "printers": printers,
            "raw_output": result.stdout,
            "error_output": result.stderr
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@cups_bp.route("/get-all-cups-info")
def get_all_cups_info():
    """Get comprehensive CUPS information"""
    try:
        commands = {
            "printers": ["lpstat", "-a"],
            "jobs": ["lpstat", "-o"],
            "devices": ["lpstat", "-v"],
            "classes": ["lpstat", "-c"],
            "default": ["lpstat", "-d"]
        }
        
        results = {}
        for name, cmd in commands.items():
            try:
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
                results[name] = {
                    "returncode": result.returncode,
                    "stdout": result.stdout,
                    "stderr": result.stderr
                }
            except Exception as e:
                results[name] = {"error": str(e)}
        
        return jsonify({"success": True, "cups_info": results})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@cups_bp.route("/get-cups-status")
def get_cups_status():
    """Get CUPS service status"""
    try:
        # Check if CUPS is running
        commands = {
            "service_status": ["brew", "services", "list", "cups"],
            "cupsd_status": ["ps", "aux"],
        }
        
        results = {}
        for name, cmd in commands.items():
            try:
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
                if name == "cupsd_status":
                    # Filter for cupsd processes
                    cupsd_lines = [line for line in result.stdout.split('\n') if 'cupsd' in line.lower()]
                    results[name] = {
                        "returncode": result.returncode,
                        "cupsd_processes": cupsd_lines,
                        "stderr": result.stderr
                    }
                else:
                    results[name] = {
                        "returncode": result.returncode,
                        "stdout": result.stdout,
                        "stderr": result.stderr
                    }
            except Exception as e:
                results[name] = {"error": str(e)}
        
        return jsonify({"success": True, "status": results})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@cups_bp.route("/get-cups-logs")
def get_cups_logs():
    """Get CUPS error logs"""
    try:
        log_paths = [
            "/var/log/cups/error_log",
            "/usr/local/var/log/cups/error_log",
            "/opt/homebrew/var/log/cups/error_log"
        ]
        
        logs = {}
        for log_path in log_paths:
            if os.path.exists(log_path):
                try:
                    with open(log_path, 'r') as f:
                        # Get last 50 lines
                        lines = f.readlines()
                        logs[log_path] = lines[-50:] if len(lines) > 50 else lines
                except Exception as e:
                    logs[log_path] = f"Error reading log: {str(e)}"
            else:
                logs[log_path] = "Log file not found"
        
        return jsonify({"success": True, "logs": logs})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@cups_bp.route("/run-cups-command", methods=["POST"])
def run_cups_command():
    """Run custom CUPS command"""
    # Import functions from main app safely
    if 'print_dashboard_insepctionapp' in sys.modules:
        main_module = sys.modules['print_dashboard_insepctionapp']
        log_message = main_module.log_message
    else:
        def log_message(msg, is_error=False):
            print(f"CUPS: {msg}")
    
    try:
        command = request.form.get("command", "").strip()
        if not command:
            return jsonify({"success": False, "error": "No command provided"})
        
        # Security: Allow only CUPS-related commands
        allowed_commands = ['lpstat', 'lpadmin', 'lpoptions', 'lpq', 'lprm', 'cupsctl', 'lpinfo']
        cmd_parts = command.split()
        if not cmd_parts or cmd_parts[0] not in allowed_commands:
            return jsonify({
                "success": False, 
                "error": f"Command not allowed. Allowed: {', '.join(allowed_commands)}"
            })
        
        log_message(f"Running CUPS command: {command}")
        
        result = subprocess.run(
            cmd_parts, 
            capture_output=True, 
            text=True, 
            timeout=30
        )
        
        log_message(f"CUPS command completed: {command} (return code: {result.returncode})")
        
        return jsonify({
            "success": True,
            "command": command,
            "returncode": result.returncode,
            "stdout": result.stdout,
            "stderr": result.stderr
        })
        
    except subprocess.TimeoutExpired:
        log_message(f"CUPS command timed out: {command}", True)
        return jsonify({"success": False, "error": "Command timed out"})
    except Exception as e:
        log_message(f"CUPS command error: {str(e)}", True)
        return jsonify({"success": False, "error": str(e)}) 