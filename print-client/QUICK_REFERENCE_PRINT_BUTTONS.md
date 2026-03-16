# 🚀 Quick Reference: Print Button Guide

## 🔄 Two Print Methods Available

### ✅ **Approve & Print** (Standard)
- **Speed**: ⚡ Fast 
- **Method**: Uses job configuration only
- **Best For**: Unknown formats, quick prints, fallback option
- **Auth Required**: ✅ Basic
- **API Calls**: ❌ None

### 🏷️ **Print with Template** (Enhanced)  
- **Speed**: 🐌 Slower (API lookup)
- **Method**: Template coordinates + enhanced config
- **Best For**: Standard label templates, precise positioning
- **Auth Required**: ✅ Full API access
- **API Calls**: ✅ Template fetch required

---

## 🎯 Quick Decision Guide

| Your Job Type | Recommended Button | Why |
|---------------|-------------------|-----|
| **Tire Labels** | 🏷️ Print with Template | Uses tire template coordinates |
| **Parts Labels** | 🏷️ Print with Template | Uses parts template coordinates |
| **Custom Documents** | ✅ Approve & Print | No template available |
| **Unknown Format** | ✅ Approve & Print | Safe fallback option |
| **Template Errors** | ✅ Approve & Print | Backup when template fails |
| **Quick Test Print** | ✅ Approve & Print | Faster, simpler process |

---

## 📋 Your Sample Job Example

**Job Data:**
```
Filename: "label-Tire (Completed)-1753999676700.pdf"
Template: "Tire (Completed)"
Fields: Created By, Invoice #, Tire Size, Vendor
```

**✅ Standard Print Result:**
- Uses job's Brother-QL800 setting
- Prints PDF as-is from cloud app
- No coordinate mapping

**🏷️ Template Print Result:**
- Fetches "Tire (Completed)" template
- Maps 5 fields to coordinates:
  - Created By → (10,15) 
  - Invoice # → (200,55)
  - Tire Size → (200,75)
- Enhanced configuration applied

---

## ⚠️ Troubleshooting

| Issue | Solution |
|-------|----------|
| **Template button shows error** | Use ✅ Approve & Print instead |
| **HTTP 403 errors** | Re-authenticate print client |
| **Template not found** | Check template name in label manager |
| **Slow template printing** | Check network connection to cloud |
| **Need quick print** | Use ✅ Approve & Print for speed |

---

## 🏷️ Supported Templates

Template printing works with any label manager template:
- Tire (Check-In, Completed, Warranty, Return, Restock)
- Parts (Check-In, Restock, Warranty, Return)  
- Custom templates you create

**Template Detection:**
1. `labelInfo.templateName` (Priority 1)
2. Filename pattern extraction (Priority 2)
3. API template lookup (Automatic)

---

## 🔍 Success Indicators

**Standard Print Success:**
```
✅ Document approved and sent to printer!
```

**Template Print Success:**
```
🏷️ Document printed with template!
Template: Tire (Completed)
Coordinates applied: 5
```

**When to Switch Methods:**
- Template errors → Use standard print
- Authentication issues → Fix auth first
- Unknown labels → Use standard print
- Need precision → Use template print 