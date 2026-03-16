"""
Printer Management Flask routes for the Print Client Dashboard.
Handles printer testing, registration, syncing and status management.
Refactored from print_dashboard_insepctionapp.py on 2024 - Section 6: Flask routes/blueprints
"""

from flask import Blueprint, request, jsonify, redirect, url_for
import sys
import api_client

# Create blueprint
printer_bp = Blueprint('printer', __name__)

@printer_bp.route("/test-printers", methods=["GET"])
def test_printers():
    """Test connectivity to registered printers"""
    try:
        # Import functions directly from the main module
        from print_dashboard_insepctionapp import get_printer_statuses, log_message
        
        statuses = get_printer_statuses()
        log_message(f"Printer test completed: {len(statuses)} printers checked")
        return jsonify({"success": True, "printers": statuses})
    except ImportError:
        # Fallback if import fails
        return jsonify({"success": False, "error": "Main module not available", "printers": {"No Printers": "Loading..."}})
    except Exception as e:
        print(f"Printer test failed: {str(e)}")
        return jsonify({"success": False, "error": str(e)})

@printer_bp.route("/refresh-printers", methods=["GET"])
def refresh_printers():
    """Refresh printer list from system"""
    try:
        # Import functions directly from the main module
        from print_dashboard_insepctionapp import get_printer_statuses, log_message
        
        # Actually refresh printer list from system
        log_message("Refreshing printer list from system")
        printer_statuses = get_printer_statuses()
        log_message(f"Detected {len(printer_statuses)} printers: {list(printer_statuses.keys())}")
        return redirect(url_for('main.index'))
    except ImportError:
        print("Main module not available for refresh")
        return jsonify({"success": False, "error": "Main module not available"})
    except Exception as e:
        print(f"Printer refresh failed: {str(e)}")
        return jsonify({"success": False, "error": str(e)})

@printer_bp.route("/register-printers", methods=["POST"])
def register_printers():
    """Register local printers with the print server"""
    # Import functions from main app safely
    if 'print_dashboard_insepctionapp' in sys.modules:
        main_module = sys.modules['print_dashboard_insepctionapp']
        log_message = main_module.log_message
    else:
        def log_message(msg, is_error=False):
            print(f"Printer: {msg}")
    
    try:
        from flask import current_app
        # Import get_printer_statuses function
        try:
            from print_dashboard_insepctionapp import get_printer_statuses
        except ImportError:
            def get_printer_statuses():
                return {"No Printers": "Loading..."}
        
        result = api_client.register_printers_with_server(current_app, log_message, get_printer_statuses)
        if result:
            log_message("✅ Printers registered successfully with server")
            return jsonify({"success": True, "message": "Printers registered successfully"})
        else:
            log_message("❌ Failed to register printers with server", True)
            return jsonify({"success": False, "error": "Registration failed"})
    except Exception as e:
        log_message(f"Printer registration error: {str(e)}", True)
        return jsonify({"success": False, "error": str(e)})

@printer_bp.route("/clear-and-resync-printers", methods=["POST"])
def clear_and_resync_printers():
    """Clear all printers on server and re-register local ones"""
    # Import functions from main app safely
    if 'print_dashboard_insepctionapp' in sys.modules:
        main_module = sys.modules['print_dashboard_insepctionapp']
        log_message = main_module.log_message
    else:
        def log_message(msg, is_error=False, category="general"):
            print(f"Printer: {msg}")
    
    try:
        from flask import current_app
        
        log_message("🔄 Starting printer clear and resync process...")
        
        # Step 1: Clear all printers on server
        clear_result = api_client.clear_all_printers_on_server(current_app, log_message)
        if not clear_result:
            log_message("❌ Failed to clear printers on server", True)
            return jsonify({"success": False, "error": "Failed to clear printers on server"})
        
        log_message("✅ Cleared all printers on server")
        
        # Step 2: Re-register local printers
        # Import get_printer_statuses function
        try:
            from print_dashboard_insepctionapp import get_printer_statuses
        except ImportError:
            def get_printer_statuses():
                return {"No Printers": "Loading..."}
        
        register_result = api_client.register_printers_with_server(current_app, log_message, get_printer_statuses)
        if not register_result:
            log_message("❌ Failed to re-register printers", True)
            return jsonify({"success": False, "error": "Failed to re-register printers"})
        
        log_message("✅ Successfully cleared and resynced all printers")
        return jsonify({
            "success": True, 
            "message": "Printers cleared and resynced successfully"
        })
        
    except Exception as e:
        log_message(f"Clear and resync error: {str(e)}", True)
        return jsonify({"success": False, "error": str(e)})

@printer_bp.route("/printer-settings", methods=["GET"])
def printer_settings():
    """Get printer configuration settings"""
    # Import functions from main app safely
    if 'print_dashboard_insepctionapp' in sys.modules:
        main_module = sys.modules['print_dashboard_insepctionapp']
        log_message = main_module.log_message
    else:
        def log_message(msg, is_error=False):
            print(f"Printer: {msg}")
    
    try:
        import print_queue
        from flask import current_app
        
        # Get current printer settings
        printer_settings = print_queue.get_printer_settings()
        
        # Get available printers for selection - use local printer detection
        printers = {}
        try:
            # Try to get local printer statuses from main module
            if 'print_dashboard_insepctionapp' in sys.modules:
                main_module = sys.modules['print_dashboard_insepctionapp']
                if hasattr(main_module, 'get_printer_statuses'):
                    local_printers = main_module.get_printer_statuses()
                    # Convert local printer names to the format expected by frontend
                    # Use printer name as both ID and name for local printers
                    printers = {printer_name: printer_name for printer_name in local_printers.keys() 
                               if not printer_name.startswith(('No Printers', 'Detection Error'))}
            
            # Fallback: try to get from server if no local printers found
            if not printers:
                result = api_client.get_printers_from_server(current_app, log_message)
                if result:
                    printers = {p.get('id', 'unknown'): p.get('name', 'Unknown') for p in result}
        except Exception as e:
            log_message(f"Could not fetch printers: {str(e)}", True)
        
        return jsonify({
            "success": True,
            "settings": printer_settings,
            "available_printers": printers
        })
        
    except Exception as e:
        log_message(f"Error getting printer settings: {str(e)}", True)
        return jsonify({"success": False, "error": str(e)})

@printer_bp.route("/save-printer-settings", methods=["POST"])
def save_printer_settings():
    """Save printer configuration settings"""
    # Import functions from main app safely
    if 'print_dashboard_insepctionapp' in sys.modules:
        main_module = sys.modules['print_dashboard_insepctionapp']
        log_message = main_module.log_message
    else:
        def log_message(msg, is_error=False):
            print(f"Printer: {msg}")
    
    try:
        import print_queue
        from datetime import datetime
        
        # Get form data
        data = request.get_json() or {}
        printer_id = data.get('printer_id')
        paper_size = data.get('paper_size', 'Letter')
        orientation = data.get('orientation', 'portrait')
        custom_width = data.get('custom_width', '')
        custom_height = data.get('custom_height', '')
        unit = data.get('unit', 'inches')
        
        if not printer_id:
            return jsonify({'success': False, 'message': 'Printer ID required'})
        
        # Create settings dictionary for this specific printer
        settings = {
            'paper_size': paper_size,
            'orientation': orientation,
            'unit': unit,
            'updated_at': datetime.now().isoformat()
        }
        
        # Save custom dimensions if provided
        if custom_width and custom_height:
            settings['custom_width'] = custom_width
            settings['custom_height'] = custom_height
        
        # Save settings for this specific printer
        print_queue.save_printer_setting(printer_id, settings)
        
        # Create display message
        if paper_size == 'custom-2.25x1.5':
            display_size = "Godex Label (2.25\" × 1.5\")"
        elif paper_size == 'custom-1.8125x2.5':
            display_size = "Godex 200i (1.8125\" × 2.5\")"
        elif paper_size == 'custom-90x29mm':
            display_size = "Brother DK1201 (90mm × 29mm)"
        elif paper_size.startswith('custom-'):
            unit_symbol = "mm" if unit == 'mm' else "\""
            display_size = f"Custom {custom_width}{unit_symbol} × {custom_height}{unit_symbol}"
        else:
            display_size = paper_size
            
        log_message(f"🔧 Printer settings saved: {printer_id} -> {display_size} {orientation}")
        
        return jsonify({
            "success": True, 
            "message": f"Settings saved: {display_size} {orientation}"
        })
        
    except Exception as e:
        log_message(f"Error saving printer settings: {str(e)}", True)
        return jsonify({"success": False, "error": str(e)}) 