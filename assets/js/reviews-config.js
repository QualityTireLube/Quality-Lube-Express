/**
 * Google Reviews Configuration
 * Configure your Google Places API settings here
 */

// IMPORTANT: Replace these values with your actual credentials
const GOOGLE_REVIEWS_CONFIG = {
    // Your Google Places API Key
    // Get one at: https://console.cloud.google.com/apis/credentials
    apiKey: 'AIzaSyCFtj9ZNk_H62RhuStR8hcQybIIvX-e_0w',
    
    // Your Google Business Profile Place ID
    // Current Place ID for Quality Lube Express
    placeId: 'ChIJyz75hmqcJoYRdce4NiMuRtA',
    
    // Container ID where reviews will be displayed
    containerId: 'google-reviews-container',
    
    // Maximum number of reviews to fetch
    maxReviews: 20,
    
    // Minimum star rating to display (1-5)
    minRating: 1,
    
    // Sort order: 'newest' or 'rating'
    sortBy: 'newest',
    
    // Number of reviews to show per page
    reviewsPerPage: 6,
    
    // Show "Load More" button
    showLoadMore: true
};

/**
 * Initialize Google Reviews when DOM is ready
 */
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the reviews page
    const container = document.getElementById(GOOGLE_REVIEWS_CONFIG.containerId);
    
    if (container) {
        // Check if API key is configured
        if (GOOGLE_REVIEWS_CONFIG.apiKey === 'YOUR_GOOGLE_PLACES_API_KEY') {
            container.innerHTML = `
                <div class="reviews-error">
                    <i class="fas fa-exclamation-circle"></i>
                    <p><strong>Configuration Required</strong></p>
                    <p class="error-subtext">Please configure your Google Places API key in <code>reviews-config.js</code></p>
                    <p class="error-subtext" style="margin-top: 1rem;">
                        <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" style="color: #4285f4; text-decoration: underline;">
                            Get your API key here
                        </a>
                    </p>
                </div>
            `;
            return;
        }

        // Initialize the reviews
        const reviewsWidget = new GoogleReviews(GOOGLE_REVIEWS_CONFIG);
        reviewsWidget.init();

        // Optional: Auto-refresh reviews every 5 minutes
        // setInterval(() => {
        //     reviewsWidget.refresh();
        // }, 5 * 60 * 1000);
    }
});

// Export config for use in other scripts if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GOOGLE_REVIEWS_CONFIG;
}
