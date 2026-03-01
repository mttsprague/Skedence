//
//  StripeConfig.swift
//  Skedence
//
//  Created by Assistant on 12/31/25.
//

import Foundation

struct StripeConfig {
    // DEPRECATED: No longer using hardcoded keys
    // Each business (organization) now has their own Stripe Connect account
    // Publishable key is loaded dynamically from organization.stripe.publishableKey
    
    // Legacy publishable key - DO NOT USE
    // Kept for reference during migration only
    // static let publishableKey = "pk_live_..." // REMOVED FOR MULTI-TENANT SECURITY
}
