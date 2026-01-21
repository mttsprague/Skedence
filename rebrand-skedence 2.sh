#!/bin/bash

# Skedence Rebranding Script
# Changes all Skedence references to Skedence

set -e  # Exit on error

WORKSPACE="/Users/matthewsprague/Documents/GitHub/Skedence Apps"
cd "$WORKSPACE"

echo "🎯 Skedence Rebranding Script"
echo "=============================="
echo ""

echo "📝 Step 1: Renaming directories..."

# Rename main app folders
[ -d "Skedence" ] && mv "Skedence" "Skedence" && echo "  ✓ Skedence → Skedence"
[ -d "SkedenceAdmin" ] && mv "SkedenceAdmin" "SkedenceAdmin" && echo "  ✓ SkedenceAdmin → SkedenceAdmin"

# Rename project folders
[ -d "Skedence/Skedence.xcodeproj" ] && mv "Skedence/Skedence.xcodeproj" "Skedence/Skedence.xcodeproj" && echo "  ✓ Skedence.xcodeproj → Skedence.xcodeproj"
[ -d "SkedenceAdmin/SkedenceAdmin.xcodeproj" ] && mv "SkedenceAdmin/SkedenceAdmin.xcodeproj" "SkedenceAdmin/SkedenceAdmin.xcodeproj" && echo "  ✓ SkedenceAdmin.xcodeproj → SkedenceAdmin.xcodeproj"

# Rename source folders
[ -d "Skedence/Skedence" ] && mv "Skedence/Skedence" "Skedence/Skedence" && echo "  ✓ Skedence/Skedence → Skedence/Skedence"
[ -d "Skedence/SkedenceTests" ] && mv "Skedence/SkedenceTests" "Skedence/SkedenceTests" && echo "  ✓ SkedenceTests → SkedenceTests"
[ -d "Skedence/SkedenceUITests" ] && mv "Skedence/SkedenceUITests" "Skedence/SkedenceUITests" && echo "  ✓ SkedenceUITests → SkedenceUITests"
[ -d "SkedenceAdmin/SkedenceAdmin" ] && mv "SkedenceAdmin/SkedenceAdmin" "SkedenceAdmin/SkedenceAdmin" && echo "  ✓ SkedenceAdmin/SkedenceAdmin → SkedenceAdmin/SkedenceAdmin"
[ -d "SkedenceAdmin/SkedenceAdminTests" ] && mv "SkedenceAdmin/SkedenceAdminTests" "SkedenceAdmin/SkedenceAdminTests" && echo "  ✓ SkedenceAdminTests → SkedenceAdminTests"
[ -d "SkedenceAdmin/SkedenceAdminUITests" ] && mv "SkedenceAdmin/SkedenceAdminUITests" "SkedenceAdmin/SkedenceAdminUITests" && echo "  ✓ SkedenceAdminUITests → SkedenceAdminUITests"

# Rename screenshots folders
[ -d "Screenshots/Skedence" ] && mv "Screenshots/Skedence" "Screenshots/Skedence" && echo "  ✓ Screenshots/Skedence → Screenshots/Skedence"
[ -d "Screenshots/SkedenceAdmin" ] && mv "Screenshots/SkedenceAdmin" "Screenshots/SkedenceAdmin" && echo "  ✓ Screenshots/SkedenceAdmin → Screenshots/SkedenceAdmin"

# Rename app logo folders
[ -d "AppLogos/SkedenceIcons" ] && mv "AppLogos/SkedenceIcons" "AppLogos/SkedenceIcons" && echo "  ✓ SkedenceIcons → SkedenceIcons"
[ -d "AppLogos/SkedenceAdminIcons" ] && mv "AppLogos/SkedenceAdminIcons" "AppLogos/SkedenceAdminIcons" && echo "  ✓ SkedenceAdminIcons → SkedenceAdminIcons"

# Rename logo file
[ -f "AppLogos/SkedenceIcon.png" ] && mv "AppLogos/SkedenceIcon.png" "AppLogos/SkedenceIcon.png" && echo "  ✓ SkedenceIcon.png → SkedenceIcon.png"

# Rename main app file
[ -f "Skedence/Skedence/SkedenceApp.swift" ] && mv "Skedence/Skedence/SkedenceApp.swift" "Skedence/Skedence/SkedenceApp.swift" && echo "  ✓ SkedenceApp.swift → SkedenceApp.swift"

# Rename admin app file
[ -f "SkedenceAdmin/SkedenceAdmin/SkedenceAdminApp.swift" ] && mv "SkedenceAdmin/SkedenceAdmin/SkedenceAdminApp.swift" "SkedenceAdmin/SkedenceAdmin/SkedenceAdminApp.swift" && echo "  ✓ SkedenceAdminApp.swift → SkedenceAdminApp.swift"

echo ""
echo "📝 Step 2: Updating file contents..."

# Find and replace in all text files (excluding binary and hidden files)
find . -type f \( -name "*.swift" -o -name "*.md" -o -name "*.json" -o -name "*.plist" -o -name "*.pbxproj" -o -name "*.sh" -o -name "*.ts" -o -name "*.js" -o -name "*.rules" \) -not -path "*/\.*" -exec sed -i '' 's/Skedence/Skedence/g' {} + && echo "  ✓ Replaced Skedence with Skedence in all source files"

echo ""
echo "✅ Rebrand complete!"
echo ""
echo "🔍 Next steps (manual):"
echo "  1. Open Skedence/Skedence.xcodeproj in Xcode"
echo "  2. Update Bundle ID to 'com.skedence.Skedence'"
echo "  3. Update Display Name to 'Skedence'"
echo "  4. Open SkedenceAdmin/SkedenceAdmin.xcodeproj in Xcode"
echo "  5. Update Bundle ID to 'com.skedence.SkedenceAdmin'"
echo "  6. Update Display Name to 'Skedence Admin'"
echo "  7. Clean build folders (Shift+Cmd+K)"
echo "  8. Build both projects to verify"
echo ""
