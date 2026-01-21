import Foundation
import FirebaseFirestore

struct OnboardingProgress: Codable {
    var hasConnectedStripe: Bool = false
    var hasCreatedPackages: Bool = false
    var hasSharedLink: Bool = false  // Renamed from hasInvitedClient for clarity
    var selectedTemplate: String? = nil
    var completedAt: Date? = nil
    
    // Legacy fields (kept for backwards compatibility)
    var hasAddedTrainer: Bool = false
    var hasSetAvailability: Bool = false
    var hasInvitedClient: Bool = false
    
    var isComplete: Bool {
        hasConnectedStripe &&
        hasCreatedPackages &&
        (hasSharedLink || hasInvitedClient)  // Accept either for backwards compat
    }
    
    var completionPercentage: Double {
        // Count only the 3 main steps
        let completed = [
            hasConnectedStripe,
            hasCreatedPackages,
            (hasSharedLink || hasInvitedClient)
        ].filter { $0 }.count
        
        // Return 33%, 66%, or 100%
        return Double(completed) / 3.0
    }
}
