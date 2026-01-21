# Skedence Marketing Website

Complete marketing website for Skedence coaching management platform, deployed on Firebase Hosting.

## 🌐 Live Website

- **Primary URL:** https://skedence.com ✅
- **Firebase URL:** https://polyface-ae6d3.web.app (backup)

## 📄 Pages

### Main Pages
- **Home** (`index.html`) - Landing page with hero, features, pricing, testimonials, FAQ
- **Privacy Policy** (`privacy.html`) - GDPR/CCPA compliant privacy policy
- **Terms of Service** (`terms.html`) - Complete legal terms and conditions
- **Support** (`support.html`) - Help center with contact form and FAQ
- **About** (`about.html`) - Company mission, values, and story

### Utility Pages
- **Checkout Success** (`checkout-success.html`) - Post-purchase confirmation page
- **Checkout Cancel** (`checkout-cancel.html`) - Checkout cancellation page

## 🎨 Design System

The website uses a consistent design system with:
- **Primary Color:** #667eea (Purple/Blue gradient)
- **Secondary Color:** #764ba2 (Purple)
- **Responsive Design:** Mobile-first approach with breakpoints at 768px and 480px
- **Typography:** System font stack for optimal performance
- **Components:** Buttons, cards, forms, navigation with consistent styling

## 🚀 Deployment

### Quick Deploy
```bash
firebase deploy --only hosting
```

### Full Deploy (Hosting + Functions + Firestore)
```bash
firebase deploy
```

### Preview Before Deploy
```bash
firebase hosting:channel:deploy preview
```

## 📁 File Structure

```
public/
├── index.html          # Landing page
├── privacy.html        # Privacy policy
├── terms.html          # Terms of service
├── support.html        # Support & contact
├── about.html          # About page
├── checkout-success.html
├── checkout-cancel.html
├── style.css           # Global styles
└── script.js           # JavaScript for mobile menu & smooth scroll
```

## 🔧 Configuration

The website is configured in `firebase.json`:

```json
{
  "hosting": {
    "public": "public",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "/checkout-success",
        "destination": "/checkout-success.html"
      },
      {
        "source": "/checkout-cancel",
        "destination": "/checkout-cancel.html"
      }
    ]
  }
}
```

## 📧 Email Addresses Referenced

The website references these email addresses (ensure they're set up):
- **support@skedence.com** - General support
- **privacy@skedence.com** - Privacy inquiries
- **legal@skedence.com** - Legal matters
- **hello@skedence.com** - General contact
- **enterprise@skedence.com** - Enterprise sales

## 🔐 Legal Compliance

### Privacy Policy Includes
- GDPR compliance (European users)
- CCPA compliance (California residents)
- Data collection and usage transparency
- User rights (access, deletion, portability)
- Cookie policy
- Third-party service disclosure (Stripe, Firebase)

### Terms of Service Includes
- Subscription terms and billing
- Refund and cancellation policy
- Acceptable use policy
- Intellectual property rights
- Limitation of liability
- Dispute resolution and arbitration
- Governing law (California)

## 🎯 SEO Optimization

Each page includes:
- Meta title and description
- Open Graph tags for social sharing
- Twitter Card tags
- Semantic HTML structure
- Mobile-responsive design
- Fast loading times

### Recommended Next Steps for SEO
1. Add `sitemap.xml` - List all pages for search engines
2. Add `robots.txt` - Search engine crawling instructions
3. Set up Google Analytics or Firebase Analytics
4. Add Schema.org markup for Organization and Product
5. Configure custom domain (skedence.com)
6. Submit sitemap to Google Search Console

## 🌐 Custom Domain Setup

To configure the custom domain `skedence.com`:

1. **In Firebase Console:**
   - Go to Hosting section
   - Click "Add custom domain"
   - Enter `skedence.com`
   - Follow the DNS configuration instructions

2. **In Your DNS Provider:**
   - Add the provided TXT record for verification
   - Add A records pointing to Firebase IPs
   - Wait for DNS propagation (24-48 hours)

3. **Update Configuration:**
   - SSL certificate is automatically provisioned by Firebase
   - Update all redirect URLs in Stripe webhooks to use new domain

## 📱 Mobile Support

The website is fully responsive:
- Mobile menu toggle (hamburger menu)
- Touch-friendly buttons and forms
- Optimized layouts for small screens
- Fast loading on mobile networks

## 🔄 Contact Form

The contact form on `support.html` currently shows a success message (placeholder). To make it functional:

1. **Create Cloud Function** (`functions/src/supportEmail.ts`):
```typescript
export const sendSupportEmail = functions.https.onRequest(async (req, res) => {
  // Configure email service (SendGrid, Mailgun, etc.)
  // Send email to support team
  // Return success/error response
});
```

2. **Update form handler** in `support.html` to make actual API call

3. **Deploy function:**
```bash
firebase deploy --only functions:sendSupportEmail
```

## 📊 Analytics

To add analytics tracking:

1. **Firebase Analytics:**
   - Already available with Firebase project
   - Add Firebase SDK to pages
   - Track page views and conversions

2. **Google Analytics:**
   - Create Google Analytics account
   - Add GA4 tracking code to all pages
   - Set up conversion goals (trial signups, contact form)

## 🔒 Security Headers

Consider adding security headers in `firebase.json`:

```json
{
  "hosting": {
    "headers": [
      {
        "source": "**",
        "headers": [
          {
            "key": "X-Frame-Options",
            "value": "DENY"
          },
          {
            "key": "X-Content-Type-Options",
            "value": "nosniff"
          },
          {
            "key": "X-XSS-Protection",
            "value": "1; mode=block"
          }
        ]
      }
    ]
  }
}
```

## 📝 Content Updates

To update website content:

1. Edit the HTML files in `public/` directory
2. Test locally: `firebase serve`
3. Deploy: `firebase deploy --only hosting`
4. Verify at hosting URL

## 🎨 Customization

### Changing Colors
Edit CSS variables in `style.css`:
```css
:root {
    --primary-color: #667eea;
    --secondary-color: #764ba2;
    /* ... other colors */
}
```

### Adding New Pages
1. Create new HTML file in `public/`
2. Use existing pages as template
3. Include navigation and footer
4. Link stylesheet and script
5. Deploy

## 📈 Performance

Current performance metrics:
- **First Contentful Paint:** < 1s (served from Firebase CDN)
- **Total File Size:** ~50KB (HTML + CSS + JS)
- **Images:** Minimal (using emoji icons)
- **Mobile Score:** Optimized for mobile devices

## 🐛 Known Issues / TODO

- [ ] Contact form needs backend Cloud Function integration
- [ ] Add favicon.ico and app icons
- [ ] Create sitemap.xml for SEO
- [ ] Add robots.txt
- [ ] Set up email forwarding for support@skedence.com addresses
- [ ] Configure custom domain (skedence.com)
- [ ] Add Google Analytics tracking
- [ ] Consider adding live chat widget (Intercom, etc.)
- [ ] Add social media links (Twitter, LinkedIn, Instagram)

## 📞 Support

For questions about the website or deployment:
- Technical: Check Firebase Console logs
- Content: Edit HTML files directly
- Design: Update `style.css`
- Features: Create new Cloud Functions

## 🎉 Launch Checklist

Before going live with custom domain:

- [x] Deploy website to Firebase Hosting
- [x] Test all pages and links
- [x] Verify mobile responsiveness
- [x] Review privacy policy and terms
- [ ] Set up custom domain (skedence.com)
- [ ] Configure email addresses
- [ ] Add Google Analytics
- [ ] Test contact form (once implemented)
- [ ] Submit sitemap to search engines
- [ ] Update Stripe webhook URLs to new domain
- [ ] Test checkout flow with new URLs
- [ ] Add social media accounts
- [ ] Create favicon and app icons
- [ ] Set up security headers
- [ ] Enable HTTPS (automatic with Firebase)
- [ ] Test on multiple browsers
- [ ] Get feedback from test users

---

**Last Updated:** January 2026
**Live URL:** https://skedence.com
**Status:** ✅ Live with custom domain
