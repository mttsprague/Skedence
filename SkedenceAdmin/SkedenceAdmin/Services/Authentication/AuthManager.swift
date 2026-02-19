// AuthManager.swift
import Foundation
import SwiftUI
import Combine

#if canImport(FirebaseAuth)
import FirebaseAuth
#endif

#if canImport(FirebaseFunctions)
import FirebaseFunctions
#endif

#if canImport(FirebaseFirestore)
import FirebaseFirestore
#endif

@MainActor
final class AuthManager: ObservableObject {
    @Published var isAuthenticated: Bool = false
    @Published private(set) var isReady: Bool = false
    @Published var userId: String?
    @Published var userEmail: String?
    @Published var errorMessage: String?
    @Published var isTrainer: Bool = false
    @Published var isAdmin: Bool = false
    @Published var currentOrgId: String?
    @Published var currentOrgRole: String?
    @Published var trainerId: String? // The actual trainer document ID (may differ from userId)

    // Trainer profile fields (from /trainers/{uid})
    @Published var trainerDisplayName: String?
    @Published var trainerPhotoURLString: String?
    
    // User profile fields (from /users/{uid})
    @Published var userFirstName: String?
    @Published var userLastName: String?
    @Published var organizationName: String?
    
    // STEP 8: Dynamic branding from organization
    @Published var primaryColor: Color = Color(red: 0.20, green: 0.70, blue: 0.68) // Default teal
    @Published var logoUrl: String?
    @Published var stripePublishableKey: String?
    
    // STEP 10: Billing status
    @Published var billingPlan: String = "free"
    @Published var billingStatus: String = "active"
    @Published var subscriptionEndDate: Date?
    @Published var isBillingBlocked: Bool = false
    
    // Onboarding status
    @Published var onboardingComplete: Bool = false

    // Fields for convenience in the MoreView
    @Published var emailInput: String = ""
    @Published var passwordInput: String = ""
    @Published var firstNameInput: String = ""
    @Published var lastNameInput: String = ""

    #if canImport(FirebaseAuth)
    private var authListenerHandle: AuthStateDidChangeListenerHandle?
    #endif

    init() {
        #if canImport(FirebaseAuth)
        authListenerHandle = Auth.auth().addStateDidChangeListener { [weak self] _, user in
            guard let self else { return }
            
            Task { @MainActor in
                self.isAuthenticated = (user != nil)
                self.userId = user?.uid
                self.userEmail = user?.email
                self.isReady = true
                
                print("🔐 Auth state changed: isAuthenticated = \(user != nil), uid = \(user?.uid ?? "nil")")
                
                // Load org data
                if let uid = user?.uid {
                    await self.loadOrgId(for: uid)
                    
                    // Only load trainer data if onboarding is complete
                    if self.onboardingComplete {
                        await self.refreshTrainerStatus()
                        await self.refreshTrainerProfileIfNeeded()
                    }
                    
                    print("🎯 Org data loaded: orgId = \(self.currentOrgId ?? "nil"), onboarding = \(self.onboardingComplete)")
                }
            }
        }
        #else
        // No FirebaseAuth in this build
        self.isAuthenticated = false
        self.userId = nil
        self.userEmail = nil
        self.isTrainer = false
        #endif
    }

    deinit {
        #if canImport(FirebaseAuth)
        if let handle = authListenerHandle {
            Auth.auth().removeStateDidChangeListener(handle)
        }
        #endif
    }

    // MARK: - Auth

    func signUp() async {
        errorMessage = nil
        #if canImport(FirebaseAuth)
        do {
            let result = try await Auth.auth().createUser(withEmail: emailInput, password: passwordInput)
            let uid = result.user.uid

            // Skedence only creates trainer documents, NOT user documents
            // Call server to register as trainer (or simulate if Functions unavailable)
            try await registerTrainerProfileOnServer(uid: uid, email: emailInput, firstName: firstNameInput, lastName: lastNameInput)

            await refreshTrainerStatus()
            await refreshTrainerProfileIfNeeded()
        } catch {
            self.errorMessage = error.localizedDescription
        }
        #else
        self.errorMessage = "FirebaseAuth is not available in this build."
        #endif
    }

    func signIn() async {
        errorMessage = nil
        #if canImport(FirebaseAuth)
        do {
            _ = try await Auth.auth().signIn(withEmail: emailInput, password: passwordInput)
            await refreshTrainerStatus()
            await refreshTrainerProfileIfNeeded()
        } catch {
            self.errorMessage = error.localizedDescription
        }
        #else
        self.errorMessage = "FirebaseAuth is not available in this build."
        #endif
    }
    
    // Sign in with explicit email and password parameters
    func signIn(email: String, password: String) async throws {
        errorMessage = nil
        #if canImport(FirebaseAuth)
        do {
            _ = try await Auth.auth().signIn(withEmail: email, password: password)
            // Auth listener will load org data and handle navigation
        } catch {
            self.errorMessage = error.localizedDescription
            throw error
        }
        #else
        self.errorMessage = "FirebaseAuth is not available in this build."
        throw NSError(domain: "AuthManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "FirebaseAuth is not available"])
        #endif
    }

    func signOut() {
        errorMessage = nil
        #if canImport(FirebaseAuth)
        do {
            // Stop all active listeners before signing out
            SubscriptionStatusService.shared.stopMonitoring()
            
            // Now sign out (state will be updated by auth listener)
            try Auth.auth().signOut()
            
            print("🚪 Signed out successfully")
        } catch {
            self.errorMessage = error.localizedDescription
        }
        #else
        self.errorMessage = "FirebaseAuth is not available in this build."
        #endif
    }

    // MARK: - Trainer registration via Cloud Function (preferred) or simulated fallback

    func registerTrainerProfileOnServer(uid: String, email: String, firstName: String, lastName: String) async throws {
        #if canImport(FirebaseFunctions)
        let functions = Functions.functions(region: "us-central1")
        let payload: [String: Any] = [
            "uid": uid,
            "email": email,
            "firstName": firstName,
            "lastName": lastName
        ]
        do {
            _ = try await functions.httpsCallable("registerTrainer").call(payload)
        } catch {
            // If the callable is missing or you’re in a dev build, fall back to local simulation
            try await FirestoreTrainersService.shared.createOrUpdateTrainerProfile(
                trainerId: uid,
                firstName: firstName,
                lastName: lastName,
                email: email
            )
        }
        #elseif canImport(FirebaseFirestore)
        // Dev fallback: simulate what the function would do
        try await FirestoreTrainersService.shared.createOrUpdateTrainerProfile(
            trainerId: uid,
            firstName: firstName,
            lastName: lastName,
            email: email
        )
        #else
        throw FirestoreServiceError.notAvailable
        #endif
    }

    // MARK: - Status/profile helpers

    func refreshTrainerStatus() async {
        #if canImport(FirebaseAuth) && canImport(FirebaseFirestore)
        guard let uid = Auth.auth().currentUser?.uid, !uid.isEmpty else {
            self.isTrainer = false
            return
        }
        do {
            let ref = Firestore.firestore().collection("trainers").document(uid)
            let snap = try await ref.getDocument()
            self.isTrainer = snap.exists
        } catch {
            self.isTrainer = false
        }
        #else
        self.isTrainer = false
        #endif
    }

    func refreshTrainerProfileIfNeeded() async {
        #if canImport(FirebaseAuth) && canImport(FirebaseFirestore)
        guard isTrainer, let uid = Auth.auth().currentUser?.uid, !uid.isEmpty else {
            self.trainerDisplayName = nil
            self.trainerPhotoURLString = nil
            self.isAdmin = false
            return
        }
        do {
            let ref = Firestore.firestore().collection("trainers").document(uid)
            let snap = try await ref.getDocument()
            if let data = snap.data() {
                self.trainerDisplayName = (data["name"] as? String) ?? self.trainerDisplayName
                // Check both "isAdmin" and "admin" for backwards compatibility
                self.isAdmin = (data["isAdmin"] as? Bool) ?? (data["admin"] as? Bool) ?? false
                
                // Load firstName and lastName
                self.userFirstName = data["firstName"] as? String
                self.userLastName = data["lastName"] as? String
                
                if let url = data["photoURL"] as? String, !url.isEmpty {
                    self.trainerPhotoURLString = url
                } else if let url = data["avatarUrl"] as? String, !url.isEmpty {
                    self.trainerPhotoURLString = url
                }
            }
        } catch {
            // Leave previous values; optionally surface error
        }
        #endif
    }
    
    // MARK: - Organization Management
    
    func loadOrgId(for userId: String) async {
        #if canImport(FirebaseFirestore)
        do {
            let db = Firestore.firestore()
            let snapshot = try await db.collection("orgMembers")
                .whereField("userId", isEqualTo: userId)
                .whereField("isActive", isEqualTo: true)
                .limit(to: 1)
                .getDocuments()
            
            if let doc = snapshot.documents.first,
               let orgId = doc.data()["orgId"] as? String {
                self.currentOrgId = orgId
                self.currentOrgRole = doc.data()["role"] as? String
                
                // Set isAdmin based on role (owner or admin)
                self.isAdmin = (self.currentOrgRole == "owner" || self.currentOrgRole == "admin")
                
                // If user is a trainer, find their trainer document ID
                if currentOrgRole == "trainer" {
                    await loadTrainerId(userId: userId, orgId: orgId)
                } else {
                    self.trainerId = nil
                }
                
                // Load organization branding
                await loadOrgBranding(orgId: orgId)
            } else {
                self.currentOrgId = nil
                self.currentOrgRole = nil
                self.isAdmin = false
                self.trainerId = nil
            }
        } catch {
            self.currentOrgId = nil
            self.currentOrgRole = nil
            self.trainerId = nil
        }
        #else
        self.currentOrgId = nil
        self.currentOrgRole = nil
        self.trainerId = nil
        #endif
    }
    
    func loadTrainerId(userId: String, orgId: String) async {
        #if canImport(FirebaseFirestore)
        do {
            print("🔍 loadTrainerId: Starting for userId: \(userId), orgId: \(orgId)")
            let db = Firestore.firestore()
            
            // Query trainers collection by orgId and email matching the userId's email
            // First get the user's email from users collection or auth
            print("🔍 loadTrainerId: Fetching user document...")
            let userDoc = try? await db.collection("users").document(userId).getDocument()
            let userEmail = userDoc?.data()?["email"] as? String ?? userDoc?.data()?["emailAddress"] as? String ?? self.userEmail
            
            print("🔍 loadTrainerId: User email: \(userEmail ?? "none")")
            
            if let email = userEmail {
                print("🔍 loadTrainerId: Querying trainers collection...")
                let trainersSnapshot = try await db.collection("trainers")
                    .whereField("orgId", isEqualTo: orgId)
                    .whereField("email", isEqualTo: email)
                    .limit(to: 1)
                    .getDocuments()
                
                if let trainerDoc = trainersSnapshot.documents.first {
                    self.trainerId = trainerDoc.documentID
                    print("✅ loadTrainerId: Found trainerId: \(trainerDoc.documentID)")
                } else {
                    self.trainerId = nil
                    print("⚠️ loadTrainerId: No trainer document found")
                }
            } else {
                self.trainerId = nil
                print("⚠️ loadTrainerId: No email available")
            }
        } catch {
            print("❌ loadTrainerId ERROR: \(error)")
            print("❌ Error details: \(error.localizedDescription)")
            self.trainerId = nil
        }
        #else
        self.trainerId = nil
        #endif
    }
    
    // STEP 8: Load dynamic branding from organization
    func loadOrgBranding(orgId: String) async {
        guard !orgId.isEmpty else {
            print("⚠️ loadOrgBranding: Empty orgId")
            return
        }
        
        #if canImport(FirebaseFirestore)
        do {
            print("🔍 loadOrgBranding: Starting for orgId: \(orgId)")
            let db = Firestore.firestore()
            print("🔍 loadOrgBranding: Fetching organization document...")
            let orgDoc = try await db.collection("organizations").document(orgId).getDocument()
            
            guard let orgData = orgDoc.data() else {
                self.onboardingComplete = false
                return
            }
            
            self.onboardingComplete = true
            
            // Optional: Capture organization name
            if let name = orgData["name"] as? String {
                self.organizationName = name
            }
            
            // Load branding
            if let branding = orgData["branding"] as? [String: Any] {
                if let colorHex = branding["primaryColor"] as? String {
                    // Convert hex string to Color (e.g., "#33B2AE")
                    self.primaryColor = Color(hex: colorHex) ?? Color(red: 0.20, green: 0.70, blue: 0.68)
                }
                if let logo = branding["logoUrl"] as? String, !logo.isEmpty {
                    self.logoUrl = logo
                }
            }
            
            // Load Stripe publishable key
            if let stripe = orgData["stripe"] as? [String: Any],
               let pubKey = stripe["publishableKey"] as? String, !pubKey.isEmpty {
                self.stripePublishableKey = pubKey
            }
            
            // STEP 10: Load billing status
            if let billing = orgData["billing"] as? [String: Any] {
                self.billingPlan = billing["plan"] as? String ?? "free"
                
                if let status = billing["status"] as? String {
                    self.billingStatus = status
                }
                
                if let endTimestamp = billing["currentPeriodEnd"] as? Timestamp {
                    self.subscriptionEndDate = endTimestamp.dateValue()
                }
                
                // Block if status is past_due, canceled, or unpaid
                self.isBillingBlocked = ["past_due", "canceled", "unpaid"].contains(self.billingStatus)
            }
            
            print("✅ loadOrgBranding: Complete")
            
            // Load user profile data (firstName, lastName)
            if let uid = userId, !uid.isEmpty {
                // For trainers, load from trainers collection
                // For admins/owners, try trainers first, then fall back to users
                var userData: [String: Any]?
                
                // Try trainers collection first (most common case)
                let trainerDoc = try await db.collection("trainers").document(uid).getDocument()
                if trainerDoc.exists {
                    userData = trainerDoc.data()
                } else {
                    // Fall back to users collection for admins/owners
                    let userDoc = try await db.collection("users").document(uid).getDocument()
                    if userDoc.exists {
                        userData = userDoc.data()
                    }
                }
                
                if let data = userData {
                    await MainActor.run {
                        self.userFirstName = data["firstName"] as? String
                        self.userLastName = data["lastName"] as? String
                    }
                }
            }
        } catch {
        }
        #endif
    }
}

// MARK: - Color Extension for Hex
extension Color {
    init?(hex: String) {
        var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        hexSanitized = hexSanitized.replacingOccurrences(of: "#", with: "")

        var rgb: UInt64 = 0
        guard Scanner(string: hexSanitized).scanHexInt64(&rgb) else { return nil }

        let r = Double((rgb & 0xFF0000) >> 16) / 255.0
        let g = Double((rgb & 0x00FF00) >> 8) / 255.0
        let b = Double(rgb & 0x0000FF) / 255.0

        self.init(red: r, green: g, blue: b)
    }
}
