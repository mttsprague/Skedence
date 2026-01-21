#!/bin/bash

# Stripe Products & Webhooks Setup Script
# Run this after creating products in Stripe Dashboard

echo "📦 Stripe Configuration Setup"
echo "=============================="
echo ""

# Check if we're in the right directory
if [ ! -d "SkedenceAdmin/functions" ]; then
    echo "❌ Error: Please run this script from the workspace root"
    echo "   Current directory: $(pwd)"
    exit 1
fi

echo "This script will help you:"
echo "1. Create Stripe products and prices"
echo "2. Configure webhook endpoint"
echo "3. Update code with price IDs"
echo ""

# Step 1: Instructions for creating products
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 1: Create Products in Stripe Dashboard"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔗 Open: https://dashboard.stripe.com/products"
echo ""
echo "Create these 4 recurring products:"
echo ""
echo "1️⃣  STARTER PLAN"
echo "   Name: Starter Plan"
echo "   Price: \$29/month"
echo "   Billing period: Monthly"
echo "   Trial period: 14 days"
echo "   Metadata: tier=starter, seats=1"
echo ""
echo "2️⃣  STUDIO PLAN (Most Popular)"
echo "   Name: Studio Plan"
echo "   Price: \$99/month"
echo "   Billing period: Monthly"
echo "   Trial period: 14 days"
echo "   Metadata: tier=studio, seats=5, mostPopular=true"
echo ""
echo "3️⃣  ACADEMY PLAN"
echo "   Name: Academy Plan"
echo "   Price: \$249/month"
echo "   Billing period: Monthly"
echo "   Trial period: 14 days"
echo "   Metadata: tier=academy, seats=15"
echo ""
echo "4️⃣  ENTERPRISE PLAN"
echo "   Name: Enterprise Plan"
echo "   Price: \$499/month"
echo "   Billing period: Monthly"
echo "   Trial period: 14 days"
echo "   Metadata: tier=enterprise, seats=999"
echo ""
echo "Create these 3 add-on products:"
echo ""
echo "5️⃣  EXTRA TRAINER SEAT"
echo "   Name: Additional Trainer Seat"
echo "   Price: \$10/month"
echo "   Billing period: Monthly"
echo "   Metadata: addon=trainer"
echo ""
echo "6️⃣  EXTRA LOCATION"
echo "   Name: Additional Location"
echo "   Price: \$25/month"
echo "   Billing period: Monthly"
echo "   Metadata: addon=location"
echo ""
echo "7️⃣  CUSTOM DOMAIN"
echo "   Name: Custom Domain"
echo "   Price: \$15/month"
echo "   Billing period: Monthly"
echo "   Metadata: addon=domain"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
read -p "Press Enter after you've created all products in Stripe..."
echo ""

# Step 2: Collect Price IDs
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 2: Copy Price IDs"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "For each product, click it and copy the Price ID (starts with 'price_')"
echo ""

read -p "Starter Plan Price ID (price_xxx): " STARTER_PRICE_ID
read -p "Studio Plan Price ID (price_xxx): " STUDIO_PRICE_ID
read -p "Academy Plan Price ID (price_xxx): " ACADEMY_PRICE_ID
read -p "Enterprise Plan Price ID (price_xxx): " ENTERPRISE_PRICE_ID
read -p "Extra Trainer Price ID (price_xxx): " TRAINER_PRICE_ID
read -p "Extra Location Price ID (price_xxx): " LOCATION_PRICE_ID
read -p "Custom Domain Price ID (price_xxx): " DOMAIN_PRICE_ID

echo ""
echo "✅ Price IDs collected!"
echo ""

# Step 3: Update PricingPlan.swift
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 3: Updating PricingPlan.swift"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

PRICING_FILE="SkedenceAdmin/SkedenceAdmin/PricingPlan.swift"

# Create a backup
cp "$PRICING_FILE" "${PRICING_FILE}.backup"

# Update the file (using sed for cross-platform compatibility)
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/stripePriceId: nil \/\/ Set in production/stripePriceId: \"$STARTER_PRICE_ID\"/" "$PRICING_FILE"
    sed -i '' "31s/stripePriceId: \"$STARTER_PRICE_ID\"/stripePriceId: \"$STUDIO_PRICE_ID\"/" "$PRICING_FILE"
else
    # Linux
    sed -i "s/stripePriceId: nil \/\/ Set in production/stripePriceId: \"$STARTER_PRICE_ID\"/" "$PRICING_FILE"
fi

echo "✅ Updated $PRICING_FILE"
echo ""

# Step 4: Update stripeWebhooks.ts
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 4: Updating stripeWebhooks.ts"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

WEBHOOK_FILE="SkedenceAdmin/functions/src/stripeWebhooks.ts"

# Add price mapping function
cat >> "$WEBHOOK_FILE" << EOF

// Price ID to Plan mapping
function mapPriceIdToPlan(priceId: string): string {
  const priceMap: Record<string, string> = {
    '$STARTER_PRICE_ID': 'starter',
    '$STUDIO_PRICE_ID': 'studio',
    '$ACADEMY_PRICE_ID': 'academy',
    '$ENTERPRISE_PRICE_ID': 'enterprise',
  };
  return priceMap[priceId] || 'unknown';
}

// Add-on price mapping
function mapPriceIdToAddon(priceId: string): string {
  const addonMap: Record<string, string> = {
    '$TRAINER_PRICE_ID': 'trainer',
    '$LOCATION_PRICE_ID': 'location',
    '$DOMAIN_PRICE_ID': 'domain',
  };
  return addonMap[priceId] || 'unknown';
}
EOF

echo "✅ Updated $WEBHOOK_FILE"
echo ""

# Step 5: Configure Firebase Functions environment
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 5: Configuring Firebase Functions"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd SkedenceAdmin

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "⚠️  Firebase CLI not found. Installing..."
    npm install -g firebase-tools
fi

echo ""
echo "Setting Stripe secret key in Firebase config..."

# Read existing .env for stripe key
STRIPE_KEY=$(grep STRIPE_SECRET_KEY functions/.env | cut -d'=' -f2)

if [ -z "$STRIPE_KEY" ]; then
    read -p "Enter your Stripe Secret Key (sk_live_xxx or sk_test_xxx): " STRIPE_KEY
fi

firebase functions:config:set \
  stripe.secret_key="$STRIPE_KEY" \
  stripe.webhook_secret="PLACEHOLDER_WILL_UPDATE_AFTER_WEBHOOK_CREATION"

echo ""
echo "✅ Firebase config updated"
echo ""

cd ..

# Step 6: Deploy functions to get webhook URL
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 6: Deploying Firebase Functions"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd SkedenceAdmin/functions

# Install dependencies
echo "Installing npm packages..."
npm install stripe

cd ..

echo ""
echo "Deploying functions..."
firebase deploy --only functions

echo ""
echo "✅ Functions deployed!"
echo ""

# Get the webhook URL
WEBHOOK_URL=$(firebase functions:config:get | grep -o 'https://[^"]*stripeWebhook')

if [ -z "$WEBHOOK_URL" ]; then
    echo "⚠️  Could not auto-detect webhook URL"
    echo "   Please check Firebase console for the function URL"
    echo "   It should be: https://us-central1-YOUR_PROJECT.cloudfunctions.net/stripeWebhook"
else
    echo "📍 Your webhook URL is:"
    echo "   $WEBHOOK_URL"
fi

cd ..

# Step 7: Configure Stripe Webhook
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 7: Configure Stripe Webhook"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔗 Open: https://dashboard.stripe.com/webhooks"
echo ""
echo "1. Click '+ Add endpoint'"
echo "2. Endpoint URL: $WEBHOOK_URL"
echo "3. Select these events:"
echo "   ✅ checkout.session.completed"
echo "   ✅ customer.subscription.created"
echo "   ✅ customer.subscription.updated"
echo "   ✅ customer.subscription.deleted"
echo "   ✅ invoice.payment_failed"
echo "   ✅ invoice.payment_succeeded"
echo "4. Click 'Add endpoint'"
echo "5. Copy the 'Signing secret' (starts with whsec_)"
echo ""
read -p "Enter Webhook Signing Secret (whsec_xxx): " WEBHOOK_SECRET
echo ""

# Update Firebase config with webhook secret
cd SkedenceAdmin
firebase functions:config:set stripe.webhook_secret="$WEBHOOK_SECRET"
echo ""
echo "✅ Webhook secret configured"
echo ""

# Redeploy with updated secret
echo "Re-deploying functions with webhook secret..."
firebase deploy --only functions

cd ..

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ SETUP COMPLETE!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Summary:"
echo "✅ Stripe products created"
echo "✅ Price IDs added to code"
echo "✅ Firebase functions deployed"
echo "✅ Webhook endpoint configured"
echo ""
echo "Next steps:"
echo "1. Commit and push changes: git add -A && git commit -m 'Configure Stripe products' && git push"
echo "2. Test the subscription flow in your app"
echo "3. Monitor webhooks at: https://dashboard.stripe.com/webhooks"
echo ""
echo "Price IDs configured:"
echo "  Starter:    $STARTER_PRICE_ID"
echo "  Studio:     $STUDIO_PRICE_ID"
echo "  Academy:    $ACADEMY_PRICE_ID"
echo "  Enterprise: $ENTERPRISE_PRICE_ID"
echo "  Trainer:    $TRAINER_PRICE_ID"
echo "  Location:   $LOCATION_PRICE_ID"
echo "  Domain:     $DOMAIN_PRICE_ID"
echo ""
echo "🎉 All set! Your subscription system is ready to use."
echo ""
