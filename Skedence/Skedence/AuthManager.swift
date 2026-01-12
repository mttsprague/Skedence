import SwiftUI
import Combine
import FirebaseAuth
import FirebaseFirestore

@MainActor
final class AuthManager: ObservableObject {
    @Published private(set) var isReady = false
    @Published private(set) var authError: String?
    @Published private(set) var currentOrgId: String?
    
    // STEP 8: Dynamic branding from organization
    @Published var primaryColor: Color = Color(red: 0.20, green: 0.70, blue: 0.68) // Default teal
    @Published var logoUrl: String?
    @Published var stripePublishableKey: String?
    @Published var organizationName: String?
    
    // Check if user is authenticated
    var isAuthenticated: Bool {
        return Auth.auth().currentUser != nil
    }

    // Check if user is already signed in and load their orgId
    func ensureSignedIn() async {
        // If user is already authenticated, load their orgId
        if let currentUser = Auth.auth().currentUser {
            print("AuthManager: User already signed in: \(currentUser.uid)")
            await loadOrgId(for: currentUser.uid)
        } else {
            print("AuthManager: No user signed in")
        }
        isReady = true
    }

    func signIn(email: String, password: String) async -> Bool {
        authError = nil // Clear any stale errors before starting
        do {
            let result = try await Auth.auth().signIn(withEmail: email, password: password)
            
            // Force refresh the ID token to ensure we have the latest auth state
            _ = try await result.user.getIDTokenResult(forcingRefresh: true)
            
            // Track login event
            AnalyticsService.shared.logUserLogin(userId: result.user.uid, method: "email")
            AnalyticsService.shared.setUserId(result.user.uid)
            
            // Set Crashlytics user ID
            CrashlyticsService.shared.setUserId(result.user.uid)
            
            // Load orgId and branding from organization
            await loadOrgId(for: result.user.uid)
            
            print("AuthManager: Successfully signed in with UID: \(result.user.uid)")
            authError = nil
            return true
        } catch {
            print("AuthManager: Sign-in error: \(error.localizedDescription)")
            CrashlyticsService.shared.logAuthError(error, method: "email")
            authError = error.localizedDescription
            return false
        }
    }

    func register(email: String,
                  password: String,
                  firstName: String?,
                  lastName: String?,
                  athleteFirstName: String?,
                  athleteLastName: String?,
                  athleteBirthday: String?,
                  athlete2FirstName: String?,
                  athlete2LastName: String?,
                  athlete2Birthday: String?,
                  athlete3FirstName: String?,
                  athlete3LastName: String?,
                  athlete3Birthday: String?,
                  athletePosition: String?,
                  athlete2Position: String?,
                  athlete3Position: String?,
                  notesForCoach: String?,
                  phoneNumber: String?,
                  orgId: String?) async -> Bool {
        authError = nil // Clear any stale errors before starting
        do {
            let result = try await Auth.auth().createUser(withEmail: email, password: password)
            let uid = result.user.uid

            let db = Firestore.firestore()
            let now = Date()
            let data: [String: Any?] = [
                "emailAddress": email,
                "firstName": firstName,
                "lastName": lastName,
                "athleteFirstName": athleteFirstName,
                "athleteLastName": athleteLastName,
                "athleteBirthday": athleteBirthday,
                "athlete2FirstName": athlete2FirstName,
                "athlete2LastName": athlete2LastName,
                "athlete2Birthday": athlete2Birthday,
                "athlete3FirstName": athlete3FirstName,
                "athlete3LastName": athlete3LastName,
                "athlete3Birthday": athlete3Birthday,
                "athletePosition": athletePosition,
                "athlete2Position": athlete2Position,
                "athlete3Position": athlete3Position,
                "notesForCoach": notesForCoach,
                "phoneNumber": phoneNumber,
                "photoURL": nil,
                "orgId": orgId,
                "active": true,
                "createdAt": now,
                "updatedAt": now
            ]

            // Debug: Show payload and auth state at write time
            let payload = data.compactMapValues { $0 }
            let currentUID = Auth.auth().currentUser?.uid ?? "<nil>"
            print("AuthManager.register → Attempting setData for uid=\(uid)")
            print("AuthManager.register → Current Auth UID at write time: \(currentUID) (matches: \(currentUID == uid))")
            print("AuthManager.register → Payload: \(payload)")

            try await db.collection("users").document(uid).setData(payload)
            
            // Create orgMembers entry if orgId provided
            if let orgId = orgId {
                // Use deterministic document ID format: {userId}_{orgId}
                let membershipId = "\(uid)_\(orgId)"
                try await db.collection("orgMembers").document(membershipId).setData([
                    "userId": uid,
                    "orgId": orgId,
                    "role": "client",
                    "isActive": true,
                    "joinedAt": Timestamp(date: now)
                ])
                print("✅ Created orgMember for \(uid) in org \(orgId) with ID: \(membershipId)")
            }
            
            // Track sign up event
            AnalyticsService.shared.logUserSignUp(userId: uid, method: "email")
            AnalyticsService.shared.setUserId(uid)
            
            // Set Crashlytics user ID
            CrashlyticsService.shared.setUserId(uid)
            
            // Load orgId from orgMembers collection
            await loadOrgId(for: uid)
            
            authError = nil
            print("AuthManager.register → setData succeeded for uid=\(uid)")
            return true
        } catch {
            // Print full NSError details so we can see domain/code/userInfo
            let ns = error as NSError
            print("AuthManager.register → ERROR during setData")
            print("  Error: \(error)")
            print("  Domain: \(ns.domain)")
            print("  Code: \(ns.code)")
            print("  UserInfo: \(ns.userInfo)")

            authError = error.localizedDescription
            return false
        }
    }

    func signOut() {
        do {
            try Auth.auth().signOut()
            currentOrgId = nil
            logoUrl = nil
            stripePublishableKey = nil
            // Reset to default branding
            primaryColor = Color(red: 0.20, green: 0.70, blue: 0.68)
            authError = nil // Clear any lingering errors on sign out
            isReady = false
            Task { await ensureSignedIn() } // No anonymous sign-in; just mark ready again
        } catch {
            authError = error.localizedDescription
        }
    }
    
    // MARK: - Organization Management
    
    private func loadOrgId(for userId: String) async {
        do {
            let db = Firestore.firestore()
            
            // First, try to load from orgMembers collection (preferred method)
            let snapshot = try await db.collection("orgMembers")
                .whereField("userId", isEqualTo: userId)
                .whereField("isActive", isEqualTo: true)
                .limit(to: 1)
                .getDocuments()
            
            if let doc = snapshot.documents.first,
               let orgId = doc.data()["orgId"] as? String {
                currentOrgId = orgId
                print("AuthManager: Loaded orgId from orgMembers: \(orgId) for user: \(userId)")
                
                // Load organization branding
                await loadOrgBranding(orgId: orgId)
                return
            }
            
            // Fallback: Try to load from user document
            print("AuthManager: ⚠️ No active orgMember found, checking user document...")
            let userDoc = try await db.collection("users").document(userId).getDocument()
            
            if let data = userDoc.data(),
               let orgId = data["orgId"] as? String {
                currentOrgId = orgId
                print("AuthManager: Loaded orgId from user document: \(orgId) for user: \(userId)")
                
                // Load organization branding
                await loadOrgBranding(orgId: orgId)
            } else {
                print("AuthManager: ⚠️ No orgId found in user document either")
                currentOrgId = nil
            }
        } catch {
            print("AuthManager: ❌ Failed to load orgId: \(error.localizedDescription)")
            currentOrgId = nil
        }
    }
    
    // STEP 8: Load dynamic branding from organization
    private func loadOrgBranding(orgId: String) async {
        do {
            let db = Firestore.firestore()
            let orgDoc = try await db.collection("organizations").document(orgId).getDocument()
            
            guard let orgData = orgDoc.data() else {
                print("AuthManager: ⚠️ Organization document not found for: \(orgId)")
                return
            }
            
            // Load organization name
            if let name = orgData["name"] as? String {
                organizationName = name
                print("AuthManager: Loaded organizationName: \(name)")
            }
            
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
        } catch {
            print("AuthManager: ❌ Failed to load org branding: \(error.localizedDescription)")
        }
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
