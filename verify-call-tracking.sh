#!/bin/bash

##############################################################################
# Call Tracking Verification Script
# Quality Tire & Lube Express - qualitytirelube.com
#
# This script verifies that call tracking is implemented correctly and
# safely for SEO
##############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Call Tracking Verification Script${NC}"
echo -e "${BLUE}Quality Tire & Lube Express${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Configuration
REAL_NUMBER="658-9099"
TRACKING_NUMBER="269-5446"
REAL_TEL="+12256589099"
TRACKING_TEL="+12252695446"

# Counters
total_checks=0
passed_checks=0
failed_checks=0
warnings=0

# Function to run a check
run_check() {
    local description="$1"
    local command="$2"
    local expected="$3"
    
    ((total_checks++))
    
    echo -e "${YELLOW}Checking:${NC} $description"
    
    if eval "$command"; then
        echo -e "${GREEN}✓ PASS${NC} - $expected"
        ((passed_checks++))
    else
        echo -e "${RED}✗ FAIL${NC} - $expected"
        ((failed_checks++))
    fi
    echo ""
}

# Function to run a warning check
run_warning() {
    local description="$1"
    local command="$2"
    local message="$3"
    
    echo -e "${YELLOW}Checking:${NC} $description"
    
    if eval "$command"; then
        echo -e "${YELLOW}⚠ WARNING${NC} - $message"
        ((warnings++))
    else
        echo -e "${GREEN}✓ OK${NC}"
    fi
    echo ""
}

echo -e "${BOLD}1. HTML Source Code Verification${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check 1: Real number exists in HTML files
run_check \
    "Real number ($REAL_NUMBER) exists in HTML files" \
    "grep -r '$REAL_NUMBER' --include='*.html' . | grep -v backups | wc -l | grep -v '^0$' > /dev/null" \
    "Real number found in HTML source"

# Check 2: Tracking number NOT in HTML files
run_check \
    "Tracking number ($TRACKING_NUMBER) NOT in HTML source" \
    "! grep -r '$TRACKING_NUMBER' --include='*.html' . | grep -v backups | grep -v 'call-tracking.js' > /dev/null" \
    "Tracking number should NOT appear in HTML source"

# Check 3: Real tel link exists
run_check \
    "Real tel: link ($REAL_TEL) exists in HTML" \
    "grep -r '$REAL_TEL' --include='*.html' . | grep -v backups | wc -l | grep -v '^0$' > /dev/null" \
    "Real tel: link found in HTML"

# Check 4: Tracking tel link NOT in HTML
run_check \
    "Tracking tel: link ($TRACKING_TEL) NOT in HTML source" \
    "! grep -r '$TRACKING_TEL' --include='*.html' . | grep -v backups | grep -v 'call-tracking.js' > /dev/null" \
    "Tracking tel: link should NOT appear in HTML source"

echo ""
echo -e "${BOLD}2. Schema Markup Verification${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check 5: Schema has real number
run_check \
    "Schema markup contains real number" \
    "grep -A 5 '\"telephone\"' index.html | grep '$REAL_NUMBER' > /dev/null" \
    "Schema.org LocalBusiness has correct telephone"

# Check 6: Schema does NOT have tracking number
run_check \
    "Schema markup does NOT contain tracking number" \
    "! grep -A 5 '\"telephone\"' index.html | grep '$TRACKING_NUMBER' > /dev/null" \
    "Schema.org markup is clean"

echo ""
echo -e "${BOLD}3. Call Tracking Script Verification${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check 7: Call tracking script exists
run_check \
    "Call tracking script file exists" \
    "[ -f 'assets/js/call-tracking.js' ]" \
    "call-tracking.js found"

# Check 8: Script is referenced in HTML files
run_check \
    "Call tracking script referenced in HTML files" \
    "grep -r 'call-tracking.js' --include='*.html' . | grep -v backups | wc -l | grep -v '^0$' > /dev/null" \
    "Script tags found in HTML files"

# Check 9: Script has defer attribute
run_check \
    "Script tags use 'defer' attribute" \
    "grep -r 'call-tracking.js.*defer' --include='*.html' . | grep -v backups | wc -l | grep -v '^0$' > /dev/null" \
    "defer attribute ensures proper loading"

# Check 10: Script contains bot detection
run_check \
    "Call tracking script has bot detection" \
    "grep -q 'function isBot' assets/js/call-tracking.js" \
    "Bot detection logic present"

# Check 11: Script has real number configured
run_check \
    "Script has real number in config" \
    "grep -q '$REAL_NUMBER' assets/js/call-tracking.js" \
    "Real number configured in script"

# Check 12: Script has tracking number configured
run_check \
    "Script has tracking number in config" \
    "grep -q '$TRACKING_NUMBER' assets/js/call-tracking.js" \
    "Tracking number configured in script"

echo ""
echo -e "${BOLD}4. File Coverage Verification${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Count HTML files
total_html=$(find . -name "*.html" -type f | grep -v backups | grep -v admin | wc -l | tr -d ' ')
html_with_script=$(grep -r 'call-tracking.js' --include='*.html' . | grep -v backups | grep -v admin | wc -l | tr -d ' ')
html_with_phone=$(grep -r "$REAL_NUMBER" --include='*.html' . | grep -v backups | wc -l | tr -d ' ')

echo -e "Total HTML files: ${BLUE}$total_html${NC}"
echo -e "Files with call tracking script: ${BLUE}$html_with_script${NC}"
echo -e "Files with phone numbers: ${BLUE}$html_with_phone${NC}"
echo ""

if [ "$html_with_phone" -gt 0 ] && [ "$html_with_script" -lt "$html_with_phone" ]; then
    echo -e "${YELLOW}⚠ WARNING:${NC} Some files with phone numbers don't have the tracking script"
    ((warnings++))
else
    echo -e "${GREEN}✓ OK${NC} - Coverage looks good"
fi
echo ""

echo ""
echo -e "${BOLD}5. Potential Issues Check${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Warning 1: Check for hardcoded tracking number
run_warning \
    "Hardcoded tracking number in HTML" \
    "grep -r '$TRACKING_NUMBER' --include='*.html' . | grep -v backups | grep -v 'call-tracking.js' | grep -v 'verify-call-tracking' > /dev/null" \
    "Tracking number found in HTML source - this will hurt SEO!"

# Warning 2: Check for tracking number in schema
run_warning \
    "Tracking number in schema markup" \
    "grep -A 5 '\"telephone\"' index.html | grep '$TRACKING_NUMBER' > /dev/null" \
    "Tracking number in schema will hurt SEO!"

# Warning 3: Check if script loads before body
run_warning \
    "Script loaded in <head> instead of before </body>" \
    "grep -B 50 'call-tracking.js' index.html | grep '<head>' > /dev/null" \
    "Script should load at end of body for optimal performance"

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Verification Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo -e "Total Checks: ${BLUE}$total_checks${NC}"
echo -e "Passed: ${GREEN}$passed_checks${NC}"
echo -e "Failed: ${RED}$failed_checks${NC}"
echo -e "Warnings: ${YELLOW}$warnings${NC}"
echo ""

# Calculate success rate
if [ $total_checks -gt 0 ]; then
    success_rate=$((passed_checks * 100 / total_checks))
    echo -e "Success Rate: ${BLUE}$success_rate%${NC}"
    echo ""
fi

# Final verdict
if [ $failed_checks -eq 0 ] && [ $warnings -eq 0 ]; then
    echo -e "${GREEN}${BOLD}✓ EXCELLENT!${NC} ${GREEN}Call tracking is properly implemented and SEO-safe.${NC}"
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo "1. Test in a browser to verify tracking number appears to humans"
    echo "2. View page source to verify real number in HTML"
    echo "3. Test with Google Search Console URL Inspection"
    echo "4. Verify Google Business Profile shows real number"
elif [ $failed_checks -eq 0 ]; then
    echo -e "${YELLOW}${BOLD}⚠ GOOD WITH WARNINGS${NC} ${YELLOW}Implementation is functional but has warnings.${NC}"
    echo ""
    echo -e "Review the warnings above and address them if possible."
elif [ $failed_checks -le 2 ]; then
    echo -e "${YELLOW}${BOLD}⚠ NEEDS ATTENTION${NC} ${YELLOW}Some checks failed but implementation may still work.${NC}"
    echo ""
    echo -e "Review the failed checks above and fix critical issues."
else
    echo -e "${RED}${BOLD}✗ FAILED${NC} ${RED}Implementation has critical issues that must be fixed.${NC}"
    echo ""
    echo -e "Review the failed checks above and fix all issues before going live."
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Manual Testing Required${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "This script verifies the code implementation, but you MUST also:"
echo ""
echo "1. ${BOLD}Browser Test (Human View):${NC}"
echo "   - Open site in Chrome/Firefox/Safari"
echo "   - Wait 1 second after page load"
echo "   - Verify phone shows: (225) 269-5446"
echo "   - Click phone link, verify it dials tracking number"
echo ""
echo "2. ${BOLD}Source Code Test (Bot View):${NC}"
echo "   - Right-click page → View Page Source"
echo "   - Search for '658-9099' - should find it"
echo "   - Search for '269-5446' - should NOT find it (except in JS)"
echo ""
echo "3. ${BOLD}Google Search Console Test:${NC}"
echo "   - Go to: https://search.google.com/search-console"
echo "   - URL Inspection → Test Live URL"
echo "   - View Crawled Page → Should show real number only"
echo ""
echo "4. ${BOLD}Schema Validation Test:${NC}"
echo "   - Go to: https://validator.schema.org/"
echo "   - Enter your URL"
echo "   - Verify LocalBusiness → telephone shows real number"
echo ""
echo "5. ${BOLD}Call Test:${NC}"
echo "   - Call tracking number from mobile: (225) 269-5446"
echo "   - Verify call is tracked in your system"
echo "   - Confirm call routes to business line"
echo ""
echo -e "${GREEN}For detailed testing procedures, see:${NC}"
echo -e "${BLUE}CALL-TRACKING-IMPLEMENTATION.md${NC}"
echo ""

exit 0
