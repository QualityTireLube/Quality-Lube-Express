"""
Main application Flask routes for the Print Client Dashboard.
Handles the core dashboard interface and primary navigation.
Refactored from print_dashboard_insepctionapp.py on 2024 - Section 6: Flask routes/blueprints
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
    """Main dashboard page with original tabbed interface"""
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
        
        # Get printer statuses and connection info (like original)
        printer_statuses = get_printer_statuses()
        
        # Test connection status (like original)
        try:
            result = api_client.test_connection(current_app, log_message_func)
            connected = result[0] if isinstance(result, tuple) else result.get('success', False)
            connection_msg = result[1] if isinstance(result, tuple) else result.get('message', 'Connection test failed')
        except Exception as e:
            connected = False
            connection_msg = f'Connection test failed: {str(e)}'
        
        # Check if we're using dynamic IP
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
        
        # Get other status info (like original)
        server_url = current_app.config.get("PRINT_SERVER", "Not configured")
        verify_ssl = config_manager.VERIFY_SSL
        client_id = current_app.config.get("CLIENT_ID", config_manager.CLIENT_ID)
        token_value = current_app.config.get("AUTH_TOKEN", "")
        
        # Job counts
        pending_count = len(pending_previews)
        claimed_count = len(job_tracker)
        preview_count = len(pending_previews)
        auto_approval_enabled = print_queue.get_auto_approval_status()
        
        # Render the original tabbed dashboard template
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
                
                /* Navigation Tabs */
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
                
                /* Tab Content */
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
                
                /* Quick Status Bar */
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
                
                /* Existing styles */
                textarea { width: 100%; height: 150px; overflow-y: scroll; font-family: monospace; }
                pre { background: #f0f0f0; padding: 10px; border-radius: 4px; }
                .status-online { color: green; font-weight: bold; }
                .status-offline { color: red; font-weight: bold; }
                .status-inuse { color: orange; font-weight: bold; }
                .status-unknown { color: gray; }
                .status-notfound { color: #666; font-style: italic; }
                .status-failed { color: red; font-style: italic; }
                .status-timeout { color: orange; font-style: italic; }
                
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
                .section h3 {
                    color: #555;
                    margin-top: 25px;
                }
                
                .printer-available { background: #d4edda; padding: 12px; margin: 8px 0; border-radius: 6px; border-left: 4px solid green; }
                .printer-unavailable { background: #f8d7da; padding: 12px; margin: 8px 0; border-radius: 6px; border-left: 4px solid red; }
                .printer-unknown { background: #fff3cd; padding: 12px; margin: 8px 0; border-radius: 6px; border-left: 4px solid orange; }
                .printer-error { background: #f1f1f1; padding: 12px; margin: 8px 0; border-radius: 6px; border-left: 4px solid gray; }
                
                .connection-good { background: #d4edda; padding: 15px; border-radius: 6px; color: #155724; }
                .connection-bad { background: #f8d7da; padding: 15px; border-radius: 6px; color: #721c24; }
                
                .config-form { 
                    display: inline-block; 
                    margin: 10px 5px; 
                }
                
                .controls-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 15px;
                    margin: 20px 0;
                }
                
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
                .control-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    transform: none;
                }
                
                /* Enhanced Activity Logs Styles */
                .activity-logs-container {
                    background: #f8f9fa;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                }
                
                .logs-header {
                    background: linear-gradient(135deg, #007bff, #0056b3);
                    color: white;
                    padding: 15px 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-radius: 12px 12px 0 0;
                }
                
                .logs-controls {
                    display: flex;
                    gap: 10px;
                    align-items: center;
                }
                
                .log-filter-btn {
                    background: rgba(255,255,255,0.2);
                    border: 1px solid rgba(255,255,255,0.3);
                    color: white;
                    padding: 6px 12px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 12px;
                    transition: all 0.3s ease;
                }
                
                .log-filter-btn:hover, .log-filter-btn.active {
                    background: rgba(255,255,255,0.3);
                    border-color: rgba(255,255,255,0.5);
                }
                
                .logs-search {
                    background: rgba(255,255,255,0.9);
                    border: none;
                    padding: 8px 12px;
                    border-radius: 6px;
                    font-size: 13px;
                    width: 200px;
                    color: #333;
                }
                
                .logs-content {
                    background: white;
                    max-height: 400px;
                    overflow-y: auto;
                    font-family: 'Courier New', monospace;
                    font-size: 13px;
                }
                
                .log-entry {
                    padding: 8px 15px;
                    border-bottom: 1px solid #e9ecef;
                    transition: background-color 0.2s ease;
                    line-height: 1.4;
                }
                
                .log-entry:hover {
                    background: #f8f9fa;
                }
                
                .log-entry.log-info {
                    border-left: 4px solid #007bff;
                }
                
                .log-entry.log-success {
                    border-left: 4px solid #28a745;
                    background: #f8fff9;
                }
                
                .log-entry.log-warning {
                    border-left: 4px solid #ffc107;
                    background: #fffdf5;
                }
                
                .log-entry.log-error {
                    border-left: 4px solid #dc3545;
                    background: #fff5f5;
                }
                
                .log-timestamp {
                    color: #6c757d;
                    font-size: 11px;
                    margin-right: 10px;
                }
                
                .log-message {
                    color: #333;
                }
                
                .log-category {
                    background: #e9ecef;
                    color: #495057;
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-size: 10px;
                    margin-left: 8px;
                    text-transform: uppercase;
                }
                
                .logs-empty {
                    padding: 40px 20px;
                    text-align: center;
                    color: #6c757d;
                    font-style: italic;
                }
                
                .auto-scroll-toggle {
                    background: rgba(255,255,255,0.2);
                    border: 1px solid rgba(255,255,255,0.3);
                    color: white;
                    padding: 6px 12px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 12px;
                    transition: all 0.3s ease;
                }
                
                .auto-scroll-toggle.enabled {
                    background: #28a745;
                    border-color: #28a745;
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
                
                .job-header {
                    padding: 15px 20px;
                    cursor: pointer;
                    display: grid;
                    grid-template-columns: auto 1fr auto auto;
                    gap: 15px;
                    align-items: center;
                }
                
                .job-status-indicator {
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    flex-shrink: 0;
                }
                
                .job-status-indicator.pending { background: #ffc107; }
                .job-status-indicator.claimed { background: #17a2b8; }
                .job-status-indicator.printing { background: #fd7e14; }
                .job-status-indicator.completed { background: #28a745; }
                .job-status-indicator.failed { background: #dc3545; }
                
                .job-info {
                    min-width: 0; /* Allow text to wrap */
                }
                
                .job-title {
                    font-weight: 600;
                    color: #333;
                    margin: 0 0 4px 0;
                    font-size: 14px;
                }
                
                .job-copies-badge {
                    background: #007bff;
                    color: white;
                    padding: 2px 6px;
                    border-radius: 10px;
                    font-size: 0.8em;
                    font-weight: bold;
                    margin-left: 8px;
                    display: inline-block;
                }
                
                .job-details {
                    color: #666;
                    font-size: 12px;
                    line-height: 1.4;
                }
                
                .job-timestamp {
                    color: #6c757d;
                    font-size: 11px;
                    text-align: right;
                }
                
                .job-actions {
                    display: flex;
                    gap: 8px;
                }
                
                .job-expand-btn {
                    background: none;
                    border: 1px solid #dee2e6;
                    color: #6c757d;
                    width: 24px;
                    height: 24px;
                    border-radius: 4px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                    transition: all 0.2s ease;
                }
                
                .job-expand-btn:hover {
                    background: #f8f9fa;
                    border-color: #adb5bd;
                }
                
                .job-expand-btn.expanded {
                    background: #007bff;
                    color: white;
                    border-color: #007bff;
                }
                
                .job-details-panel {
                    display: none;
                    padding: 20px;
                    background: #f8f9fa;
                    border-top: 1px solid #dee2e6;
                }
                
                .job-details-panel.expanded {
                    display: block;
                }
                
                .job-detail-tabs {
                    display: flex;
                    gap: 10px;
                    margin-bottom: 15px;
                    border-bottom: 1px solid #dee2e6;
                }
                
                .job-detail-tab {
                    padding: 8px 16px;
                    background: none;
                    border: none;
                    border-bottom: 2px solid transparent;
                    cursor: pointer;
                    font-size: 13px;
                    color: #666;
                    transition: all 0.2s ease;
                }
                
                .job-detail-tab:hover {
                    color: #007bff;
                }
                
                .job-detail-tab.active {
                    color: #007bff;
                    border-bottom-color: #007bff;
                }
                
                .job-detail-content {
                    display: none;
                }
                
                .job-detail-content.active {
                    display: block;
                }
                
                .job-log-viewer {
                    background: #2d3748;
                    color: #e2e8f0;
                    padding: 15px;
                    border-radius: 6px;
                    font-family: 'Courier New', monospace;
                    font-size: 12px;
                    max-height: 300px;
                    overflow-y: auto;
                    line-height: 1.4;
                }
                
                .job-data-viewer {
                    background: #f8f9fa;
                    color: #333;
                    padding: 15px;
                    border-radius: 6px;
                    font-family: 'Courier New', monospace;
                    font-size: 12px;
                    max-height: 300px;
                    overflow-y: auto;
                    line-height: 1.4;
                    border: 1px solid #dee2e6;
                }
                
                .job-data-viewer pre {
                    margin: 0;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                    color: #333;
                    background: transparent;
                }
                
                .job-log-entry {
                    padding: 2px 0;
                    border-left: 3px solid transparent;
                    padding-left: 8px;
                    margin: 2px 0;
                }
                
                .job-log-entry.success { border-left-color: #48bb78; }
                .job-log-entry.error { border-left-color: #f56565; }
                .job-log-entry.warning { border-left-color: #ed8936; }
                .job-log-entry.info { border-left-color: #4299e1; }
                
                /* Template Preview Styles for Jobs */
                .job-template-preview-container {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                    padding: 10px;
                }
                
                .template-preview-loading {
                    text-align: center;
                    padding: 20px;
                    color: #666;
                    font-style: italic;
                }
                
                .error-message, .info-message {
                    padding: 15px;
                    border-radius: 8px;
                    text-align: center;
                    margin: 10px 0;
                }
                
                .error-message {
                    background: #f8d7da;
                    color: #721c24;
                    border: 1px solid #f5c6cb;
                }
                
                .info-message {
                    background: #d1ecf1;
                    color: #0c5460;
                    border: 1px solid #bee5eb;
                }
                
                .job-metadata-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 15px;
                }
                
                .job-metadata-item {
                    background: white;
                    padding: 12px;
                    border-radius: 6px;
                    border-left: 4px solid #007bff;
                }
                
                .job-metadata-label {
                    font-size: 11px;
                    color: #666;
                    text-transform: uppercase;
                    font-weight: 600;
                    margin-bottom: 4px;
                }
                
                .job-metadata-value {
                    font-size: 13px;
                    color: #333;
                    font-weight: 500;
                }
                
                .jobs-empty {
                    padding: 40px 20px;
                    text-align: center;
                    color: #6c757d;
                    font-style: italic;
                    background: white;
                    border-radius: 8px;
                }
                
                .jobs-refresh-btn {
                    background: #007bff;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 12px;
                    transition: background-color 0.2s ease;
                }
                
                .jobs-refresh-btn:hover {
                    background: #0056b3;
                }
                
                /* Job Action Buttons */
                .job-action-btn {
                    background: #fff;
                    border: 1px solid #dee2e6;
                    color: #333;
                    padding: 6px 12px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 11px;
                    font-weight: 500;
                    transition: all 0.2s ease;
                    text-decoration: none;
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                }
                
                .job-action-btn:hover {
                    background: #f8f9fa;
                    border-color: #adb5bd;
                    transform: translateY(-1px);
                }
                
                .job-action-btn.preview {
                    border-color: #17a2b8;
                    color: #17a2b8;
                }
                
                .job-action-btn.preview:hover {
                    background: #17a2b8;
                    color: white;
                }
                
                .job-action-btn.approve {
                    border-color: #28a745;
                    color: #28a745;
                }
                
                .job-action-btn.approve:hover {
                    background: #28a745;
                    color: white;
                }
                
                .job-action-btn.cancel {
                    border-color: #dc3545;
                    color: #dc3545;
                }
                
                .job-action-btn.cancel:hover {
                    background: #dc3545;
                    color: white;
                }
                
                .job-action-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    transform: none;
                }
                
                .queue-logs { background: #f8f9fa; border: 2px solid #28a745; border-radius: 8px; }
                .queue-logs h3 { color: #28a745; margin-top: 0; }
                .queue-textarea { font-family: 'Courier New', monospace; font-size: 13px; background: #ffffff; border: 1px solid #ced4da; }
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
                            <a href="/setup-credentials" class="control-btn primary" style="text-decoration: none; text-align: center;">
                                🔑 Setup Authentication
                            </a>
                            <a href="/set-token-manual" class="control-btn info" style="text-decoration: none; text-align: center;">
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
                        <form method="POST" action="/refresh-ip" class="config-form">
                            <button type="submit" class="control-btn info">🔄 Refresh IP Detection</button>
                        </form>
                        
                        <form method="POST" action="/toggle-dynamic-ip" class="config-form">
                            <label style="display: flex; align-items: center; gap: 10px;">
                                <input type="checkbox" name="use_dynamic_ip" {% if use_dynamic_ip %}checked{% endif %} onchange="this.form.submit()"/>
                                <span>Auto-detect IP address changes</span>
                            </label>
                        </form>
                        
                        <form method="POST" action="/set-server" class="config-form" style="display: flex; gap: 10px; align-items: center;">
                            <label>Server URL:</label>
                            <input name="server_url" value="{{ server_url }}" size="50" {% if use_dynamic_ip %}readonly style="background: #f0f0f0;"{% endif %}/>
                            <button type="submit" {% if use_dynamic_ip %}disabled{% endif %} class="control-btn primary">Save</button>
                        </form>
                        
                        <form method="POST" action="/set-interval" class="config-form" style="display: flex; gap: 10px; align-items: center;">
                            <label>Poll Interval (seconds):</label>
                            <input name="interval" value="{{ interval }}" size="8" type="number" min="1"/>
                            <button type="submit" class="control-btn primary">Update</button>
                        </form>
                        
                        <form method="POST" action="/set-verify" class="config-form">
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
                    <div class="{% if status.lower() == 'online' %}printer-available{% elif status.lower() in ['offline', 'stopped'] %}printer-unavailable{% elif 'error' in status.lower() or 'failed' in status.lower() %}printer-error{% else %}printer-unknown{% endif %}">
                        <strong>{{ printer_name }}:</strong> {{ status }}
                    </div>
                    {% endfor %}
                </div>

                <!-- Printer Settings Section -->
                <div class="section" style="margin-top: 30px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h2>⚙️ Printer Settings</h2>
                        <button onclick="refreshPrinterSettings()" class="control-btn info">
                            🔄 Refresh Settings
                        </button>
                    </div>
                    <p style="color: #666; margin-bottom: 20px;">
                        Configure paper size and orientation settings for each printer. These settings override the default auto-resize options.
                    </p>
                    
                    <div id="printer-settings-list">
                        <div style="background: #f8f9fa; padding: 30px; border-radius: 8px; text-align: center; border: 2px dashed #6c757d;">
                            <strong>🔄 Loading printer settings...</strong><br>
                            Please wait while we fetch your printer configuration.
                        </div>
                    </div>
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
                            <form method="POST" action="/toggle-auto-approval" style="margin: 0;">
                                <button type="submit" class="control-btn {{ 'danger' if auto_approval_enabled else 'success' }}">
                                    {{ '🔴 Disable Auto Print' if auto_approval_enabled else '🟢 Enable Auto Print' }}
                                </button>
                            </form>
                        <button class="jobs-refresh-btn" onclick="refreshJobsData()">
                            🔄 Refresh Jobs
                        </button>
                        </div>
                    </div>
                    
                    <div class="jobs-container" id="jobs-container">
                        <p class="jobs-empty">Loading job data...</p>
                    </div>
                </div>
            </div>

            <!-- Preview Queue Tab -->
            <div id="preview-content" class="tab-content">
                <div class="section">
                    <h2>👁️ Preview Queue</h2>
                    <p>Previews waiting: {{ preview_count }}</p>
                    <div id="preview-queue">
                        <!-- Preview queue content will be loaded here by JavaScript -->
                    </div>
                    
                    {% if preview_count > 0 %}
                    <div id="preview-queue-container">
                        <p>Loading preview queue...</p>
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
                    <div class="activity-logs-container">
                        <div class="logs-header">
                            <h3>Activity Logs</h3>
                            <div class="logs-controls">
                                <button class="log-filter-btn" onclick="filterLogs('all')">All</button>
                                <button class="log-filter-btn" onclick="filterLogs('info')">Info</button>
                                <button class="log-filter-btn" onclick="filterLogs('success')">Success</button>
                                <button class="log-filter-btn" onclick="filterLogs('warning')">Warning</button>
                                <button class="log-filter-btn" onclick="filterLogs('error')">Error</button>
                                <input type="text" class="logs-search" placeholder="Search logs..." onkeyup="filterLogs()">
                                <button class="auto-scroll-toggle" onclick="toggleAutoScroll()">
                                    Auto-scroll: <span id="auto-scroll-status">Off</span>
                                </button>
                            </div>
                        </div>
                        <div class="logs-content" id="logs-content-inner">
                            <p class="logs-empty">No activity logs yet. Refresh the page to see new logs.</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <script>
                let activeTab = 'overview';
                let autoScrollEnabled = false;
                let currentLogFilter = 'all';
                let logSearchTerm = '';
                let expandedJobs = new Set(); // Track expanded job details
                let jobActiveTabs = new Map(); // Track active tab for each job
                
                // Load saved tab from localStorage
                window.addEventListener('DOMContentLoaded', function() {
                    const savedTab = localStorage.getItem('printClientActiveTab');
                    if (savedTab) {
                        showTab(savedTab, false); // Don't trigger event for initial load
                    }
                    
                    // Initialize logs
                    loadActivityLogs();
                    

                    
                    // Start auto-refresh for logs if on logs tab
                    if (activeTab === 'logs') {
                        startLogAutoRefresh();
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
                    
                    // Add active class to clicked tab button (find by onclick attribute)
                    const targetButton = document.querySelector(`[onclick="showTab('${tabName}')"]`);
                    if (targetButton) {
                        targetButton.classList.add('active');
                    }
                    
                    activeTab = tabName;
                    
                    // Save to localStorage for persistence
                    if (saveToStorage) {
                        localStorage.setItem('printClientActiveTab', tabName);
                    }
                    
                    // Load specific tab data if needed
                    if (tabName === 'preview') {
                        loadPreviewQueue();
                    } else if (tabName === 'logs') {
                        loadActivityLogs();
                        startLogAutoRefresh();
                    } else if (tabName === 'jobs') {
                        refreshJobsData();
                    } else if (tabName === 'printers') {
                        loadPrinterSettings();

                    } else {
                        stopLogAutoRefresh();
                    }
                }
                
                // Enhanced Activity Logs Functions
                let logRefreshInterval = null;
                
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
                    const logsContainer = document.getElementById('logs-content-inner');
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
                    
                    // Filter logs based on current filter and search
                    const filteredLogs = allLogs.filter(function(log) {
                        const matchesFilter = currentLogFilter === 'all' || log.type === currentLogFilter;
                        const matchesSearch = !logSearchTerm || 
                            log.message.toLowerCase().includes(logSearchTerm.toLowerCase()) ||
                            log.timestamp.toLowerCase().includes(logSearchTerm.toLowerCase());
                        return matchesFilter && matchesSearch;
                    });
                    
                    if (filteredLogs.length === 0) {
                        logsContainer.innerHTML = '<p class="logs-empty">No logs match the current filter.</p>';
                        return;
                    }
                    
                    // Display logs
                    let html = '';
                    filteredLogs.forEach(log => {
                        html += '<div class="log-entry log-' + log.type + '">' +
                            '<span class="log-timestamp">' + formatTimestamp(log.timestamp) + '</span>' +
                            '<span class="log-message">' + escapeHtml(log.message) + '</span>' +
                            (log.category ? '<span class="log-category">' + log.category + '</span>' : '') +
                            '</div>';
                    });
                    
                    const shouldScroll = autoScrollEnabled && logsContainer.scrollTop + logsContainer.clientHeight >= logsContainer.scrollHeight - 50;
                    
                    logsContainer.innerHTML = html;
                    
                    if (shouldScroll) {
                        logsContainer.scrollTop = logsContainer.scrollHeight;
                    }
                }
                
                function parseLogEntry(logText, isError) {
                    // Parse timestamp and message from log entry
                    const timestampMatch = logText.match(/^\\[([^\\]]+)\\]/);
                    const timestamp = timestampMatch ? timestampMatch[1] : new Date().toISOString();
                    const message = logText.replace(/^\\[[^\\]]+\\]\\s*/, '');
                    
                    // Determine log type based on content and error flag
                    let type = 'info';
                    if (isError) {
                        type = 'error';
                    } else if (message.includes('✅') || message.includes('SUCCESS') || message.includes('READY')) {
                        type = 'success';
                    } else if (message.includes('⚠️') || message.includes('WARNING') || message.includes('Failed')) {
                        type = 'warning';
                    } else if (message.includes('❌') || message.includes('ERROR') || message.includes('Error')) {
                        type = 'error';
                    }
                    
                    // Extract category if present
                    let category = null;
                    if (message.includes('category="queue"') || message.includes('🖨️')) {
                        category = 'queue';
                    
                    } else if (message.includes('🌐') || message.includes('Connection')) {
                        category = 'network';
                    }
                    
                    return {
                        timestamp,
                        message: message.replace(/category="[^"]*"/, '').trim(),
                        type,
                        category,
                        raw: logText
                    };
                }
                
                function formatTimestamp(timestamp) {
                    try {
                        const date = new Date(timestamp);
                        return date.toLocaleTimeString();
                    } catch (e) {
                        return timestamp;
                    }
                }
                
                function escapeHtml(text) {
                    const div = document.createElement('div');
                    div.textContent = text;
                    return div.innerHTML;
                }
                
                function filterLogs(type = null) {
                    if (type) {
                        currentLogFilter = type;
                        
                        // Update active filter button
                        document.querySelectorAll('.log-filter-btn').forEach(btn => {
                            btn.classList.remove('active');
                        });
                        event.target.classList.add('active');
                    } else {
                        // Search filter
                        const searchInput = document.querySelector('.logs-search');
                        logSearchTerm = searchInput ? searchInput.value : '';
                    }
                    
                    // Reload logs with new filter
                    loadActivityLogs();
                }
                
                function toggleAutoScroll() {
                    autoScrollEnabled = !autoScrollEnabled;
                    const statusSpan = document.getElementById('auto-scroll-status');
                    const toggleBtn = document.querySelector('.auto-scroll-toggle');
                    
                    if (statusSpan) {
                        statusSpan.textContent = autoScrollEnabled ? 'On' : 'Off';
                    }
                    
                    if (toggleBtn) {
                        if (autoScrollEnabled) {
                            toggleBtn.classList.add('enabled');
                        } else {
                            toggleBtn.classList.remove('enabled');
                        }
                    }
                    
                    if (autoScrollEnabled) {
                        const logsContainer = document.getElementById('logs-content-inner');
                        if (logsContainer) {
                            logsContainer.scrollTop = logsContainer.scrollHeight;
                        }
                    }
                }
                
                function startLogAutoRefresh() {
                    if (logRefreshInterval) {
                        clearInterval(logRefreshInterval);
                    }
                    
                    logRefreshInterval = setInterval(function() {
                        if (activeTab === 'logs') {
                            loadActivityLogs();
                        }
                    }, 3000); // Refresh every 3 seconds
                }
                
                function stopLogAutoRefresh() {
                    if (logRefreshInterval) {
                        clearInterval(logRefreshInterval);
                        logRefreshInterval = null;
                    }
                }
                
                // Enhanced Job Management Functions
                function refreshJobsData() {
                    fetch('/jobs-data')
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                displayJobsData(data);
                            } else {
                                console.error('Failed to load jobs data:', data.error);
                                document.getElementById('jobs-container').innerHTML = 
                                    '<p class="jobs-empty">Failed to load job data. Please try again.</p>';
                            }
                        })
                        .catch(error => {
                            console.error('Error loading jobs data:', error);
                            document.getElementById('jobs-container').innerHTML = 
                                '<p class="jobs-empty">Error loading job data. Please check your connection.</p>';
                        });
                }
                
                function displayJobsData(data) {
                    const container = document.getElementById('jobs-container');
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
                    
                    // Restore expanded states after rendering
                    setTimeout(function() {
                        expandedJobs.forEach(function(jobId) {
                                                const panel = document.getElementById('details-panel-' + jobId);
                    const button = document.getElementById('expand-btn-' + jobId);
                            if (panel && button) {
                                panel.classList.add('expanded');
                                button.classList.add('expanded');
                                button.textContent = '▲';
                                
                                // Restore active tab for this job
                                const activeTabType = jobActiveTabs.get(jobId) || 'info';
                                if (activeTabType !== 'info') {
                                    switchJobDetailTab(jobId, activeTabType, true); // true = skip event tracking
                                }
                            }
                        });
                    }, 100);
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
                    
                    // Extract copies information
                    const configuration = job.configuration || {};
                    const copies = configuration.copies || 1;
                    const copiesDisplay = copies > 1 ? ` ${copies}x` : '';
                    
                    // Extract additional details
                    const jobData = job.jobData || {};
                    const metadata = jobData.metadata || {};
                    const documentType = metadata.documentType || jobData.type || 'Unknown';
                    
                    // Determine which action buttons to show based on job status
                    let actionButtons = '';
                    
                    if (status === 'pending') {
                        // For pending jobs: Preview, Approve, Cancel
                        actionButtons = 
                            '<button class="job-action-btn preview" onclick="event.stopPropagation(); previewJob(&quot;' + jobId + '&quot;)" title="Preview PDF">' +
                                '👁️ Preview' +
                            '</button>' +
                            '<button class="job-action-btn approve" onclick="event.stopPropagation(); approveJob(&quot;' + jobId + '&quot;)" title="Approve & Print">' +
                                '✅ Approve' +
                            '</button>' +
                            '<button class="job-action-btn cancel" onclick="event.stopPropagation(); cancelJob(&quot;' + jobId + '&quot;)" title="Cancel Job">' +
                                '🚫 Cancel' +
                            '</button>';
                    } else if (status === 'claimed') {
                        // For claimed jobs: Cancel only (being processed)
                        actionButtons = 
                            '<button class="job-action-btn cancel" onclick="event.stopPropagation(); cancelJob(&quot;' + jobId + '&quot;)" title="Cancel Job">' +
                                '🚫 Cancel' +
                            '</button>';
                    } else if (status === 'completed') {
                        // For completed jobs: Preview only (if PDF available)
                        actionButtons = 
                            '<button class="job-action-btn preview" onclick="event.stopPropagation(); previewJob(&quot;' + jobId + '&quot;)" title="View PDF" disabled>' +
                                '👁️ View' +
                            '</button>';
                    }
                    
                    return '<div class="job-card" id="job-card-' + jobId + '">' +
                        '<div class="job-header" onclick="toggleJobDetails(&quot;' + jobId + '&quot;)">' +
                            '<div class="job-status-indicator ' + status + '"></div>' +
                            '<div class="job-info">' +
                                '<div class="job-title">' + escapeHtml(formName) + 
                                    (copiesDisplay ? ' <span class="job-copies-badge">' + copiesDisplay + '</span>' : '') +
                                '</div>' +
                                '<div class="job-details">' +
                                    '<strong>ID:</strong> ' + shortId + ' | ' +
                                    '<strong>Printer:</strong> ' + escapeHtml(printerName) + ' | ' +
                                    '<strong>Type:</strong> ' + escapeHtml(documentType) + ' |' +
                                    '<strong>Priority:</strong> ' + priority +
                                '</div>' +
                            '</div>' +
                            '<div class="job-timestamp">' +
                                formatJobTimestamp(timestamp) +
                            '</div>' +
                            '<div class="job-actions">' +
                                actionButtons +
                                '<button class="job-expand-btn" id="expand-btn-' + jobId + '">▼</button>' +
                            '</div>' +
                        '</div>' +
                        '<div class="job-details-panel" id="details-panel-' + jobId + '">' +
                            '<div class="job-detail-tabs">' +
                                '<button class="job-detail-tab active" onclick="switchJobDetailTab(&quot;' + jobId + '&quot;, &quot;info&quot;)">📋 Info</button>' +
                                '<button class="job-detail-tab" onclick="switchJobDetailTab(&quot;' + jobId + '&quot;, &quot;logs&quot;)">📝 Logs</button>' +
                                '<button class="job-detail-tab" onclick="switchJobDetailTab(&quot;' + jobId + '&quot;, &quot;data&quot;)">🔧 Data</button>' +
                                getTemplatePreviewTab(job, jobId) +
                            '</div>' +
                            '<div class="job-detail-content active" id="job-info-' + jobId + '">' +
                                createJobInfoContent(job) +
                            '</div>' +
                            '<div class="job-detail-content" id="job-logs-' + jobId + '">' +
                                '<div class="job-log-viewer">' +
                                    '<div class="log-entry">Loading job logs...</div>' +
                                '</div>' +
                            '</div>' +
                            '<div class="job-detail-content" id="job-data-' + jobId + '">' +
                                createJobDataContent(job) +
                            '</div>' +
                            getTemplatePreviewContent(job, jobId) +
                        '</div>' +
                    '</div>';
                }
                
                function createJobInfoContent(job) {
                    const jobData = job.jobData || {};
                    const metadata = jobData.metadata || {};
                    
                    return '<div class="job-metadata-grid">' +
                        '<div class="job-metadata-item">' +
                            '<div class="job-metadata-label">Document Name</div>' +
                            '<div class="job-metadata-value">' + escapeHtml(job.formName || 'Unknown') + '</div>' +
                        '</div>' +
                        '<div class="job-metadata-item">' +
                            '<div class="job-metadata-label">Printer</div>' +
                            '<div class="job-metadata-value">' + escapeHtml(job.printerName || job.printerId || 'Unknown') + '</div>' +
                        '</div>' +
                        '<div class="job-metadata-item">' +
                            '<div class="job-metadata-label">Status</div>' +
                            '<div class="job-metadata-value">' + escapeHtml(job.status || 'Unknown') + '</div>' +
                        '</div>' +
                        '<div class="job-metadata-item">' +
                            '<div class="job-metadata-label">Priority</div>' +
                            '<div class="job-metadata-value">' + escapeHtml(job.priority || 'normal') + '</div>' +
                        '</div>' +
                        '<div class="job-metadata-item">' +
                            '<div class="job-metadata-label">Document Type</div>' +
                            '<div class="job-metadata-value">' + escapeHtml(metadata.documentType || jobData.type || 'Unknown') + '</div>' +
                        '</div>' +
                        '<div class="job-metadata-item">' +
                            '<div class="job-metadata-label">Created At</div>' +
                            '<div class="job-metadata-value">' + formatJobTimestamp(job.createdAt || job.timestamp) + '</div>' +
                        '</div>' +
                    '</div>';
                }
                
                function createJobDataContent(job) {
                    return '<div class="job-data-viewer">' +
                        '<pre>' + escapeHtml(JSON.stringify(job, null, 2)) + '</pre>' +
                    '</div>';
                }
                
                function getTemplatePreviewTab(job, jobId) {
                    // Only show template preview for sticker jobs that have stickerInfo
                    const jobData = job.jobData || {};
                    const hasTemplateData = jobData.stickerInfo || jobData.labelInfo || job.formName === 'stickers';
                    
                    if (hasTemplateData) {
                        return '<button class="job-detail-tab" onclick="switchJobDetailTab(&quot;' + jobId + '&quot;, &quot;template&quot;)">🎨 Template</button>';
                    }
                    return '';
                }
                
                function getTemplatePreviewContent(job, jobId) {
                    // Only create content for jobs with template data
                    const jobData = job.jobData || {};
                    const hasTemplateData = jobData.stickerInfo || jobData.labelInfo || job.formName === 'stickers';
                    
                    if (hasTemplateData) {
                        return '<div class="job-detail-content" id="job-template-' + jobId + '">' +
                                   '<div class="template-preview-loading">Loading template preview...</div>' +
                               '</div>';
                    }
                    return '';
                }
                
                function loadTemplatePreviewForJob(jobId) {
                    // Find the job data
                    const jobCard = document.getElementById('job-card-' + jobId);
                    if (!jobCard) return;
                    
                    // Get job data from the jobs array (we'll need to store this globally)
                    fetch('/job-details/' + jobId)
                        .then(response => response.json())
                        .then(data => {
                            if (data.success && data.job) {
                                generateJobTemplatePreview(data.job, jobId);
                            } else {
                                const container = document.getElementById('job-template-' + jobId);
                                if (container) {
                                    container.innerHTML = '<div class="error-message">Failed to load job data for preview</div>';
                                }
                            }
                        })
                        .catch(error => {
                            console.error('Error loading job details:', error);
                            const container = document.getElementById('job-template-' + jobId);
                            if (container) {
                                container.innerHTML = '<div class="error-message">Error loading template preview</div>';
                            }
                        });
                }
                
                function generateJobTemplatePreview(job, jobId) {
                    console.log('🐛 RAW JOB DATA RECEIVED:', JSON.stringify(job, null, 2));
                    
                    const jobData = job.jobData || {};
                    const stickerInfo = jobData.stickerInfo || {};
                    const labelInfo = jobData.labelInfo || {};
                    const formName = job.formName || '';
                    
                    console.log('🔍 JOB DATA BREAKDOWN:', {
                        'job keys': Object.keys(job),
                        'job.formName': job.formName,
                        'job.jobData exists': !!job.jobData,
                        'jobData keys': Object.keys(jobData),
                        'jobData.labelInfo exists': !!jobData.labelInfo,
                        'labelInfo keys': labelInfo ? Object.keys(labelInfo) : 'none'
                    });
                    
                    // Smart template detection based on job structure and metadata
                    let templateName = null;
                    const documentType = jobData.metadata?.documentType || 'unknown';
                    const hasLabelInfo = !!(labelInfo && labelInfo.templateName);
                    const hasStickerInfo = !!(stickerInfo && Object.keys(stickerInfo).length > 0);
                    
                    console.log('🔍 Smart Template Detection:', {
                        jobId: jobId,
                        formName: formName,
                        documentType: documentType,
                        hasLabelInfo: hasLabelInfo,
                        hasStickerInfo: hasStickerInfo,
                        'labelInfo.templateName': labelInfo.templateName,
                        'jobData.filename': jobData.filename
                    });
                    
                    // Priority 1: Explicit template name from labelInfo (for label jobs)
                    if (hasLabelInfo && labelInfo.templateName) {
                        templateName = labelInfo.templateName;
                        console.log('✅ Using explicit labelInfo.templateName:', templateName);
                    }
                    // Priority 2: Extract from filename pattern (label-TemplateName-timestamp.pdf)
                    else if (jobData.filename && jobData.filename.includes('label-')) {
                        const match = jobData.filename.match(/label-(.+?)-\d+\.pdf$/);
                        if (match) {
                            templateName = match[1];
                            console.log('✅ Using filename pattern:', templateName);
                        }
                    }
                    // Priority 3: Determine from document type and data structure
                    else if (documentType === 'oil-change-sticker' || hasStickerInfo) {
                        templateName = 'Static Sticker';
                        console.log('✅ Using sticker template for oil-change-sticker type:', templateName);
                    }
                    // Priority 4: Form name detection
                    else if (formName.toLowerCase().includes('sticker')) {
                        templateName = 'Static Sticker';
                        console.log('✅ Using form name detection for stickers:', templateName);
                    }
                    // Priority 5: Form name for labels
                    else if (formName.toLowerCase().includes('label')) {
                        templateName = 'Generic Label';
                        console.log('✅ Using form name detection for labels:', templateName);
                    }
                    // Priority 6: Intelligent fallback based on available data
                    else {
                        if (hasStickerInfo) {
                            templateName = 'Static Sticker';
                            console.log('⚠️ Fallback to Static Sticker (has sticker data):', templateName);
                        } else if (hasLabelInfo) {
                            templateName = 'Generic Label';
                            console.log('⚠️ Fallback to Generic Label (has label data):', templateName);
                        } else {
                            templateName = 'Unknown Template';
                            console.log('⚠️ Fallback to Unknown Template (no specific data):', templateName);
                        }
                    }
                    
                    console.log('🏷️ Final template name:', templateName);
                    
                    // Find matching template
                    let template = null;
                    console.log('🔍 Searching for template:', templateName);
                    console.log('Available templates:', {
                        active: labelTemplates.active ? labelTemplates.active.map(t => t.labelName) : 'none',
                        archived: labelTemplates.archived ? labelTemplates.archived.map(t => t.labelName) : 'none'
                    });
                    
                    if (labelTemplates.active) {
                        template = labelTemplates.active.find(t => t.labelName === templateName);
                        if (template) console.log('✅ Found in active templates:', template.labelName);
                    }
                    if (!template && labelTemplates.archived) {
                        template = labelTemplates.archived.find(t => t.labelName === templateName);
                        if (template) console.log('✅ Found in archived templates:', template.labelName);
                    }
                    
                    const container = document.getElementById('job-template-' + jobId);
                    if (!container) return;
                    
                    if (!template) {
                        console.log('❌ Template not found:', templateName);
                        
                        // Show missing template handler with option to create
                        const missingTemplateHTML = generateMissingTemplateHandler(templateName, jobData, jobId);
                        container.innerHTML = missingTemplateHTML;
                        return;
                    }
                    
                    // Generate preview with job data applied
                    const previewHTML = generateJobTemplatePreviewHTML(template, jobData);
                    container.innerHTML = previewHTML;
                }
                
                function generateJobTemplatePreviewHTML(template, jobData) {
                    // Use same paper configurations as template preview
                    const paperSizes = {
                        'Brother-QL800': { width: 62, height: 29, name: 'Brother QL-800 (62 x 29 mm)' },
                        'Dymo-TwinTurbo': { width: 89, height: 36, name: 'Dymo Twin Turbo (89 x 36 mm)' },
                        '29mmx90mm': { width: 90, height: 29, name: 'Brother DK1201 (90 x 29 mm)' },
                        'Godex-200i': { width: 1.8125, height: 2.5, name: 'Godex 200i (1.8125 x 2.5 inch)' }
                    };
                    
                    const paperConfig = paperSizes[template.paperSize] || paperSizes['Brother-QL800'];
                    const canvasWidth = 400;
                    const canvasHeight = Math.round((paperConfig.height / paperConfig.width) * canvasWidth);
                    
                    // Extract job data for field mapping
                    const stickerInfo = jobData.stickerInfo || {};
                    const labelData = jobData.labelInfo?.labelData || {};
                    
                    console.log('🔍 Template Field Mapping Debug:', {
                        templateName: template.labelName,
                        templateFields: template.fields ? template.fields.map(f => f.name) : [],
                        stickerInfo: stickerInfo,
                        labelData: labelData,
                        hasVehicleDetails: !!stickerInfo.vehicleDetails
                    });
                    
                    // Dynamic field mapping based on job data structure
                    function createDynamicFieldMapping(stickerInfo, labelData) {
                        const fieldDataMap = {};
                        
                        // For sticker jobs: map template field names directly to stickerInfo properties
                        if (stickerInfo && Object.keys(stickerInfo).length > 0) {
                            // Direct mapping for sticker fields
                            fieldDataMap['companyName'] = stickerInfo.companyName;
                            fieldDataMap['mileage'] = stickerInfo.mileage;
                            fieldDataMap['nextServiceDate'] = stickerInfo.nextServiceDate;
                            fieldDataMap['oilType'] = stickerInfo.oilType;
                            fieldDataMap['vin'] = stickerInfo.vin;
                            fieldDataMap['vehicleDetails'] = formatVehicleDetails(stickerInfo.vehicleDetails);
                            
                            // Common variations for backward compatibility
                            fieldDataMap['Company Name'] = stickerInfo.companyName;
                            fieldDataMap['Mileage'] = stickerInfo.mileage;
                            fieldDataMap['Next Service Date'] = stickerInfo.nextServiceDate;
                            fieldDataMap['Next Service Due'] = stickerInfo.nextServiceDate;
                            fieldDataMap['Oil Type'] = stickerInfo.oilType;
                            fieldDataMap['VIN'] = stickerInfo.vin;
                            fieldDataMap['QR Code (VIN)'] = stickerInfo.vin;
                            fieldDataMap['Vehicle Details'] = formatVehicleDetails(stickerInfo.vehicleDetails);
                        }
                        
                        // For label jobs: map template field names directly to labelData keys
                        if (labelData && Object.keys(labelData).length > 0) {
                            Object.keys(labelData).forEach(key => {
                                fieldDataMap[key] = labelData[key];
                            });
                        }
                        
                        return fieldDataMap;
                    }
                    
                    const fieldDataMap = createDynamicFieldMapping(stickerInfo, labelData);
                    
                    console.log('📋 Field Data Map Created:', fieldDataMap);
                    
                    let html = '<div class="job-template-preview-container">';
                    
                    // Template info with job context
                    html += '<div class="preview-info">';
                    html += '<h4>Template Preview with Job Data</h4>';
                    html += '<div class="info-grid">';
                    html += '<div><strong>Template:</strong> ' + escapeHtml(template.labelName) + '</div>';
                    html += '<div><strong>Paper Size:</strong> ' + paperConfig.name + '</div>';
                    html += '<div><strong>Job ID:</strong> ' + escapeHtml(jobData.filename || 'Unknown') + '</div>';
                    html += '<div><strong>Job Type:</strong> ' + escapeHtml(jobData.metadata?.documentType || 'sticker') + '</div>';
                    html += '</div>';
                    html += '</div>';
                    
                    // Canvas preview with job data
                    html += '<div class="preview-canvas-container">';
                    html += '<h4>Preview with Actual Job Data</h4>';
                    html += '<div class="preview-canvas" style="width: ' + canvasWidth + 'px; height: ' + canvasHeight + 'px; position: relative; border: 2px solid #007bff; background: white; margin: 20px auto;">';
                    
                    // Render fields with job data
                    if (template.fields && template.fields.length > 0) {
                        template.fields.forEach(function(field) {
                            const x = field.position.x || 0;
                            const y = field.position.y || 0;
                            const fontSize = field.fontSize || 12;
                            
                            // Get actual data for this field
                            let fieldValue = fieldDataMap[field.name] || field.value || field.name || 'N/A';
                            
                            console.log('🎯 Field Mapping:', {
                                fieldName: field.name,
                                mappedValue: fieldDataMap[field.name],
                                finalValue: fieldValue,
                                fieldType: field.fieldType
                            });
                            
                            if (field.fieldType === 'qrcode') {
                                // For QR codes, show the source data
                                const qrData = fieldDataMap[field.qrCodeSource || field.name] || 'No Data';
                                const qrSize = field.qrCodeSize || 40;
                                html += '<div style="position: absolute; left: ' + x + 'px; top: ' + y + 'px; width: ' + qrSize + 'px; height: ' + qrSize + 'px; background: #28a745; color: white; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: bold; border: 1px solid #ccc; flex-direction: column;">';
                                html += '<div>QR</div><div style="font-size: 6px;">' + escapeHtml(qrData.substring(0, 10)) + '</div>';
                                html += '</div>';
                            } else {
                                // Render text field with job data
                                html += '<div style="position: absolute; left: ' + x + 'px; top: ' + y + 'px; font-size: ' + fontSize + 'px; font-family: ' + (field.fontFamily || 'Arial') + '; color: ' + (field.color || '#000000') + '; text-align: ' + (field.textAlign || 'left') + '; border: 1px solid #007bff; padding: 2px 4px; background: rgba(40, 167, 69, 0.1);">';
                                html += escapeHtml(fieldValue);
                                html += '</div>';
                            }
                        });
                    } else {
                        html += '<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #666; text-align: center;">No fields defined</div>';
                    }
                    
                    html += '</div>';
                    html += '</div>';
                    
                    // Job data mapping table
                    html += '<div class="preview-fields-list">';
                    html += '<h4>Field Data Mapping</h4>';
                    html += '<div class="fields-table">';
                    html += '<div class="field-header"><span>Field Name</span><span>Template Value</span><span>Job Data Value</span></div>';
                    
                    if (template.fields) {
                        template.fields.forEach(function(field) {
                            const jobValue = fieldDataMap[field.name] || 'N/A';
                            html += '<div class="field-row">';
                            html += '<span>' + escapeHtml(field.name || 'Unnamed') + '</span>';
                            html += '<span>' + escapeHtml(field.value || field.name || 'Default') + '</span>';
                            html += '<span style="font-weight: bold; color: #007bff;">' + escapeHtml(jobValue) + '</span>';
                            html += '</div>';
                        });
                    }
                    
                    html += '</div>';
                    html += '</div>';
                    
                    html += '</div>';
                    return html;
                }
                
                function generateMissingTemplateHandler(templateName, jobData, jobId) {
                    const stickerInfo = jobData.stickerInfo || {};
                    const labelData = jobData.labelInfo?.labelData || {};
                    const documentType = jobData.metadata?.documentType || 'unknown';
                    
                    let html = '<div class="missing-template-handler" style="padding: 20px; border: 2px dashed #ffc107; border-radius: 8px; background: #fff3cd; color: #856404; margin: 10px 0;">';
                    
                    // Header
                    html += '<div class="missing-template-header" style="margin-bottom: 15px;">';
                    html += '<h4 style="color: #856404; margin: 0 0 10px 0;">🏷️ Template Not Found</h4>';
                    html += '<p style="margin: 0; font-size: 14px;">No template found with name: <strong>"' + escapeHtml(templateName) + '"</strong></p>';
                    html += '</div>';
                    
                    // Available data preview
                    html += '<div class="available-data-section" style="margin-bottom: 20px;">';
                    html += '<h5 style="color: #495057; margin: 0 0 10px 0;">📋 Available Data Fields</h5>';
                    html += '<div class="data-preview" style="background: white; border-radius: 4px; padding: 15px; border: 1px solid #dee2e6;">';
                    
                    if (Object.keys(stickerInfo).length > 0) {
                        html += '<div class="data-group">';
                        html += '<h6>Sticker Data:</h6>';
                        html += '<ul>';
                        Object.keys(stickerInfo).forEach(key => {
                            if (key !== 'vehicleDetails') {
                                html += '<li><code>' + escapeHtml(key) + '</code>: ' + escapeHtml(String(stickerInfo[key])) + '</li>';
                            }
                        });
                        if (stickerInfo.vehicleDetails) {
                            html += '<li><code>vehicleDetails</code>: Vehicle information available</li>';
                        }
                        html += '</ul>';
                        html += '</div>';
                    }
                    
                    if (Object.keys(labelData).length > 0) {
                        html += '<div class="data-group">';
                        html += '<h6>Label Data:</h6>';
                        html += '<ul>';
                        Object.keys(labelData).forEach(key => {
                            html += '<li><code>' + escapeHtml(key) + '</code>: ' + escapeHtml(String(labelData[key])) + '</li>';
                        });
                        html += '</ul>';
                        html += '</div>';
                    }
                    
                    html += '</div>';
                    html += '</div>';
                    
                    // Action buttons
                    html += '<div class="template-actions" style="margin-bottom: 20px;">';
                    html += '<h5 style="color: #495057; margin: 0 0 15px 0;">🛠️ What would you like to do?</h5>';
                    
                    html += '<button class="btn btn-primary" onclick="createNewTemplate(&quot;' + escapeHtml(templateName) + '&quot;, &quot;' + jobId + '&quot;)" style="margin: 5px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">';
                    html += '🎨 Create New Template "' + escapeHtml(templateName) + '"';
                    html += '</button>';
                    
                    html += '<button class="btn btn-secondary" onclick="mapToExistingTemplate(&quot;' + jobId + '&quot;)" style="margin: 5px; padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">';
                    html += '🔗 Map to Existing Template';
                    html += '</button>';
                    
                    html += '<button class="btn btn-warning" onclick="useGenericPrint(&quot;' + jobId + '&quot;)" style="margin: 5px; padding: 8px 16px; background: #ffc107; color: #212529; border: none; border-radius: 4px; cursor: pointer;">';
                    html += '📄 Print Without Template';
                    html += '</button>';
                    
                    html += '</div>';
                    
                    // Instructions
                    html += '<div class="template-instructions" style="background: #f8f9fa; border-radius: 4px; padding: 15px; border-left: 4px solid #007bff;">';
                    html += '<h6 style="color: #495057; margin: 0 0 10px 0;">💡 Template Creation Tips:</h6>';
                    html += '<ul style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.4;">';
                    html += '<li>Field names in your template should match the data field names above</li>';
                    html += '<li>For example, use field name <code style="background: #e9ecef; padding: 2px 4px; border-radius: 3px; font-family: monospace;">"companyName"</code> to display company name</li>';
                    html += '<li>The template will be saved with name "' + escapeHtml(templateName) + '" for future use</li>';
                    html += '</ul>';
                    html += '</div>';
                    
                    html += '</div>';
                    
                    return html;
                }
                
                // Action handlers for missing template
                function createNewTemplate(templateName, jobId) {
                    console.log('🎨 Creating new template:', templateName, 'for job:', jobId);
                    
                    // Fetch job data from the API
                    fetch('/job-details/' + jobId)
                        .then(response => response.json())
                        .then(data => {
                            if (!data.success || !data.job) {
                                alert('Failed to load job data');
                                return;
                            }
                            
                            const job = data.job;
                            const stickerInfo = job.jobData?.stickerInfo || {};
                            const labelData = job.jobData?.labelInfo?.labelData || {};
                            
                            // Prepare field suggestions based on available data
                            const suggestedFields = [];
                            
                            if (Object.keys(stickerInfo).length > 0) {
                                Object.keys(stickerInfo).forEach(key => {
                                    if (key !== 'vehicleDetails' && stickerInfo[key] !== null && stickerInfo[key] !== undefined) {
                                        suggestedFields.push({
                                            name: key,
                                            value: String(stickerInfo[key]),
                                            type: 'text'
                                        });
                                    }
                                });
                                
                                // Add VIN as QR code if available
                                if (stickerInfo.vin) {
                                    suggestedFields.push({
                                        name: 'QR Code (VIN)',
                                        value: 'QR: {vin}',
                                        type: 'qrcode',
                                        qrCodeSource: 'vin'
                                    });
                                }
                            }
                            
                            if (Object.keys(labelData).length > 0) {
                                Object.keys(labelData).forEach(key => {
                                    if (labelData[key] !== null && labelData[key] !== undefined) {
                                        suggestedFields.push({
                                            name: key,
                                            value: String(labelData[key]),
                                            type: 'text'
                                        });
                                    }
                                });
                            }
                            
                            console.log('📋 Suggested fields for template:', suggestedFields);
                            
                            // Get cloud server URL for label manager
                            fetch('/get-config')
                                .then(response => response.json())
                                .then(configData => {
                                    const cloudServerUrl = configData.PRINT_SERVER || window.location.origin;
                                    
                                    // Build URL to cloud app's label manager
                                    const labelManagerUrl = new URL('/label-manager', cloudServerUrl);
                                    labelManagerUrl.searchParams.append('create', 'true');
                                    labelManagerUrl.searchParams.append('templateName', templateName);
                                    labelManagerUrl.searchParams.append('jobId', jobId);
                                    labelManagerUrl.searchParams.append('suggestedFields', JSON.stringify(suggestedFields));
                                    
                                    console.log('🌐 Opening cloud app label manager:', labelManagerUrl.toString());
                                    
                                    // Open cloud app label manager in new tab
                                    window.open(labelManagerUrl.toString(), '_blank');
                                })
                                .catch(error => {
                                    console.error('Error getting cloud server config:', error);
                                    // Fallback: try to open label manager on same domain
                                    const fallbackUrl = window.location.origin + '/label-manager?create=true&templateName=' + encodeURIComponent(templateName);
                                    console.log('🔄 Fallback: trying local label manager:', fallbackUrl);
                                    window.open(fallbackUrl, '_blank');
                                });
                        })
                        .catch(error => {
                            console.error('Error fetching job data:', error);
                            alert('Failed to load job data: ' + error.message);
                        });
                }
                
                function mapToExistingTemplate(jobId) {
                    console.log('🔗 Mapping job to existing template:', jobId);
                    
                    // Show available templates
                    if (!labelTemplates.active || labelTemplates.active.length === 0) {
                        alert('No templates available. Please create one first.');
                        return;
                    }
                    
                    const selectedTemplate = prompt(
                        'Select an existing template to use for this job:\\n\\n' +
                        'Available templates:\\n' +
                        labelTemplates.active.map(t => '- ' + t.labelName).join('\\n') + '\\n\\n' +
                        'Enter template name:'
                    );
                    
                    if (selectedTemplate && selectedTemplate.trim()) {
                        // Fetch job data and refresh preview with selected template
                        fetch('/job-details/' + jobId)
                            .then(response => response.json())
                            .then(data => {
                                if (data.success && data.job) {
                                    console.log('Mapping template "' + selectedTemplate + '" to job type');
                                    
                                    // Store the template mapping preference (could be saved to server later)
                                    console.log('Template mapping updated for job:', jobId);
                                    
                                    // Refresh the template preview (this will find the selected template)
                                    generateJobTemplatePreview(data.job, jobId);
                                } else {
                                    alert('Failed to load job data for template mapping');
                                }
                            })
                            .catch(error => {
                                console.error('Error mapping template:', error);
                                alert('Failed to map template: ' + error.message);
                            });
                    }
                }
                
                function useGenericPrint(jobId) {
                    console.log('📄 Using generic print for job:', jobId);
                    
                    if (confirm('Print this job without template formatting?\\n\\nThis will use the original PDF as-is.')) {
                        // Trigger the standard approve print
                        approveJob(jobId);
                    }
                }
                
                function formatVehicleDetails(vehicleDetails) {
                    if (!vehicleDetails || typeof vehicleDetails !== 'object') return '';
                    
                    const year = vehicleDetails.year || '';
                    const make = vehicleDetails.make || '';
                    const model = vehicleDetails.model || '';
                    const engineL = vehicleDetails.engineL || '';
                    const engineCylinders = vehicleDetails.engineCylinders || '';
                    
                    let parts = [];
                    if (year) parts.push(year);
                    if (make) parts.push(make);
                    if (model) parts.push(model);
                    if (engineL) {
                        let enginePart = engineL + 'L';
                        if (engineCylinders) enginePart += ' ' + engineCylinders + ' cyl';
                        parts.push(enginePart);
                    }
                    
                    return parts.join(' ');
                }
                
                function toggleJobDetails(jobId) {
                    const panel = document.getElementById('details-panel-' + jobId);
                    const button = document.getElementById('expand-btn-' + jobId);
                    
                    if (!panel || !button) return;
                    
                    const isExpanded = panel.classList.contains('expanded');
                    
                    if (isExpanded) {
                        panel.classList.remove('expanded');
                        button.classList.remove('expanded');
                        button.textContent = '▼';
                        expandedJobs.delete(jobId); // Remove from expanded set
                    } else {
                        panel.classList.add('expanded');
                        button.classList.add('expanded');
                        button.textContent = '▲';
                        expandedJobs.add(jobId); // Add to expanded set
                        
                        // Load job logs when first expanded
                        loadJobLogs(jobId);
                    }
                }
                
                function switchJobDetailTab(jobId, tabType, skipTracking = false) {
                    // Update tab buttons
                    const tabButtons = document.querySelectorAll('#details-panel-' + jobId + ' .job-detail-tab');
                    tabButtons.forEach(function(btn) { btn.classList.remove('active'); });
                    
                    // Find and activate the correct tab button
                    const targetButton = document.querySelector('#details-panel-' + jobId + ' .job-detail-tab[onclick*="' + tabType + '"]');
                    if (targetButton) {
                        targetButton.classList.add('active');
                    }
                    
                    // Update content panels
                    const contentPanels = document.querySelectorAll('#details-panel-' + jobId + ' .job-detail-content');
                    contentPanels.forEach(function(panel) { panel.classList.remove('active'); });
                    const targetPanel = document.getElementById('job-' + tabType + '-' + jobId);
                    if (targetPanel) {
                        targetPanel.classList.add('active');
                    }
                    
                    // Track the active tab state (unless we're restoring from saved state)
                    if (!skipTracking) {
                        jobActiveTabs.set(jobId, tabType);
                    }
                    
                    // Load specific content if needed
                    if (tabType === 'logs') {
                        loadJobLogs(jobId);
                    } else if (tabType === 'template') {
                        loadTemplatePreviewForJob(jobId);
                    }
                }
                
                function loadJobLogs(jobId) {
                    const logContainer = document.getElementById('job-logs-' + jobId);
                    if (!logContainer) return;
                    
                    // Check if logs are already loaded
                    const logViewer = logContainer.querySelector('.job-log-viewer');
                    if (logViewer && !logViewer.textContent.includes('Loading')) {
                        return; // Already loaded
                    }
                    
                    fetch('/job-details/' + jobId)
                        .then(response => response.json())
                        .then(data => {
                            if (data.success && data.job) {
                                displayJobLogs(jobId, data.job);
                            } else {
                                logViewer.innerHTML = '<div class="job-log-entry error">Failed to load job logs</div>';
                            }
                        })
                        .catch(error => {
                            console.error('Error loading job logs:', error);
                            logViewer.innerHTML = '<div class="job-log-entry error">Error loading job logs</div>';
                        });
                }
                
                function displayJobLogs(jobId, jobData) {
                    const logContainer = document.querySelector('#job-logs-' + jobId + ' .job-log-viewer');
                    if (!logContainer) return;
                    
                    // Generate log entries based on job data
                    let logEntries = [];
                    
                    // Add creation log
                    if (jobData.createdAt || jobData.timestamp) {
                        logEntries.push({
                            timestamp: jobData.createdAt || jobData.timestamp,
                            message: `Job created: ${jobData.formName || jobData.form_name || 'Unknown document'}`,
                            type: 'info'
                        });
                    }
                    
                    // Add status-based logs
                    if (jobData.status) {
                        const statusMessages = {
                            'pending': 'Job is pending approval',
                            'claimed': 'Job has been claimed by print client',
                            'printing': 'Job is currently printing',
                            'completed': 'Job completed successfully',
                            'failed': 'Job failed to print'
                        };
                        
                        const message = statusMessages[jobData.status] || `Status: ${jobData.status}`;
                        const type = jobData.status === 'failed' ? 'error' : 
                                    jobData.status === 'completed' ? 'success' : 'info';
                        
                        logEntries.push({
                            timestamp: new Date().toISOString(),
                            message: message,
                            type: type
                        });
                    }
                    
                    // Add completion log if available
                    if (jobData.completedAt) {
                        logEntries.push({
                            timestamp: jobData.completedAt,
                            message: 'Job marked as completed',
                            type: 'success'
                        });
                    }
                    
                    // Sort by timestamp
                    logEntries.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                    
                    if (logEntries.length === 0) {
                        logContainer.innerHTML = '<div class="job-log-entry">No logs available for this job</div>';
                        return;
                    }
                    
                    let html = '';
                    logEntries.forEach(entry => {
                        html += `
                            <div class="job-log-entry ${entry.type}">
                                [${formatTimestamp(entry.timestamp)}] ${escapeHtml(entry.message)}
                            </div>
                        `;
                    });
                    
                    logContainer.innerHTML = html;
                }
                
                function formatJobTimestamp(timestamp) {
                    if (!timestamp) return 'Unknown';
                    
                    try {
                        const date = new Date(timestamp);
                        return date.toLocaleString();
                    } catch (e) {
                        return timestamp;
                    }
                }
                
                function loadPreviewQueue() {
                    fetch('/preview-queue')
                        .then(response => response.json())
                        .then(data => {
                            const previewQueueDiv = document.getElementById('preview-queue');
                            if (!previewQueueDiv) {
                                console.error('Preview queue element not found');
                                return;
                            }
                            
                            if (data.length === 0) {
                                previewQueueDiv.innerHTML = `
                                    <div style="background: #f8f9fa; padding: 30px; border-radius: 8px; text-align: center; border: 2px dashed #6c757d;">
                                        <strong>📭 No PDFs awaiting preview</strong><br>
                                        PDF documents will appear here when they need approval before printing.
                                    </div>
                                `;
                                return;
                            }
                            
                            let html = '<div style="display: grid; gap: 20px;">';
                            data.forEach(item => {
                                const timestamp = new Date(item.timestamp).toLocaleString();
                                html += `
                                    <div style="background: #ffffff; border: 2px solid #007bff; border-radius: 12px; padding: 20px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                                        <div style="display: grid; grid-template-columns: 1fr auto; gap: 20px; align-items: center;">
                                            <div>
                                                <h4 style="margin: 0 0 12px 0; color: #007bff; font-size: 1.2em;">📄 ${item.filename}</h4>
                                                <div style="font-size: 0.95em; color: #666; line-height: 1.6;">
                                                    <strong>🕒 Received:</strong> ${timestamp}<br>
                                                    <strong>📁 Type:</strong> ${item.document_type}<br>
                                                    <strong>📍 Source:</strong> ${item.source}
                                                </div>
                                            </div>
                                            <div style="display: flex; flex-direction: column; gap: 10px; min-width: 140px;">
                                                <button onclick="previewPDF('${item.job_id}')" class="control-btn info" style="width: 100%;">
                                                    👁️ Preview
                                                </button>
                                                <button onclick="approvePrint('${item.job_id}')" class="control-btn success" style="width: 100%;">
                                                    ✅ Approve & Print
                                                </button>
                                                <button onclick="printWithTemplate('${item.job_id}')" class="control-btn warning" style="width: 100%;">
                                                    🏷️ Print with Template
                                                </button>
                                                <button onclick="rejectPrint('${item.job_id}')" class="control-btn danger" style="width: 100%;">
                                                    🚫 Reject
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                `;
                            });
                            html += '</div>';
                            previewQueueDiv.innerHTML = html;
                        })
                        .catch(error => {
                            console.error('Error loading preview queue:', error);
                            const previewQueueDiv = document.getElementById('preview-queue');
                            if (previewQueueDiv) {
                                previewQueueDiv.innerHTML = `
                                    <div style="background: #f8d7da; padding: 20px; border-radius: 8px; color: #721c24; border-left: 4px solid #dc3545;">
                                        <strong>❌ Error loading preview queue</strong><br>
                                        ${error.message}
                                    </div>
                                `;
                            }
                        });
                }
                
                // Function to preview PDF in new window
                function previewPDF(jobId) {
                    window.open('/preview/' + jobId, '_blank', 'width=900,height=700,scrollbars=yes,resizable=yes');
                }
                
                // Function to approve and print
                function approvePrint(jobId) {
                    if (confirm('Are you sure you want to approve and print this document?')) {
                        fetch('/approve/' + jobId, { method: 'POST' })
                            .then(response => response.json())
                            .then(data => {
                                if (data.success) {
                                    alert('✅ Document approved and sent to printer!');
                                    loadPreviewQueue(); // Refresh the queue
                                } else {
                                    alert('❌ Print failed: ' + data.message);
                                }
                            })
                            .catch(error => {
                                console.error('Approve error:', error);
                                alert('❌ Error approving document: ' + error.message);
                            });
                    }
                }
                
                // Function to print with template coordinates
                function printWithTemplate(jobId) {
                    if (confirm('Print using label template coordinates and settings?\\n\\nThis will use the template coordinates from the label manager to position content according to the label type.')) {
                        fetch('/print-with-template/' + jobId, { method: 'POST' })
                            .then(response => response.json())
                            .then(data => {
                                if (data.success) {
                                    const templateMsg = data.template_used ? `\\nTemplate: ${data.template_used}` : '';
                                    const coordMsg = data.coordinates_applied ? `\\nCoordinates applied: ${data.coordinates_applied}` : '';
                                    alert('🏷️ Document printed with template!' + templateMsg + coordMsg);
                                    loadPreviewQueue(); // Refresh the queue
                                } else {
                                    alert('❌ Template print failed: ' + data.error);
                                }
                            })
                            .catch(error => {
                                console.error('Template print error:', error);
                                alert('❌ Error printing with template: ' + error.message);
                            });
                    }
                }
                
                // Function to reject print job
                function rejectPrint(jobId) {
                    if (confirm('Are you sure you want to reject this document?')) {
                        fetch('/reject/' + jobId, { method: 'POST' })
                            .then(response => response.json())
                            .then(data => {
                                if (data.success) {
                                    alert('🚫 Document rejected successfully');
                                    loadPreviewQueue(); // Refresh the queue
                                } else {
                                    alert('❌ Reject failed: ' + data.message);
                                }
                            })
                            .catch(error => {
                                console.error('Reject error:', error);
                                alert('❌ Error rejecting document: ' + error.message);
                            });
                    }
                }
                

                
                // Initialize dashboard 
                function initializeDashboard() {
                    console.log('🚀 Dashboard initializing...');
                }
                
                // Initialize dashboard after page loads
                window.addEventListener('load', function() {
                    initializeDashboard();
                });
                

                
                // Auto-refresh every 5 seconds
                setInterval(function() {
                    if (activeTab === 'overview') {
                        location.reload();
                    } else if (activeTab === 'preview') {
                        loadPreviewQueue();
                    } else if (activeTab === 'jobs') {
                        refreshJobsData();
                    }
                }, 5000);
                
                // Job Action Functions
                function previewJob(jobId) {
                    console.log('Opening preview for job:', jobId);
                    window.open('/preview/' + jobId, '_blank', 'width=900,height=700,scrollbars=yes,resizable=yes');
                }
                
                function approveJob(jobId) {
                    if (confirm('Are you sure you want to approve and print this job?')) {
                        // Disable the button to prevent double-clicks
                        const approveBtn = document.querySelector('[onclick*="approveJob(&quot;' + jobId + '&quot;)"]');
                        if (approveBtn) {
                            approveBtn.disabled = true;
                            approveBtn.textContent = 'Approving...';
                        }
                        
                        fetch('/approve/' + jobId, { 
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        })
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                alert('✅ Job approved and sent to printer successfully!');
                                // Remove job from expanded set since it will move to completed
                                expandedJobs.delete(jobId);
                                // Clean up tab state
                                jobActiveTabs.delete(jobId);
                                // Refresh jobs to show updated status
                                refreshJobsData();
                            } else {
                                alert('❌ Failed to approve job: ' + (data.error || data.message));
                                // Re-enable button on failure
                                if (approveBtn) {
                                    approveBtn.disabled = false;
                                    approveBtn.textContent = '✅ Approve';
                                }
                            }
                        })
                        .catch(error => {
                            console.error('Error approving job:', error);
                            alert('❌ Error approving job: ' + error.message);
                            // Re-enable button on error
                            if (approveBtn) {
                                approveBtn.disabled = false;
                                approveBtn.textContent = '✅ Approve';
                            }
                        });
                    }
                }
                
                function cancelJob(jobId) {
                    if (confirm('Are you sure you want to cancel this job?')) {
                        // Disable the button to prevent double-clicks
                        const cancelBtn = document.querySelector('[onclick*="cancelJob(&quot;' + jobId + '&quot;)"]');
                        if (cancelBtn) {
                            cancelBtn.disabled = true;
                            cancelBtn.textContent = 'Cancelling...';
                        }
                        
                        fetch('/cancel', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded'
                            },
                            body: 'job_id=' + encodeURIComponent(jobId)
                        })
                        .then(response => {
                            if (response.ok) {
                                alert('🚫 Job cancelled successfully!');
                                // Remove job from expanded set since it's cancelled
                                expandedJobs.delete(jobId);
                                // Clean up tab state
                                jobActiveTabs.delete(jobId);
                                // Refresh jobs to show updated status
                                refreshJobsData();
                            } else {
                                alert('❌ Failed to cancel job');
                                // Re-enable button on failure
                                if (cancelBtn) {
                                    cancelBtn.disabled = false;
                                    cancelBtn.textContent = '🚫 Cancel';
                                }
                            }
                        })
                        .catch(error => {
                            console.error('Error cancelling job:', error);
                            alert('❌ Error cancelling job: ' + error.message);
                            // Re-enable button on error
                            if (cancelBtn) {
                                cancelBtn.disabled = false;
                                cancelBtn.textContent = '🚫 Cancel';
                            }
                        });
                    }
                }

                // Printer Settings Functions
                function loadPrinterSettings() {
                    fetch('/printer-settings')
                        .then(response => response.json())
                        .then(data => {
                            const settingsList = document.getElementById('printer-settings-list');
                            
                            if (!data.success || !data.available_printers || Object.keys(data.available_printers).length === 0) {
                                settingsList.innerHTML = `
                                    <div style="background: #f8f9fa; padding: 30px; border-radius: 8px; text-align: center; border: 2px dashed #6c757d;">
                                        <strong>🖨️ No printers available</strong><br>
                                        Make sure printers are registered and the print server is running.
                                    </div>
                                `;
                                return;
                            }
                            
                            let html = '<div style="display: grid; gap: 20px;">';
                            
                            Object.entries(data.available_printers).forEach(([printerId, printerName]) => {
                                const settings = data.settings[printerId] || {};
                                const paperSize = settings.paper_size || 'Letter';
                                const orientation = settings.orientation || 'portrait';
                                
                                html += `
                                    <div style="background: #ffffff; border: 1px solid #ddd; border-radius: 12px; padding: 20px;">
                                        <h4 style="margin: 0 0 15px 0; color: #007bff;">🖨️ ${printerName}</h4>
                                        <div style="display: grid; grid-template-columns: 1fr 1fr auto; gap: 15px; align-items: center;">
                                            <div>
                                                <label style="font-size: 0.9em; color: #666; font-weight: bold;">Paper Size:</label><br>
                                                <select id="paper-${printerId}" onchange="toggleCustomPaper('${printerId}')" style="padding: 8px; border-radius: 6px; border: 1px solid #ccc; width: 100%;">
                                                     <option value="Letter" ${paperSize === 'Letter' ? 'selected' : ''}>Letter (8.5" × 11")</option>
                                                     <option value="A4" ${paperSize === 'A4' ? 'selected' : ''}>A4 (210mm × 297mm)</option>
                                                     <option value="Legal" ${paperSize === 'Legal' ? 'selected' : ''}>Legal (8.5" × 14")</option>
                                                     <option value="A3" ${paperSize === 'A3' ? 'selected' : ''}>A3 (297mm × 420mm)</option>
                                                     <option value="A5" ${paperSize === 'A5' ? 'selected' : ''}>A5 (148mm × 210mm)</option>
                                                                                     <option value="custom-2.25x1.5" ${paperSize === 'custom-2.25x1.5' ? 'selected' : ''}>🏷️ Godex Label (2.25" × 1.5")</option>
                                <option value="custom-1.8125x2.5" ${paperSize === 'custom-1.8125x2.5' ? 'selected' : ''}>🏷️ Godex 200i (1.8125" × 2.5")</option>
                                <option value="custom-90x29mm" ${paperSize === 'custom-90x29mm' ? 'selected' : ''}>🏷️ Brother DK1201 (90mm × 29mm)</option>
                                <option value="custom" ${paperSize.startsWith('custom-') && paperSize !== 'custom-2.25x1.5' && paperSize !== 'custom-1.8125x2.5' && paperSize !== 'custom-90x29mm' ? 'selected' : ''}>🔧 Custom Size</option>
                                                 </select>
                                                 <div id="custom-paper-${printerId}" style="margin-top: 10px; ${paperSize.startsWith('custom-') ? '' : 'display: none;'}">
                                                     <div style="margin-bottom: 8px;">
                                                         <label style="font-size: 0.85em; color: #666; font-weight: bold;">Unit:</label>
                                                         <select id="unit-${printerId}" onchange="updateUnitPlaceholders('${printerId}')" style="padding: 4px; border-radius: 4px; border: 1px solid #ccc; margin-left: 8px;">
                                                             <option value="inches" ${(settings.unit || 'inches') === 'inches' ? 'selected' : ''}>Inches (")</option>
                                                             <option value="mm" ${(settings.unit || 'inches') === 'mm' ? 'selected' : ''}>Millimeters (mm)</option>
                                                         </select>
                                                     </div>
                                                     <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                                                         <input type="text" id="width-${printerId}" placeholder="Width" 
                                                                value="${paperSize.startsWith('custom-') ? settings.custom_width || '' : ''}"
                                                                style="padding: 6px; border: 1px solid #ccc; border-radius: 4px; font-size: 0.9em;">
                                                         <input type="text" id="height-${printerId}" placeholder="Height" 
                                                                value="${paperSize.startsWith('custom-') ? settings.custom_height || '' : ''}"
                                                                style="padding: 6px; border: 1px solid #ccc; border-radius: 4px; font-size: 0.9em;">
                                                     </div>
                                                     <div id="unit-hint-${printerId}" style="font-size: 0.8em; color: #666; margin-top: 4px;">
                                                         Enter dimensions in inches (e.g. 2.25 for 2-1/4")
                                                     </div>
                                                 </div>
                                            </div>
                                            <div>
                                                <label style="font-size: 0.9em; color: #666; font-weight: bold;">Orientation:</label><br>
                                                <select id="orientation-${printerId}" style="padding: 8px; border-radius: 6px; border: 1px solid #ccc; width: 100%;">
                                                    <option value="portrait" ${orientation === 'portrait' ? 'selected' : ''}>Portrait</option>
                                                    <option value="landscape" ${orientation === 'landscape' ? 'selected' : ''}>Landscape</option>
                                                </select>
                                            </div>
                                            <div>
                                                <button onclick="savePrinterSettings('${printerId}')" class="control-btn success" style="margin-right: 8px;">
                                                    💾 Save
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                `;
                                
                                // Initialize the custom paper toggle after HTML is added
                                setTimeout(function() {
                                    updateUnitPlaceholders(printerId);
                                }, 100);
                            });
                            
                            html += '</div>';
                            settingsList.innerHTML = html;
                        })
                        .catch(error => {
                            console.error('Error loading printer settings:', error);
                            document.getElementById('printer-settings-list').innerHTML = `
                                <div style="background: #f8d7da; padding: 20px; border-radius: 8px; color: #721c24;">
                                    <strong>❌ Error loading printer settings</strong><br>
                                    ${error.message}
                                </div>
                            `;
                        });
                }

                function updateUnitPlaceholders(printerId) {
                    const unitSelect = document.getElementById('unit-' + printerId);
                    const widthInput = document.getElementById('width-' + printerId);
                    const heightInput = document.getElementById('height-' + printerId);
                    const hintDiv = document.getElementById('unit-hint-' + printerId);
                    
                    if (unitSelect && unitSelect.value === 'mm') {
                        widthInput.placeholder = 'Width (e.g. 90)';
                        heightInput.placeholder = 'Height (e.g. 29)';
                        hintDiv.innerHTML = 'Enter dimensions in millimeters (e.g. 90 for 90mm)';
                    } else {
                        widthInput.placeholder = 'Width (e.g. 2.25)';
                        heightInput.placeholder = 'Height (e.g. 1.5)';
                        hintDiv.innerHTML = 'Enter dimensions in inches (e.g. 2.25 for 2-1/4")';
                    }
                }

                function toggleCustomPaper(printerId) {
                    const paperSelect = document.getElementById('paper-' + printerId);
                    const customDiv = document.getElementById('custom-paper-' + printerId);
                    const widthInput = document.getElementById('width-' + printerId);
                    const heightInput = document.getElementById('height-' + printerId);
                    const unitSelect = document.getElementById('unit-' + printerId);
                    
                    if (paperSelect.value === 'custom') {
                        customDiv.style.display = 'block';
                        // Clear existing values for new custom input
                        widthInput.value = '';
                        heightInput.value = '';
                        widthInput.readOnly = false;
                        heightInput.readOnly = false;
                        unitSelect.disabled = false;
                        updateUnitPlaceholders(printerId);
                    } else if (paperSelect.value === 'custom-2.25x1.5') {
                        customDiv.style.display = 'block';
                        // Pre-fill Godex label dimensions
                        widthInput.value = '2.25';
                        heightInput.value = '1.5';
                        widthInput.readOnly = true;
                        heightInput.readOnly = true;
                        unitSelect.value = 'inches';
                        unitSelect.disabled = true;
                        updateUnitPlaceholders(printerId);
                    } else if (paperSelect.value === 'custom-1.8125x2.5') {
                        customDiv.style.display = 'block';
                        // Pre-fill Godex 200i label dimensions
                        widthInput.value = '1.8125';
                        heightInput.value = '2.5';
                        widthInput.readOnly = true;
                        heightInput.readOnly = true;
                        unitSelect.value = 'inches';
                        unitSelect.disabled = true;
                        updateUnitPlaceholders(printerId);
                    } else if (paperSelect.value === 'custom-90x29mm') {
                        customDiv.style.display = 'block';
                        // Pre-fill Brother DK1201 dimensions
                        widthInput.value = '90';
                        heightInput.value = '29';
                        widthInput.readOnly = true;
                        heightInput.readOnly = true;
                        unitSelect.value = 'mm';
                        unitSelect.disabled = true;
                        updateUnitPlaceholders(printerId);
                    } else {
                        customDiv.style.display = 'none';
                        widthInput.readOnly = false;
                        heightInput.readOnly = false;
                        unitSelect.disabled = false;
                    }
                }

                function savePrinterSettings(printerId) {
                    const paperSelect = document.getElementById('paper-' + printerId);
                    const orientation = document.getElementById('orientation-' + printerId).value;
                    const unitSelect = document.getElementById('unit-' + printerId);
                    
                    let paperSize = paperSelect.value;
                    let customWidth = '';
                    let customHeight = '';
                    let unit = unitSelect ? unitSelect.value : 'inches';
                    
                    // Handle custom paper size
                                            if (paperSize === 'custom' || paperSize === 'custom-2.25x1.5' || paperSize === 'custom-1.8125x2.5' || paperSize === 'custom-90x29mm') {
                        customWidth = document.getElementById('width-' + printerId).value;
                        customHeight = document.getElementById('height-' + printerId).value;
                        
                        if (!customWidth || !customHeight) {
                            alert('❌ Please enter both width and height for custom paper size');
                            return;
                        }
                        
                        // Validate numeric input
                        if (isNaN(parseFloat(customWidth)) || isNaN(parseFloat(customHeight))) {
                            alert('❌ Please enter valid numbers for width and height');
                            return;
                        }
                        
                        // Keep the presets or create custom format
                        if (paperSize === 'custom-2.25x1.5') {
                            paperSize = 'custom-2.25x1.5';
                        } else if (paperSize === 'custom-1.8125x2.5') {
                            paperSize = 'custom-1.8125x2.5';
                            unit = 'inches';
                        } else if (paperSize === 'custom-90x29mm') {
                            paperSize = 'custom-90x29mm';
                            unit = 'mm';
                        } else {
                            paperSize = `custom-${customWidth}x${customHeight}${unit === 'mm' ? 'mm' : ''}`;
                        }
                    }
                    
                    fetch('/save-printer-settings', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            printer_id: printerId,
                            paper_size: paperSize,
                            orientation: orientation,
                            custom_width: customWidth,
                            custom_height: customHeight,
                            unit: unit
                        })
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            let displaySize;
                                                    if (paperSize === 'custom-2.25x1.5') {
                            displaySize = 'Godex Label (2.25" × 1.5")';
                        } else if (paperSize === 'custom-1.8125x2.5') {
                            displaySize = 'Godex 200i (1.8125" × 2.5")';
                        } else if (paperSize === 'custom-90x29mm') {
                                displaySize = 'Brother DK1201 (90mm × 29mm)';
                            } else if (paperSize.startsWith('custom-')) {
                                const unitSymbol = unit === 'mm' ? 'mm' : '"';
                                displaySize = 'Custom ' + customWidth + unitSymbol + ' × ' + customHeight + unitSymbol;
                            } else {
                                displaySize = paperSize;
                            }
                            alert('✅ Settings saved for printer: ' + displaySize + ' ' + orientation);
                            loadPrinterSettings(); // Refresh the display
                        } else {
                            alert('❌ Error: ' + data.message);
                        }
                    })
                    .catch(error => {
                        alert('Network error: ' + error.message);
                    });
                }

                function refreshPrinterSettings() {
                    loadPrinterSettings();
                }
                
                    
                    // Standard paper sizes (in mm)
                    'Letter': { name: 'Letter', width: 216, height: 279, unit: 'mm' },
                    'A4': { name: 'A4', width: 210, height: 297, unit: 'mm' },
                    'Legal': { name: 'Legal', width: 216, height: 356, unit: 'mm' },
                    'A3': { name: 'A3', width: 297, height: 420, unit: 'mm' },
                    'A5': { name: 'A5', width: 148, height: 210, unit: 'mm' },
                    

                

                

                

                

                

                

                

                

                

                

                

                

                

                

                

                

                

                

                

                

                

            </script>
            

                    align-items: flex-start;
                    margin-bottom: 15px;
                }
                

                
                .empty-state, .error-state {
                    text-align: center;
                    padding: 60px 20px;
                    color: #6c757d;
                }
                
                .empty-icon, .error-icon {
                    font-size: 4em;
                    margin-bottom: 20px;
                }
                
                .empty-title, .error-title {
                    font-size: 1.5em;
                    font-weight: 600;
                    margin-bottom: 10px;
                    color: #495057;
                }
                
                .empty-description, .error-description {
                    font-size: 1em;
                    margin-bottom: 20px;
                    line-height: 1.5;
                }
                
                .loading-message {
                    text-align: center;
                    padding: 40px;
                    color: #6c757d;
                    font-style: italic;
                }
                
                .import-dropdown {
                    position: absolute;
                    top: 100%;
                    right: 0;
                    background: white;
                    border: 1px solid #dee2e6;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    z-index: 1000;
                    min-width: 180px;
                }
                
                .import-dropdown button {
                    display: block;
                    width: 100%;
                    padding: 12px 16px;
                    border: none;
                    background: none;
                    text-align: left;
                    cursor: pointer;
                    transition: background-color 0.2s;
                }
                
                .import-dropdown button:hover {
                    background: #f8f9fa;
                }
                
                .import-dropdown button:first-child {
                    border-radius: 8px 8px 0 0;
                }
                
                .import-dropdown button:last-child {
                    border-radius: 0 0 8px 8px;
                }
                
                /* Create Template Modal Styles */
                .modal {
                    position: fixed;
                    z-index: 2000;
                    left: 0;
                    top: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0,0,0,0.5);
                    backdrop-filter: blur(2px);
                }
                
                .modal-content {
                    position: relative;
                    background-color: white;
                    margin: 50px auto;
                    padding: 0;
                    border: none;
                    border-radius: 12px;
                    width: 90%;
                    max-width: 800px;
                    max-height: 90vh;
                    overflow-y: auto;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                    animation: modalSlideIn 0.3s ease-out;
                }
                
                @keyframes modalSlideIn {
                    from { opacity: 0; transform: translateY(-30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                .modal-header {
                    padding: 20px 25px;
                    background: linear-gradient(135deg, #007bff, #0056b3);
                    color: white;
                    border-radius: 12px 12px 0 0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .modal-header h3 {
                    margin: 0;
                    font-size: 1.4em;
                    font-weight: 600;
                }
                
                .close {
                    color: white;
                    font-size: 28px;
                    font-weight: bold;
                    cursor: pointer;
                    line-height: 1;
                    opacity: 0.8;
                    transition: opacity 0.2s;
                }
                
                .close:hover {
                    opacity: 1;
                }
                
                .modal-body {
                    padding: 25px;
                }
                
                .form-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                    align-items: start;
                }
                
                .form-group {
                    display: flex;
                    flex-direction: column;
                }
                
                .form-group.full-width {
                    grid-column: 1 / -1;
                }
                
                .form-group label {
                    font-weight: 600;
                    margin-bottom: 8px;
                    color: #333;
                    font-size: 0.95em;
                }
                
                .form-group input,
                .form-group select,
                .form-group textarea {
                    padding: 12px;
                    border: 2px solid #e0e0e0;
                    border-radius: 8px;
                    font-size: 14px;
                    transition: border-color 0.2s, box-shadow 0.2s;
                    background: white;
                }
                
                .form-group input:focus,
                .form-group select:focus,
                .form-group textarea:focus {
                    outline: none;
                    border-color: #007bff;
                    box-shadow: 0 0 0 3px rgba(0,123,255,0.1);
                }
                
                .form-group textarea {
                    resize: vertical;
                    min-height: 80px;
                }
                
                .field-item {
                    display: flex;
                    gap: 10px;
                    align-items: center;
                    margin-bottom: 12px;
                    padding: 12px;
                    background: #f8f9fa;
                    border-radius: 8px;
                    border: 1px solid #e9ecef;
                }
                
                .field-item input {
                    flex: 2;
                    margin: 0;
                }
                
                .field-item select {
                    flex: 1;
                    margin: 0;
                }
                
                .remove-field-btn {
                    background: #dc3545;
                    color: white;
                    border: none;
                    border-radius: 50%;
                    width: 32px;
                    height: 32px;
                    cursor: pointer;
                    font-size: 16px;
                    font-weight: bold;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: background-color 0.2s;
                }
                
                .remove-field-btn:hover {
                    background: #c82333;
                }
                
                .add-field-btn {
                    background: #28a745;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    padding: 10px 16px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    transition: background-color 0.2s;
                    margin-top: 10px;
                }
                
                .add-field-btn:hover {
                    background: #218838;
                }
                
                .modal-footer {
                    padding: 20px 25px;
                    background: #f8f9fa;
                    border-radius: 0 0 12px 12px;
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                    border-top: 1px solid #e9ecef;
                }
                
                .control-btn.secondary {
                    background: #6c757d;
                    color: white;
                }
                
                .control-btn.secondary:hover {
                    background: #5a6268;
                }
                
                /* Template Preview Modal Styles */
                .template-preview-container {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }
                
                .preview-info {
                    background: #f8f9fa;
                    padding: 15px;
                    border-radius: 8px;
                    border: 1px solid #e9ecef;
                }
                
                .preview-info h4 {
                    margin: 0 0 10px 0;
                    color: #495057;
                    font-size: 16px;
                }
                
                .info-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 8px;
                    font-size: 14px;
                }
                
                .info-grid div {
                    padding: 4px 0;
                }
                
                .preview-canvas-container {
                    text-align: center;
                }
                
                .preview-canvas-container h4 {
                    margin: 0 0 10px 0;
                    color: #495057;
                    font-size: 16px;
                }
                
                .preview-canvas {
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    border-radius: 4px;
                }
                
                .preview-fields-list {
                    background: #f8f9fa;
                    padding: 15px;
                    border-radius: 8px;
                    border: 1px solid #e9ecef;
                }
                
                .preview-fields-list h4 {
                    margin: 0 0 15px 0;
                    color: #495057;
                    font-size: 16px;
                }
                
                .fields-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                
                .field-header {
                    display: grid;
                    grid-template-columns: 2fr 1fr 1fr 1fr;
                    gap: 10px;
                    background: #e9ecef;
                    padding: 8px 12px;
                    font-weight: bold;
                    border-radius: 4px 4px 0 0;
                    font-size: 14px;
                }
                
                .field-row {
                    display: grid;
                    grid-template-columns: 2fr 1fr 1fr 1fr;
                    gap: 10px;
                    padding: 8px 12px;
                    border-bottom: 1px solid #dee2e6;
                    font-size: 13px;
                }
                
                .field-row:last-child {
                    border-bottom: none;
                    border-radius: 0 0 4px 4px;
                }
                
                .field-row:nth-child(even) {
                    background: #f8f9fa;
                }
                
                @media (max-width: 768px) {
                    .info-grid {
                        grid-template-columns: 1fr;
                    }
                    
                    .field-header,
                    .field-row {
                        grid-template-columns: 1fr;
                        gap: 5px;
                    }
                    
                    .field-header span:before,
                    .field-row span:before {
                        content: attr(data-label) ': ';
                        font-weight: bold;
                    }
                }
                
                /* Template Designer Styles */
                .template-designer {
                    display: flex;
                    gap: 20px;
                    min-height: 400px;
                    border: 2px solid #e9ecef;
                    border-radius: 12px;
                    overflow: hidden;
                }
                
                .designer-toolbar {
                    width: 250px;
                    background: #f8f9fa;
                    border-right: 2px solid #e9ecef;
                    display: flex;
                    flex-direction: column;
                }
                
                .field-palette {
                    padding: 15px;
                    border-bottom: 1px solid #e9ecef;
                }
                
                .field-palette h4 {
                    margin: 0 0 15px 0;
                    color: #495057;
                    font-size: 14px;
                    font-weight: 600;
                }
                
                .palette-fields {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                
                .palette-field {
                    padding: 10px 12px;
                    background: white;
                    border: 2px solid #dee2e6;
                    border-radius: 8px;
                    cursor: grab;
                    transition: all 0.2s;
                    font-size: 13px;
                    font-weight: 500;
                    color: #495057;
                    user-select: none;
                }
                
                .palette-field:hover {
                    border-color: #007bff;
                    background: #e3f2fd;
                    transform: translateY(-1px);
                    box-shadow: 0 2px 8px rgba(0,123,255,0.2);
                }
                
                .palette-field:active {
                    cursor: grabbing;
                    transform: translateY(0);
                }
                
                .field-properties {
                    padding: 15px;
                    flex: 1;
                }
                
                .field-properties h4 {
                    margin: 0 0 15px 0;
                    color: #495057;
                    font-size: 14px;
                    font-weight: 600;
                }
                
                .property-item {
                    margin-bottom: 12px;
                }
                
                .property-item label {
                    display: block;
                    font-size: 12px;
                    font-weight: 600;
                    color: #666;
                    margin-bottom: 4px;
                }
                
                .property-item input,
                .property-item select {
                    width: 100%;
                    padding: 6px 8px;
                    border: 1px solid #dee2e6;
                    border-radius: 4px;
                    font-size: 12px;
                }
                
                .delete-field-btn {
                    background: #dc3545;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    padding: 8px 12px;
                    cursor: pointer;
                    font-size: 12px;
                    font-weight: 500;
                    width: 100%;
                    margin-top: 10px;
                    transition: background-color 0.2s;
                }
                
                .delete-field-btn:hover {
                    background: #c82333;
                }
                
                .template-canvas {
                    flex: 1;
                    background: #f8f9fa;
                    border: 2px dashed #dee2e6;
                    position: relative;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 300px;
                    max-height: 60vh;
                    margin: 15px;
                    border-radius: 8px;
                    transition: all 0.3s ease;
                    overflow: auto;
                }
                
                .template-canvas.drag-over {
                    border-color: #007bff;
                    background: #e3f2fd;
                }
                
                .canvas-label {
                    color: #6c757d;
                    font-size: 16px;
                    font-weight: 500;
                    text-align: center;
                    pointer-events: none;
                }
                
                .canvas-field {
                    position: absolute;
                    background: #e3f2fd;
                    border: 2px solid #2196f3;
                    border-radius: 4px;
                    padding: 4px 8px;
                    font-size: 12px;
                    cursor: move;
                    user-select: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    white-space: nowrap;
                    overflow: hidden;
                    transition: all 0.2s;
                    min-width: 80px;
                    min-height: 25px;
                }
                
                .canvas-field:hover {
                    box-shadow: 0 2px 8px rgba(33,150,243,0.3);
                    transform: translateY(-1px);
                }
                
                .canvas-field.selected {
                    border-color: #ff9800;
                    box-shadow: 0 0 8px rgba(255,152,0,0.5);
                }
                
                .canvas-field.near-edge {
                    border-color: #ff5722;
                    background: rgba(255, 87, 34, 0.1);
                    box-shadow: 0 0 4px rgba(255, 87, 34, 0.3);
                }
                
                .canvas-field.near-edge::after {
                    content: "⚠️";
                    position: absolute;
                    top: -2px;
                    right: -2px;
                    font-size: 10px;
                    background: #ff5722;
                    color: white;
                    border-radius: 50%;
                    width: 16px;
                    height: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10;
                    animation: pulse 2s infinite;
                }
                
                @keyframes pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                    100% { transform: scale(1); }
                }
                
                .custom-size-fields {
                    display: none;
                }
                
                .custom-size-fields input,
                .custom-size-fields select {
                    flex: 1;
                }
                
                .custom-size-fields span {
                    color: #666;
                    font-weight: bold;
                    font-size: 18px;
                }
                
                @media (max-width: 768px) {
                    .modal-content {
                        margin: 20px;
                        width: calc(100% - 40px);
                    }
                    
                    .form-grid {
                        grid-template-columns: 1fr;
                    }
                    
                    .template-designer {
                        flex-direction: column;
                        min-height: 500px;
                    }
                    
                    .designer-toolbar {
                        width: 100%;
                        max-height: 200px;
                        overflow-y: auto;
                    }
                    
                    .palette-fields {
                        flex-direction: row;
                        flex-wrap: wrap;
                    }
                    
                    .palette-field {
                        flex: 1;
                        min-width: 100px;
                        text-align: center;
                        font-size: 11px;
                        padding: 8px 6px;
                    }
                    
                    .modal-footer {
                        flex-direction: column;
                    }
                    
                    .custom-size-fields > div {
                        flex-direction: column;
                        gap: 8px;
                    }
                    
                                         .custom-size-fields input,
                     .custom-size-fields select {
                         width: 100%;
                     }
                 }
                 
                 /* Label Editor Styles */
                 .editor-header {
                     background: #f8f9fa;
                     border-bottom: 2px solid #dee2e6;
                     padding: 15px 25px;
                     display: flex;
                     justify-content: space-between;
                     align-items: center;
                     flex-shrink: 0;
                 }
                 
                 .editor-title-section h2 {
                     margin: 0;
                     color: #333;
                     font-size: 24px;
                 }
                 
                 .editor-actions {
                     display: flex;
                     gap: 10px;
                 }
                 
                 .editor-btn {
                     padding: 10px 20px;
                     border: none;
                     border-radius: 6px;
                     cursor: pointer;
                     font-weight: 500;
                     transition: all 0.2s;
                 }
                 
                 .preview-btn {
                     background: #17a2b8;
                     color: white;
                 }
                 
                 .preview-btn:hover {
                     background: #138496;
                 }
                 
                 .save-btn {
                     background: #28a745;
                     color: white;
                 }
                 
                 .save-btn:hover {
                     background: #218838;
                 }
                 
                 .close-btn {
                     background: #6c757d;
                     color: white;
                 }
                 
                 .close-btn:hover {
                     background: #5a6268;
                 }
                 
                 .editor-error {
                     background: #f8d7da;
                     color: #721c24;
                     padding: 12px 25px;
                     border-bottom: 1px solid #f5c6cb;
                 }
                 
                 .editor-content {
                     display: flex;
                     flex: 1;
                     overflow: hidden;
                 }
                 
                 .editor-left-panel {
                     width: 300px;
                     background: #f8f9fa;
                     border-right: 2px solid #dee2e6;
                     overflow-y: auto;
                     flex-shrink: 0;
                 }
                 
                 .panel-section {
                     padding: 20px;
                     border-bottom: 1px solid #dee2e6;
                 }
                 
                 .panel-section h3 {
                     margin: 0 0 15px 0;
                     color: #495057;
                     font-size: 16px;
                 }
                 
                 .panel-section h4 {
                     margin: 15px 0 10px 0;
                     color: #495057;
                     font-size: 14px;
                 }
                 
                 .form-field {
                     margin-bottom: 15px;
                 }
                 
                 .form-field label {
                     display: block;
                     margin-bottom: 5px;
                     font-weight: 600;
                     color: #495057;
                     font-size: 14px;
                 }
                 
                 .form-field input,
                 .form-field select {
                     width: 100%;
                     padding: 8px 12px;
                     border: 1px solid #ced4da;
                     border-radius: 4px;
                     font-size: 14px;
                 }
                 
                 .form-field input:focus,
                 .form-field select:focus {
                     outline: none;
                     border-color: #007bff;
                     box-shadow: 0 0 0 2px rgba(0,123,255,0.25);
                 }
                 
                 .form-field small {
                     display: block;
                     margin-top: 4px;
                     color: #6c757d;
                     font-size: 12px;
                 }
                 
                 .form-row {
                     display: flex;
                     gap: 10px;
                 }
                 
                 .form-row .form-field {
                     flex: 1;
                 }
                 
                 .available-fields {
                     max-height: 200px;
                     overflow-y: auto;
                 }
                 
                 .available-field {
                     display: flex;
                     align-items: center;
                     padding: 8px 12px;
                     margin-bottom: 5px;
                     background: white;
                     border: 1px solid #dee2e6;
                     border-radius: 4px;
                     cursor: pointer;
                     transition: all 0.2s;
                 }
                 
                 .available-field:hover {
                     background: #e3f2fd;
                     border-color: #007bff;
                 }
                 
                 .available-field .add-icon {
                     margin-right: 8px;
                     color: #007bff;
                 }
                 
                 .custom-field-section {
                     margin-top: 15px;
                 }
                 
                 .custom-field-actions {
                     display: flex;
                     gap: 5px;
                     margin-top: 8px;
                 }
                 
                 .btn-small {
                     padding: 6px 12px;
                     border: 1px solid #ced4da;
                     border-radius: 4px;
                     background: white;
                     cursor: pointer;
                     font-size: 12px;
                 }
                 
                 .btn-small.success {
                     background: #28a745;
                     color: white;
                     border-color: #28a745;
                 }
                 
                 .add-custom-btn {
                     width: 100%;
                     padding: 10px;
                     background: #007bff;
                     color: white;
                     border: none;
                     border-radius: 4px;
                     cursor: pointer;
                     font-size: 14px;
                 }
                 
                 .add-custom-btn:hover {
                     background: #0056b3;
                 }
                 
                 .editor-center-panel {
                     flex: 1;
                     display: flex;
                     flex-direction: column;
                     overflow: hidden;
                 }
                 
                 .canvas-section {
                     padding: 20px;
                     display: flex;
                     flex-direction: column;
                     align-items: center;
                 }
                 
                 .canvas-section h3 {
                     margin: 0 0 15px 0;
                     color: #495057;
                 }
                 
                 .canvas-container {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 300px;
                    max-height: 70vh;
                    overflow: auto;
                    padding: 20px;
                    background: #f8f9fa;
                    border-radius: 8px;
                    border: 1px solid #dee2e6;
                     margin-bottom: 15px;
                 }
                 
                                 .label-canvas {
                    position: relative;
                    background: white;
                    border: 2px solid #007bff;
                    border-radius: 4px;
                    overflow: visible;
                    box-shadow: 0 4px 12px rgba(0,123,255,0.15);
                    transition: all 0.3s ease;
                }
                 
                 .canvas-help {
                     margin: 0;
                     color: #6c757d;
                     font-size: 14px;
                 }
                 
                 .editor-bottom-section {
                     display: flex;
                     flex: 1;
                     min-height: 0;
                     border-top: 1px solid #dee2e6;
                 }
                 
                 .fields-list-panel {
                     flex: 1;
                     border-right: 1px solid #dee2e6;
                     display: flex;
                     flex-direction: column;
                 }
                 
                 .fields-list-panel h3 {
                     margin: 0;
                     padding: 15px 20px;
                     background: #f8f9fa;
                     border-bottom: 1px solid #dee2e6;
                     color: #495057;
                 }
                 
                 .fields-list {
                     flex: 1;
                     overflow-y: auto;
                 }
                 
                                 .field-item {
                    display: grid;
                    grid-template-columns: auto 1fr auto auto;
                    align-items: center;
                    gap: 8px;
                    padding: 12px 20px;
                    border-bottom: 1px solid #dee2e6;
                    cursor: pointer;
                    transition: background-color 0.2s;
                }
                 
                 .field-item:hover {
                     background: #f8f9fa;
                 }
                 
                 .field-item.selected {
                     background: #e3f2fd;
                     border-left: 4px solid #007bff;
                 }
                 
                 .field-drag-handle {
                     margin-right: 10px;
                     color: #6c757d;
                     cursor: grab;
                 }
                 
                 .field-info {
                     flex: 1;
                 }
                 
                 .field-name {
                     font-weight: 600;
                     color: #333;
                 }
                 
                 .field-details {
                     font-size: 12px;
                     color: #6c757d;
                 }
                 
                 .field-delete {
                     background: none;
                     border: none;
                     color: #dc3545;
                     cursor: pointer;
                     padding: 4px;
                     border-radius: 3px;
                 }
                 
                                 .field-delete:hover {
                    background: #f8d7da;
                }
                
                .field-coordinates {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    min-width: 140px;
                    margin-right: 8px;
                }
                
                .coord-group {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 11px;
                }
                
                .coord-group label {
                    font-weight: 600;
                    color: #555;
                    min-width: 12px;
                }
                
                .coord-input-group {
                    display: flex;
                    align-items: center;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    overflow: hidden;
                    background: white;
                }
                
                .coord-input {
                    border: none;
                    padding: 2px 4px;
                    width: 45px;
                    font-size: 11px;
                    text-align: center;
                    background: transparent;
                    outline: none;
                }
                
                .coord-input:focus {
                    background: #f0f8ff;
                }
                
                .coord-btn {
                    background: #f8f9fa;
                    border: none;
                    padding: 2px 6px;
                    cursor: pointer;
                    font-size: 12px;
                    font-weight: bold;
                    color: #495057;
                    transition: background-color 0.2s ease;
                    min-width: 20px;
                    height: 22px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .coord-btn:hover {
                    background: #e9ecef;
                }
                
                .coord-btn:active {
                    background: #dee2e6;
                }
                
                .coord-unit {
                    color: #6c757d;
                    font-size: 10px;
                    font-weight: 500;
                }
                
                .position-input-group {
                    display: flex;
                    align-items: center;
                    gap: 2px;
                }
                
                .position-btn {
                    background: #f8f9fa;
                    border: 1px solid #dee2e6;
                    padding: 4px 8px;
                    cursor: pointer;
                    font-size: 12px;
                    border-radius: 4px;
                    color: #495057;
                    transition: all 0.2s ease;
                    min-width: 28px;
                    height: 28px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .position-btn:hover {
                    background: #e9ecef;
                    border-color: #adb5bd;
                }
                
                .position-btn:active {
                    background: #dee2e6;
                    transform: translateY(1px);
                }
                 }
                 
                 .field-properties-panel {
                     flex: 1;
                     display: flex;
                     flex-direction: column;
                 }
                 
                 .field-properties-panel h3 {
                     margin: 0;
                     padding: 15px 20px 5px 20px;
                     background: #f8f9fa;
                     color: #495057;
                 }
                 
                 .field-properties-panel h4 {
                     margin: 0 0 15px 0;
                     padding: 0 20px;
                     background: #f8f9fa;
                     color: #6c757d;
                     font-size: 14px;
                     font-weight: 400;
                     border-bottom: 1px solid #dee2e6;
                     padding-bottom: 15px;
                 }
                 
                 .properties-content {
                     padding: 20px;
                     overflow-y: auto;
                 }
                 
                 .alignment-buttons {
                     display: flex;
                     border: 1px solid #ced4da;
                     border-radius: 4px;
                     overflow: hidden;
                 }
                 
                 .align-btn {
                     flex: 1;
                     padding: 8px;
                     border: none;
                     background: white;
                     cursor: pointer;
                     border-right: 1px solid #ced4da;
                 }
                 
                 .align-btn:last-child {
                     border-right: none;
                 }
                 
                 .align-btn.active {
                     background: #007bff;
                     color: white;
                 }
                 
                 .align-btn:hover {
                     background: #e3f2fd;
                 }
                 
                 .quick-position-grid {
                     display: grid;
                     grid-template-columns: 1fr 1fr 1fr;
                     gap: 5px;
                 }
                 
                 .pos-btn {
                     padding: 6px 8px;
                     border: 1px solid #ced4da;
                     background: white;
                     border-radius: 3px;
                     cursor: pointer;
                     font-size: 11px;
                 }
                 
                 .pos-btn:hover {
                     background: #e3f2fd;
                     border-color: #007bff;
                 }
                 
                 .delete-field-btn {
                     width: 100%;
                     padding: 10px;
                     background: #dc3545;
                     color: white;
                     border: none;
                     border-radius: 4px;
                     cursor: pointer;
                     margin-top: 20px;
                 }
                 
                 .delete-field-btn:hover {
                     background: #c82333;
                 }
                 
                 .canvas-field {
                     position: absolute;
                     background: rgba(0,123,255,0.1);
                     border: 2px solid #007bff;
                     border-radius: 3px;
                     padding: 2px 6px;
                     cursor: move;
                     user-select: none;
                     min-width: 30px;
                     display: flex;
                     align-items: center;
                     transition: all 0.2s;
                 }
                 
                 .canvas-field:hover {
                     background: rgba(0,123,255,0.2);
                     box-shadow: 0 2px 8px rgba(0,123,255,0.3);
                 }
                 
                 .canvas-field.selected {
                     border-color: #ff9800;
                     background: rgba(255,152,0,0.1);
                     box-shadow: 0 0 8px rgba(255,152,0,0.5);
                 }
                 
                 .canvas-empty {
                     position: absolute;
                     top: 50%;
                     left: 50%;
                     transform: translate(-50%, -50%);
                     color: #6c757d;
                     text-align: center;
                     pointer-events: none;
                 }
            </style>
        
        <!-- Label Editor (Full Page) -->
        <div id="label-editor" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100vh; background: white; z-index: 3000; flex-direction: column;">
            <!-- Header -->
            <div class="editor-header">
                <div class="editor-title-section">
                    <h2 id="editor-title">Create New Label Template</h2>
                </div>
                <div class="editor-actions">
                    <button onclick="previewLabel()" class="editor-btn preview-btn" id="preview-btn">
                        👁️ Preview
                    </button>
                    <button onclick="saveLabelTemplate()" class="editor-btn save-btn">
                        💾 Save
                    </button>
                    <button onclick="closeLabelEditor()" class="editor-btn close-btn">
                        ✕ Close
                    </button>
                </div>
            </div>
            
            <!-- Error Display -->
            <div id="editor-error" class="editor-error" style="display: none;"></div>
            
            <!-- Main Content -->
            <div class="editor-content">
                <!-- Left Panel - Settings and Available Fields -->
                <div class="editor-left-panel">
                    <div class="panel-section">
                        <h3>Template Settings</h3>
                        
                        <div class="form-field">
                            <label for="template-name-input">Label Name *</label>
                            <input type="text" id="template-name-input" required>
                        </div>
                        
                        <div class="form-field">
                            <label for="paper-size-select">Paper Size</label>
                            <select id="paper-size-select" onchange="updateCanvas()">
                                <optgroup label="Label Sizes">
                                    <option value="Brother-QL800">Brother QL-800 (62 x 29 mm)</option>
                                    <option value="Dymo-TwinTurbo">Dymo Twin Turbo (89 x 36 mm)</option>
                                    <option value="29mmx90mm">Brother DK1201 (90 x 29 mm)</option>
                                    <option value="custom-2.25x1.5">Godex Label (57 x 38 mm)</option>
                                    <option value="custom-90x29mm">Brother DK1201 Alt (90 x 29 mm)</option>
                                </optgroup>
                                <optgroup label="Standard Paper">
                                    <option value="Letter">Letter (216 x 279 mm)</option>
                                    <option value="A4">A4 (210 x 297 mm)</option>
                                    <option value="Legal">Legal (216 x 356 mm)</option>
                                    <option value="A5">A5 (148 x 210 mm)</option>
                                    <option value="A3">A3 (297 x 420 mm)</option>
                                </optgroup>
                            </select>
                        </div>
                        
                        <div class="form-field">
                            <label for="copies-input">Copies to Print</label>
                            <input type="number" id="copies-input" min="1" max="100" value="1">
                        </div>
                    </div>
                    
                    <div class="panel-section">
                        <h3>Available Fields</h3>
                        
                        <div id="available-fields-list" class="available-fields">
                            <!-- Populated by JavaScript -->
                        </div>
                        
                        <div class="custom-field-section">
                            <h4>Create Custom Field</h4>
                            <div id="custom-field-input" style="display: none;">
                                <input type="text" id="custom-field-name" placeholder="Enter field name">
                                <div class="custom-field-actions">
                                    <button onclick="addCustomField()" class="btn-small success">Add</button>
                                    <button onclick="cancelCustomField()" class="btn-small">Cancel</button>
                                </div>
                            </div>
                            <button id="show-custom-field-btn" onclick="showCustomFieldInput()" class="add-custom-btn">
                                ➕ Add Custom Field
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Center Panel - Canvas -->
                <div class="editor-center-panel">
                    <div class="canvas-section">
                        <h3 id="canvas-title">Label Preview (Brother QL-800)</h3>
                        
                        <div class="canvas-container">
                            <div id="label-canvas" class="label-canvas"></div>
                        </div>
                        
                        <div class="canvas-help">
                            <p>🎯 <strong>Positioning Controls:</strong></p>
                            <ul style="margin: 8px 0; padding-left: 20px; font-size: 12px;">
                                <li><strong>Drag:</strong> Click and drag fields on canvas</li>
                                <li><strong>Manual:</strong> Use coordinate inputs in field list</li>
                                <li><strong>Keyboard:</strong> Arrow keys (1mm) • Shift+Arrow (0.1mm)</li>
                                <li><strong>Quick Position:</strong> Use preset position buttons</li>
                            </ul>
                        </div>
                    </div>
                    
                    <!-- Bottom section with fields list and properties -->
                    <div class="editor-bottom-section">
                        <!-- Fields List -->
                        <div class="fields-list-panel">
                            <h3>Fields on Label (<span id="fields-count">0</span>)</h3>
                            
                            <div class="help-text" style="background: #e8f4fd; padding: 8px; border-radius: 4px; margin: 8px 0; font-size: 11px; color: #0c5aa6;">
                                💡 <strong>Manual Coordinates:</strong> Use the coordinate controls below to precisely position each field. 
                                Values are in millimeters and automatically stay within paper bounds.
                            </div>
                            
                            <div id="fields-list" class="fields-list">
                                <!-- Populated by JavaScript -->
                            </div>
                        </div>
                        
                        <!-- Field Properties -->
                        <div id="field-properties-panel" class="field-properties-panel" style="display: none;">
                            <h3>Field Properties</h3>
                            <h4 id="selected-field-name"></h4>
                            
                            <div class="properties-content">
                                <div class="form-field">
                                    <label for="field-preview-value">Preview Value</label>
                                    <input type="text" id="field-preview-value" onchange="updateSelectedFieldProperty('value', this.value)">
                                </div>
                                
                                <div class="form-field">
                                    <label>
                                        <input type="checkbox" id="field-show-in-form" onchange="updateSelectedFieldProperty('showInForm', this.checked)">
                                        Show in Form
                                    </label>
                                    <small>When enabled, users will be prompted to fill this field when creating labels</small>
                                </div>
                                
                                <div class="form-row">
                                    <div class="form-field">
                                        <label for="field-x-position">X Position (mm)</label>
                                        <div class="position-input-group">
                                            <button class="position-btn" onclick="adjustSelectedFieldCoordinate('x', -0.1)" title="Move left 0.1mm">←</button>
                                            <input type="number" id="field-x-position" step="0.1" min="0" onchange="updateFieldPosition('x', this.value)">
                                            <button class="position-btn" onclick="adjustSelectedFieldCoordinate('x', 0.1)" title="Move right 0.1mm">→</button>
                                        </div>
                                    </div>
                                    <div class="form-field">
                                        <label for="field-y-position">Y Position (mm)</label>
                                        <div class="position-input-group">
                                            <button class="position-btn" onclick="adjustSelectedFieldCoordinate('y', -0.1)" title="Move up 0.1mm">↑</button>
                                            <input type="number" id="field-y-position" step="0.1" min="0" onchange="updateFieldPosition('y', this.value)">
                                            <button class="position-btn" onclick="adjustSelectedFieldCoordinate('y', 0.1)" title="Move down 0.1mm">↓</button>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="form-field">
                                    <label for="field-font-family">Font Family</label>
                                    <select id="field-font-family" onchange="updateSelectedFieldProperty('fontFamily', this.value)">
                                        <option value="Arial">Arial</option>
                                        <option value="Helvetica">Helvetica</option>
                                        <option value="Times New Roman">Times New Roman</option>
                                        <option value="Courier New">Courier New</option>
                                        <option value="Verdana">Verdana</option>
                                        <option value="Georgia">Georgia</option>
                                        <option value="Tahoma">Tahoma</option>
                                        <option value="Trebuchet MS">Trebuchet MS</option>
                                        <option value="Impact">Impact</option>
                                        <option value="Comic Sans MS">Comic Sans MS</option>
                                    </select>
                                </div>
                                
                                <div class="form-field">
                                    <label for="field-font-size">Font Size: <span id="font-size-display">12</span>px</label>
                                    <input type="range" id="field-font-size" min="6" max="32" value="12" onchange="updateSelectedFieldProperty('fontSize', parseInt(this.value))">
                                </div>
                                
                                <div class="form-field">
                                    <label>Text Alignment</label>
                                    <div class="alignment-buttons">
                                        <button class="align-btn" data-align="left" onclick="updateSelectedFieldProperty('textAlign', 'left')">⬅</button>
                                        <button class="align-btn" data-align="center" onclick="updateSelectedFieldProperty('textAlign', 'center')">⬛</button>
                                        <button class="align-btn" data-align="right" onclick="updateSelectedFieldProperty('textAlign', 'right')">➡</button>
                                    </div>
                                </div>
                                
                                <div class="form-field">
                                    <label for="field-color">Text Color</label>
                                    <input type="color" id="field-color" onchange="updateSelectedFieldProperty('color', this.value)">
                                </div>
                                
                                <div class="form-field">
                                    <label>Quick Position</label>
                                    <div class="quick-position-grid">
                                        <button onclick="setQuickPosition('top', 'left')" class="pos-btn">Top Left</button>
                                        <button onclick="setQuickPosition('top', 'center')" class="pos-btn">Top Center</button>
                                        <button onclick="setQuickPosition('top', 'right')" class="pos-btn">Top Right</button>
                                        <button onclick="setQuickPosition('middle', 'left')" class="pos-btn">Mid Left</button>
                                        <button onclick="setQuickPosition('middle', 'center')" class="pos-btn">Mid Center</button>
                                        <button onclick="setQuickPosition('middle', 'right')" class="pos-btn">Mid Right</button>
                                        <button onclick="setQuickPosition('bottom', 'left')" class="pos-btn">Bottom Left</button>
                                        <button onclick="setQuickPosition('bottom', 'center')" class="pos-btn">Bottom Center</button>
                                        <button onclick="setQuickPosition('bottom', 'right')" class="pos-btn">Bottom Right</button>
                                    </div>
                                </div>
                                
                                <button onclick="deleteSelectedField()" class="delete-field-btn">
                                    🗑️ Delete Field
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        </body>
        </html>
        """, 
        config=config,
        server_url=server_url,
        verify_ssl=verify_ssl,
        statuses=printer_statuses,
        logs="\n".join(PRINT_LOG[-50:]) if PRINT_LOG else "No activity logs yet",
        errors="\n".join(PRINT_ERRORS[-20:]) if PRINT_ERRORS else "No errors",
        interval=POLL_INTERVAL,
        token_value=token_value,
        client_id=client_id,
        connected=connected,
        connection_msg=connection_msg,
        polling_active=POLLING_ACTIVE,
        poll_count=POLL_COUNT,
        pending_count=pending_count,
        claimed_count=claimed_count,
        use_dynamic_ip=use_dynamic_ip,
        current_ip=current_ip,
        preview_count=preview_count,
        auto_approval_enabled=auto_approval_enabled
        )
        
    except Exception as e:
        return f"Error in main route: {str(e)}", 500

@main_bp.route("/get-activity-logs")
def get_activity_logs():
    """API endpoint to get activity logs for enhanced logs display"""
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

@main_bp.route("/debug")  
def debug_full():
    """Full dashboard page with all features"""
    try:
        from flask import current_app
        
        # Import modules directly to avoid circular imports
        import print_queue
        
        # Import functions directly from main app
        try:
            from print_dashboard_insepctionapp import get_printer_statuses, POLLING_ACTIVE
        except ImportError:
            # Fallback if main app module not loaded yet
            def get_printer_statuses():
                return {"No Printers": "Loading..."}
            POLLING_ACTIVE = False
        
        # Get configuration directly from file
        import os
        import json
        config = {}
        try:
            if os.path.exists('print_client_config.json'):
                with open('print_client_config.json', 'r') as f:
                    config = json.load(f)
            else:
                # Fallback config
                config = {
                    "PRINT_SERVER": "https://192.168.0.107:5001",
                    "CLIENT_ID": "print-client-debug",
                    "USE_DYNAMIC_IP": True,
                    "VERIFY_SSL": False
                }
        except Exception as e:
            config = {"error": f"Config load failed: {str(e)}"}
        
        # Get authentication status
        current_token = current_app.config.get("AUTH_TOKEN", "print-client-token")
        token_status = "Valid" if current_token and current_token != "print-client-token" else "Missing"
        
        # Get printer information
        printer_statuses = get_printer_statuses()
        
        # Get print queue information
        pending_previews = print_queue.get_pending_previews()
        job_tracker = print_queue.get_job_tracker()
        
        # Render the main dashboard template
        return render_template_string("""
        <html>
        <head><title>Print Client Dashboard - Full Debug</title></head>
        <body>
        <h1>🖨️ Print Client Dashboard - Full Version</h1>
        <p>Config loaded: {{ config }}</p>
        <p>Token status: {{ token_status }}</p>
        <p>Printers: {{ printer_statuses }}</p>
        <p>Pending previews: {{ pending_previews|length }}</p>
        <p>Job tracker: {{ job_tracker|length }}</p>
        <p>Polling active: {{ polling_active }}</p>
        </body>
        </html>
        """, 
        config=config,
        token_status=token_status,
        printer_statuses=printer_statuses,
        pending_previews=pending_previews,
        job_tracker=job_tracker,
        polling_active=POLLING_ACTIVE
        )
        
    except Exception as e:
        return f"Error in debug route: {str(e)}", 500 