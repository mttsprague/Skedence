# Adding Screenshots to Marketing Materials

This guide explains how to add actual screenshots from the Skedence admin portal to your marketing PDFs.

## 📸 Taking Screenshots

### Recommended Screenshots:

1. **Reports/Analytics Dashboard** (`/reports/appointments` or `/reports/revenue`)
   - Full-width view showing revenue charts
   - Date filter options visible
   - Interactive charts with data
   - Use for: 05-admin-portal-showcase.html (Page 1), 06-visual-demo-with-screenshots.html (Page 3)

2. **Clients List** (`/clients`)
   - Card view of multiple clients
   - Search bar visible at top
   - Show 6-8 client cards
   - Use for: 05-admin-portal-showcase.html (Page 2), 06-visual-demo-with-screenshots.html (Page 4)

3. **Passes/Packages Management** (`/passes`)
   - List of active packages
   - Package types visible (1-4 athletes, classes)
   - Remaining lessons shown
   - Use for: 05-admin-portal-showcase.html (Page 2)

4. **Schedule Calendar** (`/schedule`)
   - Weekly view with trainer columns
   - Time slots visible
   - Some booked slots (green) and available slots
   - Use for: 05-admin-portal-showcase.html (Page 3), 06-visual-demo-with-screenshots.html (Page 2 - After)

5. **Pricing Structure** (`/pricing`)
   - Tier editor visible
   - Multiple pricing tiers
   - Package types and prices
   - Use for: 05-admin-portal-showcase.html (Page 3), 06-visual-demo-with-screenshots.html (Page 6)

6. **Settings Page** (`/settings`)
   - Tab navigation visible (Organization, Billing, Notifications, etc.)
   - Branding section if possible
   - Use for: 05-admin-portal-showcase.html (Page 4)

7. **iOS Apps** (optional - from phone simulator or actual device)
   - Client app booking screen
   - Admin app dashboard
   - Use for: 06-visual-demo-with-screenshots.html (Page 5)

### Screenshot Tips:

- **Resolution**: Take screenshots at actual screen resolution (use Command+Shift+3 on Mac)
- **Clean Data**: Use test data or anonymize real client names
- **Zoom Level**: Use 100% zoom (Command+0 in browser) for consistency
- **Window Size**: Full screen or at least 1400px+ width for desktop views
- **Avoid Clutter**: Close unnecessary browser tabs, hide bookmarks bar
- **Timing**: Take screenshots when data looks good (charts with data, multiple clients visible)

## 🖼️ Adding Screenshots to HTML Files

### Method 1: Local Image Files (Recommended)

1. Save your screenshots to `marketing-materials/screenshots/` folder
2. Name them descriptively:
   - `reports-revenue-dashboard.png`
   - `clients-list-view.png`
   - `schedule-weekly-calendar.png`
   - `pricing-tier-editor.png`
   - `settings-page-tabs.png`

3. Replace placeholder code in HTML files:

**Find:**
```html
<div class="screenshot-container">
    <div class="screenshot-placeholder">
        <div class="screenshot-placeholder-icon">📊</div>
        <div class="screenshot-placeholder-text">Add screenshot: /reports/appointments...</div>
    </div>
</div>
```

**Replace with:**
```html
<div class="screenshot-container">
    <img src="screenshots/reports-revenue-dashboard.png" alt="Revenue Dashboard">
</div>
```

### Method 2: Inline Base64 Images (For Portable PDFs)

If you want a single HTML file with embedded images:

1. Convert screenshots to base64:
   ```bash
   base64 -i screenshots/reports-revenue-dashboard.png | pbcopy
   ```

2. Replace placeholder with:
   ```html
   <div class="screenshot-container">
       <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..." alt="Revenue Dashboard">
   </div>
   ```

### Method 3: Use URL (If hosted online)

If you have screenshots hosted on a server:
```html
<div class="screenshot-container">
    <img src="https://yoursite.com/screenshots/reports-dashboard.png" alt="Revenue Dashboard">
</div>
```

## 📄 Converting to PDF

### Using Chrome/Edge (Recommended):

1. Open the HTML file in Chrome or Edge browser
2. Press Command+P (Mac) or Ctrl+P (Windows)
3. **Print Settings:**
   - Destination: Save as PDF
   - Layout: Portrait
   - Paper size: Letter (8.5 x 11 inches)
   - Margins: None
   - Scale: Default (100%)
   - Options: ✅ Background graphics
   - Pages: All
4. Click "Save"

### Using Print Dialog:

**Important Settings:**
- ✅ **Background graphics MUST be enabled** (or colors won't print)
- Use "None" or "Minimum" margins
- Don't scale - keep at 100%
- Portrait orientation

### Using Safari (Alternative):

1. Open HTML in Safari
2. File > Export as PDF
3. Choose location and save

## 🎨 Customizing Before Printing

### Adjust Screenshot Sizes:

Edit the CSS in the `<style>` section:

```css
/* Make screenshots larger */
.screenshot-container {
    height: 450px;  /* Default was 380px */
}

/* Make large screenshots even bigger */
.large-screenshot {
    height: 550px;  /* Default was 450px */
}
```

### Change Screenshot Borders:

```css
.screenshot-container {
    border: 3px solid #FF6B35;  /* Change to orange */
    box-shadow: 0 4px 12px rgba(255, 107, 53, 0.2);  /* Add shadow */
}
```

### Add Screenshot Captions:

```html
<div class="screenshot-container">
    <img src="screenshots/reports-dashboard.png" alt="Revenue Dashboard">
</div>
<p style="text-align: center; color: #6B7280; font-size: 0.9rem; margin-top: 0.5rem;">
    Real-time revenue tracking with interactive charts
</p>
```

## 📋 Screenshot Checklist

Before creating final PDFs:

- [ ] All placeholder `<div class="screenshot-placeholder">` replaced with `<img>` tags
- [ ] Screenshot files are in correct folder (`screenshots/`)
- [ ] Image paths are correct (relative to HTML file)
- [ ] All images load when opening HTML in browser
- [ ] Images are clear and readable at print size
- [ ] No sensitive client data visible in screenshots
- [ ] Print preview looks good (Command+P to check)
- [ ] Background graphics enabled in print settings
- [ ] Final PDF saved with descriptive name

## 🎯 Quick Start

**Fastest way to get professional PDFs:**

1. **Create screenshots folder:**
   ```bash
   cd marketing-materials
   mkdir -p screenshots
   ```

2. **Take 6-8 key screenshots** from https://skedence.com (admin portal)
   - Use Command+Shift+4, space, click window (Mac)
   - Or Command+Shift+3 for full screen

3. **Save as:**
   - `reports-dashboard.png`
   - `clients-list.png`
   - `schedule-calendar.png`
   - `pricing-tiers.png`
   - `settings-page.png`
   - `passes-management.png`

4. **Edit HTML files:**
   - Open in VS Code
   - Find all `screenshot-placeholder` divs
   - Replace with `<img src="screenshots/FILENAME.png" alt="Description">`

5. **Print to PDF:**
   - Open HTML in Chrome
   - Command+P
   - Enable "Background graphics"
   - Save as PDF

Done! You now have professional marketing materials with real screenshots.

## 💡 Pro Tips

- Take screenshots at **1920x1080** or higher for quality
- Use **PNG format** for better quality (screenshots have text)
- **Anonymize** any real client data before using in marketing
- Keep a **backup set** of high-res screenshots for future updates
- Consider taking **multiple versions** (light/dark mode, different data sets)
- For mobile app screenshots, use iOS Simulator (Xcodeincluded)

## 🔄 Updating Screenshots

When admin portal changes:

1. Retake affected screenshots
2. Replace files in `screenshots/` folder (same filenames)
3. No HTML changes needed if using same filenames
4. Re-export to PDF

## 📦 File Structure

```
marketing-materials/
├── 01-one-page-overview.html
├── 02-detailed-features.html
├── 03-success-story.html
├── 04-quick-reference.html
├── 05-admin-portal-showcase.html  ← Uses screenshots
├── 06-visual-demo-with-screenshots.html  ← Uses screenshots
├── README.md
├── SCREENSHOT-GUIDE.md  ← This file
└── screenshots/  ← Your screenshots go here
    ├── reports-dashboard.png
    ├── clients-list.png
    ├── schedule-calendar.png
    ├── pricing-tiers.png
    ├── settings-page.png
    └── passes-management.png
```

---

**Questions?** Contact: contact@skedence.com
