//
//  BillingPaywallView.swift
//  SkedenceAdmin
//
//  STEP 10: Paywall shown when billing is past due or limit exceeded
//

import SwiftUI

struct BillingPaywallView: View {
    @EnvironmentObject private var dependencies: AdminAppDependencies
    private var auth: AuthManager { dependencies.auth }
    let reason: PaywallReason
    let onManageSubscription: () -> Void
    
    enum PaywallReason {
        case pastDue
        case limitExceeded
        case canceled
    }
    
    var body: some View {
        VStack(spacing: Spacing.xl) {
            // Icon
            Image(systemName: iconName)
                .font(.system(size: 80))
                .foregroundStyle(iconColor)
            
            // Title
            Text(title)
                .font(.displaySmall)
                .foregroundStyle(AppTheme.textPrimary)
                .multilineTextAlignment(.center)
            
            // Message
            Text(message)
                .font(.bodyLarge)
                .foregroundStyle(AppTheme.textSecondary)
                .multilineTextAlignment(.center)
            
            // Action Button
            Button(action: onManageSubscription) {
                Text(buttonText)
                    .font(.headingSmall)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Spacing.md)
                    .background(AppTheme.primary)
                    .foregroundStyle(.white)
                    .cornerRadius(CornerRadius.md)
            }
            .heavyShadow()
        }
        .padding(Spacing.xxl)
    }
    
    var iconName: String {
        switch reason {
        case .pastDue: return "creditcard.trianglebadge.exclamationmark"
        case .limitExceeded: return "chart.bar.xaxis"
        case .canceled: return "xmark.circle"
        }
    }
    
    var iconColor: Color {
        switch reason {
        case .pastDue: return .red
        case .limitExceeded: return .orange
        case .canceled: return .gray
        }
    }
    
    var title: String {
        switch reason {
        case .pastDue: return "Payment Required"
        case .limitExceeded: return "Usage Limit Reached"
        case .canceled: return "Subscription Canceled"
        }
    }
    
    var message: String {
        switch reason {
        case .pastDue:
            return "Your payment has failed. Please update your payment method to continue using SkedenceAdmin."
        case .limitExceeded:
            return "You've reached your plan's booking limit for this month. Upgrade your plan to continue accepting bookings."
        case .canceled:
            return "Your subscription has been canceled. Reactivate to continue using SkedenceAdmin's features."
        }
    }
    
    var buttonText: String {
        switch reason {
        case .pastDue: return "Update Payment Method"
        case .limitExceeded: return "Upgrade Plan"
        case .canceled: return "Reactivate Subscription"
        }
    }
}

#Preview {
    BillingPaywallView(
        reason: .limitExceeded,
        onManageSubscription: {}
    )
    .environmentObject(AuthManager())
}
