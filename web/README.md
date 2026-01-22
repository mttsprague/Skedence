# Skedence Website Structure

This directory contains the complete Skedence website that gets deployed to **skedence.com**.

## 📁 Directory Structure

```
web/
├── index.html              # Marketing site home page
├── about.html              # About page
├── privacy.html            # Privacy policy
├── support.html            # Support page
├── terms.html              # Terms of service
├── style.css               # Main stylesheet
├── script.js               # JavaScript for marketing site
├── logo.png                # Skedence logo
├── logo-nav.png            # Logo for navigation
├── favicon.ico/png         # Site favicon
├── admin-portal/           # Admin portal Next.js build (auto-generated)
│   ├── index.html
│   ├── _next/              # Next.js static assets
│   └── ...
└── firebase.json           # Firebase Hosting configuration
```

## 🌐 Live URLs

- **Marketing Site:** https://skedence.com
- **Admin Portal:** https://skedence.com/admin-portal/
- **Firebase URL:** https://polyface-ae6d3.web.app

## 🚀 Deployment

### Quick Deployment
Run the deployment script from the root of the project:
```bash
./deploy-website.sh
```

This script automatically:
1. Builds the admin portal with Next.js
2. Copies the build to `web/admin-portal/`
3. Cleans up duplicate files
4. Deploys everything to Firebase Hosting

### Manual Deployment
If you need to deploy manually:

1. **Build the admin portal:**
   ```bash
   cd admin-portal
   npm run build
   ```

2. **Copy to web directory:**
   ```bash
   cd ..
   rm -rf web/admin-portal
   cp -r admin-portal/out web/admin-portal
   ```

3. **Deploy:**
   ```bash
   cd web
   firebase deploy --only hosting
   ```

## ⚙️ Firebase Configuration

The `firebase.json` file is configured to:
- Serve all files from the current directory
- Exclude `/admin-portal/**` from being rewritten to `index.html`
- This allows the admin portal to work at the `/admin-portal/` path

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

## 📝 Important Notes

1. **Never edit files in `web/admin-portal/` directly** - they get overwritten during deployment
2. **Marketing site source:** Files like `index.html`, `style.css` are also in `SkedenceAdmin/public/` (original source)
3. **Admin portal source:** `admin-portal/` directory (Next.js project)
4. **Always use the deployment script** to ensure consistency

## 🔄 Update Workflow

### Updating Marketing Site Content
1. Edit files in this directory (`web/`) OR in `SkedenceAdmin/public/`
2. If editing in `SkedenceAdmin/public/`, copy changes here
3. Run `firebase deploy --only hosting` from the `web/` directory

### Updating Admin Portal
1. Make changes in the `admin-portal/` directory
2. Run the deployment script: `./deploy-website.sh`

## 🆘 Troubleshooting

**Issue:** Admin portal shows "Loading..." forever
- **Cause:** Admin portal wasn't built or copied correctly
- **Fix:** Run `./deploy-website.sh` to rebuild and deploy

**Issue:** Marketing site changes not showing up
- **Cause:** Wrong directory being deployed or cache
- **Fix:** Clear Firebase cache, ensure deploying from `web/` directory

**Issue:** 404 errors on admin portal pages
- **Cause:** Firebase rewrite rules or missing files
- **Fix:** Check `firebase.json` rewrite rules are correct
