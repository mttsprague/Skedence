//
//  AccountViewModel.swift
//  SkedenceAdmin
//
//  Created by Matthew Sprague on 10/12/25.
//

import SwiftUI
import Foundation

#if canImport(FirebaseAuth)
import FirebaseAuth
#endif

#if canImport(FirebaseFunctions)
import FirebaseFunctions
#endif

@MainActor
final class AccountViewModel: ObservableObject {
    enum Mode { case signIn, create }

    @Published var mode: Mode = .signIn
    @Published var email: String = ""
    @Published var password: String = ""
    @Published var firstName: String = ""
    @Published var lastName: String = ""
    @Published var isWorking = false
    @Published var errorMessage: String?
    @Published var resetMessage: String?

    // Hooks for navigation
    var dismiss: (() -> Void)?
    var onSignedIn: (() -> Void)?

    var canSubmit: Bool {
        switch mode {
        case .signIn:
            return !email.isEmpty && !password.isEmpty
        case .create:
            return !email.isEmpty && !password.isEmpty && !firstName.isEmpty && !lastName.isEmpty
        }
    }

    func submit() async {
        errorMessage = nil
        guard canSubmit else { return }
        isWorking = true
        defer { isWorking = false }

        switch mode {
        case .signIn:
            await signIn()
        case .create:
            await createAccount()
        }
    }

    private func signIn() async {
        #if canImport(FirebaseAuth)
        do {
            _ = try await Auth.auth().signIn(withEmail: email, password: password)
            onSignedIn?()
        } catch {
            errorMessage = "Sign in failed: \(error.localizedDescription)"
        }
        #endif
    }

    private func createAccount() async {
        #if canImport(FirebaseAuth)
        do {
            let result = try await Auth.auth().createUser(withEmail: email, password: password)
            let uid = result.user.uid

            // Optionally set display name
            let change = result.user.createProfileChangeRequest()
            change.displayName = "\(firstName) \(lastName)"
            try await change.commitChanges()

            // SkedenceAdmin only creates trainer documents, NOT user documents
            // Create trainers/{uid} profile (owner can write)
            try await FirestoreService.shared.createOrUpdateTrainerProfile(
                trainerId: uid,
                name: "\(firstName) \(lastName)",
                email: email
            )

            onSignedIn?()
        } catch {
            errorMessage = "Create account failed: \(error.localizedDescription)"
        }
        #endif
    }
    
    func sendPasswordReset() {
        guard !email.isEmpty else {
            resetMessage = "Please enter your email address first"
            return
        }
        
        #if canImport(FirebaseFunctions)
        let functions = Functions.functions()
        let sendPasswordReset = functions.httpsCallable("sendPasswordResetEmail")
        
        sendPasswordReset(["email": email]) { result, error in
            Task { @MainActor in
                if let error = error {
                    self.resetMessage = "Error: \(error.localizedDescription)"
                } else {
                    self.resetMessage = "✅ Password reset email sent! Check your inbox."
                    // Clear message after 10 seconds
                    DispatchQueue.main.asyncAfter(deadline: .now() + 10) {
                        self.resetMessage = nil
                    }
                }
            }
        }
        #endif
    }
}
