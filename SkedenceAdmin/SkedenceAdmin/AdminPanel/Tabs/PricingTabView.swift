//
//  PricingTabView.swift
//  SkedenceAdmin
//
//  Created by refactoring from AdminPanelView
//  Phase 1.1: AdminPanelView decomposition
//

import SwiftUI

struct PricingTabView: View {
    @EnvironmentObject private var dependencies: AdminAppDependencies
    
    private var auth: AuthManager { dependencies.auth }
    @ObservedObject var pricingService: PricingStructureService
    
    @Binding var editingTiers: [PricingTier]
    @Binding var isSavingPricing: Bool
    @Binding var alertItem: AlertItem?
    
    var onTabChange: (String) -> Void
    
    var body: some View {
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
            await pricingService.loadPricingStructure(for: orgId)
            if let structure = pricingService.pricingStructure {
                editingTiers = structure.tiers
            } else {
                editingTiers = [PricingTier(tierName: "", packages: [])]
            }
        }
    }
    
    private var tiersEditor: some View {
        ScrollView {
            VStack(spacing: Spacing.lg) {
                ForEach(editingTiers.indices, id: \.self) { tierIndex in
                    tierCard(tierIndex: tierIndex)
                }
                
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
            
            ForEach(editingTiers[tierIndex].packages.indices, id: \.self) { packageIndex in
                packageRow(tierIndex: tierIndex, packageIndex: packageIndex)
            }
            
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
            
            VStack(alignment: .leading, spacing: 2) {
                Text("Description")
                    .font(.caption2)
                    .foregroundStyle(AppTheme.textSecondary)
                TextEditor(text: $editingTiers[tierIndex].packages[packageIndex].description)
                    .frame(height: 60)
                    .padding(4)
                    .background(Color(uiColor: .secondarySystemGroupedBackground))
                    .cornerRadius(CornerRadius.sm)
            }
            
            // Pass/Class Category Selection
            VStack(alignment: .leading, spacing: Spacing.xs) {
                Text("Package Type *")
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(AppTheme.textSecondary)
                HStack(spacing: Spacing.md) {
                    ForEach(PackageCategory.allCases, id: \.self) { category in
                        Button {
                            editingTiers[tierIndex].packages[packageIndex].packageCategory = category
                        } label: {
                            HStack(spacing: Spacing.xs) {
                                Image(systemName: editingTiers[tierIndex].packages[packageIndex].packageCategory == category ? "checkmark.circle.fill" : "circle")
                                    .foregroundStyle(editingTiers[tierIndex].packages[packageIndex].packageCategory == category ? AppTheme.primary : AppTheme.textSecondary)
                                Text(category.displayName)
                                    .font(.subheadline)
                                    .foregroundStyle(editingTiers[tierIndex].packages[packageIndex].packageCategory == category ? AppTheme.primary : AppTheme.textPrimary)
                            }
                            .padding(.horizontal, Spacing.md)
                            .padding(.vertical, Spacing.sm)
                            .background(editingTiers[tierIndex].packages[packageIndex].packageCategory == category ? AppTheme.primary.opacity(0.1) : Color(uiColor: .secondarySystemGroupedBackground))
                            .cornerRadius(CornerRadius.sm)
                        }
                    }
                }
            }
            .padding(.top, Spacing.xs)
            
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
                    Text("Passes")
                        .font(.caption2)
                        .foregroundStyle(AppTheme.textSecondary)
                    TextField("1", value: $editingTiers[tierIndex].packages[packageIndex].lessonCount, format: .number)
                        .keyboardType(.numberPad)
                        .textFieldStyle(.plain)
                        .frame(width: 50)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, Spacing.sm)
                        .padding(.vertical, Spacing.xs)
                        .background(Color(uiColor: .secondarySystemGroupedBackground))
                        .cornerRadius(CornerRadius.sm)
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
        editingTiers[tierIndex].packages.append(PackageOption(title: "", priceInCents: 0, packageType: "", lessonCount: 1))
    }
    
    private func deletePackage(at packageIndex: Int, from tierIndex: Int) {
        editingTiers[tierIndex].packages.remove(at: packageIndex)
    }
    
    private func savePricingStructure() {
        guard let orgId = auth.currentOrgId else {
            alertItem = AlertItem(title: "Error", message: "Organization ID not found")
            return
        }
        
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
                if package.lessonCount <= 0 {
                    alertItem = AlertItem(title: "Validation Error", message: "Tier '\(tier.tierName)' - Package '\(package.title)' must have at least 1 pass")
                    return
                }
                if package.packageType.isEmpty {
                    alertItem = AlertItem(title: "Validation Error", message: "Tier '\(tier.tierName)' - Package '\(package.title)' must have a package type")
                    return
                }
                if package.packageType.contains(" ") {
                    alertItem = AlertItem(title: "Validation Error", message: "Package type '\(package.packageType)' cannot contain spaces. Use underscores (_) instead.")
                    return
                }
            }
        }
        
        isSavingPricing = true
        
        Task {
            do {
                let structure = PricingStructure(tiers: editingTiers, lastUpdated: Date())
                try await pricingService.savePricingStructure(structure, for: orgId)
                alertItem = AlertItem(title: "Success ✓", message: "Pricing structure saved successfully. \(editingTiers.flatMap(\.packages).count) packages across \(editingTiers.count) tiers.")
            } catch {
                alertItem = AlertItem(title: "Save Failed", message: "Failed to save: \(error.localizedDescription)")
            }
            isSavingPricing = false
        }
    }
}
