#!/bin/bash

# Restore All Blog Posts to polyface-ae6d3 (Skedence Project)
# This script re-runs all publishing scripts to restore blog posts

echo "🔍 Checking Firebase project..."
firebase use

echo ""
echo "⚠️  This will re-publish ALL blog posts to polyface-ae6d3 (Skedence)"
echo "Make sure you are authenticated to the correct Firebase project!"
echo ""
echo "Press CTRL+C to cancel, or wait 5 seconds to continue..."
sleep 5

echo ""
echo "🚀 Starting blog post restoration..."
echo ""

# Session 1: Lesson Structure & Client Posts (Mar 6, 2026)
echo "📝 Publishing: Lesson Structure & Client Posts (4 posts)..."
node publish-lesson-structure-client-posts.js
if [ $? -ne 0 ]; then
    echo "❌ Error publishing lesson structure posts"
    exit 1
fi
echo ""
sleep 2

# Session 2: Business Startup Posts (Mar 9, 2026)
echo "📝 Publishing: Business Startup Posts (4 posts)..."
node publish-business-startup-posts.js
if [ $? -ne 0 ]; then
    echo "❌ Error publishing business startup posts"
    exit 1
fi
echo ""
sleep 2

# Session 3: Organization & Drills Posts (Mar 16, 2026)
echo "📝 Publishing: Organization & Drills Posts (4 posts)..."
node publish-organization-drills-posts.js
if [ $? -ne 0 ]; then
    echo "❌ Error publishing organization drills posts"
    exit 1
fi
echo ""

echo "✅ All blog posts have been restored to polyface-ae6d3 (Skedence)!"
echo ""
echo "📊 Total posts published: 12"
echo "🌐 Check the blog at: https://skedence.com/blog"
echo ""
echo "Note: The website reads from polyface-ae6d3 by default."
echo "If blog posts still don't appear, try rebuilding and deploying:"
echo "  npm run build && firebase deploy --only hosting"
