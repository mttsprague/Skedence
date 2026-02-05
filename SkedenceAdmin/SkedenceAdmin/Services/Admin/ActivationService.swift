import Foundation
import FirebaseFirestore
import Combine

enum ActivationServiceError: Error, LocalizedError {
    case missingOrgId
    case statusCheckFailed(String)
    case updateFailed(String)
    
    var errorDescription: String? {
        switch self {
        case .missingOrgId:
            return "Organization ID is required"
        case .statusCheckFailed(let message):
            return "Failed to check activation status: \(message)"
        case .updateFailed(let message):
            return "Failed to update activation status: \(message)"
        }
    }
}

@MainActor
class ActivationService: ObservableObject {
    @Published var isActivated = false
    @Published var activationStatus = ActivationStatus()
    
    private let db = Firestore.firestore()
    
    struct ActivationStatus: Codable {
        var hasStripe: Bool = false
        var hasPackages: Bool = false
        var hasAvailability: Bool = false
        
        var isComplete: Bool {
            hasStripe && hasPackages && hasAvailability
        }
        
        var completionPercentage: Double {
            let completed = [hasStripe, hasPackages, hasAvailability].filter { $0 }.count
            return Double(completed) / 3.0
        }
        
        var missingItems: [String] {
            var items: [String] = []
            if !hasStripe { items.append("Add your Stripe API keys") }
            if !hasPackages { items.append("Create at least one package") }
            if !hasAvailability { items.append("Set your availability") }
            return items
        }
    }
    
    func checkActivationStatus(for organizationId: String) async {
        guard !organizationId.isEmpty else {
            return
        }
        
        do {
            // Check Stripe connection
            let orgDoc = try await db.collection("organizations").document(organizationId).getDocument()
            let hasStripeId = orgDoc.data()?["stripeCustomerId"] as? String != nil
            
            // Check packages
            let packagesSnapshot = try await db.collection("organizations").document(organizationId)
                .collection("packages")
                .whereField("isActive", isEqualTo: true)
                .getDocuments()
            let hasPackages = !packagesSnapshot.isEmpty
            
            // Check availability
            let availabilitySnapshot = try await db.collection("organizations").document(organizationId)
                .collection("availability")
                .whereField("isActive", isEqualTo: true)
                .getDocuments()
            let hasAvailability = !availabilitySnapshot.isEmpty
            
            activationStatus = ActivationStatus(
                hasStripe: hasStripeId,
                hasPackages: hasPackages,
                hasAvailability: hasAvailability
            )
            
            isActivated = activationStatus.isComplete
            
            // Update Firestore with activation status
            try await orgDoc.reference.updateData([
                "isActivated": isActivated,
                "activationStatus": [
                    "hasStripe": hasStripeId,
                    "hasPackages": hasPackages,
                    "hasAvailability": hasAvailability,
                    "lastChecked": Timestamp(date: Date())
                ]
            ])
            
        } catch {
            // Silently fail - activation status is not critical
        }
    }
    
    func canAcceptBookings(for organizationId: String) async -> Bool {
        await checkActivationStatus(for: organizationId)
        return isActivated
    }
}
