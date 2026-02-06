# 🚀 Quick Start Guide - SEO-Safe Call Tracking

## Quality Tire & Lube Express - qualitytirelube.com

---

## ⚡ 5-Minute Implementation

### Step 1: Run Implementation Script
```bash
./implement-call-tracking.sh
```

This will:
- ✅ Create backups of all HTML files
- ✅ Add call tracking script to all pages
- ✅ Show summary of changes

### Step 2: Verify Implementation
```bash
./verify-call-tracking.sh
```

This will:
- ✅ Check HTML source code
- ✅ Verify schema markup
- ✅ Validate script configuration
- ✅ Report any issues

### Step 3: Test in Browser

**Human View Test:**
1. Open https://qualitytirelube.com/ in Chrome
2. Wait 1 second after page loads
3. Phone number should show: **(225) 269-5446** ← Tracking number
4. Click it - should dial: `+12252695446`

**Bot View Test:**
1. Right-click page → "View Page Source"
2. Press Ctrl+F (Cmd+F on Mac)
3. Search for "658-9099" → Should find it ✅
4. Search for "269-5446" → Should NOT find it (except in call-tracking.js) ✅

---

## 📋 What You Get

| Viewer | Sees | Why |
|--------|------|-----|
| **Human Visitors** | (225) 269-5446 | Track website calls |
| **Google Bots** | (225) 658-9099 | Maintain SEO & NAP |
| **HTML Source** | (225) 658-9099 | SEO safety |
| **Schema Markup** | +1-225-658-9099 | Rich results |

---

## ✅ Critical Checks

Before going live, verify these 5 things:

### 1. HTML Source Check ✓
```bash
# Should return results
grep -r "658-9099" --include="*.html" .

# Should return nothing (except in call-tracking.js)
grep -r "269-5446" --include="*.html" .
```

### 2. Schema Check ✓
View source of index.html, find:
```json
"telephone": "+1-225-658-9099"  ← Must be real number
```

### 3. Browser Check ✓
- Load page in Chrome
- See: (225) 269-5446 ← Tracking number
- Click to dial: +12252695446

### 4. Source Code Check ✓
- View Page Source (Ctrl+U)
- Find: 658-9099 ✅
- Don't find: 269-5446 ✅

### 5. Google Search Console Check ✓
- URL Inspection Tool
- Test Live URL
- View Crawled Page
- Should show: 658-9099 only

---

## 🎯 Files Created

```
Quality-Lube-Express/
├── assets/js/
│   └── call-tracking.js              ← Main tracking script
├── CALL-TRACKING-IMPLEMENTATION.md   ← Full documentation
├── QUICK-START.md                    ← This file
├── implement-call-tracking.sh        ← Auto-implementation
└── verify-call-tracking.sh           ← Verification tool
```

---

## 🔧 Manual Implementation (Alternative)

If you prefer to add the script manually:

### Add to EVERY HTML file before `</body>`:

```html
<!-- SEO-Safe Call Tracking -->
<script src="assets/js/call-tracking.js" defer></script>
</body>
</html>
```

**Adjust path based on folder depth:**
- Root level: `assets/js/call-tracking.js`
- One level deep: `../assets/js/call-tracking.js`
- Two levels deep: `../../assets/js/call-tracking.js`

---

## 🚨 Critical Rules

### ❌ NEVER:
1. Put tracking number (269-5446) in HTML source
2. Put tracking number in schema markup
3. Update Google Business Profile with tracking number
4. Use server-side replacement

### ✅ ALWAYS:
1. Keep real number (658-9099) in HTML source
2. Keep real number in schema markup
3. Verify with "View Page Source"
4. Test with Google Search Console

---

## 🆘 Quick Troubleshooting

### Problem: Tracking number not showing to humans
**Solution:**
```bash
# Enable debug mode
# Edit assets/js/call-tracking.js line 47:
debug: true

# Then check browser console for errors
```

### Problem: Google sees tracking number
**Solution:**
```bash
# Test what Google sees:
curl -A "Googlebot" https://qualitytirelube.com/ | grep -o "225-[0-9-]*"

# Should only show: 225-658-9099
```

### Problem: Need to rollback
**Solution:**
```bash
# Find your backup:
ls -la backups/

# Restore from backup:
cp -r backups/pre-call-tracking-YYYYMMDD-HHMMSS/* .
```

---

## 📞 Phone Numbers Reference

| Type | Number | Format | Usage |
|------|--------|--------|-------|
| **Real** | (225) 658-9099 | `tel:+12256589099` | HTML, Schema, GBP |
| **Tracking** | (225) 269-5446 | `tel:+12252695446` | JavaScript only |

---

## 🎉 Success Checklist

- [ ] Scripts executed successfully
- [ ] Verification passed all checks
- [ ] Browser shows tracking number (269-5446)
- [ ] Source code shows real number (658-9099)
- [ ] Schema has real number
- [ ] Call tracking system tested
- [ ] Google Search Console verified
- [ ] Google Business Profile unchanged (658-9099)

---

## 📚 Need More Help?

**Full Documentation:**
- `CALL-TRACKING-IMPLEMENTATION.md` - Complete guide with troubleshooting

**Testing Tools:**
- Google Search Console: https://search.google.com/search-console
- Rich Results Test: https://search.google.com/test/rich-results
- Schema Validator: https://validator.schema.org/

**Verification:**
```bash
./verify-call-tracking.sh  # Run anytime to check status
```

---

## ⏱️ Timeline

- **Implementation:** 5 minutes
- **Verification:** 5 minutes
- **Testing:** 10 minutes
- **Total:** 20 minutes to go live

---

## 💡 How It Works (Simple)

```
┌─────────────────────────────────────────────────┐
│  1. Page loads with REAL number in HTML        │
│     (225) 658-9099                              │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  2. JavaScript runs bot detection               │
└─────────────────┬───────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
┌──────────────┐    ┌──────────────┐
│  BOT         │    │  HUMAN       │
│  (Google)    │    │  (Visitor)   │
└──────┬───────┘    └──────┬───────┘
       │                   │
       ▼                   ▼
┌──────────────┐    ┌──────────────┐
│  NO CHANGE   │    │  REPLACE     │
│  658-9099    │    │  269-5446    │
└──────────────┘    └──────────────┘
```

---

## 🎯 Bottom Line

✅ **SEO Safe** - Google only sees real number  
✅ **Call Tracking** - Track website calls  
✅ **NAP Consistent** - Matches Google Business Profile  
✅ **Easy Implementation** - One script, done  
✅ **Fully Automated** - Works on all pages  
✅ **No Maintenance** - Set it and forget it  

---

**Ready? Run this:**
```bash
./implement-call-tracking.sh && ./verify-call-tracking.sh
```

Then test in your browser and you're done! 🎉
