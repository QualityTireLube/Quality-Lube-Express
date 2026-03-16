"""
Print job management Flask routes for the Print Client Dashboard.
Handles polling, job approval/rejection, preview queue, and job data.
Refactored from print_dashboard_insepctionapp.py on 2024 - Section 6: Flask routes/blueprints
"""

from flask import Blueprint, request, jsonify, redirect, url_for, Response
import threading
import print_queue
import api_client

# Create blueprint
print_job_bp = Blueprint('print_job', __name__)

@print_job_bp.route("/start-polling", methods=["POST"])
def start_polling():
    """Start the job polling process"""
    import sys
    if 'print_dashboard_insepctionapp' in sys.modules:
        main_module = sys.modules['print_dashboard_insepctionapp']
        
        if not main_module.POLLING_ACTIVE:
            main_module.POLLING_ACTIVE = True
            
            # Start polling in a separate thread using the wrapper function
            polling_thread = threading.Thread(target=main_module.poll_print_jobs, daemon=True)
            polling_thread.start()
            
            main_module.log_message("🚀 Job polling started", category="queue")
        else:
            main_module.log_message("⚠️ Polling already active", category="queue")
    
    return redirect(url_for('main.index'))

@print_job_bp.route("/stop-polling", methods=["POST"])
def stop_polling():
    """Stop the job polling process"""
    import sys
    if 'print_dashboard_insepctionapp' in sys.modules:
        main_module = sys.modules['print_dashboard_insepctionapp']
        main_module.POLLING_ACTIVE = False
        main_module.log_message("⏸️ Job polling stopped", category="queue")
    
    return redirect(url_for('main.index'))

@print_job_bp.route("/cancel", methods=["POST"])
def cancel_job():
    """Cancel a job"""
    job_id = request.form.get("job_id")
    if not job_id:
        return jsonify({"success": False, "error": "Job ID is required"})
    
    try:
        print_queue.cancel_job(job_id)
        
        import sys
        if 'print_dashboard_insepctionapp' in sys.modules:
            log_message = sys.modules['print_dashboard_insepctionapp'].log_message
            log_message(f"❌ Job {job_id} cancelled by user", category="queue")
        
        return jsonify({"success": True, "message": f"Job {job_id} cancelled"})
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@print_job_bp.route("/preview/<job_id>")
def preview_pdf(job_id):
    """Serve PDF preview"""
    if job_id not in print_queue.get_pending_previews():
        return "Preview not found", 404
    
    preview_data = print_queue.get_pending_previews()[job_id]
    pdf_path = preview_data['pdf_path']
    job = preview_data['job']
    
    try:
        with open(pdf_path, 'rb') as f:
            pdf_content = f.read()
        
        # Get filename from job data
        filename = job.get('jobData', {}).get('filename', f'job-{job_id}.pdf')
        
        return Response(
            pdf_content,
            mimetype='application/pdf',
            headers={
                'Content-Disposition': f'inline; filename="{filename}"'
            }
        )
    except Exception as e:
        import sys
        if 'print_dashboard_insepctionapp' in sys.modules:
            log_message = sys.modules['print_dashboard_insepctionapp'].log_message
            log_message(f"Error loading preview for job {job_id}: {str(e)}", True)
        return f"Error loading preview: {str(e)}", 500

@print_job_bp.route("/approve/<job_id>", methods=["POST"])
def approve_job(job_id):
    """Approve and print a previewed job"""
    from flask import current_app
    
    import sys
    if 'print_dashboard_insepctionapp' in sys.modules:
        log_message = sys.modules['print_dashboard_insepctionapp'].log_message
    else:
        def log_message(msg, is_error=False):
            print(f"LOG: {msg}")
    
    success, message = print_queue.approve_preview(job_id, api_client, current_app, log_message)
    
    if success:
        # Get the job data for tracking
        if job_id in print_queue.get_pending_previews():
            job = print_queue.get_pending_previews()[job_id]['job']
            job_name = job.get('jobData', {}).get('filename', f'Job {job_id[:8]}')
            
            print_queue.add_to_printed_jobs(job)
            
            if 'print_dashboard_insepctionapp' in sys.modules:
                queue_logs = sys.modules['print_dashboard_insepctionapp'].QUEUE_LOGS
                print_queue.update_job_status(job_id, "completed", queue_logs, log_message, 
                                            form_name=job.get('formName', 'unknown'))
        
        return jsonify({
            "success": True, 
            "message": f"✅ Job {job_id} printed successfully"
        })
    else:
        return jsonify({
            "success": False, 
            "error": f"❌ Failed to print job {job_id}: {message}"
        })

@print_job_bp.route("/reject/<job_id>", methods=["POST"])
def reject_job(job_id):
    """Reject a previewed job"""
    try:
        success = print_queue.reject_preview(job_id)
        
        import sys
        if 'print_dashboard_insepctionapp' in sys.modules:
            log_message = sys.modules['print_dashboard_insepctionapp'].log_message
            log_message(f"❌ Job {job_id} rejected by user", category="queue")
        
        if success:
            return jsonify({
                "success": True,
                "message": f"Job {job_id} rejected and removed from queue"
            })
        else:
            return jsonify({
                "success": False,
                "error": f"Job {job_id} not found in preview queue"
            })
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Error rejecting job: {str(e)}"
        })

@print_job_bp.route("/preview-queue")
def get_preview_queue():
    """Get current preview queue as JSON"""
    try:
        queue_data = []
        pending_previews = print_queue.get_pending_previews()
        
        for job_id, preview_data in pending_previews.items():
            job = preview_data.get('job', {})
            job_data = job.get('jobData', {})
            sticker_info = job_data.get('stickerInfo', {})
            metadata = job_data.get('metadata', {})
            
            # Get enhanced preview information including translation status
            preview_info = print_queue.get_preview_info(job_id)
            
            queue_item = {
                'job_id': job_id,
                'filename': job_data.get('filename', f'job-{job_id}.pdf'),
                'timestamp': preview_data.get('metadata', {}).get('created_at', job.get('createdAt', 'Unknown')),
                'vin': sticker_info.get('vin', 'N/A'),
                'vehicle': sticker_info.get('vehicleDetails', 'N/A'),
                'oil_type': sticker_info.get('oilType', 'N/A'),
                'document_type': metadata.get('documentType', 'N/A'),
                'source': metadata.get('source', 'N/A')
            }
            
            # Add translation and preview information
            if preview_info:
                queue_item.update({
                    'is_translated': preview_info['is_translated'],
                    'printer_optimized': preview_info['printer_optimized'],
                    'printer_id': preview_info['printer_id'],
                    'orientation': preview_info['orientation'],
                    'preview_description': preview_info['preview_description'],
                    'preview_details': preview_info['preview_details']
                })
            
            queue_data.append(queue_item)
        
        return jsonify(queue_data)
    except Exception as e:
        import sys
        if 'print_dashboard_insepctionapp' in sys.modules:
            log_message = sys.modules['print_dashboard_insepctionapp'].log_message
            log_message(f"Error in preview-queue route: {str(e)}", True)
        return jsonify({"error": str(e)}), 500

@print_job_bp.route("/toggle-auto-approval", methods=["POST"])
def toggle_auto_approval():
    """Toggle auto approval setting"""
    print_queue.set_auto_approval_status(not print_queue.get_auto_approval_status())
    
    status = "enabled" if print_queue.get_auto_approval_status() else "disabled"
    
    import sys
    if 'print_dashboard_insepctionapp' in sys.modules:
        log_message = sys.modules['print_dashboard_insepctionapp'].log_message
        log_message(f"🚀 Auto approval {status}", category="queue")
    
    return redirect(url_for('main.index'))

@print_job_bp.route("/job-details/<job_id>")
def get_job_details(job_id):
    """Get detailed information about a specific job"""
    # Check all possible job locations
    job_tracker = print_queue.get_job_tracker()
    pending_previews = print_queue.get_pending_previews()
    printed_jobs = print_queue.get_printed_jobs()
    
    job_data = None
    found_in = None
    
    # Search in pending previews FIRST (has full job data with labelInfo)
    if job_id in pending_previews:
        job_data = pending_previews[job_id]['job']
        found_in = "pending_jobs"
    
    # Search in printed jobs (also has full job data)
    elif any(job.get('id') == job_id for job in printed_jobs):
        for job in printed_jobs:
            if job.get('id') == job_id:
                job_data = job
                found_in = "printed_jobs"
                break
    
    # Fallback to job tracker (basic metadata only)
    elif job_id in job_tracker:
        job_data = job_tracker[job_id]
        found_in = "tracked_jobs"
    
    if not job_data:
        return jsonify({"success": False, "error": "Job not found"}), 404
    
    # Get printer log for this job if available
    printer_log = print_queue.get_printer_log(job_id)
    
    response_data = {
        "success": True,
        "job": job_data,
        "found_in": found_in,
        "job_id": job_id
    }
    
    # Add printer log if available
    if printer_log:
        response_data["printer_log"] = printer_log
    
    return jsonify(response_data)

@print_job_bp.route("/jobs-data")
def get_jobs_data():
    """Get comprehensive jobs data for dashboard"""
    try:
        pending_previews = print_queue.get_pending_previews()
        job_tracker = print_queue.get_job_tracker()
        printed_jobs = print_queue.get_printed_jobs()
        
        # Convert pending previews to job format
        pending_jobs = []
        for job_id, preview_data in pending_previews.items():
            job = preview_data.get('job', {})
            job['status'] = 'pending'
            pending_jobs.append(job)
        
        # Get claimed jobs from tracker
        claimed_jobs = []
        for job_id, job_data in job_tracker.items():
            if job_data.get('status') == 'claimed':
                claimed_jobs.append(job_data)
        
        return jsonify({
            "success": True,
            "pending_jobs": pending_jobs,
            "claimed_jobs": claimed_jobs,
            "printed_jobs": printed_jobs,
            "counts": {
                "pending": len(pending_jobs),
                "claimed": len(claimed_jobs),
                "printed": len(printed_jobs)
            }
        })
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@print_job_bp.route("/delete-job/<job_id>", methods=["DELETE"])
def delete_job(job_id):
    """Delete a job from the queue"""
    try:
        import sys
        
        # Get log function
        if 'print_dashboard_insepctionapp' in sys.modules:
            log_message = sys.modules['print_dashboard_insepctionapp'].log_message
        else:
            def log_message(msg, is_error=False, category="general"):
                print(f"LOG: {msg}")
        
        # Get job type from request body
        data = request.get_json() or {}
        job_type = data.get('job_type', 'unknown')
        
        deleted = False
        deleted_from = None
        
        # Try to delete from pending previews
        pending_previews = print_queue.get_pending_previews()
        if job_id in pending_previews:
            del pending_previews[job_id]
            deleted = True
            deleted_from = "pending_previews"
            log_message(f"🗑️ Deleted job {job_id} from pending previews", category="queue")
        
        # Try to delete from job tracker
        job_tracker = print_queue.get_job_tracker()
        if job_id in job_tracker:
            del job_tracker[job_id]
            deleted = True
            deleted_from = deleted_from or "job_tracker"
            log_message(f"🗑️ Deleted job {job_id} from job tracker", category="queue")
        
        # Try to delete from printed jobs
        printed_jobs = print_queue.get_printed_jobs()
        for i, job in enumerate(printed_jobs):
            if job.get('id') == job_id:
                printed_jobs.pop(i)
                deleted = True
                deleted_from = deleted_from or "printed_jobs"
                log_message(f"🗑️ Deleted job {job_id} from printed jobs", category="queue")
                break
        
        if deleted:
            return jsonify({
                "success": True,
                "message": f"Job {job_id} deleted successfully from {deleted_from}",
                "deleted_from": deleted_from
            })
        else:
            return jsonify({
                "success": False,
                "error": f"Job {job_id} not found in any queue"
            }), 404
    
    except Exception as e:
        import sys
        if 'print_dashboard_insepctionapp' in sys.modules:
            log_message = sys.modules['print_dashboard_insepctionapp'].log_message
            log_message(f"❌ Error deleting job {job_id}: {str(e)}", is_error=True, category="queue")
        return jsonify({"success": False, "error": str(e)}), 500

@print_job_bp.route("/edit-job/<job_id>", methods=["PUT"])
def edit_job(job_id):
    """Edit a job's properties"""
    try:
        import sys
        
        # Get log function
        if 'print_dashboard_insepctionapp' in sys.modules:
            log_message = sys.modules['print_dashboard_insepctionapp'].log_message
        else:
            def log_message(msg, is_error=False, category="general"):
                print(f"LOG: {msg}")
        
        # Get update data from request body
        data = request.get_json() or {}
        form_name = data.get('form_name')
        printer_name = data.get('printer_name')
        priority = data.get('priority')
        
        updated = False
        updated_in = None
        
        # Try to update in pending previews
        pending_previews = print_queue.get_pending_previews()
        if job_id in pending_previews:
            job = pending_previews[job_id].get('job', {})
            if form_name:
                job['formName'] = form_name
            if printer_name:
                job['printerName'] = printer_name
                job['printerId'] = printer_name
            if priority:
                job['priority'] = priority
            updated = True
            updated_in = "pending_previews"
            log_message(f"✏️ Updated job {job_id} in pending previews", category="queue")
        
        # Try to update in job tracker
        job_tracker = print_queue.get_job_tracker()
        if job_id in job_tracker:
            job = job_tracker[job_id]
            if form_name:
                job['formName'] = form_name
                job['form_name'] = form_name
            if printer_name:
                job['printerName'] = printer_name
                job['printer_name'] = printer_name
                job['printerId'] = printer_name
            if priority:
                job['priority'] = priority
            updated = True
            updated_in = updated_in or "job_tracker"
            log_message(f"✏️ Updated job {job_id} in job tracker", category="queue")
        
        # Try to update in printed jobs
        printed_jobs = print_queue.get_printed_jobs()
        for job in printed_jobs:
            if job.get('id') == job_id:
                if form_name:
                    job['formName'] = form_name
                if printer_name:
                    job['printerName'] = printer_name
                    job['printerId'] = printer_name
                if priority:
                    job['priority'] = priority
                updated = True
                updated_in = updated_in or "printed_jobs"
                log_message(f"✏️ Updated job {job_id} in printed jobs", category="queue")
                break
        
        if updated:
            return jsonify({
                "success": True,
                "message": f"Job {job_id} updated successfully",
                "updated_in": updated_in
            })
        else:
            return jsonify({
                "success": False,
                "error": f"Job {job_id} not found in any queue"
            }), 404
    
    except Exception as e:
        import sys
        if 'print_dashboard_insepctionapp' in sys.modules:
            log_message = sys.modules['print_dashboard_insepctionapp'].log_message
            log_message(f"❌ Error editing job {job_id}: {str(e)}", is_error=True, category="queue")
        return jsonify({"success": False, "error": str(e)}), 500 