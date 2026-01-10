//
//  AdminPanelView.swift
//  Skedence
//
//  Created by Assistant on 12/31/25.
//

import SwiftUI

struct AdminPanelView: View {
    @EnvironmentObject var auth: AuthManager
    @StateObject private var adminService = AdminService()
    @StateObject private var classesService = ClassesService()
    @StateObject private var trainersService = TrainersService()
    @StateObject private var packagesService = PackagesService()
    @StateObject private var pricingService = PricingStructureService()
    @StateObject private var locationsService = LocationsService()
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
    @State private var showingManageSubscription = false
    
    enum AdminTab: String, CaseIterable {
        case passes = "Passes"
        case classes = "Classes"
        case locations = "Locations"
        case wallet = "Wallet"
        case pricingStructure = "Pricing Structure"
    }
    
    enum PassAction: String, CaseIterable {
        case add = "Add"
        case remove = "Remove"
    }
    
    var body: some View {
        NavigationView {
            Group {
                if adminService.isLoading {
                    ProgressView("Checking permissions...")
                        .tint(AppTheme.primary)
                } else if !adminService.isAdmin {
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
                    if adminService.isAdmin && tabSelection == .classes {
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
            }
            .sheet(item: $classToEdit) { classItem in
                EditClassView(
                    classItem: classItem,
                    adminService: adminService,
                    trainersService: trainersService
                ) {
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
                .environmentObject(auth)
            }
            .sheet(isPresented: $showingManageSubscription) {
                ManageSubscriptionView(orgId: auth.currentOrgId ?? "")
                    .environmentObject(auth)
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
            await adminService.checkAdminStatus()
            if adminService.isAdmin, let orgId = auth.currentOrgId {
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
                organizationCodeCard
                
                // Tab selector
                Picker("Tab", selection: $tabSelection) {
                    Text("Passes").tag(AdminTab.passes)
                    Text("Classes").tag(AdminTab.classes)
                    Text("Locations").tag(AdminTab.locations)
                    Text("Wallet").tag(AdminTab.wallet)
                    Text("Pricing").tag(AdminTab.pricingStructure)
                }
                .pickerStyle(.segmented)
                .padding(.horizontal, Spacing.lg)
                .padding(.top, Spacing.md)
                
                // Content based on tab
                if tabSelection == .passes {
                    passesContent
                } else if tabSelection == .locations {
                    locationsContent
                } else if tabSelection == .wallet {
                    walletContent
                } else if tabSelection == .pricingStructure {
                    pricingStructureContent
                } else {
                    classesContent
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
    
    // MARK: - Passes Content
    
    private var organizationCodeCard: some View {
        CardView {
            VStack(alignment: .leading, spacing: Spacing.md) {
                HStack {
                    Image(systemName: "building.2.fill")
                        .font(.title3)
                        .foregroundStyle(AppTheme.primary)
                    
                    Text("Organization Code")
                        .font(.headingMedium)
                        .foregroundStyle(AppTheme.textPrimary)
                    
                    Spacer()
                }
                
                Text("Share this code with new clients to allow them to register")
                    .font(.bodySmall)
                    .foregroundStyle(AppTheme.textSecondary)
                
                if let orgData = adminService.organizationData,
                   let inviteCode = orgData["inviteCode"] as? String {
                    
                    HStack(spacing: Spacing.md) {
                        // Large code display
                        Text(inviteCode)
                            .font(.system(size: 32, weight: .bold, design: .rounded))
                            .foregroundStyle(AppTheme.primary)
                            .tracking(4)
                            .padding(.vertical, Spacing.md)
                            .padding(.horizontal, Spacing.lg)
                            .background(
                                RoundedRectangle(cornerRadius: CornerRadius.md)
                                    .fill(AppTheme.primary.opacity(0.1))
                            )
                        
                        VStack(spacing: Spacing.sm) {
                            // Copy button
                            Button {
                                #if os(iOS)
                                UIPasteboard.general.string = inviteCode
                                #elseif os(macOS)
                                NSPasteboard.general.clearContents()
                                NSPasteboard.general.setString(inviteCode, forType: .string)
                                #endif
                                
                                alertItem = AlertItem(
                                    title: "Copied!",
                                    message: "Organization code copied to clipboard"
                                )
                            } label: {
                                HStack {
                                    Image(systemName: "doc.on.doc.fill")
                                    Text("Copy")
                                        .font(.bodySmall)
                                }
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, Spacing.sm)
                                .padding(.horizontal, Spacing.md)
                                .background(AppTheme.primary)
                                .foregroundStyle(.white)
                                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.sm))
                            }
                            
                            // Share button
                            #if os(iOS)
                            ShareLink(item: "Join our organization with code: \(inviteCode)") {
                                HStack {
                                    Image(systemName: "square.and.arrow.up.fill")
                                    Text("Share")
                                        .font(.bodySmall)
                                }
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, Spacing.sm)
                                .padding(.horizontal, Spacing.md)
                                .background(AppTheme.secondary)
                                .foregroundStyle(.white)
                                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.sm))
                            }
                            #endif
                        }
                        .frame(width: 100)
                    }
                } else {
                    HStack {
                        ProgressView()
                        Text("Loading organization code...")
                            .font(.bodyMedium)
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                }
            }
            .padding(Spacing.lg)
        }
        .padding(.horizontal, Spacing.lg)
        .padding(.top, Spacing.md)
    }
    
    private var passesContent: some View {
        VStack(alignment: .leading, spacing: Spacing.xl) {
            VStack(alignment: .leading, spacing: Spacing.sm) {
                Text("Manage Passes")
                    .font(.headingLarge)
                    .foregroundStyle(AppTheme.textPrimary)
                
                Text(passAction == .add ? "Add lesson passes to client accounts" : "Remove lesson passes from client accounts")
                    .font(.bodyMedium)
                    .foregroundStyle(AppTheme.textSecondary)
            }
            .padding(.horizontal, Spacing.lg)
            
            CardView {
                VStack(alignment: .leading, spacing: Spacing.lg) {
                    // Client selection
                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        Text("Select Client")
                            .font(.labelMedium)
                            .foregroundStyle(AppTheme.textSecondary)
                        
                        Menu {
                            ForEach(adminService.allUsers) { user in
                                Button {
                                    selectedClient = user
                                } label: {
                                    VStack(alignment: .leading) {
                                        Text("\(user.firstName) \(user.lastName)")
                                        if !user.athleteName.isEmpty {
                                            Text("Athlete: \(user.athleteName)")
                                                .font(.caption)
                                        }
                                    }
                                }
                            }
                        } label: {
                            HStack {
                                Text(selectedClient != nil ? "\(selectedClient!.firstName) \(selectedClient!.lastName)" : "Choose a client")
                                    .font(.bodyMedium)
                                    .foregroundStyle(selectedClient != nil ? AppTheme.textPrimary : AppTheme.textSecondary)
                                Spacer()
                                Image(systemName: "chevron.up.chevron.down")
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundStyle(AppTheme.textTertiary)
                            }
                            .padding(Spacing.sm)
                            .background(
                                RoundedRectangle(cornerRadius: CornerRadius.xs, style: .continuous)
                                    .fill(Color.platformGroupedBackground)
                            )
                        }
                    }
                    
                    Divider()
                    
                    // Pass type selection (dynamic from pricing structure)
                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        Text("Pass Type")
                            .font(.labelMedium)
                            .foregroundStyle(AppTheme.textSecondary)
                        
                        if pricingService.isLoading {
                            ProgressView()
                                .frame(maxWidth: .infinity, alignment: .center)
                                .padding(Spacing.sm)
                        } else {
                            Menu {
                                ForEach(pricingService.allPackageOptions) { package in
                                    Button {
                                        selectedPassType = package.packageType // Store packageType for database
                                        selectedPassTitle = package.title // Store title for display
                                    } label: {
                                        HStack {
                                            Text(package.title)
                                            Text(package.formattedPrice)
                                                .foregroundStyle(.secondary)
                                        }
                                    }
                                }
                            } label: {
                                HStack {
                                    Text(selectedPassTitle.isEmpty ? "Select a pass type" : selectedPassTitle)
                                        .font(.bodyMedium)
                                        .foregroundStyle(selectedPassTitle.isEmpty ? AppTheme.textTertiary : AppTheme.textPrimary)
                                    Spacer()
                                    Image(systemName: "chevron.up.chevron.down")
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundStyle(AppTheme.textTertiary)
                                }
                                .padding(Spacing.sm)
                                .background(
                                    RoundedRectangle(cornerRadius: CornerRadius.xs, style: .continuous)
                                        .fill(Color.platformGroupedBackground)
                                )
                            }
                        }
                    }
                    
                    Divider()
                    
                    // Add or Remove selection
                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        Text("Action")
                            .font(.labelMedium)
                            .foregroundStyle(AppTheme.textSecondary)
                        
                        Picker("Action", selection: $passAction) {
                            Text("Add Passes").tag(PassAction.add)
                            Text("Remove Passes").tag(PassAction.remove)
                        }
                        .pickerStyle(.segmented)
                        .padding(Spacing.xxs)
                        .background(
                            RoundedRectangle(cornerRadius: CornerRadius.xs, style: .continuous)
                                .fill(Color.platformGroupedBackground)
                        )
                    }
                    
                    Divider()
                    
                    // Quantity input
                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        Text("Number of Passes")
                            .font(.labelMedium)
                            .foregroundStyle(AppTheme.textSecondary)
                        
                        Stepper(value: $passQuantity, in: 1...100) {
                            HStack {
                                Text("\(passQuantity) pass\(passQuantity == 1 ? "" : "es")")
                                    .font(.headingSmall)
                                    .foregroundStyle(AppTheme.primary)
                                Spacer()
                            }
                        }
                        .padding(Spacing.sm)
                        .background(
                            RoundedRectangle(cornerRadius: CornerRadius.xs, style: .continuous)
                                .fill(AppTheme.primary.opacity(0.08))
                        )
                    }
                    
                    // Submit button
                    Button {
                        Task {
                            if passAction == .add {
                                await addPassToClient()
                            } else {
                                await removePassFromClient()
                            }
                        }
                    } label: {
                        HStack {
                            if isAddingPass {
                                ProgressView()
                                    .tint(.white)
                            } else {
                                Image(systemName: passAction == .add ? "plus.circle.fill" : "minus.circle.fill")
                            }
                            Text(isAddingPass ? (passAction == .add ? "Adding Pass..." : "Removing Pass...") : (passAction == .add ? "Add Pass to Client" : "Remove Pass from Client"))
                        }
                    }
                    .buttonStyle(PrimaryButtonStyle())
                    .disabled(selectedClient == nil || isAddingPass)
                    .opacity(selectedClient != nil ? 1.0 : 0.5)
                }
            }
            .padding(.horizontal, Spacing.lg)
        }
    }
    
    // MARK: - Classes Content
    
    private var classesContent: some View {
        VStack(alignment: .leading, spacing: Spacing.xl) {
            VStack(alignment: .leading, spacing: Spacing.sm) {
                Text("Manage Classes")
                    .font(.headingLarge)
                    .foregroundStyle(AppTheme.textPrimary)
                
                Text("\(classesService.classes.count) active classes")
                    .font(.bodyMedium)
                    .foregroundStyle(AppTheme.textSecondary)
            }
            .padding(.horizontal, Spacing.lg)
            
            if classesService.isLoading {
                HStack {
                    Spacer()
                    ProgressView()
                        .tint(AppTheme.primary)
                    Spacer()
                }
                .padding(Spacing.xl)
            } else if classesService.classes.isEmpty {
                EmptyStateView(
                    icon: "calendar.badge.plus",
                    title: "No Classes Yet",
                    message: "Create your first class to get started.",
                    action: { showingCreateClass = true },
                    actionTitle: "Create Class"
                )
                .padding(.horizontal, Spacing.lg)
            } else {
                VStack(spacing: Spacing.sm) {
                    ForEach(classesService.classes) { classItem in
                        AdminClassCard(
                            classItem: classItem,
                            onTap: {
                                classToEdit = classItem
                            },
                            onToggleRegistration: { isOpen in
                                Task {
                                    do {
                                        try await adminService.toggleClassRegistration(
                                            classId: classItem.id ?? "",
                                            isOpen: isOpen
                                        )
                                        if let orgId = auth.currentOrgId {
                                            await classesService.loadAllClasses(orgId: orgId)
                                        }
                                    } catch {
                                        alertItem = AlertItem(
                                            title: "Error",
                                            message: error.localizedDescription
                                        )
                                    }
                                }
                            },
                            onDelete: {
                                Task {
                                    do {
                                        guard let orgId = auth.currentOrgId else { return }
                                        try await adminService.deleteClass(classId: classItem.id ?? "", orgId: orgId)
                                        await classesService.loadAllClasses(orgId: orgId)
                                    } catch {
                                        alertItem = AlertItem(
                                            title: "Error",
                                            message: error.localizedDescription
                                        )
                                    }
                                }
                            }
                        )
                    }
                }
                .padding(.horizontal, Spacing.lg)
            }
        }
    }
    
    // MARK: - Helper Functions
    
    // passTypeName function removed - now using dynamic titles directly
    
    private func addPassToClient() async {
        guard let client = selectedClient else { return }
        
        isAddingPass = true
        
        do {
            try await adminService.addPassToClient(
                clientId: client.id,
                passType: selectedPassType,
                totalLessons: passQuantity
            )
            
            // Show success alert
            alertItem = AlertItem(
                title: "Pass Added",
                message: "Successfully added \(passQuantity) \(selectedPassTitle)\(passQuantity == 1 ? "" : "s") to \(client.firstName) \(client.lastName)'s account."
            )
            
            // Reset selections
            selectedClient = nil
            selectedPassType = ""
            selectedPassTitle = ""
            passQuantity = 1
            
            // Refresh data
            if let orgId = auth.currentOrgId {
                await adminService.loadAllUsers(orgId: orgId)
            }
            await packagesService.loadMyPackages()
            
        } catch {
            alertItem = AlertItem(
                title: "Error",
                message: "Failed to add pass: \(error.localizedDescription)"
            )
        }
        
        isAddingPass = false
    }
    
    private func removePassFromClient() async {
        guard let client = selectedClient else { return }
        
        isAddingPass = true
        
        do {
            try await adminService.removePassFromClient(
                clientId: client.id,
                passType: selectedPassType,
                lessonsToRemove: passQuantity
            )
            
            // Show success alert
            alertItem = AlertItem(
                title: "Pass Removed",
                message: "Successfully removed \(passQuantity) pass\(passQuantity == 1 ? "" : "es") from \(client.firstName) \(client.lastName)'s account."
            )
            
            // Reset selections
            selectedClient = nil
            selectedPassType = ""
            selectedPassTitle = ""
            passQuantity = 1
            passAction = .add
            
            // Refresh data
            if let orgId = auth.currentOrgId {
                await adminService.loadAllUsers(orgId: orgId)
            }
            await packagesService.loadMyPackages()
            
        } catch {
            alertItem = AlertItem(
                title: "Error",
                message: "Failed to remove pass: \(error.localizedDescription)"
            )
        }
        
        isAddingPass = false
    }
    
    // MARK: - Wallet Content
    
    private var walletContent: some View {
        VStack(alignment: .leading, spacing: Spacing.xl) {
            VStack(alignment: .leading, spacing: Spacing.sm) {
                Text("Client Wallet")
                    .font(.headingLarge)
                    .foregroundStyle(AppTheme.textPrimary)
                
                Text("Process payments and manage payment methods")
                    .font(.bodyMedium)
                    .foregroundStyle(AppTheme.textSecondary)
            }
            .padding(.horizontal, Spacing.lg)
            
            CardView {
                VStack(alignment: .leading, spacing: Spacing.lg) {
                    // Client selection
                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        Text("Select Client")
                            .font(.labelMedium)
                            .foregroundStyle(AppTheme.textSecondary)
                        
                        Menu {
                            ForEach(adminService.allUsers) { user in
                                Button {
                                    selectedClient = user
                                } label: {
                                    VStack(alignment: .leading) {
                                        Text("\(user.firstName) \(user.lastName)")
                                        if !user.athleteName.isEmpty {
                                            Text("Athlete: \(user.athleteName)")
                                                .font(.caption)
                                        }
                                    }
                                }
                            }
                        } label: {
                            HStack {
                                Text(selectedClient != nil ? "\(selectedClient!.firstName) \(selectedClient!.lastName)" : "Choose a client")
                                    .font(.bodyMedium)
                                    .foregroundStyle(selectedClient != nil ? AppTheme.textPrimary : AppTheme.textSecondary)
                                Spacer()
                                Image(systemName: "chevron.up.chevron.down")
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundStyle(AppTheme.textTertiary)
                            }
                            .padding(Spacing.sm)
                            .background(
                                RoundedRectangle(cornerRadius: CornerRadius.xs, style: .continuous)
                                    .fill(Color.platformGroupedBackground)
                            )
                        }
                    }
                    
                    if selectedClient != nil {
                        Divider()
                        
                        Text("Payment processing will be available in the next update.")
                            .font(.bodyMedium)
                            .foregroundStyle(AppTheme.textSecondary)
                            .padding(Spacing.md)
                            .frame(maxWidth: .infinity, alignment: .center)
                            .background(
                                RoundedRectangle(cornerRadius: CornerRadius.xs, style: .continuous)
                                    .fill(AppTheme.warning.opacity(0.1))
                            )
                    }
                }
            }
            .padding(.horizontal, Spacing.lg)
        }
    }
}

struct AdminClassCard: View {
    let classItem: GroupClass
    let onTap: () -> Void
    let onToggleRegistration: (Bool) -> Void
    let onDelete: () -> Void
    
    @State private var showingDeleteAlert = false
    
    var body: some View {
        CardView {
            VStack(alignment: .leading, spacing: Spacing.md) {
                HStack {
                    VStack(alignment: .leading, spacing: Spacing.xxs) {
                        Text(classItem.title)
                            .font(.headingSmall)
                            .foregroundStyle(AppTheme.textPrimary)
                        
                        Text(classItem.description)
                            .font(.bodySmall)
                            .foregroundStyle(AppTheme.textSecondary)
                            .lineLimit(2)
                    }
                    
                    Spacer()
                    
                    if classItem.isOpenForRegistration {
                        BadgeView(text: "Open", color: AppTheme.success)
                    } else {
                        BadgeView(text: "Closed", color: AppTheme.textTertiary)
                    }
                }
                
                Divider()
                
                HStack(spacing: Spacing.md) {
                    VStack(alignment: .leading, spacing: Spacing.xxs) {
                        HStack(spacing: Spacing.xxs) {
                            Image(systemName: "calendar")
                                .font(.labelSmall)
                            Text(classItem.startTime.formatted(date: .abbreviated, time: .omitted))
                                .font(.labelMedium)
                        }
                        
                        HStack(spacing: Spacing.xxs) {
                            Image(systemName: "clock")
                                .font(.labelSmall)
                            Text("\(classItem.startTime.formatted(date: .omitted, time: .shortened)) - \(classItem.endTime.formatted(date: .omitted, time: .shortened))")
                                .font(.labelMedium)
                        }
                        
                        HStack(spacing: Spacing.xxs) {
                            Image(systemName: "mappin.circle")
                                .font(.labelSmall)
                            Text(classItem.location)
                                .font(.labelMedium)
                        }
                        
                        HStack(spacing: Spacing.xxs) {
                            Image(systemName: "person.fill")
                                .font(.labelSmall)
                            Text(classItem.trainerName)
                                .font(.labelMedium)
                        }
                    }
                    .foregroundStyle(AppTheme.textSecondary)
                    
                    Spacer()
                    
                    VStack(alignment: .trailing, spacing: Spacing.xxs) {
                        Text("\(classItem.currentParticipants)/\(classItem.maxParticipants)")
                            .font(.headingSmall)
                            .foregroundStyle(AppTheme.primary)
                        
                        Text("registered")
                            .font(.labelSmall)
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                }
                
                Divider()
                
                HStack(spacing: Spacing.sm) {
                    Button {
                        onToggleRegistration(!classItem.isOpenForRegistration)
                    } label: {
                        HStack(spacing: Spacing.xxs) {
                            Image(systemName: classItem.isOpenForRegistration ? "pause.circle" : "play.circle")
                                .font(.system(size: 14, weight: .semibold))
                            Text(classItem.isOpenForRegistration ? "Close" : "Open")
                                .font(.labelMedium)
                        }
                        .foregroundStyle(.white)
                        .padding(.horizontal, Spacing.sm)
                        .padding(.vertical, Spacing.xs)
                        .background(
                            RoundedRectangle(cornerRadius: CornerRadius.xs, style: .continuous)
                                .fill(classItem.isOpenForRegistration ? AppTheme.warning : AppTheme.success)
                        )
                    }
                    .buttonStyle(.plain)
                    
                    Spacer()
                    
                    Button {
                        showingDeleteAlert = true
                    } label: {
                        HStack(spacing: Spacing.xxs) {
                            Image(systemName: "trash")
                                .font(.system(size: 14, weight: .semibold))
                            Text("Delete")
                                .font(.labelMedium)
                        }
                        .foregroundStyle(.white)
                        .padding(.horizontal, Spacing.sm)
                        .padding(.vertical, Spacing.xs)
                        .background(
                            RoundedRectangle(cornerRadius: CornerRadius.xs, style: .continuous)
                                .fill(AppTheme.error)
                        )
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .contentShape(Rectangle())
        .onTapGesture {
            onTap()
        }
        .alert("Delete Class", isPresented: $showingDeleteAlert) {
            Button("Cancel", role: .cancel) { }
            Button("Delete", role: .destructive) {
                onDelete()
            }
        } message: {
            Text("Are you sure you want to delete this class? This action cannot be undone.")
        }
    }
}

struct CreateClassView: View {
    @EnvironmentObject var auth: AuthManager
    @Environment(\.dismiss) private var dismiss
    @ObservedObject var adminService: AdminService
    @ObservedObject var trainersService: TrainersService
    let onCreated: () -> Void
    
    @State private var title = ""
    @State private var description = ""
    @State private var startDate = Date()
    @State private var endDate = Date().addingTimeInterval(3600)
    @State private var maxParticipants = 20
    @State private var location = "Oakwood Community Church"
    @State private var selectedTrainer: Trainer?
    @State private var isCreating = false
    @State private var errorMessage: String?
    
    var body: some View {
        NavigationView {
            Form {
                Section("Class Details") {
                    TextField("Title", text: $title)
                    // iOS 15-compatible multiline input
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Description")
                            .font(.callout)
                            .foregroundStyle(AppTheme.textSecondary)
                        TextEditor(text: $description)
                            .frame(minHeight: 80, maxHeight: 160)
                    }
                    TextField("Location", text: $location)
                }
                
                Section("Head Trainer") {
                    Picker("Select Trainer", selection: $selectedTrainer) {
                        Text("Select a trainer").tag(nil as Trainer?)
                        ForEach(trainersService.trainers) { trainer in
                            Text(trainer.name ?? "Unknown").tag(trainer as Trainer?)
                        }
                    }
                }
                
                Section("Schedule") {
                    DatePicker("Start Time", selection: $startDate)
                    DatePicker("End Time", selection: $endDate)
                }
                
                Section("Capacity") {
                    Stepper("Max Participants: \(maxParticipants)", value: $maxParticipants, in: 1...50)
                }
                
                if let errorMessage = errorMessage {
                    Section {
                        Text(errorMessage)
                            .foregroundStyle(AppTheme.error)
                            .font(.bodySmall)
                    }
                }
            }
            .navigationTitle("Create Class")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Create") {
                        Task { await createClass() }
                    }
                    .disabled(isCreating || title.isEmpty || description.isEmpty || selectedTrainer == nil)
                }
            }
        }
        .navigationViewStyle(.stack)
    }
    
    private func createClass() async {
        guard let trainer = selectedTrainer else {
            errorMessage = "Please select a head trainer"
            return
        }
        // Validate required trainer fields (id and name must be non-optional)
        guard let trainerId = trainer.id, !trainerId.isEmpty,
              let trainerName = trainer.name, !trainerName.isEmpty else {
            errorMessage = "Selected trainer is missing required information."
            return
        }
        
        isCreating = true
        errorMessage = nil
        
        do {
            guard let orgId = auth.currentOrgId else {
                errorMessage = "Organization ID not found"
                isCreating = false
                return
            }
            try await adminService.createClass(
                orgId: orgId,
                title: title,
                description: description,
                startTime: startDate,
                endTime: endDate,
                maxParticipants: maxParticipants,
                location: location,
                trainerId: trainerId,
                trainerName: trainerName
            )
            onCreated()
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
        
        isCreating = false
    }
}

struct EditClassView: View {
    @EnvironmentObject var auth: AuthManager
    @Environment(\.dismiss) private var dismiss
    let classItem: GroupClass
    @ObservedObject var adminService: AdminService
    @ObservedObject var trainersService: TrainersService
    let onUpdated: () -> Void
    
    @State private var title = ""
    @State private var description = ""
    @State private var startDate = Date()
    @State private var endDate = Date()
    @State private var maxParticipants = 20
    @State private var location = ""
    @State private var selectedTrainer: Trainer?
    @State private var isUpdating = false
    @State private var errorMessage: String?
    
    var body: some View {
        NavigationView {
            Form {
                Section("Class Details") {
                    TextField("Title", text: $title)
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Description")
                            .font(.callout)
                            .foregroundStyle(AppTheme.textSecondary)
                        TextEditor(text: $description)
                            .frame(minHeight: 80, maxHeight: 160)
                    }
                    TextField("Location", text: $location)
                }
                
                Section("Head Trainer") {
                    Picker("Select Trainer", selection: $selectedTrainer) {
                        Text("Select a trainer").tag(nil as Trainer?)
                        ForEach(trainersService.trainers) { trainer in
                            Text(trainer.name ?? "Unknown").tag(trainer as Trainer?)
                        }
                    }
                }
                
                Section("Schedule") {
                    DatePicker("Start Time", selection: $startDate)
                    DatePicker("End Time", selection: $endDate)
                }
                
                Section("Capacity") {
                    Stepper("Max Participants: \(maxParticipants)", value: $maxParticipants, in: 1...50)
                    Text("Current Participants: \(classItem.currentParticipants)")
                        .font(.bodySmall)
                        .foregroundStyle(AppTheme.textSecondary)
                }
                
                if let errorMessage = errorMessage {
                    Section {
                        Text(errorMessage)
                            .foregroundStyle(AppTheme.error)
                            .font(.bodySmall)
                    }
                }
            }
            .navigationTitle("Edit Class")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        Task { await updateClass() }
                    }
                    .disabled(isUpdating || title.isEmpty || description.isEmpty || selectedTrainer == nil)
                }
            }
        }
        .navigationViewStyle(.stack)
        .onAppear {
            // Initialize state with existing class data
            title = classItem.title
            description = classItem.description
            startDate = classItem.startTime
            endDate = classItem.endTime
            maxParticipants = classItem.maxParticipants
            location = classItem.location
            
            // Find and select the current trainer
            if let trainer = trainersService.trainers.first(where: { $0.id == classItem.trainerId }) {
                selectedTrainer = trainer
            }
        }
    }
    
    private func updateClass() async {
        guard let trainer = selectedTrainer else {
            errorMessage = "Please select a head trainer"
            return
        }
        
        guard let trainerId = trainer.id, !trainerId.isEmpty,
              let trainerName = trainer.name, !trainerName.isEmpty else {
            errorMessage = "Selected trainer is missing required information."
            return
        }
        
        guard let classId = classItem.id else {
            errorMessage = "Class ID is missing."
            return
        }
        
        if maxParticipants < classItem.currentParticipants {
            errorMessage = "Max participants cannot be less than current participants (\(classItem.currentParticipants))"
            return
        }
        
        isUpdating = true
        errorMessage = nil
        
        do {
            guard let orgId = auth.currentOrgId else {
                errorMessage = "Organization ID not found"
                isUpdating = false
                return
            }
            try await adminService.updateClass(
                classId: classId,
                orgId: orgId,
                title: title,
                description: description,
                startTime: startDate,
                endTime: endDate,
                maxParticipants: maxParticipants,
                location: location,
                trainerId: trainerId,
                trainerName: trainerName
            )
            onUpdated()
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
        
        isUpdating = false
    }
}

// MARK: - Pricing Structure Extension
extension AdminPanelView {
    private var pricingStructureContent: some View {
        VStack(alignment: .leading, spacing: Spacing.xl) {
            VStack(alignment: .leading, spacing: Spacing.sm) {
                HStack {
                    VStack(alignment: .leading, spacing: Spacing.xxs) {
                        Text("Pricing Structure")
                            .font(.title2.weight(.bold))
                            .foregroundStyle(AppTheme.textPrimary)
                        
                        Text("Set up pricing tiers and package options")
                            .font(.subheadline)
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                    
                    Spacer()
                    
                    Button {
                        alertItem = AlertItem(
                            title: "Package Type Format",
                            message: "Use lowercase letters and underscores (_) for package types.\n\nExamples:\n• private\n• 2_athlete\n• 3_athlete\n• class_pass\n• small_group\n\nAvoid spaces - use underscores instead."
                        )
                    } label: {
                        Image(systemName: "info.circle.fill")
                            .font(.title3)
                            .foregroundStyle(AppTheme.primary)
                    }
                }
            }
            .padding(.horizontal, Spacing.lg)
            
            if pricingService.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding()
            } else {
                // Display current pricing info
                if let structure = pricingService.pricingStructure {
                    HStack(spacing: Spacing.xs) {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(AppTheme.success)
                        Text("Currently: \(structure.tiers.count) tier(s), \(structure.allPackages.count) package(s)")
                            .font(.caption)
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                    .padding(.horizontal, Spacing.lg)
                    .padding(.bottom, Spacing.xs)
                }
                
                tiersEditor
                
                // Save button
                Button {
                    savePricingStructure()
                } label: {
                    HStack {
                        if isSavingPricing {
                            ProgressView()
                                .tint(.white)
                        } else {
                            Text("Save Pricing Structure")
                                .font(.headline)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(AppTheme.primary)
                    .foregroundStyle(.white)
                    .cornerRadius(CornerRadius.md)
                }
                .disabled(isSavingPricing || editingTiers.isEmpty)
                .padding(.horizontal, Spacing.lg)
                .padding(.bottom, Spacing.lg)
            }
        }
        .task {
            guard let orgId = auth.currentOrgId else { return }
            print("📋 Loading pricing structure for org: \(orgId)")
            await pricingService.loadPricingStructure(for: orgId)
            // Initialize editing state
            if let structure = pricingService.pricingStructure {
                editingTiers = structure.tiers
                print("✅ Loaded \(structure.tiers.count) tiers with \(structure.allPackages.count) packages")
            } else {
                // Start with one empty tier
                editingTiers = [PricingTier(tierName: "", packages: [])]
                print("⚠️ Starting with empty pricing structure")
            }
        }
    }
    
    private var tiersEditor: some View {
        ScrollView {
            VStack(spacing: Spacing.lg) {
                ForEach(editingTiers.indices, id: \.self) { tierIndex in
                    tierCard(tierIndex: tierIndex)
                }
                
                // Add Tier button
                Button {
                    addTier()
                } label: {
                    HStack {
                        Image(systemName: "plus.circle.fill")
                        Text("Add Tier")
                    }
                    .font(.headline)
                    .foregroundStyle(AppTheme.primary)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color(uiColor: .secondarySystemGroupedBackground))
                    .cornerRadius(CornerRadius.md)
                }
                .padding(.horizontal, Spacing.lg)
                .padding(.bottom, Spacing.xl)
            }
        }
    }
    
    private func tierCard(tierIndex: Int) -> some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            // Tier header with delete button
            HStack {
                TextField("Tier Name (e.g., Master, Elite, Pro)", text: $editingTiers[tierIndex].tierName)
                    .font(.headline)
                    .textFieldStyle(.plain)
                    .padding(.horizontal, Spacing.md)
                    .padding(.vertical, Spacing.sm)
                    .background(Color(uiColor: .secondarySystemGroupedBackground))
                    .cornerRadius(CornerRadius.sm)
                
                if editingTiers.count > 1 {
                    Button {
                        deleteTier(at: tierIndex)
                    } label: {
                        Image(systemName: "trash")
                            .foregroundStyle(.red)
                    }
                }
            }
            
            // Packages in this tier
            ForEach(editingTiers[tierIndex].packages.indices, id: \.self) { packageIndex in
                packageRow(tierIndex: tierIndex, packageIndex: packageIndex)
            }
            
            // Add Package button
            Button {
                addPackage(to: tierIndex)
            } label: {
                HStack {
                    Image(systemName: "plus.circle")
                    Text("Add Package")
                }
                .font(.subheadline)
                .foregroundStyle(AppTheme.primary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, Spacing.sm)
                .background(Color(uiColor: .secondarySystemGroupedBackground))
                .cornerRadius(CornerRadius.sm)
            }
        }
        .padding(Spacing.md)
        .background(Color.platformBackground)
        .cornerRadius(CornerRadius.md)
        .shadow(color: Color.black.opacity(0.05), radius: 4, y: 2)
        .padding(.horizontal, Spacing.lg)
    }
    
    private func packageRow(tierIndex: Int, packageIndex: Int) -> some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            // Title label and delete button
            HStack {
                Text("Package \(packageIndex + 1)")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(AppTheme.textSecondary)
                Spacer()
                Button {
                    deletePackage(at: packageIndex, from: tierIndex)
                } label: {
                    Image(systemName: "trash")
                        .font(.caption)
                        .foregroundStyle(.red)
                }
            }
            
            // Package title (full width)
            VStack(alignment: .leading, spacing: 2) {
                Text("Title")
                    .font(.caption2)
                    .foregroundStyle(AppTheme.textSecondary)
                TextField("e.g., 1 Athlete Private Lesson", text: $editingTiers[tierIndex].packages[packageIndex].title)
                    .textFieldStyle(.plain)
                    .padding(.horizontal, Spacing.sm)
                    .padding(.vertical, Spacing.xs)
                    .background(Color(uiColor: .secondarySystemGroupedBackground))
                    .cornerRadius(CornerRadius.sm)
            }
            
            // Package Type and Price (side by side)
            HStack(spacing: Spacing.sm) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Type (use_underscores)")
                        .font(.caption2)
                        .foregroundStyle(AppTheme.textSecondary)
                    TextField("e.g., private", text: $editingTiers[tierIndex].packages[packageIndex].packageType)
                        .textFieldStyle(.plain)
                        .padding(.horizontal, Spacing.sm)
                        .padding(.vertical, Spacing.xs)
                        .background(Color(uiColor: .secondarySystemGroupedBackground))
                        .cornerRadius(CornerRadius.sm)
                        .autocapitalization(.none)
                        .disableAutocorrection(true)
                }
                
                VStack(alignment: .leading, spacing: 2) {
                    Text("Price")
                        .font(.caption2)
                        .foregroundStyle(AppTheme.textSecondary)
                    HStack(spacing: 4) {
                        Text("$")
                            .foregroundStyle(AppTheme.textSecondary)
                        TextField("0.00", value: $editingTiers[tierIndex].packages[packageIndex].priceInDollars, format: .number.precision(.fractionLength(2)))
                            .keyboardType(.decimalPad)
                            .textFieldStyle(.plain)
                            .frame(width: 70)
                            .multilineTextAlignment(.trailing)
                    }
                    .padding(.horizontal, Spacing.sm)
                    .padding(.vertical, Spacing.xs)
                    .background(Color(uiColor: .secondarySystemGroupedBackground))
                    .cornerRadius(CornerRadius.sm)
                }
            }
        }
        .padding(Spacing.sm)
        .background(Color(uiColor: .tertiarySystemGroupedBackground))
        .cornerRadius(CornerRadius.sm)
    }
    
    // MARK: - Pricing Actions
    
    private func addTier() {
        editingTiers.append(PricingTier(tierName: "", packages: []))
    }
    
    private func deleteTier(at index: Int) {
        editingTiers.remove(at: index)
    }
    
    private func addPackage(to tierIndex: Int) {
        editingTiers[tierIndex].packages.append(PackageOption(title: "", priceInCents: 0, packageType: ""))
    }
    
    private func deletePackage(at packageIndex: Int, from tierIndex: Int) {
        editingTiers[tierIndex].packages.remove(at: packageIndex)
    }
    
    private func savePricingStructure() {
        guard let orgId = auth.currentOrgId else {
            alertItem = AlertItem(title: "Error", message: "Organization ID not found")
            return
        }
        
        // Validate
        for (tierIndex, tier) in editingTiers.enumerated() {
            if tier.tierName.isEmpty {
                alertItem = AlertItem(title: "Validation Error", message: "Tier \(tierIndex + 1) must have a name")
                return
            }
            for (pkgIndex, package) in tier.packages.enumerated() {
                if package.title.isEmpty {
                    alertItem = AlertItem(title: "Validation Error", message: "Tier '\(tier.tierName)' - Package \(pkgIndex + 1) must have a title")
                    return
                }
                if package.priceInCents <= 0 {
                    alertItem = AlertItem(title: "Validation Error", message: "Tier '\(tier.tierName)' - Package '\(package.title)' must have a price greater than $0")
                    return
                }
                if package.packageType.isEmpty {
                    alertItem = AlertItem(title: "Validation Error", message: "Tier '\(tier.tierName)' - Package '\(package.title)' must have a package type")
                    return
                }
                // Check for spaces in packageType
                if package.packageType.contains(" ") {
                    alertItem = AlertItem(title: "Validation Error", message: "Package type '\(package.packageType)' cannot contain spaces. Use underscores (_) instead.")
                    return
                }
            }
        }
        
        print("🔄 Saving pricing structure with \(editingTiers.count) tiers to org: \(orgId)")
        
        isSavingPricing = true
        
        Task {
            do {
                let structure = PricingStructure(tiers: editingTiers, lastUpdated: Date())
                try await pricingService.savePricingStructure(structure, for: orgId)
                
                print("✅ Pricing structure saved successfully")
                alertItem = AlertItem(title: "Success ✓", message: "Pricing structure saved successfully. \(editingTiers.flatMap(\.packages).count) packages across \(editingTiers.count) tiers.")
            } catch {
                print("❌ Error saving pricing structure: \(error)")
                alertItem = AlertItem(title: "Save Failed", message: "Failed to save: \(error.localizedDescription)")
            }
            
            isSavingPricing = false
        }
    }
    
    // MARK: - Locations Content
    
    private var locationsContent: some View {
        VStack(alignment: .leading, spacing: Spacing.lg) {
            // Locations list
            ForEach(Array(locationsService.locations.enumerated()), id: \.element.id) { index, location in
                LocationCard(
                    location: location,
                    onEdit: {
                        locationToEdit = location
                        showingAddLocation = true
                    },
                    onDelete: {
                        Task {
                            do {
                                try await locationsService.deleteLocation(location)
                            } catch {
                                alertItem = AlertItem(title: "Error", message: "Failed to delete location: \(error.localizedDescription)")
                            }
                        }
                    }
                )
                .padding(.horizontal, Spacing.lg)
            }
            
            // Add Location button or upgrade prompt
            if canAddMoreLocations {
                Button {
                    locationToEdit = nil
                    showingAddLocation = true
                } label: {
                    HStack {
                        Image(systemName: "plus.circle.fill")
                            .font(.title3)
                        Text("Add Location")
                            .font(.bodyMedium.weight(.semibold))
                    }
                    .foregroundStyle(AppTheme.primary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Spacing.md)
                    .background(AppTheme.primaryLight.opacity(0.1))
                    .cornerRadius(12)
                }
                .padding(.horizontal, Spacing.lg)
            } else {
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    Text("Location Limit Reached")
                        .font(.headingSmall)
                        .foregroundStyle(AppTheme.textPrimary)
                    
                    Text("Upgrade your subscription to add more locations")
                        .font(.bodyMedium)
                        .foregroundStyle(AppTheme.textSecondary)
                    
                    Button {
                        showingManageSubscription = true
                    } label: {
                        Text("Upgrade Subscription")
                            .font(.bodyMedium.weight(.semibold))
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, Spacing.md)
                            .background(AppTheme.primary)
                            .cornerRadius(12)
                    }
                }
                .padding(Spacing.lg)
                .background(Color(UIColor.systemGray6))
                .cornerRadius(12)
                .padding(.horizontal, Spacing.lg)
            }
        }
        .padding(.top, Spacing.md)
    }
    
    private var canAddMoreLocations: Bool {
        let maxLocations = organizationBilling?.locationLimit ?? 1
        return locationsService.locations.count < maxLocations
    }
}

// MARK: - Location Card Component

struct LocationCard: View {
    let location: Location
    let onEdit: () -> Void
    let onDelete: () -> Void
    
    var body: some View {
        CardView(padding: Spacing.md) {
            VStack(alignment: .leading, spacing: Spacing.sm) {
                HStack {
                    VStack(alignment: .leading, spacing: Spacing.xxs) {
                        Text(location.name)
                            .font(.headingSmall)
                            .foregroundStyle(AppTheme.textPrimary)
                        
                        Text(location.addressLine1)
                            .font(.bodyMedium)
                            .foregroundStyle(AppTheme.textSecondary)
                        
                        if let line2 = location.addressLine2, !line2.isEmpty {
                            Text(line2)
                                .font(.bodyMedium)
                                .foregroundStyle(AppTheme.textSecondary)
                        }
                        
                        Text(location.cityStateZip)
                            .font(.bodyMedium)
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                    
                    Spacer()
                    
                    Menu {
                        Button {
                            onEdit()
                        } label: {
                            Label("Edit", systemImage: "pencil")
                        }
                        
                        Button(role: .destructive) {
                            onDelete()
                        } label: {
                            Label("Delete", systemImage: "trash")
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle.fill")
                            .font(.title3)
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                }
            }
        }
    }
}

struct AlertItem: Identifiable {
    let id = UUID()
    let title: String
    let message: String
}

// MARK: - Compatibility helpers

private extension View {
    @ViewBuilder
    func onChangeCompat<Value: Equatable>(of value: Value, perform action: @escaping (Value) -> Void) -> some View {
        if #available(iOS 17.0, *) {
            self.onChange(of: value) { _, newValue in
                action(newValue)
            }
        } else {
            // Route through a helper that is deprecated on iOS 17 to avoid deprecation errors.
            self.onChangePreiOS17(of: value, perform: action)
        }
    }
    
    // This wrapper is only used to call the pre–iOS 17 signature without surfacing deprecation errors on iOS 17+.
    @available(iOS, introduced: 13.0, deprecated: 17.0)
    func onChangePreiOS17<Value: Equatable>(of value: Value, perform action: @escaping (Value) -> Void) -> some View {
        self.onChange(of: value, perform: action)
    }
}
