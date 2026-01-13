//
//  OnboardingAccountView.swift
//  SkedenceAdmin
//
//  Step 1: Create account - Keep the original green page design
//

import SwiftUI
import FirebaseAuth
import FirebaseFirestore

struct OnboardingAccountView: View {
    @EnvironmentObject var auth: AuthManager
    @EnvironmentObject var coordinator: OnboardingCoordinator
    
    @State private var businessName: String = ""
    @State private var ownerEmail: String = ""
    @State private var ownerPassword: String = ""
    @State private var ownerFirstName: String = ""
    @State private var ownerLastName: String = ""
    @State private var timezone: String = "America/New_York"
    @State private var currency: String = "USD"
    
    @State private var isCreating: Bool = false
    @State private var errorMessage: String?
    
    var body: some View {
        // Always show the account creation form when at this step
        // OnboardingFlowView handles skipping this step if user is already authenticated
        accountCreationView
    }
    
    var accountCreationView: some View {
        ZStack {
            // Background gradient (the green look they like)
            LinearGradient(
                colors: [AppTheme.primary, AppTheme.primaryDark],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            
            ScrollView {
                VStack(alignment: .leading, spacing: Spacing.lg) {
                    // Header
                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        Image(systemName: "calendar.badge.checkmark")
                            .font(.system(size: 64))
                            .foregroundStyle(.white)
                            .shadow(radius: 10)
                            .frame(maxWidth: .infinity, alignment: .center)
                            .padding(.bottom, Spacing.md)
                        
                        Text("Welcome to Skedence")
                            .font(.displayMedium)
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity, alignment: .center)
                        
                        Text("Let's get your training business set up")
                            .font(.bodyLarge)
                            .foregroundStyle(.white.opacity(0.9))
                            .frame(maxWidth: .infinity, alignment: .center)
                            .multilineTextAlignment(.center)
                    }
                    .padding(.bottom, Spacing.lg)
                    
                    // Form Card
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        // Business Name
                        FormFieldLight(
                            icon: "building.2",
                            placeholder: "Business Name",
                            text: $businessName
                        )
                        
                        // Owner Info
                        FormFieldLight(
                            icon: "person",
                            placeholder: "First Name",
                            text: $ownerFirstName
                        )
                        
                        FormFieldLight(
                            icon: "person",
                            placeholder: "Last Name",
                            text: $ownerLastName
                        )
                        
                        FormFieldLight(
                            icon: "envelope",
                            placeholder: "Email Address",
                            text: $ownerEmail,
                            keyboardType: .emailAddress
                        )
                        .textInputAutocapitalization(.never)
                        
                        FormFieldLight(
                            icon: "lock",
                            placeholder: "Password (min 6 characters)",
                            text: $ownerPassword,
                            isSecure: true
                        )
                        
                        // Settings
                        VStack(spacing: Spacing.sm) {
                            Picker("Timezone", selection: $timezone) {
                                Text("Eastern (ET)").tag("America/New_York")
                                Text("Central (CT)").tag("America/Chicago")
                                Text("Mountain (MT)").tag("America/Denver")
                                Text("Pacific (PT)").tag("America/Los_Angeles")
                            }
                            .pickerStyle(.menu)
                            .padding()
                            .background(.white)
                            .cornerRadius(CornerRadius.md)
                            
                            Picker("Currency", selection: $currency) {
                                Text("USD ($)").tag("USD")
                                Text("CAD ($)").tag("CAD")
                                Text("EUR (€)").tag("EUR")
                                Text("GBP (£)").tag("GBP")
                            }
                            .pickerStyle(.menu)
                            .padding()
                            .background(.white)
                            .cornerRadius(CornerRadius.md)
                        }
                    }
                    .padding(Spacing.lg)
                    .background(.white)
                    .cornerRadius(CornerRadius.lg)
                    .shadow(radius: 20)
                    
                    // Error Message
                    if let error = errorMessage {
                        Text(error)
                            .font(.bodyMedium)
                            .foregroundStyle(.red)
                            .padding()
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.red.opacity(0.2))
                            .cornerRadius(CornerRadius.md)
                    }
                    
                    // Create Button
                    Button(action: createAccount) {
                        HStack {
                            if isCreating {
                                ProgressView()
                                    .tint(.white)
                            }
                            Text(isCreating ? "Creating..." : "Create Account")
                                .font(.headingSmall)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, Spacing.md)
                        .background(.white)
                        .foregroundStyle(AppTheme.primary)
                        .cornerRadius(CornerRadius.md)
                    }
                    .disabled(!canSubmit || isCreating)
                    .opacity(canSubmit ? 1.0 : 0.6)
                    .heavyShadow()
                    
                    // Terms
                    Text("By creating an account, you agree to our Terms of Service and Privacy Policy")
                        .font(.labelSmall)
                        .foregroundStyle(.white.opacity(0.8))
                        .multilineTextAlignment(.center)
                        .frame(maxWidth: .infinity)
                }
                .padding(Spacing.lg)
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
    
    func createAccount() {
        guard canSubmit else { return }
        
        isCreating = true
        errorMessage = nil
        
        Task {
            do {
                // Create Firebase Auth account
                let authResult = try await Auth.auth().createUser(
                    withEmail: ownerEmail,
                    password: ownerPassword
                )
                let userId = authResult.user.uid
                
                let db = Firestore.firestore()
                
                // Create organization
                let orgRef = db.collection("organizations").document()
                let orgId = orgRef.documentID
                
                let orgData: [String: Any] = [
                    "name": businessName,
                    "ownerUserId": userId,
                    "createdAt": Timestamp(date: Date()),
                    "status": "active",
                    "branding": [
                        "primaryColor": "#33B2AE",
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
                        "trialEndsAt": Timestamp(date: Date().addingTimeInterval(14 * 24 * 60 * 60))
                    ],
                    "settings": [
                        "timezone": timezone,
                        "currency": currency
                    ]
                ]
                
                try await orgRef.setData(orgData)
                
                // Create user document
                let userData: [String: Any] = [
                    "email": ownerEmail.lowercased(),
                    "emailAddress": ownerEmail.lowercased(),
                    "firstName": ownerFirstName,
                    "lastName": ownerLastName,
                    "orgId": orgId,
                    "needsPasswordSetup": false,
                    "authId": userId,
                    "createdAt": Timestamp(date: Date()),
                    "registeredAt": Timestamp(date: Date())
                ]
                
                try await db.collection("users").document(userId).setData(userData)
                
                // Create orgMember
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
                
                // Create trainer profile
                let trainerData: [String: Any] = [
                    "orgId": orgId,
                    "firstName": ownerFirstName,
                    "lastName": ownerLastName,
                    "email": ownerEmail,
                    "active": true,
                    "isAdmin": true,
                    "createdAt": Timestamp(date: Date())
                ]
                
                try await db.collection("trainers").document(userId).setData(trainerData)
                
                // Store userId and orgId in coordinator (don't load into AuthManager yet)
                coordinator.userId = userId
                coordinator.orgId = orgId
                coordinator.organizationData["name"] = businessName
                coordinator.organizationData["timezone"] = timezone
                coordinator.organizationData["currency"] = currency
                
                print("✅ OnboardingAccountView: Created org with ID: \(orgId)")
                print("✅ Coordinator now has orgId: \(coordinator.orgId ?? "nil")")
                print("   Current step before moveToNextStep: \(coordinator.currentStep)")
                
                // Move to next step WITHOUT triggering auth reload
                coordinator.moveToNextStep()
                
                print("   Current step after moveToNextStep: \(coordinator.currentStep)")
                
                isCreating = false
                
            } catch {
                errorMessage = "Failed to create account: \(error.localizedDescription)"
                isCreating = false
            }
        }
    }
}

// MARK: - Light Form Field (for dark backgrounds)

private struct FormFieldLight: View {
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
        .background(.white)
        .cornerRadius(CornerRadius.md)
    }
}

#Preview {
    OnboardingAccountView()
        .environmentObject(AuthManager())
        .environmentObject(OnboardingCoordinator())
}
