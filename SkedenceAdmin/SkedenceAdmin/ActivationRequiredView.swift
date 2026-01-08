import SwiftUI

struct ActivationRequiredView: View {
    let activationStatus: ActivationService.ActivationStatus
    let onComplete: () -> Void
    
    var body: some View {
        VStack(spacing: 24) {
            // Warning Icon
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 60))
                .foregroundColor(.orange)
            
            // Title
            Text("Almost There!")
                .font(.title)
                .fontWeight(.bold)
            
            Text("Complete these steps to start accepting bookings")
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
            
            // Progress
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text("Setup Progress")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                    
                    Spacer()
                    
                    Text("\(Int(activationStatus.completionPercentage * 100))%")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(.blue)
                }
                
                GeometryReader { geometry in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 8)
                            .fill(Color(.systemGray5))
                        
                        RoundedRectangle(cornerRadius: 8)
                            .fill(Color.blue)
                            .frame(width: geometry.size.width * activationStatus.completionPercentage)
                    }
                }
                .frame(height: 12)
            }
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(12)
            
            // Missing Items Checklist
            VStack(alignment: .leading, spacing: 12) {
                Text("Required Steps")
                    .font(.headline)
                    .padding(.bottom, 4)
                
                ActivationCheckItem(
                    title: "Connect Stripe",
                    isComplete: activationStatus.hasStripe,
                    icon: "creditcard.fill"
                )
                
                ActivationCheckItem(
                    title: "Create Packages",
                    isComplete: activationStatus.hasPackages,
                    icon: "shippingbox.fill"
                )
                
                ActivationCheckItem(
                    title: "Set Availability",
                    isComplete: activationStatus.hasAvailability,
                    icon: "calendar.badge.clock"
                )
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .shadow(color: Color.black.opacity(0.05), radius: 8)
            
            if activationStatus.isComplete {
                Button(action: onComplete) {
                    HStack {
                        Image(systemName: "checkmark.circle.fill")
                        Text("Start Accepting Bookings")
                    }
                    .font(.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.green)
                    .cornerRadius(12)
                }
            } else {
                Button(action: onComplete) {
                    Text("Complete Setup")
                        .font(.headline)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.blue)
                        .cornerRadius(12)
                }
            }
        }
        .padding()
    }
}

struct ActivationCheckItem: View {
    let title: String
    let isComplete: Bool
    let icon: String
    
    var body: some View {
        HStack(spacing: 16) {
            Image(systemName: isComplete ? "checkmark.circle.fill" : "circle")
                .font(.title3)
                .foregroundColor(isComplete ? .green : .gray)
            
            Image(systemName: icon)
                .foregroundColor(isComplete ? .primary : .secondary)
            
            Text(title)
                .font(.body)
                .foregroundColor(isComplete ? .secondary : .primary)
            
            Spacer()
        }
    }
}

#Preview {
    ActivationRequiredView(
        activationStatus: ActivationService.ActivationStatus(
            hasStripe: true,
            hasPackages: true,
            hasAvailability: false
        ),
        onComplete: {}
    )
}
