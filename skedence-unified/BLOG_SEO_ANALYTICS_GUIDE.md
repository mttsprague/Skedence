# Blog SEO & Analytics Setup Guide

**Status: ✅ FULLY CONFIGURED**

All blog posts are automatically set up for SEO optimization and Google Analytics tracking. This guide explains what's already in place.

---

## ✅ SEO Features (Already Implemented)

### 1. **Dynamic Meta Tags**
Every blog post automatically generates:
- **Page Title**: `[Blog Post Title] | Skedence Blog`
- **Meta Description**: Pulled from blog post excerpt
- **Meta Keywords**: From keywords field in blog editor

### 2. **Open Graph Tags (Social Sharing)**
When someone shares a blog post link, it displays:
- **og:title**: Blog post title
- **og:description**: Blog post excerpt
- **og:image**: Featured image (or Skedence logo fallback)
- **og:url**: Full URL to the blog post
- **og:type**: "article"
- **og:site_name**: "Skedence"

### 3. **Twitter Card Tags**
Optimized Twitter sharing with:
- **twitter:card**: "summary_large_image"
- **twitter:title**: Blog post title
- **twitter:description**: Blog post excerpt
- **twitter:image**: Featured image (or Skedence logo fallback)

### 4. **Search Engine Optimization**
- Clean, SEO-friendly URLs (slugs)
- Structured content with proper HTML tags
- Alt text for images (accessibility + SEO)
- Keyword targeting
- Category and tag organization

---

## ✅ Google Analytics (Already Implemented)

### Tracked Events on Blog Pages:

#### **Blog Listing Page**
- **page_view**: Tracks visits to `/blog`
- **blog_filter_sport**: Tracks when users filter by sport (volleyball, basketball, etc.)
- **blog_filter_category**: Tracks when users filter by category (revenue-growth, operations, etc.)
- **blog_search**: Tracks blog search queries and result counts

#### **Blog Detail Page**
- **page_view**: Tracks each blog post view with post title
- **blog_post_view**: Comprehensive tracking with:
  - `post_id`: Firestore document ID
  - `post_title`: Blog post title
  - `categories`: Categories assigned to post
  - `sport`: Sport associated with post
- **View Counter**: Automatically increments view count in Firestore

---

## 📝 How to Create SEO-Optimized Blog Posts

### Required Fields:
1. **Title** - Main headline (auto-generates meta title)
2. **URL Slug** - SEO-friendly URL (auto-generated from title)
3. **Excerpt** - 160 characters max (used for meta description)
4. **Content** - Full blog post (HTML)

### SEO Fields:
5. **Meta Title** - 60 characters max (defaults to title if empty)
6. **Meta Description** - 160 characters max (defaults to excerpt if empty)
7. **Keywords** - Comma-separated target keywords
8. **Categories** - Multiple categories (volleyball, basketball, revenue-growth, etc.)
9. **Tags** - Additional tags for organization
10. **Sport** - Sport association (volleyball, basketball, soccer, baseball, all)

### Social Sharing:
11. **Featured Image** - Image URL for social sharing
12. **Featured Image Alt Text** - Accessibility description (also helps SEO)

### Call to Action:
13. **CTA Text** - Optional custom CTA
14. **CTA Link** - Link for CTA button

---

## 🎯 Best Practices

### For Maximum SEO Impact:

1. **Title (H1)**
   - Include primary keyword
   - Keep under 60 characters
   - Make it compelling and clear

2. **Excerpt**
   - Summarize the value proposition
   - Include secondary keywords naturally
   - Stay under 160 characters

3. **Content**
   - Use H2 and H3 tags for structure
   - Include keywords naturally (don't stuff)
   - Aim for 800-2000 words
   - Break up text with bullets and lists
   - Add internal links to other blog posts

4. **Featured Image**
   - Use high-quality, relevant images
   - Recommended size: 1200x630px (optimal for social sharing)
   - Add descriptive alt text
   - Compress for fast loading

5. **Categories**
   - Select 2-4 relevant categories
   - Use sport-specific categories when applicable
   - Include business categories (revenue-growth, operations, etc.)

6. **Keywords**
   - Research target keywords first
   - Include 5-10 relevant keywords
   - Use long-tail keywords (3-4 word phrases)
   - Examples: "volleyball scheduling software", "private lesson pricing"

---

## 🚀 Publishing Checklist

Before publishing a blog post, verify:

- [ ] Title is compelling and includes primary keyword
- [ ] URL slug is SEO-friendly (lowercase, hyphens, no special characters)
- [ ] Excerpt clearly summarizes the post (160 chars max)
- [ ] Meta title is set (or auto-generated from title)
- [ ] Meta description is set (or auto-generated from excerpt)
- [ ] Keywords are added (5-10 relevant terms)
- [ ] At least 2 categories are selected
- [ ] Sport is selected (if sport-specific content)
- [ ] Featured image is added with alt text
- [ ] Content has proper H2/H3 structure
- [ ] Content includes internal links (when relevant)
- [ ] Preview mode looks good
- [ ] Status is set to "Published"

---

## 📊 Analytics Dashboard

View blog performance in Google Analytics:
1. Sign in to Google Analytics (GTM-KQMV58D)
2. Navigate to **Events** > **blog_post_view**
3. See metrics: views, categories, sports, engagement

Key metrics to track:
- Page views per post
- Category filter usage
- Sport filter usage
- Search queries
- Bounce rate
- Time on page
- Social shares (external tracking)

---

## 🔧 Technical Details

### Implementation Files:
- **Blog Editor**: `/src/app/blog-admin/edit/page.tsx`
- **Blog Detail Page**: `/src/app/(marketing)/blog/detail/page.tsx`
- **Blog Listing**: `/src/app/(marketing)/blog/page.tsx`
- **Analytics Library**: `/src/lib/analytics.ts`
- **Blog Service**: `/src/lib/blog-service.ts`
- **Blog Types**: `/src/types/blog.ts`
- **Root Layout**: `/src/app/layout.tsx`

### Meta Tag Updates:
- Title and meta description updated dynamically when post loads
- Open Graph tags injected into `<head>` via JavaScript
- Twitter Card tags added for optimal Twitter sharing
- All tags are crawlable by search engines

### Analytics Integration:
- Google Tag Manager (GTM) ID: `GTM-KQMV58D`
- Events pushed to `window.dataLayer`
- All events tracked in Google Analytics 4
- Development mode shows console logs for debugging

---

## 📱 Social Sharing Preview

When sharing blog posts on:

**Text/iMessage**: Shows title, excerpt, and image
**Facebook**: Rich preview with title, description, and large image
**Twitter**: Twitter Card with title, description, and image
**LinkedIn**: Professional preview with all metadata

Example preview:
```
┌─────────────────────────────────────┐
│  [Featured Image or Skedence Logo]  │
├─────────────────────────────────────┤
│  5 Ways to Fill Your Baseball       │
│  Training Schedule                   │
│                                     │
│  Learn proven strategies to keep    │
│  your training schedule full and    │
│  maximize your coaching revenue...  │
│                                     │
│  skedence.com                       │
└─────────────────────────────────────┘
```

---

## ✅ Summary

**Everything is already configured!** When you create a new blog post using the admin editor at `/blog-admin`, all SEO and analytics features are automatically applied. Just fill in the fields, publish, and your post will be:

- ✅ Optimized for search engines
- ✅ Shareable on social media with rich previews
- ✅ Tracked in Google Analytics
- ✅ Indexed with proper meta tags
- ✅ Accessible and SEO-friendly

**No additional setup required for new posts.**

---

Last Updated: February 25, 2026
