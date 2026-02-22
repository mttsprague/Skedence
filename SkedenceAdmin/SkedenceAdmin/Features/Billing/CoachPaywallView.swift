import SwiftUI

struct CoachPaywallView: View {
    let billing: OrganizationBilling
    let isOwner: Bool
    let estimatedLostRevenue: Double
    let onContactSupport: () -> Void
    let onDismiss: (() -> Void)?
    
    var body: some View {
        Group {
            switch billing.paywallState {
            case .none:
                EmptyView()
            case .trialBanner(let daysLeft):
                TrialBannerView(daysLeft: daysLeft, isOwner: isOwner)
            case .graceBanner(let daysLeft):
                GraceBannerView(daysLeft: daysLeft, isOwner: isOwner)
            case .fullBlock:
                ExpiredModalView(
                    billing: billing,
                    isOwner: isOwner,
                    estimatedLostRevenue: estimatedLostRevenue,
                    onContactSupport: onContactSupport,
                    onViewSchedule: onDismiss
                )
            }
        }
    }
}

// MARK: - Trial Banner
struct TrialBannerView: View {
    let daysLeft: Int
    let isOwner: Bool
    @State private var isDismissed = false
    
    var body: some View {
        if !isDismissed {
            VStack(spacing: 12) {
                HStack(spacing: 12) {
                    Image(systemName: "sparkles")
                        .font(.title2)
                        .foregroundColor(.yellow)
                    
                    VStack(alignment: .leading, spacing: 4) {
                        Text("🎉 Trial ends in \(daysLeft) days")
                            .font(.headline)
                        
                        if isOwner {
                            Text("Contact support to manage your subscription and upgrade")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        } else {
                            Text("Ask your owner to manage subscription settings")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                    }
                    
                    Spacer()
                    
                    Button(action: { isDismissed = true }) {
                        Image(systemName: "xmark")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }
            .padding()
            .background(Color.blue.opacity(0.1))
            .cornerRadius(12)
            .padding(.horizontal)
        }
    }
}

// MARK: - Grace Period Banner
struct GraceBannerView: View {
    let daysLeft: Int
    let isOwner: Bool
    
    var body: some View {
        VStack(spacing: 12) {
            HStack(spacing: 12) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.title2)
                    .foregroundColor(.orange)
                
                VStack(alignment: .leading, spacing: 4) {
                    Text("⚠️ Payment failed — Account pauses in \(daysLeft) days")
                        .font(.headline)
                    
                    if isOwner {
                        Text("Visit skedence.com to update your payment method")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    } else {
                        Text("Account is in billing grace period. Ask owner to visit skedence.com")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                }
                
                Spacer()
            }
        }
        .padding()
        .background(Color.orange.opacity(0.1))
        .cornerRadius(12)
        .padding(.horizontal)
    }
}

// MARK: - Expired Full Screen Modal
struct ExpiredModalView: View {
    let billing: OrganizationBilling
    let isOwner: Bool
    let estimatedLostRevenue: Double
    let onContactSupport: () -> Void
    let onViewSchedule: (() -> Void)?
    
    var body: some View {
        ZStack {
            Color.black.opacity(0.4)
                .ignoresSafeArea()
            
            VStack(spacing: 24) {
                // Icon
                Image(systemName: "pause.circle.fill")
                    .font(.system(size: 72))
                    .foregroundColor(.red)
                
                // Title & Body
                VStack(spacing: 8) {
                    Text(isOwner ? "Account Paused" : "Account Paused")
                        .font(.title)
                        .fontWeight(.bold)
                    
                    if isOwner {
                        Text("Your Skedence subscription has ended.\nVisit skedence.com to reactivate and restore bookings.")
                            .font(.body)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    } else {
                        Text("Your organization's subscription is inactive.\nYou can view your schedule, but booking is disabled.\nAsk your owner to visit skedence.com to reactivate.")
                            .font(.body)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                }
                
                // Lost Revenue Estimate (Owner only)
                if isOwner && estimatedLostRevenue > 0 {
                    VStack(spacing: 8) {
                        Text("Bookings are paused")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                        
                        Text("Based on your last 30 days, you may miss ~$\(Int(estimatedLostRevenue)) this week")
                            .font(.caption)
                            .foregroundColor(.orange)
                    }
                    .padding()
                    .background(Color.orange.opacity(0.1))
                    .cornerRadius(8)
                }
                
                // CTAs
                VStack(spacing: 12) {
                    Button(action: onContactSupport) {
                        Text("Contact Support")
                            .font(.headline)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.blue)
                            .cornerRadius(12)
                    }
                    
                    if let onViewSchedule = onViewSchedule {
                        Button(action: onViewSchedule) {
                            Text("View Schedule (read-only)")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                }
                
                // Footer
                VStack(spacing: 4) {
                    Text("Contact your organization owner for subscription support")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text("You can still view your schedule in read-only mode")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .padding(32)
            .background(Color(.systemBackground))
            .cornerRadius(24)
            .shadow(radius: 20)
            .padding(32)
        }
    }
}

#Preview("Trial Banner") {
    VStack {
        CoachPaywallView(
            billing: .mockTrial,
            isOwner: true,
            estimatedLostRevenue: 0,
            onContactSupport: {},
            onDismiss: {}
        )
        Spacer()
    }
}

#Preview("Grace Banner") {
    VStack {
        CoachPaywallView(
            billing: .mockPastDue,
            isOwner: true,
            estimatedLostRevenue: 0,
            onContactSupport: {},
            onDismiss: {}
        )
        Spacer()
    }
}

#Preview("Expired Modal") {
    CoachPaywallView(
        billing: .mockExpired,
        isOwner: true,
        estimatedLostRevenue: 450,
        onContactSupport: {},
        onDismiss: {}
    )
}
