# Template-Based Printing Implementation

## Overview

Added a new **Print with Template** button to the print client that uses label manager templates to apply coordinates and configuration based on the label type extracted from the job data.

## ✨ New Features

### 🏷️ Print with Template Button
- **Location**: Print client dashboard, preview queue section
- **Icon**: 🏷️ Print with Template  
- **Color**: Warning (orange) to distinguish from standard print
- **Position**: Between "Approve & Print" and "Reject" buttons

### 🎯 Template Coordinate Integration
- **Automatic Detection**: Extracts template name from `labelInfo.templateName` or filename pattern
- **Cloud Integration**: Fetches template data from label manager API
- **Coordinate Mapping**: Maps job data fields to template coordinates
- **Enhanced Configuration**: Applies template-specific print settings

## 🔧 Implementation Details

### Template Name Extraction
```javascript
// Priority 1: From labelInfo.templateName
templateName = job.labelInfo.templateName

// Priority 2: From filename pattern
// Example: "label-Tire (Completed)-1753999676700.pdf" → "Tire (Completed)"
templateName = extractFromFilename(job.filename)
```

### Coordinate Application
```python
# Field coordinate mapping
for field in template.fields:
    position = field.position  # {x: 200, y: 75}
    fontSize = field.fontSize  # 16
    textAlign = field.textAlign  # "center"
    value = jobData.labelData[field.name]  # "543/21"
```

### Enhanced Configuration
```python
enhanced_config = {
    "templateDimensions": {"width": 336, "height": 106},
    "paperSize": "Brother-QL800",  # From template
    "templateInfo": {
        "templateName": "Tire (Completed)",
        "fieldCount": 5,
        "templateId": "template-id"
    }
}
```

## 📋 API Endpoints

### New Route: `/print-with-template/<job_id>`
- **Method**: POST
- **Purpose**: Print job using template coordinates
- **Response**: 
  ```json
  {
    "success": true,
    "message": "✅ Job printed successfully using template 'Tire (Completed)'",
    "template_used": "Tire (Completed)",
    "coordinates_applied": 5
  }
  ```

### Enhanced Function: `approve_preview()`
- **Added Parameter**: `enhanced_config=None`
- **Purpose**: Apply template-specific configuration during printing
- **Integration**: Merges template config with job configuration

## 🧪 Validation Results

Tested with user's sample data:
```
Template: "Tire (Completed)"
Field Mapping: 5/5 fields (100% success)
Coordinates Applied:
   📍 Created By: (10, 15) size:10 = "Stephen Villavaso"
   📍 Created Date: (10, 35) size:10 = "7/30/2025"  
   📍 Invoice #: (200, 55) size:17 = "54321"
   📍 Tire Size: (200, 75) size:16 = "543/21"
   📍 Vendor: (10, 95) size:12 = "5432"
```

## 🎯 User Experience

### Before
- Single "Approve & Print" button
- Uses only job configuration
- No template coordinate awareness

### After  
- **Approve & Print**: Standard printing (existing behavior)
- **🏷️ Print with Template**: Template-aware printing with coordinates
- **Reject**: Cancel job (existing behavior)

### Template Print Process
1. User clicks "🏷️ Print with Template"
2. System extracts template name from job data
3. Fetches template from label manager API
4. Maps job data to template field coordinates
5. Applies enhanced configuration 
6. Prints with template-specific positioning

## 🔄 Integration Points

### Label Manager Templates
- **Source**: `/api/labels` endpoint from cloud server
- **Format**: Standard label template with field coordinates
- **Fallback**: Partial name matching if exact match not found

### Print Queue Integration
- **Queue**: Uses existing preview queue system
- **Processing**: Enhanced `approve_preview()` function
- **Logging**: Template info logged to queue logs

### Dashboard Integration
- **UI**: New button in preview queue item actions
- **JavaScript**: `printWithTemplate()` function handles API calls
- **Feedback**: Success/error messages with template details

## 🏷️ Supported Label Types

Works with any label template from the label manager:
- **Tire Templates**: Check-In, Completed, Warranty, Return, Restock
- **Parts Templates**: Check-In, Restock, Warranty, Return  
- **Custom Templates**: Any user-created templates

## 🔍 Debugging & Logging

Enhanced logging for template-based printing:
```
🏷️ Found template name from labelInfo: Tire (Completed)
🎯 Using template-based printing for 'Tire (Completed)' with 5 field coordinates
🎯 Template 'Tire (Completed)' coordinate mapping:
   📍 Created By: (10, 15) size:10 = 'Stephen Villavaso'
   📍 Created Date: (10, 35) size:10 = '7/30/2025'
   📍 Invoice #: (200, 55) size:17 = '54321'
   📍 Tire Size: (200, 75) size:16 = '543/21' 
   📍 Vendor: (10, 95) size:12 = '5432'
🎯 Applying template-enhanced configuration: Tire (Completed)
```

## 🚀 Next Steps

The template-based printing system is now ready for use:

1. **Start Print Client**: Launch the print client dashboard
2. **Queue Label Jobs**: Send label jobs from the cloud app
3. **Use Template Button**: Click "🏷️ Print with Template" for coordinate-aware printing
4. **Monitor Logs**: Check queue logs for template coordinate mapping details

The system automatically detects label types and applies appropriate template coordinates for precise printing based on the label manager templates. 