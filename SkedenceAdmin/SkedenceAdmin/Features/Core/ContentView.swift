//
//  ContentView.swift
//  SkedenceAdmin
//
//  Created by Matthew Sprague on 10/12/25.
//

import SwiftUI
import UIKit
import CoreImage
#if canImport(FirebaseFirestore)
import FirebaseFirestore
#endif
#if canImport(FirebaseAuth)
import FirebaseAuth
#endif

struct ContentView: View {
    @EnvironmentObject private var dependencies: AdminAppDependencies
    @State private var selectedTab = 0
    @Environment(\.openURL) private var openURL
    
    // Convenience accessors
    private var auth: AuthManager { dependencies.auth }
    private var enforcement: SubscriptionEnforcementService { dependencies.enforcement }
    
    var body: some View {
        TabView(selection: $selectedTab) {
            ScheduleView()
                .tabItem {
                    Label("Schedule", systemImage: selectedTab == 0 ? "calendar" : "calendar")
                }
                .tag(0)

            ClientsView()
                .tabItem {
                    Label("Clients", systemImage: selectedTab == 1 ? "person.2.fill" : "person.2")
                }
                .tag(1)

            MoreView()
                .tabItem {
                    Label("Account", systemImage: selectedTab == 2 ? "person.crop.circle.fill" : "person.crop.circle")
                }
                .tag(2)

            // Only show Business tab for admins (includes legacy 'owner' role)
            if auth.currentOrgRole == "admin" || auth.currentOrgRole == "owner" {
                BusinessView()
                    .tabItem {
                        Label("Business", systemImage: selectedTab == 3 ? "briefcase.fill" : "briefcase")
                    }
                    .tag(3)
            }
        }
        .tint(AppTheme.primary)
        .overlay {
            if let billing = enforcement.billing {
                CoachPaywallView(
                    billing: billing,
                    isOwner: enforcement.isOwner,
                    estimatedLostRevenue: enforcement.estimatedLostRevenue,
                    onContactSupport: {
                        if let url = URL(string: "mailto:support@skedence.com?subject=Billing%20Help") {
                            openURL(url)
                        }
                    },
                    onDismiss: {
                        // Dismiss the paywall overlay (e.g., to view schedule read-only)
                        enforcement.billing = nil
                    }
                )
            }
        }
        .onAppear {
            
            if let orgId = auth.currentOrgId {
                enforcement.startMonitoring(organizationId: orgId)
            } else {
            }
        }
        .onChange(of: auth.currentOrgId) { _, newOrgId in
            if let orgId = newOrgId {
                enforcement.startMonitoring(organizationId: orgId)
            }
        }
    }
}

struct MoreView: View {
    @EnvironmentObject private var dependencies: AdminAppDependencies
    @State private var isSignUp: Bool = true
    @State private var isBusy: Bool = false
    @State private var showingEditProfile = false
    @State private var editFirstName = ""
    @State private var editLastName = ""
    @State private var editEmail = ""
    @State private var isSavingProfile = false
    @State private var profileError: String?
    
    // Convenience accessors
    private var auth: AuthManager { dependencies.auth }
    private var trainersService: TrainersService { dependencies.trainers }

    var body: some View {
        NavigationView {
            ScrollView {
                if auth.isAuthenticated {
                    VStack(spacing: Spacing.xl) {
                        // Profile Header
                        VStack(spacing: Spacing.md) {
                            // Avatar
                            if let photoURLString = auth.trainerPhotoURLString,
                               let url = URL(string: photoURLString) {
                                AsyncImage(url: url) { phase in
                                    switch phase {
                                    case .success(let image):
                                        image
                                            .resizable()
                                            .scaledToFill()
                                            .frame(width: 80, height: 80)
                                            .clipShape(Circle())
                                    case .failure(_):
                                        DefaultInitialsAvatar(initials: initials)
                                    case .empty:
                                        ProgressView()
                                            .frame(width: 80, height: 80)
                                    @unknown default:
                                        DefaultInitialsAvatar(initials: initials)
                                    }
                                }
                            } else {
                                DefaultInitialsAvatar(initials: initials)
                            }
                            
                            VStack(spacing: Spacing.xxs) {
                                Text(trainerName)
                                    .font(.headingLarge)
                                    .foregroundStyle(AppTheme.textPrimary)
                                
                                Text(auth.userEmail ?? "")
                                    .font(.bodyMedium)
                                    .foregroundStyle(AppTheme.textSecondary)
                            }
                            
                            // Show role badge (prioritize admin status over trainer)
                            if auth.currentOrgRole == "admin" || auth.currentOrgRole == "owner" {
                                BadgeView(text: "Admin", color: .blue)
                            } else if auth.isTrainer {
                                BadgeView(text: "Trainer", color: AppTheme.success)
                            }
                        }
                        .padding(.top, Spacing.xl)
                        
                        // Account Info Card
                        CardView {
                            VStack(alignment: .leading, spacing: Spacing.md) {
                                HStack {
                                    Text("Account Information")
                                        .font(.headingSmall)
                                        .foregroundStyle(AppTheme.textPrimary)
                                    
                                    Spacer()
                                    
                                    Button {
                                        editFirstName = auth.userFirstName ?? ""
                                        editLastName = auth.userLastName ?? ""
                                        editEmail = auth.userEmail ?? ""
                                        showingEditProfile = true
                                    } label: {
                                        Text("Edit")
                                            .font(.bodyMedium)
                                            .foregroundStyle(AppTheme.primary)
                                    }
                                }
                                
                                VStack(spacing: Spacing.sm) {
                                    InfoRow(label: "Name", value: trainerName)
                                    Divider()
                                    InfoRow(label: "Email", value: auth.userEmail ?? "Unknown")
                                    Divider()
                                    InfoRow(label: "Role", value: {
                                        if auth.currentOrgRole == "admin" || auth.currentOrgRole == "owner" {
                                            return "Admin"
                                        } else if auth.isTrainer {
                                            return "Trainer"
                                        }
                                        return "User"
                                    }())
                                    
                                    if let orgName = auth.organizationName {
                                        Divider()
                                        InfoRow(label: "Organization", value: orgName)
                                    }
                                }
                            }
                        }
                        .padding(.horizontal, Spacing.lg)
                        
                        // Share App Link Card
                        if let orgId = auth.currentOrgId {
                            ShareAppLinkCard(orgId: orgId)
                                .padding(.horizontal, Spacing.lg)
                        }
                        
                        // Sign Out Button
                        Button {
                            auth.signOut()
                        } label: {
                            HStack {
                                Image(systemName: "rectangle.portrait.and.arrow.right")
                                Text("Sign Out")
                            }
                        }
                        .buttonStyle(DestructiveButtonStyle())
                        .padding(.horizontal, Spacing.lg)
                        .padding(.top, Spacing.md)
                    }
                    .padding(.bottom, Spacing.xxxl)
                } else {
                    // Auth Screen
                    VStack(spacing: Spacing.xl) {
                        VStack(spacing: Spacing.sm) {
                            Image(systemName: "person.crop.circle.badge.checkmark")
                                .font(.system(size: 60))
                                .foregroundStyle(AppTheme.primary)
                            
                            Text("Welcome to Skedence")
                                .font(.headingLarge)
                                .foregroundStyle(AppTheme.textPrimary)
                            
                            Text("Sign in to manage your training schedule")
                                .font(.bodyMedium)
                                .foregroundStyle(AppTheme.textSecondary)
                                .multilineTextAlignment(.center)
                        }
                        .padding(.top, Spacing.xxxl)
                        
                        Picker("Mode", selection: $isSignUp) {
                            Text("Sign In").tag(false)
                            Text("Sign Up").tag(true)
                        }
                        .pickerStyle(.segmented)
                        .padding(.horizontal, Spacing.lg)
                        
                        CardView {
                            VStack(spacing: Spacing.md) {
                                TextField(
                                    "Email",
                                    text: Binding(
                                        get: { auth.emailInput },
                                        set: { auth.emailInput = $0 }
                                    )
                                )
                                    .textContentType(.emailAddress)
                                    .keyboardType(.emailAddress)
                                    .autocapitalization(.none)
                                    .disableAutocorrection(true)
                                    .padding(Spacing.sm)
                                    .background(Color(UIColor.systemGray6))
                                    .cornerRadius(CornerRadius.xs)
                                
                                SecureField(
                                    "Password",
                                    text: Binding(
                                        get: { auth.passwordInput },
                                        set: { auth.passwordInput = $0 }
                                    )
                                )
                                    .textContentType(.password)
                                    .padding(Spacing.sm)
                                    .background(Color(UIColor.systemGray6))
                                    .cornerRadius(CornerRadius.xs)
                                
                                if isSignUp {
                                    TextField(
                                        "First name",
                                        text: Binding(
                                            get: { auth.firstNameInput },
                                            set: { auth.firstNameInput = $0 }
                                        )
                                    )
                                        .textContentType(.givenName)
                                        .autocapitalization(.words)
                                        .padding(Spacing.sm)
                                        .background(Color(UIColor.systemGray6))
                                        .cornerRadius(CornerRadius.xs)
                                    
                                    TextField(
                                        "Last name",
                                        text: Binding(
                                            get: { auth.lastNameInput },
                                            set: { auth.lastNameInput = $0 }
                                        )
                                    )
                                        .textContentType(.familyName)
                                        .autocapitalization(.words)
                                        .padding(Spacing.sm)
                                        .background(Color(UIColor.systemGray6))
                                        .cornerRadius(CornerRadius.xs)
                                }
                                
                                Button {
                                    Task { await submitAuth(isSignUp: isSignUp) }
                                } label: {
                                    HStack(spacing: Spacing.xs) {
                                        if isBusy { ProgressView().tint(.white) }
                                        Text(isSignUp ? "Create Account" : "Sign In")
                                    }
                                }
                                .buttonStyle(PrimaryButtonStyle())
                                .disabled(isBusy || auth.emailInput.isEmpty || auth.passwordInput.isEmpty || (isSignUp && (auth.firstNameInput.isEmpty || auth.lastNameInput.isEmpty)))
                            }
                        }
                        .padding(.horizontal, Spacing.lg)
                        
                        if let error = auth.errorMessage, !error.isEmpty {
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
                    }
                    .padding(.bottom, Spacing.xxxl)
                }
            }
            .background(Color(UIColor.systemGroupedBackground).ignoresSafeArea())
            .navigationTitle("Account")
            .navigationBarTitleDisplayMode(.large)
            .sheet(isPresented: $showingEditProfile) {
                NavigationStack {
                    Form {
                        Section {
                            TextField("First Name", text: $editFirstName)
                                .textContentType(.givenName)
                                .autocapitalization(.words)
                            
                            TextField("Last Name", text: $editLastName)
                                .textContentType(.familyName)
                                .autocapitalization(.words)
                            
                            TextField("Email", text: $editEmail)
                                .textContentType(.emailAddress)
                                .keyboardType(.emailAddress)
                                .autocapitalization(.none)
                                .disableAutocorrection(true)
                        } header: {
                            Text("Profile Information")
                        } footer: {
                            Text("Changes to your email will require re-authentication")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        
                        if let error = profileError {
                            Section {
                                Text(error)
                                    .foregroundStyle(.red)
                                    .font(.caption)
                            }
                        }
                    }
                    .navigationTitle("Edit Profile")
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) {
                            Button("Cancel") {
                                showingEditProfile = false
                                profileError = nil
                            }
                        }
                        
                        ToolbarItem(placement: .confirmationAction) {
                            Button("Save") {
                                Task { await saveProfile() }
                            }
                            .disabled(isSavingProfile || editFirstName.isEmpty || editLastName.isEmpty || editEmail.isEmpty)
                        }
                    }
                }
            }
        }
        .navigationViewStyle(.stack)
    }
    
    // MARK: - Trainers Section
    
    private func saveProfile() async {
        isSavingProfile = true
        profileError = nil
        
        do {
            guard let userId = auth.userId else {
                profileError = "No user ID found"
                isSavingProfile = false
                return
            }
            
            // Update trainer document in Firestore
            try await Firestore.firestore()
                .collection("trainers")
                .document(userId)
                .updateData([
                    "firstName": editFirstName,
                    "lastName": editLastName,
                    "email": editEmail
                ])
            
            // Update email in Firebase Auth if changed (new flow sends verification before applying the change)
            if editEmail != auth.userEmail {
                if let user = Auth.auth().currentUser {
                    try await user.sendEmailVerification(beforeUpdatingEmail: editEmail)
                }
            }
            
            // Update auth manager state
            await MainActor.run {
                auth.firstNameInput = editFirstName
                auth.lastNameInput = editLastName
                auth.userFirstName = editFirstName
                auth.userLastName = editLastName
                auth.userEmail = editEmail
                isSavingProfile = false
                showingEditProfile = false
            }
            
        } catch {
            await MainActor.run {
                profileError = error.localizedDescription
                isSavingProfile = false
            }
        }
    }
    
    private var initials: String {
        let firstName = auth.firstNameInput.isEmpty ? (auth.userEmail?.prefix(1).uppercased() ?? "U") : String(auth.firstNameInput.prefix(1))
        let lastName = auth.lastNameInput.isEmpty ? "" : String(auth.lastNameInput.prefix(1))
        return "\(firstName)\(lastName)".uppercased()
    }
    
    private var trainerName: String {
        let firstName = auth.userFirstName ?? auth.firstNameInput
        let lastName = auth.userLastName ?? auth.lastNameInput
        
        if !firstName.isEmpty || !lastName.isEmpty {
            return "\(firstName) \(lastName)".trimmingCharacters(in: .whitespaces)
        }
        return auth.userEmail ?? "User"
    }

    private func submitAuth(isSignUp: Bool) async {
        isBusy = true
        defer { isBusy = false }
        if isSignUp {
            await auth.signUp()
        } else {
            await auth.signIn()
        }
    }
}

// Helper view for info rows
struct InfoRow: View {
    let label: String
    let value: String
    var copyable: Bool = false
    
    @State private var showCopied = false
    
    var body: some View {
        HStack {
            Text(label)
                .font(.bodyMedium)
                .foregroundStyle(AppTheme.textSecondary)
            Spacer()
            Text(value)
                .font(.bodyMedium)
                .foregroundStyle(AppTheme.textPrimary)
                .conditionalTextSelection(copyable)
            
            if copyable {
                Button {
                    UIPasteboard.general.string = value
                    showCopied = true
                    DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                        showCopied = false
                    }
                } label: {
                    Image(systemName: showCopied ? "checkmark.circle.fill" : "doc.on.doc")
                        .font(.bodyMedium)
                        .foregroundStyle(showCopied ? AppTheme.success : AppTheme.primary)
                }
                .buttonStyle(.plain)
            }
        }
    }
}

// Share App Link Card
struct ShareAppLinkCard: View {
    let orgId: String
    @State private var showCopied = false
    @State private var organizationCode: String?
    @State private var isLoading = true
    
    var body: some View {
        CardView {
            VStack(alignment: .leading, spacing: Spacing.md) {
                HStack {
                    Image(systemName: "arrow.down.app.fill")
                        .font(.title3)
                        .foregroundStyle(AppTheme.primary)
                    
                    Text("Share App with Clients")
                        .font(.headingSmall)
                        .foregroundStyle(AppTheme.textPrimary)
                    
                    Spacer()
                }
                
                Text("Send clients a link to download the app with your organization pre-filled")
                    .font(.bodySmall)
                    .foregroundStyle(AppTheme.textSecondary)
                
                if isLoading {
                    HStack {
                        ProgressView()
                        Text("Loading organization code...")
                            .font(.bodySmall)
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Spacing.sm)
                } else if let code = organizationCode {
                    VStack(spacing: Spacing.sm) {
                        // Deep Link
                        let deepLink = "skedence://register?orgCode=\(code)"
                        
                        HStack(spacing: Spacing.xs) {
                            Image(systemName: "link")
                                .font(.bodyMedium)
                                .foregroundStyle(AppTheme.textSecondary)
                            
                            Text(deepLink)
                                .font(.caption)
                                .foregroundStyle(AppTheme.textSecondary)
                                .lineLimit(1)
                                .truncationMode(.middle)
                            
                            Spacer()
                        }
                        .padding(Spacing.sm)
                        .background(Color(UIColor.systemGray6))
                        .cornerRadius(CornerRadius.xs)
                        
                        HStack(spacing: Spacing.sm) {
                            Button {
                                UIPasteboard.general.string = deepLink
                                showCopied = true
                                DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                                    showCopied = false
                                }
                            } label: {
                                HStack(spacing: Spacing.xs) {
                                    Image(systemName: showCopied ? "checkmark.circle.fill" : "doc.on.doc.fill")
                                    Text(showCopied ? "Copied!" : "Copy Link")
                                        .font(.bodySmall)
                                }
                                .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(SecondaryButtonStyle())
                            
                            Button {
                                let activityVC = UIActivityViewController(activityItems: [deepLink], applicationActivities: nil)
                                activityVC.completionWithItemsHandler = { _, completed, _, _ in
                                    if completed {
                                        Task {
                                            await markShareLinkComplete()
                                        }
                                    }
                                }
                                if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                                   let window = windowScene.windows.first,
                                   let rootVC = window.rootViewController {
                                    rootVC.present(activityVC, animated: true)
                                }
                            } label: {
                                HStack(spacing: Spacing.xs) {
                                    Image(systemName: "square.and.arrow.up.fill")
                                    Text("Share")
                                        .font(.bodySmall)
                                }
                                .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(PrimaryButtonStyle())
                        }
                        
                        // QR Code Section
                        Divider()
                            .padding(.vertical, Spacing.sm)
                        
                        VStack(spacing: Spacing.sm) {
                            Text("QR Code")
                                .font(.bodyMedium)
                                .foregroundStyle(AppTheme.textPrimary)
                            
                            if let qrImage = generateQRCode(from: deepLink) {
                                Image(uiImage: qrImage)
                                    .interpolation(.none)
                                    .resizable()
                                    .scaledToFit()
                                    .frame(width: 200, height: 200)
                                    .padding(Spacing.md)
                                    .background(Color.white)
                                    .cornerRadius(CornerRadius.md)
                                
                                Button {
                                    saveQRCodeToPhotos(qrImage)
                                } label: {
                                    HStack(spacing: Spacing.xs) {
                                        Image(systemName: "square.and.arrow.down.fill")
                                        Text("Save QR Code")
                                            .font(.bodySmall)
                                    }
                                    .frame(maxWidth: .infinity)
                                }
                                .buttonStyle(SecondaryButtonStyle())
                            } else {
                                Text("Unable to generate QR code")
                                    .font(.bodySmall)
                                    .foregroundStyle(AppTheme.error)
                            }
                        }
                    }
                } else {
                    Text("Unable to load organization code")
                        .font(.bodySmall)
                        .foregroundStyle(AppTheme.error)
                }
            }
        }
        .task {
            await loadOrganizationCode()
        }
    }
    
    private func loadOrganizationCode() async {
        isLoading = true
        defer { isLoading = false }
        
        do {
            #if canImport(FirebaseFirestore)
            let db = Firestore.firestore()
            let doc = try await db.collection("organizations").document(orgId).getDocument()
            
            if let data = doc.data(), let code = data["inviteCode"] as? String {
                organizationCode = code
            }
            #endif
        } catch {
        }
    }
    
    private func markShareLinkComplete() async {
        do {
            #if canImport(FirebaseFirestore)
            let db = Firestore.firestore()
            try await db.collection("organizations").document(orgId)
                .collection("onboarding").document("progress")
                .setData([
                    "hasSharedLink": true,
                    "hasInvitedClient": true  // Backwards compat
                ], merge: true)
            #endif
        } catch {
        }
    }
    
    private func generateQRCode(from string: String) -> UIImage? {
        let data = string.data(using: .utf8)
        
        guard let filter = CIFilter(name: "CIQRCodeGenerator") else { return nil }
        filter.setValue(data, forKey: "inputMessage")
        filter.setValue("H", forKey: "inputCorrectionLevel")
        
        guard let ciImage = filter.outputImage else { return nil }
        
        // Scale up the QR code for better quality
        let transform = CGAffineTransform(scaleX: 10, y: 10)
        let scaledImage = ciImage.transformed(by: transform)
        
        let context = CIContext()
        guard let cgImage = context.createCGImage(scaledImage, from: scaledImage.extent) else { return nil }
        
        return UIImage(cgImage: cgImage)
    }
    
    private func saveQRCodeToPhotos(_ image: UIImage) {
        UIImageWriteToSavedPhotosAlbum(image, nil, nil, nil)
        
        // Show a simple alert or toast (you can enhance this)
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let window = windowScene.windows.first,
           let rootVC = window.rootViewController {
            let alert = UIAlertController(title: "Saved!", message: "QR code saved to Photos", preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "OK", style: .default))
            rootVC.present(alert, animated: true)
        }
    }
}

// Helper to conditionally apply text selection without ternary type mismatch
private extension View {
    @ViewBuilder
    func conditionalTextSelection(_ enabled: Bool) -> some View {
        if enabled {
            self.textSelection(.enabled)
        } else {
            self.textSelection(.disabled)
        }
    }
}

// MARK: - Default Initials Avatar Component

private struct DefaultInitialsAvatar: View {
    let initials: String
    
    var body: some View {
        ZStack {
            Circle()
                .fill(
                    LinearGradient(
                        colors: [AppTheme.primary, AppTheme.primaryLight],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: 80, height: 80)
            
            Text(initials)
                .font(.displaySmall)
                .foregroundStyle(.white)
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(AdminAppDependencies())
}
