//
//  CreateBusinessView.swift
//  SkedenceAdmin
//
//  STEP 9: Business Onboarding Flow
//  First screen - Create new organization account
//

import SwiftUI
import FirebaseAuth
import FirebaseFirestore

struct CreateBusinessView: View {
    @EnvironmentObject private var dependencies: AdminAppDependencies
    @Environment(\.dismiss) var dismiss
    
    // Convenience accessor
    private var auth: AuthManager { dependencies.auth }
    
    @State private var businessName: String = ""
    @State private var ownerEmail: String = ""
    @State private var ownerPassword: String = ""
    @State private var ownerFirstName: String = ""
    @State private var ownerLastName: String = ""
    @State private var timezone: String = "America/New_York"
    @State private var currency: String = "USD"
    
    @State private var isCreating: Bool = false
    @State private var errorMessage: String?
    @State private var showingStripeOnboarding: Bool = false
    @State private var createdOrgId: String?
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Spacing.lg) {
                    // Header
                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        Text("Create Your Business Account")
                            .font(.displaySmall)
                            .foregroundStyle(AppTheme.textPrimary)
                        
                        Text("Start accepting bookings and managing your training business")
                            .font(.bodyLarge)
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                    .padding(.bottom, Spacing.md)
                    
                    // Business Information
                    SectionHeader(title: "Business Information", icon: "building.2")
                    
                    FormFieldView(
                        icon: "building.2",
                        placeholder: "Business Name",
                        text: $businessName
                    )
                    
                    // Owner Account
                    SectionHeader(title: "Owner Account", icon: "person.circle")
                    
                    FormFieldView(
                        icon: "person",
                        placeholder: "First Name",
                        text: $ownerFirstName
                    )
                    
                    FormFieldView(
                        icon: "person",
                        placeholder: "Last Name",
                        text: $ownerLastName
                    )
                    
                    FormFieldView(
                        icon: "envelope",
                        placeholder: "Email Address",
                        text: $ownerEmail,
                        keyboardType: .emailAddress
                    )
                    .textInputAutocapitalization(.never)
                    
                    FormFieldView(
                        icon: "lock",
                        placeholder: "Password (min 6 characters)",
                        text: $ownerPassword,
                        isSecure: true
                    )
                    
                    // Settings
                    SectionHeader(title: "Settings", icon: "gearshape")
                    
                    Picker("Timezone", selection: $timezone) {
                        Text("Eastern (ET)").tag("America/New_York")
                        Text("Central (CT)").tag("America/Chicago")
                        Text("Mountain (MT)").tag("America/Denver")
                        Text("Pacific (PT)").tag("America/Los_Angeles")
                    }
                    .pickerStyle(.menu)
                    .padding()
                    .background(AppTheme.surfaceSecondary)
                    .cornerRadius(CornerRadius.md)
                    
                    Picker("Currency", selection: $currency) {
                        Text("USD ($)").tag("USD")
                        Text("CAD ($)").tag("CAD")
                        Text("EUR (€)").tag("EUR")
                        Text("GBP (£)").tag("GBP")
                    }
                    .pickerStyle(.menu)
                    .padding()
                    .background(AppTheme.surfaceSecondary)
                    .cornerRadius(CornerRadius.md)
                    
                    // Error Message
                    if let error = errorMessage {
                        Text(error)
                            .font(.bodyMedium)
                            .foregroundStyle(.red)
                            .padding()
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.red.opacity(0.1))
                            .cornerRadius(CornerRadius.md)
                    }
                    
                    // Create Button
                    Button(action: createBusinessAccount) {
                        HStack {
                            if isCreating {
                                ProgressView()
                                    .tint(.white)
                            }
                            Text(isCreating ? "Creating Account..." : "Create Business Account")
                                .font(.headingSmall)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, Spacing.md)
                        .background(canSubmit ? AppTheme.primary : Color.gray)
                        .foregroundStyle(.white)
                        .cornerRadius(CornerRadius.md)
                    }
                    .disabled(!canSubmit || isCreating)
                    .heavyShadow()
                    
                    // Terms
                    Text("By creating an account, you agree to our Terms of Service and Privacy Policy")
                        .font(.labelSmall)
                        .foregroundStyle(AppTheme.textTertiary)
                        .multilineTextAlignment(.center)
                        .frame(maxWidth: .infinity)
                }
                .padding(Spacing.lg)
            }
            .navigationTitle("New Business")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
            .sheet(isPresented: $showingStripeOnboarding) {
                if let orgId = createdOrgId {
                    StripeOnboardingView(orgId: orgId)
                        .environmentObject(dependencies)
                }
            }
        }
    }
    
    var canSubmit: Bool {
        !businessName.isEmpty &&
        !ownerEmail.isEmpty &&
        ownerPassword.count >= 6 &&
        !ownerFirstName.isEmpty &&
        !ownerLastName.isEmpty
    }
    
    func createBusinessAccount() {
        guard canSubmit else { return }
        
        isCreating = true
        errorMessage = nil
        
        Task {
            do {
                // 0. Create Firebase Auth account first (required to query Firestore)
                let authResult = try await Auth.auth().createUser(
                    withEmail: ownerEmail,
                    password: ownerPassword
                )
                let userId = authResult.user.uid
                
                // 1. Check if user was pre-created by an admin (trainer invitation flow)
                let db = Firestore.firestore()
                let existingUserQuery = db.collection("users")
                    .whereField("email", isEqualTo: ownerEmail.lowercased())
                    .limit(to: 1)
                
                let existingUsers = try await existingUserQuery.getDocuments()
                
                if let existingUserDoc = existingUsers.documents.first {
                    // Trainer invitation flow: Link existing user to new auth account
                    let existingUserData = existingUserDoc.data()
                    let existingUserId = existingUserDoc.documentID
                    
                    // Verify this is a pending trainer account
                    if existingUserData["needsPasswordSetup"] as? Bool == true {
                        // Update existing user document with auth ID and clear needsPasswordSetup
                        try await db.collection("users").document(existingUserId).updateData([
                            "authId": userId,
                            "needsPasswordSetup": false,
                            "firstName": ownerFirstName,
                            "lastName": ownerLastName,
                            "registeredAt": Timestamp(date: Date())
                        ])
                        
                        // Update trainer document if it exists
                        if let trainerId = existingUserData["trainerId"] as? String {
                            try await db.collection("trainers").document(trainerId).updateData([
                                "firstName": ownerFirstName,
                                "lastName": ownerLastName
                            ])
                        }
                        
                        // Update orgMembers to use new auth ID
                        if let orgId = existingUserData["orgId"] as? String {
                            let oldMembershipId = "\(existingUserId)_\(orgId)"
                            let newMembershipId = "\(userId)_\(orgId)"
                            
                            // Get existing membership data
                            let oldMemberDoc = try await db.collection("orgMembers").document(oldMembershipId).getDocument()
                            if let memberData = oldMemberDoc.data() {
                                var updatedMemberData = memberData
                                updatedMemberData["userId"] = userId
                                
                                // Create new membership with auth ID
                                try await db.collection("orgMembers").document(newMembershipId).setData(updatedMemberData)
                                
                                // Delete old membership
                                try await db.collection("orgMembers").document(oldMembershipId).delete()
                            }
                            
                            // Load org data and complete sign-in
                            await auth.loadOrgId(for: userId)
                            isCreating = false
                            dismiss()
                            return
                        }
                    }
                    // If email exists but not a pending invitation, continue with normal flow
                }
                
                // Standard flow: Create new business owner account
                
                // 2. Generate name-based organization ID (e.g., skedence_gym)
                let orgId = try await IDGenerator.generateOrganizationId(name: businessName)
                
                // 3. Create organization document with name-based ID
                let orgRef = db.collection("organizations").document(orgId)
                
                let trialEndsAt = Date().addingTimeInterval(14 * 24 * 60 * 60) // 14 days
                
                let orgData: [String: Any] = [
                    "name": businessName,
                    "ownerUserId": userId,
                    "createdAt": Timestamp(date: Date()),
                    "status": "active",
                    "branding": [
                        "primaryColor": "#33B2AE", // Default teal
                        "logoUrl": ""
                    ],
                    "stripe": [
                        "connectAccountId": NSNull(),
                        "publishableKey": NSNull(),
                        "onboardingComplete": false,
                        "chargesEnabled": false,
                        "payoutsEnabled": false,
                        "onboardingUrl": NSNull()
                    ],
                    "billing": [
                        "plan": "free",
                        "status": "trialing",
                        "isActive": true,
                        "isInGrace": false,
                        "trialEndsAt": Timestamp(date: trialEndsAt)
                    ],
                    "settings": [
                        "timezone": timezone,
                        "currency": currency
                    ]
                ]
                
                try await orgRef.setData(orgData)
                
                // 4. Generate name-based user ID (e.g., john_doe)
                let nameBasedUserId = try await IDGenerator.generateUserId(
                    firstName: ownerFirstName,
                    lastName: ownerLastName
                )
                
                // 5. Generate name-based trainer ID (e.g., john_doe)
                let trainerId = try await IDGenerator.generateTrainerId(
                    firstName: ownerFirstName,
                    lastName: ownerLastName
                )
                
                // 6. Create user document with name-based ID
                let userData: [String: Any] = [
                    "authUserId": userId,  // Firebase Auth UID
                    "email": ownerEmail.lowercased(),
                    "emailAddress": ownerEmail.lowercased(),
                    "firstName": ownerFirstName,
                    "lastName": ownerLastName,
                    "orgId": orgId,
                    "role": "admin",  // Admin role (primary)
                    "needsPasswordSetup": false,
                    "active": true,
                    "createdAt": Timestamp(date: Date()),
                    "registeredAt": Timestamp(date: Date())
                ]
                
                try await db.collection("users")
                    .document(nameBasedUserId)  // Use name-based ID
                    .setData(userData)
                
                // 7. Create trainer profile with name-based ID
                let trainerData: [String: Any] = [
                    "orgId": orgId,
                    "authUserId": userId,  // Link to Firebase Auth UID
                    "firstName": ownerFirstName,
                    "lastName": ownerLastName,
                    "email": ownerEmail.lowercased(),
                    "active": true,
                    "isAdmin": true,  // Admin takes precedence
                    "createdAt": Timestamp(date: Date())
                ]
                
                try await db.collection("trainers")
                    .document(trainerId)  // Use name-based trainer ID
                    .setData(trainerData)
                
                // 8. Create DUAL orgMember documents (match web pattern)
                let memberData: [String: Any] = [
                    "orgId": orgId,
                    "userId": trainerId,         // Name-based trainer ID
                    "authUserId": userId,        // Firebase Auth UID
                    "role": "admin",             // Admin role (primary)
                    "isActive": true,
                    "createdAt": Timestamp(date: Date())
                ]
                
                // Pattern 1: {trainerId}_{orgId} (name-based)
                try await db.collection("orgMembers")
                    .document("\(trainerId)_\(orgId)")
                    .setData(memberData)
                
                // Pattern 2: {authUserId}_{orgId} (auth-based, for useAuth queries)
                try await db.collection("orgMembers")
                    .document("\(userId)_\(orgId)")
                    .setData(memberData)
                
                print("✅ CreateBusinessView: Created organization with name-based IDs")
                print("   - Organization ID: \(orgId)")
                print("   - Trainer ID: \(trainerId)")
                print("   - User ID: \(nameBasedUserId)")
                print("   - orgMembers: \(trainerId)_\(orgId) and \(userId)_\(orgId)")
                print("   - Role: admin (also trainer with isAdmin=true)")
                
                // 9. Load org data into AuthManager
                await auth.loadOrgId(for: userId)
                
                // 10. Show Stripe onboarding
                createdOrgId = orgId
                showingStripeOnboarding = true
                isCreating = false
                
            } catch {
                errorMessage = "Failed to create account: \(error.localizedDescription)"
                isCreating = false
            }
        }
    }
}

// MARK: - Supporting Views

private struct SectionHeader: View {
    let title: String
    let icon: String
    
    var body: some View {
        HStack(spacing: Spacing.sm) {
            Image(systemName: icon)
                .foregroundStyle(AppTheme.primary)
            Text(title)
                .font(.headingSmall)
                .foregroundStyle(AppTheme.textPrimary)
        }
        .padding(.top, Spacing.sm)
    }
}

private struct FormFieldView: View {
    let icon: String
    let placeholder: String
    @Binding var text: String
    var keyboardType: UIKeyboardType = .default
    var isSecure: Bool = false
    
    var body: some View {
        HStack(spacing: Spacing.sm) {
            Image(systemName: icon)
                .foregroundStyle(AppTheme.textSecondary)
                .frame(width: 24)
            
            if isSecure {
                SecureField(placeholder, text: $text)
                    .font(.bodyMedium)
            } else {
                TextField(placeholder, text: $text)
                    .font(.bodyMedium)
                    .keyboardType(keyboardType)
            }
        }
        .padding()
        .background(AppTheme.surfaceSecondary)
        .cornerRadius(CornerRadius.md)
    }
}

#Preview {
    CreateBusinessView()
        .environmentObject(AuthManager())
}
