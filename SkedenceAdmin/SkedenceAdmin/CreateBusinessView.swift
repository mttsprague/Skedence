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
    @EnvironmentObject var auth: AuthManager
    @Environment(\.dismiss) var dismiss
    
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
                        .environmentObject(auth)
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
                // 1. Create Firebase Auth account
                let authResult = try await Auth.auth().createUser(
                    withEmail: ownerEmail,
                    password: ownerPassword
                )
                let userId = authResult.user.uid
                
                // 2. Create organization document
                let db = Firestore.firestore()
                let orgRef = db.collection("organizations").document()
                
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
                        "status": "active",
                        "subscriptionId": NSNull(),
                        "customerId": NSNull(),
                        "currentPeriodEnd": NSNull(),
                        "cancelAtPeriodEnd": false,
                        "lastPaymentDate": NSNull()
                    ],
                    "settings": [
                        "timezone": timezone,
                        "currency": currency
                    ]
                ]
                
                try await orgRef.setData(orgData)
                let orgId = orgRef.documentID
                
                // 3. Create orgMember (owner)
                let memberData: [String: Any] = [
                    "orgId": orgId,
                    "userId": userId,
                    "role": "owner",
                    "isActive": true,
                    "createdAt": Timestamp(date: Date())
                ]
                
                try await db.collection("orgMembers")
                    .document("\(userId)_\(orgId)")
                    .setData(memberData)
                
                // 4. Create trainer profile
                let trainerData: [String: Any] = [
                    "orgId": orgId,
                    "name": "\(ownerFirstName) \(ownerLastName)",
                    "email": ownerEmail,
                    "active": true,
                    "isAdmin": true,
                    "createdAt": Timestamp(date: Date())
                ]
                
                try await db.collection("trainers")
                    .document(userId)
                    .setData(trainerData)
                
                // 5. Load org data into AuthManager
                await auth.loadOrgId(for: userId)
                
                // 6. Show Stripe onboarding
                createdOrgId = orgId
                showingStripeOnboarding = true
                
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
