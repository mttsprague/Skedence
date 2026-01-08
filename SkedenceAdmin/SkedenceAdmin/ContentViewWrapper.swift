import SwiftUI
import FirebaseAuth
import FirebaseFirestore

struct ContentViewWrapper: View {
    @EnvironmentObject var auth: AuthManager
    @State private var showOnboarding = false
    @State private var isCheckingOnboarding = true
    @State private var onboardingProgress: OnboardingProgress?
    
    var body: some View {
        Group {
            if isCheckingOnboarding {
                ProgressView("Loading...")
            } else if showOnboarding && !UserDefaults.standard.bool(forKey: "onboardingCompleted") {
                NavigationView {
                    SetupChecklistView()
                        .navigationBarTitleDisplayMode(.inline)
                        .toolbar {
                            ToolbarItem(placement: .navigationBarTrailing) {
                                Button("Skip") {
                                    UserDefaults.standard.set(true, forKey: "onboardingCompleted")
                                    showOnboarding = false
                                }
                            }
                        }
                }
            } else {
                ContentView()
            }
        }
        .onAppear {
            checkOnboardingStatus()
        }
    }
    
    private func checkOnboardingStatus() {
        guard let userId = Auth.auth().currentUser?.uid else {
            isCheckingOnboarding = false
            return
        }
        
        let db = Firestore.firestore()
        
        db.collection("organizations")
            .whereField("adminIds", arrayContains: userId)
            .limit(to: 1)
            .getDocuments { snapshot, error in
                guard let document = snapshot?.documents.first else {
                    isCheckingOnboarding = false
                    return
                }
                
                // Check if onboarding exists
                if let progressData = document.data()["onboardingProgress"] as? [String: Any] {
                    let progress = OnboardingProgress(
                        hasConnectedStripe: progressData["hasConnectedStripe"] as? Bool ?? false,
                        hasCreatedPackages: progressData["hasCreatedPackages"] as? Bool ?? false,
                        hasAddedTrainer: progressData["hasAddedTrainer"] as? Bool ?? false,
                        hasSetAvailability: progressData["hasSetAvailability"] as? Bool ?? false,
                        hasInvitedClient: progressData["hasInvitedClient"] as? Bool ?? false,
                        selectedTemplate: progressData["selectedTemplate"] as? String
                    )
                    
                    // Show onboarding if not complete
                    showOnboarding = !progress.isComplete
                } else {
                    // No onboarding data yet - show it
                    showOnboarding = true
                }
                
                isCheckingOnboarding = false
            }
    }
}
