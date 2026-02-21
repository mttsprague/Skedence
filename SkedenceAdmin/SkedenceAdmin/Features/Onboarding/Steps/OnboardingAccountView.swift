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
    @EnvironmentObject private var dependencies: AdminAppDependencies
    
    // Convenience accessor
    private var auth: AuthManager { dependencies.auth }
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
                    OnboardingHeaderLight(
                        icon: "calendar.badge.checkmark",
                        title: "Welcome to Skedence",
                        subtitle: "Let's get your training business set up"
                    )
                    .padding(.bottom, Spacing.lg)
                    
                    // Form Card
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        // Business Name
                        OnboardingFormFieldLight(
                            icon: "building.2",
                            placeholder: "Business Name",
                            text: $businessName
                        )
                        
                        // Owner Info
                        OnboardingFormFieldLight(
                            icon: "person",
                            placeholder: "First Name",
                            text: $ownerFirstName
                        )
                        
                        OnboardingFormFieldLight(
                            icon: "person",
                            placeholder: "Last Name",
                            text: $ownerLastName
                        )
                        
                        OnboardingFormFieldLight(
                            icon: "envelope",
                            placeholder: "Email Address",
                            text: $ownerEmail,
                            keyboardType: .emailAddress
                        )
                        .textInputAutocapitalization(.never)
                        
                        OnboardingFormFieldLight(
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
                
                // CRITICAL: Set userId in coordinator IMMEDIATELY after auth
                // This prevents checkExistingAccount from running again and changing the step
                coordinator.userId = userId
                
                let db = Firestore.firestore()
                
                // Generate unique organization ID from business name
                let orgId = try await IDGenerator.generateOrganizationId(name: businessName)
                let orgRef = db.collection("organizations").document(orgId)
                
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
                
                // NOTE: Trainers are NOT added to users collection
                // Users collection is for clients only
                // Trainers go in trainers collection and orgMembers
                
                // Generate unique trainer ID from owner name
                let trainerId = try await IDGenerator.generateTrainerId(firstName: ownerFirstName, lastName: ownerLastName)
                
                // Create orgMember (using trainerId, not Firebase Auth UID)
                let memberData: [String: Any] = [
                    "orgId": orgId,
                    "userId": trainerId, // Using trainer ID, not Auth UID
                    "authUserId": userId, // Map to Firebase Auth UID
                    "role": "owner",
                    "isActive": true,
                    "createdAt": Timestamp(date: Date())
                ]
                
                // CRITICAL: Write to auth-based pattern only
                
                // Auth UID based ID: {userId}_{orgId} - ONLY correct pattern
                try await db.collection("orgMembers")
                    .document("\(userId)_\(orgId)")
                    .setData(memberData)
                
                // Create trainer profile
                let trainerData: [String: Any] = [
                    "orgId": orgId,
                    "authUserId": userId, // Map to Firebase Auth UID
                    "firstName": ownerFirstName,
                    "lastName": ownerLastName,
                    "email": ownerEmail,
                    "active": true,
                    "isAdmin": true,
                    "createdAt": Timestamp(date: Date())
                ]
                
                try await db.collection("trainers").document(trainerId).setData(trainerData)
                
                // Store orgId and other data in coordinator (userId already set above)
                coordinator.orgId = orgId
                coordinator.data.organizationName = businessName
                coordinator.data.timezone = timezone
                coordinator.data.currency = currency
                
                
                // Move to next step WITHOUT triggering auth reload
                coordinator.moveToNextStep()
                
                
                isCreating = false
                
            } catch {
                errorMessage = "Failed to create account: \(error.localizedDescription)"
                isCreating = false
            }
        }
    }
}

#Preview {
    OnboardingAccountView()
        .environmentObject(AuthManager())
        .environmentObject(OnboardingCoordinator())
}
