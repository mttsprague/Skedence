#!/bin/bash

# Switch to Stripe Live Mode Script
# This script updates all Stripe configuration to use live keys

set -e

echo "🚀 Switching to Stripe Live Mode"
echo "================================"
echo ""

# Check if we're in the right directory
if [ ! -d "SkedenceAdmin/functions" ]; then
    echo "❌ Error: Please run this script from the root of your project"
    echo "   (the directory containing SkedenceAdmin/)"
    exit 1
fi

echo "📝 Please provide your Stripe LIVE mode credentials:"
echo ""

# Get live secret key
read -p "Enter your LIVE Secret Key (sk_live_...): " LIVE_SECRET_KEY
if [[ ! $LIVE_SECRET_KEY =~ ^sk_live_ ]]; then
    echo "❌ Error: Secret key must start with 'sk_live_'"
    exit 1
fi

# Get live publishable key
read -p "Enter your LIVE Publishable Key (pk_live_...): " LIVE_PUB_KEY
if [[ ! $LIVE_PUB_KEY =~ ^pk_live_ ]]; then
    echo "❌ Error: Publishable key must start with 'pk_live_'"
    exit 1
fi

echo ""
echo "💰 Now enter your LIVE subscription price IDs from Stripe Dashboard:"
echo ""

read -p "Starter Plan Price ID (price_...): " STARTER_PRICE
read -p "Studio Plan Price ID (price_...): " STUDIO_PRICE
read -p "Academy Plan Price ID (price_...): " ACADEMY_PRICE
read -p "Enterprise Plan Price ID (price_...): " ENTERPRISE_PRICE

echo ""
echo "📋 Summary of changes:"
echo "  Secret Key: ${LIVE_SECRET_KEY:0:20}..."
echo "  Publishable Key: ${LIVE_PUB_KEY:0:20}..."
echo "  Starter: $STARTER_PRICE"
echo "  Studio: $STUDIO_PRICE"
echo "  Academy: $ACADEMY_PRICE"
echo "  Enterprise: $ENTERPRISE_PRICE"
echo ""
read -p "Continue? (y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Aborted"
    exit 1
fi

echo ""
echo "⚙️  Step 1: Updating Firebase Functions config..."
cd SkedenceAdmin

firebase functions:config:set \
    stripe.secret_key="$LIVE_SECRET_KEY" \
    stripe.starter_price_id="$STARTER_PRICE" \
    stripe.studio_price_id="$STUDIO_PRICE" \
    stripe.academy_price_id="$ACADEMY_PRICE" \
    stripe.enterprise_price_id="$ENTERPRISE_PRICE"

echo "✅ Firebase config updated"
echo ""

echo "⚙️  Step 2: Updating iOS Admin app (ManageSubscriptionView.swift)..."
cd ..
sed -i '' "s/\"starter\": \"price_[^\"]*\"/\"starter\": \"$STARTER_PRICE\"/" \
    SkedenceAdmin/SkedenceAdmin/ManageSubscriptionView.swift
sed -i '' "s/\"studio\": \"price_[^\"]*\"/\"studio\": \"$STUDIO_PRICE\"/" \
    SkedenceAdmin/SkedenceAdmin/ManageSubscriptionView.swift
sed -i '' "s/\"academy\": \"price_[^\"]*\"/\"academy\": \"$ACADEMY_PRICE\"/" \
    SkedenceAdmin/SkedenceAdmin/ManageSubscriptionView.swift
sed -i '' "s/\"enterprise\": \"price_[^\"]*\"/\"enterprise\": \"$ENTERPRISE_PRICE\"/" \
    SkedenceAdmin/SkedenceAdmin/ManageSubscriptionView.swift

echo "✅ ManageSubscriptionView updated"
echo ""

echo "⚙️  Step 3: Updating iOS Admin app (PricingPlan.swift)..."
# Update PricingPlan.swift with live price IDs
PRICING_FILE="SkedenceAdmin/SkedenceAdmin/PricingPlan.swift"

# Update each plan's price ID
awk -v starter="$STARTER_PRICE" '
    /case starter/ { in_starter=1 }
    in_starter && /stripePriceId:/ { 
        sub(/price_[^"]*/, starter)
        in_starter=0
    }
    { print }
' "$PRICING_FILE" > "$PRICING_FILE.tmp" && mv "$PRICING_FILE.tmp" "$PRICING_FILE"

awk -v studio="$STUDIO_PRICE" '
    /case studio/ { in_studio=1 }
    in_studio && /stripePriceId:/ { 
        sub(/price_[^"]*/, studio)
        in_studio=0
    }
    { print }
' "$PRICING_FILE" > "$PRICING_FILE.tmp" && mv "$PRICING_FILE.tmp" "$PRICING_FILE"

awk -v academy="$ACADEMY_PRICE" '
    /case academy/ { in_academy=1 }
    in_academy && /stripePriceId:/ { 
        sub(/price_[^"]*/, academy)
        in_academy=0
    }
    { print }
' "$PRICING_FILE" > "$PRICING_FILE.tmp" && mv "$PRICING_FILE.tmp" "$PRICING_FILE"

awk -v enterprise="$ENTERPRISE_PRICE" '
    /case enterprise/ { in_enterprise=1 }
    in_enterprise && /stripePriceId:/ { 
        sub(/price_[^"]*/, enterprise)
        in_enterprise=0
    }
    { print }
' "$PRICING_FILE" > "$PRICING_FILE.tmp" && mv "$PRICING_FILE.tmp" "$PRICING_FILE"

echo "✅ PricingPlan updated"
echo ""

echo "⚙️  Step 4: Updating iOS Admin app publishable key (StripeConfig.swift)..."
# Update admin app publishable key
if [ -f "SkedenceAdmin/SkedenceAdmin/StripeConfig.swift" ]; then
    sed -i '' "s/pk_test_[^ \"]*/  $LIVE_PUB_KEY/" \
        SkedenceAdmin/SkedenceAdmin/StripeConfig.swift
    echo "✅ Admin app publishable key updated"
else
    echo "⚠️  StripeConfig.swift not found in admin app"
fi
echo ""

echo "⚙️  Step 5: Updating iOS Client app publishable key (StripeConfig.swift)..."
# Update client app publishable key
if [ -f "Skedence/Skedence/StripeConfig.swift" ]; then
    sed -i '' "s/pk_test_[^ \"]*/  $LIVE_PUB_KEY/" \
        Skedence/Skedence/StripeConfig.swift
    echo "✅ Client app publishable key updated"
else
    echo "⚠️  StripeConfig.swift not found in client app"
fi
echo ""

echo "⚙️  Step 6: Deploying Firebase Functions..."
cd SkedenceAdmin
firebase deploy --only functions

echo ""
echo "✅ LIVE MODE ACTIVATED!"
echo ""
echo "📋 Next steps:"
echo "  1. Create Stripe Connect webhook in Stripe Dashboard"
echo "  2. Test with a small real transaction ($1)"
echo "  3. Monitor Firebase Functions logs: firebase functions:log"
echo "  4. Check Stripe Dashboard for live payments"
echo ""
echo "🔗 Webhook endpoints:"
echo "  Platform subscriptions: https://stripewebhook-d5rzjueqba-uc.a.run.app"
echo "  Stripe Connect: https://stripeconnectwebhook-d5rzjueqba-uc.a.run.app"
echo ""
echo "⚠️  Remember: Test thoroughly before announcing to users!"
