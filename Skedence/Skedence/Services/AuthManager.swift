import SwiftUI
import Combine
import FirebaseAuth
import FirebaseFirestore

@MainActor
final class AuthManager: ObservableObject {
    @Published private(set) var isReady = false
    @Published private(set) var authError: String?
    @Published private(set) var currentOrgId: String?
    @Published private(set) var currentUserId: String? // Firebase Auth UID
    @Published private(set) var currentUserDocId: String? // Firestore document ID (firstName_lastName)
    @Published private(set) var isAuthenticated: Bool = false // Reactive auth state
    
    // STEP 8: Dynamic branding from organization
    @Published var primaryColor: Color = Color(red: 0.20, green: 0.70, blue: 0.68) // Default teal
    @Published var logoUrl: String?
    @Published var stripePublishableKey: String?
    @Published var organizationName: String?
    
    private var authStateHandle: AuthStateDidChangeListenerHandle?
    
    init() {
        // Set initial state based on current user
        isAuthenticated = Auth.auth().currentUser != nil
        print("AuthManager: Initialized, isAuthenticated = \(isAuthenticated)")
        
        // Set up auth state listener to properly handle session persistence
        // This listener fires when Firebase finishes loading the persisted session from Keychain
        authStateHandle = Auth.auth().addStateDidChangeListener { [weak self] _, user in
            guard let self = self else { return }
            
            Task { @MainActor in
                // Only update if the auth state actually changed
                let newAuthState = user != nil
                if self.isAuthenticated != newAuthState {
                    self.isAuthenticated = newAuthState
                    self.currentUserId = user?.uid
                    
                    if let uid = user?.uid, newAuthState {
                        print("AuthManager: Auth state changed - User signed in: \(uid)")
                        await self.loadUserData(for: uid)
                    } else {
                        print("AuthManager: Auth state changed - User signed out")
                        self.currentOrgId = nil
                        self.currentUserDocId = nil
                    }
                }
            }
        }
    }
    
    deinit {
        if let handle = authStateHandle {
            Auth.auth().removeStateDidChangeListener(handle)
        }
    }

    // Check if user is already signed in and load their orgId
    func ensureSignedIn() async {
        // Give Firebase Auth time to load persisted session from Keychain
        // This can take 300-500ms on first launch
        try? await Task.sleep(nanoseconds: 500_000_000) // 500ms
        
        // If user is already authenticated, load their data
        if let currentUser = Auth.auth().currentUser {
            currentUserId = currentUser.uid
            isAuthenticated = true
            print("AuthManager: ensureSignedIn() - User exists, set isAuthenticated = true")
            
            // Force refresh the ID token to ensure Firestore recognizes auth state
            // This prevents "insufficient permissions" errors from race conditions
            do {
                _ = try await currentUser.getIDTokenResult(forcingRefresh: true)
                print("AuthManager: Refreshed auth token for Firestore sync")
            } catch {
                print("AuthManager: ⚠️ Failed to refresh token: \(error.localizedDescription)")
            }
            
            await loadUserData(for: currentUser.uid)
            print("AuthManager: ensureSignedIn() COMPLETE - isAuthenticated = \(isAuthenticated)")
        } else {
            isAuthenticated = false
            print("AuthManager: ensureSignedIn() - No user, set isAuthenticated = false")
        }
        // Only mark ready AFTER user data is loaded AND token is refreshed
        isReady = true
    }

    func signIn(email: String, password: String) async -> Bool {
        authError = nil // Clear any stale errors before starting
        do {
            let result = try await Auth.auth().signIn(withEmail: email, password: password)
            
            // Force refresh the ID token to ensure we have the latest auth state
            _ = try await result.user.getIDTokenResult(forcingRefresh: true)
            
            // Set current user ID immediately
            currentUserId = result.user.uid
            isAuthenticated = true
            print("AuthManager: signIn() - Set isAuthenticated = true")
            
            // Track login event
            AnalyticsService.shared.logUserLogin(userId: result.user.uid, method: "email")
            AnalyticsService.shared.setUserId(result.user.uid)
            
            // Set Crashlytics user ID
            CrashlyticsService.shared.setUserId(result.user.uid)
            
            // Load orgId and user document ID from Firestore
            await loadUserData(for: result.user.uid)
            
            print("AuthManager: Successfully signed in with UID: \(result.user.uid), isAuthenticated = \(isAuthenticated)")
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
            let authUid = result.user.uid // Firebase Auth UID

            let db = Firestore.firestore()
            let now = Date()
            
            // Build safe, non-empty names for reference code generation
            let emailPrefix = email.split(separator: "@").first.map(String.init) ?? "USER"
            let safeFirstName = (firstName?.trimmingCharacters(in: .whitespacesAndNewlines)).flatMap { $0.isEmpty ? nil : $0 } ?? emailPrefix
            let safeLastName = (lastName?.trimmingCharacters(in: .whitespacesAndNewlines)).flatMap { $0.isEmpty ? nil : $0 } ?? "CLIENT"
            
            // Generate unique user document ID from name
            let userId = try await IDGenerator.generateUserId(firstName: safeFirstName, lastName: safeLastName)
            
            // Generate reference code
            let referenceCode = try await ReferenceCodeGenerator.generateUserCode(
                firstName: safeFirstName,
                lastName: safeLastName
            )
            
            let data: [String: Any?] = [
                "authUserId": authUid, // Map to Firebase Auth UID
                "emailAddress": email,
                "referenceCode": referenceCode,
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
            
            // Build athletes array from provided data
            var athletesArray: [[String: Any]] = []
            
            // Add first athlete if provided
            if let athleteFirst = athleteFirstName, let athleteLast = athleteLastName,
               !athleteFirst.isEmpty || !athleteLast.isEmpty {
                var athlete1: [String: Any] = [:]
                if !athleteFirst.isEmpty { athlete1["firstName"] = athleteFirst }
                if !athleteLast.isEmpty { athlete1["lastName"] = athleteLast }
                if let birthday = athleteBirthday, !birthday.isEmpty { athlete1["birthday"] = birthday }
                if let position = athletePosition, !position.isEmpty { athlete1["position"] = position }
                athletesArray.append(athlete1)
            }
            
            // Add second athlete if provided
            if let athlete2First = athlete2FirstName, let athlete2Last = athlete2LastName,
               !athlete2First.isEmpty || !athlete2Last.isEmpty {
                var athlete2: [String: Any] = [:]
                if !athlete2First.isEmpty { athlete2["firstName"] = athlete2First }
                if !athlete2Last.isEmpty { athlete2["lastName"] = athlete2Last }
                if let birthday = athlete2Birthday, !birthday.isEmpty { athlete2["birthday"] = birthday }
                if let position = athlete2Position, !position.isEmpty { athlete2["position"] = position }
                athletesArray.append(athlete2)
            }
            
            // Add third athlete if provided
            if let athlete3First = athlete3FirstName, let athlete3Last = athlete3LastName,
               !athlete3First.isEmpty || !athlete3Last.isEmpty {
                var athlete3: [String: Any] = [:]
                if !athlete3First.isEmpty { athlete3["firstName"] = athlete3First }
                if !athlete3Last.isEmpty { athlete3["lastName"] = athlete3Last }
                if let birthday = athlete3Birthday, !birthday.isEmpty { athlete3["birthday"] = birthday }
                if let position = athlete3Position, !position.isEmpty { athlete3["position"] = position }
                athletesArray.append(athlete3)
            }
            
            // Merge athletes array into payload
            var finalPayload = payload
            if !athletesArray.isEmpty {
                finalPayload["athletes"] = athletesArray
            }

            // Create user document with name-based ID
            try await db.collection("users").document(userId).setData(finalPayload)
            
            // Create orgMembers entry if orgId provided
            if let orgId = orgId {
                let memberData: [String: Any] = [
                    "userId": userId, // Name-based user ID (firstName_lastName)
                    "authUserId": authUid, // Firebase Auth UID
                    "orgId": orgId,
                    "role": "client",
                    "isActive": true,
                    "createdAt": Timestamp(date: now)
                ]
                
                // Create SINGLE orgMember document with pattern: {userId}_{orgId}
                let memberDocId = "\(userId)_\(orgId)"
                try await db.collection("orgMembers").document(memberDocId).setData(memberData)
            }
            
            // Track sign up event
            AnalyticsService.shared.logUserSignUp(userId: authUid, method: "email")
            AnalyticsService.shared.setUserId(authUid)
            
            // Set Crashlytics user ID
            CrashlyticsService.shared.setUserId(authUid)
            
            // Set current user ID immediately
            currentUserId = authUid
            currentUserDocId = userId
            isAuthenticated = true
            
            // Load orgId and branding from orgMembers collection
            await loadUserData(for: authUid)
            
            // Activity logging handled by cloud functions
            
            authError = nil
            return true
        } catch {
            authError = error.localizedDescription
            return false
        }
    }

    func signOut() {
        do {
            try Auth.auth().signOut()
            isAuthenticated = false
            print("AuthManager: signOut() - Set isAuthenticated = false")
            currentOrgId = nil
            currentUserId = nil
            currentUserDocId = nil
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
    
    private func loadUserData(for authUserId: String) async {
        do {
            let db = Firestore.firestore()
            
            // First, try to load from orgMembers collection (preferred method)
            // Query by authUserId since document IDs are now name-based
            let snapshot = try await db.collection("orgMembers")
                .whereField("authUserId", isEqualTo: authUserId)
                .whereField("isActive", isEqualTo: true)
                .limit(to: 1)
                .getDocuments()
            
            if let doc = snapshot.documents.first {
                let data = doc.data()
                if let orgId = data["orgId"] as? String {
                    currentOrgId = orgId
                }
                if let userId = data["userId"] as? String {
                    currentUserDocId = userId
                    print("AuthManager: Loaded user doc ID: \(userId)")
                }
                
                // Load organization branding
                if let orgId = currentOrgId {
                    await loadOrgBranding(orgId: orgId)
                }
                return
            }
            
            // Fallback: Try to load from user document by querying authUserId field
            let userSnapshot = try await db.collection("users")
                .whereField("authUserId", isEqualTo: authUserId)
                .limit(to: 1)
                .getDocuments()
            
            if let userDoc = userSnapshot.documents.first {
                let data = userDoc.data()
                currentUserDocId = userDoc.documentID
                print("AuthManager: Loaded user doc ID from users collection: \(userDoc.documentID)")
                
                if let orgId = data["orgId"] as? String {
                    currentOrgId = orgId
                    
                    // Load organization branding
                    await loadOrgBranding(orgId: orgId)
                } else {
                    currentOrgId = nil
                }
            } else {
                currentOrgId = nil
                currentUserDocId = nil
            }
        } catch {
            print("AuthManager: ❌ Failed to load user data: \(error.localizedDescription)")
            currentOrgId = nil
            currentUserDocId = nil
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
            }
            
            // Load branding
            if let branding = orgData["branding"] as? [String: Any] {
                if let colorHex = branding["primaryColor"] as? String {
                    // Convert hex string to Color (e.g., "#33B2AE")
                    primaryColor = Color(hex: colorHex) ?? Color(red: 0.20, green: 0.70, blue: 0.68)
                }
                if let logo = branding["logoUrl"] as? String, !logo.isEmpty {
                    logoUrl = logo
                }
            }
            
            // Load Stripe publishable key from Stripe Connect configuration
            // Keys are stored in the organizations document under stripe.publishableKey
            if let stripe = orgData["stripe"] as? [String: Any],
               let pubKey = stripe["publishableKey"] as? String, !pubKey.isEmpty {
                stripePublishableKey = pubKey
                print("AuthManager: Loaded Stripe publishable key from Connect")
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
