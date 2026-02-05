import SwiftUI

/// Paywall banner shown when subscription is expired or past due
struct PaywallBanner: View {
    let message: String
    let ctaTitle: String
    let action: () -> Void
    let isDismissible: Bool
    @State private var isDismissed = false
    
    init(
        message: String,
        ctaTitle: String = "Update Subscription",
        isDismissible: Bool = false,
        action: @escaping () -> Void
    ) {
        self.message = message
        self.ctaTitle = ctaTitle
        self.isDismissible = isDismissible
        self.action = action
    }
    
    var body: some View {
        if !isDismissed {
            VStack(spacing: 12) {
                HStack(alignment: .top, spacing: 12) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundColor(.orange)
                        .font(.title3)
                    
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Subscription Required")
                            .font(.headline)
                            .foregroundColor(.primary)
                        
                        Text(message)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.leading)
                    }
                    
                    Spacer()
                    
                    if isDismissible {
                        Button {
                            withAnimation {
                                isDismissed = true
                            }
                        } label: {
                            Image(systemName: "xmark")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                }
                
                Button(action: action) {
                    HStack {
                        Text(ctaTitle)
                        Image(systemName: "arrow.right")
                    }
                    .font(.subheadline.weight(.semibold))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(
                        LinearGradient(
                            colors: [Color.blue, Color.purple],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .cornerRadius(10)
                }
            }
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color(.systemBackground))
                    .shadow(color: Color.black.opacity(0.1), radius: 8, y: 2)
            )
            .padding(.horizontal)
            .transition(.move(edge: .top).combined(with: .opacity))
        }
    }
}

/// Full-screen paywall modal for critical subscription issues
struct PaywallModal: View {
    let title: String
    let message: String
    let ctaTitle: String
    let action: () -> Void
    @Environment(\.dismiss) private var dismiss
    
    init(
        title: String = "Subscription Expired",
        message: String,
        ctaTitle: String = "Update Subscription",
        action: @escaping () -> Void
    ) {
        self.title = title
        self.message = message
        self.ctaTitle = ctaTitle
        self.action = action
    }
    
    var body: some View {
        VStack(spacing: 24) {
            Spacer()
            
            // Icon
            ZStack {
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [Color.orange.opacity(0.2), Color.red.opacity(0.2)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 100, height: 100)
                
                Image(systemName: "lock.shield.fill")
                    .font(.system(size: 50))
                    .foregroundColor(.orange)
            }
            
            // Title and message
            VStack(spacing: 12) {
                Text(title)
                    .font(.title.bold())
                    .multilineTextAlignment(.center)
                
                Text(message)
                    .font(.body)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
            }
            
            Spacer()
            
            // CTA Button
            VStack(spacing: 12) {
                Button(action: action) {
                    HStack {
                        Text(ctaTitle)
                        Image(systemName: "arrow.right")
                    }
                    .font(.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(
                        LinearGradient(
                            colors: [Color.blue, Color.purple],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .cornerRadius(12)
                }
                
                Button("Maybe Later") {
                    dismiss()
                }
                .font(.subheadline)
                .foregroundColor(.secondary)
                .padding(.top, 8)
            }
            .padding()
        }
        .padding()
    }
}

/// Inline blocker for specific actions
struct ActionBlockerView: View {
    let message: String
    let ctaTitle: String
    let action: () -> Void
    
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "lock.circle.fill")
                .font(.system(size: 60))
                .foregroundColor(.orange)
            
            Text(message)
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
            
            Button(action: action) {
                HStack {
                    Text(ctaTitle)
                    Image(systemName: "arrow.right")
                }
                .font(.subheadline.weight(.semibold))
                .foregroundColor(.white)
                .padding(.horizontal, 24)
                .padding(.vertical, 12)
                .background(
                    LinearGradient(
                        colors: [Color.blue, Color.purple],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .cornerRadius(10)
            }
        }
        .padding()
        .frame(maxWidth: .infinity)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color(.systemGray6))
        )
    }
}

// MARK: - Preview
#Preview("Paywall Banner") {
    PaywallBanner(
        message: "Your subscription has expired. Update your payment method to continue booking lessons.",
        isDismissible: true
    ) {
    }
}

#Preview("Paywall Modal") {
    PaywallModal(
        message: "Your subscription has expired. Please update your payment method to continue using Skedence."
    ) {
    }
}

#Preview("Action Blocker") {
    ActionBlockerView(
        message: "Your subscription has expired. Please update to continue booking.",
        ctaTitle: "Reactivate Subscription"
    ) {
    }
}
