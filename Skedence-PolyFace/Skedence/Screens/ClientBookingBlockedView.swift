import SwiftUI

struct ClientBookingBlockedView: View {
    let organizationName: String
    let trainerName: String
    let trainerEmail: String?
    let trainerPhone: String?
    let onDismiss: () -> Void
    
    var body: some View {
        ZStack {
            Color.black.opacity(0.3)
                .ignoresSafeArea()
            
            VStack(spacing: 24) {
                // Icon
                Image(systemName: "calendar.badge.exclamationmark")
                    .font(.system(size: 60))
                    .foregroundColor(.orange)
                
                // Title
                VStack(spacing: 8) {
                    Text("Bookings Temporarily Unavailable")
                        .font(.title2)
                        .fontWeight(.bold)
                        .multilineTextAlignment(.center)
                    
                    Text("This trainer is not currently accepting new bookings through this app.\nPlease contact them directly.")
                        .font(.body)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                }
                
                // Contact Options
                VStack(spacing: 12) {
                    if let email = trainerEmail {
                        Button(action: {
                            openEmail(email)
                        }) {
                            Label("Email \(trainerName)", systemImage: "envelope.fill")
                                .font(.headline)
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color.blue)
                                .cornerRadius(12)
                        }
                    }
                    
                    if let phone = trainerPhone {
                        Button(action: {
                            openPhone(phone)
                        }) {
                            Label("Call \(trainerName)", systemImage: "phone.fill")
                                .font(.headline)
                                .foregroundColor(.blue)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color(.systemGray6))
                                .cornerRadius(12)
                        }
                    }
                    
                    Button(action: onDismiss) {
                        Text("Back")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .frame(maxWidth: .infinity)
                            .padding()
                    }
                }
            }
            .padding(32)
            .background(Color(.systemBackground))
            .cornerRadius(24)
            .shadow(radius: 20)
            .padding(32)
        }
    }
    
    private func openEmail(_ email: String) {
        if let url = URL(string: "mailto:\(email)") {
            UIApplication.shared.open(url)
        }
    }
    
    private func openPhone(_ phone: String) {
        let cleaned = phone.replacingOccurrences(of: "[^0-9+]", with: "", options: .regularExpression)
        if let url = URL(string: "tel:\(cleaned)") {
            UIApplication.shared.open(url)
        }
    }
}

#Preview {
    ClientBookingBlockedView(
        organizationName: "Elite Volleyball Academy",
        trainerName: "Coach Sarah",
        trainerEmail: "sarah@example.com",
        trainerPhone: "(555) 123-4567",
        onDismiss: {}
    )
}
