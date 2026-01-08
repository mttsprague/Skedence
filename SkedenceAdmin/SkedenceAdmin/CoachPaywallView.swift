import SwiftUI

struct CoachPaywallView: View {
    let billing: OrganizationBilling
    let isOwner: Bool
    let estimatedLostRevenue: Double
    let onUpgrade: () -> Void
    let onManageBilling: () -> Void
    let onContactSupport: () -> Void
    let onDismiss: (() -> Void)?
    
    var body: some View {
        Group {
            switch billing.paywallState {
            case .none:
                EmptyView()
            case .trialBanner(let daysLeft):
                TrialBannerView(daysLeft: daysLeft, isOwner: isOwner, onUpgrade: onUpgrade)
            case .graceBanner(let daysLeft):
                GraceBannerView(daysLeft: daysLeft, isOwner: isOwner, onManageBilling: onManageBilling)
            case .fullBlock:
                ExpiredModalView(
                    billing: billing,
                    isOwner: isOwner,
                    estimatedLostRevenue: estimatedLostRevenue,
                    onReactivate: onManageBilling,
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
    let onUpgrade: () -> Void
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
                            Text("Connect Stripe + publish your booking link to go live")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        } else {
                            Text("Ask your owner to upgrade to keep bookings enabled")
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
                
                if isOwner {
                    HStack(spacing: 12) {
                        Button("Upgrade Now") {
                            onUpgrade()
                        }
                        .buttonStyle(.borderedProminent)
                        
                        Button("Later") {
                            isDismissed = true
                        }
                        .buttonStyle(.bordered)
                        .font(.caption)
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
    let onManageBilling: () -> Void
    
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
                        Text("Update your payment method to keep accepting bookings")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    } else {
                        Text("Account is in billing grace period. Please contact owner.")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                }
                
                Spacer()
            }
            
            if isOwner {
                HStack(spacing: 12) {
                    Button("Fix Payment") {
                        onManageBilling()
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.orange)
                    
                    Button("Contact Support") {
                        // Open support
                    }
                    .buttonStyle(.bordered)
                }
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
    let onReactivate: () -> Void
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
                        Text("Your Skedence subscription has ended.\nClients can no longer book sessions until you reactivate.")
                            .font(.body)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    } else {
                        Text("Your organization's subscription is inactive.\nYou can view your schedule, but booking is disabled.\nContact your owner to reactivate.")
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
                    if isOwner {
                        Button(action: onReactivate) {
                            Text("Reactivate Subscription")
                                .font(.headline)
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color.blue)
                                .cornerRadius(12)
                        }
                        
                        Button(action: onContactSupport) {
                            Text("Contact Support")
                                .font(.subheadline)
                                .foregroundColor(.blue)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color(.systemGray6))
                                .cornerRadius(12)
                        }
                    } else {
                        Button(action: { /* Message owner */ }) {
                            Text("Contact Owner")
                                .font(.headline)
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color.blue)
                                .cornerRadius(12)
                        }
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
                Text("You can still view your schedule in read-only mode")
                    .font(.caption)
                    .foregroundColor(.secondary)
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
            onUpgrade: {},
            onManageBilling: {},
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
            onUpgrade: {},
            onManageBilling: {},
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
        onUpgrade: {},
        onManageBilling: {},
        onContactSupport: {},
        onDismiss: {}
    )
}
