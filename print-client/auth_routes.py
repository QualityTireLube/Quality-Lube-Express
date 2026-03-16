"""
Authentication and connection-related Flask routes for the Print Client Dashboard.
Handles authentication tokens, connection testing, and logout functionality.
Refactored from print_dashboard_insepctionapp.py on 2024 - Section 6: Flask routes/blueprints
"""

from flask import Blueprint, request, jsonify, redirect, url_for
import auth_token_manager
import api_client

# Create blueprint
auth_bp = Blueprint('auth', __name__)

@auth_bp.route("/get-auth-token")
def get_auth_token():
    """Get current authentication token info"""
    from flask import current_app
    
    token = current_app.config.get("AUTH_TOKEN")
    if not token or token == "print-client-token":
        # Try to load from file
        def log_message(msg, is_error=False):
            print(f"AUTH LOG: {msg}")
        saved_token = auth_token_manager.load_token(current_app, log_message)
        if saved_token:
            current_app.config["AUTH_TOKEN"] = saved_token
            return jsonify({
                "success": True,
                "token": saved_token,
                "source": "saved_token"
            })
        else:
            return jsonify({
                "success": False,
                "error": "No authentication token available"
            })
    
    return jsonify({
        "success": True,
        "token": token,
        "source": "app_config"
    })

@auth_bp.route("/test-connection", methods=["GET"])
def test_connection_route():
    """Test connection to print server"""
    from flask import current_app
    
    # Get log_message function safely
    import sys
    if 'print_dashboard_insepctionapp' in sys.modules:
        log_message = sys.modules['print_dashboard_insepctionapp'].log_message
    else:
        def log_message(msg, is_error=False):
            print(f"LOG: {msg}")
    
    try:
        success, message = api_client.test_connection(current_app, log_message)
        
        return jsonify({
            "success": success,
            "message": message,
            "server": current_app.config.get("PRINT_SERVER", "Not configured")
        })
    
    except Exception as e:
        log_message(f"Connection test error: {str(e)}", True)
        return jsonify({
            "success": False,
            "message": f"Connection test failed: {str(e)}",
            "server": current_app.config.get("PRINT_SERVER", "Not configured")
        })

@auth_bp.route("/logout", methods=["POST"])
def logout():
    """Clear authentication token and disconnect"""
    try:
        from flask import current_app
        
        # Get functions safely to avoid circular imports using getattr with defaults
        import sys
        if 'print_dashboard_insepctionapp' in sys.modules:
            main_module = sys.modules['print_dashboard_insepctionapp']
            log_message = getattr(main_module, 'log_message', lambda msg, is_error=False: print(f"LOG: {msg}"))
            websocket_client = getattr(main_module, 'websocket_client', None)
            disconnect_websocket = getattr(main_module, 'disconnect_websocket', lambda: None)
        else:
            def log_message(msg, is_error=False):
                print(f"LOG: {msg}")
            websocket_client = None
            def disconnect_websocket():
                pass
        
        # Clear token from app config
        current_app.config["AUTH_TOKEN"] = "print-client-token"
        
        # Disconnect WebSocket safely
        if websocket_client is not None and getattr(websocket_client, 'connected', False):
            disconnect_websocket()
            log_message("🔌 WebSocket disconnected due to logout")
        
        # Note: We don't delete the saved token file to allow easy re-authentication
        log_message("👋 User logged out")
        
        return jsonify({
            "success": True,
            "message": "✅ Logged out successfully"
        })
        
    except Exception as e:
        # Get log_message safely using getattr
        import sys
        if 'print_dashboard_insepctionapp' in sys.modules:
            main_module = sys.modules['print_dashboard_insepctionapp']
            log_message = getattr(main_module, 'log_message', lambda msg, is_error=False: print(f"LOG: {msg}"))
            log_message(f"❌ Error during logout: {e}", True)
        else:
            print(f"LOG: ❌ Error during logout: {e}")
        return jsonify({
            "success": False,
            "error": f"❌ Logout error: {str(e)}"
        }) 