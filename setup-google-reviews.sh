#!/bin/bash

##############################################################################
# Google Reviews Setup Script
# This script helps you configure the Google Reviews integration
##############################################################################

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CONFIG_FILE="assets/js/reviews-config.js"

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║         Google Reviews Dynamic Integration Setup              ║"
echo "║         Quality Lube Express - Zachary, LA                    ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if config file exists
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}Error: Configuration file not found at $CONFIG_FILE${NC}"
    exit 1
fi

echo -e "${YELLOW}This script will help you configure your Google Reviews integration.${NC}"
echo ""
echo "Before continuing, make sure you have:"
echo "  1. Created a Google Cloud Project"
echo "  2. Enabled the Places API (New)"
echo "  3. Created an API Key"
echo "  4. Set up billing (required even for free tier)"
echo ""
read -p "Have you completed these steps? (y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${YELLOW}Please complete the setup steps first:${NC}"
    echo ""
    echo "1. Go to: https://console.cloud.google.com/"
    echo "2. Create a new project"
    echo "3. Enable 'Places API (New)'"
    echo "4. Create an API Key"
    echo "5. Set up billing"
    echo ""
    echo "For detailed instructions, see: GOOGLE-REVIEWS-SETUP.md"
    exit 0
fi

echo ""
echo -e "${GREEN}Great! Let's configure your API key.${NC}"
echo ""

# Get API Key
echo -e "${BLUE}Step 1: Enter your Google Places API Key${NC}"
echo "You can find this in Google Cloud Console > APIs & Services > Credentials"
echo ""
read -p "API Key: " API_KEY

if [ -z "$API_KEY" ]; then
    echo -e "${RED}Error: API Key cannot be empty${NC}"
    exit 1
fi

# Validate API Key format (basic check)
if [[ ! $API_KEY =~ ^AIza[0-9A-Za-z-_]{35}$ ]]; then
    echo -e "${YELLOW}Warning: API Key format looks unusual. Make sure it's correct.${NC}"
    read -p "Continue anyway? (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 0
    fi
fi

# Configuration options
echo ""
echo -e "${BLUE}Step 2: Configure display options${NC}"
echo ""

# Max reviews
read -p "Maximum number of reviews to fetch (1-20) [default: 20]: " MAX_REVIEWS
MAX_REVIEWS=${MAX_REVIEWS:-20}

# Min rating
read -p "Minimum star rating to display (1-5) [default: 1]: " MIN_RATING
MIN_RATING=${MIN_RATING:-1}

# Sort by
echo ""
echo "Sort reviews by:"
echo "  1. Newest first (default)"
echo "  2. Highest rating first"
read -p "Choose option (1 or 2) [default: 1]: " SORT_OPTION
SORT_OPTION=${SORT_OPTION:-1}

if [ "$SORT_OPTION" = "2" ]; then
    SORT_BY="rating"
else
    SORT_BY="newest"
fi

# Reviews per page
read -p "Reviews per page [default: 6]: " REVIEWS_PER_PAGE
REVIEWS_PER_PAGE=${REVIEWS_PER_PAGE:-6}

# Show load more
read -p "Show 'Load More' button? (y/n) [default: y]: " SHOW_LOAD_MORE
if [[ $SHOW_LOAD_MORE =~ ^[Nn]$ ]]; then
    SHOW_LOAD_MORE_VALUE="false"
else
    SHOW_LOAD_MORE_VALUE="true"
fi

# Create backup
echo ""
echo -e "${YELLOW}Creating backup of current configuration...${NC}"
cp "$CONFIG_FILE" "${CONFIG_FILE}.backup"
echo -e "${GREEN}Backup created: ${CONFIG_FILE}.backup${NC}"

# Update configuration file
echo ""
echo -e "${YELLOW}Updating configuration...${NC}"

# Create new config content
cat > "$CONFIG_FILE" << EOF
/**
 * Google Reviews Configuration
 * Configure your Google Places API settings here
 */

// Configuration generated on $(date)
const GOOGLE_REVIEWS_CONFIG = {
    // Your Google Places API Key
    apiKey: '${API_KEY}',
    
    // Your Google Business Profile Place ID
    placeId: 'ChIJyz75hmqcJoYRdce4NiMuRtA',
    
    // Container ID where reviews will be displayed
    containerId: 'google-reviews-container',
    
    // Maximum number of reviews to fetch
    maxReviews: ${MAX_REVIEWS},
    
    // Minimum star rating to display (1-5)
    minRating: ${MIN_RATING},
    
    // Sort order: 'newest' or 'rating'
    sortBy: '${SORT_BY}',
    
    // Number of reviews to show per page
    reviewsPerPage: ${REVIEWS_PER_PAGE},
    
    // Show "Load More" button
    showLoadMore: ${SHOW_LOAD_MORE_VALUE}
};

/**
 * Initialize Google Reviews when DOM is ready
 */
document.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById(GOOGLE_REVIEWS_CONFIG.containerId);
    
    if (container) {
        const reviewsWidget = new GoogleReviews(GOOGLE_REVIEWS_CONFIG);
        reviewsWidget.init();
    }
});

// Export config for use in other scripts if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GOOGLE_REVIEWS_CONFIG;
}
EOF

echo -e "${GREEN}Configuration updated successfully!${NC}"
echo ""

# Summary
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    Configuration Summary                      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "  API Key: ${API_KEY:0:20}...${API_KEY: -10}"
echo "  Place ID: ChIJyz75hmqcJoYRdce4NiMuRtA"
echo "  Max Reviews: $MAX_REVIEWS"
echo "  Min Rating: $MIN_RATING stars"
echo "  Sort By: $SORT_BY"
echo "  Reviews Per Page: $REVIEWS_PER_PAGE"
echo "  Show Load More: $SHOW_LOAD_MORE_VALUE"
echo ""

# Next steps
echo -e "${GREEN}✓ Setup complete!${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo ""
echo "1. Test your reviews page:"
echo "   Open: https://qualitytirelube.com/reviews/"
echo ""
echo "2. If you see errors, check:"
echo "   - API Key is correct"
echo "   - Places API (New) is enabled"
echo "   - Billing is set up in Google Cloud"
echo "   - API Key restrictions allow your domain"
echo ""
echo "3. Customize the styling:"
echo "   Edit: assets/css/google-reviews.css"
echo ""
echo "4. For detailed troubleshooting:"
echo "   See: GOOGLE-REVIEWS-SETUP.md"
echo ""

# Security reminder
echo -e "${RED}⚠️  SECURITY REMINDER:${NC}"
echo ""
echo "Make sure to restrict your API key in Google Cloud Console:"
echo ""
echo "1. Go to: https://console.cloud.google.com/apis/credentials"
echo "2. Click on your API key"
echo "3. Under 'Application restrictions':"
echo "   - Select 'HTTP referrers (websites)'"
echo "   - Add: https://qualitytirelube.com/*"
echo "4. Under 'API restrictions':"
echo "   - Select 'Restrict key'"
echo "   - Choose 'Places API (New)'"
echo "5. Click 'Save'"
echo ""

echo -e "${GREEN}Happy reviewing! 🌟${NC}"
echo ""
