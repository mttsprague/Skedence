#!/bin/bash

# Skedence Website Deployment Script
# This script deploys both the marketing site and admin portal to Firebase Hosting

set -e  # Exit on any error

echo "🚀 Starting Skedence Website Deployment..."
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Build Admin Portal
echo -e "${BLUE}Step 1: Building Admin Portal...${NC}"
cd admin-portal
npm run build
echo -e "${GREEN}✓ Admin portal built successfully${NC}"
echo ""

# Step 2: Copy Admin Portal to Web Directory
echo -e "${BLUE}Step 2: Copying Admin Portal to web directory...${NC}"
cd "$SCRIPT_DIR"
rm -rf web/admin-portal
cp -r admin-portal/out web/admin-portal
echo -e "${GREEN}✓ Admin portal copied${NC}"
echo ""

# Step 3: Clean up duplicate files in web directory
echo -e "${BLUE}Step 3: Cleaning up web directory...${NC}"
cd web
rm -f *" 2."*
echo -e "${GREEN}✓ Web directory cleaned${NC}"
echo ""

# Step 4: Deploy to Firebase
echo -e "${BLUE}Step 4: Deploying to Firebase Hosting...${NC}"
firebase deploy --only hosting
echo ""

echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo ""
echo "Your website is now live at:"
echo "  • Marketing Site: https://skedence.com"
echo "  • Admin Portal: https://skedence.com/admin-portal/"
echo "  • Firebase URL: https://polyface-ae6d3.web.app"
