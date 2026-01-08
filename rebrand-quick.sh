#!/bin/bash

# Skedence Rebranding Script
# This script performs the basic directory and file renaming
# Manual Xcode updates still required after running this

set -e  # Exit on error

WORKSPACE_DIR="/Users/matthewsprague/Documents/GitHub/Polyface Volleyball Academy"
cd "$WORKSPACE_DIR"

echo "🎯 Skedence Rebranding Script"
echo "================================"
echo ""
echo "⚠️  WARNING: This will rename directories and files."
echo "Make sure you have committed all changes first!"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo "Step 1: Creating backup branch..."
git checkout -b backup-pre-rebrand 2>/dev/null || echo "Branch already exists"
git add -A
git commit -m "Backup before Skedence rebrand" || echo "Nothing to commit"

echo ""
echo "Step 2: Renaming main directories..."
if [ -d "PolyFace" ]; then
    echo "  Renaming PolyFace → Skedence"
    mv PolyFace Skedence
fi

if [ -d "PolyCal" ]; then
    echo "  Renaming PolyCal → SkedenceAdmin"
    mv PolyCal SkedenceAdmin
fi

echo ""
echo "Step 3: Renaming Xcode project files..."
if [ -f "Skedence/PolyFace.xcodeproj/project.pbxproj" ]; then
    echo "  Renaming PolyFace.xcodeproj → Skedence.xcodeproj"
    mv Skedence/PolyFace.xcodeproj Skedence/Skedence.xcodeproj
fi

if [ -f "SkedenceAdmin/PolyCal.xcodeproj/project.pbxproj" ]; then
    echo "  Renaming PolyCal.xcodeproj → SkedenceAdmin.xcodeproj"
    mv SkedenceAdmin/PolyCal.xcodeproj SkedenceAdmin/SkedenceAdmin.xcodeproj
fi

echo ""
echo "Step 4: Renaming source code directories..."
if [ -d "Skedence/PolyFace" ]; then
    echo "  Renaming Skedence/PolyFace → Skedence/Skedence"
    mv Skedence/PolyFace Skedence/Skedence
fi

if [ -d "Skedence/PolyFaceTests" ]; then
    echo "  Renaming PolyFaceTests → SkedenceTests"
    mv Skedence/PolyFaceTests Skedence/SkedenceTests
fi

if [ -d "Skedence/PolyFaceUITests" ]; then
    echo "  Renaming PolyFaceUITests → SkedenceUITests"
    mv Skedence/PolyFaceUITests Skedence/SkedenceUITests
fi

if [ -d "SkedenceAdmin/PolyCal" ]; then
    echo "  Renaming SkedenceAdmin/PolyCal → SkedenceAdmin/SkedenceAdmin"
    mv SkedenceAdmin/PolyCal SkedenceAdmin/SkedenceAdmin
fi

if [ -d "SkedenceAdmin/PolyCalTests" ]; then
    echo "  Renaming PolyCalTests → SkedenceAdminTests"
    mv SkedenceAdmin/PolyCalTests SkedenceAdmin/SkedenceAdminTests
fi

if [ -d "SkedenceAdmin/PolyCalUITests" ]; then
    echo "  Renaming PolyCalUITests → SkedenceAdminUITests"
    mv SkedenceAdmin/PolyCalUITests SkedenceAdmin/SkedenceAdminUITests
fi

echo ""
echo "Step 5: Renaming Screenshots and AppLogos folders..."
if [ -d "Screenshots/PolyFace" ]; then
    mv Screenshots/PolyFace Screenshots/Skedence
fi

if [ -d "Screenshots/PolyCal" ]; then
    mv Screenshots/PolyCal Screenshots/SkedenceAdmin
fi

if [ -d "AppLogos/PFAppIcons" ]; then
    mv AppLogos/PFAppIcons AppLogos/SkedenceIcons
fi

if [ -d "AppLogos/PCAppIcons" ]; then
    mv AppLogos/PCAppIcons AppLogos/SkedenceAdminIcons
fi

echo ""
echo "✅ Directory and file renaming complete!"
echo ""
echo "📋 Next Steps (MANUAL):"
echo "  1. Open Skedence/Skedence.xcodeproj in Xcode"
echo "     - Select project in navigator"
echo "     - Rename target from 'PolyFace' to 'Skedence'"
echo "     - Update Bundle ID to 'com.coachflow.Skedence'"
echo "     - Update Display Name to 'Skedence'"
echo ""
echo "  2. Open SkedenceAdmin/SkedenceAdmin.xcodeproj in Xcode"
echo "     - Select project in navigator"
echo "     - Rename target from 'PolyCal' to 'SkedenceAdmin'"
echo "     - Update Bundle ID to 'com.coachflow.SkedenceAdmin'"
echo "     - Update Display Name to 'Skedence Admin'"
echo ""
echo "  3. In VS Code, use Find & Replace (Cmd+Shift+F):"
echo "     - Find: 'import PolyFace' → Replace: 'import Skedence'"
echo "     - Find: 'import PolyCal' → Replace: 'import SkedenceAdmin'"
echo "     - Find: 'PolyCal' → Replace: 'SkedenceAdmin' (in code)"
echo "     - Find: 'PolyFace' → Replace: 'Skedence' (in code)"
echo "     (Keep 'Polyface Volleyball Academy' as customer name)"
echo ""
echo "  4. Build both apps in Xcode to verify"
echo ""
echo "  5. Commit changes:"
echo "     git checkout -b rebrand-coachflow"
echo "     git add -A"
echo "     git commit -m 'Rebrand to Skedence'"
echo ""
echo "See REBRAND_TO_COACHFLOW.md for full details."
