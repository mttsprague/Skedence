//
//  OnboardingInviteCodeView.swift
//  SkedenceAdmin
//
//  Step 3: Generate and preview invite code
//

import SwiftUI
import FirebaseFirestore

struct OnboardingInviteCodeView: View {
    @EnvironmentObject var coordinator: OnboardingCoordinator
    
    @State private var inviteCode: String = ""
    @State private var isGenerating: Bool = true
    @State private var showCopiedAlert: Bool = false
    @State private var errorMessage: String?
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.xl) {
                // Header
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    Image(systemName: "ticket.fill")
                        .font(.system(size: 56))
                        .foregroundStyle(AppTheme.primary)
                        .frame(maxWidth: .infinity, alignment: .center)
                        .padding(.bottom, Spacing.xs)
                    
                    Text("Your Invite Code")
                        .font(.displaySmall)
                        .foregroundStyle(AppTheme.textPrimary)
                        .frame(maxWidth: .infinity, alignment: .center)
                    
                    Text("Share this code with clients to register")
                        .font(.bodyLarge)
                        .foregroundStyle(AppTheme.textSecondary)
                        .frame(maxWidth: .infinity, alignment: .center)
                        .multilineTextAlignment(.center)
                }
                .padding(.bottom, Spacing.md)
                
                // Code Display
                if isGenerating {
                    HStack {
                        Spacer()
                        VStack(spacing: Spacing.md) {
                            ProgressView()
                                .tint(AppTheme.primary)
                            Text("Generating your code...")
                                .font(.bodyMedium)
                                .foregroundStyle(AppTheme.textSecondary)
                        }
                        Spacer()
                    }
                    .padding(.vertical, Spacing.xxxl)
                } else {
                    VStack(spacing: Spacing.lg) {
                        // Code Card
                        VStack(spacing: Spacing.md) {
                            Text("Your Organization Code")
                                .font(.labelLarge)
                                .foregroundStyle(AppTheme.textSecondary)
                            
                            Text(inviteCode)
                                .font(.system(size: 48, weight: .bold, design: .monospaced))
                                .foregroundStyle(AppTheme.primary)
                                .tracking(4)
                            
                            Button(action: copyCode) {
                                HStack(spacing: Spacing.xs) {
                                    Image(systemName: showCopiedAlert ? "checkmark.circle.fill" : "doc.on.doc")
                                    Text(showCopiedAlert ? "Copied!" : "Copy Code")
                                }
                                .font(.bodyMedium)
                                .foregroundStyle(showCopiedAlert ? .green : AppTheme.primary)
                            }
                        }
                        .padding(Spacing.xl)
                        .frame(maxWidth: .infinity)
                        .background(
                            LinearGradient(
                                colors: [AppTheme.primary.opacity(0.1), AppTheme.primaryLight.opacity(0.1)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: CornerRadius.lg)
                                .stroke(AppTheme.primary.opacity(0.3), lineWidth: 2)
                        )
                        .cornerRadius(CornerRadius.lg)
                        
                        // How to share
                        VStack(alignment: .leading, spacing: Spacing.md) {
                            HStack(spacing: Spacing.xs) {
                                Image(systemName: "info.circle.fill")
                                    .foregroundStyle(AppTheme.primary)
                                Text("How clients use this code")
                                    .font(.headingSmall)
                                    .foregroundStyle(AppTheme.textPrimary)
                            }
                            
                            VStack(alignment: .leading, spacing: Spacing.sm) {
                                InstructionRow(
                                    number: "1",
                                    text: "Download the Skedence app from the App Store"
                                )
                                InstructionRow(
                                    number: "2",
                                    text: "Tap \"Create Account\" on the welcome screen"
                                )
                                InstructionRow(
                                    number: "3",
                                    text: "Enter this code: \(inviteCode)"
                                )
                                InstructionRow(
                                    number: "4",
                                    text: "Complete registration and start booking!"
                                )
                            }
                        }
                        .padding()
                        .background(AppTheme.surfaceSecondary)
                        .cornerRadius(CornerRadius.md)
                        
                        // Share button
                        Button(action: shareCode) {
                            HStack {
                                Image(systemName: "square.and.arrow.up")
                                Text("Share with Clients")
                            }
                            .font(.bodyMedium)
                            .foregroundStyle(AppTheme.primary)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, Spacing.md)
                            .background(AppTheme.primary.opacity(0.1))
                            .cornerRadius(CornerRadius.md)
                        }
                    }
                }
                
                // Error
                if let error = errorMessage {
                    Text(error)
                        .font(.bodyMedium)
                        .foregroundStyle(.red)
                        .padding()
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.red.opacity(0.1))
                        .cornerRadius(CornerRadius.md)
                }
                
                Spacer()
                
                // Continue Button
                if !isGenerating {
                    Button(action: continueToNextStep) {
                        Text("Continue")
                            .font(.headingSmall)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, Spacing.md)
                            .background(AppTheme.primary)
                            .foregroundStyle(.white)
                            .cornerRadius(CornerRadius.md)
                    }
                }
            }
            .padding(Spacing.lg)
        }
        .background(Color(UIColor.systemBackground))
        .task {
            await generateInviteCode()
        }
    }
    
    func generateInviteCode() async {
        guard let orgId = coordinator.orgId else { return }
        
        isGenerating = true
        
        do {
            let db = Firestore.firestore()
            
            // Generate unique 6-character code
            var code: String
            var isUnique = false
            
            repeat {
                code = String((0..<6).map { _ in "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".randomElement()! })
                
                // Check if code already exists
                let query = db.collection("organizations")
                    .whereField("inviteCode", isEqualTo: code)
                    .limit(to: 1)
                
                let snapshot = try await query.getDocuments()
                isUnique = snapshot.documents.isEmpty
            } while !isUnique
            
            // Save to organization
            try await db.collection("organizations")
                .document(orgId)
                .updateData([
                    "inviteCode": code,
                    "updatedAt": Timestamp(date: Date())
                ])
            
            inviteCode = code
            coordinator.data.inviteCode = code
            isGenerating = false
            
        } catch {
            errorMessage = "Failed to generate code: \(error.localizedDescription)"
            isGenerating = false
        }
    }
    
    func copyCode() {
        UIPasteboard.general.string = inviteCode
        showCopiedAlert = true
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            showCopiedAlert = false
        }
    }
    
    func shareCode() {
        let message = """
        Join us on Skedence!
        
        1. Download the Skedence app
        2. Create an account
        3. Use code: \(inviteCode)
        
        Get started today!
        """
        
        let activityVC = UIActivityViewController(
            activityItems: [message],
            applicationActivities: nil
        )
        
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let window = windowScene.windows.first,
           let rootVC = window.rootViewController {
            rootVC.present(activityVC, animated: true)
        }
    }
    
    func continueToNextStep() {
        coordinator.moveToNextStep()
    }
}

// MARK: - Instruction Row

private struct InstructionRow: View {
    let number: String
    let text: String
    
    var body: some View {
        HStack(alignment: .top, spacing: Spacing.sm) {
            ZStack {
                Circle()
                    .fill(AppTheme.primary)
                    .frame(width: 24, height: 24)
                
                Text(number)
                    .font(.labelSmall)
                    .fontWeight(.bold)
                    .foregroundStyle(.white)
            }
            
            Text(text)
                .font(.bodyMedium)
                .foregroundStyle(AppTheme.textPrimary)
        }
    }
}

#Preview {
    OnboardingInviteCodeView()
        .environmentObject(OnboardingCoordinator())
}
