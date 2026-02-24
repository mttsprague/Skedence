//
//  SuperAdminView.swift
//  SkedenceAdmin
//
//  Super Admin panel for managing organizations, trainers, and system-wide settings
//

import SwiftUI
import FirebaseFirestore
import FirebaseAuth
import FirebaseFunctions

struct SuperAdminView: View {
    @EnvironmentObject private var dependencies: AdminAppDependencies
    @StateObject private var viewModel = SuperAdminViewModel()
    @StateObject private var onboardingCoordinator = OnboardingCoordinator()
    @State private var selectedTab: AdminTab = .organizations
    @State private var showingCreateOrganization = false
    @State private var showingAddTrainer = false
    
    // Convenience accessors
    private var auth: AuthManager { dependencies.auth }
    private var enforcement: SubscriptionEnforcementService { dependencies.enforcement }
    @State private var showingAvatarUpload = false
    @State private var alertItem: AlertItem?
    @State private var showingDeleteConfirmation = false
    @State private var isDeletingAccount = false
    @State private var showDeleteSuccessAlert = false
    @Environment(\.openURL) private var openURL
    
    enum AdminTab: String, CaseIterable {
        case organizations = "Organizations"
        case trainers = "Trainers"
        case users = "Members"
    }
    
    // Trainer limits based on plan
    var trainerLimit: Int {
        switch auth.billingPlan.lowercased() {
        case "free": return 2 // Owner + 1 trainer during trial
        case "starter": return 1
        case "studio": return 5
        case "academy": return 15
        case "enterprise": return 999
        default: return 2
        }
    }
    
    var canAddTrainer: Bool {
        return viewModel.trainers.count < trainerLimit
    }
    
    var trainerLimitMessage: String {
        "You have \(viewModel.trainers.count) of \(trainerLimit) trainers. Upgrade to add more."
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Tab Picker
                Picker("Admin Section", selection: $selectedTab) {
                    ForEach(AdminTab.allCases, id: \.self) { tab in
                        Text(tab.rawValue).tag(tab)
                    }
                }
                .pickerStyle(.segmented)
                .padding()
                
                // Content
                ScrollView {
                    switch selectedTab {
                    case .organizations:
                        OrganizationsSection(
                            organizations: viewModel.organizations,
                            isLoading: viewModel.isLoading,
                            billingPlan: auth.billingPlan,
                            isBillingBlocked: auth.isBillingBlocked,
                            currentOrgId: auth.currentOrgId,
                            isDeletingAccount: isDeletingAccount,
                            onCreateOrganization: { showingCreateOrganization = true },
                            onShowDeleteConfirmation: { showingDeleteConfirmation = true }
                        )
                        .environmentObject(dependencies)
                    case .trainers:
                        TrainersSection(
                            trainers: viewModel.trainers,
                            isLoading: viewModel.isLoading,
                            canAddTrainer: canAddTrainer,
                            trainerLimit: trainerLimit,
                            trainerCount: viewModel.trainers.count,
                            onShowAvatarUpload: {
                                print("🟢 onShowAvatarUpload closure called")
                                showingAvatarUpload = true
                                print("🟢 showingAvatarUpload set to true")
                            },
                            onShowAddTrainer: { showingAddTrainer = true }
                        )
                        .environmentObject(dependencies)
                    case .users:
                        UsersSection(
                            users: viewModel.allUsers,
                            isLoading: viewModel.isLoading
                        )
                        .environmentObject(dependencies)
                    }
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    if selectedTab == .trainers || selectedTab == .organizations {
                        Button {
                            if selectedTab == .trainers {
                                if canAddTrainer {
                                    showingAddTrainer = true
                                } else {
                                    alertItem = AlertItem(
                                        title: "Trainer Limit Reached",
                                        message: trainerLimitMessage
                                    )
                                }
                            } else if selectedTab == .organizations {
                                showingCreateOrganization = true
                            }
                        } label: {
                            if selectedTab == .trainers {
                                Text("Add Trainer")
                                    .foregroundStyle(canAddTrainer ? AppTheme.primary : .gray)
                            } else {
                                Image(systemName: "plus.circle.fill")
                                    .font(.title3)
                                    .foregroundStyle(AppTheme.primary)
                            }
                        }
                    }
                }
            }
            .sheet(isPresented: $showingCreateOrganization) {
                CreateOrganizationView { orgId in
                    Task {
                        await viewModel.loadOrganizations()
                    }
                }
            }
            .sheet(isPresented: $showingAddTrainer) {
                AddTrainerView(
                    orgId: auth.currentOrgId ?? "",
                    orgName: viewModel.organizations.first?.name ?? "Your Organization"
                ) { trainerId in
                    Task {
                        await viewModel.loadTrainers(orgId: auth.currentOrgId)
                    }
                }
            }
            .sheet(isPresented: $showingAvatarUpload) {
                print("🟡 Sheet presenting: showingAvatarUpload = \(showingAvatarUpload)")
                TrainerAvatarUploadView()
                    .environmentObject(dependencies)
            }
            .alert(item: $alertItem) { item in
                Alert(title: Text(item.title), message: Text(item.message))
            }
            .alert("Delete Account", isPresented: $showingDeleteConfirmation) {
                Button("Cancel", role: .cancel) { }
                Button("Delete", role: .destructive) {
                    deleteAccount()
                }
            } message: {
                Text("Are you sure you want to delete your account? All saved info will be permanently deleted.")
            }
            .alert("Account Deleted", isPresented: $showDeleteSuccessAlert) {
                Button("OK", role: .cancel) { }
            } message: {
                Text("Your account has been successfully deleted. You will now be signed out.")
            }
        }
        .navigationViewStyle(.stack)
        .task {
            await loadData()
        }
    }
    
    private func loadData() async {
        // Reload organization billing/branding to ensure Business tab shows latest plan
        if let orgId = auth.currentOrgId {
            await auth.loadOrgBranding(orgId: orgId)
        }
        
        await viewModel.loadOrganizations()
        await viewModel.loadTrainers(orgId: auth.currentOrgId)
        await viewModel.loadAllUsers()
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
                
                // Show success alert before signing out
                await MainActor.run {
                    isDeletingAccount = false
                    showDeleteSuccessAlert = true
                }
                
                // Wait a moment for user to see the alert
                try await Task.sleep(nanoseconds: 1_500_000_000) // 1.5 seconds
                
                // Sign out and return to login
                try Auth.auth().signOut()
                
            } catch {
                await MainActor.run {
                    isDeletingAccount = false
                    alertItem = AlertItem(
                        title: "Delete Failed",
                        message: error.localizedDescription
                    )
                }
            }
        }
    }
    
    private func configureCoordinatorForStripe() -> OnboardingCoordinator {
        let coordinator = OnboardingCoordinator()
        coordinator.data.orgId = auth.currentOrgId
        coordinator.data.userId = auth.userId
        if let orgId = auth.currentOrgId {
            // Fetch organization data to populate coordinator
            Task {
                if let org = viewModel.organizations.first(where: { $0.id == orgId }) {
                    coordinator.data.organizationName = org.name
                    coordinator.data.stripeComplete = org.stripeAccountId != nil
                    coordinator.data.stripeAccountId = org.stripeAccountId
                }
            }
        }
        return coordinator
    }
}


// MARK: - Create Organization View

struct CreateOrganizationView: View {
    @Environment(\.dismiss) var dismiss
    @StateObject private var viewModel = CreateOrgViewModel()
    let onCreated: (String) -> Void
    
    @State private var organizationName = ""
    @State private var ownerEmail = ""
    @State private var ownerFirstName = ""
    @State private var ownerLastName = ""
    @State private var selectedPlan = "enterprise"
    @State private var isFree = true
    @State private var isCreating = false
    
    let plans = ["starter", "professional", "enterprise"]
    
    var body: some View {
        NavigationView {
            Form {
                Section("Organization Details") {
                    TextField("Organization Name", text: $organizationName)
                    Picker("Subscription Plan", selection: $selectedPlan) {
                        ForEach(plans, id: \.self) { plan in
                            Text(plan.capitalized).tag(plan)
                        }
                    }
                    Toggle("Free Account (No Billing)", isOn: $isFree)
                }
                
                Section("Owner Information") {
                    TextField("Email", text: $ownerEmail)
                        .textInputAutocapitalization(.never)
                        .keyboardType(.emailAddress)
                    TextField("First Name", text: $ownerFirstName)
                    TextField("Last Name", text: $ownerLastName)
                }
                
                if let error = viewModel.errorMessage {
                    Section {
                        Text(error)
                            .foregroundStyle(.red)
                            .font(.caption)
                    }
                }
            }
            .navigationTitle("Create Organization")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Create") {
                        Task {
                            await createOrganization()
                        }
                    }
                    .disabled(isCreating || organizationName.isEmpty || ownerEmail.isEmpty)
                }
            }
        }
    }
    
    private func createOrganization() async {
        isCreating = true
        
        if let orgId = await viewModel.createOrganization(
            name: organizationName,
            plan: selectedPlan,
            isFree: isFree,
            ownerEmail: ownerEmail,
            ownerFirstName: ownerFirstName,
            ownerLastName: ownerLastName
        ) {
            await MainActor.run {
                onCreated(orgId)
                dismiss()
            }
        }
        
        isCreating = false
    }
}

// MARK: - Add Trainer View

struct AddTrainerView: View {
    @Environment(\.dismiss) var dismiss
    @StateObject private var viewModel = AddTrainerViewModel()
    let orgId: String
    let orgName: String
    let onAdded: (String) -> Void
    
    @State private var trainerEmail = ""
    @State private var trainerFirstName = ""
    @State private var trainerLastName = ""
    @State private var trainerRole = "trainer"
    @State private var isAdding = false
    
    let roles = ["trainer", "admin", "owner"]
    
    var body: some View {
        NavigationView {
            Form {
                Section("Organization") {
                    HStack {
                        Text("Organization")
                            .foregroundStyle(AppTheme.textSecondary)
                        Spacer()
                        Text(orgName)
                            .foregroundStyle(AppTheme.textPrimary)
                    }
                }
                
                Section("Trainer Information") {
                    TextField("Email", text: $trainerEmail)
                        .textInputAutocapitalization(.never)
                        .keyboardType(.emailAddress)
                    TextField("First Name", text: $trainerFirstName)
                    TextField("Last Name", text: $trainerLastName)
                    Picker("Role", selection: $trainerRole) {
                        ForEach(roles, id: \.self) { role in
                            Text(role.capitalized).tag(role)
                        }
                    }
                }
                
                Section {
                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        Label("How Login Works", systemImage: "info.circle")
                            .font(.labelLarge)
                            .foregroundStyle(AppTheme.primary)
                        
                        Text("The trainer will need to download the SkedenceAdmin app and register with the email address you entered above. Their account will be automatically linked to your organization.")
                            .font(.caption)
                            .foregroundStyle(AppTheme.textSecondary)
                        
                        Text("Make sure to tell them to use the exact email: \(trainerEmail)")
                            .font(.caption)
                            .foregroundStyle(AppTheme.textPrimary)
                            .padding(.top, 4)
                    }
                    .padding(.vertical, Spacing.xs)
                }
                
                if let error = viewModel.errorMessage {
                    Section {
                        Text(error)
                            .foregroundStyle(.red)
                            .font(.caption)
                    }
                }
            }
            .navigationTitle("Add Trainer")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Add") {
                        Task {
                            await addTrainer()
                        }
                    }
                    .disabled(isAdding || orgId.isEmpty || trainerEmail.isEmpty || trainerFirstName.isEmpty || trainerLastName.isEmpty)
                }
            }
        }
    }
    
    private func addTrainer() async {
        isAdding = true
        
        if let trainerId = await viewModel.addTrainer(
            orgId: orgId,
            email: trainerEmail,
            firstName: trainerFirstName,
            lastName: trainerLastName,
            role: trainerRole
        ) {
            await MainActor.run {
                onAdded(trainerId)
                dismiss()
            }
        }
        
        isAdding = false
    }
}

// MARK: - Change Role Sheet

struct ChangeRoleSheet: View {
    @Environment(\.dismiss) var dismiss
    let user: AdminUser
    let viewModel: SuperAdminViewModel
    @State private var selectedRole: String
    @State private var isUpdating = false
    
    let roles = ["member", "trainer", "admin", "owner"]
    
    init(user: AdminUser, viewModel: SuperAdminViewModel) {
        self.user = user
        self.viewModel = viewModel
        _selectedRole = State(initialValue: user.role ?? "member")
    }
    
    var body: some View {
        NavigationView {
            Form {
                Section("Change Role for \(user.firstName) \(user.lastName)") {
                    Picker("Role", selection: $selectedRole) {
                        ForEach(roles, id: \.self) { role in
                            Text(role.capitalized).tag(role)
                        }
                    }
                    .pickerStyle(.inline)
                }
            }
            .navigationTitle("Change Role")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") {
                        Task {
                            await updateRole()
                        }
                    }
                    .disabled(isUpdating || selectedRole == user.role)
                }
            }
        }
    }
    
    private func updateRole() async {
        isUpdating = true
        await viewModel.updateUserRole(userId: user.id, orgId: user.orgId, newRole: selectedRole)
        isUpdating = false
        dismiss()
    }
}

// MARK: - Alert Item

struct AlertItem: Identifiable {
    let id = UUID()
    let title: String
    let message: String
}

#Preview {
    SuperAdminView()
        .environmentObject(AuthManager())
}
