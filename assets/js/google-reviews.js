/**
 * Google Reviews Dynamic Loader
 * Fetches and displays the latest reviews from Google Business Profile
 */

class GoogleReviews {
    constructor(config) {
        this.placeId = config.placeId;
        this.apiKey = config.apiKey;
        this.container = document.getElementById(config.containerId);
        this.maxReviews = config.maxReviews || 10;
        this.minRating = config.minRating || 1;
        this.sortBy = config.sortBy || 'newest'; // 'newest' or 'rating'
        this.showLoadMore = config.showLoadMore !== false;
        this.reviewsPerPage = config.reviewsPerPage || 6;
        this.currentPage = 1;
        this.allReviews = [];
        this.displayedReviews = [];
    }

    /**
     * Initialize and fetch reviews
     */
    async init() {
        if (!this.container) {
            console.error('Reviews container not found');
            return;
        }

        this.showLoading();
        
        try {
            await this.fetchReviews();
            this.renderReviews();
        } catch (error) {
            this.showError(error.message);
        }
    }

    /**
     * Fetch reviews from Google Places API
     */
    async fetchReviews() {
        try {
            // Using Google Places API (New)
            const response = await fetch(
                `https://places.googleapis.com/v1/places/${this.placeId}?fields=reviews,rating,userRatingCount&key=${this.apiKey}`,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Goog-FieldMask': 'reviews,rating,userRatingCount'
                    }
                }
            );

            if (!response.ok) {
                throw new Error('Failed to fetch reviews from Google');
            }

            const data = await response.json();
            
            if (!data.reviews || data.reviews.length === 0) {
                throw new Error('No reviews found');
            }

            // Filter and sort reviews
            this.allReviews = data.reviews
                .filter(review => review.rating >= this.minRating)
                .sort((a, b) => {
                    if (this.sortBy === 'rating') {
                        return b.rating - a.rating;
                    }
                    // Sort by newest (using relativePublishTimeDescription as proxy)
                    return new Date(b.publishTime) - new Date(a.publishTime);
                })
                .slice(0, this.maxReviews);

            // Store overall rating info
            this.overallRating = data.rating;
            this.totalReviews = data.userRatingCount;

        } catch (error) {
            console.error('Error fetching reviews:', error);
            throw error;
        }
    }

    /**
     * Render reviews to the page
     */
    renderReviews() {
        if (!this.allReviews || this.allReviews.length === 0) {
            this.showError('No reviews available at this time.');
            return;
        }

        // Calculate reviews to display
        const startIndex = 0;
        const endIndex = this.currentPage * this.reviewsPerPage;
        this.displayedReviews = this.allReviews.slice(startIndex, endIndex);

        // Build HTML
        let html = this.buildHeaderHTML();
        html += '<div class="google-reviews-grid">';
        
        this.displayedReviews.forEach(review => {
            html += this.buildReviewCard(review);
        });
        
        html += '</div>';

        // Add load more button if needed
        if (this.showLoadMore && endIndex < this.allReviews.length) {
            html += this.buildLoadMoreButton();
        }

        // Add "Write a Review" CTA
        html += this.buildReviewCTA();

        this.container.innerHTML = html;
        this.attachEventListeners();
    }

    /**
     * Build header with overall rating
     */
    buildHeaderHTML() {
        const stars = this.generateStars(this.overallRating);
        
        return `
            <div class="google-reviews-header">
                <div class="reviews-summary">
                    <div class="google-logo">
                        <img src="../assets/img/google-logo.svg" alt="Google" onerror="this.style.display='none'">
                    </div>
                    <div class="rating-summary">
                        <div class="overall-rating">${this.overallRating.toFixed(1)}</div>
                        <div class="stars">${stars}</div>
                        <div class="review-count">Based on ${this.totalReviews} reviews</div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Build individual review card
     */
    buildReviewCard(review) {
        const stars = this.generateStars(review.rating);
        const authorName = review.authorAttribution?.displayName || 'Anonymous';
        const authorPhoto = review.authorAttribution?.photoUri || '';
        const reviewText = review.text?.text || review.originalText?.text || '';
        const timeAgo = review.relativePublishTimeDescription || this.getTimeAgo(review.publishTime);
        
        // Truncate long reviews
        const maxLength = 300;
        const truncatedText = reviewText.length > maxLength 
            ? reviewText.substring(0, maxLength) + '...' 
            : reviewText;
        const needsReadMore = reviewText.length > maxLength;

        return `
            <div class="review-card">
                <div class="review-header">
                    <div class="author-info">
                        ${authorPhoto ? 
                            `<img src="${authorPhoto}" alt="${authorName}" class="author-photo">` :
                            `<div class="author-photo-placeholder">${authorName.charAt(0)}</div>`
                        }
                        <div class="author-details">
                            <div class="author-name">${authorName}</div>
                            <div class="review-time">${timeAgo}</div>
                        </div>
                    </div>
                    <div class="review-rating">
                        ${stars}
                    </div>
                </div>
                <div class="review-content">
                    <p class="review-text ${needsReadMore ? 'truncated' : ''}" data-full-text="${this.escapeHtml(reviewText)}">
                        ${this.escapeHtml(truncatedText)}
                    </p>
                    ${needsReadMore ? '<button class="read-more-btn">Read more</button>' : ''}
                </div>
            </div>
        `;
    }

    /**
     * Build load more button
     */
    buildLoadMoreButton() {
        return `
            <div class="load-more-container">
                <button class="load-more-btn" id="loadMoreReviews">
                    Load More Reviews
                </button>
            </div>
        `;
    }

    /**
     * Build review CTA section
     */
    buildReviewCTA() {
        const writeReviewUrl = `https://search.google.com/local/writereview?placeid=${this.placeId}`;
        
        return `
            <div class="review-cta">
                <h3>Share Your Experience</h3>
                <p>We'd love to hear about your visit to Quality Lube Express!</p>
                <a href="${writeReviewUrl}" target="_blank" rel="noopener noreferrer" class="write-review-btn">
                    <i class="fab fa-google"></i> Write a Review on Google
                </a>
            </div>
        `;
    }

    /**
     * Generate star rating HTML
     */
    generateStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        
        let stars = '';
        
        // Full stars
        for (let i = 0; i < fullStars; i++) {
            stars += '<i class="fas fa-star"></i>';
        }
        
        // Half star
        if (hasHalfStar) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        }
        
        // Empty stars
        for (let i = 0; i < emptyStars; i++) {
            stars += '<i class="far fa-star"></i>';
        }
        
        return stars;
    }

    /**
     * Get relative time (fallback if API doesn't provide it)
     */
    getTimeAgo(dateString) {
        if (!dateString) return '';
        
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);
        
        const intervals = {
            year: 31536000,
            month: 2592000,
            week: 604800,
            day: 86400,
            hour: 3600,
            minute: 60
        };
        
        for (const [unit, secondsInUnit] of Object.entries(intervals)) {
            const interval = Math.floor(seconds / secondsInUnit);
            if (interval >= 1) {
                return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
            }
        }
        
        return 'just now';
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Show loading state
     */
    showLoading() {
        this.container.innerHTML = `
            <div class="reviews-loading">
                <div class="loading-spinner"></div>
                <p>Loading reviews...</p>
            </div>
        `;
    }

    /**
     * Show error message
     */
    showError(message) {
        this.container.innerHTML = `
            <div class="reviews-error">
                <i class="fas fa-exclamation-circle"></i>
                <p>${message}</p>
                <p class="error-subtext">Please check back later or visit our Google Business Profile.</p>
                <a href="https://search.google.com/local/reviews?placeid=${this.placeId}" 
                   target="_blank" 
                   rel="noopener noreferrer" 
                   class="view-google-btn">
                    View Reviews on Google
                </a>
            </div>
        `;
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Load more button
        const loadMoreBtn = document.getElementById('loadMoreReviews');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                this.currentPage++;
                this.renderReviews();
                
                // Smooth scroll to new reviews
                setTimeout(() => {
                    const newReviewIndex = (this.currentPage - 1) * this.reviewsPerPage;
                    const reviewCards = document.querySelectorAll('.review-card');
                    if (reviewCards[newReviewIndex]) {
                        reviewCards[newReviewIndex].scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'start' 
                        });
                    }
                }, 100);
            });
        }

        // Read more buttons
        const readMoreBtns = document.querySelectorAll('.read-more-btn');
        readMoreBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const reviewText = e.target.previousElementSibling;
                const fullText = reviewText.getAttribute('data-full-text');
                
                if (reviewText.classList.contains('truncated')) {
                    reviewText.textContent = fullText;
                    reviewText.classList.remove('truncated');
                    e.target.textContent = 'Read less';
                } else {
                    const truncatedText = fullText.substring(0, 300) + '...';
                    reviewText.textContent = truncatedText;
                    reviewText.classList.add('truncated');
                    e.target.textContent = 'Read more';
                }
            });
        });
    }

    /**
     * Refresh reviews
     */
    async refresh() {
        this.currentPage = 1;
        this.displayedReviews = [];
        await this.init();
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GoogleReviews;
}
