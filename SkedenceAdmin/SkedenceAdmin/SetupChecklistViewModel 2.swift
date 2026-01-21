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
                
                // Guard against empty orgId
                guard !orgId.isEmpty else {
                    print("⚠️ SetupChecklistViewModel received document with empty ID")
                    return
                }
                
                self.bookingLink = "https://skedence.app/book/\(orgId)"
                
                // Load onboarding progress
                if let progressData = document.data()["onboardingProgress"] as? [String: Any] {
                    self.progress.hasConnectedStripe = progressData["hasConnectedStripe"] as? Bool ?? false
                    self.progress.hasCreatedPackages = progressData["hasCreatedPackages"] as? Bool ?? false
                    self.progress.hasSharedLink = progressData["hasSharedLink"] as? Bool ?? false
                    self.progress.hasInvitedClient = progressData["hasInvitedClient"] as? Bool ?? false
                    self.progress.hasAddedTrainer = progressData["hasAddedTrainer"] as? Bool ?? false
                    self.progress.hasSetAvailability = progressData["hasSetAvailability"] as? Bool ?? false
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
        // Guard against empty orgId
        guard !orgId.isEmpty else {
            print("⚠️ SetupChecklistViewModel.checkActualProgress called with empty orgId")
            return
        }
        
        // Check if Stripe is connected
        let orgDoc = try? await db.collection("organizations").document(orgId).getDocument()
        if let stripeId = orgDoc?.data()?["stripeCustomerId"] as? String, !stripeId.isEmpty {
            progress.hasConnectedStripe = true
        }
        
        // Check if packages exist (either in subcollection OR pricingStructure field)
        var hasPackages = false
        
        // Check subcollection first
        let packagesSnapshot = try? await db.collection("organizations").document(orgId)
            .collection("packages").getDocuments()
        if let count = packagesSnapshot?.documents.count, count > 0 {
            hasPackages = true
        }
        
        // Also check if pricingStructure field exists
        if !hasPackages, let pricingStructure = orgDoc?.data()?["pricingStructure"] as? [String: Any] {
            if let tiers = pricingStructure["tiers"] as? [[String: Any]], !tiers.isEmpty {
                hasPackages = true
                print("✅ Found pricing structure with \(tiers.count) tiers")
            }
        }
        
        if hasPackages {
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
            "hasSharedLink": progress.hasSharedLink,
            "hasInvitedClient": progress.hasSharedLink || progress.hasInvitedClient  // Backwards compat
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
    
    func markSharedLink() async {
        progress.hasSharedLink = true
        try? await updateProgress()
    }
    
    func removeChecklist() async {
        // Mark checklist as dismissed in organization
        guard let userId = Auth.auth().currentUser?.uid else { return }
        
        do {
            let orgSnapshot = try await db.collection("organizations")
                .whereField("adminIds", arrayContains: userId)
                .limit(to: 1)
                .getDocuments()
            
            guard let orgDoc = orgSnapshot.documents.first else { return }
            
            try await orgDoc.reference.updateData([
                "onboardingProgress.checklistDismissed": true,
                "onboardingProgress.dismissedAt": Timestamp(date: Date())
            ])
        } catch {
            print("❌ Error removing checklist: \\(error)")
        }
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
        // Post notification to show Stripe keys setup view
        NotificationCenter.default.post(name: NSNotification.Name("ShowStripeKeysSetup"), object: nil)
    }
    
    func navigateToPackages() {
        // Post notification to navigate to packages
        NotificationCenter.default.post(name: NSNotification.Name("NavigateToPackages"), object: nil)
    }
    
    func navigateToProfile() {
        // Post notification to navigate to profile
        NotificationCenter.default.post(name: NSNotification.Name("NavigateToProfile"), object: nil)
    }
    
    func navigateToAvailability() {
        // Post notification to navigate to schedule/availability
        NotificationCenter.default.post(name: NSNotification.Name("NavigateToSchedule"), object: nil)
    }
    
    func dismissChecklist() {
        // Mark as dismissed in user defaults or Firestore
        UserDefaults.standard.set(true, forKey: "onboardingCompleted")
    }
    
    deinit {
        listener?.remove()
    }
}
