"""
Configuration management for the Print Client Dashboard.
Handles dynamic IP detection, configuration loading/saving, and client identification.

Refactored from print_dashboard_insepctionapp.py on 2024
"""
import json
import os
import socket
import subprocess
import time
import uuid
import platform

# Configuration constants
VERIFY_SSL = False

def get_config_directory():
    """
    Get the user-specific configuration directory.
    This ensures each user/machine has its own unique CLIENT_ID.
    
    On macOS: ~/Library/Application Support/Print Client/
    On Linux: ~/.config/print-client/
    On Windows: %APPDATA%/Print Client/
    """
    system = platform.system()
    
    if system == "Darwin":  # macOS
        config_dir = os.path.expanduser("~/Library/Application Support/Print Client")
    elif system == "Windows":
        config_dir = os.path.join(os.environ.get('APPDATA', os.path.expanduser('~')), 'Print Client')
    else:  # Linux and others
        config_dir = os.path.expanduser("~/.config/print-client")
    
    # Create directory if it doesn't exist
    if not os.path.exists(config_dir):
        try:
            os.makedirs(config_dir, exist_ok=True)
        except Exception as e:
            print(f"Warning: Could not create config directory {config_dir}: {e}")
            # Fallback to current directory
            config_dir = os.path.dirname(os.path.abspath(__file__))
    
    return config_dir

def get_config_file_path():
    """Get the full path to the config file"""
    return os.path.join(get_config_directory(), "print_client_config.json")

# For backwards compatibility, also check local config file
LOCAL_CONFIG_FILE = "print_client_config.json"
CONFIG_FILE = get_config_file_path()

def load_client_id():
    """
    Load CLIENT_ID from config file or generate a new UUID.
    The UUID is unique per installation and persists across restarts.
    
    Priority:
    1. User-specific config file (~/Library/Application Support/Print Client/)
    2. Generate new UUID (never use bundled config's CLIENT_ID)
    """
    try:
        # Only check user-specific config file - NEVER use bundled config for CLIENT_ID
        if os.path.exists(CONFIG_FILE):
            with open(CONFIG_FILE, 'r') as f:
                config = json.load(f)
                existing_id = config.get('CLIENT_ID')
                if existing_id:
                    print(f"🆔 Loaded existing CLIENT_ID from user config: {existing_id[:8]}...")
                    return existing_id
    except Exception as e:
        print(f"Warning: Could not load CLIENT_ID from config: {e}")
    
    # Generate a new UUID for this installation
    new_uuid = str(uuid.uuid4())
    print(f"🆔 Generated NEW CLIENT_ID: {new_uuid[:8]}... (first run on this machine)")
    return new_uuid

def load_client_name():
    """
    Load CLIENT_NAME from config file or generate default from hostname.
    This is the display name that users see and can manually configure.
    
    Priority:
    1. User-specific config file
    2. Local config file (for migration)
    3. Generate from hostname
    """
    # Check user-specific config first
    try:
        if os.path.exists(CONFIG_FILE):
            with open(CONFIG_FILE, 'r') as f:
                config = json.load(f)
                if config.get('CLIENT_NAME'):
                    return config.get('CLIENT_NAME')
    except:
        pass
    
    # Check local config file (for migration from old installs)
    try:
        if os.path.exists(LOCAL_CONFIG_FILE):
            with open(LOCAL_CONFIG_FILE, 'r') as f:
                config = json.load(f)
                if config.get('CLIENT_NAME'):
                    return config.get('CLIENT_NAME')
    except:
        pass
    
    # Generate default name based on hostname (cleaned up for readability)
    try:
        hostname = socket.gethostname()
        # Clean up hostname: remove .local, replace dashes/underscores with spaces
        clean_name = hostname.replace('.local', '').replace('-', ' ').replace('_', ' ')
        # Title case for readability
        clean_name = clean_name.title()
        return f"Print Client - {clean_name}"
    except:
        return "Print Client"

def load_location_id():
    """Load LOCATION_ID from config file"""
    # Check user-specific config first
    try:
        if os.path.exists(CONFIG_FILE):
            with open(CONFIG_FILE, 'r') as f:
                config = json.load(f)
                return config.get('LOCATION_ID', '')
    except:
        pass
    
    # Check local config file (for migration)
    try:
        if os.path.exists(LOCAL_CONFIG_FILE):
            with open(LOCAL_CONFIG_FILE, 'r') as f:
                config = json.load(f)
                return config.get('LOCATION_ID', '')
    except:
        pass
    
    return ''

CLIENT_ID = load_client_id()
CLIENT_NAME = load_client_name()
LOCATION_ID = load_location_id()

# Save the client ID to config file if it doesn't exist
def ensure_client_id_saved():
    """
    Ensure the current client ID is saved to user-specific config file.
    Also migrates settings from local config if user config doesn't exist.
    """
    try:
        config = {}
        
        # Load existing user config if it exists
        if os.path.exists(CONFIG_FILE):
            with open(CONFIG_FILE, 'r') as f:
                config = json.load(f)
        
        # If no user config exists, try to migrate from local config (but NOT the CLIENT_ID)
        if not config and os.path.exists(LOCAL_CONFIG_FILE):
            try:
                with open(LOCAL_CONFIG_FILE, 'r') as f:
                    local_config = json.load(f)
                    # Copy everything EXCEPT CLIENT_ID (we want unique IDs per machine)
                    for key, value in local_config.items():
                        if key != 'CLIENT_ID':
                            config[key] = value
                    print(f"📋 Migrated settings from local config (excluding CLIENT_ID)")
            except:
                pass
        
        # Always ensure we have our unique CLIENT_ID saved
        if config.get('CLIENT_ID') != CLIENT_ID:
            config['CLIENT_ID'] = CLIENT_ID
            print(f"💾 Saving CLIENT_ID to user config: {CONFIG_FILE}")
        
        # Ensure config directory exists
        config_dir = os.path.dirname(CONFIG_FILE)
        if not os.path.exists(config_dir):
            os.makedirs(config_dir, exist_ok=True)
        
        # Save to user-specific config file
        with open(CONFIG_FILE, 'w') as f:
            json.dump(config, f, indent=2)
            
    except Exception as e:
        print(f"Warning: Could not save client ID: {e}")

# Save client ID on module load
ensure_client_id_saved()
print(f"📁 Config file location: {CONFIG_FILE}")

def get_local_ip():
    """Get the local IP address of this machine"""
    try:
        # Connect to a remote server to determine the local IP
        # This doesn't actually send data, just determines the route
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            local_ip = s.getsockname()[0]
            return local_ip
    except Exception:
        try:
            # Fallback method: get hostname and resolve it
            hostname = socket.gethostname()
            local_ip = socket.gethostbyname(hostname)
            if local_ip.startswith("127."):
                # If we get localhost, try to find a better IP
                result = subprocess.run(['ifconfig'], capture_output=True, text=True)
                lines = result.stdout.split('\n')
                for line in lines:
                    if 'inet ' in line and not '127.0.0.1' in line and not '169.254' in line:
                        parts = line.strip().split()
                        for i, part in enumerate(parts):
                            if part == 'inet' and i + 1 < len(parts):
                                ip = parts[i + 1]
                                if ip.count('.') == 3:
                                    return ip
            return local_ip
        except Exception:
            return "localhost"

def get_dynamic_server_config():
    """Get server configuration with dynamic IP detection"""
    local_ip = get_local_ip()
    return {
        "PRINT_SERVER": f"https://{local_ip}:5001",
        "LOGIN_URL": f"https://{local_ip}:5001/api/login"
    }

def load_config(app=None, log_message_func=None):
    """
    Load configuration from file, with dynamic IP fallback.
    
    Priority:
    1. User-specific config file (~/Library/Application Support/Print Client/)
    2. Local config file (for backwards compatibility)
    3. Dynamic IP detection
    """
    # Always start with dynamic IP detection
    dynamic_config = get_dynamic_server_config()
    
    if app:
        app.config.update(dynamic_config)
    
    if log_message_func:
        log_message_func(f"Dynamic IP detected: {get_local_ip()}")
    
    config = dynamic_config.copy()
    
    # Determine which config file to use (user-specific takes priority)
    config_file_to_use = None
    if os.path.exists(CONFIG_FILE):
        config_file_to_use = CONFIG_FILE
    elif os.path.exists(LOCAL_CONFIG_FILE):
        config_file_to_use = LOCAL_CONFIG_FILE
        if log_message_func:
            log_message_func(f"Using local config file (will migrate to user config)")
    
    if config_file_to_use:
        try:
            with open(config_file_to_use) as f:
                file_config = json.load(f)
                
                # Check if we should use the configured server URL (USE_DYNAMIC_IP must be explicitly false)
                use_dynamic = file_config.get("USE_DYNAMIC_IP", True)
                has_server = bool(file_config.get("PRINT_SERVER"))
                
                if log_message_func:
                    log_message_func(f"Config file: USE_DYNAMIC_IP={use_dynamic}, has PRINT_SERVER={has_server}")
                
                # If USE_DYNAMIC_IP is False and we have a server URL, use the configured server
                if has_server and use_dynamic == False:
                    # Load everything except CLIENT_ID from file (we use our own unique ID)
                    for key, value in file_config.items():
                        if key != 'CLIENT_ID':  # Never override our unique CLIENT_ID
                            config[key] = value
                            if app:
                                app.config[key] = value
                    if log_message_func:
                        log_message_func(f"✅ Static configuration loaded - Server: {file_config.get('PRINT_SERVER')}")
                else:
                    # Keep dynamic IP but load other settings
                    for key, value in file_config.items():
                        if key not in ["PRINT_SERVER", "LOGIN_URL", "CLIENT_ID"]:
                            config[key] = value
                            if app:
                                app.config[key] = value
                    if log_message_func:
                        log_message_func(f"Configuration loaded with dynamic IP from {config_file_to_use}")
        except Exception as e:
            error_msg = f"Error loading config: {e}"
            if log_message_func:
                log_message_func(error_msg, True)
            else:
                print(error_msg)
    
    # Return current config for functions that need it
    return config

def save_config(config_data, log_message_func=None):
    """Save configuration to file"""
    try:
        # Handle both app object and config dict
        if hasattr(config_data, 'config'):
            # It's a Flask app object
            app = config_data
            config = {
                "PRINT_SERVER": app.config["PRINT_SERVER"],
                "LOGIN_URL": app.config["LOGIN_URL"],
                "CLIENT_ID": app.config["CLIENT_ID"],
                "CLIENT_NAME": app.config.get("CLIENT_NAME", CLIENT_NAME),
                "LOCATION_ID": app.config.get("LOCATION_ID", ""),
                "USE_DYNAMIC_IP": app.config.get("USE_DYNAMIC_IP", True)
            }
            
            # Add WebSocket configuration if present
            if "USE_CLOUD_WEBSOCKET" in app.config:
                config["USE_CLOUD_WEBSOCKET"] = app.config["USE_CLOUD_WEBSOCKET"]
            if "WEBSOCKET_SERVER" in app.config:
                config["WEBSOCKET_SERVER"] = app.config["WEBSOCKET_SERVER"]
                
            # Add print client credentials if present
            if "PRINT_CLIENT_EMAIL" in app.config:
                config["PRINT_CLIENT_EMAIL"] = app.config["PRINT_CLIENT_EMAIL"]
            if "PRINT_CLIENT_PASSWORD" in app.config:
                config["PRINT_CLIENT_PASSWORD"] = app.config["PRINT_CLIENT_PASSWORD"]
        else:
            # It's a config dictionary
            config = config_data
        
        with open(CONFIG_FILE, "w") as f:
            json.dump(config, f, indent=2)
        
        if log_message_func:
            log_message_func(f"Configuration saved to {CONFIG_FILE}")
        else:
            print(f"Configuration saved to {CONFIG_FILE}")
        return True
    except Exception as e:
        error_msg = f"Error saving config: {e}"
        if log_message_func:
            log_message_func(error_msg, True)
        else:
            print(error_msg)
        return False 