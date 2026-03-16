"""
HTTP/REST API client for the Print Client Dashboard.
Handles all communication with the main print server.

Refactored from print_dashboard_insepctionapp.py on 2024
"""
import requests
from datetime import datetime
from config_manager import VERIFY_SSL, CLIENT_ID
from auth_token_manager import get_auth_headers

def test_connection(app, log_message_func):
    """Test connection to print server"""
    try:
        headers = get_auth_headers(app)
        if not headers:
            return False, "No authentication token"
        
        response = requests.get(
            f"{app.config['PRINT_SERVER']}/api/print/stats/polling",
            headers=headers,
            verify=VERIFY_SSL,
            timeout=10
        )
        
        if response.status_code == 200:
            return True, "Connection successful"
        elif response.status_code == 401:
            return False, "Authentication failed - token may be expired"
        else:
            return False, f"HTTP {response.status_code}: {response.text}"
            
    except requests.exceptions.RequestException as e:
        return False, f"Connection error: {str(e)}"

def poll_for_pending_jobs(app, log_message_func):
    """Poll server for pending print jobs"""
    try:
        headers = get_auth_headers(app)
        if not headers:
            log_message_func("❌ No authentication headers available for polling", True, category="queue")
            return []
        
        client_id = app.config.get("CLIENT_ID", CLIENT_ID)
        client_name = app.config.get("CLIENT_NAME", "")
        location_id = app.config.get("LOCATION_ID", "")
        server_url = app.config.get("PRINT_SERVER", "Not configured")
        
        # Debug logging
        log_message_func(f"🔍 DEBUG: Polling with client_id={client_id}, location_id={location_id}, server={server_url}", category="queue")
        log_message_func(f"🔍 DEBUG: Headers present: {'Authorization' in headers}", category="queue")
        
        # Build params with optional location_id for location-based routing
        # Include clientName so the server can display it even if not registered
        params = {"clientId": client_id, "limit": 5}
        if client_name:
            params["clientName"] = client_name
        if location_id:
            params["locationId"] = location_id
        
        response = requests.get(
            f"{server_url}/api/print/jobs/pending",
            params=params,
            headers=headers,
            verify=VERIFY_SSL,
            timeout=10
        )
        
        # Debug response
        log_message_func(f"🔍 DEBUG: Response status={response.status_code}", category="queue")
        
        if response.status_code == 401:
            log_message_func("❌ Authentication failed during polling - token expired", True, category="queue")
            log_message_func(f"🔍 DEBUG: Response body: {response.text[:200]}", category="queue")
            return []
        
        if response.status_code != 200:
            log_message_func(f"❌ Polling failed: HTTP {response.status_code}", True, category="queue")
            log_message_func(f"🔍 DEBUG: Response body: {response.text[:200]}", category="queue")
            return []
        
        data = response.json()
        # Handle both array response and object with jobs property
        if isinstance(data, list):
            jobs = data
        else:
            jobs = data.get("jobs", [])
        
        # Debug logging to see what's happening
        if jobs:
            log_message_func(f"📥 POLLING: Found {len(jobs)} jobs", category="queue")
            for job in jobs:
                job_id = job.get('id', 'unknown')
                form_name = job.get('formName', 'unknown')
                log_message_func(f"📄 JOB FOUND: {job_id} - {form_name}", category="queue")
        else:
            # Only log occasionally to avoid spam
            import time
            current_time = time.time()
            if not hasattr(poll_for_pending_jobs, 'last_empty_log') or current_time - poll_for_pending_jobs.last_empty_log > 30:
                log_message_func(f"📭 POLLING: No jobs found for client {client_id}", category="queue")
                poll_for_pending_jobs.last_empty_log = current_time
        
        return jobs
        
    except requests.exceptions.RequestException as e:
        log_message_func(f"🚫 QUEUE ERROR: Polling failed - {str(e)}", True, category="queue")
        return []
    except Exception as e:
        log_message_func(f"🚫 QUEUE ERROR: Unexpected polling error - {str(e)}", True, category="queue")
        return []

def claim_job(job_id, app, log_message_func):
    """Claim a print job"""
    try:
        headers = get_auth_headers(app)
        client_id = app.config.get("CLIENT_ID", CLIENT_ID)
        
        response = requests.post(
            f"{app.config['PRINT_SERVER']}/api/print/jobs/{job_id}/claim",
            json={"clientId": client_id},
            headers=headers,
            verify=VERIFY_SSL,
            timeout=10
        )
        
        if response.status_code == 200:
            log_message_func(f"✅ JOB CLAIMED: Successfully claimed job {job_id}", category="queue")
            return True, response.json()
        elif response.status_code == 409:
            log_message_func(f"⚠️ JOB CONFLICT: Job {job_id} already claimed by another client", category="queue")
            return False, "Already claimed"
        else:
            log_message_func(f"❌ CLAIM FAILED: Job {job_id} - HTTP {response.status_code}", True, category="queue")
            return False, f"HTTP {response.status_code}"
            
    except Exception as e:
        log_message_func(f"🚫 CLAIM ERROR: Job {job_id} - {str(e)}", True, category="queue")
        return False, str(e)

def complete_job(job_id, app, log_message_func, print_details=None):
    """Mark a job as completed"""
    try:
        headers = get_auth_headers(app)
        client_id = app.config.get("CLIENT_ID", CLIENT_ID)
        
        payload = {
            "clientId": client_id,
            "printDetails": print_details or {
                "printedAt": datetime.now().isoformat(),
                "clientVersion": "1.0.0",
                "printerType": "Generic"
            }
        }
        
        response = requests.post(
            f"{app.config['PRINT_SERVER']}/api/print/jobs/{job_id}/complete",
            json=payload,
            headers=headers,
            verify=VERIFY_SSL,
            timeout=10
        )
        
        if response.status_code == 200:
            log_message_func(f"🎉 JOB COMPLETED: Successfully completed job {job_id}", category="queue")
            return True
        else:
            log_message_func(f"❌ COMPLETION FAILED: Job {job_id} - HTTP {response.status_code}", True, category="queue")
            return False
            
    except Exception as e:
        log_message_func(f"🚫 COMPLETION ERROR: Job {job_id} - {str(e)}", True, category="queue")
        return False

def fail_job(job_id, error_message, app, log_message_func, should_retry=True):
    """Mark a job as failed"""
    try:
        headers = get_auth_headers(app)
        client_id = app.config.get("CLIENT_ID", CLIENT_ID)
        
        payload = {
            "clientId": client_id,
            "errorMessage": error_message,
            "shouldRetry": should_retry
        }
        
        response = requests.post(
            f"{app.config['PRINT_SERVER']}/api/print/jobs/{job_id}/fail",
            json=payload,
            headers=headers,
            verify=VERIFY_SSL,
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            retry_msg = "will retry" if result.get("willRetry") else "will not retry"
            log_message_func(f"💥 JOB FAILED: Job {job_id} failed - {error_message} ({retry_msg})", category="queue")
            return True, result
        else:
            log_message_func(f"❌ FAIL UPDATE ERROR: Job {job_id} status update failed - HTTP {response.status_code}", True, category="queue")
            return False, None
            
    except Exception as e:
        log_message_func(f"🚫 FAIL ERROR: Job {job_id} - {str(e)}", True, category="queue")
        return False, None

def register_print_client(app, log_message_func):
    """Register this print client with the server (for location-based routing)"""
    try:
        headers = get_auth_headers(app)
        if not headers:
            return False
        
        client_id = app.config.get("CLIENT_ID", CLIENT_ID)
        client_name = app.config.get("CLIENT_NAME", f"Print Client {client_id[:8]}")
        location_id = app.config.get("LOCATION_ID", "")
        
        if not location_id:
            log_message_func("⚠️ No LOCATION_ID configured - print client will receive all jobs")
        
        log_message_func(f"📋 REGISTERING PRINT CLIENT: {client_name} (ID: {client_id})")
        if location_id:
            log_message_func(f"📍 Location ID: {location_id}")
        
        # Register the print client
        response = requests.post(
            f"{app.config['PRINT_SERVER']}/api/print/clients/register",
            json={
                "clientId": client_id,
                "name": client_name,
                "locationId": location_id if location_id else None,
                "description": f"Auto-registered print client"
            },
            headers=headers,
            verify=VERIFY_SSL,
            timeout=10
        )
        
        if response.status_code in [200, 201]:
            result = response.json()
            log_message_func(f"✅ Print client registered: {result.get('message', 'Success')}")
            return True
        elif response.status_code == 400 and 'LOCATION_REQUIRED' in response.text:
            log_message_func("⚠️ Server requires LOCATION_ID - please configure in print_client_config.json", True)
            return False
        else:
            log_message_func(f"❌ Failed to register print client: HTTP {response.status_code}", True)
            return False
            
    except requests.exceptions.RequestException as e:
        log_message_func(f"Network error registering print client: {str(e)}", True)
        return False
    except Exception as e:
        log_message_func(f"Error registering print client: {str(e)}", True)
        return False

def register_printers_with_server(app, log_message_func, get_printer_statuses_func):
    """Register detected local printers with the main server"""
    try:
        headers = get_auth_headers(app)
        if not headers:
            return False
        
        # First, register the print client itself
        register_print_client(app, log_message_func)
        
        # Get current printer statuses
        printer_statuses = get_printer_statuses_func()
        if not printer_statuses:
            log_message_func("No local printers detected to register")
            return False
        
        # Format printers for registration
        printers = []
        for name, status in printer_statuses.items():
            # Skip error states
            if status.lower() in ['not found', 'failed', 'timeout', 'detection error']:
                continue
                
            # Determine connection type based on printer name
            connection_type = "network"  # Default
            if "usb" in name.lower():
                connection_type = "usb"
            elif any(word in name.lower() for word in ["bluetooth", "bt", "wireless"]):
                connection_type = "bluetooth"
            
            printers.append({
                "name": name,
                "type": "Generic",
                "connectionType": connection_type,
                "status": "online" if status.lower() == "online" else "offline",
                "systemPrinterName": name
            })
        
        if not printers:
            log_message_func("No valid printers to register (all in error state)")
            return False
        
        client_id = app.config.get("CLIENT_ID", CLIENT_ID)
        log_message_func(f"📋 REGISTERING PRINTERS: {client_id} with {len(printers)} printers")
        
        # Send registration request
        response = requests.post(
            f"{app.config['PRINT_SERVER']}/api/print/client/register-printers",
            json={
                "clientId": client_id,
                "printers": printers
            },
            headers=headers,
            verify=VERIFY_SSL,
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            log_message_func(f"Successfully registered {len(printers)} printers with server: {result.get('message', '')}")
            return True
        else:
            log_message_func(f"Failed to register printers: HTTP {response.status_code} - {response.text}", True)
            return False
            
    except requests.exceptions.RequestException as e:
        log_message_func(f"Network error registering printers: {str(e)}", True)
        return False
    except Exception as e:
        log_message_func(f"Error registering printers: {str(e)}", True)
        return False

def update_printer_status_on_server(app, log_message_func, get_printer_statuses_func):
    """Update printer status on the main server"""
    try:
        headers = get_auth_headers(app)
        if not headers:
            return False
        
        # Get current printer statuses
        printer_statuses = get_printer_statuses_func()
        if not printer_statuses:
            return False
        
        # Convert to status update format
        status_updates = []
        for printer_name, status in printer_statuses.items():
            # Skip error states
            if status.lower() in ['not found', 'failed', 'timeout', 'detection error']:
                continue
                
            status_updates.append({
                "name": printer_name,
                "status": "online" if status.lower() == "online" else "offline"
            })
        
        if not status_updates:
            return False
        
        client_id = app.config.get("CLIENT_ID", CLIENT_ID)
        
        # Send status update
        response = requests.put(
            f"{app.config['PRINT_SERVER']}/api/print/client/printer-status",
            json={
                "clientId": client_id,
                "printerStatuses": status_updates
            },
            headers=headers,
            verify=VERIFY_SSL,
            timeout=10
        )
        
        if response.status_code == 200:
            log_message_func(f"Updated status for {len(status_updates)} printers on server")
            return True
        else:
            log_message_func(f"Failed to update printer status: HTTP {response.status_code}", True)
            return False
            
    except Exception as e:
        log_message_func(f"Error updating printer status: {str(e)}", True)
        return False

def get_system_printer_name(printer_id, app):
    """Get system printer name from printer ID"""
    try:
        headers = get_auth_headers(app)
        if headers:
            response = requests.get(
                f"{app.config['PRINT_SERVER']}/api/print/printers",
                headers=headers,
                verify=VERIFY_SSL,
                timeout=5
            )
            
            if response.status_code == 200:
                printers_data = response.json()
                for printer_data in printers_data:
                    if printer_data.get('id') == printer_id:
                        return printer_data.get('systemPrinterName', printer_data.get('name'))
    except Exception as e:
        print(f"Could not fetch printer data: {e}")
    
    # Fallback to printer ID
    return printer_id

def get_printers_from_server(app):
    """Get list of printers from the server"""
    try:
        headers = get_auth_headers(app)
        if not headers:
            return []
        
        response = requests.get(
            f"{app.config['PRINT_SERVER']}/api/print/printers",
            headers=headers,
            verify=VERIFY_SSL,
            timeout=5
        )
        
        if response.status_code == 200:
            return response.json()
        
    except Exception as e:
        print(f"Could not fetch printers from server: {e}")
    
    return []

def clear_all_printers_on_server(app, log_message_func):
    """Clear all printers from the server"""
    try:
        headers = get_auth_headers(app)
        if not headers:
            return False, "No authentication token"
        
        response = requests.delete(
            f"{app.config['PRINT_SERVER']}/api/print/printers/all",
            headers=headers,
            verify=VERIFY_SSL,
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            deleted_count = result.get('deletedCount', 0)
            log_message_func(f"✅ Cleared {deleted_count} printers from server", category="queue")
            return True, deleted_count
        else:
            log_message_func(f"⚠️ Server clear failed: HTTP {response.status_code}", category="queue")
            return False, f"HTTP {response.status_code}"
            
    except Exception as e:
        log_message_func(f"❌ Error clearing printers: {str(e)}", True, category="queue")
        return False, str(e)

def get_auth_headers(app):
    """Get authorization headers for API requests"""
    # Try to get token from app config first
    token = app.config.get("AUTH_TOKEN")
    
    # If no token in app config, try to load from token manager
    if not token:
        try:
            import auth_token_manager
            token = auth_token_manager.load_token(app, lambda msg, err=False: None)
            if token:
                app.config["AUTH_TOKEN"] = token  # Cache it
        except Exception:
            pass
    
    # If still no token, try to get a fresh one
    if not token:
        try:
            import auth_token_manager
            token = auth_token_manager.get_or_create_print_client_token(app, lambda msg, err=False: None, load_config_func=lambda: app.config)
            if token:
                app.config["AUTH_TOKEN"] = token  # Cache it
        except Exception:
            pass
    
    if not token:
        return None
    
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    } 