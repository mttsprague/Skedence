//
//  MorePlaceholderView.swift
//  Skedence
//
//  Created by Matthew Sprague on 10/14/25.
//


import SwiftUI
import FirebaseAuth
import FirebaseFunctions

struct MorePlaceholderView: View {
    @EnvironmentObject var auth: AuthManager
    @EnvironmentObject var trainersService: TrainersService
    @Binding var selectedTab: Int
    @State private var showingResetPassword = false
    @State private var resetMessage: String?
    @State private var showingDeleteConfirmation = false
    @State private var showingDeleteSuccess = false
    @State private var deleteMessage: String?
    @State private var isDeletingAccount = false
    @State private var showTrainersSection = false
    @State private var selectedTrainer: Trainer?
    @State private var showTrainerBio = false
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: Spacing.xl) {
                    // Header
                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        Text("More")
                            .font(.displayMedium)
                            .foregroundStyle(AppTheme.primary)
                        
                        Text("Information & Support")
                            .font(.bodyLarge)
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                    .padding(.top, Spacing.md)
                    
                    // Profile Section
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        SectionHeaderView(title: "Profile")
                        
                        CardView {
                            VStack(spacing: Spacing.md) {
                                NavigationLink(destination: EditProfileView()) {
                                    HStack(spacing: Spacing.md) {
                                        ZStack {
                                            RoundedRectangle(cornerRadius: CornerRadius.xs, style: .continuous)
                                                .fill(AppTheme.primary.opacity(0.15))
                                                .frame(width: 48, height: 48)
                                            
                                            Image(systemName: "person.fill")
                                                .font(.system(size: 20))
                                                .foregroundStyle(AppTheme.primary)
                                        }
                                        
                                        VStack(alignment: .leading, spacing: Spacing.xxs) {
                                            Text("Edit Profile")
                                                .font(.bodyMedium)
                                                .foregroundStyle(AppTheme.primary)
                                            
                                            Text("Update your information")
                                                .font(.labelMedium)
                                                .foregroundStyle(AppTheme.textSecondary)
                                        }
                                        
                                        Spacer()
                                        
                                        Image(systemName: "chevron.right")
                                            .font(.system(size: 14, weight: .semibold))
                                            .foregroundStyle(AppTheme.textTertiary)
                                    }
                                }
                                
                                Divider()
                                
                                NavigationLink(destination: DocumentsView()) {
                                    HStack(spacing: Spacing.md) {
                                        ZStack {
                                            RoundedRectangle(cornerRadius: CornerRadius.xs, style: .continuous)
                                                .fill(AppTheme.info.opacity(0.15))
                                                .frame(width: 48, height: 48)
                                            
                                            Image(systemName: "doc.text.fill")
                                                .font(.system(size: 20))
                                                .foregroundStyle(AppTheme.info)
                                        }
                                        
                                        VStack(alignment: .leading, spacing: Spacing.xxs) {
                                            Text("Documents")
                                                .font(.bodyMedium)
                                                .foregroundStyle(AppTheme.primary)
                                            
                                            Text("View signed waivers & documents")
                                                .font(.labelMedium)
                                                .foregroundStyle(AppTheme.textSecondary)
                                        }
                                        
                                        Spacer()
                                        
                                        Image(systemName: "chevron.right")
                                            .font(.system(size: 14, weight: .semibold))
                                            .foregroundStyle(AppTheme.textTertiary)
                                    }
                                }
                                
                                Divider()
                                
                                Button {
                                    showingResetPassword = true
                                } label: {
                                    HStack(spacing: Spacing.md) {
                                        ZStack {
                                            RoundedRectangle(cornerRadius: CornerRadius.xs, style: .continuous)
                                                .fill(AppTheme.secondary.opacity(0.15))
                                                .frame(width: 48, height: 48)
                                            
                                            Image(systemName: "lock.rotation")
                                                .font(.system(size: 20))
                                                .foregroundStyle(AppTheme.secondary)
                                        }
                                        
                                        VStack(alignment: .leading, spacing: Spacing.xxs) {
                                            Text("Reset Password")
                                                .font(.bodyMedium)
                                                .foregroundStyle(AppTheme.primary)
                                            
                                            Text("Send password reset email")
                                                .font(.labelMedium)
                                                .foregroundStyle(AppTheme.textSecondary)
                                        }
                                        
                                        Spacer()
                                        
                                        Image(systemName: "chevron.right")
                                            .font(.system(size: 14, weight: .semibold))
                                            .foregroundStyle(AppTheme.textTertiary)
                                    }
                                }
                                .buttonStyle(.plain)
                                
                                if let resetMessage = resetMessage {
                                    Text(resetMessage)
                                        .font(.footnote)
                                        .foregroundStyle(resetMessage.contains("sent") ? .green : .red)
                                        .multilineTextAlignment(.center)
                                        .padding(.top, Spacing.xs)
                                }
                            }
                        }
                    }
                    
                    // Trainers Section
                    trainersSection
                    
                    // Contact Section
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        SectionHeaderView(title: "Contact")
                        
                        CardView {
                            VStack(spacing: Spacing.md) {
                                // Email
                                Link(destination: URL(string: "mailto:support@skedence.com")!) {
                                    HStack(spacing: Spacing.md) {
                                        ZStack {
                                            RoundedRectangle(cornerRadius: CornerRadius.xs, style: .continuous)
                                                .fill(AppTheme.primary.opacity(0.15))
                                                .frame(width: 48, height: 48)
                                            
                                            Image(systemName: "envelope.fill")
                                                .font(.system(size: 20))
                                                .foregroundStyle(AppTheme.primary)
                                        }
                                        
                                        VStack(alignment: .leading, spacing: Spacing.xxs) {
                                            Text("Email Support")
                                                .font(.labelMedium)
                                                .foregroundStyle(AppTheme.textSecondary)
                                            
                                            Text("support@skedence.com")
                                                .font(.bodyMedium)
                                                .foregroundStyle(AppTheme.primary)
                                        }
                                        
                                        Spacer()
                                        
                                        Image(systemName: "chevron.right")
                                            .font(.system(size: 14, weight: .semibold))
                                            .foregroundStyle(AppTheme.textTertiary)
                                    }
                                }
                                
                                Divider()
                                
                                // Website
                                Link(destination: URL(string: "https://www.skedence.com")!) {
                                    HStack(spacing: Spacing.md) {
                                        ZStack {
                                            RoundedRectangle(cornerRadius: CornerRadius.xs, style: .continuous)
                                                .fill(AppTheme.secondary.opacity(0.15))
                                                .frame(width: 48, height: 48)
                                            
                                            Image(systemName: "globe")
                                                .font(.system(size: 20))
                                                .foregroundStyle(AppTheme.secondary)
                                        }
                                        
                                        VStack(alignment: .leading, spacing: Spacing.xxs) {
                                            Text("Website")
                                                .font(.labelMedium)
                                                .foregroundStyle(AppTheme.textSecondary)
                                            
                                            Text("skedence.com")
                                                .font(.bodyMedium)
                                                .foregroundStyle(AppTheme.primary)
                                        }
                                        
                                        Spacer()
                                        
                                        Image(systemName: "arrow.up.right")
                                            .font(.system(size: 14, weight: .semibold))
                                            .foregroundStyle(AppTheme.textTertiary)
                                    }
                                }
                            }
                        }
                    }
                    
                    // Support & Help Section
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        SectionHeaderView(title: "Support")
                        
                        CardView {
                            VStack(spacing: Spacing.md) {
                                // Help Center
                                Link(destination: URL(string: "https://www.skedence.com/help")!) {
                                    HStack(spacing: Spacing.md) {
                                        ZStack {
                                            RoundedRectangle(cornerRadius: CornerRadius.xs, style: .continuous)
                                                .fill(AppTheme.secondary.opacity(0.15))
                                                .frame(width: 48, height: 48)
                                            
                                            Image(systemName: "questionmark.circle.fill")
                                                .font(.system(size: 20))
                                                .foregroundStyle(AppTheme.secondary)
                                        }
                                        
                                        VStack(alignment: .leading, spacing: Spacing.xxs) {
                                            Text("Help Center")
                                                .font(.bodyMedium)
                                                .foregroundStyle(AppTheme.primary)
                                            
                                            Text("FAQs and guides")
                                                .font(.labelMedium)
                                                .foregroundStyle(AppTheme.textSecondary)
                                        }
                                        
                                        Spacer()
                                        
                                        Image(systemName: "arrow.up.right")
                                            .font(.system(size: 14, weight: .semibold))
                                            .foregroundStyle(AppTheme.textTertiary)
                                    }
                                }
                                
                                Divider()
                                
                                // Contact Organization
                                HStack(spacing: Spacing.md) {
                                    ZStack {
                                        RoundedRectangle(cornerRadius: CornerRadius.xs, style: .continuous)
                                            .fill(AppTheme.primary.opacity(0.15))
                                            .frame(width: 48, height: 48)
                                        
                                        Image(systemName: "building.2.fill")
                                            .font(.system(size: 20))
                                            .foregroundStyle(AppTheme.primary)
                                    }
                                    
                                    VStack(alignment: .leading, spacing: Spacing.xxs) {
                                        Text("Organization Support")
                                            .font(.bodyMedium)
                                            .foregroundStyle(AppTheme.primary)
                                        
                                        Text("Contact your administrator")
                                            .font(.labelMedium)
                                            .foregroundStyle(AppTheme.textSecondary)
                                    }
                                    
                                    Spacer()
                                    
                                    Image(systemName: "chevron.right")
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundStyle(AppTheme.textTertiary)
                                }
                            }
                        }
                    }
                    
                    // Legal Section
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        SectionHeaderView(title: "Legal")
                        
                        CardView {
                            VStack(spacing: Spacing.md) {
                                // Privacy Policy
                                Link(destination: URL(string: "https://www.skedence.com/privacy")!) {
                                    HStack(spacing: Spacing.md) {
                                        ZStack {
                                            RoundedRectangle(cornerRadius: CornerRadius.xs, style: .continuous)
                                                .fill(AppTheme.accent.opacity(0.15))
                                                .frame(width: 48, height: 48)
                                            
                                            Image(systemName: "hand.raised.fill")
                                                .font(.system(size: 20))
                                                .foregroundStyle(AppTheme.accent)
                                        }
                                        
                                        VStack(alignment: .leading, spacing: Spacing.xxs) {
                                            Text("Privacy Policy")
                                                .font(.bodyMedium)
                                                .foregroundStyle(AppTheme.primary)
                                            
                                            Text("How we protect your data")
                                                .font(.labelMedium)
                                                .foregroundStyle(AppTheme.textSecondary)
                                        }
                                        
                                        Spacer()
                                        
                                        Image(systemName: "arrow.up.right")
                                            .font(.system(size: 14, weight: .semibold))
                                            .foregroundStyle(AppTheme.textTertiary)
                                    }
                                }
                                
                                Divider()
                                
                                // Terms of Service
                                Link(destination: URL(string: "https://www.skedence.com/terms")!) {
                                    HStack(spacing: Spacing.md) {
                                        ZStack {
                                            RoundedRectangle(cornerRadius: CornerRadius.xs, style: .continuous)
                                                .fill(AppTheme.primary.opacity(0.15))
                                                .frame(width: 48, height: 48)
                                            
                                            Image(systemName: "doc.text.fill")
                                                .font(.system(size: 20))
                                                .foregroundStyle(AppTheme.primary)
                                        }
                                        
                                        VStack(alignment: .leading, spacing: Spacing.xxs) {
                                            Text("Terms of Service")
                                                .font(.bodyMedium)
                                                .foregroundStyle(AppTheme.primary)
                                            
                                            Text("Platform usage agreement")
                                                .font(.labelMedium)
                                                .foregroundStyle(AppTheme.textSecondary)
                                        }
                                        
                                        Spacer()
                                        
                                        Image(systemName: "arrow.up.right")
                                            .font(.system(size: 14, weight: .semibold))
                                            .foregroundStyle(AppTheme.textTertiary)
                                    }
                                }
                            }
                        }
                    }
                    
                    // About Skedence
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        SectionHeaderView(title: "About")
                        
                        CardView {
                            VStack(alignment: .leading, spacing: Spacing.md) {
                                HStack(spacing: Spacing.md) {
                                    ZStack {
                                        RoundedRectangle(cornerRadius: CornerRadius.xs, style: .continuous)
                                            .fill(AppTheme.primary.opacity(0.15))
                                            .frame(width: 48, height: 48)
                                        
                                        Image(systemName: "calendar.badge.clock")
                                            .font(.system(size: 20))
                                            .foregroundStyle(AppTheme.primary)
                                    }
                                    
                                    VStack(alignment: .leading, spacing: Spacing.xxs) {
                                        Text("Skedence Platform")
                                            .font(.bodyMedium)
                                            .foregroundStyle(AppTheme.primary)
                                        
                                        Text("Version 1.0")
                                            .font(.labelMedium)
                                            .foregroundStyle(AppTheme.textSecondary)
                                    }
                                    
                                    Spacer()
                                }
                                
                                Text("You're using Skedence, a scheduling platform for fitness and sports organizations. This app is powered by your organization's account.")
                                    .font(.bodySmall)
                                    .foregroundStyle(AppTheme.textSecondary)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                        }
                    }
                    
                    // Delete Account Section
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        SectionHeaderView(title: "Danger Zone")
                        
                        CardView {
                            Button(action: {
                                showingDeleteConfirmation = true
                            }) {
                                HStack(spacing: Spacing.md) {
                                    ZStack {
                                        RoundedRectangle(cornerRadius: CornerRadius.xs, style: .continuous)
                                            .fill(Color.red.opacity(0.15))
                                            .frame(width: 48, height: 48)
                                        
                                        Image(systemName: "trash.fill")
                                            .font(.system(size: 20))
                                            .foregroundStyle(.red)
                                    }
                                    
                                    VStack(alignment: .leading, spacing: Spacing.xxs) {
                                        Text("Delete Account")
                                            .font(.bodyMedium)
                                            .foregroundStyle(.red)
                                        
                                        Text("Permanently delete all your data")
                                            .font(.labelMedium)
                                            .foregroundStyle(AppTheme.textSecondary)
                                    }
                                    
                                    Spacer()
                                    
                                    if isDeletingAccount {
                                        ProgressView()
                                            .tint(.red)
                                    } else {
                                        Image(systemName: "chevron.right")
                                            .font(.system(size: 14, weight: .semibold))
                                            .foregroundStyle(AppTheme.textTertiary)
                                    }
                                }
                            }
                            .disabled(isDeletingAccount)
                        }
                    }
                    
                    // App Info
                    VStack(spacing: Spacing.xs) {
                        Text("Skedence")
                            .font(.labelMedium)
                            .foregroundStyle(AppTheme.textSecondary)
                        
                        Text("© 2026 All rights reserved")
                            .font(.labelSmall)
                            .foregroundStyle(AppTheme.textTertiary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.top, Spacing.lg)
                }
                .padding(.horizontal, Spacing.lg)
                .padding(.bottom, Spacing.xxxl)
            }
            .background(Color.platformGroupedBackground.ignoresSafeArea())
            .navigationBarHidden(true)
        }
        .navigationViewStyle(.stack)
        .alert("Reset Password", isPresented: $showingResetPassword) {
            Button("Cancel", role: .cancel) { }
            Button("Send Reset Email") {
                sendPasswordReset()
            }
        } message: {
            if let email = Auth.auth().currentUser?.email {
                Text("Send a password reset email to \(email)?")
            } else {
                Text("Error: No email found. Please sign out and sign in again.")
            }
        }
        .alert("Delete Account", isPresented: $showingDeleteConfirmation) {
            Button("Cancel", role: .cancel) { }
            Button("Delete", role: .destructive) {
                deleteAccount()
            }
        } message: {
            Text("Are you sure you want to delete your account? All saved info will be permanently deleted.")
        }
        .alert("Account Deleted", isPresented: $showingDeleteSuccess) {
            Button("OK") {
                // Redirect to Profile tab which will show sign-in screen
                selectedTab = 2
            }
        } message: {
            Text("Your account has been successfully deleted.")
        }
        .sheet(isPresented: $showTrainerBio) {
            if let trainer = selectedTrainer {
                TrainerBioSheet(trainer: trainer)
            }
        }
        .task {
            // Load trainers when view appears
            if let orgId = auth.currentOrgId {
                await trainersService.loadAll(orgId: orgId)
            }
        }
    }
    
    // MARK: - Trainers Section
    
    private var trainersSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            SectionHeaderView(title: "Meet Our Trainers")
            
            VStack(spacing: 0) {
                // Header Button
                Button {
                    withAnimation(.easeInOut(duration: 0.3)) {
                        showTrainersSection.toggle()
                    }
                } label: {
                    HStack {
                        HStack(spacing: 8) {
                            Image(systemName: "person.2.fill")
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundStyle(Brand.primary)
                            Text("Trainers")
                                .font(.system(size: 17, weight: .semibold))
                                .foregroundStyle(.primary)
                        }
                        Spacer()
                        Image(systemName: showTrainersSection ? "chevron.up" : "chevron.down")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(.secondary)
                    }
                    .padding(.horizontal, 20)
                    .padding(.vertical, 12)
                    .background(Color.platformBackground)
                }
                .buttonStyle(.plain)
                
                // Expanded trainer list
                if showTrainersSection {
                    VStack(spacing: 8) {
                        ForEach(trainersService.trainers.filter { $0.active == true }, id: \.id) { trainer in
                            Button {
                                selectedTrainer = trainer
                                showTrainerBio = true
                            } label: {
                                HStack(spacing: 12) {
                                    TrainerAvatarView(trainer: trainer, size: 44)
                                    
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(trainer.name ?? "Trainer")
                                            .font(.system(size: 16, weight: .medium))
                                            .foregroundStyle(.primary)
                                        
                                        if let hasDescription = trainer.trainerDescription, !hasDescription.isEmpty {
                                            Text("Tap to view bio")
                                                .font(.system(size: 13))
                                                .foregroundStyle(.secondary)
                                        } else {
                                            Text("No bio available")
                                                .font(.system(size: 13))
                                                .foregroundStyle(.tertiary)
                                                .italic()
                                        }
                                    }
                                    
                                    Spacer()
                                    
                                    Image(systemName: "chevron.right")
                                        .font(.system(size: 13, weight: .semibold))
                                        .foregroundStyle(.tertiary)
                                }
                                .padding(.horizontal, 20)
                                .padding(.vertical, 10)
                                .background(Color.platformBackground)
                            }
                            .buttonStyle(.plain)
                            
                            if trainer.id != trainersService.trainers.filter({ $0.active == true }).last?.id {
                                Divider()
                                    .padding(.leading, 76)
                            }
                        }
                    }
                    .background(Color.platformBackground)
                }
            }
            .background(Color.platformBackground)
            .cornerRadius(12)
            .shadow(color: .black.opacity(0.04), radius: 8, x: 0, y: 2)
        }
    }
    
    private func sendPasswordReset() {
        guard let email = Auth.auth().currentUser?.email else {
            resetMessage = "Error: No email found"
            return
        }
        
        let functions = Functions.functions()
        let callable = functions.httpsCallable("sendPasswordResetEmail")
        
        Task {
            do {
                _ = try await callable.call(["email": email])
                await MainActor.run {
                    resetMessage = "✅ Password reset email sent! Check your inbox."
                    // Clear message after 10 seconds
                    DispatchQueue.main.asyncAfter(deadline: .now() + 10) {
                        resetMessage = nil
                    }
                }
            } catch {
                await MainActor.run {
                    resetMessage = "Error: \(error.localizedDescription)"
                }
            }
        }
    }
    
    private func deleteAccount() {
        guard let userId = Auth.auth().currentUser?.uid else {
            return
        }
        
        isDeletingAccount = true
        let functions = Functions.functions(region: "us-central1")
        let callable = functions.httpsCallable("deleteUserAccount")
        
        Task {
            do {
                // Force token refresh to ensure valid authentication
                if let currentUser = Auth.auth().currentUser {
                    _ = try await currentUser.getIDToken(forcingRefresh: true)
                }
                
                _ = try await callable.call(["userId": userId])
                
                // Sign out and show success
                try Auth.auth().signOut()
                await MainActor.run {
                    isDeletingAccount = false
                    showingDeleteSuccess = true
                }
            } catch {
                await MainActor.run {
                    isDeletingAccount = false
                    deleteMessage = "Error: \(error.localizedDescription)"
                }
            }
        }
    }
}
