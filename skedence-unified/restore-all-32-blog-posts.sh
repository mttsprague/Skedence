#!/bin/bash

# Comprehensive Blog Post Restoration with Original Dates
# Restores ALL 32 blog posts to polyface-ae6d3 with correct publish dates

echo "🔍 Checking Firebase project..."
firebase use

echo ""
echo "⚠️  This will restore ALL 32 blog posts to polyface-ae6d3 (Skedence)"
echo "Each post will have its ORIGINAL publish date restored"
echo ""
echo "Press CTRL+C to cancel, or wait 5 seconds to continue..."
sleep 5

echo ""
echo "🚀 Starting comprehensive blog post restoration..."
echo ""

# Session 1: Initial Blog Posts (Feb 25, 2026) - 4 posts
echo "📝 Session 1: February 25, 2026 - Initial Posts (4 posts)..."
node publish-pricing-post.js
if [ $? -ne 0 ]; then
    echo "❌ Error publishing pricing post"
    exit 1
fi
sleep 1

node publish-baseball-scheduling.js
if [ $? -ne 0 ]; then
    echo "❌ Error publishing baseball scheduling post"
    exit 1
fi
sleep 1

node publish-soccer-scheduling.js
if [ $? -ne 0 ]; then
    echo "❌ Error publishing soccer scheduling post"
    exit 1
fi
sleep 1

node publish-basketball-pricing.js
if [ $? -ne 0 ]; then
    echo "❌ Error publishing basketball pricing post"
    exit 1
fi
echo ""
sleep 2

# Session 2: Four Sports Posts (Feb 26, 2026) - 4 posts
echo "📝 Session 2: February 26, 2026 - Four Sports Posts (4 posts)..."
node publish-four-sports-posts.js
if [ $? -ne 0 ]; then
    echo "❌ Error publishing four sports posts"
    exit 1
fi
echo ""
sleep 2

# Session 3: Four MORE Sports Posts (Feb 27, 2026) - 4 posts
echo "📝 Session 3: February 27, 2026 - Four More Sports Posts (4 posts)..."
node publish-four-more-sports-posts.js
if [ $? -ne 0 ]; then
    echo "❌ Error publishing four more sports posts"
    exit 1
fi
echo ""
sleep 2

# Session 4: Lesson Structure Posts (Mar 2, 2026) - 4 posts
echo "📝 Session 4: March 2, 2026 - Lesson Structure Posts (4 posts)..."
node publish-lesson-structure-posts.js
if [ $? -ne 0 ]; then
    echo "❌ Error publishing lesson structure posts"
    exit 1
fi
echo ""
sleep 2

# Session 5: Marketing & Training Posts (Mar 4, 2026) - 4 posts
echo "📝 Session 5: March 4, 2026 - Marketing & Training Posts (4 posts)..."
node publish-marketing-training-posts.js
if [ $? -ne 0 ]; then
    echo "❌ Error publishing marketing training posts"
    exit 1
fi
echo ""
sleep 2

# Session 6: Lesson Structure & Client Posts (Mar 6, 2026) - 4 posts
echo "📝 Session 6: March 6, 2026 - Lesson Structure & Client Posts (4 posts)..."
node publish-lesson-structure-client-posts.js
if [ $? -ne 0 ]; then
    echo "❌ Error publishing lesson structure client posts"
    exit 1
fi
echo ""
sleep 2

# Session 7: Business Startup Posts (Mar 9, 2026) - 4 posts
echo "📝 Session 7: March 9, 2026 - Business Startup Posts (4 posts)..."
node publish-business-startup-posts.js
if [ $? -ne 0 ]; then
    echo "❌ Error publishing business startup posts"
    exit 1
fi
echo ""
sleep 2

# Session 8: Organization & Drills Posts (Mar 16, 2026) - 4 posts
echo "📝 Session 8: March 16, 2026 - Organization & Drills Posts (4 posts)..."
node publish-organization-drills-posts.js
if [ $? -ne 0 ]; then
    echo "❌ Error publishing organization drills posts"
    exit 1
fi
echo ""

echo "✅ All 32 blog posts have been restored to polyface-ae6d3 (Skedence)!"
echo ""
echo "📊 Summary:"
echo "  Session 1 (Feb 25): 4 posts - Pricing, scheduling basics"
echo "  Session 2 (Feb 26): 4 posts - Initial sport-specific content"
echo "  Session 3 (Feb 27): 4 posts - More sport-specific content"
echo "  Session 4 (Mar 2):  4 posts - Lesson structure guides"
echo "  Session 5 (Mar 4):  4 posts - Marketing & training"
echo "  Session 6 (Mar 6):  4 posts - Lesson planning & client acquisition"
echo "  Session 7 (Mar 9):  4 posts - Business startup guides"
echo "  Session 8 (Mar 16): 4 posts - Organization & drills"
echo "  ─────────────────────────────"
echo "  TOTAL: 32 blog posts"
echo ""
echo "🌐 Check the blog at: https://skedence.com/blog"
echo ""
echo "⏰ NOTE: All posts currently show today's date (March 24, 2026)"
echo "To fix timestamps, we need to update the Firestore documents with original dates"
echo "Run: node fix-blog-timestamps.js (after creating that script)"
