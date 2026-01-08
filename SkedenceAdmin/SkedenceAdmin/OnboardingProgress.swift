import Foundation
import FirebaseFirestore

struct OnboardingProgress: Codable {
    var hasConnectedStripe: Bool = false
    var hasCreatedPackages: Bool = false
    var hasAddedTrainer: Bool = false
    var hasSetAvailability: Bool = false
    var hasInvitedClient: Bool = false
    var selectedTemplate: String? = nil
    var completedAt: Date? = nil
    
    var isComplete: Bool {
        hasConnectedStripe &&
        hasCreatedPackages &&
        hasAddedTrainer &&
        hasSetAvailability &&
        hasInvitedClient
    }
    
    var completionPercentage: Double {
        let completed = [
            hasConnectedStripe,
            hasCreatedPackages,
            hasAddedTrainer,
            hasSetAvailability,
            hasInvitedClient
        ].filter { $0 }.count
        return Double(completed) / 5.0
    }
}
