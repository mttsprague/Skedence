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
    @Published var userId: String?
    @Published var userEmail: String?
    @Published var errorMessage: String?
    @Published var isTrainer: Bool = false
    @Published var isAdmin: Bool = false
    @Published var currentOrgId: String?
    @Published var currentOrgRole: String?

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
            self.isAuthenticated = (user != nil)
            self.userId = user?.uid
            self.userEmail = user?.email
            Task {
                if let uid = user?.uid {
                    await self.loadOrgId(for: uid)
                }
                await self.refreshTrainerStatus()
                await self.refreshTrainerProfileIfNeeded()
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

    func signOut() {
        errorMessage = nil
        #if canImport(FirebaseAuth)
        do {
            try Auth.auth().signOut()
            self.isTrainer = false
            self.isAdmin = false
            self.userId = nil
            self.userEmail = nil
            self.trainerDisplayName = nil
            self.trainerPhotoURLString = nil
            self.currentOrgId = nil
            self.currentOrgRole = nil
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
        let functions = Functions.functions()
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
            try await FirestoreService.shared.createOrUpdateTrainerProfile(
                trainerId: uid,
                firstName: firstName,
                lastName: lastName,
                email: email
            )
        }
        #elseif canImport(FirebaseFirestore)
        // Dev fallback: simulate what the function would do
        try await FirestoreService.shared.createOrUpdateTrainerProfile(
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
        guard let uid = Auth.auth().currentUser?.uid else {
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
        guard isTrainer, let uid = Auth.auth().currentUser?.uid else {
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
                currentOrgId = orgId
                currentOrgRole = doc.data()["role"] as? String
                print("AuthManager: Loaded orgId: \(orgId), role: \(currentOrgRole ?? "unknown") for user: \(userId)")
                
                // Load organization branding
                await loadOrgBranding(orgId: orgId)
            } else {
                print("AuthManager: ⚠️ No active orgMember found for user: \(userId)")
                currentOrgId = nil
                currentOrgRole = nil
            }
        } catch {
            print("AuthManager: ❌ Failed to load orgId: \(error.localizedDescription)")
            currentOrgId = nil
            currentOrgRole = nil
        }
        #else
        currentOrgId = nil
        currentOrgRole = nil
        #endif
    }
    
    // STEP 8: Load dynamic branding from organization
    private func loadOrgBranding(orgId: String) async {
        #if canImport(FirebaseFirestore)
        do {
            let db = Firestore.firestore()
            let orgDoc = try await db.collection("organizations").document(orgId).getDocument()
            
            guard let orgData = orgDoc.data() else {
                print("AuthManager: ⚠️ Organization document not found for: \(orgId)")
                return
            }
            
            // Load organization name
            organizationName = orgData["name"] as? String
            print("AuthManager: Loaded organization name: \(organizationName ?? "nil")")
            
            // Load branding
            if let branding = orgData["branding"] as? [String: Any] {
                if let colorHex = branding["primaryColor"] as? String {
                    // Convert hex string to Color (e.g., "#33B2AE")
                    primaryColor = Color(hex: colorHex) ?? Color(red: 0.20, green: 0.70, blue: 0.68)
                    print("AuthManager: Loaded primaryColor: \(colorHex)")
                }
                if let logo = branding["logoUrl"] as? String, !logo.isEmpty {
                    logoUrl = logo
                    print("AuthManager: Loaded logoUrl: \(logo)")
                }
            }
            
            // Load Stripe publishable key
            if let stripe = orgData["stripe"] as? [String: Any],
               let pubKey = stripe["publishableKey"] as? String, !pubKey.isEmpty {
                stripePublishableKey = pubKey
                print("AuthManager: Loaded Stripe publishable key")
            }
            
            // STEP 10: Load billing status
            if let billing = orgData["billing"] as? [String: Any] {
                billingPlan = billing["plan"] as? String ?? "free"
                billingStatus = billing["status"] as? String ?? "active"
                
                if let endTimestamp = billing["currentPeriodEnd"] as? Timestamp {
                    subscriptionEndDate = endTimestamp.dateValue()
                }
                
                // Block if status is past_due, canceled, or unpaid
                isBillingBlocked = ["past_due", "canceled", "unpaid"].contains(billingStatus)
                
                print("AuthManager: Loaded billing - plan: \(billingPlan), status: \(billingStatus), blocked: \(isBillingBlocked)")
            }
            
            // Load user profile data (firstName, lastName)
            if let uid = userId {
                let userDoc = try await db.collection("users").document(uid).getDocument()
                if let userData = userDoc.data() {
                    userFirstName = userData["firstName"] as? String
                    userLastName = userData["lastName"] as? String
                    print("AuthManager: Loaded user name: \(userFirstName ?? "") \(userLastName ?? "")")
                }
            }
        } catch {
            print("AuthManager: ❌ Failed to load org branding: \(error.localizedDescription)")
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
