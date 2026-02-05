//
//  PassesTabView.swift
//  SkedenceAdmin
//
//  Extracted from AdminPanelView - Phase 1.1 Refactoring
//  Created on 2/4/26
//

import SwiftUI

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
    
    // MARK: - Helper Methods
    
    private func addPassToClient() async {
        guard let client = selectedClient else { return }
        
        isAddingPass = true
        
        do {
            try await adminService.addPassToClient(
                clientId: client.id,
                passType: selectedPassType,
                totalLessons: passQuantity
            )
            
            alertItem = AlertItem(
                title: "Pass Added",
                message: "Successfully added \(passQuantity) \(selectedPassTitle)\(passQuantity == 1 ? "" : "s") to \(client.firstName) \(client.lastName)'s account."
            )
            
            selectedClient = nil
            selectedPassType = ""
            selectedPassTitle = ""
            passQuantity = 1
            
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
