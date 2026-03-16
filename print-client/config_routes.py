"""
Configuration-related Flask routes for the Print Client Dashboard.
Handles server settings, tokens, IP configuration, and credential setup.
Refactored from print_dashboard_insepctionapp.py on 2024 - Section 6: Flask routes/blueprints
"""

from flask import Blueprint, request, jsonify, redirect, url_for, render_template_string
import config_manager
import auth_token_manager

# Create blueprint
config_bp = Blueprint('config', __name__)

@config_bp.route("/save-client-settings", methods=["POST"])
def save_client_settings():
    """Save client name and server URL settings"""
    import os
    
    # Check if this is an AJAX request (wants JSON response)
    wants_json = request.headers.get('Accept', '').find('application/json') != -1 or request.args.get('ajax') == '1'
    
    client_name = request.form.get("client_name", "").strip()
    server_url = request.form.get("server_url", "").strip()
    
    if not server_url:
        if wants_json:
            return jsonify({"success": False, "error": "Server URL is required"}), 400
        return "Server URL is required", 400
    
    # Load current config and update
    config = config_manager.load_config()
    old_client_name = config.get("CLIENT_NAME", "")
    old_server_url = config.get("PRINT_SERVER", "")
    
    config["PRINT_SERVER"] = server_url
    config["LOGIN_URL"] = server_url.rstrip('/') + '/api/login'
    config["USE_DYNAMIC_IP"] = False
    
    if client_name:
        config["CLIENT_NAME"] = client_name
    
    # Save to config file
    success = config_manager.save_config(config)
    
    if success:
        from flask import current_app
        current_app.config["PRINT_SERVER"] = server_url
        current_app.config["LOGIN_URL"] = config["LOGIN_URL"]
        current_app.config["USE_DYNAMIC_IP"] = False
        if client_name:
            current_app.config["CLIENT_NAME"] = client_name
        
        import sys
        if 'print_dashboard_insepctionapp' in sys.modules:
            log_message = sys.modules['print_dashboard_insepctionapp'].log_message
            log_message(f"✅ Settings saved!")
            log_message(f"✅ Client Name: {client_name}")
            log_message(f"✅ Server URL: {server_url}")
            log_message(f"⚠️ Restart the print client for changes to take full effect")
        
        # Check if settings changed that require restart
        needs_restart = (client_name != old_client_name) or (server_url != old_server_url)
        
        if wants_json:
            return jsonify({
                "success": True,
                "message": "Settings saved successfully",
                "needsRestart": needs_restart,
                "clientName": client_name,
                "serverUrl": server_url
            })
        
        return redirect(url_for('main.index'))
    else:
        if wants_json:
            return jsonify({"success": False, "error": "Failed to save configuration"}), 500
        return "Failed to save configuration", 500

@config_bp.route("/restart-server", methods=["POST"])
def restart_server():
    """Restart the print client server"""
    import os
    import sys
    import subprocess
    import threading
    
    def delayed_restart():
        """Restart the server after a short delay to allow response to be sent"""
        import time
        time.sleep(1)
        
        # Get the current script path
        script_dir = os.path.dirname(os.path.abspath(__file__))
        main_script = os.path.join(script_dir, 'print_dashboard_insepctionapp.py')
        
        # Get the Python executable
        python_exe = sys.executable
        
        # Start a new process
        subprocess.Popen([python_exe, main_script], 
                        cwd=script_dir,
                        start_new_session=True)
        
        # Exit the current process
        os._exit(0)
    
    # Log the restart
    if 'print_dashboard_insepctionapp' in sys.modules:
        log_message = sys.modules['print_dashboard_insepctionapp'].log_message
        log_message(f"🔄 Restarting print client server...")
    
    # Start the restart in a background thread
    restart_thread = threading.Thread(target=delayed_restart)
    restart_thread.daemon = True
    restart_thread.start()
    
    return jsonify({
        "success": True,
        "message": "Server is restarting... Please wait a moment and refresh the page."
    })

@config_bp.route("/set-server", methods=["POST"])
def set_server():
    """Set print server URL"""
    server_url = request.form.get("server_url", "").strip()
    if not server_url:
        return "Server URL is required", 400
    
    # Load current config and update server
    config = config_manager.load_config()
    config["PRINT_SERVER"] = server_url
    
    # Also update LOGIN_URL to match the new server
    # Extract base URL and set login endpoint
    login_url = server_url.rstrip('/') + '/api/login'
    config["LOGIN_URL"] = login_url
    
    # Disable dynamic IP since user is manually setting the server
    config["USE_DYNAMIC_IP"] = False
    
    success = config_manager.save_config(config)
    if success:
        # Update the app config as well
        from flask import current_app
        current_app.config["PRINT_SERVER"] = server_url
        current_app.config["LOGIN_URL"] = login_url
        current_app.config["USE_DYNAMIC_IP"] = False
        
        # Log the change
        import sys
        if 'print_dashboard_insepctionapp' in sys.modules:
            log_message = sys.modules['print_dashboard_insepctionapp'].log_message
            log_message(f"✅ Server URL updated to: {server_url}")
            log_message(f"✅ Login URL updated to: {login_url}")
        
        return redirect(url_for('main.index'))
    else:
        return "Failed to save configuration", 500

@config_bp.route("/test-connection", methods=["GET"])
def test_connection():
    """Test connection to the print server"""
    from flask import current_app
    import requests
    
    server_url = current_app.config.get("PRINT_SERVER", "")
    if not server_url:
        return jsonify({"success": False, "message": "No server URL configured"})
    
    try:
        # Try to reach the server's health or status endpoint
        test_url = server_url.rstrip('/') + '/api/print/printers'
        response = requests.get(test_url, timeout=5, verify=False)
        
        if response.status_code == 200:
            return jsonify({
                "success": True, 
                "message": f"Connected to {server_url}",
                "status_code": response.status_code
            })
        elif response.status_code == 401:
            return jsonify({
                "success": True, 
                "message": f"Server reachable (auth required)",
                "status_code": response.status_code
            })
        else:
            return jsonify({
                "success": False, 
                "message": f"Server returned status {response.status_code}",
                "status_code": response.status_code
            })
    except requests.exceptions.ConnectTimeout:
        return jsonify({"success": False, "message": "Connection timed out - check IP address"})
    except requests.exceptions.ConnectionError as e:
        return jsonify({"success": False, "message": f"Cannot connect - server may be offline or IP incorrect"})
    except Exception as e:
        return jsonify({"success": False, "message": f"Error: {str(e)}"})

@config_bp.route("/refresh-ip", methods=["POST"])
def refresh_ip():
    """Refresh local IP address"""
    # Get fresh dynamic config
    fresh_config = config_manager.get_dynamic_server_config()
    
    # Update current app config
    from flask import current_app
    current_app.config.update(fresh_config)
    
    return redirect(url_for('main.index'))

@config_bp.route("/toggle-dynamic-ip", methods=["POST"])
def toggle_dynamic_ip():
    """Toggle dynamic IP detection"""
    # Load current config
    config = config_manager.load_config()
    
    # Toggle dynamic IP setting
    current_dynamic = config.get("USE_DYNAMIC_IP", True)
    config["USE_DYNAMIC_IP"] = not current_dynamic
    
    # Save updated config
    success = config_manager.save_config(config)
    if success:
        # Update app config and refresh if now using dynamic IP
        from flask import current_app
        current_app.config["USE_DYNAMIC_IP"] = config["USE_DYNAMIC_IP"]
        
        if config["USE_DYNAMIC_IP"]:
            # Refresh with dynamic config
            fresh_config = config_manager.get_dynamic_server_config()
            current_app.config.update(fresh_config)
    
    return redirect(url_for('main.index'))

@config_bp.route("/set-token", methods=["POST"])
def set_token():
    """Set authentication token"""
    # Try both field names for compatibility
    token = request.form.get("auth_token", "").strip() or request.form.get("token", "").strip()
    if not token:
        return "Token is required", 400
    
    # Update app config first
    from flask import current_app
    current_app.config["AUTH_TOKEN"] = token
    
    # Save token with proper log function
    import sys
    if 'print_dashboard_insepctionapp' in sys.modules:
        log_message = sys.modules['print_dashboard_insepctionapp'].log_message
        auth_token_manager.save_token(token, log_message)
        log_message("✅ Token saved successfully via /set-token route")
        log_message("💡 Tip: You can also create permanent tokens via 'Manage Print Client Tokens' in the main app")
    else:
        auth_token_manager.save_token(token, lambda msg, err=False: print(f"LOG: {msg}"))
        print("💡 Tip: You can also create permanent tokens via 'Manage Print Client Tokens' in the main app")
    
    return redirect(url_for('main.index'))

@config_bp.route("/set-verify", methods=["POST"])
def set_verify():
    """Set SSL verification setting"""
    verify_ssl = request.form.get("verify_ssl") == "true"
    
    # Load current config and update SSL setting
    config = config_manager.load_config()
    config["VERIFY_SSL"] = verify_ssl
    
    success = config_manager.save_config(config)
    if success:
        # Update app config
        from flask import current_app
        current_app.config["VERIFY_SSL"] = verify_ssl
    
    return redirect(url_for('main.index'))

@config_bp.route("/set-interval", methods=["POST"])
def set_interval():
    """Set polling interval"""
    try:
        interval = int(request.form.get("interval", "5"))
        if interval < 1:
            return "Interval must be at least 1 second", 400
        
        # Load current config and update interval
        config = config_manager.load_config()
        config["POLL_INTERVAL"] = interval
        
        success = config_manager.save_config(config)
        if success:
            # Update app config and global variable
            from flask import current_app
            current_app.config["POLL_INTERVAL"] = interval
            
            # Update the global POLL_INTERVAL in main app
            import print_dashboard_insepctionapp
            if hasattr(print_dashboard_insepctionapp, 'POLL_INTERVAL'):
                print_dashboard_insepctionapp.POLL_INTERVAL = interval
        
        return redirect(url_for('main.index'))
    except ValueError:
        return "Invalid interval value", 400

@config_bp.route("/parse-config", methods=["POST"])
def parse_config():
    """Parse and apply configuration from text input"""
    config_text = request.form.get("config_data", "").strip()
    if not config_text:
        return "Configuration text is required", 400
    
    try:
        # Parse configuration - handle both key=value and Token Generator formats
        config_updates = {}
        lines = config_text.split('\n')
        
        # Check if this is Token Generator format
        if "Authentication Token:" in config_text or "Authorization: Bearer" in config_text:
            # Parse Token Generator format
            auth_token = None
            server_url = None
            
            for line in lines:
                line = line.strip()
                
                # Extract authentication token
                if line.startswith("Authentication Token:"):
                    auth_token = line.replace("Authentication Token:", "").strip()
                elif line.startswith("Authorization: Bearer"):
                    auth_token = line.replace("Authorization: Bearer", "").strip()
                
                # Extract server URL from printer or job endpoints
                elif "Get Printers:" in line and "https://" in line:
                    # Extract base server URL from printer endpoint
                    url_part = line.split("https://")[1]
                    if "/api/print/printers" in url_part:
                        server_url = "https://" + url_part.replace("/api/print/printers", "")
                elif "Submit Jobs:" in line and "https://" in line:
                    # Extract base server URL from job endpoint
                    url_part = line.split("https://")[1]
                    if "/api/print/jobs" in url_part:
                        server_url = "https://" + url_part.replace("/api/print/jobs", "")
            
            if auth_token:
                config_updates["AUTH_TOKEN"] = auth_token
            if server_url:
                config_updates["PRINT_SERVER"] = server_url
        
        else:
            # Parse simple key=value format
            for line in lines:
                line = line.strip()
                if line and '=' in line and not line.startswith('#'):
                    key, value = line.split('=', 1)
                    key = key.strip()
                    value = value.strip().strip('"\'')
                    
                    # Convert boolean strings
                    if value.lower() in ('true', 'false'):
                        value = value.lower() == 'true'
                    # Convert numeric strings
                    elif value.isdigit():
                        value = int(value)
                    
                    config_updates[key] = value
        
        if config_updates:
            # Load current config and apply updates - using safe imports
            import sys
            from flask import current_app
            
            # Get log_message function safely
            if 'print_dashboard_insepctionapp' in sys.modules:
                main_module = sys.modules['print_dashboard_insepctionapp']
                log_message = main_module.log_message
            else:
                def log_message(msg, is_error=False):
                    print(f"Config: {msg}")
            
            # Load current config with proper parameters
            current_config = config_manager.load_config(current_app, log_message)
            current_config.update(config_updates)
            
            # Save the updated config
            config_manager.save_config(current_app, log_message)
            
            # Update app config
            current_app.config.update(config_updates)
            
            # Handle special cases
            if "POLL_INTERVAL" in config_updates:
                if 'print_dashboard_insepctionapp' in sys.modules:
                    main_module = sys.modules['print_dashboard_insepctionapp']
                    if hasattr(main_module, 'POLL_INTERVAL'):
                        main_module.POLL_INTERVAL = config_updates["POLL_INTERVAL"]
            
            log_message(f"Configuration updated with {len(config_updates)} settings")
        
        return redirect(url_for('main.index'))
    
    except Exception as e:
        return f"Failed to parse configuration: {str(e)}", 400

@config_bp.route("/setup-credentials", methods=["GET", "POST"])
def setup_credentials():
    """Setup authentication credentials for print client"""
    if request.method == "POST":
        email = request.form.get("email", "").strip()
        password = request.form.get("password", "").strip()
        
        if not email or not password:
            return jsonify({"success": False, "error": "Email and password are required"})
        
        try:
            # Save credentials to config
            config = config_manager.load_config()
            config["PRINT_CLIENT_EMAIL"] = email
            config["PRINT_CLIENT_PASSWORD"] = password
            
            # Update app config
            from flask import current_app
            current_app.config.update(config)
            config_manager.save_config(config)
            
            # Test authentication immediately
            import sys
            if 'print_dashboard_insepctionapp' in sys.modules:
                log_message = sys.modules['print_dashboard_insepctionapp'].log_message
                log_message(f"🔑 Testing authentication with email: {email}")
                token = auth_token_manager.get_or_create_print_client_token(current_app, log_message, config_manager.load_config)
            else:
                token = None
            
            if token:
                log_message("✅ Authentication setup successful!")
                
                # Reconnect WebSocket with new token (using getattr for safe attribute access)
                import sys
                import time
                if 'print_dashboard_insepctionapp' in sys.modules:
                    main_module = sys.modules['print_dashboard_insepctionapp']
                    websocket_client = getattr(main_module, 'websocket_client', None)
                    disconnect_websocket = getattr(main_module, 'disconnect_websocket', lambda: None)
                    connect_websocket = getattr(main_module, 'connect_websocket', lambda: None)
                    if websocket_client is not None and getattr(websocket_client, 'connected', False):
                        disconnect_websocket()
                        time.sleep(1)
                        connect_websocket()
                
                return jsonify({
                    "success": True,
                    "message": "✅ Authentication credentials saved and tested successfully!"
                })
            else:
                return jsonify({
                    "success": False,
                    "error": "❌ Credentials saved but authentication test failed. Check server connection and credentials."
                })
                
        except Exception as e:
            import sys
            if 'print_dashboard_insepctionapp' in sys.modules:
                log_message = sys.modules['print_dashboard_insepctionapp'].log_message
                log_message(f"❌ Error setting up credentials: {e}", is_error=True)
            else:
                print(f"LOG: ❌ Error setting up credentials: {e}")
            return jsonify({
                "success": False,
                "error": f"❌ Error: {str(e)}"
            })
    
    # GET request - show setup form
    config = config_manager.load_config()
    current_email = config.get('PRINT_CLIENT_EMAIL', '')
    
    return render_template_string("""
    <html>
    <head>
        <title>Setup Print Client Authentication</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .container { max-width: 600px; margin: 0 auto; }
            input[type="text"], input[type="password"], input[type="email"] { 
                width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ddd; border-radius: 4px; 
            }
            button { background: #007bff; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; }
            button:hover { background: #0056b3; }
            .result { margin: 20px 0; padding: 15px; border-radius: 4px; }
            .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
            .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
            .info { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🔑 Setup Print Client Authentication</h1>
            
            <div class="info">
                <p><strong>Why do I need this?</strong></p>
                <p>Your print client needs valid login credentials to connect to the WebSocket server.</p>
            </div>
            
            <form id="credentialsForm">
                <h3>Enter Your Credentials</h3>
                <label for="email">Email:</label>
                <input type="email" id="email" name="email" value="{{ current_email }}" required>
                
                <label for="password">Password:</label>
                <input type="password" id="password" name="password" required>
                
                <button type="submit">Save & Test Credentials</button>
            </form>
            
            <div id="result"></div>
            
            <a href="/">← Back to Dashboard</a>
        </div>
        
        <script>
            document.getElementById('credentialsForm').addEventListener('submit', function(e) {
                e.preventDefault();
                
                const formData = new FormData(e.target);
                const resultDiv = document.getElementById('result');
                
                resultDiv.innerHTML = '<div class="result info">🔄 Testing credentials...</div>';
                
                fetch('/setup-credentials', {
                    method: 'POST',
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        resultDiv.innerHTML = `<div class="result success">${data.message}</div>`;
                        setTimeout(() => {
                            window.location.href = '/';
                        }, 2000);
                    } else {
                        resultDiv.innerHTML = `<div class="result error">${data.error}</div>`;
                    }
                })
                .catch(error => {
                    resultDiv.innerHTML = `<div class="result error">❌ Error: ${error}</div>`;
                });
            });
        </script>
    </body>
    </html>
    """, current_email=current_email)

@config_bp.route("/set-token-manual", methods=["GET", "POST"])
def set_token_manual():
    """Manually set JWT token for authentication"""
    if request.method == "POST":
        token = request.form.get("token", "").strip()
        
        if not token:
            return jsonify({"success": False, "error": "JWT token is required"})
        
        # Basic validation - check if it looks like a JWT
        if not token.count('.') == 2:
            return jsonify({"success": False, "error": "Invalid JWT format (should have 3 parts separated by dots)"})
        
        try:
            # Save the token
            from flask import current_app
            current_app.config["AUTH_TOKEN"] = token
            
            # Save token with proper log function
            import sys
            if 'print_dashboard_insepctionapp' in sys.modules:
                log_message = sys.modules['print_dashboard_insepctionapp'].log_message
                auth_token_manager.save_token(token, log_message)
            else:
                auth_token_manager.save_token(token, lambda msg, err=False: print(f"LOG: {msg}"))
            
            import sys
            if 'print_dashboard_insepctionapp' in sys.modules:
                log_message = sys.modules['print_dashboard_insepctionapp'].log_message
                log_message(f"✅ JWT token manually set and saved")
            else:
                print("LOG: ✅ JWT token manually set and saved")
            
            # Test the token by trying to connect WebSocket (using getattr for safe attribute access)
            if 'print_dashboard_insepctionapp' in sys.modules:
                log_message("🔌 Testing JWT token with WebSocket connection...")
                
                # Reconnect WebSocket with new token
                main_module = sys.modules['print_dashboard_insepctionapp']
                import time
                websocket_client = getattr(main_module, 'websocket_client', None)
                disconnect_websocket = getattr(main_module, 'disconnect_websocket', lambda: None)
                connect_websocket = getattr(main_module, 'connect_websocket', lambda: None)
                if websocket_client is not None and getattr(websocket_client, 'connected', False):
                    disconnect_websocket()
                    time.sleep(1)
                
                connect_websocket()
            
            return jsonify({
                "success": True,
                "message": "✅ JWT token saved successfully! WebSocket should now authenticate properly."
            })
            
        except Exception as e:
            import sys
            if 'print_dashboard_insepctionapp' in sys.modules:
                log_message = sys.modules['print_dashboard_insepctionapp'].log_message
                log_message(f"❌ Error setting JWT token: {e}", is_error=True)
            else:
                print(f"LOG: ❌ Error setting JWT token: {e}")
            return jsonify({
                "success": False,
                "error": f"❌ Error: {str(e)}"
            })
    
    # GET request - show token input form
    from flask import current_app
    current_token = current_app.config.get('AUTH_TOKEN', '')
    if current_token == 'print-client-token':
        current_token = ''
    
    return render_template_string("""
    <html>
    <head>
        <title>Manual JWT Token Setup</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .container { max-width: 600px; margin: 0 auto; }
            input[type="text"] { width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ddd; border-radius: 4px; }
            button { background: #007bff; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; }
            button:hover { background: #0056b3; }
            .result { margin: 20px 0; padding: 15px; border-radius: 4px; }
            .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
            .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
            .info { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🔑 Manual JWT Token Setup</h1>
            
            <form id="tokenForm">
                <label for="token">JWT Token:</label>
                <input type="text" id="token" name="token" value="{{ current_token }}" required placeholder="eyJ...">
                
                <button type="submit">Save JWT Token</button>
            </form>
            
            <div id="result"></div>
            
            <a href="/">← Back to Dashboard</a>
        </div>
        
        <script>
            document.getElementById('tokenForm').addEventListener('submit', function(e) {
                e.preventDefault();
                
                const formData = new FormData(e.target);
                const resultDiv = document.getElementById('result');
                
                resultDiv.innerHTML = '<div class="result info">🔄 Saving token...</div>';
                
                fetch('/set-token-manual', {
                    method: 'POST',
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        resultDiv.innerHTML = `<div class="result success">${data.message}</div>`;
                    } else {
                        resultDiv.innerHTML = `<div class="result error">${data.error}</div>`;
                    }
                })
                .catch(error => {
                    resultDiv.innerHTML = `<div class="result error">❌ Error: ${error}</div>`;
                });
            });
        </script>
    </body>
    </html>
    """, current_token=current_token) 