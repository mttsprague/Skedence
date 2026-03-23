#!/bin/bash

# Backfill Admin Bookings Script
# This script creates activity log entries for admin-created bookings

# Get organization ID (default to known org)
ORG_ID="${1:-0Mtow1OaV7oUlCisKSNy}"

echo "🔄 Starting backfill for organization: $ORG_ID"
echo ""

# Call the Cloud Function
curl -X POST "https://us-central1-polyface-ae6d3.cloudfunctions.net/backfillAdminBookings?orgId=$ORG_ID"

echo ""
echo ""
echo "✅ Backfill complete! Check your activity feed at https://skedence.com/activity"
