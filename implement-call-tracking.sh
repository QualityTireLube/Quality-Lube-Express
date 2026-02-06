#!/bin/bash

##############################################################################
# Call Tracking Implementation Script
# Quality Tire & Lube Express - qualitytirelube.com
#
# This script adds the SEO-safe call tracking script to all HTML pages
##############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Call Tracking Implementation Script${NC}"
echo -e "${BLUE}Quality Tire & Lube Express${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "index.html" ]; then
    echo -e "${RED}Error: index.html not found. Please run this script from the project root.${NC}"
    exit 1
fi

# Check if call-tracking.js exists
if [ ! -f "assets/js/call-tracking.js" ]; then
    echo -e "${RED}Error: assets/js/call-tracking.js not found.${NC}"
    echo -e "${RED}Please ensure the call tracking script is in place.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Call tracking script found${NC}"
echo ""

# Backup directory
BACKUP_DIR="backups/pre-call-tracking-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo -e "${YELLOW}Creating backups...${NC}"

# Find all HTML files and create backups
find . -name "*.html" -type f | while read -r file; do
    # Skip files in backup directory
    if [[ "$file" == *"/backups/"* ]]; then
        continue
    fi
    
    # Create backup
    backup_path="$BACKUP_DIR/${file#./}"
    mkdir -p "$(dirname "$backup_path")"
    cp "$file" "$backup_path"
    echo -e "  ${GREEN}✓${NC} Backed up: $file"
done

echo ""
echo -e "${GREEN}✓ Backups created in: $BACKUP_DIR${NC}"
echo ""

# Counter for modified files
modified_count=0
skipped_count=0

echo -e "${YELLOW}Adding call tracking script to HTML files...${NC}"
echo ""

# Function to add script to HTML file
add_script_to_file() {
    local file="$1"
    local depth=$(echo "$file" | grep -o "/" | wc -l)
    
    # Calculate relative path to assets
    local path_prefix=""
    if [ $depth -eq 1 ]; then
        path_prefix="assets/js/call-tracking.js"
    elif [ $depth -eq 2 ]; then
        path_prefix="../assets/js/call-tracking.js"
    elif [ $depth -eq 3 ]; then
        path_prefix="../../assets/js/call-tracking.js"
    else
        path_prefix="../../../assets/js/call-tracking.js"
    fi
    
    # Check if script already exists in file
    if grep -q "call-tracking.js" "$file"; then
        echo -e "  ${YELLOW}⊘${NC} Already has script: $file"
        ((skipped_count++))
        return
    fi
    
    # Check if file has closing body tag
    if ! grep -q "</body>" "$file"; then
        echo -e "  ${YELLOW}⊘${NC} No </body> tag: $file"
        ((skipped_count++))
        return
    fi
    
    # Add script before closing body tag
    # Create temporary file
    temp_file=$(mktemp)
    
    # Use awk to insert script before </body>
    awk -v script="<script src=\"$path_prefix\" defer></script>" '
        /<\/body>/ {
            print "    <!-- SEO-Safe Call Tracking -->"
            print "    " script
        }
        { print }
    ' "$file" > "$temp_file"
    
    # Replace original file
    mv "$temp_file" "$file"
    
    echo -e "  ${GREEN}✓${NC} Added script: $file"
    ((modified_count++))
}

# Process all HTML files
find . -name "*.html" -type f | while read -r file; do
    # Skip files in backup directory
    if [[ "$file" == *"/backups/"* ]]; then
        continue
    fi
    
    # Skip admin files (optional)
    if [[ "$file" == *"/admin/"* ]]; then
        continue
    fi
    
    add_script_to_file "$file"
done

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Implementation Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Modified files: $modified_count${NC}"
echo -e "${YELLOW}Skipped files: $skipped_count${NC}"
echo -e "${BLUE}Backup location: $BACKUP_DIR${NC}"
echo ""

echo -e "${GREEN}✓ Call tracking implementation complete!${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "1. Review the changes in a few files to verify correct placement"
echo -e "2. Test in a browser to ensure tracking number appears"
echo -e "3. Verify HTML source still shows real number (225) 658-9099"
echo -e "4. Run verification script: ${BLUE}./verify-call-tracking.sh${NC}"
echo ""
echo -e "${YELLOW}To rollback:${NC}"
echo -e "  cp -r $BACKUP_DIR/* ."
echo ""
