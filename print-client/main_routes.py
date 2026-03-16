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
                    justify-content: space-between;
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
                
                /* Jobs Display Styles */
                .job-section {
                    margin-bottom: 20px;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    overflow: hidden;
                }
                
                .job-section-header {
                    padding: 12px 16px;
                    font-weight: bold;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .job-section-header.pending {
                    background: #fff3cd;
                    color: #856404;
                    border-bottom: 1px solid #ffeaa7;
                }
                
                .job-section-header.claimed {
                    background: #d1ecf1;
                    color: #0c5460;
                    border-bottom: 1px solid #bee5eb;
                }
                
                .job-section-header.completed {
                    background: #d4edda;
                    color: #155724;
                    border-bottom: 1px solid #c3e6cb;
                }
                
                .job-count {
                    background: rgba(0,0,0,0.1);
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 12px;
                }
                
                .job-card {
                    padding: 12px 16px;
                    border-bottom: 1px solid #eee;
                    background: white;
                }
                
                .job-card:last-child {
                    border-bottom: none;
                }
                
                .job-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 8px;
                }
                
                .job-id {
                    font-family: monospace;
                    font-weight: bold;
                    color: #333;
                }
                
                .job-status {
                    padding: 2px 8px;
                    border-radius: 4px;
                    font-size: 11px;
                    font-weight: bold;
                    text-transform: uppercase;
                }
                
                .job-status.pending {
                    background: #fff3cd;
                    color: #856404;
                }
                
                .job-status.claimed {
                    background: #d1ecf1;
                    color: #0c5460;
                }
                
                .job-status.completed {
                    background: #d4edda;
                    color: #155724;
                }
                
                .job-status.failed {
                    background: #f8d7da;
                    color: #721c24;
                }
                
                .job-info {
                    font-size: 13px;
                    line-height: 1.4;
                }
                
                .job-info strong {
                    color: #555;
                }
                
                .jobs-empty {
                    text-align: center;
                    color: #666;
                    font-style: italic;
                    padding: 40px 20px;
                }
                
                /* Logs Display Styles */
                .log-entry {
                    padding: 8px 12px;
                    border-bottom: 1px solid #eee;
                    font-family: monospace;
                    font-size: 12px;
                }
                
                .log-entry:last-child {
                    border-bottom: none;
                }
                
                .log-entry.log-error {
                    background: #f8d7da;
                    color: #721c24;
                }
                
                .log-entry.log-success {
                    background: #d4edda;
                    color: #155724;
                }
                
                .log-entry.log-warning {
                    background: #fff3cd;
                    color: #856404;
                }
                
                .log-entry.log-info {
                    background: #d1ecf1;
                    color: #0c5460;
                }
                
                .log-timestamp {
                    color: #666;
                    margin-right: 8px;
                }
                
                .log-message {
                    word-break: break-word;
                }
                
                .logs-empty {
                    text-align: center;
                    color: #666;
                    font-style: italic;
                    padding: 40px 20px;
                }
                
                /* Enhanced Job Management Styles */
                .jobs-container {
                    display: grid;
                    gap: 20px;
                    margin-top: 20px;
                }
                
                .job-section {
                    background: white;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                }
                
                .job-section-header {
                    padding: 15px 20px;
                    font-weight: bold;
                    color: white;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .job-section-header.pending {
                    background: linear-gradient(135deg, #ffc107, #e0a800);
                }
                
                .job-section-header.claimed {
                    background: linear-gradient(135deg, #17a2b8, #138496);
                }
                
                .job-section-header.completed {
                    background: linear-gradient(135deg, #28a745, #1e7e34);
                }
                
                .job-count {
                    background: rgba(255,255,255,0.2);
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-size: 12px;
                }
                
                .job-card {
                    border-bottom: 1px solid #e9ecef;
                    transition: background-color 0.2s ease;
                }
                
                .job-card:last-child {
                    border-bottom: none;
                }
                
                .job-card:hover {
                    background: #f8f9fa;
                }
                
                .job-card .clickable-job:hover {
                    background: #e3f2fd;
                }
                
                /* Job Action Buttons */
                .job-actions {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .job-action-btn {
                    background: none;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    padding: 4px 8px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: all 0.2s ease;
                }
                
                .job-action-btn:hover {
                    transform: scale(1.1);
                }
                
                .job-action-btn.edit-btn {
                    background: #fff3cd;
                    border-color: #ffc107;
                }
                
                .job-action-btn.edit-btn:hover {
                    background: #ffc107;
                }
                
                .job-action-btn.delete-btn {
                    background: #f8d7da;
                    border-color: #dc3545;
                }
                
                .job-action-btn.delete-btn:hover {
                    background: #dc3545;
                    color: white;
                }
                
                /* Modal Styles */
                .modal {
                    display: none;
                    position: fixed;
                    z-index: 1000;
                    left: 0;
                    top: 0;
                    width: 100%;
                    height: 100%;
                    overflow: auto;
                    background-color: rgba(0,0,0,0.4);
                }
                
                .modal-content {
                    background-color: #fefefe;
                    margin: 15% auto;
                    padding: 20px;
                    border: none;
                    border-radius: 12px;
                    width: 500px;
                    max-width: 90%;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                    animation: modalFadeIn 0.3s;
                }
                
                @keyframes modalFadeIn {
                    from {opacity: 0; transform: scale(0.7);}
                    to {opacity: 1; transform: scale(1);}
                }
                
                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    padding-bottom: 15px;
                    border-bottom: 2px solid #007bff;
                }
                
                .modal-header h2 {
                    margin: 0;
                    color: #007bff;
                    font-size: 1.5em;
                }
                
                .close {
                    color: #aaa;
                    float: right;
                    font-size: 28px;
                    font-weight: bold;
                    cursor: pointer;
                    padding: 0;
                    border: none;
                    background: none;
                }
                
                .close:hover,
                .close:focus {
                    color: #000;
                    text-decoration: none;
                }
                
                .modal-form {
                    margin-bottom: 20px;
                }
                
                .modal-form label {
                    display: block;
                    margin-bottom: 5px;
                    font-weight: bold;
                    color: #333;
                }
                
                .modal-form input[type="text"] {
                    width: 100%;
                    padding: 10px;
                    border: 2px solid #ddd;
                    border-radius: 6px;
                    font-size: 14px;
                    box-sizing: border-box;
                    margin-bottom: 10px;
                }
                
                .modal-form input[type="text"]:focus {
                    outline: none;
                    border-color: #007bff;
                    box-shadow: 0 0 5px rgba(0,123,255,0.3);
                }
                
                .modal-form .control-btn {
                    width: 100%;
                    margin-top: 10px;
                }
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
                <div style="display: flex; gap: 30px; flex-wrap: wrap; align-items: center;">
                    <div class="status-item">
                        <span>🌐 Connection:</span>
                        <span class="{{ 'status-online' if connected else 'status-offline' }}" onclick="openConnectionModal()" style="cursor: pointer; text-decoration: underline;">
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
                <div style="margin-left: auto; display: flex; gap: 8px; align-items: center;">
                    <form method="POST" action="{{ '/stop-polling' if polling_active else '/start-polling' }}" style="margin: 0;">
                        <button type="submit" class="control-btn {{ 'warning' if polling_active else 'primary' }}" style="font-size: 10px; padding: 4px 8px;">
                            {{ '⏸️ Stop Polling' if polling_active else '▶️ Start Polling' }}
                        </button>
                    </form>
                    <form method="POST" action="/toggle-auto-approval" style="margin: 0;">
                        <button type="submit" class="control-btn {{ 'danger' if auto_approval_enabled else 'success' }}" style="font-size: 10px; padding: 4px 8px;">
                            {{ '🔴 Disable Auto Print' if auto_approval_enabled else '🟢 Enable Auto Print' }}
                        </button>
                    </form>
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
                
                    <div style="display: flex; justify-content: flex-end; margin-top: 20px; gap: 10px;">
                        <a href="/test-logging" class="control-btn info" style="text-decoration: none; text-align: center;">
                            🔍 Test Polling & Show Jobs
                        </a>
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
                <div class="section" style="border: 2px solid #007bff; background: #f8f9ff;">
                    <h2>🖨️ Print Client Settings</h2>
                    
                    <form method="POST" action="/save-client-settings" id="clientSettingsForm">
                        <div style="display: grid; gap: 20px;">
                            <!-- Client Name -->
                            <div>
                                <label style="font-weight: bold; font-size: 16px; display: block; margin-bottom: 8px;">🏷️ Client Name:</label>
                                <input name="client_name" id="clientNameInput" value="{{ client_name }}" 
                                       style="width: 100%; max-width: 400px; padding: 12px; font-size: 16px; border: 2px solid #28a745; border-radius: 6px;"
                                       placeholder="e.g., Front Desk Printer, Shop Office"/>
                                <p style="color: #666; font-size: 13px; margin-top: 5px;">This name identifies this print client in the system</p>
                            </div>
                            
                            <!-- Server URL -->
                            <div>
                                <label style="font-weight: bold; font-size: 16px; display: block; margin-bottom: 8px;">📡 Server URL:</label>
                                <input name="server_url" id="serverUrlInput" value="{{ server_url }}" 
                                       style="width: 100%; max-width: 400px; padding: 12px; font-size: 16px; border: 2px solid #007bff; border-radius: 6px;"
                                       placeholder="https://192.168.1.XXX:5001"/>
                                <p style="color: #666; font-size: 13px; margin-top: 5px;">IP address of the computer running QuickCheck, followed by :5001</p>
                            </div>
                            
                            <!-- Save Button -->
                            <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
                                <button type="submit" class="control-btn success" style="padding: 12px 24px; font-size: 16px;">💾 Save Settings</button>
                                <button type="button" onclick="testConnection()" class="control-btn info">🔍 Test Connection</button>
                                <span id="connectionStatus" style="padding: 8px; border-radius: 4px;"></span>
                            </div>
                        </div>
                    </form>
                    
                    <div style="margin-top: 20px; padding: 15px; background: #d4edda; border-radius: 6px; border: 1px solid #28a745;">
                        <strong>Current Status:</strong><br>
                        <strong>🏷️ Client Name:</strong> {{ client_name }}<br>
                        <strong>🆔 Client ID:</strong> {{ client_id }}<br>
                        <strong>🔗 Server:</strong> {{ server_url }}<br>
                        <strong>🏠 This Client's IP:</strong> {{ current_ip }}
                    </div>
                    
                    <div style="margin-top: 15px; padding: 10px; background: #fff3cd; border-radius: 6px; border: 1px solid #ffc107;">
                        <strong>⚠️ Note:</strong> After saving settings, you must <strong>restart the print client</strong> for changes to take full effect.
                    </div>
                </div>
                
                <div class="section">
                    <h2>⚙️ Additional Settings</h2>
                    
                    <div style="display: grid; gap: 15px;">
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
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h2>📋 Job Management</h2>
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <form method="POST" action="/cancel" style="margin: 0;">
                                <button type="submit" class="control-btn warning">
                                    🚫 Cancel All Jobs
                                </button>
                            </form>
                            <button class="control-btn info" onclick="refreshJobsData()">
                                🔄 Refresh Jobs
                            </button>
                        </div>
                    </div>
                    
                    <div class="jobs-container" id="jobs-container">
                        <div style="background: #f8f9fa; padding: 30px; border-radius: 8px; text-align: center; border: 2px dashed #6c757d;">
                            <strong>📋 Job data will be loaded here</strong><br>
                            Pending: {{ pending_count }}, Claimed: {{ claimed_count }}
                        </div>
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
                
                // Auto-refresh variables
                let jobsRefreshInterval = null;
                let logsRefreshInterval = null;
                
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
                    const targetButton = document.querySelector(`[onclick="showTab('${tabName}')"]`);
                    if (targetButton) {
                        targetButton.classList.add('active');
                    }
                    
                    activeTab = tabName;
                    
                    // Load tab-specific content
                    if (tabName === 'jobs') {
                        refreshJobsData();
                        startJobsAutoRefresh();
                    } else if (tabName === 'logs') {
                        loadActivityLogs();
                        startLogsAutoRefresh();
                    } else {
                        stopJobsAutoRefresh();
                        stopLogsAutoRefresh();
                    }
                    
                    // Save to localStorage for persistence
                    if (saveToStorage) {
                        localStorage.setItem('printClientActiveTab', tabName);
                    }
                }
                
                // Jobs Data Management Functions
                function refreshJobsData() {
                    fetch('/jobs-data')
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                displayJobsData(data);
                            } else {
                                console.error('Failed to load jobs data:', data.error);
                                document.getElementById('jobs-content').innerHTML = 
                                    '<p class="jobs-empty">Failed to load job data. Please try again.</p>';
                            }
                        })
                        .catch(error => {
                            console.error('Error loading jobs data:', error);
                            document.getElementById('jobs-content').innerHTML = 
                                '<p class="jobs-empty">Error loading job data. Please check your connection.</p>';
                        });
                }
                
                function displayJobsData(data) {
                    const container = document.getElementById('jobs-content');
                    if (!container) return;
                    
                    const { pending_jobs = [], claimed_jobs = [], printed_jobs = [], counts = {} } = data;
                    
                    if (pending_jobs.length === 0 && claimed_jobs.length === 0 && printed_jobs.length === 0) {
                        container.innerHTML = '<p class="jobs-empty">No jobs found. Start a print job to see it appear here.</p>';
                        return;
                    }
                    
                    let html = '';
                    
                    // Pending Jobs Section
                    if (pending_jobs.length > 0) {
                        html += createJobSection('⏳ Pending Jobs', 'pending', pending_jobs, counts.pending || 0);
                    }
                    
                    // Claimed Jobs Section
                    if (claimed_jobs.length > 0) {
                        html += createJobSection('📥 Claimed Jobs', 'claimed', claimed_jobs, counts.claimed || 0);
                    }
                    
                    // Recent Completed Jobs Section
                    if (printed_jobs.length > 0) {
                        const recentJobs = printed_jobs.slice(-10); // Show last 10 completed jobs
                        html += createJobSection('✅ Recent Completed', 'completed', recentJobs, recentJobs.length);
                    }
                    
                    container.innerHTML = html;
                }
                
                function createJobSection(title, type, jobs, count) {
                    let html = '<div class="job-section">' +
                        '<div class="job-section-header ' + type + '">' +
                            '<span>' + title + '</span>' +
                            '<span class="job-count">' + count + '</span>' +
                        '</div>';
                    
                    jobs.forEach(function(job) {
                        html += createJobCard(job, type);
                    });
                    
                    html += '</div>';
                    return html;
                }
                
                function createJobCard(job, sectionType) {
                    const jobId = job.id || job.job_id || 'unknown';
                    const shortId = jobId.length > 12 ? jobId.substring(0, 12) + '...' : jobId;
                    const formName = job.formName || job.form_name || 'Unknown Document';
                    const printerName = job.printerName || job.printer_name || job.printerId || 'Unknown Printer';
                    const status = job.status || sectionType;
                    const timestamp = job.timestamp || job.createdAt || job.completedAt || 'Unknown time';
                    const priority = job.priority || 'normal';
                    
                    let html = '<div class="job-card ' + sectionType + '">' +
                        '<div class="job-header">' +
                            '<span class="job-id clickable-job" onclick="openJobDetails(' + "'" + jobId + "'" + ')" style="cursor: pointer;">' + shortId + '</span>' +
                            '<div class="job-actions">' +
                                '<button class="job-action-btn edit-btn" onclick="event.stopPropagation(); openEditJobModal(' + "'" + jobId + "', '" + escapeHtml(formName) + "', '" + escapeHtml(printerName) + "', '" + priority + "'" + ')" title="Edit Job">✏️</button>' +
                                '<button class="job-action-btn delete-btn" onclick="event.stopPropagation(); deleteJob(' + "'" + jobId + "', '" + sectionType + "'" + ')" title="Delete Job">🗑️</button>' +
                                '<span class="job-status ' + status + '">' + status.toUpperCase() + '</span>' +
                            '</div>' +
                        '</div>' +
                        '<div class="job-details clickable-job" onclick="openJobDetails(' + "'" + jobId + "'" + ')" style="cursor: pointer;">' +
                            '<div class="job-info">' +
                                '<strong>Form:</strong> ' + formName + '<br>' +
                                '<strong>Printer:</strong> ' + printerName + '<br>' +
                                '<strong>Priority:</strong> ' + priority + '<br>' +
                                '<strong>Time:</strong> ' + timestamp +
                            '</div>' +
                        '</div>' +
                    '</div>';
                    
                    return html;
                }
                
                // Activity Logs Functions
                function loadActivityLogs() {
                    fetch('/get-activity-logs')
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                displayLogs(data.logs, data.errors);
                            } else {
                                console.error('Failed to load activity logs:', data.error);
                            }
                        })
                        .catch(error => {
                            console.error('Error loading activity logs:', error);
                        });
                }
                
                function displayLogs(logs, errors) {
                    const logsContainer = document.getElementById('logs-content');
                    if (!logsContainer) return;
                    
                    // Combine and process logs
                    const allLogs = [];
                    
                    // Process regular logs
                    if (logs && logs.length > 0) {
                        logs.forEach(function(log) {
                            allLogs.push(parseLogEntry(log, false));
                        });
                    }
                    
                    // Process error logs
                    if (errors && errors.length > 0) {
                        errors.forEach(function(error) {
                            allLogs.push(parseLogEntry(error, true));
                        });
                    }
                    
                    // Sort by timestamp (newest first)
                    allLogs.sort(function(a, b) { return new Date(b.timestamp) - new Date(a.timestamp); });
                    
                    if (allLogs.length === 0) {
                        logsContainer.innerHTML = '<p class="logs-empty">No logs available.</p>';
                        return;
                    }
                    
                    // Display logs
                    let html = '';
                    allLogs.forEach(log => {
                        html += '<div class="log-entry log-' + log.type + '">' +
                            '<span class="log-timestamp">' + log.timestamp + '</span>' +
                            '<span class="log-message">' + escapeHtml(log.message) + '</span>' +
                            '</div>';
                    });
                    
                    logsContainer.innerHTML = html;
                }
                
                function parseLogEntry(logText, isError) {
                    // Parse timestamp and message from log entry
                    const timestampMatch = logText.match(/^\[([^\]]+)\]/);
                    const timestamp = timestampMatch ? timestampMatch[1] : new Date().toISOString();
                    const message = logText.replace(/^\[[^\]]+\]\s*/, '');
                    
                    // Determine log type based on content and error flag
                    let type = 'info';
                    if (isError) {
                        type = 'error';
                    } else if (message.includes('✅') || message.includes('SUCCESS')) {
                        type = 'success';
                    } else if (message.includes('⚠️') || message.includes('WARNING')) {
                        type = 'warning';
                    }
                    
                    return {
                        timestamp: timestamp,
                            message: message,
                            type: type
                    };
                }
                
                function escapeHtml(text) {
                    const div = document.createElement('div');
                    div.textContent = text;
                    return div.innerHTML;
                }
                
                // Auto-refresh functions
                function startJobsAutoRefresh() {
                    stopJobsAutoRefresh(); // Clear any existing interval
                    jobsRefreshInterval = setInterval(refreshJobsData, 5000); // Refresh every 5 seconds
                }
                
                function stopJobsAutoRefresh() {
                    if (jobsRefreshInterval) {
                        clearInterval(jobsRefreshInterval);
                        jobsRefreshInterval = null;
                    }
                }
                
                function startLogsAutoRefresh() {
                    stopLogsAutoRefresh(); // Clear any existing interval
                    logsRefreshInterval = setInterval(loadActivityLogs, 3000); // Refresh every 3 seconds
                }
                
                function stopLogsAutoRefresh() {
                    if (logsRefreshInterval) {
                        clearInterval(logsRefreshInterval);
                        logsRefreshInterval = null;
                    }
                }

                // Test Server Connection
                function testConnection() {
                    const statusEl = document.getElementById('connectionStatus');
                    statusEl.innerHTML = '🔄 Testing connection...';
                    statusEl.style.background = '#d1ecf1';
                    statusEl.style.color = '#0c5460';
                    
                    fetch('/test-connection')
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                statusEl.innerHTML = '✅ Connected successfully!';
                                statusEl.style.background = '#d4edda';
                                statusEl.style.color = '#155724';
                            } else {
                                statusEl.innerHTML = '❌ ' + (data.message || 'Connection failed');
                                statusEl.style.background = '#f8d7da';
                                statusEl.style.color = '#721c24';
                            }
                        })
                        .catch(error => {
                            statusEl.innerHTML = '❌ Error: ' + error;
                            statusEl.style.background = '#f8d7da';
                            statusEl.style.color = '#721c24';
                        });
                }

                // Connection Modal Functions
                function openConnectionModal() {
                    document.getElementById('connectionModal').style.display = 'block';
                }

                function closeConnectionModal() {
                    document.getElementById('connectionModal').style.display = 'none';
                }

                // Close modal when clicking outside of it
                window.onclick = function(event) {
                    const connectionModal = document.getElementById('connectionModal');
                    const jobDetailsModal = document.getElementById('jobDetailsModal');
                    const editJobModal = document.getElementById('editJobModal');
                    
                    if (event.target == connectionModal) {
                        closeConnectionModal();
                    }
                    if (event.target == jobDetailsModal) {
                        closeJobDetailsModal();
                    }
                    if (event.target == editJobModal) {
                        closeEditJobModal();
                    }
                }

                // Close modal with Escape key
                document.addEventListener('keydown', function(event) {
                    if (event.key === 'Escape') {
                        closeConnectionModal();
                        closeJobDetailsModal();
                        closeEditJobModal();
                    }
                });

                // Job Details Modal Functions
                function openJobDetails(jobId) {
                    document.getElementById('jobDetailsModal').style.display = 'block';
                    document.getElementById('jobDetailsContent').innerHTML = 
                        '<div style="text-align: center; padding: 40px;"><strong>Loading job details...</strong></div>';
                    
                    // Fetch job details
                    fetch('/job-details/' + jobId)
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                displayJobDetails(data);
                            } else {
                                document.getElementById('jobDetailsContent').innerHTML = 
                                    '<div style="text-align: center; padding: 40px; color: red;"><strong>Failed to load job details: ' + (data.error || 'Unknown error') + '</strong></div>';
                            }
                        })
                        .catch(error => {
                            console.error('Error loading job details:', error);
                            document.getElementById('jobDetailsContent').innerHTML = 
                                '<div style="text-align: center; padding: 40px; color: red;"><strong>Error loading job details. Please try again.</strong></div>';
                        });
                }

                function closeJobDetailsModal() {
                    document.getElementById('jobDetailsModal').style.display = 'none';
                }

                function displayJobDetails(data) {
                    const job = data.job;
                    const jobId = data.job_id;
                    const foundIn = data.found_in;
                    
                    let html = '<div style="padding: 20px;">';
                    
                    // Basic Job Information
                    html += '<div style="margin-bottom: 25px;">';
                    html += '<h3 style="color: #007bff; margin-bottom: 15px;">📊 Basic Information</h3>';
                    html += '<div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #007bff;">';
                    html += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">';
                    html += '<div><strong>Job ID:</strong><br>' + escapeHtml(jobId) + '</div>';
                    html += '<div><strong>Form Name:</strong><br>' + escapeHtml(job.formName || job.form_name || 'Unknown') + '</div>';
                    html += '<div><strong>Status:</strong><br>' + escapeHtml(job.status || 'Unknown') + '</div>';
                    html += '<div><strong>Printer:</strong><br>' + escapeHtml(job.printerName || job.printer_name || job.printerId || 'Unknown') + '</div>';
                    html += '<div><strong>Priority:</strong><br>' + escapeHtml(job.priority || 'normal') + '</div>';
                    html += '<div><strong>Found In:</strong><br>' + escapeHtml(foundIn) + '</div>';
                    html += '</div>';
                    html += '</div>';
                    html += '</div>';
                    
                    // Timestamps
                    html += '<div style="margin-bottom: 25px;">';
                    html += '<h3 style="color: #007bff; margin-bottom: 15px;">⏰ Timestamps</h3>';
                    html += '<div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #28a745;">';
                    html += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">';
                    if (job.timestamp) html += '<div><strong>Created:</strong><br>' + escapeHtml(job.timestamp) + '</div>';
                    if (job.createdAt) html += '<div><strong>Created At:</strong><br>' + escapeHtml(job.createdAt) + '</div>';
                    if (job.completedAt) html += '<div><strong>Completed At:</strong><br>' + escapeHtml(job.completedAt) + '</div>';
                    if (job.startedAt) html += '<div><strong>Started At:</strong><br>' + escapeHtml(job.startedAt) + '</div>';
                    html += '</div>';
                    html += '</div>';
                    html += '</div>';
                    
                    // Print Configuration
                    if (job.configuration) {
                        html += '<div style="margin-bottom: 25px;">';
                        html += '<h3 style="color: #007bff; margin-bottom: 15px;">⚙️ Print Configuration</h3>';
                        html += '<div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107;">';
                        html += '<pre style="background: white; padding: 10px; border-radius: 4px; overflow-x: auto; margin: 0; font-size: 12px;">' + 
                               escapeHtml(JSON.stringify(job.configuration, null, 2)) + '</pre>';
                        html += '</div>';
                        html += '</div>';
                    }
                    
                    // Label Information
                    if (job.labelInfo) {
                        html += '<div style="margin-bottom: 25px;">';
                        html += '<h3 style="color: #007bff; margin-bottom: 15px;">🏷️ Label Information</h3>';
                        html += '<div style="background: #d1ecf1; padding: 15px; border-radius: 8px; border-left: 4px solid #17a2b8;">';
                        html += '<pre style="background: white; padding: 10px; border-radius: 4px; overflow-x: auto; margin: 0; font-size: 12px;">' + 
                               escapeHtml(JSON.stringify(job.labelInfo, null, 2)) + '</pre>';
                        html += '</div>';
                        html += '</div>';
                    }
                    
                    // Printer Log (if available)
                    if (data.printer_log) {
                        html += '<div style="margin-bottom: 25px;">';
                        html += '<h3 style="color: #007bff; margin-bottom: 15px;">🖨️ Printer Response Log</h3>';
                        html += '<div style="background: #e7f3ff; padding: 15px; border-radius: 8px; border-left: 4px solid #0066cc;">';
                        
                        const log = data.printer_log;
                        
                        // Log summary header
                        html += '<div style="background: white; padding: 10px; border-radius: 4px; margin-bottom: 10px; border: 1px solid #ddd;">';
                        html += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; font-size: 12px;">';
                        html += '<div><strong>📅 Timestamp:</strong><br>' + escapeHtml(log.timestamp || 'Unknown') + '</div>';
                        html += '<div><strong>🖨️ Printer:</strong><br>' + escapeHtml(log.printer_name || 'Unknown') + '</div>';
                        html += '<div><strong>📄 Paper Size:</strong><br>' + escapeHtml(log.paper_size || 'Not specified') + '</div>';
                        html += '<div><strong>📊 Success:</strong><br>' + (log.success ? '✅ Yes' : '❌ No') + '</div>';
                        html += '<div><strong>🔧 Return Code:</strong><br>' + escapeHtml(log.return_code || 'Unknown') + '</div>';
                        html += '<div><strong>⚡ Command:</strong><br>' + escapeHtml(log.command || 'Unknown') + '</div>';
                        html += '</div>';
                        html += '</div>';
                        
                        // Full log output
                        html += '<div style="background: white; padding: 10px; border-radius: 4px; border: 1px solid #ddd;">';
                        html += '<strong style="color: #0066cc; margin-bottom: 10px; display: block;">📋 Complete Printer Log Output:</strong>';
                        html += '<pre style="margin: 0; font-size: 11px; max-height: 400px; overflow-y: auto; line-height: 1.4; white-space: pre-wrap;">' + 
                               escapeHtml(log.full_log || 'No log data available') + '</pre>';
                        html += '</div>';
                        
                        html += '</div>';
                        html += '</div>';
                    }
                    
                    // Raw Job Data (Complete Print Command)
                    html += '<div style="margin-bottom: 25px;">';
                    html += '<h3 style="color: #007bff; margin-bottom: 15px;">🔧 Raw Print Command Data</h3>';
                    html += '<div style="background: #f8d7da; padding: 15px; border-radius: 8px; border-left: 4px solid #dc3545;">';
                    html += '<pre style="background: white; padding: 10px; border-radius: 4px; overflow-x: auto; margin: 0; font-size: 11px; max-height: 300px; overflow-y: auto;">' + 
                           escapeHtml(JSON.stringify(job, null, 2)) + '</pre>';
                    html += '</div>';
                    html += '</div>';
                    
                    html += '</div>';
                    
                    document.getElementById('jobDetailsContent').innerHTML = html;
                }

                function escapeHtml(text) {
                    if (text === null || text === undefined) return 'N/A';
                    const div = document.createElement('div');
                    div.textContent = text;
                    return div.innerHTML;
                }

                // Delete Job Function
                function deleteJob(jobId, jobType) {
                    if (!confirm('Are you sure you want to delete this job?\\n\\nJob ID: ' + jobId + '\\nType: ' + jobType)) {
                        return;
                    }
                    
                    fetch('/delete-job/' + jobId, {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ job_type: jobType })
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            // Show success message
                            alert('✅ ' + data.message);
                            // Refresh the jobs list
                            refreshJobsData();
                        } else {
                            alert('❌ Failed to delete job: ' + (data.error || 'Unknown error'));
                        }
                    })
                    .catch(error => {
                        console.error('Error deleting job:', error);
                        alert('❌ Error deleting job: ' + error);
                    });
                }

                // Edit Job Modal Functions
                function openEditJobModal(jobId, formName, printerName, priority) {
                    // Create or get the edit modal
                    let modal = document.getElementById('editJobModal');
                    if (!modal) {
                        modal = document.createElement('div');
                        modal.id = 'editJobModal';
                        modal.className = 'modal';
                        modal.innerHTML = `
                            <div class="modal-content" style="max-width: 500px;">
                                <div class="modal-header">
                                    <h2>✏️ Edit Job</h2>
                                    <button class="close" onclick="closeEditJobModal()">&times;</button>
                                </div>
                                <div style="padding: 20px;">
                                    <form id="editJobForm">
                                        <input type="hidden" id="editJobId" name="job_id">
                                        
                                        <div style="margin-bottom: 15px;">
                                            <label style="display: block; font-weight: bold; margin-bottom: 5px;">Form Name:</label>
                                            <input type="text" id="editFormName" name="form_name" 
                                                   style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 6px; box-sizing: border-box;">
                                        </div>
                                        
                                        <div style="margin-bottom: 15px;">
                                            <label style="display: block; font-weight: bold; margin-bottom: 5px;">Printer:</label>
                                            <input type="text" id="editPrinterName" name="printer_name" 
                                                   style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 6px; box-sizing: border-box;">
                                        </div>
                                        
                                        <div style="margin-bottom: 20px;">
                                            <label style="display: block; font-weight: bold; margin-bottom: 5px;">Priority:</label>
                                            <select id="editPriority" name="priority" 
                                                    style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 6px; box-sizing: border-box;">
                                                <option value="low">Low</option>
                                                <option value="normal">Normal</option>
                                                <option value="high">High</option>
                                                <option value="urgent">Urgent</option>
                                            </select>
                                        </div>
                                        
                                        <div style="display: flex; gap: 10px; justify-content: flex-end;">
                                            <button type="button" onclick="closeEditJobModal()" class="control-btn" style="background: #6c757d; color: white;">
                                                Cancel
                                            </button>
                                            <button type="submit" class="control-btn success">
                                                💾 Save Changes
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        `;
                        document.body.appendChild(modal);
                        
                        // Add form submit handler
                        document.getElementById('editJobForm').addEventListener('submit', function(e) {
                            e.preventDefault();
                            saveJobEdits();
                        });
                    }
                    
                    // Populate the form with current values
                    document.getElementById('editJobId').value = jobId;
                    document.getElementById('editFormName').value = formName;
                    document.getElementById('editPrinterName').value = printerName;
                    document.getElementById('editPriority').value = priority;
                    
                    // Show the modal
                    modal.style.display = 'block';
                }

                function closeEditJobModal() {
                    const modal = document.getElementById('editJobModal');
                    if (modal) {
                        modal.style.display = 'none';
                    }
                }

                function saveJobEdits() {
                    const jobId = document.getElementById('editJobId').value;
                    const formName = document.getElementById('editFormName').value;
                    const printerName = document.getElementById('editPrinterName').value;
                    const priority = document.getElementById('editPriority').value;
                    
                    fetch('/edit-job/' + jobId, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            form_name: formName,
                            printer_name: printerName,
                            priority: priority
                        })
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            alert('✅ ' + data.message);
                            closeEditJobModal();
                            refreshJobsData();
                        } else {
                            alert('❌ Failed to update job: ' + (data.error || 'Unknown error'));
                        }
                    })
                    .catch(error => {
                        console.error('Error updating job:', error);
                        alert('❌ Error updating job: ' + error);
                    });
                }

                // Client Settings Form - Save with restart prompt
                document.addEventListener('DOMContentLoaded', function() {
                    const settingsForm = document.getElementById('clientSettingsForm');
                    if (settingsForm) {
                        settingsForm.addEventListener('submit', function(e) {
                            e.preventDefault();
                            saveClientSettings();
                        });
                    }
                });

                function saveClientSettings() {
                    const form = document.getElementById('clientSettingsForm');
                    const formData = new FormData(form);
                    const statusEl = document.getElementById('connectionStatus');
                    
                    statusEl.innerHTML = '💾 Saving settings...';
                    statusEl.style.background = '#d1ecf1';
                    statusEl.style.color = '#0c5460';
                    
                    fetch('/save-client-settings?ajax=1', {
                        method: 'POST',
                        body: formData,
                        headers: {
                            'Accept': 'application/json'
                        }
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            statusEl.innerHTML = '✅ Settings saved!';
                            statusEl.style.background = '#d4edda';
                            statusEl.style.color = '#155724';
                            
                            if (data.needsRestart) {
                                // Show restart confirmation dialog
                                showRestartDialog(data.clientName, data.serverUrl);
                            }
                        } else {
                            statusEl.innerHTML = '❌ ' + (data.error || 'Failed to save');
                            statusEl.style.background = '#f8d7da';
                            statusEl.style.color = '#721c24';
                        }
                    })
                    .catch(error => {
                        statusEl.innerHTML = '❌ Error: ' + error;
                        statusEl.style.background = '#f8d7da';
                        statusEl.style.color = '#721c24';
                    });
                }

                function showRestartDialog(clientName, serverUrl) {
                    // Create modal if it doesn't exist
                    let modal = document.getElementById('restartModal');
                    if (!modal) {
                        modal = document.createElement('div');
                        modal.id = 'restartModal';
                        modal.className = 'modal';
                        modal.innerHTML = `
                            <div class="modal-content" style="max-width: 500px;">
                                <div class="modal-header" style="background: #ffc107; color: #212529;">
                                    <h2>🔄 Restart Required</h2>
                                    <button class="close" onclick="closeRestartModal()">&times;</button>
                                </div>
                                <div style="padding: 20px;">
                                    <p style="font-size: 16px; margin-bottom: 15px;">
                                        Settings have been saved successfully!
                                    </p>
                                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                                        <strong>🏷️ Client Name:</strong> <span id="restartClientName"></span><br>
                                        <strong>📡 Server URL:</strong> <span id="restartServerUrl"></span>
                                    </div>
                                    <p style="font-size: 14px; color: #666; margin-bottom: 20px;">
                                        <strong>⚠️ Important:</strong> The print client needs to restart for the new settings to take effect.
                                    </p>
                                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                                        <button onclick="closeRestartModal()" class="control-btn" style="background: #6c757d; color: white;">
                                            Later
                                        </button>
                                        <button onclick="restartServer()" class="control-btn success" style="padding: 12px 24px;">
                                            🔄 Restart Now
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `;
                        document.body.appendChild(modal);
                    }
                    
                    // Update the modal content
                    document.getElementById('restartClientName').textContent = clientName || 'Not set';
                    document.getElementById('restartServerUrl').textContent = serverUrl || 'Not set';
                    
                    // Show the modal
                    modal.style.display = 'block';
                }

                function closeRestartModal() {
                    const modal = document.getElementById('restartModal');
                    if (modal) {
                        modal.style.display = 'none';
                    }
                }

                function restartServer() {
                    const modal = document.getElementById('restartModal');
                    const statusEl = document.getElementById('connectionStatus');
                    
                    // Update modal to show restarting status
                    if (modal) {
                        modal.querySelector('.modal-content').innerHTML = `
                            <div style="padding: 40px; text-align: center;">
                                <div style="font-size: 48px; margin-bottom: 20px;">🔄</div>
                                <h2 style="margin-bottom: 15px;">Restarting Server...</h2>
                                <p style="color: #666;">Please wait while the print client restarts.</p>
                                <p style="color: #666; font-size: 14px;">The page will automatically refresh in a few seconds.</p>
                                <div style="margin-top: 20px;">
                                    <div class="spinner" style="border: 4px solid #f3f3f3; border-top: 4px solid #007bff; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto;"></div>
                                </div>
                            </div>
                            <style>
                                @keyframes spin {
                                    0% { transform: rotate(0deg); }
                                    100% { transform: rotate(360deg); }
                                }
                            </style>
                        `;
                    }
                    
                    fetch('/restart-server', {
                        method: 'POST',
                        headers: {
                            'Accept': 'application/json'
                        }
                    })
                    .then(response => response.json())
                    .then(data => {
                        // Wait a moment then start checking if server is back up
                        setTimeout(function() {
                            checkServerAndRefresh();
                        }, 2000);
                    })
                    .catch(error => {
                        // Server probably restarted, wait and check
                        setTimeout(function() {
                            checkServerAndRefresh();
                        }, 2000);
                    });
                }

                function checkServerAndRefresh(attempts) {
                    attempts = attempts || 0;
                    const maxAttempts = 10;
                    
                    fetch('/get-config')
                        .then(response => {
                            if (response.ok) {
                                // Server is back up, refresh the page
                                window.location.reload();
                            } else {
                                throw new Error('Server not ready');
                            }
                        })
                        .catch(error => {
                            if (attempts < maxAttempts) {
                                // Try again in 1 second
                                setTimeout(function() {
                                    checkServerAndRefresh(attempts + 1);
                                }, 1000);
                            } else {
                                // Give up and just refresh
                                window.location.reload();
                            }
                        });
                }
            </script>

            <!-- Connection Configuration Modal -->
            <div id="connectionModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>🔧 Connection Settings</h2>
                        <button class="close" onclick="closeConnectionModal()">&times;</button>
                    </div>
                    
                    <!-- Server URL Configuration -->
                    <div class="modal-form">
                        <form method="POST" action="/set-server">
                            <label for="server_url">🌐 Server URL:</label>
                            <input type="text" id="server_url" name="server_url" value="https://{{ current_ip }}:5001" placeholder="https://192.168.x.x:5001">
                            <button type="submit" class="control-btn success">💾 Save Server URL</button>
                        </form>
                    </div>
                    
                    <!-- Auth Token Configuration -->
                    <div class="modal-form">
                        <form method="POST" action="/set-token">
                            <label for="auth_token">🔑 Auth Token:</label>
                            <input type="text" id="auth_token" name="auth_token" value="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFAYS5jb20iLCJuYW1lIjoiU3RlcGhlbiBWaWxsYXZhc28iLCJyb2xlIjoiQWRtaW4iLCJpYXQiOjE3NTQ0MTA1MTYsImV4cCI6MTc1NDQ5NjkxNn0.avbvX6Ami3vMx6wFEF9xDe7Zwx1p_acMkBcLws_cNxI" placeholder="Enter your JWT token here">
                            <button type="submit" class="control-btn primary">🔐 Save Token</button>
                        </form>
                    </div>
                </div>
            </div>

            <!-- Job Details Modal -->
            <div id="jobDetailsModal" class="modal">
                <div class="modal-content" style="width: 800px; max-width: 95%;">
                    <div class="modal-header">
                        <h2>📋 Job Details</h2>
                        <button class="close" onclick="closeJobDetailsModal()">&times;</button>
                    </div>
                    
                    <div id="jobDetailsContent" style="max-height: 500px; overflow-y: auto;">
                        <div style="text-align: center; padding: 40px;">
                            <strong>Loading job details...</strong>
                        </div>
                    </div>
                </div>
            </div>

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
        client_name=current_app.config.get("CLIENT_NAME", config_manager.CLIENT_NAME),
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
        
        # Try multiple ways to get logs
        logs = []
        errors = []
        
        # Method 1: Try to import from main app
        try:
            import sys
            if 'print_dashboard_insepctionapp' in sys.modules:
                main_module = sys.modules['print_dashboard_insepctionapp']
                if hasattr(main_module, 'PRINT_LOG'):
                    logs = main_module.PRINT_LOG[-100:] if main_module.PRINT_LOG else []
                if hasattr(main_module, 'PRINT_ERRORS'):
                    errors = main_module.PRINT_ERRORS[-50:] if main_module.PRINT_ERRORS else []
        except Exception as e:
            logs.append(f"Could not import logs from main module: {str(e)}")
        
        # Method 2: Try to get logs from current app config
        try:
            app_logs = current_app.config.get('PRINT_LOG', [])
            app_errors = current_app.config.get('PRINT_ERRORS', [])
            if app_logs:
                logs.extend(app_logs[-50:])
            if app_errors:
                errors.extend(app_errors[-25:])
        except Exception as e:
            logs.append(f"Could not get logs from app config: {str(e)}")
        
        # Method 3: Add a test log entry
        test_log = f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Test log entry from activity logs route"
        logs.append(test_log)
        
        # Method 4: Try to get recent console output
        try:
            import subprocess
            result = subprocess.run(['ps', 'aux'], capture_output=True, text=True, timeout=5)
            if 'print_dashboard_insepctionapp' in result.stdout:
                logs.append("Found print dashboard process running")
        except:
            pass
        
        return jsonify({
            'success': True,
            'logs': logs[-100:] if logs else ["No logs available"],
            'errors': errors[-50:] if errors else [],
            'timestamp': datetime.now().isoformat(),
            'log_count': len(logs),
            'error_count': len(errors)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'logs': [f"Error getting logs: {str(e)}"],
            'errors': [],
            'timestamp': datetime.now().isoformat()
        })

@main_bp.route("/test-logging")
def test_logging():
    """Test polling functionality and show actual polling data"""
    try:
        from flask import current_app, jsonify
        import api_client
        
        # Get current configuration
        client_id = current_app.config.get("CLIENT_ID", config_manager.CLIENT_ID)
        server_url = current_app.config.get("PRINT_SERVER", config_manager.get_dynamic_server_config()["PRINT_SERVER"])
        auth_token = current_app.config.get("AUTH_TOKEN", "")
        
        # Create a simple log function for this test
        def test_log_func(message, is_error=False, category="test"):
            print(f"[TEST-LOG] {message}")
            return message
        
        # Test the actual polling API call
        try:
            # Call the polling function directly with the app object
            result = api_client.poll_for_pending_jobs(
                app=current_app,
                log_message_func=test_log_func
            )
            
            # Format the result for display
            if isinstance(result, list):
                jobs = result
                total_pending = len(jobs)
                response_data = {
                    'success': True,
                    'message': f"✅ Polling successful! Found {total_pending} pending jobs",
                    'polling_result': result,
                    'jobs_count': len(jobs),
                    'total_pending': total_pending,
                    'client_id': client_id,
                    'server_url': server_url,
                    'timestamp': datetime.now().isoformat()
                }
                
                # Add job details for debugging
                if jobs:
                    response_data['job_details'] = []
                    for job in jobs[:3]:  # Show first 3 jobs
                        response_data['job_details'].append({
                            'id': job.get('id', 'unknown'),
                            'formName': job.get('formName', 'unknown'),
                            'printerId': job.get('printerId', 'unknown'),
                            'status': job.get('status', 'unknown'),
                            'createdAt': job.get('createdAt', 'unknown')
                        })
            else:
                response_data = {
                    'success': False,
                    'message': f"❌ Unexpected polling result type: {type(result)}",
                    'polling_result': str(result),
                    'client_id': client_id,
                    'server_url': server_url,
                    'timestamp': datetime.now().isoformat()
                }
                
        except Exception as e:
            response_data = {
                'success': False,
                'message': f"❌ Exception during polling: {str(e)}",
                'error': str(e),
                'client_id': client_id,
                'server_url': server_url,
                'timestamp': datetime.now().isoformat()
            }
        
        return jsonify(response_data)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }) 