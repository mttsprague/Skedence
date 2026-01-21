# Quick Start: Dynamic Pricing Structure

## 🎯 For Admins

### Set Up Your Pricing (First Time)

1. **Open Skedence Admin App**
2. **Go to Admin Panel** → **Pricing** tab (4th tab)
3. **Create Your First Tier**:
   - Enter tier name: "Master"
   - Tap **+ Add Package**
   - Enter package title: "1 Athlete"
   - Enter price: "80"
   - Repeat for more packages

4. **Add More Tiers** (optional):
   - Tap **+ Add Tier** button at bottom
   - Create "Elite", "Pro", or other tier names
   - Add packages to each tier

5. **Save**: Tap **"Save Pricing Structure"** at bottom

### Example Setup

```
Tier: Master Training
├── 1 Athlete Private - $80.00
├── 2 Athlete Semi-Private - $120.00
└── 3 Athlete Group - $150.00

Tier: Elite Training
├── 1 Athlete Private - $100.00
└── 2 Athlete Semi-Private - $160.00

Tier: Classes
└── Drop-In Class - $45.00
```

---

## 💡 Quick Tips

### **Tier Names**
- Use descriptive names: "Master", "Elite", "Pro"
- Or skill levels: "Beginner", "Intermediate", "Advanced"
- Or session types: "Private Lessons", "Group Classes"

### **Package Titles**
- Be clear and concise
- Examples:
  - "1 Athlete Private Lesson"
  - "2 Athletes - Train with a Partner"
  - "Small Group (3-4 athletes)"
  - "Drop-In Class Pass"

### **Pricing**
- Enter dollar amounts (e.g., "80" or "80.00")
- System automatically converts to cents for Stripe
- All prices must be greater than $0

---

## 🔧 Managing Pricing

### **Edit Existing Pricing**
1. Go to Admin Panel → Pricing tab
2. Modify tier names, package titles, or prices
3. Tap "Save Pricing Structure"

### **Add New Package**
1. Find the tier you want to add to
2. Tap **+ Add Package** under that tier
3. Enter title and price
4. Save

### **Add New Tier**
1. Scroll to bottom of pricing tab
2. Tap **+ Add Tier**
3. Enter tier name
4. Add packages to new tier
5. Save

### **Remove Package**
1. Find the package to remove
2. Tap the red **minus circle** icon
3. Save

### **Remove Tier**
1. Find the tier to remove
2. Tap the red **trash** icon next to tier name
3. Note: Must have at least 1 tier
4. Save

---

## 📱 Where Pricing Appears

### **1. Purchase Private Lessons Page**
- All packages across all tiers shown
- Clients see package title and price
- Can select and purchase any package

### **2. Admin Panel - Passes Tab**
- Pass type dropdown shows all packages
- Admin can add any configured pass type to client accounts
- Prices shown in dropdown for reference

### **3. Client Account**
- After purchase, package appears in "My Passes"
- Shows remaining lessons/classes
- Used for booking sessions

---

## ⚠️ Important Notes

### **Validation Rules**
- All tier names must be filled in
- All package titles must be filled in
- All prices must be > $0
- Cannot save incomplete pricing structure

### **Default Pricing**
If you haven't set up pricing yet, the system uses:
- Standard tier with:
  - 1 Athlete: $80
  - 2 Athletes: $120
  - 3 Athletes: $160
  - Class: $20

### **Changes Take Effect Immediately**
- Once saved, new pricing appears in client apps instantly
- Existing purchased packages are not affected
- Only new purchases use updated pricing

### **Multi-Tenant**
- Each organization has its own pricing structure
- Your pricing doesn't affect other organizations
- Clients only see pricing from their organization

---

## 🐛 Troubleshooting

### "No packages available" message on Purchase page
**Solution**: Admin needs to set up pricing structure

### Can't save pricing structure
**Check**:
- All tier names filled in?
- All package titles filled in?
- All prices > $0?

### Pricing not updating in client app
**Try**:
1. Pull to refresh on Purchase Private Lessons page
2. Close and reopen app
3. Check that you saved pricing structure in admin panel

### Pass type dropdown empty in Admin Passes tab
**Solution**: Set up pricing structure first

---

## 📞 Need Help?

**Documentation**: See `DYNAMIC_PRICING_COMPLETE.md` for full technical details

**Common Issues**:
- Pricing not saving → Check validation rules above
- Packages not showing → Ensure pricing structure is saved
- Wrong prices showing → Edit and re-save pricing structure

---

Last Updated: January 9, 2026
