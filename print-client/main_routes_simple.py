"""
Simplified main application Flask routes for the Print Client Dashboard.
This is a working version with proper JavaScript syntax.
"""

from flask import Blueprint, render_template_string, jsonify
from datetime import datetime
import config_manager
import auth_token_manager

# Create blueprint
main_bp = Blueprint('main', __name__)

@main_bp.route("/get-config")
def get_config():
    """Get configuration data for frontend"""
    try:
        config = config_manager.load_config()
        return jsonify({
            "success": True,
            "PRINT_SERVER": config.get('PRINT_SERVER', 'https://localhost:5001'),
            "CLIENT_ID": config.get('CLIENT_ID', 'unknown')
        })
    except Exception as e:
        return jsonify({
            "success": False, 
            "error": str(e),
            "PRINT_SERVER": 'https://localhost:5001'
        })

@main_bp.route("/")
def index():
    """Main dashboard page with working tabbed interface"""
    try:
        from flask import current_app
        import os
        import json
        
        # Import modules directly to avoid circular imports
        import print_queue
        import api_client
        
        # Import functions directly from main app
        try:
            from print_dashboard_insepctionapp import (
                get_printer_statuses, log_message as log_message_func,
                POLLING_ACTIVE, POLL_COUNT, POLL_INTERVAL, PRINT_LOG, PRINT_ERRORS
            )
        except ImportError:
            # Fallback if main app module not loaded yet
            def get_printer_statuses():
                return {"No Printers": "Loading..."}
            def log_message_func(message, is_error=False, category="general"):
                print(f"[LOG] {message}")
            POLLING_ACTIVE = False
            POLL_COUNT = 0
            POLL_INTERVAL = 5
            PRINT_LOG = []
            PRINT_ERRORS = []
        
        # Get printer statuses and connection info
        printer_statuses = get_printer_statuses()
        
        # Test connection status
        try:
            result = api_client.test_connection(current_app, log_message_func)
            connected = result[0] if isinstance(result, tuple) else result.get('success', False)
            connection_msg = result[1] if isinstance(result, tuple) else result.get('message', 'Connection test failed')
        except Exception as e:
            connected = False
            connection_msg = f'Connection test failed: {str(e)}'
        
        # Get configuration
        use_dynamic_ip = True
        config = {}
        try:
            if os.path.exists('print_client_config.json'):
                with open('print_client_config.json', 'r') as f:
                    config = json.load(f)
                    use_dynamic_ip = config.get("USE_DYNAMIC_IP", True)
        except:
            pass
        
        # Get current configuration
        current_ip = config_manager.get_local_ip()
        
        # Get print queue information
        pending_previews = print_queue.get_pending_previews()
        job_tracker = print_queue.get_job_tracker()
        
        # Get other status info
        server_url = current_app.config.get("PRINT_SERVER", "Not configured")
        verify_ssl = config_manager.VERIFY_SSL
        client_id = current_app.config.get("CLIENT_ID", config_manager.CLIENT_ID)
        token_value = current_app.config.get("AUTH_TOKEN", "")
        
        # Job counts
        pending_count = len(pending_previews)
        claimed_count = len(job_tracker)
        preview_count = len(pending_previews)
        auto_approval_enabled = print_queue.get_auto_approval_status()
        
        # Render the simplified dashboard template
        return render_template_string("""
        <html>
        <head>
            <title>Print Client Dashboard</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    margin: 0; 
                    padding: 0;
                    background-color: #f5f5f5;
                }
                .header {
                    background: linear-gradient(135deg, #007bff, #0056b3);
                    color: white;
                    padding: 20px;
                    text-align: center;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                .header h1 {
                    margin: 0;
                    font-size: 2.2em;
                }
                .header .subtitle {
                    margin: 5px 0 0 0;
                    opacity: 0.9;
                    font-size: 1.1em;
                }
                
                .nav-tabs {
                    background: white;
                    border-bottom: 3px solid #007bff;
                    padding: 0;
                    margin: 0;
                    display: flex;
                    overflow-x: auto;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                }
                .nav-tab {
                    padding: 15px 25px;
                    background: white;
                    border: none;
                    cursor: pointer;
                    font-size: 16px;
                    font-weight: 500;
                    color: #666;
                    border-bottom: 3px solid transparent;
                    transition: all 0.3s ease;
                    white-space: nowrap;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .nav-tab:hover {
                    background: #f8f9fa;
                    color: #007bff;
                }
                .nav-tab.active {
                    color: #007bff;
                    border-bottom-color: #007bff;
                    background: #f8f9fc;
                }
                
                .tab-content {
                    display: none;
                    padding: 30px;
                    max-width: 1200px;
                    margin: 0 auto;
                    background: white;
                    min-height: calc(100vh - 200px);
                }
                .tab-content.active {
                    display: block;
                }
                
                .quick-status {
                    background: white;
                    padding: 15px 30px;
                    border-bottom: 1px solid #e0e0e0;
                    display: flex;
                    gap: 30px;
                    flex-wrap: wrap;
                    align-items: center;
                    font-size: 14px;
                }
                .status-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .section { 
                    margin: 20px 0; 
                    padding: 20px; 
                    border: 1px solid #ddd; 
                    border-radius: 8px; 
                    background: white;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                }
                .section h2 {
                    margin-top: 0;
                    color: #333;
                    border-bottom: 2px solid #007bff;
                    padding-bottom: 10px;
                }
                
                .status-online { color: green; font-weight: bold; }
                .status-offline { color: red; font-weight: bold; }
                
                .connection-good { background: #d4edda; padding: 15px; border-radius: 6px; color: #155724; }
                .connection-bad { background: #f8d7da; padding: 15px; border-radius: 6px; color: #721c24; }
                
                .control-btn {
                    padding: 12px 24px;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 600;
                    transition: all 0.3s ease;
                    text-decoration: none;
                    display: inline-block;
                    text-align: center;
                    margin: 5px;
                }
                .control-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                }
                .control-btn.primary { background: #007bff; color: white; }
                .control-btn.success { background: #28a745; color: white; }
                .control-btn.danger { background: #dc3545; color: white; }
                .control-btn.warning { background: #ffc107; color: #212529; }
                .control-btn.info { background: #17a2b8; color: white; }
            </style>
        </head>
        <body>
            <!-- Header -->
            <div class="header">
                <h1>🖨️ Print Client Dashboard</h1>
                <div class="subtitle">Intelligent Print Management System</div>
            </div>
            
            <!-- Quick Status Bar -->
            <div class="quick-status">
                <div class="status-item">
                    <span>🌐 Connection:</span>
                    <span class="{{ 'status-online' if connected else 'status-offline' }}">
                        {{ 'Connected' if connected else 'Disconnected' }}
                    </span>
                </div>
                <div class="status-item">
                    <span>📡 Polling:</span>
                    <span class="{{ 'status-online' if polling_active else 'status-offline' }}">
                        {{ 'Active' if polling_active else 'Stopped' }}
                    </span>
                </div>
                <div class="status-item">
                    <span>📋 Jobs:</span>
                    <span>{{ pending_count }} pending, {{ claimed_count }} claimed</span>
                </div>
                <div class="status-item">
                    <span>👁️ Previews:</span>
                    <span>{{ preview_count }} waiting</span>
                </div>
            </div>
            
            <!-- Navigation Tabs -->
            <div class="nav-tabs">
                <button class="nav-tab active" onclick="showTab('overview')">
                    📊 Overview
                </button>
                <button class="nav-tab" onclick="showTab('jobs')">
                    📋 Jobs
                </button>
                <button class="nav-tab" onclick="showTab('configuration')">
                    ⚙️ Configuration
                </button>
                <button class="nav-tab" onclick="showTab('printers')">
                    🖨️ Printers
                </button>
                <button class="nav-tab" onclick="showTab('preview')">
                    👁️ Preview Queue
                </button>
                <button class="nav-tab" onclick="showTab('logs')">
                    📝 Activity Logs
                </button>
            </div>

            <!-- Tab Contents -->
            
            <!-- Overview Tab -->
            <div id="overview-content" class="tab-content active">
                <div class="section">
                    <h2>📊 System Status</h2>
                    <div class="{{ 'connection-good' if connected else 'connection-bad' }}">
                        <strong>Server Connection:</strong> {{ connection_msg }}
                    </div>
                    <div style="margin-top: 15px;">
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
                            <div class="stats">
                                <strong>🔧 Client Info</strong><br>
                                <strong>ID:</strong> {{ client_id }}<br>
                                <strong>Server:</strong> {{ server_url }}<br>
                                <strong>Local IP:</strong> {{ current_ip }}
                            </div>
                            <div class="stats">
                                <strong>📡 Activity</strong><br>
                                <strong>Polls:</strong> {{ poll_count }}<br>
                                <strong>Interval:</strong> {{ interval }}s<br>
                                <strong>SSL Verify:</strong> {{ 'Yes' if verify_ssl else 'No' }}
                            </div>
                            <div class="stats">
                                <strong>📋 Job Counts</strong><br>
                                <strong>Pending:</strong> {{ pending_count }}<br>
                                <strong>Claimed:</strong> {{ claimed_count }}<br>
                                <strong>Auto Print:</strong> {{ 'Enabled' if auto_approval_enabled else 'Disabled' }}
                            </div>
                        </div>
                    </div>
                    
                    <div style="margin: 20px 0;">
                        <h3>🔑 Credential Setup</h3>
                        <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                            <a href="/setup-credentials" class="control-btn primary">
                                🔑 Setup Authentication
                            </a>
                            <a href="/set-token-manual" class="control-btn info">
                                🎫 Set JWT Token
                            </a>
                        </div>
                    </div>
                    
                    <div style="display: flex; justify-content: flex-end; margin-top: 20px;">
                        <form method="POST" action="{{ '/stop-polling' if polling_active else '/start-polling' }}" style="margin: 0;">
                            <button type="submit" class="control-btn {{ 'danger' if polling_active else 'success' }}" style="min-width: 120px;">
                                {{ '⏸️ Stop Polling' if polling_active else '▶️ Start Polling' }}
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            <!-- Configuration Tab -->
            <div id="configuration-content" class="tab-content">
                <div class="section">
                    <h2>🌐 Network Configuration</h2>
                    <div style="background: #e8f4f8; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
                        <strong>Current Setup:</strong><br>
                        <strong>📡 Server URL:</strong> {{ server_url }}<br>
                        <strong>🏠 Local IP:</strong> {{ current_ip }}<br>
                        <strong>🔄 Auto-detect IP:</strong> {{ 'Enabled' if use_dynamic_ip else 'Disabled' }}
                    </div>
                    
                    <div style="display: grid; gap: 15px;">
                        <form method="POST" action="/refresh-ip" style="margin: 0;">
                            <button type="submit" class="control-btn info">🔄 Refresh IP Detection</button>
                        </form>
                        
                        <form method="POST" action="/toggle-dynamic-ip" style="margin: 0;">
                            <label style="display: flex; align-items: center; gap: 10px;">
                                <input type="checkbox" name="use_dynamic_ip" {% if use_dynamic_ip %}checked{% endif %} onchange="this.form.submit()"/>
                                <span>Auto-detect IP address changes</span>
                            </label>
                        </form>
                        
                        <form method="POST" action="/set-server" style="display: flex; gap: 10px; align-items: center;">
                            <label>Server URL:</label>
                            <input name="server_url" value="{{ server_url }}" size="50" {% if use_dynamic_ip %}readonly style="background: #f0f0f0;"{% endif %}/>
                            <button type="submit" {% if use_dynamic_ip %}disabled{% endif %} class="control-btn primary">Save</button>
                        </form>
                        
                        <form method="POST" action="/set-interval" style="display: flex; gap: 10px; align-items: center;">
                            <label>Poll Interval (seconds):</label>
                            <input name="interval" value="{{ interval }}" size="8" type="number" min="1"/>
                            <button type="submit" class="control-btn primary">Update</button>
                        </form>
                        
                        <form method="POST" action="/set-verify" style="margin: 0;">
                            <label style="display: flex; align-items: center; gap: 10px;">
                                <input type="checkbox" name="verify_ssl" {% if verify_ssl %}checked{% endif %}/>
                                <span>Verify SSL certificates</span>
                                <button type="submit" class="control-btn primary">Save</button>
                            </label>
                        </form>
                    </div>
                </div>

                <div class="section">
                    <h2>🔑 Authentication</h2>
                    <form method="POST" action="/set-token" style="margin-bottom: 20px;">
                        <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                            <label style="font-weight: bold;">Auth Token:</label>
                            <input name="auth_token" value="{{ token_value }}" size="60" style="flex: 1; min-width: 300px;"/>
                            <button type="submit" class="control-btn success">Save Token</button>
                        </div>
                    </form>
                    
                    <div style="margin: 20px 0;">
                        <h3>📋 Quick Setup</h3>
                        <p>Paste your configuration from the Token Generator:</p>
                        <form method="POST" action="/parse-config">
                            <textarea name="config_data" placeholder="Paste your configuration from Token Generator here..." 
                                      style="width: 100%; height: 120px; margin-bottom: 10px;"></textarea>
                            <button type="submit" class="control-btn warning">📋 Parse & Apply Configuration</button>
                        </form>
                    </div>
                </div>
            </div>

            <!-- Printers Tab -->
            <div id="printers-content" class="tab-content">
                <div class="section">
                    <h2>🖨️ Local Printers</h2>
                    <form method="GET" action="/refresh-printers" style="margin-bottom: 20px;">
                        <button type="submit" class="control-btn info">🔄 Refresh Printer List</button>
                    </form>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px;">
                        <form method="POST" action="/register-printers" style="margin: 0;">
                            <button type="submit" class="control-btn success" style="width: 100%;">
                                ☁️ Register with Cloud
                            </button>
                        </form>
                        <form method="POST" action="/clear-and-resync-printers" style="margin: 0;">
                            <button type="submit" class="control-btn warning" style="width: 100%;">
                                🔄 Clear & Resync All
                            </button>
                        </form>
                    </div>
                    
                    {% for printer_name, status in statuses.items() %}
                    <div style="background: #f8f9fa; padding: 12px; margin: 8px 0; border-radius: 6px; border-left: 4px solid #007bff;">
                        <strong>{{ printer_name }}:</strong> {{ status }}
                    </div>
                    {% endfor %}
                </div>
            </div>

            <!-- Jobs Tab -->
            <div id="jobs-content" class="tab-content">
                <div class="section">
                    <h2>📋 Job Management</h2>
                    <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 20px;">
                        <form method="POST" action="/cancel" style="margin: 0;">
                            <button type="submit" class="control-btn warning">
                                🚫 Cancel All Jobs
                            </button>
                        </form>
                        <form method="POST" action="/toggle-auto-approval" style="margin: 0;">
                            <button type="submit" class="control-btn {{ 'danger' if auto_approval_enabled else 'success' }}">
                                {{ '🔴 Disable Auto Print' if auto_approval_enabled else '🟢 Enable Auto Print' }}
                            </button>
                        </form>
                    </div>
                    
                    <div style="background: #f8f9fa; padding: 30px; border-radius: 8px; text-align: center; border: 2px dashed #6c757d;">
                        <strong>📋 Job data will be loaded here</strong><br>
                        Pending: {{ pending_count }}, Claimed: {{ claimed_count }}
                    </div>
                </div>
            </div>

            <!-- Preview Queue Tab -->
            <div id="preview-content" class="tab-content">
                <div class="section">
                    <h2>👁️ Preview Queue</h2>
                    <p>Previews waiting: {{ preview_count }}</p>
                    
                    {% if preview_count > 0 %}
                    <div style="background: #f8f9fa; padding: 30px; border-radius: 8px; text-align: center; border: 2px dashed #6c757d;">
                        <strong>👁️ Preview queue will be loaded here</strong><br>
                        {{ preview_count }} previews pending approval.
                    </div>
                    {% else %}
                    <p>No previews pending approval.</p>
                    {% endif %}
                </div>
            </div>

            <!-- Activity Logs Tab -->
            <div id="logs-content" class="tab-content">
                <div class="section">
                    <h2>📝 Activity Logs</h2>
                    <div style="background: #f8f9fa; padding: 30px; border-radius: 8px; text-align: center; border: 2px dashed #6c757d;">
                        <strong>📝 Activity logs will be loaded here</strong><br>
                        Log data will be displayed in this section.
                    </div>
                </div>
            </div>
            
            <script>
                let activeTab = 'overview';
                
                // Load saved tab from localStorage
                window.addEventListener('DOMContentLoaded', function() {
                    const savedTab = localStorage.getItem('printClientActiveTab');
                    if (savedTab) {
                        showTab(savedTab, false);
                    }
                });
                
                function showTab(tabName, saveToStorage) {
                    if (saveToStorage === undefined) saveToStorage = true;
                    
                    // Hide all tab contents
                    document.querySelectorAll('.tab-content').forEach(function(tab) {
                        tab.classList.remove('active');
                    });
                    
                    // Remove active class from all tab buttons
                    document.querySelectorAll('.nav-tab').forEach(function(tab) {
                        tab.classList.remove('active');
                    });
                    
                    // Show selected tab content
                    const targetContent = document.getElementById(tabName + '-content');
                    if (targetContent) {
                        targetContent.classList.add('active');
                    }
                    
                    // Add active class to clicked tab button
                    const targetButton = document.querySelector('[onclick="showTab(\'' + tabName + '\')"]');
                    if (targetButton) {
                        targetButton.classList.add('active');
                    }
                    
                    activeTab = tabName;
                    
                    // Save to localStorage for persistence
                    if (saveToStorage) {
                        localStorage.setItem('printClientActiveTab', tabName);
                    }
                }
            </script>
        </body>
        </html>
        """, 
        connected=connected,
        connection_msg=connection_msg,
        polling_active=POLLING_ACTIVE,
        poll_count=POLL_COUNT,
        interval=POLL_INTERVAL,
        pending_count=pending_count,
        claimed_count=claimed_count,
        preview_count=preview_count,
        auto_approval_enabled=auto_approval_enabled,
        client_id=client_id,
        server_url=server_url,
        current_ip=current_ip,
        verify_ssl=verify_ssl,
        token_value=token_value,
        use_dynamic_ip=use_dynamic_ip,
        statuses=printer_statuses
        )
        
    except Exception as e:
        return f"Error loading dashboard: {str(e)}", 500

@main_bp.route("/get-activity-logs")
def get_activity_logs():
    """Get activity logs for the frontend"""
    try:
        from flask import current_app, jsonify
        
        # Import log data from main app
        try:
            from print_dashboard_insepctionapp import PRINT_LOG, PRINT_ERRORS
        except ImportError:
            # Fallback if main app module not loaded yet
            PRINT_LOG = []
            PRINT_ERRORS = []
        
        # Return logs in JSON format
        return jsonify({
            'success': True,
            'logs': PRINT_LOG[-100:] if PRINT_LOG else [],  # Last 100 logs
            'errors': PRINT_ERRORS[-50:] if PRINT_ERRORS else [],  # Last 50 errors
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'logs': [],
            'errors': []
        }) 