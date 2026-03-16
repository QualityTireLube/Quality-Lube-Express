"""
Print queue management and job processing for the Print Client Dashboard.
Handles print job lifecycle, PDF processing, preview approval, and local printer integration.

KEY FEATURES:
- Brother QL-800 PDF Translation: Automatically optimizes PDFs for 90mm x 29mm labels
- Preview System: Shows EXACT PDF that will print (translated if needed)
- Content Clipping Fix: Prevents "Voice Numb" cutoff and missing corner content
- Smart Preview: Brother QL-800 users see pre-translated PDF in preview

REQUIREMENTS:
- PyPDF2==3.0.1 (for Brother QL-800 PDF translation to fix content clipping)
- Install with: pip install PyPDF2==3.0.1
- Added to requirements.txt for automated installation

Refactored from print_dashboard_insepctionapp.py on 2024
"""
import os
import time
import base64
import tempfile
import subprocess
from datetime import datetime
import glob
import json

# Print queue global state - Section 4: Print queue refactored 2024
CANCELLED_JOBS = set()
PRINTED_JOBS = []
PENDING_PREVIEWS = {}  # Store jobs pending preview approval
JOB_TRACKER = {}  # Track jobs by ID with their current status
AUTO_APPROVAL_ENABLED = True
PRINTER_SETTINGS = {}  # Per-printer settings for paper size and orientation
PRINTER_LOGS = {}  # Store comprehensive printer logs by job ID

def add_to_printed_jobs(job):
    """Add a job to the printed jobs list for dashboard display"""
    global PRINTED_JOBS
    
    job_id = job.get('id', 'unknown')
    form_name = job.get('formName', 'Unknown')
    printer_id = job.get('printerId', 'unknown')
    priority = job.get('priority', 'normal')
    job_data = job.get('jobData', {})
    
    printed_job = {
        'id': job_id,
        'formName': form_name,
        'printerId': printer_id,
        'priority': priority,
        'jobData': job_data,
        'completedAt': datetime.now().isoformat(),
        'timestamp': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        'type': job_data.get('type', 'unknown'),
        'isTestJob': job_data.get('isTestJob', False)
    }
    
    PRINTED_JOBS.append(printed_job)
    
    # Keep only last 50 printed jobs
    if len(PRINTED_JOBS) > 50:
        PRINTED_JOBS.pop(0)

def update_job_status(job_id, status, queue_logs, log_message_func, form_name=None, printer_name=None, priority=None):
    """Update job status in tracker and logs"""
    global JOB_TRACKER
    
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    short_id = job_id[:8] + "..." if len(job_id) > 8 else job_id
    
    # Initialize job if not exists
    if job_id not in JOB_TRACKER:
        JOB_TRACKER[job_id] = {
            'short_id': short_id,
            'form_name': form_name or 'unknown',
            'printer_name': printer_name or 'unknown',
            'priority': priority or 'normal',
            'status': 'claimed',
            'log_index': None,
            'created_at': timestamp
        }
    
    # Update status
    JOB_TRACKER[job_id]['status'] = status
    
    # Create or update log entry
    status_icons = {
        'claimed': '📥',
        'pending': '⏳', 
        'printing': '🖨️',
        'completed': '✅',
        'failed': '❌'
    }
    
    icon = status_icons.get(status, '📄')
    job_info = JOB_TRACKER[job_id]
    
    log_line = f"[{timestamp}] {icon} {short_id} | {job_info['form_name']} | {job_info['printer_name']} | {status.upper()}"
    
    # Update existing log entry or create new one
    if job_info['log_index'] is not None and job_info['log_index'] < len(queue_logs):
        queue_logs[job_info['log_index']] = log_line
    else:
        queue_logs.append(log_line)
        job_info['log_index'] = len(queue_logs) - 1
    
    # Print to console
    print(f"🖨️  {log_line}")

def handle_pdf_print_job(job, api_client_module, app, log_message_func):
    """Handle PDF print jobs with preview functionality"""
    job_id = job.get('id', 'unknown')
    job_data = job.get('jobData', {})
    
    print(f"🔍 DEBUG: Handling PDF print job {job_id}")
    print(f"🎯 PDF FIDELITY MODE: Will preserve exact dimensions from cloud app")
    
    try:
        # Decode base64 PDF data
        pdf_base64 = job_data.get('pdfData')
        if not pdf_base64:
            print(f"❌ No PDF data found in job {job_id}")
            return False
        
        # Decode base64 to binary PDF
        pdf_binary = base64.b64decode(pdf_base64)
        
        # Create temporary PDF file
        with tempfile.NamedTemporaryFile(mode='wb', suffix='.pdf', delete=False) as f:
            f.write(pdf_binary)
            temp_pdf_path = f.name
        
        print(f"✅ PDF decoded and saved to: {temp_pdf_path}")
        print(f"📄 PDF size: {len(pdf_binary)} bytes")
        
        # Verify PDF for fidelity printing
        verify_pdf_dimensions(temp_pdf_path, job_id)
        
        # Test orientation detection (for debugging)
        test_orientation_detection(job)
        
        # Additional debugging for Brother QL-800
        printer_id = job.get('printerId', '')
        is_brother_ql800 = (
            'brother' in printer_id.lower() and 
            ('ql-800' in printer_id.lower() or 'ql_800' in printer_id.lower())
        )
        
        if is_brother_ql800:
            print(f"\n🏷️ BROTHER QL-800 DETECTED - Running additional diagnostics...")
            debug_brother_ql800_capabilities()
        
        # Get print summary for logging
        print_summary = get_pdf_print_summary(job)
        
        # Apply PDF translation for preview if needed (Brother QL-800)
        preview_pdf_path = temp_pdf_path
        is_brother_ql800 = job.get('printerId', '').lower()
        is_brother_ql800 = 'brother' in is_brother_ql800 and ('ql-800' in is_brother_ql800 or 'ql_800' in is_brother_ql800)
        
        if is_brother_ql800:
            print(f"\n📋 BROTHER QL-800 PREVIEW: Applying PDF translation for preview")
            print(f"🎯 IMPORTANT: Preview will show the EXACT PDF that Brother QL-800 will receive")
            print(f"📏 This includes dimension optimization and content scaling")
            
            # Apply PDF translation to create the preview
            translated_pdf_path = translate_pdf_for_brother_ql800(temp_pdf_path, job)
            if translated_pdf_path != temp_pdf_path:
                preview_pdf_path = translated_pdf_path
                print(f"✅ Preview will show Brother QL-800 optimized PDF")
                print(f"🔍 You'll see exactly what the printer will receive")
            else:
                print(f"⚠️ PDF translation failed - preview shows original PDF")
        
        # Check if auto approval is enabled
        if get_auto_approval_status():
            print(f"🚀 Auto approval enabled - printing PDF directly with exact fidelity")
            return print_pdf_directly(preview_pdf_path, job, api_client_module, app)
        else:
            # Store the preview-ready PDF (translated for Brother QL-800 if applicable)
            PENDING_PREVIEWS[job_id] = {
                'job': job,
                'pdf_path': preview_pdf_path,
                'original_pdf_path': temp_pdf_path,  # Keep reference to original
                'metadata': {
                    'size_bytes': len(pdf_binary),
                    'created_at': datetime.now().isoformat(),
                    'print_summary': print_summary,
                    'is_translated': preview_pdf_path != temp_pdf_path,
                    'printer_optimized': is_brother_ql800
                }
            }
            
            if is_brother_ql800:
                print(f"📋 Brother QL-800 optimized PDF stored for preview approval.")
                print(f"🎯 Preview shows the EXACT PDF that will print (translated dimensions)")
                print(f"✅ Check for: Full Invoice Number, all corners visible, proper positioning")
                log_message_func(f"📋 Brother QL-800 PDF job {job_id} translated and ready for preview", category="queue")
            else:
                print(f"📋 PDF stored for preview approval. Job {job_id} pending approval.")
                print(f"🎯 When approved, will print with exact fidelity (no modifications)")
                log_message_func(f"📋 PDF job {job_id} requires manual approval - will print with exact fidelity", category="queue")
            return "pending_approval"
    
    except Exception as e:
        print(f"❌ Error processing PDF job {job_id}: {str(e)}")
        return False

def print_pdf_directly(pdf_path, job, api_client_module=None, app=None):
    """Print PDF directly to printer with exact fidelity (no modifications)"""
    try:
        job_id = job.get('id', 'unknown')
        printer_id = job.get('printerId', 'unknown')
        
        # Get system printer name
        system_printer_name = api_client_module.get_system_printer_name(printer_id, app) if api_client_module and app else printer_id
        
        if not system_printer_name:
            print(f"❌ Printer {printer_id} not found")
            return False
        
        # Resolve CUPS printer name
        cups_printer_name = resolve_cups_printer_name(system_printer_name)
        
        # Get job options for copies
        job_config = job.get('configuration', {})
        copies = job_config.get('copies', 1)
        
        print(f"🖨️ PASSTHROUGH MODE: Printing PDF with exact fidelity to: {cups_printer_name}")
        print(f"📄 No scaling, no margins, no paper size overrides applied")
        print(f"🎯 PDF will print at original dimensions as designed in cloud app")
        print(f"📄 Copies: {copies}")
        
        # ENHANCED DEBUGGING FOR CONTENT CLIPPING ISSUES
        print(f"\n🔍 DEBUGGING CONTENT CLIPPING ISSUE:")
        print(f"   📄 PDF File: {pdf_path}")
        print(f"   🖨️ Target Printer: {cups_printer_name}")
        print(f"   🆔 Job ID: {job_id}")
        print(f"   🏷️ Job Orientation: {job.get('configuration', {}).get('orientation', 'unknown')}")
        
        # Check if this is Brother QL-800 and apply PDF translation (if not already translated)
        if 'brother' in cups_printer_name.lower() and 'ql' in cups_printer_name.lower():
            # Check if PDF is already translated (filename contains '_brother_ql800')
            is_already_translated = '_brother_ql800' in pdf_path
            
            if is_already_translated:
                print(f"\n🏷️ BROTHER QL-800 DETECTED - PDF ALREADY TRANSLATED:")
                print(f"   ✅ PDF OPTIMIZED: Using pre-translated Brother QL-800 PDF")
                print(f"   📏 DIMENSIONS: Already scaled to 90mm x 29mm label size")
                print(f"   🎯 READY TO PRINT: No additional translation needed")
            else:
                print(f"\n🏷️ BROTHER QL-800 DETECTED - APPLYING PDF TRANSLATION:")
                print(f"   🔧 NEW APPROACH: Modify PDF itself instead of using CUPS options")
                print(f"   ❌ PREVIOUS ISSUES: Content clipping, 'Voice Numb' cutoff, missing corners")
                print(f"   ✅ SOLUTION: Translate PDF to exact Brother QL-800 dimensions")
                print(f"   🎯 GOAL: Perfect fit - all content visible in correct positions")
                
                # Apply PDF translation for Brother QL-800
                original_pdf_path = pdf_path
                pdf_path = translate_pdf_for_brother_ql800(pdf_path, job)
                
                if pdf_path != original_pdf_path:
                    print(f"   ✅ PDF translation successful - using optimized PDF")
                else:
                    print(f"   ⚠️ PDF translation failed - using original PDF")
        
        # Get job-specified print options (orientation and copies)  
        pdf_options = get_pdf_print_options(job)
        
        # Additional debugging for Brother QL-800
        printer_id = job.get('printerId', '')
        is_brother_ql800 = (
            'brother' in printer_id.lower() and 
            ('ql-800' in printer_id.lower() or 'ql_800' in printer_id.lower())
        )
        
        if is_brother_ql800:
            print(f"\n🏷️ BROTHER QL-800 PRINTING - Generating test commands...")
            create_brother_ql800_test_command(job, pdf_path)
        
        # Use lp command with job-specified orientation for PDF-to-print matching
        cmd = ['lp', '-d', cups_printer_name] + pdf_options + [pdf_path]
        # Update debug output based on whether PDF was translated
        if 'brother' in cups_printer_name.lower() and 'ql' in cups_printer_name.lower():
            print(f"\n🔍 BROTHER QL-800 OPTIMIZED PRINT COMMAND:")
            print(f"   COMMAND: {' '.join(cmd)}")
            print(f"   CUPS OPTIONS: {pdf_options} (minimal for Brother)")
            print(f"   PDF PATH: {pdf_path}")
            print(f"   🔧 PDF TRANSLATION: Applied Brother QL-800 dimension optimization")
            print(f"   📏 EXACT FIT: PDF sized for 90mm x 29mm label")
            print(f"   ✅ EXPECTED: Full Invoice Number, all corners visible, no clipping")
        else:
            print(f"\n🔍 STANDARD PDF PRINT COMMAND:")
            print(f"   COMMAND: {' '.join(cmd)}")
            print(f"   CUPS OPTIONS: {pdf_options}")
            print(f"   PDF PATH: {pdf_path}")
            print(f"   📄 Standard PDF printing with exact fidelity")
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        
        # Get paper size for logging
        detected_paper_size = None
        if job and 'jobData' in job:
            detected_paper_size = job['jobData'].get('paperSize') or job['jobData'].get('templateInfo', {}).get('paperSize')
        
        # Log comprehensive printer response and store for job details
        printer_log = log_comprehensive_printer_response(cmd, result, cups_printer_name, job.get('id'), detected_paper_size)
        if job and job.get('id'):
            PRINTER_LOGS[job.get('id')] = printer_log
        
        if result.returncode == 0:
            if 'brother' in cups_printer_name.lower() and 'ql' in cups_printer_name.lower():
                print(f"✅ BROTHER QL-800 PDF TRANSLATION PRINT SUCCESSFUL!")
                print(f"🧪 CRITICAL TEST: Check label for ALL content - this should fix clipping!")
                print(f"   ✅ Expected: Full 'Invoice Number' (not 'Voice Numb')")
                print(f"   ✅ Expected: Name & Date in top left corner")
                print(f"   ✅ Expected: Tire Size in bottom left corner")
                print(f"   ✅ Expected: Tire Status in top right corner")
                print(f"   ✅ Expected: No content shifted to right side")
                print(f"   🎯 PDF Translation optimized for Brother QL-800 90mm x 29mm labels")
            else:
                print(f"✅ PDF printed successfully with exact fidelity")
            
            # Clean up temp file
            try:
                os.unlink(pdf_path)
                print(f"🧹 Cleaned up PDF file: {pdf_path}")
            except Exception as e:
                print(f"⚠️ Could not delete temp PDF: {e}")
            return True
        else:
            print(f"❌ PDF print failed - see comprehensive log above for details")
            return False
            
    except Exception as e:
        print(f"❌ Error printing PDF: {str(e)}")
        return False

def resolve_cups_printer_name(system_printer_name):
    """Resolve and validate printer name for CUPS"""
    # Check for custom Brother QL-800 printer first (highest priority)
    if "Brother" in system_printer_name and ("QL" in system_printer_name or "QL-800" in system_printer_name):
        try:
            result = subprocess.run(['lpstat', '-p', 'Brother_QL800_29x90mm'], capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                print(f"🎯 Using custom Brother QL-800: Brother_QL800_29x90mm (instead of {system_printer_name})")
                return "Brother_QL800_29x90mm"
        except:
            pass
    
    # Ensure printer name is properly formatted for CUPS
    cups_printer_name = system_printer_name.strip()
    
    print(f"🔍 DEBUG: Resolving CUPS printer name for: '{system_printer_name}'")
    print(f"🔍 DEBUG: Initial cups_printer_name: '{cups_printer_name}'")
    
    # Check if printer exists in CUPS
    try:
        check_cmd = ['lpstat', '-p', cups_printer_name]
        print(f"🔍 DEBUG: Checking printer with command: {' '.join(check_cmd)}")
        check_result = subprocess.run(check_cmd, capture_output=True, text=True, timeout=5)
        print(f"🔍 DEBUG: lpstat return code: {check_result.returncode}")
        print(f"🔍 DEBUG: lpstat stdout: {check_result.stdout}")
        print(f"🔍 DEBUG: lpstat stderr: {check_result.stderr}")
        
        if check_result.returncode == 0:
            print(f"✅ Printer '{cups_printer_name}' found and available")
            return cups_printer_name
        
        # Try alternative formats if the exact name doesn't work
        print(f"⚠️ Printer '{cups_printer_name}' not found, trying alternatives...")
        
        # Try with underscores instead of spaces
        if ' ' in cups_printer_name:
            alt_name = cups_printer_name.replace(' ', '_')
            print(f"🔧 Trying underscore format: '{alt_name}'")
            check_cmd_alt = ['lpstat', '-p', alt_name]
            check_result_alt = subprocess.run(check_cmd_alt, capture_output=True, text=True, timeout=5)
            if check_result_alt.returncode == 0:
                print(f"✅ Found printer with underscores: '{alt_name}'")
                return alt_name
        
        # Try with spaces escaped
        if ' ' in cups_printer_name:
            alt_name = cups_printer_name.replace(' ', '\\ ')
            print(f"🔧 Trying escaped spaces: '{alt_name}'")
            # Note: we can't easily test this with lpstat, but we'll return it for lp to try
            print(f"⚠️  Will try escaped format in lp command: '{alt_name}'")
            return alt_name
            
    except Exception as e:
        print(f"⚠️  Could not check printer status: {e}")
    
    # Return original name as fallback
    print(f"🔄 Using original printer name as fallback: '{cups_printer_name}'")
    return cups_printer_name

def get_sticker_print_options(job_data, metadata, printer_id=None, job=None):
    """Get print options for sticker/label printing"""
    print(f"🏷️ DEBUG: Getting print options for printer {printer_id}")
    
    # Debug: Show job data structure for paper size detection
    if job:
        print(f"🔍 DEBUG: Job structure keys: {list(job.keys())}")
        if 'jobData' in job:
            print(f"🔍 DEBUG: jobData keys: {list(job['jobData'].keys())}")
            if 'paperSize' in job['jobData']:
                print(f"🔍 DEBUG: Found jobData.paperSize: {job['jobData']['paperSize']}")
            if 'templateInfo' in job['jobData']:
                template_info = job['jobData']['templateInfo']
                print(f"🔍 DEBUG: templateInfo keys: {list(template_info.keys())}")
                if 'paperSize' in template_info:
                    print(f"🔍 DEBUG: Found templateInfo.paperSize: {template_info['paperSize']}")
    
    # Check if we should apply printer settings to this job
    if not should_apply_printer_settings(job_data, metadata):
        print(f"🎯 PDF job detected - using job-specified options only")
        # For PDF jobs, use job-specified orientation while preserving fidelity
        if job:
            return get_pdf_print_options(job)
        else:
            print(f"⚠️ No job data provided for PDF orientation detection, using minimal options")
            return []
    
    # Get printer-specific settings (only for non-PDF jobs)
    printer_settings = PRINTER_SETTINGS.get(printer_id, {}) if printer_id else {}
    orientation = printer_settings.get('orientation', 'portrait')
    
    print(f"🏷️ DEBUG: Printer settings: {printer_settings}")
    print(f"🏷️ DEBUG: Orientation: {orientation}")
    
    # Common sticker options
    if printer_settings:
        print(f"🏷️ Using custom printer settings for {printer_id}")
        
        # Use custom paper size if configured
        paper_size = printer_settings.get('paper_size', 'default')
        
        # Map paper size to CUPS format if needed
        job_paper_size = None
        
        # Check multiple sources for paper size (in order of preference)
        if job:
            # First check jobData.paperSize (new template-based approach)
            if 'jobData' in job and job['jobData'].get('paperSize'):
                job_paper_size = job['jobData'].get('paperSize')
                print(f"📋 Using jobData.paperSize: '{job_paper_size}'")
            # Second check jobData.templateInfo.paperSize 
            elif 'jobData' in job and job['jobData'].get('templateInfo', {}).get('paperSize'):
                job_paper_size = job['jobData']['templateInfo']['paperSize']
                print(f"🏷️ Using templateInfo.paperSize: '{job_paper_size}'")
            # Fallback to configuration.paperSize (existing approach)
            elif 'configuration' in job and job['configuration'].get('paperSize'):
                job_paper_size = job['configuration']['paperSize']
                print(f"⚙️ Using configuration.paperSize: '{job_paper_size}'")
        
        if job_paper_size:
            cups_paper_size = map_paper_size_to_cups(job_paper_size, printer_id)
            print(f"🗺️ Job paper size mapping: '{job_paper_size}' → '{cups_paper_size}'")
        else:
            job_paper_size = 'Brother-QL800'  # Default fallback
            cups_paper_size = map_paper_size_to_cups(job_paper_size, printer_id)
            print(f"🔄 Using default paper size: '{job_paper_size}' → '{cups_paper_size}'")
        
        if paper_size == 'custom' or cups_paper_size == 'Custom':
            print(f"🏷️ Using custom dimensions")
            # Custom dimensions - for Brother QL-800 stickers
            custom_width = printer_settings.get('custom_width', '1.8125')
            custom_height = printer_settings.get('custom_height', '2.5')
            unit = printer_settings.get('unit', 'inches')
            
            return [
                '-o', 'media=Custom',
                '-o', 'fit-to-page'
            ]
        else:
            print(f"🏷️ Using mapped paper size: {cups_paper_size}")
            return [
                '-o', f'media={cups_paper_size}',
                '-o', 'fit-to-page'
            ]
    else:
        # Default sticker options for Brother QL-800 or similar
        print(f"🏷️ Using default sticker settings")
        
        # Try to detect if this is a document vs sticker
        if 'width' in job_data or 'height' in job_data:
            # This looks like a document, use standard sizes
            custom_width = printer_settings.get('custom_width', '8.5')
            custom_height = printer_settings.get('custom_height', '11')
            unit = printer_settings.get('unit', 'inches')
            
            return [
                '-o', 'fit-to-page'
            ]
        else:
            # This looks like a sticker
            return [
                '-o', 'media=Custom',
                '-o', 'fit-to-page'
            ]

def approve_preview(job_id, api_client_module, app, log_message_func, enhanced_config=None):
    """Approve a previewed job and print it"""
    if job_id not in PENDING_PREVIEWS:
        return False, f"Job {job_id} not found in preview queue"
    
    preview_data = PENDING_PREVIEWS[job_id]
    job = preview_data['job']
    pdf_path = preview_data['pdf_path']
    metadata = preview_data.get('metadata', {})
    is_translated = metadata.get('is_translated', False)
    printer_optimized = metadata.get('printer_optimized', False)
    
    # Apply enhanced configuration if provided (for template-based printing)
    if enhanced_config:
        log_message_func(f"🎯 Applying template-enhanced configuration: {enhanced_config.get('templateInfo', {}).get('templateName', 'Unknown')}")
        # Merge enhanced config into job configuration
        if 'configuration' not in job:
            job['configuration'] = {}
        job['configuration'].update(enhanced_config)
    
    try:
        # Get printer information
        printer_id = job.get('printerId', 'unknown')
        system_printer_name = api_client_module.get_system_printer_name(printer_id, app)
        
        print(f"🔍 DEBUG: Printer ID: '{printer_id}'")
        print(f"🔍 DEBUG: System printer name: '{system_printer_name}'")
        
        if not system_printer_name:
            return False, f"Printer {printer_id} not found"
        
        # Resolve CUPS printer name
        cups_printer_name = resolve_cups_printer_name(system_printer_name)
        print(f"🔍 DEBUG: Resolved CUPS printer name: '{cups_printer_name}'")
        
        # Print the PDF - with special handling for pre-translated PDFs
        if is_translated and printer_optimized:
            print(f"🖨️ BROTHER QL-800 APPROVED: Printing pre-optimized PDF to: {cups_printer_name}")
            print(f"✅ PDF ALREADY TRANSLATED: Using Brother QL-800 optimized dimensions")
            print(f"🎯 EXACT PREVIEW MATCH: What you saw in preview is what will print")
            print(f"📏 PDF pre-scaled to 90mm x 29mm Brother QL-800 label size")
        else:
            print(f"🖨️ PASSTHROUGH MODE: Printing approved PDF with exact fidelity to: {cups_printer_name}")
            print(f"📄 No scaling, no margins, no paper size overrides applied")
            print(f"🎯 PDF will print at original dimensions as designed in cloud app")
        
        # Get print options - avoid re-translation for Brother QL-800 if already translated
        if is_translated and printer_optimized:
            print(f"\n📋 BROTHER QL-800 APPROVAL: Skipping PDF translation - already optimized")
            print(f"🔧 Using minimal CUPS options for pre-translated PDF")
            # Extract auto_cut setting from job data (default to True if not specified)
            job_data = job.get('jobData', {})
            auto_cut = job_data.get('autoCut', job_data.get('metadata', {}).get('autoCut', True))
            # Use minimal options for Brother QL-800 since PDF is already optimized
            pdf_options = get_brother_ql800_minimal_options(get_job_specified_orientation(job), 1, auto_cut)
        else:
            # Get job-specified print options (orientation only, no other modifications)
            pdf_options = get_pdf_print_options(job)
        
        # Additional debugging for Brother QL-800
        printer_id = job.get('printerId', '')
        is_brother_ql800 = (
            'brother' in printer_id.lower() and 
            ('ql-800' in printer_id.lower() or 'ql_800' in printer_id.lower())
        )
        
        if is_brother_ql800 and not is_translated:
            print(f"\n🏷️ BROTHER QL-800 APPROVAL PRINTING - Generating test commands...")
            create_brother_ql800_test_command(job, pdf_path)
        elif is_brother_ql800 and is_translated:
            print(f"\n🏷️ BROTHER QL-800 APPROVAL: Using pre-optimized PDF")
            print(f"✅ PDF dimensions already perfect for Brother QL-800")
            print(f"🎯 Preview showed exact result - no surprises on print")
        
        # Use lp command with job-specified orientation for PDF-to-print matching
        cmd = ['lp', '-d', cups_printer_name] + pdf_options + [pdf_path]
        print(f"🔍 EXECUTING: {' '.join(cmd)}")
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        
        # Get paper size for logging
        detected_paper_size = None
        if job and 'jobData' in job:
            detected_paper_size = job['jobData'].get('paperSize') or job['jobData'].get('templateInfo', {}).get('paperSize')
        
        # Log comprehensive printer response and store for job details
        printer_log = log_comprehensive_printer_response(cmd, result, cups_printer_name, job.get('id'), detected_paper_size)
        if job and job.get('id'):
            PRINTER_LOGS[job.get('id')] = printer_log
        
        if result.returncode == 0:
            print(f"✅ PDF printed successfully with exact fidelity")
            # Clean up
            try:
                os.unlink(pdf_path)
                del PENDING_PREVIEWS[job_id]
            except Exception as e:
                print(f"⚠️ Cleanup error: {e}")
            
            return True, f"Job {job_id} printed successfully"
        else:
            print(f"❌ PDF print failed - see comprehensive log above for details")
            return False, f"Print failed: {result.stderr}"
            
    except Exception as e:
        print(f"❌ Error approving job {job_id}: {str(e)}")
        return False, f"Error: {str(e)}"

def reject_preview(job_id):
    """Reject a previewed job"""
    if job_id not in PENDING_PREVIEWS:
        return False, f"Job {job_id} not found in preview queue"
    
    preview_data = PENDING_PREVIEWS[job_id]
    pdf_path = preview_data['pdf_path']
    original_pdf_path = preview_data.get('original_pdf_path')
    metadata = preview_data.get('metadata', {})
    is_translated = metadata.get('is_translated', False)
    
    try:
        # Clean up PDF files
        files_cleaned = []
        
        # Clean up the preview PDF (translated if applicable)
        if os.path.exists(pdf_path):
            os.unlink(pdf_path)
            files_cleaned.append(pdf_path)
        
        # Clean up original PDF if it's different from preview PDF
        if original_pdf_path and original_pdf_path != pdf_path and os.path.exists(original_pdf_path):
            os.unlink(original_pdf_path)
            files_cleaned.append(original_pdf_path)
        
        del PENDING_PREVIEWS[job_id]
        
        if is_translated:
            print(f"🚫 Brother QL-800 job {job_id} rejected - cleaned up translated and original PDFs")
            print(f"🧹 Files cleaned: {files_cleaned}")
        else:
            print(f"🚫 Job {job_id} rejected and cleaned up")
            print(f"🧹 Files cleaned: {files_cleaned}")
        
        return True, f"Job {job_id} rejected successfully"
        
    except Exception as e:
        print(f"❌ Error rejecting job {job_id}: {str(e)}")
        return False, f"Error: {str(e)}"

def verify_pdf_dimensions(pdf_path, job_id=None):
    """
    Verify PDF dimensions for print fidelity checking.
    
    Returns dimensions and helpful info for ensuring exact print matching.
    """
    try:
        # Try to get PDF dimensions using basic file analysis
        import struct
        
        with open(pdf_path, 'rb') as f:
            # Look for PDF page dimensions in the file
            content = f.read(2048)  # Read first 2KB for basic info
            
        # Basic PDF info
        file_size = os.path.getsize(pdf_path)
        
        print(f"📄 PDF Analysis for Job {job_id}:")
        print(f"   File Size: {file_size:,} bytes")
        print(f"   File Path: {pdf_path}")
        print(f"🎯 PRINT MODE: Exact fidelity - PDF will print at original dimensions")
        print(f"📏 No scaling, margins, or size adjustments will be applied")
        
        return True, {
            'file_size': file_size,
            'message': 'PDF ready for exact fidelity printing',
            'print_mode': 'passthrough'
        }
        
    except Exception as e:
        print(f"⚠️ Could not analyze PDF dimensions: {e}")
        print(f"📄 Will still print with exact fidelity mode")
        return True, {
            'message': 'PDF ready for printing (analysis unavailable)',
            'print_mode': 'passthrough'
        }

def get_pdf_print_summary(job):
    """Get a summary of how a PDF job will be printed"""
    job_data = job.get('jobData', {})
    printer_id = job.get('printerId', 'unknown')
    orientation = get_job_specified_orientation(job)
    
    summary = {
        'print_mode': 'PDF Passthrough + Job Orientation',
        'modifications': f'Job orientation only ({orientation})',
        'scaling': 'None (1:1)',
        'margins': 'None (PDF native)',
        'paper_size': 'PDF native dimensions',
        'orientation': f'{orientation} (from job specification)',
        'quality': 'High (CUPS default)',
        'printer_settings_applied': False,
        'expected_result': 'Identical to cloud-generated PDF with correct orientation'
    }
    
    print(f"📊 PDF Print Summary for {job.get('id', 'unknown')}:")
    for key, value in summary.items():
        print(f"   {key.replace('_', ' ').title()}: {value}")
    
    return summary

def test_orientation_detection(job):
    """Test function to verify orientation detection is working correctly"""
    print(f"\n🧪 ORIENTATION TEST for Job {job.get('id', 'unknown')}:")
    print(f"📋 Raw job data structure:")
    
    # Show all potential orientation sources
    config = job.get('configuration', {})
    job_data = job.get('jobData', {})
    metadata = job_data.get('metadata', {})
    printer_id = job.get('printerId', '')
    
    print(f"   configuration.orientation: {config.get('orientation', 'NOT FOUND')}")
    print(f"   jobData.metadata.orientation: {metadata.get('orientation', 'NOT FOUND')}")
    print(f"   jobData.orientation: {job_data.get('orientation', 'NOT FOUND')}")
    print(f"   printerId: {printer_id}")
    
    # Check if Brother QL-800
    is_brother_ql800 = (
        'brother' in printer_id.lower() and 
        ('ql-800' in printer_id.lower() or 'ql_800' in printer_id.lower())
    )
    print(f"   🏷️ Is Brother QL-800: {is_brother_ql800}")
    
    # Test the detection function
    detected_orientation = get_job_specified_orientation(job)
    print(f"🎯 DETECTED ORIENTATION: {detected_orientation}")
    
    # Show the CUPS options that will be generated
    pdf_options = get_pdf_print_options(job)
    print(f"🖨️ CUPS OPTIONS: {pdf_options}")
    
    # Show the full command that will be executed
    printer_name = config.get('systemPrinterName', 'Brother_QL_800')
    print(f"🔍 FULL COMMAND PREVIEW: lp -d {printer_name} {' '.join(pdf_options)} /path/to/label.pdf")
    
    return detected_orientation

# Getter functions for global state
def get_printed_jobs():
    """Get the list of printed jobs"""
    return PRINTED_JOBS

def get_pending_previews():
    """Get the pending previews dict"""
    return PENDING_PREVIEWS

def get_preview_info(job_id):
    """Get detailed preview information including translation status"""
    if job_id not in PENDING_PREVIEWS:
        return None
    
    preview_data = PENDING_PREVIEWS[job_id]
    metadata = preview_data.get('metadata', {})
    job = preview_data['job']
    
    info = {
        'job_id': job_id,
        'pdf_path': preview_data['pdf_path'],
        'is_translated': metadata.get('is_translated', False),
        'printer_optimized': metadata.get('printer_optimized', False),
        'size_bytes': metadata.get('size_bytes', 0),
        'created_at': metadata.get('created_at', ''),
        'printer_id': job.get('printerId', 'unknown'),
        'orientation': job.get('configuration', {}).get('orientation', 'unknown')
    }
    
    # Add preview description
    if info['is_translated'] and info['printer_optimized']:
        info['preview_description'] = "🏷️ Brother QL-800 Optimized PDF - Shows EXACT printer output"
        info['preview_details'] = [
            "✅ PDF translated to 90mm x 29mm Brother QL-800 dimensions",
            "✅ Content scaled to prevent clipping",
            "✅ This preview matches exactly what will print",
            "🎯 Check: Full Invoice Number, all corners visible"
        ]
    else:
        info['preview_description'] = "📄 Original PDF - Standard preview"
        info['preview_details'] = [
            "📄 Original PDF as created by cloud app",
            "🖨️ Will print with exact fidelity (no modifications)"
        ]
    
    return info

def get_job_tracker():
    """Get the job tracker dict"""
    return JOB_TRACKER

def get_cancelled_jobs():
    """Get the cancelled jobs set"""
    return CANCELLED_JOBS

def get_auto_approval_status():
    """Get auto approval status"""
    return AUTO_APPROVAL_ENABLED

def set_auto_approval_status(enabled):
    """Set auto approval status"""
    global AUTO_APPROVAL_ENABLED
    AUTO_APPROVAL_ENABLED = enabled

def get_printer_settings():
    """Get printer settings dict"""
    return PRINTER_SETTINGS

def get_printer_log(job_id):
    """Get printer log for a specific job"""
    global PRINTER_LOGS
    return PRINTER_LOGS.get(job_id)

def clear_printer_settings():
    """Clear all printer settings"""
    global PRINTER_SETTINGS
    PRINTER_SETTINGS.clear()

def save_printer_setting(printer_id, settings):
    """Save settings for a specific printer"""
    global PRINTER_SETTINGS
    PRINTER_SETTINGS[printer_id] = settings

def should_apply_printer_settings(job_data, metadata=None):
    """
    Determine if printer settings should be applied to this job.
    
    Returns False for pre-formatted PDFs from cloud app to ensure exact fidelity.
    Returns True for local test jobs or text content where settings are helpful.
    """
    # NEVER apply settings to pre-formatted PDFs from cloud
    if job_data.get('type') == 'pdf-print' and job_data.get('pdfData'):
        print("🎯 Pre-formatted PDF detected - bypassing printer settings for exact fidelity")
        print("📐 Will check for job-specified orientation from cloud app")
        return False
    
    # Apply settings only to local test jobs or text content
    is_local_test = job_data.get('isTestJob', False)
    has_pdf_data = bool(job_data.get('pdfData'))
    
    if is_local_test and not has_pdf_data:
        print("🔧 Local test job - applying printer settings")
        return True
    elif not has_pdf_data:
        print("🔧 Text-based job - applying printer settings") 
        return True
    else:
        print("📄 PDF job - preserving original formatting")
        return False

def get_job_specified_orientation(job, printer_id=None):
    """
    Extract orientation from job data, falling back to local printer settings.
    
    Priority:
      1. Job configuration (set by the cloud app when submitting the job)
      2. Job metadata / jobData fields
      3. Local PRINTER_SETTINGS for this printer (configured in the print client dashboard)
      4. Hard default: 'portrait'
    """
    # Check configuration first (most authoritative)
    config = job.get('configuration', {})
    if config and config.get('orientation'):
        orientation = config.get('orientation')
        print(f"📐 Found job orientation in configuration: {orientation}")
        return orientation
    
    # Check metadata as fallback
    job_data = job.get('jobData', {})
    metadata = job_data.get('metadata', {})
    if metadata and metadata.get('orientation'):
        orientation = metadata.get('orientation')
        print(f"📐 Found job orientation in metadata: {orientation}")
        return orientation
    
    # Check top-level jobData
    if job_data.get('orientation'):
        orientation = job_data.get('orientation')
        print(f"📐 Found job orientation in jobData: {orientation}")
        return orientation

    # Fall back to local printer settings (configured in the print client dashboard).
    # This is the orientation the user explicitly set for this printer.
    resolved_printer_id = printer_id or job.get('printerId', '')
    if resolved_printer_id and resolved_printer_id in PRINTER_SETTINGS:
        saved_orientation = PRINTER_SETTINGS[resolved_printer_id].get('orientation', '')
        if saved_orientation:
            print(f"📐 Using printer settings orientation for '{resolved_printer_id}': {saved_orientation}")
            return saved_orientation

    # Hard default
    print(f"📐 No orientation found anywhere, using default: portrait")
    return 'portrait'

def get_pdf_print_options(job):
    """
    Get print options specifically for PDF jobs from cloud app.
    
    Applies job-specified orientation, copies, and paper size mapping while preserving PDF fidelity.
    """
    print(f"🎯 PDF PRINT OPTIONS DEBUG:")
    
    # Debug: Show job data structure for paper size detection
    if job:
        print(f"🔍 PDF DEBUG: Job structure keys: {list(job.keys())}")
        if 'jobData' in job:
            print(f"🔍 PDF DEBUG: jobData keys: {list(job['jobData'].keys())}")
            if 'paperSize' in job['jobData']:
                print(f"🔍 PDF DEBUG: Found jobData.paperSize: {job['jobData']['paperSize']}")
            if 'templateInfo' in job['jobData']:
                template_info = job['jobData']['templateInfo']
                print(f"🔍 PDF DEBUG: templateInfo keys: {list(template_info.keys())}")
                if 'paperSize' in template_info:
                    print(f"🔍 PDF DEBUG: Found templateInfo.paperSize: {template_info['paperSize']}")
    
    printer_id = job.get('printerId', '')
    orientation = get_job_specified_orientation(job, printer_id=printer_id)
    
    # Extract copies from job options
    job_config = job.get('configuration', {})
    copies = job_config.get('copies', 1)
    
    # Extract paper size from multiple sources (same logic as get_sticker_print_options)
    paper_size = None
    
    # Check multiple sources for paper size (in order of preference)
    if job:
        # First check jobData.paperSize (new template-based approach)
        if 'jobData' in job and job['jobData'].get('paperSize'):
            paper_size = job['jobData'].get('paperSize')
            print(f"📋 PDF: Using jobData.paperSize: '{paper_size}'")
        # Second check jobData.templateInfo.paperSize 
        elif 'jobData' in job and job['jobData'].get('templateInfo', {}).get('paperSize'):
            paper_size = job['jobData']['templateInfo']['paperSize']
            print(f"🏷️ PDF: Using templateInfo.paperSize: '{paper_size}'")
        # Fallback to configuration.paperSize (existing approach)
        elif job_config.get('paperSize'):
            paper_size = job_config['paperSize']
            print(f"⚙️ PDF: Using configuration.paperSize: '{paper_size}'")
    
    if not paper_size:
        paper_size = 'Brother-QL800'  # Default fallback
        print(f"🔄 PDF: Using default paper size: '{paper_size}'")
    
    print(f"🎯 PDF Print Options - Orientation: {orientation}, Copies: {copies}")
    print(f"🖨️ Printer ID: {printer_id}")
    print(f"📄 Final Paper Size: {paper_size}")
    
    # Map paper size to valid CUPS paper size
    cups_paper_size = map_paper_size_to_cups(paper_size, printer_id)
    print(f"🗺️ Mapped Paper Size: {cups_paper_size}")
    
    # Check if this is a Brother QL-800
    is_brother_ql800 = (
        'brother' in printer_id.lower() and 
        ('ql-800' in printer_id.lower() or 'ql_800' in printer_id.lower())
    )
    
    if is_brother_ql800:
        print(f"🏷️ Brother QL-800 detected - using label-specific options")
        print(f"📏 Paper Size: {cups_paper_size}")
        
        # Extract auto_cut setting from job data (default to True if not specified)
        job_data = job.get('jobData', {})
        auto_cut = job_data.get('autoCut', job_data.get('metadata', {}).get('autoCut', True))
        print(f"✂️ Auto-Cut Setting: {auto_cut}")
        
        # Get minimal options and add paper size
        options = get_brother_ql800_minimal_options(orientation, copies, auto_cut)
        
        # Add paper size option for Brother QL-800
        if cups_paper_size == 'DK1201':
            options.extend(['-o', 'media=DC03'])  # DC03 is 29mm x 90mm (DK1201 equivalent)
            print(f"🏷️ Added Brother QL-800 DK1201 paper size: -o media=DC03")
        elif cups_paper_size == 'Custom' and paper_size == 'DK221':
            # DK221 labels (23mm x 23mm) - use DC01 which is closest to 23mm x 23mm
            options.extend(['-o', 'media=DC01'])
            print(f"🏷️ Added Brother QL-800 DK221 paper size: -o media=DC01")
        elif cups_paper_size == 'Custom':
            options.extend(['-o', 'media=DC03'])  # Default to DC03 for custom
            print(f"🏷️ Added Brother QL-800 default paper size: -o media=DC03")
        
        # Add custom PageSize if templateInfo has custom dimensions
        job_data = job.get('jobData', {})
        template_info = job_data.get('templateInfo', {})
        if template_info:
            custom_width = template_info.get('customWidth')
            custom_height = template_info.get('customHeight')
            custom_unit = template_info.get('customUnit', 'inch')
            
            if custom_width and custom_height:
                # Format custom size for CUPS (e.g., Custom.0.91x0.91in)
                if custom_unit.lower() in ['inch', 'inches', 'in']:
                    page_size = f"Custom.{custom_width}x{custom_height}in"
                elif custom_unit.lower() in ['mm', 'millimeter', 'millimeters']:
                    page_size = f"Custom.{custom_width}x{custom_height}mm"
                else:
                    # Default to inches if unit is unclear
                    page_size = f"Custom.{custom_width}x{custom_height}in"
                
                options.extend(['-o', f'PageSize={page_size}'])
                print(f"🏷️ Added Brother QL-800 custom page size: -o PageSize={page_size}")
                print(f"📐 Template dimensions: {custom_width} x {custom_height} {custom_unit}")
        
        # Add Brother QL-800 specific options to prevent filter crashes
        options.extend(['-o', 'BrAutoTapeCut=OFF'])
        print(f"🏷️ Added Brother QL-800 auto cut disable: -o BrAutoTapeCut=OFF")
        
        return options
    else:
        # Standard CUPS orientation for other printers
        orientation_value = '4' if orientation.lower() == 'landscape' else '3'  # 3=portrait, 4=landscape
        
        print(f"📄 Standard CUPS orientation: {orientation} (CUPS value: {orientation_value})")
        print(f"📄 Copies: {copies}")
        print(f"📄 Paper Size: {cups_paper_size}")
        
        options = [
            '-o', f'orientation-requested={orientation_value}'
        ]
        
        # Add paper size if specified
        if cups_paper_size and cups_paper_size != 'Custom':
            options.extend(['-o', f'media={cups_paper_size}'])
            print(f"📄 Added paper size: -o media={cups_paper_size}")
        
        # Add copies if more than 1
        if copies > 1:
            options.extend(['-n', str(copies)])
            print(f"📄 Added copies parameter: -n {copies}")
        
        return options

def get_brother_ql800_pdf_options(orientation):
    """
    Get Brother QL-800 specific print options for PDF jobs.
    
    Brother QL-800 is a label printer that handles orientation differently.
    IMPORTANT: Don't specify media size - let it use whatever is physically loaded.
    """
    print(f"🏷️ Configuring Brother QL-800 for {orientation} orientation")
    print(f"📏 IMPORTANT: Using full label area to prevent content clipping")
    
    if orientation.lower() == 'landscape':
        print(f"🔄 Brother QL-800 Landscape Mode:")
        print(f"   - Using zero margins to prevent content cutoff")
        print(f"   - Full bleed printing for complete label coverage")
        print(f"   - Fixing alignment issues (no right shift, all corners visible)")
        
        # Full label area usage options for Brother QL-800 - prevents content clipping
        return [
            '-o', 'scaling=100',                 # Exact scaling - no resize
            '-o', 'print-quality=high',          # Best quality
            '-o', 'page-left=0',                 # No left margin - prevents right shift
            '-o', 'page-right=0',                # No right margin - full width usage
            '-o', 'page-top=0',                  # No top margin - keeps top content
            '-o', 'page-bottom=0',               # No bottom margin - keeps bottom content
            '-o', 'position=center',             # Center content properly
            '-o', 'number-up=1',                 # One label per sheet
            '-o', 'page-border=none'             # No borders - full bleed printing
        ]
    else:
        print(f"📐 Brother QL-800 Portrait Mode:")
        print(f"   - Using zero margins to prevent content cutoff")
        print(f"   - Full bleed printing for complete label coverage")
        
        return [
            '-o', 'scaling=100',                 # Exact scaling - no resize
            '-o', 'print-quality=high',          # Best quality
            '-o', 'page-left=0',                 # No left margin
            '-o', 'page-right=0',                # No right margin
            '-o', 'page-top=0',                  # No top margin
            '-o', 'page-bottom=0',               # No bottom margin
            '-o', 'position=center',             # Center content properly
            '-o', 'number-up=1',                 # One label per sheet
            '-o', 'page-border=none'             # No borders - full bleed printing
        ]

def get_brother_ql800_alternative_options(orientation):
    """
    Alternative Brother QL-800 options if standard approach fails.
    
    This tries a completely different approach focused on exact PDF pass-through.
    """
    print(f"🔄 TRYING ALTERNATIVE Brother QL-800 approach for {orientation}")
    print(f"🔧 CONTENT CLIPPING FIX: Using minimal CUPS options for label printer")
    
    if orientation.lower() == 'landscape':
        print(f"🏷️ Alternative Landscape: Minimal intervention approach")
        print(f"📏 No media size, no scaling, let PDF orientation take precedence")
        print(f"🎯 GOAL: Fix 'Voice Numb' cutoff, show all corners of label")
        # Sometimes less is more - let the PDF's natural orientation take precedence
        return [
        ]
    else:
        print(f"🏷️ Alternative Portrait: Minimal intervention approach")
        return [
        ]

def get_brother_ql800_minimal_options(orientation, copies=1, auto_cut=True):
    """
    Get minimal Brother QL-800 options to prevent content clipping.
    
    IMPORTANT: Minimal CUPS intervention - let Brother handle PDF natively.
    
    Args:
        orientation: 'portrait' or 'landscape'
        copies: Number of copies to print
        auto_cut: Whether to auto-cut after each label (default True)
    
    Brother QL-800 specific cut options:
        BrAutoTapeCut: OFF or ON - Auto cut after each label
        BrCutAtEnd: OFF or ON - Cut at end of job
        BrCutLabel: 1-99 - Cut every N labels
    """
    print(f"🏷️ Brother QL-800 Minimal Options - Orientation: {orientation}, Copies: {copies}, AutoCut: {auto_cut}")
    print(f"🚨 CONTENT CLIPPING FIX: Ultra-minimal CUPS options")
    
    options = []
    
    # Handle auto-cut setting using Brother-specific CUPS options
    if auto_cut:
        print(f"✂️ AUTO-CUT MODE: Labels will be cut after printing")
        options.extend(["-o", "BrAutoTapeCut=ON"])
        options.extend(["-o", "BrCutAtEnd=ON"])
        print(f"✂️ Added Brother cut options: -o BrAutoTapeCut=ON -o BrCutAtEnd=ON")
    else:
        print(f"✂️ NO-CUT MODE: Labels will NOT be cut automatically")
        options.extend(["-o", "BrAutoTapeCut=OFF"])
        options.extend(["-o", "BrCutAtEnd=OFF"])
        print(f"✂️ Added Brother no-cut options: -o BrAutoTapeCut=OFF -o BrCutAtEnd=OFF")
    
    # Add copies if more than 1
    if copies > 1:
        options.extend(['-n', str(copies)])
        print(f"📄 Added copies parameter: -n {copies}")
    
    # Only add orientation if absolutely necessary
    if orientation.lower() == 'landscape':
        options.extend(['-o', 'landscape'])
        print(f"🔄 Added landscape orientation")
    
    print(f"🏷️ Final Brother QL-800 minimal options: {options}")
    return options

def translate_pdf_for_brother_ql800(pdf_path, job):
    """
    Translate PDF for Brother QL-800 label printer to fix content clipping.
    
    This creates a Brother QL-800 optimized PDF by:
    - Setting exact Brother QL-800 label dimensions (90mm x 29mm for landscape)
    - Scaling content to fit perfectly within printable area
    - Preventing content clipping and cutoff issues
    - Ensuring all four corners of content are visible
    """
    job_id = job.get('id', 'unknown')
    orientation = get_job_specified_orientation(job)
    
    print(f"\n🔧 PDF TRANSLATION FOR BROTHER QL-800:")
    print(f"   📄 Original PDF: {pdf_path}")
    print(f"   🎯 Job ID: {job_id}")
    print(f"   📐 Orientation: {orientation}")
    print(f"   🏷️ Target: Brother QL-800 label printer")
    print(f"   🎯 GOAL: Fix content clipping - show Invoice Number, Name/Date, Tire Size, Status")
    
    try:
        # Import PyPDF2 for PDF manipulation
        try:
            from PyPDF2 import PdfReader, PdfWriter
        except ImportError:
            print(f"   ❌ PyPDF2 not available - install with: pip install PyPDF2==3.0.1")
            return pdf_path
        
        # Read original PDF
        reader = PdfReader(pdf_path)
        writer = PdfWriter()
        
        if len(reader.pages) == 0:
            print(f"   ❌ PDF has no pages")
            return pdf_path
        
        page = reader.pages[0]  # Get first page
        
        # Get current page dimensions
        current_width = float(page.mediabox.width)
        current_height = float(page.mediabox.height)
        
        print(f"   📏 Original PDF size: {current_width:.1f} x {current_height:.1f} points")
        
        # Brother QL-800 with DK1201 labels: Physical size is 29mm wide x 90mm tall
        # Convert mm to points: 1mm = 2.834645669 points
        # DK1201 physical dimensions: 29mm (width) x 90mm (height) = 82.2 x 255.1 points
        DK1201_WIDTH_MM = 29
        DK1201_HEIGHT_MM = 90
        DK1201_WIDTH_PTS = DK1201_WIDTH_MM * 2.834645669   # ~82.2 points
        DK1201_HEIGHT_PTS = DK1201_HEIGHT_MM * 2.834645669  # ~255.1 points
        
        # Check if PDF already matches DK1201 dimensions (within tolerance)
        tolerance = 5  # points
        pdf_matches_portrait = (
            abs(current_width - DK1201_WIDTH_PTS) < tolerance and 
            abs(current_height - DK1201_HEIGHT_PTS) < tolerance
        )
        pdf_matches_landscape = (
            abs(current_width - DK1201_HEIGHT_PTS) < tolerance and 
            abs(current_height - DK1201_WIDTH_PTS) < tolerance
        )
        
        if pdf_matches_portrait or pdf_matches_landscape:
            print(f"   ✅ PDF already matches DK1201 dimensions - no translation needed!")
            print(f"   📏 PDF: {current_width:.1f} x {current_height:.1f} pts")
            print(f"   📏 DK1201: {DK1201_WIDTH_PTS:.1f} x {DK1201_HEIGHT_PTS:.1f} pts (portrait)")
            return pdf_path  # Return original - no scaling needed!
        
        if orientation.lower() == 'landscape':
            # Landscape: swap dimensions (90mm wide x 29mm tall)
            target_width = DK1201_HEIGHT_PTS   # 90mm = ~255 points
            target_height = DK1201_WIDTH_PTS   # 29mm = ~82 points
            print(f"   🔄 Landscape mode: 90mm x 29mm label")
        else:
            # Portrait: normal DK1201 (29mm wide x 90mm tall)
            target_width = DK1201_WIDTH_PTS    # 29mm = ~82 points  
            target_height = DK1201_HEIGHT_PTS  # 90mm = ~255 points
            print(f"   📐 Portrait mode: 29mm x 90mm label")
        
        print(f"   🎯 Target Brother QL-800 size: {target_width:.1f} x {target_height:.1f} points")
        
        # Calculate scaling factors
        scale_x = target_width / current_width
        scale_y = target_height / current_height
        
        # Use uniform scaling to maintain aspect ratio and prevent distortion
        scale = min(scale_x, scale_y)
        
        print(f"   📐 Scale factor: {scale:.3f} (maintains aspect ratio)")
        print(f"   🎯 This should fix content clipping and make all corners visible")
        
        # Apply scaling transformation to fit Brother QL-800 exactly
        page.scale(scale, scale)
        
        # Set exact page size for Brother QL-800 label
        page.mediabox.lower_left = (0, 0)
        page.mediabox.upper_right = (target_width, target_height)
        
        # Add the transformed page
        writer.add_page(page)
        
        # Create Brother QL-800 optimized PDF
        import tempfile
        import os
        translated_fd, translated_path = tempfile.mkstemp(suffix='_brother_ql800.pdf', prefix='job_')
        os.close(translated_fd)
        
        with open(translated_path, 'wb') as output_file:
            writer.write(output_file)
        
        print(f"   ✅ Brother QL-800 optimized PDF created: {translated_path}")
        print(f"   📏 Final size: {target_width:.1f} x {target_height:.1f} points")
        print(f"   🎯 Expected result: Full Invoice Number, all corners visible, no clipping")
        
        return translated_path
        
    except Exception as e:
        print(f"   ❌ PDF translation failed: {e}")
        print(f"   🔄 Falling back to original PDF (may still have clipping issues)")
        import traceback
        traceback.print_exc()
        return pdf_path

def check_brother_ql800_media_status():
    """
    Check what media is loaded in the Brother QL-800 and provide guidance.
    """
    print(f"\n🏷️ BROTHER QL-800 MEDIA DIAGNOSIS:")
    print(f"❌ ERROR: 'The roll of labels or tape inside the machine does not match the one selected'")
    print(f"")
    print(f"🔍 DIAGNOSIS:")
    print(f"   - Brother QL-800 detected a media type mismatch")
    print(f"   - The print command specified a media size that doesn't match what's loaded")
    print(f"   - This is common with Brother label printers that are very specific about media")
    print(f"")
    print(f"💡 SOLUTIONS:")
    print(f"   1. ✅ UPDATED: Print client now avoids specifying media size")
    print(f"   2. 🏷️ Let Brother QL-800 use whatever label roll is currently loaded")
    print(f"   3. 📐 Focus on orientation only, not media dimensions")
    print(f"   4. 🔧 If still failing, try minimal command with no options")
    print(f"")
    print(f"🎯 NEXT TEST:")
    print(f"   - The updated code will NOT specify media size")
    print(f"   - Brother QL-800 will use its loaded label roll")
    print(f"   - Only orientation will be specified for your landscape labels")

def debug_brother_ql800_capabilities():
    """
    Debug function to check Brother QL-800 capabilities and available options.
    """
    print(f"\n🔍 BROTHER QL-800 CAPABILITIES CHECK:")
    
    try:
        # Check available Brother QL-800 options
        result = subprocess.run(['lpoptions', '-p', 'Brother_QL_800', '-l'], 
                               capture_output=True, text=True, timeout=10)
        
        if result.returncode == 0:
            print(f"📋 Available Brother QL-800 CUPS options:")
            for line in result.stdout.split('\n'):
                if line.strip() and ('media' in line.lower() or 'pagesize' in line.lower()):
                    print(f"   MEDIA: {line}")
                elif line.strip() and 'orientation' in line.lower():
                    print(f"   ORIENT: {line}")
                elif line.strip():
                    print(f"   OTHER: {line}")
        else:
            print(f"⚠️ Could not get Brother QL-800 options: {result.stderr}")
            
    except Exception as e:
        print(f"❌ Error checking Brother QL-800 capabilities: {e}")
    
    # Show media diagnosis
    check_brother_ql800_media_status()
    
    print(f"🏷️ Brother QL-800 is a LABEL PRINTER - orientation might work differently!")
    print(f"💡 If standard orientation fails, try these approaches:")
    print(f"   1. ✅ Don't specify media size (now implemented)")
    print(f"   2. 🔧 Use minimal command: lp -d Brother_QL_800 file.pdf") 
    print(f"   3. 🎯 Let PDF natural orientation take precedence")

def create_brother_ql800_test_command(job, pdf_path):
    """
    Create a test command to verify Brother QL-800 orientation handling.
    
    This helps diagnose orientation issues with the Brother QL-800 label printer.
    """
    orientation = get_job_specified_orientation(job)
    config = job.get('configuration', {})
    printer_name = config.get('systemPrinterName', 'Brother_QL_800')
    
    print(f"\n🧪 BROTHER QL-800 TEST COMMAND GENERATOR:")
    print(f"📄 PDF Path: {pdf_path}")
    print(f"🖨️ Printer: {printer_name}")
    print(f"📐 Expected Orientation: {orientation}")
    
    # Generate multiple test commands to try
    options_standard = get_brother_ql800_pdf_options(orientation)
    options_alternative = get_brother_ql800_alternative_options(orientation) 
    options_minimal = get_brother_ql800_minimal_options(orientation)
    
    cmd_standard = ['lp', '-d', printer_name] + options_standard + [pdf_path]
    cmd_alternative = ['lp', '-d', printer_name] + options_alternative + [pdf_path]
    cmd_minimal = ['lp', '-d', printer_name] + options_minimal + [pdf_path]
    cmd_absolute_minimal = ['lp', '-d', printer_name, pdf_path]  # Absolute minimal fallback
    
    print(f"\n🔧 TEST COMMANDS FOR CONTENT CLIPPING FIX:")
    print(f"1️⃣ ADVANCED (didn't work): {' '.join(cmd_standard)}")
    print(f"2️⃣ SIMPLE (made it WORSE): {' '.join(cmd_alternative)}")
    print(f"3️⃣ MINIMAL (current): {' '.join(cmd_minimal)}")
    print(f"4️⃣ ABSOLUTE MINIMAL: {' '.join(cmd_absolute_minimal)}")
    print(f"\n💡 CURRENT APPROACH: Using option 3 (MINIMAL) - no CUPS options")
    print(f"🚨 REASON: Brother QL-800 fights orientation commands")
    print(f"✅ HOPE: Pure PDF passthrough will respect original layout")
    
    print(f"\n💡 BROTHER QL-800 PDF TRANSLATION UPDATE:")
    if orientation.lower() == 'landscape':
        print(f"🔄 For landscape labels - NEW PDF TRANSLATION APPROACH:")
        print(f"   ✅ SOLUTION: Translate PDF to exact Brother QL-800 dimensions")
        print(f"   📏 TARGET: 90mm x 29mm Brother DK1201 label size")
        print(f"   🔧 METHOD: Scale PDF content to fit perfectly")
        print(f"   🎯 GOAL: Eliminate content clipping at source")
        print(f"   🧪 TESTING: Brother gets pre-optimized PDF")
        print(f"   ✅ RESULT: Should show all content in correct positions")
    else:
        print(f"📐 For portrait labels:")
        print(f"   - Using same PDF translation approach")
        print(f"   - TARGET: 29mm x 90mm label dimensions")
    
    print(f"\n🎯 PDF TRANSLATION TEST - LOOK FOR:")
    print(f"   ✅ Full 'Invoice Number' (not 'Voice Numb')")
    print(f"   ✅ Content properly positioned (not shifted right)")  
    print(f"   ✅ Name & Date visible in top left corner")
    print(f"   ✅ Tire Size visible in bottom left corner")
    print(f"   ✅ Tire Status visible in top right corner")
    print(f"   🎯 PDF optimized for exact Brother QL-800 label dimensions")
    
    return cmd_standard, cmd_alternative, cmd_minimal, cmd_absolute_minimal

def update_printer_settings(new_settings):
    """Update printer settings with new configuration"""
    global PRINTER_SETTINGS
    PRINTER_SETTINGS.update(new_settings)

def cancel_job(job_id):
    """Cancel a job by adding it to cancelled jobs"""
    global CANCELLED_JOBS
    CANCELLED_JOBS.add(job_id)

def print_to_local_printer(job, api_client_module, app):
    """Print job data to local printer"""
    job_id = job.get('id', 'unknown')
    form_name = job.get('formName', 'unknown')
    job_data = job.get('jobData', {})
    printer_id = job.get('printerId', 'unknown')
    
    print(f"🔍 DEBUG: Starting print_to_local_printer for job {job_id}")
    print(f"🔍 DEBUG: Form: {form_name}, Printer ID: {printer_id}")
    print(f"🔍 DEBUG: Job data keys: {list(job_data.keys())}")
    print(f"🔍 DEBUG: Is test job: {job_data.get('isTestJob', False)}")
    print(f"🔍 DEBUG: Job data type: {job_data.get('type', 'unknown')}")
    
    # Check if this is a PDF print job
    if (job_data.get('type') == 'pdf-print' or job_data.get('pdfData')) and job_data.get('pdfData'):
        return handle_pdf_print_job(job, api_client_module, app, lambda msg, **kwargs: print(f"📄 {msg}"))
    
    # ACTUAL PRINTING IMPLEMENTATION FOR MACOS
    try:
        print(f"🔍 DEBUG: Entering CUPS printing section...")
        
        # Get exact system printer name from server data
        system_printer_name = None
        
        # Try to get system printer name from job configuration (if available)
        job_config = job.get('configuration', {})
        if job_config and hasattr(job_config, 'get'):
            stored_system_name = job_config.get('systemPrinterName')
            if stored_system_name:
                system_printer_name = stored_system_name
                print(f"🔍 DEBUG: Using system printer name from job config: '{system_printer_name}'")
        
        # If not found in job, fetch from server by printer ID
        if not system_printer_name:
            system_printer_name = api_client_module.get_system_printer_name(printer_id, app)
            if system_printer_name != printer_id:  # Only log if we found something different
                print(f"🔍 DEBUG: Found system printer name from server: '{system_printer_name}'")
        
        # Fallback to printer ID if nothing else works
        if not system_printer_name:
            system_printer_name = printer_id
            print(f"🔍 DEBUG: Using printer ID as fallback system name: '{system_printer_name}'")
        
        # Create test page content
        if job_data.get('isTestJob', False):
            print(f"🔍 DEBUG: Processing test job...")
            test_content = job_data.get('testContent', {})
            # ASCII-ONLY content for laser printer compatibility
            content = f"""*** {test_content.get('title', 'TEST PAGE')} ***
{test_content.get('subtitle', '')}

=== QUICKCHECK PRINT MANAGEMENT SYSTEM TEST PAGE ===

Printer: {job_data.get('printerName', 'Unknown')}
Test Type: {job_data.get('testType', 'test-page')}
Job ID: {job.get('id', 'unknown')}
Form: {form_name}
Priority: {job.get('priority', 'normal')}
Generated: {job_data.get('timestamp', 'unknown')}

PRINT SYSTEM STATUS: SUCCESS!

This page was printed through the complete print queue system:
   1. Job created via PrintManager UI/API
   2. Job queued in backend database
   3. Print client polled and found job
   4. Job processed through status: COLLECTED -> INQUEUE -> PRINTING -> COMPLETED
   5. Job sent to physical printer via CUPS

=== END OF TEST PAGE ===

If you can read this text, the print system is working correctly!
Physical printing via CUPS is now enabled and functional.

Test completed: {job_data.get('timestamp', 'unknown')}
"""
            
            print(f"🔍 DEBUG: ASCII-only content being written to temp file:")
            print(f"🔍 DEBUG: Content length: {len(content)} characters")
            print(f"🔍 DEBUG: Content preview (first 200 chars): {content[:200]}")
            
            # Create temporary file
            with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='ascii', errors='replace') as f:
                f.write(content)
                temp_file = f.name
            
            print(f"🔍 DEBUG: Temp file created with ASCII encoding: {temp_file}")
            
            # Verify the file was written correctly
            try:
                with open(temp_file, 'r', encoding='ascii') as f:
                    written_content = f.read()
                print(f"🔍 DEBUG: File verification - length: {len(written_content)} characters")
                print(f"🔍 DEBUG: File verification - first 100 chars: {written_content[:100]}")
            except Exception as e:
                print(f"🔍 DEBUG: Error reading back temp file: {e}")
            
            # Print using lp command (CUPS) with detailed logging
            print(f"🖨️ 🎯 ATTEMPTING PRINT: Sending to {system_printer_name}")
            print(f"🖨️ 📁 Temp file: {temp_file}")
            
            # Get optimized print options for test jobs
            test_metadata = {'documentType': 'test-page', 'source': 'print-client-test'}
            print_options = get_sticker_print_options(job_data, test_metadata, printer_id, job)
            
            # Build lp command with optimized options
            cups_printer_name = resolve_cups_printer_name(system_printer_name)
            lp_command = ['lp', '-d', cups_printer_name] + print_options + [temp_file]
            print(f"🖨️ Test job print command: {' '.join(lp_command)}")
            
            result = subprocess.run(lp_command, capture_output=True, text=True)
            
            # Get paper size for logging
            detected_paper_size = None
            if job and 'jobData' in job:
                detected_paper_size = job['jobData'].get('paperSize') or job['jobData'].get('templateInfo', {}).get('paperSize')
            
            # Log comprehensive printer response and store for job details
            printer_log = log_comprehensive_printer_response(lp_command, result, cups_printer_name, job.get('id'), detected_paper_size)
            if job and job.get('id'):
                PRINTER_LOGS[job.get('id')] = printer_log
            
            # Clean up temp file
            os.unlink(temp_file)
            
            if result.returncode == 0:
                print(f"🖨️ ✅ Successfully sent to physical printer: {cups_printer_name}")
                return True
            else:
                print(f"🖨️ ❌ Printing failed - see comprehensive log above for details")
                return False
        else:
            # Handle regular print jobs (non-test)
            content = f"""📄 PRINT JOB - {form_name.upper()}

Job ID: {job.get('id', 'unknown')}
Form: {form_name}
Printer: {job_data.get('printerName', 'Unknown')}
Priority: {job.get('priority', 'normal')}
Generated: {job_data.get('timestamp', 'unknown')}

Job Data:
{str(job_data)}

🖨️ Printed via QuickCheck Print Management System
"""
            
            with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
                f.write(content)
                temp_file = f.name
            
            # Get optimized print options for sticker jobs
            print_options = get_sticker_print_options(job_data, {}, printer_id, job)
            
            # Build lp command with optimized options
            cups_printer_name = resolve_cups_printer_name(system_printer_name)
            lp_command = ['lp', '-d', cups_printer_name] + print_options + [temp_file]
            print(f"🖨️ Regular job print command: {' '.join(lp_command)}")
            
            result = subprocess.run(lp_command, capture_output=True, text=True)
            
            # Get paper size for logging
            detected_paper_size = None
            if job and 'jobData' in job:
                detected_paper_size = job['jobData'].get('paperSize') or job['jobData'].get('templateInfo', {}).get('paperSize')
            
            # Log comprehensive printer response and store for job details
            printer_log = log_comprehensive_printer_response(lp_command, result, cups_printer_name, job.get('id'), detected_paper_size)
            if job and job.get('id'):
                PRINTER_LOGS[job.get('id')] = printer_log
            
            os.unlink(temp_file)
            
            if result.returncode == 0:
                print(f"🖨️ ✅ Successfully sent regular job to printer: {cups_printer_name}")
                return True
            else:
                print(f"🖨️ ❌ Regular print failed - see comprehensive log above for details")
                return False
                
    except Exception as e:
        print(f"🖨️ ❌ Printing error: {str(e)}")
        return False

def process_print_job(job, api_client_module, app, log_message_func, queue_logs):
    """Process a single print job"""
    job_id = job["id"]
    
    # Skip if already cancelled
    if job_id in CANCELLED_JOBS:
        update_job_status(job_id, 'failed', queue_logs, log_message_func)
        return
    
    # Claim the job from server
    claimed, claim_result = api_client_module.claim_job(job_id, app, log_message_func)
    if not claimed:
        update_job_status(job_id, 'failed', queue_logs, log_message_func)
        return
    
    # Add to pending jobs for tracking (jobs trying to print)
    app.config["PENDING_JOBS"][job_id] = {
        "job": job,
        "startedAt": datetime.now().isoformat()
    }
    
    try:
        # Update status to pending (trying to print)
        update_job_status(job_id, 'pending', queue_logs, log_message_func)
        
        # Print the job
        print_result = print_to_local_printer(job, api_client_module, app)
        
        if print_result == "pending_approval":
            # Job is waiting for approval, keep it in pending status
            update_job_status(job_id, 'pending', queue_logs, log_message_func)
            log_message_func(f"📄 Job {job_id} is waiting for approval - staying in pending", category="queue")
            # Don't add to printed jobs yet - will be added when approved
            # Keep job in pending list until approval
        elif print_result:
            # Job was actually printed immediately
            update_job_status(job_id, 'completed', queue_logs, log_message_func)
            api_client_module.complete_job(job_id, app, log_message_func)
            # Add to printed jobs list for dashboard display
            add_to_printed_jobs(job)
            # Remove from pending jobs since it's completed
            app.config["PENDING_JOBS"].pop(job_id, None)
        else:
            # Job failed to print
            update_job_status(job_id, 'failed', queue_logs, log_message_func)
            api_client_module.fail_job(job_id, "Local printer error", app, log_message_func)
            # Remove from pending jobs since it failed
            app.config["PENDING_JOBS"].pop(job_id, None)
            
    except Exception as e:
        update_job_status(job_id, 'failed', queue_logs, log_message_func)
        api_client_module.fail_job(job_id, f"Processing error: {str(e)}", app, log_message_func)
        # Remove from pending jobs on error
        app.config["PENDING_JOBS"].pop(job_id, None)

def poll_print_jobs(app, api_client_module, log_message_func, queue_logs, get_printer_statuses_func, polling_active_ref, poll_interval):
    """Main polling loop"""
    # Register printers on first poll
    printer_registration_done = False
    last_printer_update = 0
    PRINTER_UPDATE_INTERVAL = 30  # Update printer status every 30 seconds
    
    while polling_active_ref[0]:  # Using list reference to allow modification from main thread
        try:
            # Register printers once when polling starts
            if not printer_registration_done and app.config.get("AUTH_TOKEN"):
                log_message_func("Registering detected printers with main server...")
                if api_client_module.register_printers_with_server(app, log_message_func, get_printer_statuses_func):
                    printer_registration_done = True
                    last_printer_update = time.time()
                    log_message_func("🔗 CLIENT READY: Print client registered and ready to receive jobs", category="queue")
                else:
                    log_message_func("Failed to register printers, will retry on next poll", True)
            
            # Update printer status periodically
            current_time = time.time()
            if (printer_registration_done and 
                current_time - last_printer_update > PRINTER_UPDATE_INTERVAL and 
                app.config.get("AUTH_TOKEN")):
                
                if api_client_module.update_printer_status_on_server(app, log_message_func, get_printer_statuses_func):
                    last_printer_update = current_time
            
            # Poll for print jobs
            jobs, message = api_client_module.poll_for_pending_jobs(app, log_message_func)
            if jobs:
                for job in jobs:
                    process_print_job(job, api_client_module, app, log_message_func, queue_logs)
            
            time.sleep(poll_interval)
            
        except Exception as e:
            log_message_func(f"Polling loop error: {str(e)}", True)
            time.sleep(poll_interval * 2)  # Wait longer on error 

def log_comprehensive_printer_response(cmd, result, printer_name, job_id=None, paper_size=None):
    """
    Comprehensive logging of printer responses, status, and potential issues.
    
    Captures:
    - CUPS command output
    - Printer status and capabilities  
    - Print queue status
    - CUPS error logs
    - Paper size feedback
    - Brother QL-800 specific responses
    
    Returns the log data for storage with the job.
    """
    log_lines = []
    
    def log_print(message):
        """Print and store log messages"""
        print(message)
        log_lines.append(message)
    
    log_print(f"\n{'='*80}")
    log_print(f"🖨️ COMPREHENSIVE PRINTER RESPONSE LOG")
    log_print(f"{'='*80}")
    
    # Basic command info
    log_print(f"📋 JOB ID: {job_id or 'Unknown'}")
    log_print(f"🖨️ PRINTER: {printer_name}")
    log_print(f"📄 PAPER SIZE: {paper_size or 'Not specified'}")
    log_print(f"⚡ COMMAND: {' '.join(cmd)}")
    log_print(f"📊 RETURN CODE: {result.returncode}")
    
    # Command output
    log_print(f"\n📤 CUPS STDOUT:")
    if result.stdout and result.stdout.strip():
        log_print(f"   {result.stdout.strip()}")
        # Extract job ID from CUPS output if present
        if 'request id is' in result.stdout:
            cups_job_id = result.stdout.split('request id is')[1].strip().split()[0]
            log_print(f"   🆔 CUPS JOB ID: {cups_job_id}")
    else:
        log_print(f"   (No output - normal for successful prints)")
    
    log_print(f"\n📥 CUPS STDERR:")
    if result.stderr and result.stderr.strip():
        log_print(f"   ⚠️ {result.stderr.strip()}")
        # Check for common error patterns
        if 'media' in result.stderr.lower():
            log_print(f"   🚨 PAPER SIZE ERROR DETECTED - Check media settings!")
        if 'unknown' in result.stderr.lower():
            log_print(f"   🚨 UNKNOWN OPTION ERROR - Check CUPS compatibility!")
    else:
        log_print(f"   (No errors)")
    
    # Printer status check
    log_print(f"\n🔍 PRINTER STATUS CHECK:")
    try:
        # Check printer status with lpstat -p
        status_cmd = ['lpstat', '-p', printer_name]
        status_result = subprocess.run(status_cmd, capture_output=True, text=True, timeout=10)
        if status_result.returncode == 0:
            log_print(f"   ✅ PRINTER STATUS: {status_result.stdout.strip()}")
            if 'idle' in status_result.stdout.lower():
                log_print(f"   📗 PRINTER STATE: Ready")
            elif 'processing' in status_result.stdout.lower():
                log_print(f"   📙 PRINTER STATE: Processing job")
            elif 'stopped' in status_result.stdout.lower():
                log_print(f"   📕 PRINTER STATE: Stopped/Error")
        else:
            log_print(f"   ❌ PRINTER STATUS ERROR: {status_result.stderr.strip()}")
    except Exception as e:
        log_print(f"   ⚠️ Could not check printer status: {e}")
    
    # Print queue check
    log_print(f"\n📋 PRINT QUEUE STATUS:")
    try:
        queue_cmd = ['lpstat', '-o', printer_name]
        queue_result = subprocess.run(queue_cmd, capture_output=True, text=True, timeout=10)
        if queue_result.returncode == 0 and queue_result.stdout.strip():
            log_print(f"   📋 ACTIVE JOBS:")
            for line in queue_result.stdout.strip().split('\n'):
                log_print(f"      {line}")
        else:
            log_print(f"   📋 NO JOBS IN QUEUE (processed immediately or empty)")
    except Exception as e:
        log_print(f"   ⚠️ Could not check print queue: {e}")
    
    # Printer capabilities check (especially for Brother QL-800)
    if 'brother' in printer_name.lower() and 'ql' in printer_name.lower():
        log_print(f"\n🏷️ BROTHER QL-800 SPECIFIC CHECKS:")
        try:
            # Check supported media sizes
            capabilities_cmd = ['lpoptions', '-p', printer_name, '-l']
            cap_result = subprocess.run(capabilities_cmd, capture_output=True, text=True, timeout=10)
            if cap_result.returncode == 0:
                log_print(f"   📏 SUPPORTED MEDIA SIZES:")
                for line in cap_result.stdout.split('\n'):
                    if 'media' in line.lower() and ('dc0' in line.lower() or 'dk' in line.lower()):
                        log_print(f"      {line.strip()}")
                        
                log_print(f"   ⚙️ BROTHER SPECIFIC OPTIONS:")
                for line in cap_result.stdout.split('\n'):
                    if 'br' in line.lower() and ('cut' in line.lower() or 'auto' in line.lower()):
                        log_print(f"      {line.strip()}")
            else:
                log_print(f"   ⚠️ Could not get Brother QL-800 capabilities")
        except Exception as e:
            log_print(f"   ⚠️ Brother QL-800 check failed: {e}")
    
    # CUPS error log check (last few lines)
    log_print(f"\n📋 RECENT CUPS ERROR LOG:")
    try:
        # Common CUPS error log locations
        error_log_paths = [
            '/var/log/cups/error_log',
            '/usr/local/var/log/cups/error_log',
            '/var/logs/cups/error_log'
        ]
        
        error_log_found = False
        for log_path in error_log_paths:
            try:
                if os.path.exists(log_path):
                    # Get last 5 lines
                    tail_cmd = ['tail', '-5', log_path]
                    tail_result = subprocess.run(tail_cmd, capture_output=True, text=True, timeout=5)
                    if tail_result.returncode == 0 and tail_result.stdout.strip():
                        log_print(f"   📄 CUPS ERROR LOG ({log_path}):")
                        for line in tail_result.stdout.strip().split('\n'):
                            if printer_name.lower() in line.lower() or 'error' in line.lower():
                                log_print(f"      🚨 {line}")
                            else:
                                log_print(f"      {line}")
                        error_log_found = True
                        break
            except:
                continue
        
        if not error_log_found:
            log_print(f"   ℹ️ CUPS error log not accessible or not found")
            
    except Exception as e:
        log_print(f"   ⚠️ Could not check CUPS error log: {e}")
    
    # Summary
    log_print(f"\n{'='*80}")
    if result.returncode == 0:
        log_print(f"✅ PRINT COMMAND SUCCESSFUL")
        if result.stderr and result.stderr.strip():
            log_print(f"⚠️ BUT WITH WARNINGS - Check stderr above")
    else:
        log_print(f"❌ PRINT COMMAND FAILED")
        log_print(f"🔧 TROUBLESHOOTING:")
        log_print(f"   1. Check printer is online and ready")
        log_print(f"   2. Verify paper size compatibility")
        log_print(f"   3. Check CUPS printer configuration")
        log_print(f"   4. Review error messages above")
    log_print(f"{'='*80}\n")
    
    # Return the log data for storage
    return {
        'timestamp': datetime.now().isoformat(),
        'job_id': job_id,
        'printer_name': printer_name,
        'paper_size': paper_size,
        'command': ' '.join(cmd),
        'return_code': result.returncode,
        'success': result.returncode == 0,
        'full_log': '\n'.join(log_lines)
    }

def map_paper_size_to_cups(paper_size, printer_id):
    """
    Map application paper size names to valid CUPS paper size names.
    
    This function converts the paper size names used in the application
    to the actual CUPS paper size names that the printer expects.
    """
    print(f"🗺️ Mapping paper size: '{paper_size}' for printer: '{printer_id}'")
    
    # Check if this is a Brother QL-800 printer
    is_brother_ql800 = (
        'brother' in printer_id.lower() and 
        ('ql-800' in printer_id.lower() or 'ql_800' in printer_id.lower())
    )
    
    if is_brother_ql800:
        print(f"🏷️ Brother QL-800 detected - mapping paper sizes for label printer")
        
        # Map application paper sizes to Brother QL-800 CUPS paper sizes
        brother_mapping = {
            'Brother-QL800': 'DK1201',  # Default Brother QL-800 size (maps to DC03)
            'DK1201': 'DK1201',         # DK1201 labels (29mm x 90mm) - maps to DC03
            '29mmx90mm': 'DK1201',      # Alternative name for DK1201 - maps to DC03
            'DK221': 'Custom',          # DK221 labels (23mm x 23mm) - maps to DC01
            'Dymo-TwinTurbo': 'Custom', # Dymo uses custom size
            'Godex-200i': 'Custom',     # Godex uses custom size
            'Custom': 'Custom'          # Custom size
        }
        
        cups_paper_size = brother_mapping.get(paper_size, 'DK1201')
        print(f"🏷️ Brother QL-800 mapping: '{paper_size}' → '{cups_paper_size}'")
        return cups_paper_size
    else:
        # For other printers, use standard mapping
        standard_mapping = {
            'Brother-QL800': 'Custom',
            'DK1201': 'Custom', 
            '29mmx90mm': 'Custom',
            'DK221': 'Custom',
            'Dymo-TwinTurbo': 'Custom',
            'Godex-200i': 'Custom',
            'Custom': 'Custom'
        }
        
        cups_paper_size = standard_mapping.get(paper_size, 'Custom')
        print(f"📄 Standard printer mapping: '{paper_size}' → '{cups_paper_size}'")
        return cups_paper_size 