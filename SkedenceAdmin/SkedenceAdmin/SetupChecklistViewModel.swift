import Foundation
import FirebaseAuth
import FirebaseFirestore
import Combine

@MainActor
class SetupChecklistViewModel: ObservableObject {
    @Published var progress = OnboardingProgress()
    @Published var bookingLink = ""
    
    private let db = Firestore.firestore()
    private var listener: ListenerRegistration?
    
    func loadProgress() {
        guard let userId = Auth.auth().currentUser?.uid else { return }
        
        // Listen for progress updates
        listener = db.collection("organizations")
            .whereField("adminIds", arrayContains: userId)
            .limit(to: 1)
            .addSnapshotListener { [weak self] snapshot, error in
                guard let self = self,
                      let document = snapshot?.documents.first else { return }
                
                let orgId = document.documentID
                self.bookingLink = "https://skedence.app/book/\(orgId)"
                
                // Load onboarding progress
                if let progressData = document.data()["onboardingProgress"] as? [String: Any] {
                    self.progress.hasConnectedStripe = progressData["hasConnectedStripe"] as? Bool ?? false
                    self.progress.hasCreatedPackages = progressData["hasCreatedPackages"] as? Bool ?? false
                    self.progress.hasAddedTrainer = progressData["hasAddedTrainer"] as? Bool ?? false
                    self.progress.hasSetAvailability = progressData["hasSetAvailability"] as? Bool ?? false
                    self.progress.hasInvitedClient = progressData["hasInvitedClient"] as? Bool ?? false
                    self.progress.selectedTemplate = progressData["selectedTemplate"] as? String
                    
                    if let timestamp = progressData["completedAt"] as? Timestamp {
                        self.progress.completedAt = timestamp.dateValue()
                    }
                }
                
                // Auto-detect completion based on actual data
                Task {
                    await self.checkActualProgress(orgId: orgId)
                }
            }
    }
    
    private func checkActualProgress(orgId: String) async {
        // Check if Stripe is connected
        let orgDoc = try? await db.collection("organizations").document(orgId).getDocument()
        if let stripeId = orgDoc?.data()?["stripeCustomerId"] as? String, !stripeId.isEmpty {
            progress.hasConnectedStripe = true
        }
        
        // Check if packages exist
        let packagesSnapshot = try? await db.collection("organizations").document(orgId)
            .collection("packages").getDocuments()
        if let count = packagesSnapshot?.documents.count, count > 0 {
            progress.hasCreatedPackages = true
        }
        
        // Check if trainers exist
        let trainersSnapshot = try? await db.collection("organizations").document(orgId)
            .collection("trainers").getDocuments()
        if let count = trainersSnapshot?.documents.count, count > 0 {
            progress.hasAddedTrainer = true
        }
        
        // Check if availability exists
        let availabilitySnapshot = try? await db.collection("organizations").document(orgId)
            .collection("availability").getDocuments()
        if let count = availabilitySnapshot?.documents.count, count > 0 {
            progress.hasSetAvailability = true
        }
        
        // Update Firestore with detected progress
        try? await updateProgress()
    }
    
    func updateProgress() async throws {
        guard let userId = Auth.auth().currentUser?.uid else { return }
        
        let orgSnapshot = try await db.collection("organizations")
            .whereField("adminIds", arrayContains: userId)
            .limit(to: 1)
            .getDocuments()
        
        guard let orgDoc = orgSnapshot.documents.first else { return }
        
        var progressData: [String: Any] = [
            "hasConnectedStripe": progress.hasConnectedStripe,
            "hasCreatedPackages": progress.hasCreatedPackages,
            "hasAddedTrainer": progress.hasAddedTrainer,
            "hasSetAvailability": progress.hasSetAvailability,
            "hasInvitedClient": progress.hasInvitedClient
        ]
        
        if let template = progress.selectedTemplate {
            progressData["selectedTemplate"] = template
        }
        
        if progress.isComplete && progress.completedAt == nil {
            progress.completedAt = Date()
            progressData["completedAt"] = Timestamp(date: Date())
        }
        
        try await orgDoc.reference.updateData([
            "onboardingProgress": progressData
        ])
    }
    
    func applyTemplate(_ template: SportTemplate) {
        Task {
            do {
                guard let userId = Auth.auth().currentUser?.uid else { return }
                
                let orgSnapshot = try await db.collection("organizations")
                    .whereField("adminIds", arrayContains: userId)
                    .limit(to: 1)
                    .getDocuments()
                
                guard let orgDoc = orgSnapshot.documents.first else { return }
                let orgId = orgDoc.documentID
                
                // Apply template
                try await TemplateService.applyTemplate(template, to: orgId)
                
                // Update progress
                progress.selectedTemplate = template.id
                progress.hasCreatedPackages = true
                try await updateProgress()
                
            } catch {
                print("Error applying template: \(error)")
            }
        }
    }
    
    func navigateToStripeSetup() {
        // Navigate to Stripe setup - implement based on your app navigation
    }
    
    func navigateToPackages() {
        // Navigate to packages view - implement based on your app navigation
    }
    
    func navigateToProfile() {
        // Navigate to profile view - implement based on your app navigation
    }
    
    func navigateToAvailability() {
        // Navigate to availability view - implement based on your app navigation
    }
    
    func dismissChecklist() {
        // Mark as dismissed in user defaults or Firestore
        UserDefaults.standard.set(true, forKey: "onboardingCompleted")
    }
    
    deinit {
        listener?.remove()
    }
}
