//
//  BusinessView.swift
//  SkedenceAdmin
//
//  Unified Business Management View
//  Combines team management, operations, financials, and settings
//

import SwiftUI

struct BusinessView: View {
    @EnvironmentObject private var dependencies: AdminAppDependencies
    @StateObject private var superAdminViewModel = SuperAdminViewModel()
    @State private var selectedSection: BusinessSection = .team
    @State private var selectedSubTab: SubTab = .organizations
    
    // Convenience accessors
    private var auth: AuthManager { dependencies.auth }
    private var adminService: AdminService { dependencies.admin }
    private var classesService: ClassesService { dependencies.classes }
    private var trainersService: TrainersService { dependencies.trainers }
    private var packagesService: PackagesService { dependencies.packages }
    private var pricingService: PricingStructureService { dependencies.pricing }
    private var locationsService: LocationsService { dependencies.locations }
    
    // State management
    @State private var showingCreateClass = false
    @State private var showingEditClass = false
    @State private var classToEdit: GroupClass?
    @State private var alertItem: AlertItem?
    @State private var showingCreateOrganization = false
    @State private var showingAddTrainer = false
    @State private var showingAddLocation = false
    @State private var locationToEdit: Location?
    @State private var organizationBilling: OrganizationBilling?
    
    // Pass management states
    @State private var selectedClient: SimpleUser?
    @State private var selectedPassType: String = ""
    @State private var selectedPassTitle: String = ""
    @State private var passQuantity: Int = 1
    @State private var passAction: PassAction = .add
    @State private var isAddingPass = false
    @State private var showingProcessPayment = false
    
    // Pricing structure states
    @State private var editingTiers: [PricingTier] = []
    @State private var isSavingPricing = false
    
    enum BusinessSection: String, CaseIterable {
        case team = "Team"
        case operations = "Operations"
    }
    
    enum SubTab: String {
        case organizations, trainers, members
        case passes, classes, locations, pricing
        case wallet
        case orgSettings
    }
    
    var body: some View {
        NavigationView {
            Group {
                if !auth.isAuthenticated {
                    ProgressView("Loading...")
                        .tint(AppTheme.primary)
                } else if !auth.isAdmin {
                    EmptyStateView(
                        icon: "lock.shield",
                        title: "Admin Access Required",
                        message: "You don't have permission to access this area."
                    )
                } else {
                    businessContent
                }
            }
            .navigationTitle("Business")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    toolbarButton
                }
            }
        }
        .navigationViewStyle(.stack)
        .task {
            await loadData()
        }
        .sheet(isPresented: $showingCreateOrganization) {
            CreateOrganizationView { orgId in
                Task {
                    await superAdminViewModel.loadOrganizations()
                }
            }
        }
        .sheet(isPresented: $showingAddTrainer) {
            AddTrainerView(
                orgId: auth.currentOrgId ?? "",
                orgName: superAdminViewModel.organizations.first?.name ?? "Your Organization"
            ) { trainerId in
                Task {
                    await superAdminViewModel.loadTrainers(orgId: auth.currentOrgId)
                }
            }
        }
        .sheet(isPresented: $showingCreateClass) {
            CreateClassView(adminService: adminService, trainersService: trainersService) {
                Task {
                    if let orgId = auth.currentOrgId {
                        await classesService.loadAllClasses(orgId: orgId)
                    }
                }
            }
        }
        .sheet(isPresented: $showingAddLocation) {
            AddEditLocationSheet(
                locationsService: locationsService,
                locationToEdit: locationToEdit,
                onSave: {
                    locationToEdit = nil
                }
            )
            .environmentObject(dependencies)
        }
        .sheet(isPresented: $showingProcessPayment) {
            if let client = selectedClient {
                ProcessPaymentView(client: client)
            }
        }
        .alert(item: $alertItem) { item in
            Alert(title: Text(item.title), message: Text(item.message), dismissButton: .default(Text("OK")))
        }
    }
    
    @ViewBuilder
    private var toolbarButton: some View {
        switch selectedSection {
        case .team:
            if selectedSubTab == .trainers {
                Button {
                    if canAddTrainer {
                        showingAddTrainer = true
                    } else {
                        alertItem = AlertItem(
                            title: "Trainer Limit Reached",
                            message: trainerLimitMessage
                        )
                    }
                } label: {
                    Text("Add Trainer")
                        .foregroundStyle(canAddTrainer ? AppTheme.primary : .gray)
                }
            }
        case .operations:
            if selectedSubTab == .classes {
                Button {
                    showingCreateClass = true
                } label: {
                    Image(systemName: "plus.circle.fill")
                        .font(.title3)
                        .foregroundStyle(AppTheme.primary)
                }
            } else if selectedSubTab == .locations {
                Button {
                    locationToEdit = nil
                    showingAddLocation = true
                } label: {
                    Image(systemName: "plus.circle.fill")
                        .font(.title3)
                        .foregroundStyle(AppTheme.primary)
                }
            }
        }
    }
    
    private var businessContent: some View {
        ScrollView {
            VStack(spacing: 0) {
                // Organization Code Card (always visible)
                OrganizationCodeCard(adminService: adminService, alertItem: $alertItem)
                    .padding(.horizontal)
                    .padding(.top)
                
                // Section Picker
                Picker("Section", selection: $selectedSection) {
                    ForEach(BusinessSection.allCases, id: \.self) { section in
                        Text(section.rawValue).tag(section)
                    }
                }
                .pickerStyle(.segmented)
                .padding()
                .onChange(of: selectedSection) { _, newSection in
                    updateSubTab(for: newSection)
                }
                
                // Sub-tab picker based on section
                if selectedSection == .team {
                    Picker("Team", selection: $selectedSubTab) {
                        Text("Organizations").tag(SubTab.organizations)
                        Text("Trainers").tag(SubTab.trainers)
                        Text("Members").tag(SubTab.members)
                    }
                    .pickerStyle(.segmented)
                    .padding(.horizontal)
                } else if selectedSection == .operations {
                    Picker("Operations", selection: $selectedSubTab) {
                        Text("Passes").tag(SubTab.passes)
                        Text("Classes").tag(SubTab.classes)
                        Text("Locations").tag(SubTab.locations)
                        Text("Pricing").tag(SubTab.pricing)
                        Text("Wallet").tag(SubTab.wallet)
                    }
                    .pickerStyle(.segmented)
                    .padding(.horizontal)
                }
                
                // Content based on selection
                Group {
                    switch (selectedSection, selectedSubTab) {
                    // TEAM SECTION
                    case (.team, .organizations):
                        OrganizationsSection(
                            organizations: superAdminViewModel.organizations,
                            isLoading: superAdminViewModel.isLoading,
                            billingPlan: auth.billingPlan,
                            isBillingBlocked: auth.isBillingBlocked,
                            currentOrgId: auth.currentOrgId,
                            isDeletingAccount: false,
                            onCreateOrganization: { showingCreateOrganization = true },
                            onShowDeleteConfirmation: { }
                        )
                        .environmentObject(dependencies)
                        
                    case (.team, .trainers):
                        TrainersSection(
                            trainers: superAdminViewModel.trainers,
                            isLoading: superAdminViewModel.isLoading,
                            canAddTrainer: canAddTrainer,
                            trainerLimit: trainerLimit,
                            trainerCount: superAdminViewModel.trainers.count,
                            onShowAvatarUpload: { },
                            onShowAddTrainer: { showingAddTrainer = true }
                        )
                        .environmentObject(dependencies)
                        
                    case (.team, .members):
                        UsersSection(
                            users: superAdminViewModel.allUsers,
                            isLoading: superAdminViewModel.isLoading
                        )
                        .environmentObject(dependencies)
                        
                    // OPERATIONS SECTION
                    case (.operations, .passes):
                        PassesTabView(
                            adminService: adminService,
                            pricingService: pricingService,
                            packagesService: packagesService,
                            selectedClient: $selectedClient,
                            selectedPassType: $selectedPassType,
                            selectedPassTitle: $selectedPassTitle,
                            passQuantity: $passQuantity,
                            passAction: $passAction,
                            isAddingPass: $isAddingPass,
                            alertItem: $alertItem
                        )
                        .environmentObject(dependencies)
                        
                    case (.operations, .classes):
                        ClassesTabView(
                            adminService: adminService,
                            classesService: classesService,
                            trainersService: trainersService,
                            classToEdit: $classToEdit,
                            isCreatingClass: $showingCreateClass
                        )
                        .environmentObject(dependencies)
                        
                    case (.operations, .locations):
                        LocationsTabView(
                            locationsService: locationsService,
                            locationToEdit: $locationToEdit,
                            showingAddLocation: $showingAddLocation,
                            alertItem: $alertItem,
                            organizationBilling: organizationBilling
                        )
                        .environmentObject(dependencies)
                        
                    case (.operations, .pricing):
                        PricingTabView(
                            pricingService: pricingService,
                            editingTiers: $editingTiers,
                            isSavingPricing: $isSavingPricing,
                            alertItem: $alertItem,
                            onTabChange: { _ in }
                        )
                        .environmentObject(dependencies)
                        
                    case (.operations, .wallet):
                        WalletTabView(
                            adminService: adminService,
                            selectedClient: $selectedClient,
                            showingProcessPayment: $showingProcessPayment
                        )
                        .environmentObject(dependencies)
                        
                    default:
                        EmptyView()
                    }
                }
                .padding(.bottom, Spacing.xxxl)
            }
        }
        .background(Color.platformGroupedBackground.ignoresSafeArea())
        .refreshable {
            await loadData()
        }
    }
    
    private func updateSubTab(for section: BusinessSection) {
        switch section {
        case .team:
            selectedSubTab = .organizations
        case .operations:
            selectedSubTab = .passes
        }
    }
    
    private func loadData() async {
        guard let orgId = auth.currentOrgId else { return }
        
        // Load organization data
        await auth.loadOrgBranding(orgId: orgId)
        await superAdminViewModel.loadOrganizations()
        await superAdminViewModel.loadTrainers(orgId: orgId)
        await superAdminViewModel.loadAllUsers()
        
        // Load admin panel data
        await adminService.loadOrganizationData(orgId: orgId)
        await classesService.loadAllClasses(orgId: orgId)
        await trainersService.loadAll(orgId: orgId)
        await adminService.loadAllUsers(orgId: orgId)
        await pricingService.loadPricingStructure(for: orgId)
        locationsService.loadLocations(orgId: orgId)
        organizationBilling = await adminService.fetchOrganizationBilling(orgId: orgId)
        
        // Set default pass selection
        if selectedPassType.isEmpty, let firstPackage = pricingService.allPackageOptions.first {
            selectedPassType = firstPackage.packageType
            selectedPassTitle = firstPackage.title
        }
    }
    
    // Trainer limits based on plan
    var trainerLimit: Int {
        switch auth.billingPlan.lowercased() {
        case "free": return 2
        case "starter": return 1
        case "studio": return 5
        case "academy": return 15
        case "enterprise": return 999
        default: return 2
        }
    }
    
    var canAddTrainer: Bool {
        return superAdminViewModel.trainers.count < trainerLimit
    }
    
    var trainerLimitMessage: String {
        "You have \(superAdminViewModel.trainers.count) of \(trainerLimit) trainers. Upgrade to add more."
    }
}

#Preview {
    BusinessView()
        .environmentObject(AdminAppDependencies())
}
