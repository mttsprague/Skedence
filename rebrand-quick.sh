#!/bin/bash

# CoachFlow Rebranding Script
# This script performs the basic directory and file renaming
# Manual Xcode updates still required after running this

set -e  # Exit on error

WORKSPACE_DIR="/Users/matthewsprague/Documents/GitHub/Polyface Volleyball Academy"
cd "$WORKSPACE_DIR"

echo "🎯 CoachFlow Rebranding Script"
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
git commit -m "Backup before CoachFlow rebrand" || echo "Nothing to commit"

echo ""
echo "Step 2: Renaming main directories..."
if [ -d "PolyFace" ]; then
    echo "  Renaming PolyFace → CoachFlow"
    mv PolyFace CoachFlow
fi

if [ -d "PolyCal" ]; then
    echo "  Renaming PolyCal → CoachFlowAdmin"
    mv PolyCal CoachFlowAdmin
fi

echo ""
echo "Step 3: Renaming Xcode project files..."
if [ -f "CoachFlow/PolyFace.xcodeproj/project.pbxproj" ]; then
    echo "  Renaming PolyFace.xcodeproj → CoachFlow.xcodeproj"
    mv CoachFlow/PolyFace.xcodeproj CoachFlow/CoachFlow.xcodeproj
fi

if [ -f "CoachFlowAdmin/PolyCal.xcodeproj/project.pbxproj" ]; then
    echo "  Renaming PolyCal.xcodeproj → CoachFlowAdmin.xcodeproj"
    mv CoachFlowAdmin/PolyCal.xcodeproj CoachFlowAdmin/CoachFlowAdmin.xcodeproj
fi

echo ""
echo "Step 4: Renaming source code directories..."
if [ -d "CoachFlow/PolyFace" ]; then
    echo "  Renaming CoachFlow/PolyFace → CoachFlow/CoachFlow"
    mv CoachFlow/PolyFace CoachFlow/CoachFlow
fi

if [ -d "CoachFlow/PolyFaceTests" ]; then
    echo "  Renaming PolyFaceTests → CoachFlowTests"
    mv CoachFlow/PolyFaceTests CoachFlow/CoachFlowTests
fi

if [ -d "CoachFlow/PolyFaceUITests" ]; then
    echo "  Renaming PolyFaceUITests → CoachFlowUITests"
    mv CoachFlow/PolyFaceUITests CoachFlow/CoachFlowUITests
fi

if [ -d "CoachFlowAdmin/PolyCal" ]; then
    echo "  Renaming CoachFlowAdmin/PolyCal → CoachFlowAdmin/CoachFlowAdmin"
    mv CoachFlowAdmin/PolyCal CoachFlowAdmin/CoachFlowAdmin
fi

if [ -d "CoachFlowAdmin/PolyCalTests" ]; then
    echo "  Renaming PolyCalTests → CoachFlowAdminTests"
    mv CoachFlowAdmin/PolyCalTests CoachFlowAdmin/CoachFlowAdminTests
fi

if [ -d "CoachFlowAdmin/PolyCalUITests" ]; then
    echo "  Renaming PolyCalUITests → CoachFlowAdminUITests"
    mv CoachFlowAdmin/PolyCalUITests CoachFlowAdmin/CoachFlowAdminUITests
fi

echo ""
echo "Step 5: Renaming Screenshots and AppLogos folders..."
if [ -d "Screenshots/PolyFace" ]; then
    mv Screenshots/PolyFace Screenshots/CoachFlow
fi

if [ -d "Screenshots/PolyCal" ]; then
    mv Screenshots/PolyCal Screenshots/CoachFlowAdmin
fi

if [ -d "AppLogos/PFAppIcons" ]; then
    mv AppLogos/PFAppIcons AppLogos/CoachFlowIcons
fi

if [ -d "AppLogos/PCAppIcons" ]; then
    mv AppLogos/PCAppIcons AppLogos/CoachFlowAdminIcons
fi

echo ""
echo "✅ Directory and file renaming complete!"
echo ""
echo "📋 Next Steps (MANUAL):"
echo "  1. Open CoachFlow/CoachFlow.xcodeproj in Xcode"
echo "     - Select project in navigator"
echo "     - Rename target from 'PolyFace' to 'CoachFlow'"
echo "     - Update Bundle ID to 'com.coachflow.CoachFlow'"
echo "     - Update Display Name to 'CoachFlow'"
echo ""
echo "  2. Open CoachFlowAdmin/CoachFlowAdmin.xcodeproj in Xcode"
echo "     - Select project in navigator"
echo "     - Rename target from 'PolyCal' to 'CoachFlowAdmin'"
echo "     - Update Bundle ID to 'com.coachflow.CoachFlowAdmin'"
echo "     - Update Display Name to 'CoachFlow Admin'"
echo ""
echo "  3. In VS Code, use Find & Replace (Cmd+Shift+F):"
echo "     - Find: 'import PolyFace' → Replace: 'import CoachFlow'"
echo "     - Find: 'import PolyCal' → Replace: 'import CoachFlowAdmin'"
echo "     - Find: 'PolyCal' → Replace: 'CoachFlowAdmin' (in code)"
echo "     - Find: 'PolyFace' → Replace: 'CoachFlow' (in code)"
echo "     (Keep 'Polyface Volleyball Academy' as customer name)"
echo ""
echo "  4. Build both apps in Xcode to verify"
echo ""
echo "  5. Commit changes:"
echo "     git checkout -b rebrand-coachflow"
echo "     git add -A"
echo "     git commit -m 'Rebrand to CoachFlow'"
echo ""
echo "See REBRAND_TO_COACHFLOW.md for full details."
