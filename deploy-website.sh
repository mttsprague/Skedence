#!/bin/bash

# Skedence Unified Website Deployment Script
# This script builds the unified Next.js app and deploys to Firebase Hosting

set -e  # Exit on error

echo "🚀 Starting Skedence Unified Website Deployment..."
echo ""

# Step 1: Build the unified Next.js application
echo "📦 Step 1: Building unified Next.js application..."
cd "$(dirname "$0")/skedence-unified"
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build completed successfully"
else
    echo "❌ Build failed"
    exit 1
fi

echo ""

# Step 2: Deploy to Firebase Hosting
echo "🔥 Step 2: Deploying to Firebase Hosting..."
firebase deploy --only hosting

if [ $? -eq 0 ]; then
    echo "✅ Deployment completed successfully"
else
    echo "❌ Deployment failed"
    exit 1
fi

echo ""
echo "🎉 Deployment complete!"
echo "🌐 Website: https://skedence.com"
echo "📊 Admin Portal: https://skedence.com/activity"
echo ""
