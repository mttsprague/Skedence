#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=====================================${NC}"
echo -e "${BLUE}  Workspace Cleanup Script${NC}"
echo -e "${BLUE}=====================================${NC}"
echo ""

# Counter for deleted files
DELETED_COUNT=0

# Delete all " 2" duplicate files
echo -e "${YELLOW}Removing duplicate files with ' 2' suffix...${NC}"
find . -name "* 2.*" -type f | while read -r file; do
    echo -e "${RED}  Deleting: $file${NC}"
    rm "$file"
    ((DELETED_COUNT++))
done
echo -e "${GREEN}✓ Duplicate ' 2' files removed${NC}"
echo ""

# Delete unnecessary .md documentation files
echo -e "${YELLOW}Removing unnecessary .md documentation files...${NC}"

# Array of MD files to delete
MD_FILES_TO_DELETE=(
    "TESTING_INSTRUCTIONS 2.md"
    "ADMIN_PROFILE_ORG_EDITING 2.md"
    "PHASE11_IMPLEMENTATION_SUMMARY 2.md"
    "QUICK_START_PRICING 2.md"
    "PAYWALL_INTEGRATION_COMPLETE 2.md"
    "DEPLOYMENT_COMPLETE 2.md"
    "WALLET_STRIPE_SETUP 2.md"
    "PRODUCTION_DEPLOYMENT_GUIDE 2.md"
    "PAYMENT_ROUTING_COMPLETE 2.md"
    "PRICING_SCHEMA_REFERENCE 2.md"
    "STRIPE_INTEGRATION_COMPLETE 2.md"
    "PHASE1_ORG_CODES_COMPLETE 2.md"
    "EMAIL_CONFIRMATIONS_COMPLETE 2.md"
    "SWITCH_TO_LIVE_MODE 2.md"
    "PRICING_SYSTEM_FLOW 2.md"
    "QUICK_START_WALLET 2.md"
    "STRIPE_REDIRECT_IMPLEMENTATION 2.md"
    "SLOT_DELETION_COMPLETE 2.md"
    "WAIVER_REMOVED 2.md"
    "SUBSCRIPTION_UPGRADE_FLOW 2.md"
    "SUBSCRIPTION_ENFORCEMENT_SUMMARY 2.md"
    "PRICING_IMPLEMENTATION_SUMMARY 2.md"
    "SUBSCRIPTION_ENFORCEMENT_COMPLETE 2.md"
    "FIXES_COMPLETE 2.md"
    "STRIPE_CONNECT_PLATFORM_SETUP 2.md"
    "DYNAMIC_PRICING_COMPLETE 2.md"
    "STRIPE_SETUP_GUIDE 2.md"
    "PACKAGE_CATEGORY_ACTION_REQUIRED 2.md"
    "STRIPE_PRODUCTION_SETUP 2.md"
    "PHASE11_COMPLETE 2.md"
    "IMPLEMENTATION_SUMMARY 2.md"
    "STRIPE_LIVE_MODE_SETUP 2.md"
    "STRIPE_LIVE_MODE_COMPLETE 2.md"
    "SECURITY_AUDIT 2.md"
    "ARCHITECTURE_DIAGRAM 2.md"
    "PASSWORD_RESET_SETUP 2.md"
    "ADMIN_FEATURES_UPDATE 2.md"
    ".github/copilot-instructions 2.md"
    "admin-portal/README 2.md"
    "SkedenceAdmin/WEBSITE_README 2.md"
    "SkedenceAdmin/EMAIL_SMTP_SETUP 2.md"
    "SkedenceAdmin/DOMAIN_SETUP_INSTRUCTIONS 2.md"
    "SkedenceAdmin/extensions/README 2.md"
    "SkedenceAdmin/migrations/SECURITY_TESTING 2.md"
    "SkedenceAdmin/migrations/README 2.md"
    
    # Outdated completion/summary files (keeping only the most recent)
    "DEPLOYMENT_COMPLETE.md"
    "WAIVER_REMOVED.md"
    "PHASE11_IMPLEMENTATION_SUMMARY.md"
    "PAYWALL_INTEGRATION_COMPLETE.md"
    "PHASE11_COMPLETE.md"
    "STEP9_COMPLETE.md"
    "STEP8_COMPLETE.md"
    "PHASE1_ORG_CODES_COMPLETE.md"
    "PAYMENT_ROUTING_COMPLETE.md"
    "SUBSCRIPTION_ENFORCEMENT_COMPLETE.md"
    "STRIPE_INTEGRATION_COMPLETE.md"
    "EMAIL_CONFIRMATIONS_COMPLETE.md"
    "SLOT_DELETION_COMPLETE.md"
    "FIXES_COMPLETE.md"
    "DYNAMIC_PRICING_COMPLETE.md"
    "IMPLEMENTATION_SUMMARY.md"
    "SUBSCRIPTION_UPGRADE_FLOW.md"
    "SUBSCRIPTION_ENFORCEMENT_SUMMARY.md"
    "ADMIN_PROFILE_ORG_EDITING.md"
    "ADMIN_FEATURES_UPDATE.md"
    
    # Outdated setup/guide files (keeping only current ones)
    "QUICK_START_PRICING.md"
    "QUICK_START_WALLET.md"
    "WALLET_STRIPE_SETUP.md"
    "SWITCH_TO_LIVE_MODE.md"
    "STRIPE_REDIRECT_IMPLEMENTATION.md"
    "STRIPE_CONNECT_PLATFORM_SETUP.md"
    "STRIPE_SETUP_GUIDE.md"
    "STRIPE_LIVE_MODE_SETUP.md"
    "STRIPE_LIVE_MODE_COMPLETE.md"
    "PASSWORD_RESET_SETUP.md"
    "ARCHITECTURE_DIAGRAM.md"
    "SECURITY_AUDIT.md"
    "PACKAGE_CATEGORY_ACTION_REQUIRED.md"
    "WEBSITE_DEPLOYMENT_FIXED.md"
    "TESTING_INSTRUCTIONS.md"
    
    # Rebrand/migration docs (old)
    "REBRAND_COMPLETE.md"
    "REBRAND_TO_COACHFLOW.md"
    
    # Nested readme duplicates
    "SkedenceAdmin/WEBSITE_README.md"
    "SkedenceAdmin/EMAIL_SMTP_SETUP.md"
    "SkedenceAdmin/DOMAIN_SETUP_INSTRUCTIONS.md"
    "SkedenceAdmin/migrations/SECURITY_TESTING.md"
)

for file in "${MD_FILES_TO_DELETE[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${RED}  Deleting: $file${NC}"
        rm "$file"
        ((DELETED_COUNT++))
    fi
done
echo -e "${GREEN}✓ Unnecessary .md files removed${NC}"
echo ""

# Clean up old scripts
echo -e "${YELLOW}Removing duplicate scripts...${NC}"
SCRIPT_FILES=(
    "rebrand-skedence 2.sh"
    "setup-stripe 2.sh"
    "switch-to-live 2.sh"
)

for file in "${SCRIPT_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${RED}  Deleting: $file${NC}"
        rm "$file"
        ((DELETED_COUNT++))
    fi
done
echo -e "${GREEN}✓ Duplicate scripts removed${NC}"
echo ""

# Clean up temporary files in SkedenceAdmin
echo -e "${YELLOW}Removing temporary/test files...${NC}"
TEMP_FILES=(
    "SkedenceAdmin/check_trainer.js"
    "SkedenceAdmin/check_trainer 2.js"
    "SkedenceAdmin/check_member.js"
    "SkedenceAdmin/check_member 2.js"
    "SkedenceAdmin/fix-trainer-token.js"
    "SkedenceAdmin/list-trainers.js"
)

for file in "${TEMP_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${RED}  Deleting: $file${NC}"
        rm "$file"
        ((DELETED_COUNT++))
    fi
done
echo -e "${GREEN}✓ Temporary files removed${NC}"
echo ""

# Summary
echo -e "${BLUE}=====================================${NC}"
echo -e "${GREEN}✓ Cleanup Complete!${NC}"
echo -e "${BLUE}=====================================${NC}"
echo -e "Total files deleted: ${DELETED_COUNT}"
echo ""
echo -e "${YELLOW}Keeping essential files:${NC}"
echo -e "  • copilot-instructions.md (project setup)"
echo -e "  • BILLING_INTEGRATION_COMPLETE.md (billing docs)"
echo -e "  • STRIPE_BILLING_SETUP.md (current stripe guide)"
echo -e "  • STRIPE_PRODUCTION_SETUP.md (production setup)"
echo -e "  • PRODUCTION_DEPLOYMENT_GUIDE.md (deployment)"
echo -e "  • PRICING_IMPLEMENTATION_SUMMARY.md (pricing docs)"
echo -e "  • PRICING_SCHEMA_REFERENCE.md (schema reference)"
echo -e "  • PRICING_SYSTEM_FLOW.md (system architecture)"
echo -e "  • PAYMENT_IMPLEMENTATION_SUMMARY.md (payment docs)"
echo -e "  • SAAS_TRANSFORMATION_PROGRESS.md (project status)"
echo -e "  • PROJECT_REFERENCE.md (project overview)"
echo -e "  • README.md files (in subdirectories)"
echo ""
