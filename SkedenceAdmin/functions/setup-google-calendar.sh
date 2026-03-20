#!/bin/bash

# Google Calendar OAuth Setup Script
# Run this after creating OAuth credentials in Google Cloud Console

echo "🔧 Skedence - Google Calendar Integration Setup"
echo "==============================================="
echo ""

# Check if we're in the functions directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this from the functions directory"
    echo "   cd SkedenceAdmin/functions"
    exit 1
fi

echo "📋 This script will help you configure Google Calendar OAuth credentials"
echo ""
echo "⚠️  Before running this script, you need to:"
echo "   1. Create a Google Cloud Project (or use existing Firebase project)"
echo "   2. Enable Google Calendar API"
echo "   3. Create OAuth 2.0 credentials (Web application)"
echo "   4. Have your Client ID and Client Secret ready"
echo ""
read -p "Have you completed the above steps? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "📖 Please follow the setup guide:"
    echo "   Open: GOOGLE_CALENDAR_SETUP.md"
    echo ""
    echo "   Or visit: https://console.cloud.google.com"
    exit 1
fi

echo ""
echo "🔐 Setting up Firebase Secrets..."
echo ""

# Set Client ID
echo "Step 1/3: Setting GOOGLE_CALENDAR_CLIENT_ID"
echo "Enter your Google OAuth Client ID (ends with .apps.googleusercontent.com):"
firebase functions:secrets:set GOOGLE_CALENDAR_CLIENT_ID

if [ $? -ne 0 ]; then
    echo "❌ Failed to set Client ID"
    exit 1
fi

echo ""

# Set Client Secret
echo "Step 2/3: Setting GOOGLE_CALENDAR_CLIENT_SECRET"
echo "Enter your Google OAuth Client Secret (starts with GOCSPX-):"
firebase functions:secrets:set GOOGLE_CALENDAR_CLIENT_SECRET

if [ $? -ne 0 ]; then
    echo "❌ Failed to set Client Secret"
    exit 1
fi

echo ""

# Set Redirect URI
echo "Step 3/3: Setting GOOGLE_CALENDAR_REDIRECT_URI"
echo "This should be: https://skedence.com/import-schedule/callback"
firebase functions:secrets:set GOOGLE_CALENDAR_REDIRECT_URI

if [ $? -ne 0 ]; then
    echo "❌ Failed to set Redirect URI"
    exit 1
fi

echo ""
echo "✅ All secrets configured successfully!"
echo ""
echo "📦 Next steps:"
echo "   1. Build functions: npm run build"
echo "   2. Deploy functions: firebase deploy --only functions:initGoogleCalendarAuth,functions:completeGoogleCalendarAuth,functions:syncGoogleCalendar,functions:syncAllGoogleCalendars"
echo "   3. Test at: https://skedence.com/import-schedule"
echo ""
read -p "Would you like to deploy the functions now? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "🏗️  Building functions..."
    npm run build
    
    if [ $? -ne 0 ]; then
        echo "❌ Build failed. Please fix errors and try again."
        exit 1
    fi
    
    echo ""
    echo "🚀 Deploying Google Calendar functions..."
    firebase deploy --only functions:initGoogleCalendarAuth,functions:completeGoogleCalendarAuth,functions:syncGoogleCalendar,functions:syncAllGoogleCalendars
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Deployment successful!"
        echo ""
        echo "🎉 Setup complete! You can now:"
        echo "   1. Go to: https://skedence.com/import-schedule"
        echo "   2. Click 'Add Calendar'"
        echo "   3. Connect your Google Calendar"
        echo ""
    else
        echo "❌ Deployment failed. Check the error messages above."
        exit 1
    fi
else
    echo ""
    echo "⏭️  Skipping deployment. Run manually when ready:"
    echo "   npm run build"
    echo "   firebase deploy --only functions:initGoogleCalendarAuth,functions:completeGoogleCalendarAuth,functions:syncGoogleCalendar,functions:syncAllGoogleCalendars"
    echo ""
fi

echo "📖 For troubleshooting, see: GOOGLE_CALENDAR_SETUP.md"
echo ""
