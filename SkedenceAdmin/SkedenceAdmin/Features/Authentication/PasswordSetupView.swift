//
//  PasswordSetupView.swift
//  SkedenceAdmin
//
//  Created for trainer password setup flow
//

import SwiftUI
import FirebaseAuth
import FirebaseFirestore

struct PasswordSetupView: View {
    let setupToken: String
    let email: String
    let trainerId: String
    
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showSuccess = false
    @EnvironmentObject private var dependencies: AdminAppDependencies
    private var auth: AuthManager { dependencies.auth }
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: Spacing.xl) {
                    // Header
                    VStack(spacing: Spacing.sm) {
                        Image(systemName: "lock.shield.fill")
                            .font(.system(size: 60))
                            .foregroundStyle(AppTheme.primary)
                        
                        Text("Set Up Your Password")
                            .font(.headingLarge)
                            .foregroundStyle(AppTheme.textPrimary)
                        
                        Text("Create a secure password for your account")
                            .font(.bodyMedium)
                            .foregroundStyle(AppTheme.textSecondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding(.top, Spacing.xxxl)
                    
                    // Email Display
                    CardView {
                        VStack(alignment: .leading, spacing: Spacing.sm) {
                            Text("Account Email")
                                .font(.bodySmall)
                                .foregroundStyle(AppTheme.textSecondary)
                            
                            Text(email)
                                .font(.headingSmall)
                                .foregroundStyle(AppTheme.textPrimary)
                        }
                    }
                    .padding(.horizontal, Spacing.lg)
                    
                    // Password Form
                    CardView {
                        VStack(spacing: Spacing.md) {
                            SecureField("Password", text: $password)
                                .textContentType(.newPassword)
                                .padding(Spacing.sm)
                                .background(Color(UIColor.systemGray6))
                                .cornerRadius(CornerRadius.xs)
                            
                            SecureField("Confirm Password", text: $confirmPassword)
                                .textContentType(.newPassword)
                                .padding(Spacing.sm)
                                .background(Color(UIColor.systemGray6))
                                .cornerRadius(CornerRadius.xs)
                            
                            // Password Requirements
                            VStack(alignment: .leading, spacing: Spacing.xxs) {
                                Text("Password must:")
                                    .font(.caption)
                                    .foregroundStyle(AppTheme.textSecondary)
                                
                                PasswordRequirement(text: "Be at least 8 characters", met: password.count >= 8)
                                PasswordRequirement(text: "Contain uppercase and lowercase letters", met: containsUpperAndLower(password))
                                PasswordRequirement(text: "Contain a number", met: containsNumber(password))
                            }
                            .padding(.top, Spacing.xs)
                        }
                    }
                    .padding(.horizontal, Spacing.lg)
                    
                    // Error Message
                    if let error = errorMessage, !error.isEmpty {
                        CardView {
                            HStack(spacing: Spacing.sm) {
                                Image(systemName: "exclamationmark.triangle.fill")
                                    .foregroundStyle(AppTheme.error)
                                Text(error)
                                    .font(.bodySmall)
                                    .foregroundStyle(AppTheme.error)
                            }
                        }
                        .padding(.horizontal, Spacing.lg)
                    }
                    
                    // Submit Button
                    Button {
                        Task { await setupPassword() }
                    } label: {
                        HStack(spacing: Spacing.xs) {
                            if isLoading { ProgressView().tint(.white) }
                            Text("Create Account")
                        }
                    }
                    .buttonStyle(PrimaryButtonStyle())
                    .padding(.horizontal, Spacing.lg)
                    .disabled(isLoading || !isPasswordValid)
                }
                .padding(.bottom, Spacing.xxxl)
            }
            .background(Color(UIColor.systemGroupedBackground).ignoresSafeArea())
            .navigationTitle("Account Setup")
            .navigationBarTitleDisplayMode(.inline)
            .alert("Account Created!", isPresented: $showSuccess) {
                Button("Continue") {
                    // Success - auth listener will handle navigation
                }
            } message: {
                Text("Your password has been set successfully. You can now access your account.")
            }
        }
    }
    
    private var isPasswordValid: Bool {
        password.count >= 8 &&
        password == confirmPassword &&
        containsUpperAndLower(password) &&
        containsNumber(password)
    }
    
    private func containsUpperAndLower(_ text: String) -> Bool {
        let hasUpper = text.range(of: "[A-Z]", options: .regularExpression) != nil
        let hasLower = text.range(of: "[a-z]", options: .regularExpression) != nil
        return hasUpper && hasLower
    }
    
    private func containsNumber(_ text: String) -> Bool {
        return text.range(of: "[0-9]", options: .regularExpression) != nil
    }
    
    private func setupPassword() async {
        isLoading = true
        errorMessage = nil
        
        do {
            let db = Firestore.firestore()
            
            // 1. Verify the setup token is valid and not expired
            let trainerDoc = try await db.collection("trainers").document(trainerId).getDocument()
            
            guard trainerDoc.exists, let trainerData = trainerDoc.data() else {
                errorMessage = "Invalid setup link. Please contact your administrator."
                isLoading = false
                return
            }
            
            // Verify token matches
            guard let storedToken = trainerData["setupToken"] as? String,
                  storedToken == setupToken else {
                errorMessage = "Invalid or expired setup link. Please request a new invitation."
                isLoading = false
                return
            }
            
            // Check if token is expired (7 days)
            if let expiryTimestamp = trainerData["setupTokenExpiry"] as? Timestamp {
                let expiryDate = expiryTimestamp.dateValue()
                if expiryDate < Date() {
                    errorMessage = "This setup link has expired. Please contact your administrator for a new invitation."
                    isLoading = false
                    return
                }
            }
            
            // Verify email matches
            let storedEmail = trainerData["email"] as? String ?? trainerData["emailAddress"] as? String
            guard storedEmail == email else {
                errorMessage = "Email mismatch. Please use the correct setup link."
                isLoading = false
                return
            }
            
            // 2. Create Firebase Auth account
            let result = try await Auth.auth().createUser(withEmail: email, password: password)
            let firebaseUid = result.user.uid
            
            
            // 3. Update trainer document with Firebase UID and clear setup fields
            try await db.collection("trainers").document(trainerId).updateData([
                "userId": firebaseUid,
                "needsPasswordSetup": false,
                "setupToken": FieldValue.delete(),
                "setupTokenExpiry": FieldValue.delete(),
                "passwordSetAt": Timestamp(date: Date())
            ])
            
            
            // 4. Update orgMembers - create auth-based document for security rules
            if let orgId = trainerData["orgId"] as? String {
                // Check if orgMember exists with trainerId
                let nameBasedDocId = "\(trainerId)_\(orgId)"
                let oldMemberDoc = try await db.collection("orgMembers").document(nameBasedDocId).getDocument()
                
                if oldMemberDoc.exists, let memberData = oldMemberDoc.data() {
                    // Update existing name-based document with authUserId
                    var updatedNameBasedData = memberData
                    updatedNameBasedData["authUserId"] = firebaseUid
                    updatedNameBasedData["updatedAt"] = Timestamp()
                    
                    try await db.collection("orgMembers").document(nameBasedDocId).setData(updatedNameBasedData)
                    
                    // CRITICAL: Also create auth-based document for security rules
                    let authBasedDocId = "\(firebaseUid)_\(orgId)"
                    var authBasedData = updatedNameBasedData
                    authBasedData["userId"] = trainerId // Keep name-based userId
                    
                    try await db.collection("orgMembers").document(authBasedDocId).setData(authBasedData)
                }
            }
            
            // 5. Success - auth listener will handle navigation
            await MainActor.run {
                isLoading = false
                showSuccess = true
            }
            
        } catch let error as NSError {
            await MainActor.run {
                if error.domain == AuthErrorDomain {
                    switch AuthErrorCode(rawValue: error.code) {
                    case .emailAlreadyInUse:
                        errorMessage = "This email is already in use. Try signing in instead."
                    case .weakPassword:
                        errorMessage = "Password is too weak. Please choose a stronger password."
                    case .invalidEmail:
                        errorMessage = "Invalid email address format."
                    default:
                        errorMessage = error.localizedDescription
                    }
                } else {
                    errorMessage = "Failed to create account: \(error.localizedDescription)"
                }
                isLoading = false
            }
        }
    }
}

// Helper view for password requirements
struct PasswordRequirement: View {
    let text: String
    let met: Bool
    
    var body: some View {
        HStack(spacing: Spacing.xxs) {
            Image(systemName: met ? "checkmark.circle.fill" : "circle")
                .font(.caption)
                .foregroundStyle(met ? AppTheme.success : AppTheme.textSecondary)
            
            Text(text)
                .font(.caption)
                .foregroundStyle(met ? AppTheme.textPrimary : AppTheme.textSecondary)
        }
    }
}

#Preview {
    PasswordSetupView(
        setupToken: "test-token",
        email: "trainer@example.com",
        trainerId: "test-trainer-id"
    )
    .environmentObject(AuthManager())
}
