# Google Reviews - Quick Start Guide

## 🚀 5-Minute Setup

### Step 1: Get Your API Key (2 minutes)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **"Places API (New)"**
4. Create an **API Key**
5. Set up **billing** (required, but you get $200 free credit/month)

### Step 2: Configure Your Website (1 minute)

Run the setup script:

```bash
cd /Users/stephenvillavaso/Documents/GitHub/Quality-Lube-Express
./setup-google-reviews.sh
```

Or manually edit `assets/js/reviews-config.js`:

```javascript
const GOOGLE_REVIEWS_CONFIG = {
    apiKey: 'YOUR_API_KEY_HERE', // Replace this
    placeId: 'ChIJyz75hmqcJoYRdce4NiMuRtA',
    // ... rest stays the same
};
```

### Step 3: Secure Your API Key (2 minutes)

1. Go to [API Credentials](https://console.cloud.google.com/apis/credentials)
2. Click your API key
3. Add HTTP referrer: `https://qualitytirelube.com/*`
4. Restrict to: **Places API (New)**
5. Save

### Step 4: Test

Open: [https://qualitytirelube.com/reviews/](https://qualitytirelube.com/reviews/)

---

## 📁 Files Created

- ✅ `assets/js/google-reviews.js` - Main functionality
- ✅ `assets/css/google-reviews.css` - Styling
- ✅ `assets/js/reviews-config.js` - Your settings
- ✅ `assets/img/google-logo.svg` - Google logo
- ✅ `reviews/index.html` - Updated page
- ✅ `setup-google-reviews.sh` - Setup helper
- ✅ `GOOGLE-REVIEWS-SETUP.md` - Full documentation

---

## 🎨 Quick Customizations

### Show Only 5-Star Reviews

```javascript
// In reviews-config.js
minRating: 5,
```

### Change Number of Reviews Per Page

```javascript
// In reviews-config.js
reviewsPerPage: 9,
```

### Change Button Color

```css
/* In assets/css/google-reviews.css */
.write-review-btn {
    background: #e74c3c; /* Red instead of blue */
}
```

### Change Grid Layout

```css
/* In assets/css/google-reviews.css */
.google-reviews-grid {
    grid-template-columns: repeat(2, 1fr); /* 2 columns instead of 3 */
}
```

---

## 🆘 Common Issues

### "Configuration Required" Error
→ You haven't set your API key in `reviews-config.js`

### "Failed to fetch reviews"
→ Check these:
- [ ] Places API (New) is enabled
- [ ] Billing is set up
- [ ] API key is correct
- [ ] Domain is in allowed referrers

### No reviews showing
→ Open browser console (F12) and check for errors

---

## 💰 Cost

**FREE** for most websites!

- Google gives you $200 credit/month
- Each page view = 1 API call = $0.017
- You can have ~11,764 page views/month for FREE
- After that: $0.017 per additional view

**Example:** 1,000 visitors/month = $17 worth = **FREE** ✅

---

## 📞 Your Business Info

- **Place ID:** `ChIJyz75hmqcJoYRdce4NiMuRtA`
- **Business:** Quality Lube Express
- **Location:** 3617 LA-19, Zachary, LA 70791
- **Phone:** 225-658-9099

---

## 🔗 Helpful Links

- [Google Cloud Console](https://console.cloud.google.com/)
- [API Credentials](https://console.cloud.google.com/apis/credentials)
- [Places API Documentation](https://developers.google.com/maps/documentation/places/web-service/overview)
- [Full Setup Guide](./GOOGLE-REVIEWS-SETUP.md)

---

## ✅ Setup Checklist

- [ ] Google Cloud project created
- [ ] Places API (New) enabled
- [ ] API key created
- [ ] Billing set up
- [ ] API key added to `reviews-config.js`
- [ ] API key restricted (HTTP referrers + API)
- [ ] Tested on website
- [ ] Reviews loading correctly

---

**Need help?** Check the full documentation: `GOOGLE-REVIEWS-SETUP.md`
