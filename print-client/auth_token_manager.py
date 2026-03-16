"""
Authentication token management for the Print Client Dashboard.
Handles token loading, saving, and authentication headers.

Refactored from print_dashboard_insepctionapp.py on 2024
"""
import os
import requests
from config_manager import VERIFY_SSL

# Token constants
TOKEN_FILE = ".auth_token"

def load_token(app, log_message_func):
    """Load authentication token from file"""
    if os.path.exists(TOKEN_FILE):
        try:
            with open(TOKEN_FILE) as f:
                token = f.read().strip()
                if token:
                    app.config["AUTH_TOKEN"] = token
                    log_message_func(f"Token loaded from {TOKEN_FILE}")
                    return token
        except Exception as e:
            log_message_func(f"Error loading token: {e}", True)
    return None

def save_token(token, log_message_func=None):
    """Save authentication token to file"""
    try:
        with open(TOKEN_FILE, "w") as f:
            f.write(token)
        if log_message_func:
            log_message_func(f"Token saved to {TOKEN_FILE}")
        return True
    except Exception as e:
        if log_message_func:
            log_message_func(f"Error saving token: {e}", True)
        return False

def get_auth_headers(app):
    """Get authorization headers for API requests"""
    token = app.config.get("AUTH_TOKEN")
    if not token:
        return {}
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

def check_for_permanent_tokens(server_url, log_message_func):
    """Check for permanent print client tokens on the server"""
    try:
        # First try to get tokens using a regular login to see if any exist
        # This is a read-only check to see what permanent tokens are available
        tokens_url = f"{server_url}/api/print-client-tokens"
        response = requests.get(tokens_url, verify=VERIFY_SSL, timeout=10)
        
        if response.status_code == 401:
            # Need authentication to access tokens endpoint
            return None
        elif response.status_code == 200:
            tokens = response.json()
            if tokens and len(tokens) > 0:
                enabled_tokens = [t for t in tokens if t.get('enabled', True)]
                if enabled_tokens:
                    log_message_func(f"🔍 Found {len(enabled_tokens)} permanent token(s) on server")
                    # Note: We can't directly use these tokens as they're hashed for security
                    # The client still needs to use credentials or manually configured tokens
                    return enabled_tokens
        
        return None
    except Exception as e:
        log_message_func(f"Note: Could not check for permanent tokens: {e}")
        return None

def get_or_create_print_client_token(app, log_message_func, load_config_func):
    """Try to get a valid JWT token for the print client"""
    try:
        config = load_config_func()
        server_url = config.get("PRINT_SERVER", "https://localhost:5001")
        
        # Check if there are permanent tokens available (informational)
        permanent_tokens = check_for_permanent_tokens(server_url, log_message_func)
        if permanent_tokens:
            log_message_func(f"💡 Tip: {len(permanent_tokens)} permanent token(s) available. Use 'Manage Print Client Tokens' to copy a token.")
        
        # Try to get credentials from environment or config
        email = os.getenv('PRINT_CLIENT_EMAIL')
        password = os.getenv('PRINT_CLIENT_PASSWORD')
        
        if not email or not password:
            # Try to get from config file or use defaults
            email = config.get('PRINT_CLIENT_EMAIL', 'print-client@example.com')
            password = config.get('PRINT_CLIENT_PASSWORD', 'print-client-password')
            
        if email and password and email != 'print-client@example.com':
            log_message_func(f"🔑 Attempting to authenticate with server using email: {email}")
            
            # Attempt login to get JWT token
            login_url = f"{server_url}/api/login"
            response = requests.post(
                login_url,
                json={"email": email, "password": password},
                verify=VERIFY_SSL,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                token = data.get('token')
                if token:
                    log_message_func(f"✅ Successfully obtained JWT token for print client")
                    # Save the token immediately
                    app.config["AUTH_TOKEN"] = token
                    save_token(token, log_message_func)
                    return token
                else:
                    log_message_func("❌ Login successful but no token in response", is_error=True)
            else:
                log_message_func(f"❌ Authentication failed: {response.status_code} - {response.text}", is_error=True)
        else:
            log_message_func("⚠️ No print client credentials configured")
            if permanent_tokens:
                log_message_func("💡 Consider using a permanent token instead of credentials for better security")
            
    except Exception as e:
        log_message_func(f"❌ Error getting print client token: {e}", is_error=True)
    
    return None 