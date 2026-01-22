# Skedence Website Deployment - Fixed & Organized

## ✅ Problem Solved

**Issue:** skedence.com was showing the wrong page (admin portal landing instead of marketing site)

**Root Cause:** Marketing site files were in `SkedenceAdmin/public/` but not being deployed

**Solution:** Reorganized the project structure for clarity

---

## 📁 New Organized Structure

```
Skedence Apps/
│
├── 🌐 web/                          ← DEPLOY FROM HERE (Firebase Hosting)
│   ├── index.html                   ← Marketing home page (blue hero design)
│   ├── about.html                   ← About page
│   ├── privacy.html                 ← Privacy policy
│   ├── support.html                 ← Support page
│   ├── terms.html                   ← Terms of service
│   ├── style.css                    ← Marketing site styles
│   ├── script.js                    ← Marketing site JavaScript
│   ├── logo.png / logo-nav.png      ← Branding assets
│   ├── favicon.ico/png              ← Site icons
│   ├── firebase.json                ← Hosting configuration
│   ├── README.md                    ← Deployment documentation
│   │
│   └── admin-portal/                ← Admin portal (auto-generated from build)
│       ├── index.html
│       ├── _next/                   ← Next.js static assets
│       ├── dashboard.html
│       ├── clients.html
│       └── ...
│
├── 🎨 admin-portal/                 ← EDIT ADMIN PORTAL HERE (Next.js source)
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   └── hooks/
│   ├── package.json
│   ├── next.config.ts               ← basePath: '/admin-portal'
│   └── ...
│
├── 📱 Skedence/                     ← iOS Client App
├── 📱 SkedenceAdmin/                ← iOS Admin App
│   └── public/                      ← Original marketing site files (backup)
│
└── 🚀 deploy-website.sh             ← ONE-COMMAND DEPLOYMENT SCRIPT
```

---

## 🌐 Live URLs

| Site | URL |
|------|-----|
| **Marketing Site** | https://skedence.com |
| **Admin Portal** | https://skedence.com/admin-portal/ |
| **Firebase Direct** | https://polyface-ae6d3.web.app |

---

## 🚀 How to Deploy

### Option 1: Automated (Recommended)
```bash
./deploy-website.sh
```

This script automatically:
1. ✅ Builds the admin portal (Next.js)
2. ✅ Copies build to `web/admin-portal/`
3. ✅ Cleans up duplicate files
4. ✅ Deploys everything to Firebase Hosting

### Option 2: Manual
```bash
# Build admin portal
cd admin-portal
npm run build

# Copy to web directory
cd ..
rm -rf web/admin-portal
cp -r admin-portal/out web/admin-portal

# Deploy
cd web
firebase deploy --only hosting
```

---

## 📝 What Changed

### Before (Broken)
- Marketing site files scattered in `SkedenceAdmin/public/`
- Admin portal deployed separately from `admin-portal/` directory
- Confusing which files went where
- `web/index.html` had wrong content

### After (Fixed)
- ✅ All website files centralized in `web/` directory
- ✅ Marketing site at root (`skedence.com`)
- ✅ Admin portal at subpath (`skedence.com/admin-portal/`)
- ✅ Clear deployment process with one script
- ✅ Documentation in `web/README.md`

---

## 🎯 Navigation Flow

```
User visits skedence.com
    ↓
Sees blue marketing site with header:
    [ Features | Pricing | Support | About | Admin Portal | Start Trial ]
    ↓
Clicks "Admin Portal" in header
    ↓
Goes to skedence.com/admin-portal/
    ↓
Sees Next.js admin portal login page
```

---

## ⚙️ Firebase Configuration

**File:** `web/firebase.json`

```json
{
  "hosting": {
    "public": ".",
    "rewrites": [
      {
        "source": "!{/admin-portal,/admin-portal/**}",
        "destination": "/index.html"
      }
    ]
  }
}
```

**What this does:**
- Serves all files from `web/` directory
- Routes all requests to `index.html` EXCEPT `/admin-portal/**`
- This allows:
  - Marketing site to work at root
  - Admin portal to work at `/admin-portal/` path
  - All static assets to load correctly

---

## 🔄 Update Workflows

### Updating Marketing Site
1. Edit files in `web/` directory (index.html, style.css, etc.)
2. Run: `cd web && firebase deploy --only hosting`

### Updating Admin Portal
1. Edit files in `admin-portal/src/` directory
2. Run: `./deploy-website.sh`

---

## 📚 Reference Documentation

- **PROJECT_REFERENCE.md** - Updated with new structure
- **web/README.md** - Detailed deployment guide
- **deploy-website.sh** - Automated deployment script

---

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| Marketing site shows wrong content | Run `./deploy-website.sh` |
| Admin portal shows "Loading..." | Rebuild: `cd admin-portal && npm run build` then deploy |
| Changes not appearing | Clear browser cache or use incognito mode |
| Deployment fails | Check you're in `web/` directory and Firebase CLI is logged in |

---

## ✅ Verification Checklist

- [x] Marketing site loads at skedence.com
- [x] Admin portal loads at skedence.com/admin-portal/
- [x] Header navigation works on marketing site
- [x] Admin portal link in header goes to correct page
- [x] All static assets loading (CSS, JS, images)
- [x] Firebase hosting config correct
- [x] Deployment script created
- [x] Documentation updated

---

*Last updated: January 22, 2026*
