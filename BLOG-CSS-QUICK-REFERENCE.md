# Blog CSS Quick Reference Guide

Quick reference for the blog post CSS classes and their purposes.

---

## 🎯 Main Content Classes

### `.w-post-elm.post_content`
**Purpose:** Main blog post content container  
**Styling:**
- Font size: 18px
- Line height: 1.8
- Color: #333
- Max width: 100%

**Usage:** Wraps all blog post content (paragraphs, headings, lists, etc.)

---

## 📝 Typography Classes

### `.w-post-elm.post_content p`
**Purpose:** Paragraph styling  
**Styling:**
- Margin bottom: 1.5rem
- Line height: 1.8
- Font size: 18px

### `.w-post-elm.post_content h1` through `h6`
**Purpose:** Heading hierarchy  
**Sizes:**
- H1: 2.5rem
- H2: 2rem (brand color)
- H3: 1.75rem
- H4: 1.5rem
- H5: 1.25rem
- H6: 1.1rem

**Spacing:**
- Top: 2.5rem
- Bottom: 1.25rem

---

## 🔗 Link Classes

### `.w-post-elm.post_content a`
**Purpose:** Links within blog content  
**Styling:**
- Color: Brand primary
- Text decoration: Underline
- Font weight: 600
- Hover: Faded brand color

---

## 📋 List Classes

### `.w-post-elm.post_content ul, ol`
**Purpose:** Ordered and unordered lists  
**Styling:**
- Margin: 1.5rem 0
- Padding left: 2rem
- Line height: 1.8

### `.w-post-elm.post_content li`
**Purpose:** List items  
**Styling:**
- Margin bottom: 0.75rem
- Font size: 18px

---

## 💬 Blockquote Classes

### `.w-post-elm.post_content blockquote`
**Purpose:** Pull quotes and citations  
**Styling:**
- Margin: 2rem 0
- Padding: 1.5rem 2rem
- Border left: 4px solid brand color
- Background: #f5f5f5
- Font style: Italic
- Font size: 1.1rem

---

## 🖼️ Image Classes

### `.w-post-elm.post_content img`
**Purpose:** Images within blog posts  
**Styling:**
- Max width: 100%
- Height: Auto
- Display: Block
- Margin: 2rem auto
- Border radius: 8px
- Box shadow: 0 4px 12px rgba(0,0,0,0.1)

---

## 💻 Code Classes

### `.w-post-elm.post_content code`
**Purpose:** Inline code  
**Styling:**
- Background: #f5f5f5
- Padding: 0.2rem 0.5rem
- Border radius: 4px
- Font family: Monospace
- Color: #d63384

### `.w-post-elm.post_content pre`
**Purpose:** Code blocks  
**Styling:**
- Background: #f5f5f5
- Padding: 1.5rem
- Border radius: 8px
- Overflow-x: Auto
- Margin: 2rem 0

---

## 📊 Table Classes

### `.w-post-elm.post_content table`
**Purpose:** Data tables  
**Styling:**
- Width: 100%
- Margin: 2rem 0
- Border collapse: Collapse

### `.w-post-elm.post_content table th`
**Purpose:** Table headers  
**Styling:**
- Background: Brand primary
- Color: White
- Font weight: 700
- Padding: 0.75rem 1rem

### `.w-post-elm.post_content table td`
**Purpose:** Table cells  
**Styling:**
- Padding: 0.75rem 1rem
- Border: 1px solid #ddd

---

## 🎨 Meta Information Classes

### `.w-post-elm.post_title.entry-title`
**Purpose:** Blog post main title  
**Styling:**
- Font size: 2.5rem
- Font weight: 700
- Line height: 1.2
- Color: White
- Margin bottom: 1.5rem

### `.w-hwrapper.highlight_faded`
**Purpose:** Meta information wrapper (date, author, comments)  
**Styling:**
- Display: Flex
- Gap: 1.5rem
- Font size: 14px
- Color: White (90% opacity)

### `.w-post-elm.post_date`
**Purpose:** Publication date  
**Styling:**
- Display: Flex
- Align items: Center
- Gap: 0.5rem

### `.w-post-elm.post_author`
**Purpose:** Author information  
**Styling:**
- Display: Flex
- Align items: Center
- Gap: 0.5rem

### `.w-post-elm.post_comments`
**Purpose:** Comments count  
**Styling:**
- Display: Flex
- Align items: Center
- Gap: 0.5rem

---

## 🏷️ Taxonomy Classes

### `.w-post-elm.post_taxonomy.style_badge`
**Purpose:** Category badge  
**Styling:**
- Margin bottom: 1rem

### `.w-post-elm.post_taxonomy .w-btn.us-btn-style_badge`
**Purpose:** Badge button  
**Styling:**
- Font size: 14px
- Padding: 0.5rem 1rem
- Border radius: 20px
- Font weight: 600
- Text transform: Uppercase
- Letter spacing: 0.5px

---

## 🔄 Sharing Classes

### `.w-sharing`
**Purpose:** Social sharing container  
**Styling:**
- Margin: 2rem 0

### `.w-sharing-list`
**Purpose:** Sharing buttons wrapper  
**Styling:**
- Display: Flex
- Gap: 0.75rem
- Flex wrap: Wrap

### `.w-sharing-item`
**Purpose:** Individual sharing button  
**Styling:**
- Display: Inline-flex
- Width: 44px
- Height: 44px
- Border radius: 50%
- Background: Brand primary
- Color: White
- Transition: All 0.3s ease

**Hover Effect:**
- Transform: translateY(-3px)
- Box shadow: 0 4px 12px rgba(0,0,0,0.2)

**Platform Colors:**
- `.email`: #7f7f7f
- `.facebook`: #1877f2
- `.twitter`: #000
- `.linkedin`: #0a66c2
- `.pinterest`: #e60023

---

## 📸 Custom Field Classes

### `.w-post-elm.post_custom_field`
**Purpose:** Photo credits and attributions  
**Styling:**
- Font size: 14px
- Color: #666
- Font style: Italic
- Margin top: 1rem

---

## 📱 Responsive Breakpoints

### Desktop (1024px+)
- Font size: 17-18px
- Full spacing maintained

### Tablet (768px)
- Font size: 16px
- Reduced spacing
- Optimized layout

### Mobile (480px)
- Font size: 15px
- Compact spacing
- Touch-friendly targets

---

## 🎯 Common Use Cases

### Adding a New Blog Post
```html
<div class="w-post-elm post_content">
  <h2>Your Heading</h2>
  <p>Your paragraph text...</p>
  <ul>
    <li>List item 1</li>
    <li>List item 2</li>
  </ul>
</div>
```

### Adding an Image
```html
<img src="your-image.jpg" alt="Description">
<!-- Automatically styled with border-radius and shadow -->
```

### Adding a Blockquote
```html
<blockquote>
  <p>Your quote text here...</p>
</blockquote>
```

### Adding Code
```html
<!-- Inline code -->
<p>Use the <code>function()</code> method.</p>

<!-- Code block -->
<pre><code>
function example() {
  return true;
}
</code></pre>
```

---

## 🔍 Debugging Tips

### CSS Not Loading?
1. Check browser console for 404 errors
2. Verify CSS link in HTML:
   ```html
   <link href="../assets/css/blog-posts.css" id="blog-posts-css" media="all" rel="stylesheet"/>
   ```
3. Clear browser cache
4. Check file path is correct

### Styles Not Applying?
1. Use browser DevTools (F12)
2. Inspect element
3. Check if styles are being overridden
4. Verify class names match exactly

### Mobile Issues?
1. Use responsive design mode in DevTools
2. Test on actual devices
3. Check viewport meta tag
4. Verify media queries are working

---

## 📚 Additional Resources

- **Full Documentation:** See `BLOG-CSS-FIX-README.md`
- **Implementation Summary:** See `BLOG-CSS-UPDATE-SUMMARY.md`
- **CSS File:** `assets/css/blog-posts.css`

---

## 🎨 Customization

### Changing Colors
Edit these variables in `blog-posts.css`:
```css
/* Text color */
color: #333;

/* Heading color */
color: #1a1a1a;

/* Brand color (links, headings) */
color: var(--color-content-primary, #212121);
```

### Changing Font Sizes
```css
/* Base content */
.w-post-elm.post_content {
  font-size: 18px; /* Adjust this */
}

/* Headings */
.w-post-elm.post_content h2 {
  font-size: 2rem; /* Adjust this */
}
```

### Changing Spacing
```css
/* Paragraph spacing */
.w-post-elm.post_content p {
  margin-bottom: 1.5rem; /* Adjust this */
}

/* Heading spacing */
.w-post-elm.post_content h2 {
  margin-top: 2.5rem;    /* Adjust this */
  margin-bottom: 1.25rem; /* Adjust this */
}
```

---

**Last Updated:** February 6, 2026  
**Version:** 1.0.0  
**File:** `BLOG-CSS-QUICK-REFERENCE.md`
