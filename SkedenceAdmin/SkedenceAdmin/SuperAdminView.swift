//
//  SuperAdminView.swift
//  SkedenceAdmin
//
//  Super Admin panel for managing organizations, trainers, and system-wide settings
//

import SwiftUI
import FirebaseFirestore
import FirebaseAuth

struct SuperAdminView: View {
    @EnvironmentObject var auth: AuthManager
    @StateObject private var viewModel = SuperAdminViewModel()
    @StateObject private var enforcement = SubscriptionEnforcementService()
    @StateObject private var onboardingCoordinator = OnboardingCoordinator()
    @State private var selectedTab: AdminTab = .organizations
    @State private var showingCreateOrganization = false
    @State private var showingAddTrainer = false
    @State private var showingPricing = false
    @State private var showingAvatarUpload = false
    @State private var alertItem: AlertItem?
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
                        organizationsContent
                    case .trainers:
                        trainersContent
                    case .users:
                        usersContent
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
                TrainerAvatarUploadView()
                    .environmentObject(auth)
            }
            .alert(item: $alertItem) { item in
                Alert(title: Text(item.title), message: Text(item.message))
            }
            .sheet(isPresented: $showingPricing) {
                NavigationStack {
                    PricingView(onPlanSelected: { selectedPlan in
                        Task { [enforcement] in
                            guard let orgId = auth.currentOrgId else { return }
                            guard let priceId = selectedPlan.stripePriceId else {
                                print("❌ Missing stripePriceId for plan: \(selectedPlan.id)")
                                return
                            }
                            
                            // Create Stripe Checkout session
                            if let checkoutUrl = await enforcement.createCheckoutSession(
                                organizationId: orgId,
                                priceId: priceId
                            ) {
                                await MainActor.run {
                                    showingPricing = false
                                    openURL(checkoutUrl)
                                }
                            }
                        }
                    })
                    .navigationBarItems(
                        trailing: Button("Cancel") {
                            showingPricing = false
                        }
                    )
                }
            }
        }
        .navigationViewStyle(.stack)
        .task {
            await loadData()
        }
    }
    
    // MARK: - Organizations Content
    
    private var organizationsContent: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            if viewModel.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity)
                    .padding()
            } else if viewModel.organizations.isEmpty {
                EmptyStateView(
                    icon: "building.2",
                    title: "No Organizations",
                    message: "Create an organization to get started",
                    action: { showingCreateOrganization = true },
                    actionTitle: "Create Organization"
                )
            } else {
                ForEach(viewModel.organizations) { org in
                    OrganizationCard(organization: org) {
                        // View/Edit organization
                    }
                }
                
                // Admin Management Cards
                Divider()
                    .padding(.vertical, Spacing.md)
                
                // Manage Subscription
                NavigationLink(destination: ManageSubscriptionView(orgId: auth.currentOrgId ?? "").environmentObject(auth)) {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Manage Subscription")
                                .font(.headingSmall)
                                .foregroundStyle(AppTheme.textPrimary)
                            Text("\(auth.billingPlan.capitalized) Plan")
                                .font(.bodyMedium)
                                .foregroundStyle(auth.isBillingBlocked ? .red : AppTheme.textSecondary)
                        }
                        Spacer()
                        Image(systemName: "chevron.right")
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                    .padding()
                    .background(Color(.systemBackground))
                    .cornerRadius(CornerRadius.md)
                    .shadow(color: Color.black.opacity(0.05), radius: 4, y: 2)
                }
                
                // Stripe Settings
                NavigationLink(destination: StripeSettingsViewDirect()
                    .environmentObject(auth)
                ) {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Stripe & Payments")
                                .font(.headingSmall)
                                .foregroundStyle(AppTheme.textPrimary)
                            Text("Accept payments & manage subscription")
                                .font(.bodyMedium)
                                .foregroundStyle(AppTheme.textSecondary)
                        }
                        Spacer()
                        Image(systemName: "creditcard")
                            .foregroundStyle(AppTheme.primary)
                        Image(systemName: "chevron.right")
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                    .padding()
                    .background(Color(.systemBackground))
                    .cornerRadius(CornerRadius.md)
                    .shadow(color: Color.black.opacity(0.05), radius: 4, y: 2)
                }
                
                // Contact Us
                Button {
                    if let url = URL(string: "mailto:support@skedence.com?subject=Support%20Request") {
                        openURL(url)
                    }
                } label: {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Contact Us")
                                .font(.headingSmall)
                                .foregroundStyle(AppTheme.textPrimary)
                            Text("Get help from our team")
                                .font(.bodyMedium)
                                .foregroundStyle(AppTheme.textSecondary)
                        }
                        Spacer()
                        Image(systemName: "envelope")
                            .foregroundStyle(AppTheme.primary)
                        Image(systemName: "chevron.right")
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                    .padding()
                    .background(Color(.systemBackground))
                    .cornerRadius(CornerRadius.md)
                    .shadow(color: Color.black.opacity(0.05), radius: 4, y: 2)
                }
                .buttonStyle(.plain)
                
                // Legal Section
                VStack(spacing: Spacing.sm) {
                    Button {
                        if let url = URL(string: "https://www.skedence.com/privacy-policy") {
                            openURL(url)
                        }
                    } label: {
                        HStack {
                            Text("Privacy Policy")
                                .font(.bodyMedium)
                                .foregroundStyle(AppTheme.textPrimary)
                            Spacer()
                            Image(systemName: "chevron.right")
                                .font(.caption)
                                .foregroundStyle(AppTheme.textSecondary)
                        }
                        .padding()
                        .background(Color(.systemBackground))
                        .cornerRadius(CornerRadius.md)
                        .shadow(color: Color.black.opacity(0.05), radius: 4, y: 2)
                    }
                    .buttonStyle(.plain)
                    
                    Button {
                        if let url = URL(string: "https://www.skedence.com/terms-of-service") {
                            openURL(url)
                        }
                    } label: {
                        HStack {
                            Text("Terms of Service")
                                .font(.bodyMedium)
                                .foregroundStyle(AppTheme.textPrimary)
                            Spacer()
                            Image(systemName: "chevron.right")
                                .font(.caption)
                                .foregroundStyle(AppTheme.textSecondary)
                        }
                        .padding()
                        .background(Color(.systemBackground))
                        .cornerRadius(CornerRadius.md)
                        .shadow(color: Color.black.opacity(0.05), radius: 4, y: 2)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .padding()
    }
    
    // MARK: - Trainers Content
    
    private var trainersContent: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            // Upload Trainer Avatar Card
            Button {
                showingAvatarUpload = true
            } label: {
                HStack {
                    Image(systemName: "person.crop.circle.badge.plus")
                        .font(.title2)
                        .foregroundStyle(AppTheme.primary)
                    
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Upload Trainer Avatar")
                            .font(.headingSmall)
                            .foregroundStyle(AppTheme.textPrimary)
                        
                        Text("Add or update trainer profile photos")
                            .font(.bodySmall)
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                    
                    Spacer()
                    
                    Image(systemName: "chevron.right")
                        .foregroundStyle(AppTheme.textSecondary)
                }
                .padding()
                .background(Color(.systemBackground))
                .cornerRadius(CornerRadius.md)
                .shadow(color: Color.black.opacity(0.05), radius: 4, y: 2)
            }
            
            Divider()
                .padding(.vertical, Spacing.sm)
            
            // Trainer limit banner
            if !canAddTrainer {
                HStack {
                    Image(systemName: "info.circle.fill")
                        .foregroundColor(.orange)
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Trainer Limit Reached")
                            .font(.headline)
                        Text("You have \(viewModel.trainers.count) of \(trainerLimit) trainers. Upgrade your plan to add more trainers.")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                    Button("Upgrade") {
                        showingPricing = true
                    }
                    .buttonStyle(.borderedProminent)
                }
                .padding()
                .background(Color.orange.opacity(0.1))
                .cornerRadius(CornerRadius.md)
            }
            
            if viewModel.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity)
                    .padding()
            } else if viewModel.trainers.isEmpty {
                EmptyStateView(
                    icon: "person.badge.plus",
                    title: "No Trainers",
                    message: "Add trainers to organizations",
                    action: { showingAddTrainer = true },
                    actionTitle: "Add Trainer"
                )
            } else {
                ForEach(viewModel.trainers) { trainer in
                    TrainerCard(trainer: trainer, viewModel: viewModel)
                }
            }
        }
        .padding()
    }
    
    // MARK: - Users Content
    
    private var usersContent: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            if viewModel.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity)
                    .padding()
            } else if viewModel.allUsers.isEmpty {
                EmptyStateView(
                    icon: "person.2",
                    title: "No Staff Members",
                    message: "Owners, admins, and trainers will appear here"
                )
            } else {
                ForEach(viewModel.allUsers) { user in
                    UserCard(user: user, viewModel: viewModel)
                }
            }
        }
        .padding()
    }
    
    private func loadData() async {
        await viewModel.loadOrganizations()
        await viewModel.loadTrainers(orgId: auth.currentOrgId)
        await viewModel.loadAllUsers()
    }
    
    private func configureCoordinatorForStripe() -> OnboardingCoordinator {
        let coordinator = OnboardingCoordinator()
        coordinator.orgId = auth.currentOrgId
        coordinator.userId = auth.userId
        if let orgId = auth.currentOrgId {
            // Fetch organization data to populate coordinator
            Task {
                if let org = viewModel.organizations.first(where: { $0.id == orgId }) {
                    coordinator.organizationData["name"] = org.name
                    coordinator.organizationData["stripeComplete"] = org.stripeAccountId != nil
                }
            }
        }
        return coordinator
    }
}

// MARK: - Organization Card

struct OrganizationCard: View {
    let organization: Organization
    let onTap: () -> Void
    @State private var showingEditName = false
    @State private var editedName = ""
    @State private var isSaving = false
    @State private var errorMessage: String?
    
    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(organization.name)
                        .font(.headingMedium)
                        .foregroundStyle(AppTheme.textPrimary)
                    
                    Text(organization.subscriptionPlan ?? "No plan")
                        .font(.bodySmall)
                        .foregroundStyle(AppTheme.textSecondary)
                }
                
                Spacer()
                
                Button {
                    editedName = organization.name
                    showingEditName = true
                } label: {
                    Image(systemName: "pencil.circle.fill")
                        .font(.title3)
                        .foregroundStyle(AppTheme.primary)
                }
                .buttonStyle(.plain)
                
                StatusBadge(
                    text: organization.subscriptionStatus ?? "unknown",
                    isActive: organization.subscriptionStatus == "active"
                )
            }
            
            if let stripeAccountId = organization.stripeAccountId {
                Label(stripeAccountId, systemImage: "creditcard")
                    .font(.caption)
                    .foregroundStyle(AppTheme.textTertiary)
            }
        }
        .padding(Spacing.md)
        .background(Color.platformBackground)
        .cornerRadius(CornerRadius.md)
        .shadow(color: Color.black.opacity(0.05), radius: 4, y: 2)
        .onTapGesture(perform: onTap)
        .alert("Edit Organization Name", isPresented: $showingEditName) {
            TextField("Organization Name", text: $editedName)
            Button("Cancel", role: .cancel) {}
            Button("Save") {
                Task {
                    await saveOrganizationName()
                }
            }
            .disabled(editedName.isEmpty)
        } message: {
            if let error = errorMessage {
                Text(error)
            } else {
                Text("Enter a new name for your organization")
            }
        }
    }
    
    private func saveOrganizationName() async {
        // Ensure we have a valid orgId and a meaningful new name
        guard let orgId = organization.id,
              !editedName.isEmpty,
              editedName != organization.name else { return }
        
        isSaving = true
        errorMessage = nil
        
        do {
            try await Firestore.firestore()
                .collection("organizations")
                .document(orgId)
                .updateData(["name": editedName])
            
            await MainActor.run {
                isSaving = false
                showingEditName = false
            }
        } catch {
            await MainActor.run {
                errorMessage = error.localizedDescription
                isSaving = false
            }
        }
    }
}

// MARK: - Trainer Card

struct TrainerCard: View {
    let trainer: AdminTrainer
    let viewModel: SuperAdminViewModel
    @State private var showingDeleteConfirmation = false
    @EnvironmentObject var auth: AuthManager
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(trainer.displayName)
                    .font(.headingSmall)
                    .foregroundStyle(AppTheme.textPrimary)
                
                if let email = trainer.email {
                    Text(email)
                        .font(.bodySmall)
                        .foregroundStyle(AppTheme.textSecondary)
                }
                
                if let orgName = trainer.organizationName {
                    Text(orgName)
                        .font(.caption)
                        .foregroundStyle(AppTheme.textTertiary)
                }
            }
            
            Spacer()
            
            StatusBadge(
                text: trainer.role ?? "trainer",
                isActive: trainer.active == true
            )
            
            Button {
                showingDeleteConfirmation = true
            } label: {
                Image(systemName: "trash")
                    .foregroundColor(.red)
                    .font(.body)
            }
            .buttonStyle(.plain)
        }
        .padding(Spacing.md)
        .background(Color.platformBackground)
        .cornerRadius(CornerRadius.md)
        .shadow(color: Color.black.opacity(0.05), radius: 4, y: 2)
        .alert("Delete Trainer?", isPresented: $showingDeleteConfirmation) {
            Button("Cancel", role: .cancel) {}
            Button("Delete", role: .destructive) {
                Task {
                    await viewModel.deleteTrainer(trainerId: trainer.id, orgId: auth.currentOrgId)
                }
            }
        } message: {
            Text("Are you sure you want to delete this trainer? Doing so will remove all of their information from your organization.")
        }
    }
}

// MARK: - User Card

struct UserCard: View {
    let user: AdminUser
    let viewModel: SuperAdminViewModel
    @State private var showingRoleSheet = false
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("\(user.firstName) \(user.lastName)")
                    .font(.headingSmall)
                    .foregroundStyle(AppTheme.textPrimary)
                
                if let email = user.emailAddress {
                    Text(email)
                        .font(.bodySmall)
                        .foregroundStyle(AppTheme.textSecondary)
                }
                
                if let orgName = user.organizationName {
                    Text(orgName)
                        .font(.caption)
                        .foregroundStyle(AppTheme.textTertiary)
                }
            }
            
            Spacer()
            
            Button {
                showingRoleSheet = true
            } label: {
                StatusBadge(
                    text: user.role ?? "member",
                    isActive: true
                )
            }
        }
        .padding(Spacing.md)
        .background(Color.platformBackground)
        .cornerRadius(CornerRadius.md)
        .shadow(color: Color.black.opacity(0.05), radius: 4, y: 2)
        .sheet(isPresented: $showingRoleSheet) {
            ChangeRoleSheet(user: user, viewModel: viewModel)
        }
    }
}

// MARK: - Status Badge

struct StatusBadge: View {
    let text: String
    let isActive: Bool
    
    var body: some View {
        Text(text.capitalized)
            .font(.labelSmall)
            .foregroundStyle(.white)
            .padding(.horizontal, Spacing.xs)
            .padding(.vertical, 4)
            .background(isActive ? AppTheme.success : AppTheme.textSecondary)
            .cornerRadius(CornerRadius.xs)
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
