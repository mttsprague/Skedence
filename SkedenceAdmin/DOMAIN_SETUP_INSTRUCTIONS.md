# Skedence.com Domain Setup Instructions

## Status: In Progress ⏳

**Domain Purchased:** Squarespace
**Target:** Connect to Firebase Hosting (polyface-ae6d3.web.app)

---

## Step 1: Configure Custom Domain in Firebase

1. **Open Firebase Console:**
   - URL: https://console.firebase.google.com/project/polyface-ae6d3/hosting/sites
   
2. **Add Custom Domain:**
   - Click "Add custom domain"
   - Enter: `skedence.com`
   - Click "Continue"
   
3. **Get DNS Records:**
   Firebase will provide records like:
   ```
   A Records:
   - 151.101.1.195
   - 151.101.65.195
   
   TXT Record (for verification):
   - google-site-verification=xxxxxxxxxxx
   ```
   
   ⚠️ **IMPORTANT:** Keep this page open - you'll need these exact values!

---

## Step 2: Configure DNS in Squarespace

1. **Log into Squarespace:**
   - Go to: Settings → Domains → skedence.com
   
2. **Access DNS Settings:**
   - Click "Advanced Settings"
   - Click "Custom Records" or "DNS Settings"
   
3. **Add A Records (for root domain):**
   ```
   Type: A
   Host: @
   Points to: 151.101.1.195
   TTL: 3600 (or Auto)
   
   Type: A
   Host: @
   Points to: 151.101.65.195
   TTL: 3600 (or Auto)
   ```
   
4. **Add TXT Record (for verification):**
   ```
   Type: TXT
   Host: @
   Value: [paste the google-site-verification value from Firebase]
   TTL: 3600 (or Auto)
   ```
   
5. **Add CNAME Record (for www subdomain):**
   ```
   Type: CNAME
   Host: www
   Points to: skedence.com
   TTL: 3600 (or Auto)
   ```

6. **Remove Conflicting Records:**
   - Delete any existing A records pointing to Squarespace servers
   - Delete any CNAME for @ (root)
   - Keep MX records if you have email configured
   
7. **Save Changes**

---

## Step 3: Wait for DNS Propagation

- **Time:** 24-48 hours (sometimes as fast as 1-2 hours)
- **Check Status:** Firebase Console → Hosting → Custom domains
- **Email Notification:** Firebase will email when SSL is ready

### Check DNS Propagation:
```bash
# Check if A records are updated
dig skedence.com +short

# Check TXT record
dig TXT skedence.com +short

# Check from different DNS servers
nslookup skedence.com 8.8.8.8
```

---

## Step 4: Verify SSL Certificate

Firebase automatically provisions a free SSL certificate from Let's Encrypt.

**Expected Status Flow:**
1. ⏳ Pending (DNS not verified yet)
2. ✅ Connected (domain verified, SSL provisioning)
3. 🔒 SSL Active (fully ready!)

---

## Step 5: Update Stripe Configuration

Once domain is live, update these URLs in your Stripe webhook settings:

### Current URLs (Firebase):
```
Success: https://polyface-ae6d3.web.app/checkout-success
Cancel: https://polyface-ae6d3.web.app/checkout-cancel
```

### New URLs (Custom Domain):
```
Success: https://skedence.com/checkout-success
Cancel: https://skedence.com/checkout-cancel
```

**Update In:**
1. Stripe Dashboard → Developers → Webhooks
2. Edit your webhook endpoint
3. Update success_url and cancel_url in checkout session creation
4. File: `functions/src/billing.ts` (lines with success_url and cancel_url)

---

## Step 6: Update Firebase Hosting Config (Optional)

Add rewrites for SEO-friendly URLs in `firebase.json`:

```json
{
  "hosting": {
    "rewrites": [
      {
        "source": "/",
        "destination": "/index.html"
      },
      {
        "source": "/privacy",
        "destination": "/privacy.html"
      },
      {
        "source": "/terms",
        "destination": "/terms.html"
      }
    ]
  }
}
```

---

## Troubleshooting

### DNS Not Propagating
```bash
# Check current DNS
dig skedence.com

# Flush local DNS cache (macOS)
sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder

# Check from different locations
https://dnschecker.org/#A/skedence.com
```

### "Domain Verification Failed"
- Double-check TXT record is exact match
- Wait 10-15 minutes after adding records
- Click "Retry" in Firebase Console

### SSL Certificate Not Provisioning
- Ensure A records point to correct Firebase IPs
- Remove any CAA DNS records that might block Let's Encrypt
- Wait up to 24 hours for auto-provisioning

### Squarespace Won't Let Me Change DNS
- You may need to "transfer" the domain or use external DNS
- Alternatively: Use Cloudflare as DNS provider (free)
- Or transfer domain to Google Domains/Namecheap

---

## Alternative: Use Cloudflare (If Squarespace Blocks DNS)

If Squarespace doesn't allow custom A records:

1. **Create Cloudflare Account** (free): https://cloudflare.com
2. **Add Site:** skedence.com
3. **Update Nameservers at Squarespace:**
   - Copy the Cloudflare nameservers (e.g., `ns1.cloudflare.com`)
   - In Squarespace: Settings → Domains → skedence.com → Nameservers
   - Change to "Custom" and paste Cloudflare nameservers
4. **Configure DNS in Cloudflare:**
   - Add the A records and TXT record from Firebase
5. **Enable SSL:** Cloudflare will provide additional SSL (optional)

---

## Testing Checklist

Once domain is live:

- [ ] https://skedence.com loads the homepage
- [ ] https://www.skedence.com redirects to skedence.com
- [ ] SSL certificate shows green lock in browser
- [ ] All pages load (privacy, terms, support, about)
- [ ] Checkout success/cancel pages work
- [ ] Mobile responsive design works
- [ ] Favicon appears in browser tab
- [ ] Logo displays correctly in navigation
- [ ] Contact form works (if implemented)
- [ ] Google Analytics tracking (if added)

---

## Post-Launch Tasks

After domain is live:

1. **Update Documentation:**
   - Update WEBSITE_README.md with new domain
   - Update PRODUCTION_DEPLOYMENT_GUIDE.md
   
2. **Update Stripe:**
   - Change webhook URLs to skedence.com
   - Test checkout flow with new URLs
   
3. **SEO:**
   - Submit sitemap to Google Search Console
   - Add sitemap.xml to site
   - Create robots.txt
   
4. **Social Media:**
   - Update social media profiles with new website URL
   - Add social media meta tags with new domain
   
5. **Email:**
   - Set up email forwarding (support@skedence.com, etc.)
   - Configure MX records if using custom email
   
6. **Monitoring:**
   - Set up uptime monitoring (UptimeRobot, Pingdom)
   - Enable Firebase Analytics
   - Add Google Analytics

---

## Quick Reference

**Firebase Project:** polyface-ae6d3
**Current URL:** https://polyface-ae6d3.web.app
**Custom Domain:** https://skedence.com (in setup)
**DNS Provider:** Squarespace
**Hosting:** Firebase Hosting
**SSL:** Auto-provisioned by Firebase (Let's Encrypt)

---

## Support

**Firebase Hosting Docs:** https://firebase.google.com/docs/hosting/custom-domain
**Squarespace DNS:** https://support.squarespace.com/hc/en-us/articles/205812378
**DNS Checker:** https://dnschecker.org

**Need Help?**
- Firebase Console: https://console.firebase.google.com/project/polyface-ae6d3
- Squarespace Support: https://support.squarespace.com/hc/en-us/requests/new

---

**Last Updated:** January 8, 2026
**Status:** Awaiting DNS configuration in Squarespace
