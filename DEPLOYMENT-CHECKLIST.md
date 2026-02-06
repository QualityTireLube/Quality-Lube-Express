# 📋 Call Tracking Deployment Checklist

## Quality Tire & Lube Express - qualitytirelube.com

**Date:** _______________  
**Deployed By:** _______________  
**Version:** 1.0

---

## 🎯 Phone Numbers Reference

| Type | Number | Format |
|------|--------|--------|
| **Real (SEO)** | (225) 658-9099 | `tel:+12256589099` |
| **Tracking (Humans)** | (225) 269-5446 | `tel:+12252695446` |

---

## ✅ Pre-Deployment Checklist

### 1. File Verification

- [ ] `assets/js/call-tracking.js` exists
- [ ] File size is ~15-20KB (not corrupted)
- [ ] File contains "function isBot()"
- [ ] File contains both phone numbers in config
- [ ] Debug mode is set to `false` (line 47)

### 2. Documentation Review

- [ ] Read `QUICK-START.md`
- [ ] Reviewed `CALL-TRACKING-IMPLEMENTATION.md`
- [ ] Understand bot detection logic
- [ ] Know how to rollback if needed
- [ ] Have backup plan ready

### 3. Test Page Verification

- [ ] Open `test-call-tracking.html` in browser
- [ ] All status boxes show green/success
- [ ] Phone numbers show tracking number (269-5446)
- [ ] View source shows real number only (658-9099)
- [ ] Schema markup shows real number
- [ ] All manual tests pass
- [ ] Debug console shows no errors

### 4. Local Testing

- [ ] Test on Chrome browser
- [ ] Test on Firefox browser
- [ ] Test on Safari browser
- [ ] Test on mobile device (iOS/Android)
- [ ] Test in incognito/private mode
- [ ] All browsers show tracking number correctly

### 5. Source Code Verification

- [ ] View page source (Ctrl+U / Cmd+Option+U)
- [ ] Search for "658-9099" - FOUND ✓
- [ ] Search for "269-5446" - NOT FOUND (except in .js) ✓
- [ ] Schema markup has real number ✓
- [ ] No hardcoded tracking numbers ✓

---

## 🚀 Deployment Steps

### Step 1: Create Backup

- [ ] Current date/time noted: _______________
- [ ] Run: `mkdir -p backups/manual-$(date +%Y%m%d-%H%M%S)`
- [ ] Copy all HTML files to backup
- [ ] Verify backup created successfully
- [ ] Backup location noted: _______________

### Step 2: Run Implementation Script

- [ ] Navigate to project root
- [ ] Run: `./implement-call-tracking.sh`
- [ ] Script completed without errors
- [ ] Review summary output
- [ ] Number of files modified: _______________
- [ ] Backup location from script: _______________

**OR Manual Implementation:**

- [ ] Add script tag to each HTML file before `</body>`:
  ```html
  <script src="assets/js/call-tracking.js" defer></script>
  ```
- [ ] Adjust path for folder depth (../ or ../../)
- [ ] Verify script tag on all pages

### Step 3: Run Verification Script

- [ ] Run: `./verify-call-tracking.sh`
- [ ] All checks passed: _____ / _____
- [ ] No critical failures
- [ ] Warnings (if any) reviewed and acceptable
- [ ] Success rate: _____% (should be 100%)

### Step 4: Spot Check Files

- [ ] Open `index.html` in text editor
- [ ] Verify script tag before `</body>`
- [ ] Verify HTML has real number (658-9099)
- [ ] Verify schema has real number
- [ ] Check 2-3 other random pages
- [ ] All pages have script tag ✓

---

## 🧪 Post-Deployment Testing

### Browser Testing (Human View)

**Homepage Test:**
- [ ] Open: https://qualitytirelube.com/
- [ ] Wait 2 seconds after page load
- [ ] Phone number shows: (225) 269-5446 ✓
- [ ] Click phone link
- [ ] Dials: +12252695446 ✓
- [ ] No JavaScript errors in console

**Contact Page Test:**
- [ ] Open: https://qualitytirelube.com/contact-us/
- [ ] Phone number shows: (225) 269-5446 ✓
- [ ] Click phone link works ✓
- [ ] No JavaScript errors

**Service Pages Test:**
- [ ] Test 2-3 service pages
- [ ] All show tracking number ✓
- [ ] All links work correctly ✓

**Mobile Test:**
- [ ] Open site on mobile device
- [ ] Phone number shows: (225) 269-5446 ✓
- [ ] Tap to call works ✓
- [ ] No errors or issues

### Source Code Testing (Bot View)

**View Source Test:**
- [ ] Right-click → View Page Source
- [ ] Search for "658-9099" - FOUND ✓
- [ ] Search for "269-5446" - NOT FOUND ✓
- [ ] Schema has `"telephone": "+1-225-658-9099"` ✓
- [ ] Script tag present with defer attribute ✓

**Multiple Pages:**
- [ ] Check source on 3-4 different pages
- [ ] All have real number in source ✓
- [ ] None have tracking number in source ✓

### Google Tools Testing

**Rich Results Test:**
- [ ] Go to: https://search.google.com/test/rich-results
- [ ] Enter: https://qualitytirelube.com/
- [ ] Click "Test URL"
- [ ] LocalBusiness detected ✓
- [ ] Telephone shows: +1-225-658-9099 ✓
- [ ] No errors or warnings ✓
- [ ] Screenshot saved: _______________

**Schema Validator:**
- [ ] Go to: https://validator.schema.org/
- [ ] Enter: https://qualitytirelube.com/
- [ ] Click "Run Test"
- [ ] No errors ✓
- [ ] Telephone field correct ✓
- [ ] Screenshot saved: _______________

**Google Search Console:**
- [ ] Go to: https://search.google.com/search-console
- [ ] Select property: qualitytirelube.com
- [ ] URL Inspection → Enter homepage URL
- [ ] Click "Test Live URL"
- [ ] Wait for results
- [ ] Click "View Tested Page"
- [ ] Click "More Info" → "View Crawled Page"
- [ ] Search for phone numbers in HTML
- [ ] Only real number (658-9099) found ✓
- [ ] Screenshot saved: _______________

### Call Tracking System Test

**Direct Call Test:**
- [ ] Call tracking number: (225) 269-5446
- [ ] Call connects successfully
- [ ] Routes to business line: (225) 658-9099
- [ ] Call is logged in tracking system
- [ ] Source shows: "Direct" or "Unknown"
- [ ] Time: _______________

**Website Call Test:**
- [ ] Open website on mobile device
- [ ] Click phone number
- [ ] Call connects successfully
- [ ] Routes to business line
- [ ] Call is logged in tracking system
- [ ] Source shows: "Website" or URL
- [ ] Time: _______________

---

## 🔍 Verification Matrix

| Test | Expected Result | Actual Result | Pass/Fail |
|------|----------------|---------------|-----------|
| Browser shows tracking # | (225) 269-5446 | | [ ] |
| Source shows real # | (225) 658-9099 | | [ ] |
| Schema has real # | +1-225-658-9099 | | [ ] |
| Links dial tracking # | +12252695446 | | [ ] |
| Rich Results Test | Real # only | | [ ] |
| Schema Validator | Real # only | | [ ] |
| Google Search Console | Real # only | | [ ] |
| Call tracking works | Calls logged | | [ ] |
| Calls route correctly | To business line | | [ ] |
| Mobile works | Tracking # shown | | [ ] |
| No JS errors | Console clean | | [ ] |
| All pages updated | Script on all | | [ ] |

**Total Passed:** _____ / 12  
**Required to Pass:** 12 / 12

---

## 📊 Post-Deployment Monitoring

### 24-Hour Check

**Date/Time:** _______________

- [ ] Call tracking receiving calls
- [ ] Calls routing correctly
- [ ] No customer complaints
- [ ] No JavaScript errors reported
- [ ] Site functioning normally

**Calls Received:** _____  
**Issues Found:** _____

### 1-Week Check

**Date/Time:** _______________

- [ ] Google Search Console - no errors
- [ ] Call tracking data accurate
- [ ] No NAP warnings
- [ ] Site rankings stable
- [ ] Google Business Profile unchanged

**Total Calls Tracked:** _____  
**Issues Found:** _____

### 1-Month Check

**Date/Time:** _______________

- [ ] Run verification script again
- [ ] Google Search Console URL Inspection
- [ ] Rich Results Test validation
- [ ] Call tracking analytics review
- [ ] Local search rankings check
- [ ] Google Business Profile status

**Total Calls Tracked:** _____  
**Ranking Changes:** _____  
**Issues Found:** _____

---

## 🚨 Emergency Procedures

### If Issues Detected

**Issue Type:** _______________  
**Detected By:** _______________  
**Date/Time:** _______________

**Immediate Actions:**
- [ ] Document the issue
- [ ] Check browser console for errors
- [ ] Verify script is loading
- [ ] Check if bot detection is working

**If Critical (Google sees tracking number):**
- [ ] Immediately restore from backup
- [ ] Verify restoration successful
- [ ] Confirm real number in source
- [ ] Request Google re-crawl

### Rollback Procedure

**Date/Time:** _______________  
**Reason:** _______________

- [ ] Locate backup: `backups/pre-call-tracking-*`
- [ ] Backup location: _______________
- [ ] Run: `cp -r [backup-path]/* .`
- [ ] Verify files restored
- [ ] Test site functionality
- [ ] Confirm real number showing
- [ ] Document reason for rollback

---

## ✅ Final Sign-Off

### Pre-Deployment

- [ ] All pre-deployment checks passed
- [ ] Test page verified successfully
- [ ] Backup created and verified
- [ ] Team briefed on changes

**Signed:** _______________  
**Date:** _______________

### Deployment

- [ ] Implementation completed successfully
- [ ] Verification script passed all checks
- [ ] Post-deployment testing completed
- [ ] All tests passed (12/12)

**Signed:** _______________  
**Date:** _______________

### Post-Deployment

- [ ] 24-hour check completed
- [ ] 1-week check completed
- [ ] 1-month check completed
- [ ] No issues detected
- [ ] Call tracking functioning correctly
- [ ] SEO metrics stable/improved

**Signed:** _______________  
**Date:** _______________

---

## 📝 Notes & Issues

**Deployment Notes:**
```
_______________________________________________________________
_______________________________________________________________
_______________________________________________________________
_______________________________________________________________
```

**Issues Encountered:**
```
_______________________________________________________________
_______________________________________________________________
_______________________________________________________________
_______________________________________________________________
```

**Resolutions:**
```
_______________________________________________________________
_______________________________________________________________
_______________________________________________________________
_______________________________________________________________
```

---

## 📞 Contact Information

**Call Tracking Provider:** _______________  
**Support Phone:** _______________  
**Support Email:** _______________

**Web Developer:** _______________  
**Phone:** _______________  
**Email:** _______________

**SEO Consultant:** _______________  
**Phone:** _______________  
**Email:** _______________

---

## 🎯 Success Criteria

### Must Have (Critical)
- [x] Real number (658-9099) in HTML source
- [x] Real number in schema markup
- [x] Tracking number (269-5446) shown to humans
- [x] Bot detection working correctly
- [x] Calls being tracked
- [x] Calls routing to business line
- [x] No JavaScript errors
- [x] Google Search Console clean

### Should Have (Important)
- [x] All pages updated with script
- [x] Mobile working correctly
- [x] Rich Results Test passing
- [x] Schema Validator passing
- [x] Call tracking analytics working
- [x] No performance issues

### Nice to Have (Optional)
- [ ] Debug logging available
- [ ] Mutation observer working
- [ ] Analytics integration
- [ ] Custom event tracking

---

## 📚 Reference Documents

- [ ] `README-CALL-TRACKING.md` - Overview
- [ ] `QUICK-START.md` - Quick reference
- [ ] `CALL-TRACKING-IMPLEMENTATION.md` - Full guide
- [ ] `IMPLEMENTATION-SUMMARY.txt` - Summary
- [ ] `CALL-TRACKING-FLOWCHART.txt` - Visual flow
- [ ] `test-call-tracking.html` - Test page

---

## ✨ Deployment Complete

**Deployment Status:** [ ] Success  [ ] Failed  [ ] Rolled Back

**Final Notes:**
```
_______________________________________________________________
_______________________________________________________________
_______________________________________________________________
_______________________________________________________________
```

**Completed By:** _______________  
**Date:** _______________  
**Time:** _______________

---

**🎉 Congratulations! Your SEO-safe call tracking is now live!**

Remember to:
- Monitor call tracking daily for the first week
- Run monthly Google Search Console checks
- Maintain NAP consistency across all platforms
- Keep Google Business Profile updated with real number only

**For questions or issues, refer to the troubleshooting section in:**  
`CALL-TRACKING-IMPLEMENTATION.md`
