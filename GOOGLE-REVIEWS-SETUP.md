# Google Reviews Dynamic Integration - Setup Guide

This guide will help you set up dynamic Google reviews on your website that automatically fetch and display the latest reviews from your Google Business Profile.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Step-by-Step Setup](#step-by-step-setup)
4. [Configuration Options](#configuration-options)
5. [Customization](#customization)
6. [Troubleshooting](#troubleshooting)
7. [Features](#features)

---

## 🎯 Overview

The dynamic Google Reviews system replaces the static Elfsight widget with a custom solution that:

- ✅ Fetches real-time reviews from Google Places API
- ✅ Displays reviews in a modern, responsive grid layout
- ✅ Shows overall rating and total review count
- ✅ Includes "Load More" functionality for pagination
- ✅ Provides a "Write a Review" call-to-action button
- ✅ Fully responsive and mobile-friendly
- ✅ No monthly subscription fees (unlike Elfsight)

---

## 📦 Prerequisites

Before you begin, you'll need:

1. **Google Cloud Account** (free to create)
2. **Google Places API Key** (we'll show you how to get this)
3. **Your Google Business Profile Place ID** (already configured: `ChIJyz75hmqcJoYRdce4NiMuRtA`)

---

## 🚀 Step-by-Step Setup

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. Click **"Select a project"** → **"New Project"**
4. Name your project (e.g., "Quality Lube Reviews")
5. Click **"Create"**

### Step 2: Enable the Places API

1. In the Google Cloud Console, go to **"APIs & Services"** → **"Library"**
2. Search for **"Places API (New)"**
3. Click on it and press **"Enable"**
4. Wait for the API to be enabled (takes a few seconds)

### Step 3: Create an API Key

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"API Key"**
3. Your API key will be created and displayed
4. **IMPORTANT:** Click **"Restrict Key"** to secure it

### Step 4: Restrict Your API Key (Security)

For security, you should restrict your API key:

#### Application Restrictions:
1. Select **"HTTP referrers (websites)"**
2. Add your website domains:
   ```
   https://qualitytirelube.com/*
   http://localhost/*
   ```

#### API Restrictions:
1. Select **"Restrict key"**
2. Choose **"Places API (New)"** from the dropdown
3. Click **"Save"**

### Step 5: Configure Your Website

1. Open the file: `assets/js/reviews-config.js`
2. Replace `YOUR_GOOGLE_PLACES_API_KEY` with your actual API key:

```javascript
const GOOGLE_REVIEWS_CONFIG = {
    apiKey: 'AIzaSyCFtj9ZNk_H62RhuStR8hcQybIIvX-e_0w', // Your actual API key
    placeId: 'ChIJyz75hmqcJoYRdce4NiMuRtA',
    // ... rest of config
};
```

3. Save the file

### Step 6: Test Your Implementation

1. Open your website: `https://qualitytirelube.com/reviews/`
2. You should see your Google reviews loading dynamically
3. If you see an error, check the [Troubleshooting](#troubleshooting) section

---

## ⚙️ Configuration Options

You can customize the reviews display by editing `assets/js/reviews-config.js`:

```javascript
const GOOGLE_REVIEWS_CONFIG = {
    // Your Google Places API Key
    apiKey: 'YOUR_API_KEY',
    
    // Your Google Business Profile Place ID
    placeId: 'ChIJyz75hmqcJoYRdce4NiMuRtA',
    
    // Container ID where reviews will be displayed
    containerId: 'google-reviews-container',
    
    // Maximum number of reviews to fetch (1-20)
    maxReviews: 20,
    
    // Minimum star rating to display (1-5)
    // Set to 4 to only show 4 and 5 star reviews
    minRating: 1,
    
    // Sort order: 'newest' or 'rating'
    sortBy: 'newest',
    
    // Number of reviews to show per page
    reviewsPerPage: 6,
    
    // Show "Load More" button
    showLoadMore: true
};
```

### Configuration Examples

**Show only 5-star reviews:**
```javascript
minRating: 5,
```

**Show 9 reviews per page:**
```javascript
reviewsPerPage: 9,
```

**Sort by highest rating first:**
```javascript
sortBy: 'rating',
```

**Hide "Load More" button (show all at once):**
```javascript
showLoadMore: false,
```

---

## 🎨 Customization

### Styling

All styles are in `assets/css/google-reviews.css`. You can customize:

- **Colors:** Change the primary color by updating `var(--color-content-primary)`
- **Layout:** Modify the grid layout in `.google-reviews-grid`
- **Card design:** Update `.review-card` styles
- **Buttons:** Customize `.write-review-btn` and `.load-more-btn`

### Example Color Customization

```css
/* Change star color */
.fa-star,
.fa-star-half-alt {
    color: #ff9800; /* Orange instead of yellow */
}

/* Change primary button color */
.write-review-btn {
    background: #e74c3c; /* Red instead of blue */
}
```

### Grid Layout Options

```css
/* Show 2 columns on desktop instead of 3 */
.google-reviews-grid {
    grid-template-columns: repeat(2, 1fr);
}

/* Show 4 columns on large screens */
@media (min-width: 1400px) {
    .google-reviews-grid {
        grid-template-columns: repeat(4, 1fr);
    }
}
```

---

## 🔧 Troubleshooting

### Issue: "Configuration Required" Error

**Solution:** You haven't set your API key yet.
- Open `assets/js/reviews-config.js`
- Replace `YOUR_GOOGLE_PLACES_API_KEY` with your actual API key

### Issue: "Failed to fetch reviews from Google"

**Possible causes:**

1. **API Key not enabled**
   - Go to Google Cloud Console
   - Make sure Places API (New) is enabled

2. **API Key restrictions too strict**
   - Check your API key restrictions
   - Make sure your website domain is in the allowed list

3. **Billing not enabled**
   - Google requires a billing account (even for free tier)
   - Go to Google Cloud Console → Billing
   - Set up billing (you get $200 free credit per month)

4. **Wrong Place ID**
   - Verify your Place ID is correct
   - Current ID: `ChIJyz75hmqcJoYRdce4NiMuRtA`

### Issue: Reviews not showing up

**Solution:**
1. Open browser console (F12)
2. Check for JavaScript errors
3. Verify the container exists: `document.getElementById('google-reviews-container')`
4. Check if API is returning data

### Issue: CORS Error

**Solution:**
- Make sure you're testing on the actual domain (not file://)
- Check API key HTTP referrer restrictions
- Add your domain to allowed referrers

### Issue: Quota Exceeded

**Solution:**
- Google Places API has usage limits
- Free tier: $200 credit = ~28,000 requests per month
- Each page load = 1 request
- If you exceed limits, you'll need to upgrade your billing plan

---

## ✨ Features

### Current Features

- ✅ Real-time review fetching from Google
- ✅ Responsive grid layout (3 columns → 2 → 1)
- ✅ Overall rating display with stars
- ✅ Individual review cards with:
  - Author name and photo
  - Star rating
  - Review text with "Read more" for long reviews
  - Time posted (e.g., "2 weeks ago")
- ✅ Load more pagination
- ✅ "Write a Review" CTA button
- ✅ Loading state animation
- ✅ Error handling with helpful messages
- ✅ Mobile-friendly design
- ✅ Print-friendly styles

### Future Enhancement Ideas

- 🔄 Auto-refresh reviews every X minutes
- 🔍 Search/filter reviews
- 📊 Review statistics (rating breakdown)
- 🏷️ Review categories/tags
- 💬 Reply to reviews (if you're the business owner)
- 🌐 Multi-language support
- 📱 Share reviews on social media
- ⭐ Highlight featured reviews

---

## 💰 Cost Breakdown

### Google Places API Pricing

- **Free Tier:** $200 credit per month
- **Place Details (including reviews):** $0.017 per request
- **Free requests per month:** ~11,764 requests
- **Typical usage:** If 1,000 people visit your reviews page per month = $17 worth = **FREE**

### Comparison to Elfsight

| Feature | Elfsight | Custom Solution |
|---------|----------|-----------------|
| Monthly Cost | $5-$25 | **FREE** (within limits) |
| Customization | Limited | **Full control** |
| Performance | External widget | **Native, faster** |
| Branding | Elfsight logo | **No branding** |
| Updates | Automatic | Manual (but simple) |

---

## 📝 Files Included

1. **`assets/js/google-reviews.js`** - Main JavaScript class for fetching and displaying reviews
2. **`assets/css/google-reviews.css`** - Styling for the reviews display
3. **`assets/js/reviews-config.js`** - Configuration file (where you set your API key)
4. **`reviews/index.html`** - Updated reviews page with new integration
5. **`GOOGLE-REVIEWS-SETUP.md`** - This setup guide

---

## 🆘 Need Help?

If you run into issues:

1. Check the browser console for errors (F12)
2. Review the [Troubleshooting](#troubleshooting) section
3. Verify your API key is correct and has proper permissions
4. Make sure Places API (New) is enabled in Google Cloud Console
5. Check that billing is set up (required even for free tier)

---

## 📚 Additional Resources

- [Google Places API Documentation](https://developers.google.com/maps/documentation/places/web-service/overview)
- [Google Cloud Console](https://console.cloud.google.com/)
- [API Key Best Practices](https://developers.google.com/maps/api-security-best-practices)

---

## ✅ Quick Start Checklist

- [ ] Create Google Cloud project
- [ ] Enable Places API (New)
- [ ] Create API key
- [ ] Restrict API key (HTTP referrers + API restrictions)
- [ ] Set up billing in Google Cloud (required for API access)
- [ ] Copy API key to `reviews-config.js`
- [ ] Test on your website
- [ ] Verify reviews are loading
- [ ] Customize styling if desired

---

**Last Updated:** February 6, 2026
**Version:** 1.0.0
