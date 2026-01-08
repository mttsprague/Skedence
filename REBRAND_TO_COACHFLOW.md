# Rebranding Guide: Skedence → Skedence

## Overview
This guide provides step-by-step instructions to rename the entire project from "Skedence" and "Skedence Admin" to "Skedence" branding.

## Naming Convention

| Current | New | Purpose |
|---------|-----|---------|
| Skedence | Skedence | Client-facing iOS app (athletes/clients) |
| Skedence Admin | SkedenceAdmin | Trainer/admin iOS app |
| Polyface Volleyball Academy | (stays) | First customer organization |

## Pre-Rebranding Checklist

- [ ] Commit all current changes to git
- [ ] Create a backup branch: `git checkout -b backup-pre-rebrand`
- [ ] Close Xcode completely
- [ ] Note current bundle IDs for reference

## Step 1: Rename Directories (Terminal)

```bash
cd "/Users/matthewsprague/Documents/GitHub/Polyface Volleyball Academy"

# Rename client app folder
mv Skedence Skedence

# Rename trainer app folder  
mv Skedence Admin SkedenceAdmin

# Verify
ls -la
```

## Step 2: Update Xcode Project Names

### A. Client App (Skedence)

1. Open `Skedence/Skedence.xcodeproj` in Finder (don't open in Xcode yet)
2. Rename `Skedence.xcodeproj` → `Skedence.xcodeproj`
3. Open in Xcode
4. Select the project in the navigator (blue icon at top)
5. In the right panel, change:
   - **Project Name**: Skedence → Skedence
   - Click on "Skedence" target → Rename to "Skedence"
6. Update **Bundle Identifier**:
   - Target → General → Bundle Identifier
   - Change from `com.matthewsprague.Skedence` to `com.coachflow.Skedence`
7. Update **Display Name**:
   - Target → Info → Bundle display name: "Skedence"
8. Update **Product Name**:
   - Target → Build Settings → Search "Product Name"
   - Change to `Skedence`

### B. Admin App (SkedenceAdmin)

1. Open `SkedenceAdmin/Skedence Admin.xcodeproj` in Finder
2. Rename `Skedence Admin.xcodeproj` → `SkedenceAdmin.xcodeproj`
3. Open in Xcode
4. Select project, change:
   - **Project Name**: Skedence Admin → SkedenceAdmin
   - **Target Name**: Skedence Admin → SkedenceAdmin
5. Update **Bundle Identifier**:
   - Change to `com.coachflow.SkedenceAdmin`
6. Update **Display Name**:
   - Target → Info → Bundle display name: "Skedence Admin"
7. Update **Product Name**:
   - Build Settings → Product Name: `SkedenceAdmin`

## Step 3: Rename Swift Source Folders

### Client App
```bash
cd Skedence
mv Skedence/Skedence Skedence/Skedence
mv Skedence Skedence
mv SkedenceTests SkedenceTests
mv SkedenceUITests SkedenceUITests
```

### Admin App
```bash
cd SkedenceAdmin
mv Skedence Admin/Skedence Admin SkedenceAdmin/SkedenceAdmin
mv Skedence Admin SkedenceAdmin
mv Skedence AdminTests SkedenceAdminTests
mv Skedence AdminUITests SkedenceAdminUITests
```

## Step 4: Find and Replace in Code

### Global Find/Replace in VS Code

1. Open workspace in VS Code
2. Press `Cmd+Shift+F` (Find in Files)
3. Perform these replacements **in order**:

#### Replace 1: Bundle IDs and import statements
- Find: `import Skedence`
- Replace: `import Skedence`
- Replace All

#### Replace 2: Comments and strings
- Find: `Skedence Volleyball Academy` (keep in quotes)
- Replace: Leave as-is (it's a customer name)
- Manual review each instance

#### Replace 3: App-specific references
- Find: `"Skedence"`
- Replace: `"Skedence"`
- Review each (some might be organization names to keep)

#### Replace 4: Skedence Admin references
- Find: `Skedence Admin`
- Replace: `SkedenceAdmin`
- Files to check:
  - Swift files
  - Cloud Functions (minimal)
  - Documentation

## Step 5: Update GoogleService-Info.plist Files

Both apps have Firebase configuration files:

### Option A: Keep Existing Firebase Project
No changes needed - the plist files can stay as-is.

### Option B: Create New Firebase Project "Skedence"
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create new project "Skedence"
3. Add iOS app with bundle ID: `com.coachflow.Skedence`
4. Download new `GoogleService-Info.plist`
5. Replace in `Skedence/Skedence/` folder
6. Repeat for admin app with bundle ID: `com.coachflow.SkedenceAdmin`

**Recommendation**: Keep existing Firebase project for now, can migrate later.

## Step 6: Update Documentation Files

All markdown files in the root directory need updates:

```bash
# Files to update (manual review recommended):
- README.md
- BILLING_INTEGRATION_COMPLETE.md
- PAYMENT_IMPLEMENTATION_SUMMARY.md
- SAAS_TRANSFORMATION_PROGRESS.md
- STRIPE_SETUP.md
- ADMIN_SETUP.md
- All STEP*.md files
```

For each file:
- Replace "Skedence" → "Skedence" (where it refers to the product)
- Replace "Skedence Admin" → "SkedenceAdmin"
- Keep "Polyface Volleyball Academy" as customer name

## Step 7: Update Cloud Functions (if needed)

Most Cloud Functions don't reference app names, but check:

```bash
cd SkedenceAdmin/functions
grep -r "Skedence" src/
grep -r "Skedence Admin" src/
```

Likely no changes needed - functions are generic.

## Step 8: Update Screenshots Folders

```bash
mv Screenshots/Skedence Screenshots/Skedence
mv Screenshots/Skedence Admin Screenshots/SkedenceAdmin
```

## Step 9: Update App Icons Folders

```bash
mv AppLogos/PFAppIcons AppLogos/SkedenceIcons
mv AppLogos/PCAppIcons AppLogos/SkedenceAdminIcons
```

Then update icon assets in Xcode projects.

## Step 10: Build and Test

### Client App (Skedence)
```bash
cd Skedence
xcodebuild -project Skedence.xcodeproj -scheme Skedence -destination 'platform=iOS Simulator,name=iPhone 15' clean build
```

### Admin App (SkedenceAdmin)
```bash
cd SkedenceAdmin
xcodebuild -project SkedenceAdmin.xcodeproj -scheme SkedenceAdmin -destination 'platform=iOS Simulator,name=iPhone 15' clean build
```

### Run in Simulator
1. Open each project in Xcode
2. Select a simulator
3. Press Cmd+R to build and run
4. Verify:
   - App name shows correctly on home screen
   - App launches without crashes
   - Sign in works
   - Core features functional

## Step 11: Update Git Repository (Optional)

### Option A: Rename GitHub Repository
1. Go to GitHub repository settings
2. Rename repository to "Skedence"
3. Update local remote:
```bash
git remote set-url origin https://github.com/yourusername/Skedence.git
```

### Option B: Create New Repository
```bash
cd ..
git clone current-repo coachflow
cd coachflow
git remote remove origin
git remote add origin https://github.com/yourusername/Skedence.git
```

## Common Issues & Solutions

### Issue 1: Xcode Build Errors "Cannot find module"
**Solution**: Clean build folder
- Xcode → Product → Clean Build Folder (Cmd+Shift+K)
- Delete DerivedData: `rm -rf ~/Library/Developer/Xcode/DerivedData/*`

### Issue 2: Firebase Auth Not Working
**Solution**: Bundle ID mismatch
- Verify bundle ID in Xcode matches Firebase console
- Re-download GoogleService-Info.plist if needed

### Issue 3: Scheme Not Found
**Solution**: Recreate scheme
- Xcode → Product → Scheme → Manage Schemes
- Delete old scheme, create new with correct name

### Issue 4: Code Signing Issues
**Solution**: Update provisioning profiles
- Xcode → Signing & Capabilities
- Select your team
- Let Xcode automatically manage signing

## Post-Rebranding Checklist

- [ ] Both apps build successfully
- [ ] Both apps run in simulator
- [ ] Sign in works in both apps
- [ ] Firebase connection works
- [ ] Cloud Functions callable
- [ ] App Store Connect updated (if applicable)
- [ ] Update marketing materials
- [ ] Update domain/website (if applicable)
- [ ] Update documentation
- [ ] Commit changes: `git commit -am "Rebrand to Skedence"`
- [ ] Push to new repository

## Automated Script

For the brave, here's a semi-automated approach:

```bash
#!/bin/bash
# rebrand.sh - Use with caution!

cd "/Users/matthewsprague/Documents/GitHub/Polyface Volleyball Academy"

echo "Creating backup branch..."
git checkout -b backup-pre-rebrand
git add -A
git commit -m "Backup before rebrand"

echo "Renaming directories..."
mv Skedence Skedence
mv Skedence Admin SkedenceAdmin

echo "Finding and replacing in files..."
# This would need careful implementation
# Recommended to do manually in VS Code

echo "Done! Now complete manual steps in Xcode."
```

## Estimated Timeline

- **Quick Approach**: 90 minutes (rename folders, update Xcode, basic testing)
- **Thorough Approach**: 3-4 hours (including all documentation, testing, git cleanup)
- **Production Ready**: 1-2 days (including App Store updates, domain changes, etc.)

## Recommendation

**Start with a test branch**:
1. Create branch: `git checkout -b rebrand-coachflow`
2. Follow steps 1-10
3. Test thoroughly
4. If successful, merge to main
5. If issues, revert to `backup-pre-rebrand`

## Need Help?

If you encounter issues during rebranding:
1. Check the "Common Issues" section above
2. Search Xcode build errors
3. Verify all file paths are correct
4. Ensure no typos in bundle IDs
