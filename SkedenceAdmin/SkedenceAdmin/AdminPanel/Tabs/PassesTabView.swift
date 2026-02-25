//
//  PassesTabView.swift
//  SkedenceAdmin
//
//  Extracted from AdminPanelView - Phase 1.1 Refactoring
//  Created on 2/4/26
//  Updated on 2/25/26: Added payment processing for client purchases
//

import SwiftUI

enum PaymentMethod: Equatable {
    case savedCard(String) // Payment method ID
    case free // Admin adds for free
}

struct PassesTabView: View {
    @EnvironmentObject private var dependencies: AdminAppDependencies
    
    private var auth: AuthManager { dependencies.auth }
    @ObservedObject var adminService: AdminService
    @ObservedObject var pricingService: PricingStructureService
    @ObservedObject var packagesService: PackagesService
    
    @Binding var selectedClient: SimpleUser?
    @Binding var selectedPassType: String
    @Binding var selectedPassTitle: String
    @Binding var passQuantity: Int
    @Binding var passAction: PassAction
    @Binding var isAddingPass: Bool
    @Binding var alertItem: AlertItem?
    
    // Payment-related state
    @StateObject private var stripeService = StripeService()
    @StateObject private var customerService = StripeCustomerService()
    @State private var selectedPaymentMethod: PaymentMethod = .free
    @State private var isLoadingPaymentMethods = false
    
    var body: some View {
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
                                    HStack {
                                        Text("\(user.firstName) \(user.lastName)")
                                        if !user.athleteName.isEmpty {
                                            Text("(\(user.athleteName))")
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
                                Image(systemName: "chevron.down")
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundStyle(AppTheme.textTertiary)
                            }
                            .padding(Spacing.sm)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(
                                RoundedRectangle(cornerRadius: CornerRadius.xs, style: .continuous)
                                    .stroke(AppTheme.border, lineWidth: 1)
                            )
                        }
                        .menuStyle(.automatic)
                        .onChange(of: selectedClient) { _, newClient in
                            // Load payment methods when client is selected
                            if let client = newClient, let orgId = auth.currentOrgId {
                                Task {
                                    // Use authUserId if available (Firebase Auth UID), fallback to document ID
                                    let userId = client.authUserId ?? client.id
                                    await loadPaymentMethodsForClient(userId: userId, orgId: orgId)
                                }
                            } else {
                                // Clear payment methods when no client selected
                                selectedPaymentMethod = .free
                            }
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
                                        selectedPassType = package.packageType
                                        selectedPassTitle = package.title
                                    } label: {
                                        HStack {
                                            Text(package.title)
                                            Text(package.formattedPrice)
                                                .foregroundStyle(.secondary)
                                            Text("(\(package.packageCategory.displayName))")
                                                .foregroundStyle(.tertiary)
                                                .font(.caption)
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
                    
                    // Payment Method Selection (only for adding passes)
                    if passAction == .add {
                        Divider()
                        
                        VStack(alignment: .leading, spacing: Spacing.xs) {
                            Text("Payment Method")
                                .font(.labelMedium)
                                .foregroundStyle(AppTheme.textSecondary)
                            
                            if isLoadingPaymentMethods {
                                HStack {
                                    ProgressView()
                                        .scaleEffect(0.8)
                                    Text("Loading payment methods...")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                .padding(Spacing.sm)
                            } else if customerService.paymentMethods.isEmpty {
                                // No saved cards - only free option
                                HStack {
                                    Image(systemName: "gift.fill")
                                        .foregroundStyle(AppTheme.primary)
                                    Text("Add for Free (Admin)")
                                        .font(.bodyMedium)
                                }
                                .padding(Spacing.sm)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .background(
                                    RoundedRectangle(cornerRadius: CornerRadius.xs, style: .continuous)
                                        .fill(AppTheme.primary.opacity(0.08))
                                )
                            } else {
                                // Has saved cards - show options
                                VStack(spacing: Spacing.xs) {
                                    // Free option
                                    Button {
                                        selectedPaymentMethod = .free
                                    } label: {
                                        HStack {
                                            Image(systemName: selectedPaymentMethod == .free ? "checkmark.circle.fill" : "circle")
                                                .foregroundStyle(selectedPaymentMethod == .free ? AppTheme.primary : .secondary)
                                            Image(systemName: "gift.fill")
                                                .foregroundStyle(selectedPaymentMethod == .free ? AppTheme.primary : .secondary)
                                            Text("Add for Free (Admin)")
                                                .font(.bodyMedium)
                                                .foregroundStyle(selectedPaymentMethod == .free ? AppTheme.textPrimary : AppTheme.textSecondary)
                                            Spacer()
                                        }
                                        .padding(Spacing.sm)
                                        .background(
                                            RoundedRectangle(cornerRadius: CornerRadius.xs, style: .continuous)
                                                .fill(selectedPaymentMethod == .free ? AppTheme.primary.opacity(0.08) : Color.clear)
                                                .overlay(
                                                    RoundedRectangle(cornerRadius: CornerRadius.xs, style: .continuous)
                                                        .stroke(AppTheme.border, lineWidth: 1)
                                                )
                                        )
                                    }
                                    .buttonStyle(.plain)
                                    
                                    // Saved card options
                                    ForEach(customerService.paymentMethods) { method in
                                        Button {
                                            selectedPaymentMethod = .savedCard(method.id)
                                        } label: {
                                            HStack {
                                                Image(systemName: selectedPaymentMethod == .savedCard(method.id) ? "checkmark.circle.fill" : "circle")
                                                    .foregroundStyle(selectedPaymentMethod == .savedCard(method.id) ? AppTheme.primary : .secondary)
                                                Image(systemName: "creditcard.fill")
                                                    .foregroundStyle(selectedPaymentMethod == .savedCard(method.id) ? AppTheme.primary : .secondary)
                                                Text("\(method.displayBrand) •••• \(method.last4)")
                                                    .font(.bodyMedium)
                                                    .foregroundStyle(selectedPaymentMethod == .savedCard(method.id) ? AppTheme.textPrimary : AppTheme.textSecondary)
                                                Spacer()
                                                Text("Exp \(method.expirationDisplay)")
                                                    .font(.caption)
                                                    .foregroundStyle(.secondary)
                                            }
                                            .padding(Spacing.sm)
                                            .background(
                                                RoundedRectangle(cornerRadius: CornerRadius.xs, style: .continuous)
                                                    .fill(selectedPaymentMethod == .savedCard(method.id) ? AppTheme.primary.opacity(0.08) : Color.clear)
                                                    .overlay(
                                                        RoundedRectangle(cornerRadius: CornerRadius.xs, style: .continuous)
                                                            .stroke(AppTheme.border, lineWidth: 1)
                                                    )
                                            )
                                        }
                                        .buttonStyle(.plain)
                                    }
                                }
                            }
                        }
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
    
    // MARK: - Helper Methods
    
    private func loadPaymentMethodsForClient(userId: String, orgId: String) async {
        isLoadingPaymentMethods = true
        await customerService.loadPaymentMethodsForUser(userId: userId, orgId: orgId)
        isLoadingPaymentMethods = false
        
        // Default to free if no saved cards
        if customerService.paymentMethods.isEmpty {
            selectedPaymentMethod = .free
        }
    }
    
    private func addPassToClient() async {
        guard let client = selectedClient else { return }
        guard let orgId = auth.currentOrgId else { return }
        
        isAddingPass = true
        
        do {
            // Check if we're using a saved card or adding for free
            switch selectedPaymentMethod {
            case .savedCard(let paymentMethodId):
                // Process payment with saved card
                try await processPaymentForClient(
                    client: client,
                    paymentMethodId: paymentMethodId,
                    orgId: orgId
                )
                
            case .free:
                // Add pass for free (admin privilege)
                try await adminService.addPassToClient(
                    clientId: client.id,
                    passType: selectedPassType,
                    totalLessons: passQuantity
                )
            }
            
            alertItem = AlertItem(
                title: "Pass Added",
                message: "Successfully added \(passQuantity) \(selectedPassTitle)\(passQuantity == 1 ? "" : "s") to \(client.firstName) \(client.lastName)'s account."
            )
            
            selectedClient = nil
            selectedPassType = ""
            selectedPassTitle = ""
            passQuantity = 1
            selectedPaymentMethod = .free
            
            await adminService.loadAllUsers(orgId: orgId)
            await packagesService.loadMyPackages()
            
        } catch {
            alertItem = AlertItem(
                title: "Error",
                message: "Failed to add pass: \(error.localizedDescription)"
            )
        }
        
        isAddingPass = false
    }
    
    private func processPaymentForClient(client: SimpleUser, paymentMethodId: String, orgId: String) async throws {
        // Get the package price from pricing structure
        guard let package = pricingService.allPackageOptions.first(where: { $0.packageType == selectedPassType }) else {
            throw PassesError.packageNotFound
        }
        
        let totalAmount = package.priceInCents * passQuantity
        
        // Get client's authUserId (Firebase Auth UID)
        guard let clientAuthUserId = client.authUserId else {
            throw PassesError.clientAuthIdNotFound
        }
        
        // Process payment using client's saved card
        _ = try await stripeService.createAndConfirmPaymentForClient(
            clientUserId: clientAuthUserId,
            packageType: selectedPassType,
            amount: totalAmount,
            trainerId: nil, // Admin-initiated, no specific trainer
            orgId: orgId,
            paymentMethodId: paymentMethodId
        )
        
        // Payment succeeded - package will be created by Cloud Function
        print("✅ Payment processed successfully for client: \(client.firstName) \(client.lastName)")
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
            
            alertItem = AlertItem(
                title: "Pass Removed",
                message: "Successfully removed \(passQuantity) pass\(passQuantity == 1 ? "" : "es") from \(client.firstName) \(client.lastName)'s account."
            )
            
            selectedClient = nil
            selectedPassType = ""
            selectedPassTitle = ""
            passQuantity = 1
            passAction = .add
            
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
}

// MARK: - Error Types

enum PassesError: LocalizedError {
    case packageNotFound
    case clientNotFound
    case clientAuthIdNotFound
    
    var errorDescription: String? {
        switch self {
        case .packageNotFound:
            return "Selected package type not found in pricing structure"
        case .clientNotFound:
            return "Client document not found"
        case .clientAuthIdNotFound:
            return "Client's authentication ID not found - please ensure client has signed in at least once"
        }
    }
}
