//
//  SignInView.swift
//  SkedenceAdmin
//
//  Created by Copilot on 2/19/26.
//

import SwiftUI

struct SignInView: View {
    @EnvironmentObject var dependencies: AdminAppDependencies
    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var showError = false
    @State private var errorMessage = ""
    @FocusState private var focusedField: Field?
    
    private var auth: AuthManager { dependencies.auth }
    
    // Web app theme color (vibrant orange)
    private let brandColor = Color(red: 1.0, green: 0.42, blue: 0.21) // #FF6B35
    
    enum Field: Hashable {
        case email, password
    }
    
    var body: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                colors: [
                    brandColor.opacity(0.1),
                    Color.white,
                    brandColor.opacity(0.05)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            
            ScrollView {
                VStack(spacing: 0) {
                    Spacer()
                        .frame(height: 60)
                    
                    // Logo and branding
                    VStack(spacing: 16) {
                        // Logo/Icon
                        ZStack {
                            Circle()
                                .fill(
                                    LinearGradient(
                                        colors: [brandColor, brandColor.opacity(0.7)],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                                .frame(width: 100, height: 100)
                                .shadow(color: brandColor.opacity(0.3), radius: 20, x: 0, y: 10)
                            
                            Image(systemName: "calendar.badge.clock")
                                .font(.system(size: 44, weight: .medium))
                                .foregroundColor(.white)
                        }
                        
                        // App name
                        Text("Skedence")
                            .font(.system(size: 36, weight: .bold, design: .rounded))
                            .foregroundColor(.primary)
                    }
                    .padding(.bottom, 50)
                    
                    // Sign in card
                    VStack(spacing: 24) {
                        VStack(spacing: 8) {
                            Text("Welcome Back")
                                .font(.system(size: 28, weight: .bold))
                                .foregroundColor(.primary)
                            
                            Text("Sign in to view and manage your schedule")
                                .font(.system(size: 16))
                                .foregroundColor(.secondary)
                        }
                        .padding(.bottom, 8)
                        
                        // Email field
                        VStack(alignment: .leading, spacing: 8) {
                            Label("Email", systemImage: "envelope.fill")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundColor(.secondary)
                            
                            HStack {
                                Image(systemName: "envelope")
                                    .foregroundColor(brandColor)
                                    .frame(width: 20)
                                
                                TextField("your.email@example.com", text: $email)
                                    .textContentType(.emailAddress)
                                    .autocapitalization(.none)
                                    .keyboardType(.emailAddress)
                                    .focused($focusedField, equals: .email)
                                    .submitLabel(.next)
                                    .onSubmit {
                                        focusedField = .password
                                    }
                            }
                            .padding()
                            .background(Color(.systemBackground))
                            .cornerRadius(12)
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(focusedField == .email ? brandColor : Color(.systemGray5), lineWidth: 2)
                            )
                        }
                        
                        // Password field
                        VStack(alignment: .leading, spacing: 8) {
                            Label("Password", systemImage: "lock.fill")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundColor(.secondary)
                            
                            HStack {
                                Image(systemName: "lock")
                                    .foregroundColor(brandColor)
                                    .frame(width: 20)
                                
                                SecureField("Enter your password", text: $password)
                                    .textContentType(.password)
                                    .focused($focusedField, equals: .password)
                                    .submitLabel(.go)
                                    .onSubmit {
                                        signIn()
                                    }
                            }
                            .padding()
                            .background(Color(.systemBackground))
                            .cornerRadius(12)
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(focusedField == .password ? brandColor : Color(.systemGray5), lineWidth: 2)
                            )
                        }
                        
                        // Sign in button
                        Button(action: signIn) {
                            HStack(spacing: 12) {
                                if isLoading {
                                    ProgressView()
                                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                } else {
                                    Text("Sign In")
                                        .font(.system(size: 18, weight: .semibold))
                                    
                                    Image(systemName: "arrow.right.circle.fill")
                                        .font(.system(size: 20))
                                }
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(
                                LinearGradient(
                                    colors: [brandColor, brandColor.opacity(0.8)],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .foregroundColor(.white)
                            .cornerRadius(12)
                            .shadow(color: brandColor.opacity(0.3), radius: 10, x: 0, y: 5)
                        }
                        .disabled(isLoading || email.isEmpty || password.isEmpty)
                        .opacity((email.isEmpty || password.isEmpty) ? 0.6 : 1.0)
                        .padding(.top, 8)
                        
                        // Error message
                        if showError {
                            HStack {
                                Image(systemName: "exclamationmark.triangle.fill")
                                    .foregroundColor(.red)
                                Text(errorMessage)
                                    .font(.system(size: 14))
                                    .foregroundColor(.red)
                            }
                            .padding()
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.red.opacity(0.1))
                            .cornerRadius(8)
                        }
                    }
                    .padding(28)
                    .background(Color(.systemBackground))
                    .cornerRadius(20)
                    .shadow(color: Color.black.opacity(0.08), radius: 20, x: 0, y: 10)
                    .padding(.horizontal, 24)
                    
                    Spacer()
                    
                    // Footer
                    VStack(spacing: 12) {
                        HStack(spacing: 4) {
                            Text("Need help?")
                                .font(.system(size: 14))
                                .foregroundColor(.secondary)
                            
                            Button("Contact Support") {
                                if let url = URL(string: "mailto:support@skedence.com") {
                                    UIApplication.shared.open(url)
                                }
                            }
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(brandColor)
                        }
                    }
                    .padding(.top, 40)
                    .padding(.bottom, 30)
                }
            }
            .scrollDismissesKeyboard(.immediately)
        }
        .onAppear {
            // Auto-focus email field
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                focusedField = .email
            }
        }
        .onChange(of: auth.isAuthenticated) { oldValue, newValue in
            // Reset loading state when auth state changes
            if newValue {
                isLoading = false
            }
        }
    }
    
    private func signIn() {
        guard !email.isEmpty, !password.isEmpty else { return }
        
        isLoading = true
        showError = false
        focusedField = nil // Dismiss keyboard
        
        // Force keyboard dismissal
        UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
        
        Task {
            do {
                try await auth.signIn(email: email, password: password)
                // Auth listener will load org data, then app will navigate automatically
                await MainActor.run {
                    isLoading = false
                }
            } catch {
                await MainActor.run {
                    isLoading = false
                    showError = true
                    
                    // Provide user-friendly error messages
                    if let errorCode = (error as NSError?)?.code {
                        switch errorCode {
                        case 17009: // ERROR_WRONG_PASSWORD
                            errorMessage = "Incorrect password. Please try again."
                        case 17011: // ERROR_USER_NOT_FOUND
                            errorMessage = "No account found with this email."
                        case 17008: // ERROR_INVALID_EMAIL
                            errorMessage = "Invalid email address."
                        case 17020: // ERROR_NETWORK_REQUEST_FAILED
                            errorMessage = "Network error. Please check your connection."
                        default:
                            errorMessage = "Sign in failed. Please try again."
                        }
                    } else {
                        errorMessage = error.localizedDescription
                    }
                }
            }
        }
    }
}

#Preview {
    SignInView()
        .environmentObject(AdminAppDependencies())
}
