//
//  AdminPanelView.swift
//  Skedence
//
//  Created by Assistant on 12/31/25.
//

import SwiftUI

enum PassAction: String, CaseIterable {
    case add = "Add"
    case remove = "Remove"
}

struct AdminPanelView: View {
    @EnvironmentObject private var dependencies: AdminAppDependencies
    
    // Convenience accessors
    private var auth: AuthManager { dependencies.auth }
    private var adminService: AdminService { dependencies.admin }
    private var classesService: ClassesService { dependencies.classes }
    private var trainersService: TrainersService { dependencies.trainers }
    private var packagesService: PackagesService { dependencies.packages }
    private var pricingService: PricingStructureService { dependencies.pricing }
    private var locationsService: LocationsService { dependencies.locations }
    
    @State private var showingCreateClass = false
    @State private var showingEditClass = false
    @State private var classToEdit: GroupClass?
    @State private var alertItem: AlertItem?
    @State private var tabSelection: AdminTab = .passes
    
    // Pass management states
    @State private var selectedClient: SimpleUser?
    @State private var selectedPassType: String = ""
    @State private var selectedPassTitle: String = ""
    @State private var passQuantity: Int = 1
    @State private var passAction: PassAction = .add
    @State private var isAddingPass = false
    
    // Pricing structure states
    @State private var editingTiers: [PricingTier] = []
    @State private var isSavingPricing = false
    
    // Location states
    @State private var showingAddLocation = false
    @State private var locationToEdit: Location?
    @State private var organizationBilling: OrganizationBilling?
    @State private var showingProcessPayment = false
    
    enum AdminTab: String, CaseIterable {
        case passes = "Passes"
        case classes = "Classes"
        case locations = "Locations"
        case wallet = "Wallet"
        case pricingStructure = "Pricing Structure"
        case settings = "Settings"
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
                    adminContent
                }
            }
            .navigationTitle("Admin Panel")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    if auth.isAdmin && tabSelection == .classes {
                        Button {
                            showingCreateClass = true
                        } label: {
                            Image(systemName: "plus.circle.fill")
                                .font(.title3)
                                .foregroundStyle(AppTheme.primary)
                        }
                    } else {
                        EmptyView()
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
                .environmentObject(dependencies)
            }
            .sheet(isPresented: $showingAddLocation) {
                AddEditLocationSheet(
                    locationsService: locationsService,
                    locationToEdit: locationToEdit,
                    onSave: {
                        locationToEdit = nil
                    }
                )
                .id(locationToEdit?.id ?? "new")
                .environmentObject(dependencies)
            }
            .sheet(isPresented: $showingProcessPayment) {
                if let client = selectedClient {
                    ProcessPaymentView(client: client)
                        .environmentObject(dependencies)
                }
            }
            .onChangeCompat(of: showingAddLocation) { newValue in
                if !newValue {
                    locationToEdit = nil
                }
            }
            .alert(item: $alertItem) { item in
                Alert(title: Text(item.title), message: Text(item.message))
            }
        }
        .navigationViewStyle(.stack)
        .task {
            if auth.isAdmin, let orgId = auth.currentOrgId {
                await adminService.loadOrganizationData(orgId: orgId)
                await classesService.loadAllClasses(orgId: orgId)
                await trainersService.loadAll(orgId: orgId)
                await adminService.loadAllUsers(orgId: orgId)
                await pricingService.loadPricingStructure(for: orgId)
                locationsService.loadLocations(orgId: orgId)
                organizationBilling = await adminService.fetchOrganizationBilling(orgId: orgId)
                
                // Set default pass selection to first package if none selected
                if selectedPassType.isEmpty, let firstPackage = pricingService.allPackageOptions.first {
                    selectedPassType = firstPackage.packageType
                    selectedPassTitle = firstPackage.title
                }
            }
        }
    }
    
    private var adminContent: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.xl) {
                // Organization Code Card
                OrganizationCodeCard(adminService: adminService, alertItem: $alertItem)
                
                // Tab selector
                Picker("Tab", selection: $tabSelection) {
                    Text("Passes").tag(AdminTab.passes)
                    Text("Classes").tag(AdminTab.classes)
                    Text("Locations").tag(AdminTab.locations)
                    Text("Wallet").tag(AdminTab.wallet)
                    Text("Pricing").tag(AdminTab.pricingStructure)
                    Text("Settings").tag(AdminTab.settings)
                }
                .pickerStyle(.segmented)
                .padding(.horizontal, Spacing.sm)
                .padding(.top, Spacing.md)
                
                // Content based on tab
                switch tabSelection {
                case .passes:
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
                case .classes:
                    ClassesTabView(
                        adminService: adminService,
                        classesService: classesService,
                        trainersService: trainersService,
                        classToEdit: $classToEdit,
                        isCreatingClass: $showingCreateClass
                    )
                    .environmentObject(dependencies)
                case .locations:
                    LocationsTabView(
                        locationsService: locationsService,
                        locationToEdit: $locationToEdit,
                        showingAddLocation: $showingAddLocation,
                        alertItem: $alertItem,
                        organizationBilling: organizationBilling
                    )
                    .environmentObject(dependencies)
                case .wallet:
                    WalletTabView(
                        adminService: adminService,
                        selectedClient: $selectedClient,
                        showingProcessPayment: $showingProcessPayment
                    )
                    .environmentObject(dependencies)
                case .pricingStructure:
                    PricingTabView(
                        pricingService: pricingService,
                        editingTiers: $editingTiers,
                        isSavingPricing: $isSavingPricing,
                        alertItem: $alertItem,
                        onTabChange: { _ in }
                    )
                    .environmentObject(dependencies)
                case .settings:
                    SettingsTabView()
                        .environmentObject(dependencies)
                }
            }
            .padding(.bottom, Spacing.xxxl)
        }
        .background(Color.platformGroupedBackground.ignoresSafeArea())
        .refreshable {
            guard let orgId = auth.currentOrgId else { return }
            if tabSelection == .classes {
                await classesService.loadAllClasses(orgId: orgId)
            } else {
                await adminService.loadAllUsers(orgId: orgId)
            }
        }
    }
}

// MARK: - Compatibility Helper

private extension View {
    @ViewBuilder
    func onChangeCompat<Value: Equatable>(of value: Value, perform action: @escaping (Value) -> Void) -> some View {
        if #available(iOS 17.0, *) {
            self.onChange(of: value) { _, newValue in
                action(newValue)
            }
        } else {
            self.onChangePreiOS17(of: value, perform: action)
        }
    }
    
    @available(iOS, introduced: 13.0, deprecated: 17.0)
    func onChangePreiOS17<Value: Equatable>(of value: Value, perform action: @escaping (Value) -> Void) -> some View {
        self.onChange(of: value, perform: action)
    }
}
