//
//  OnboardingPackagesView.swift
//  SkedenceAdmin
//
//  Step 6: Create lesson packages with quick templates
//

import SwiftUI
import FirebaseFirestore

struct OnboardingPackagesView: View {
    @EnvironmentObject var coordinator: OnboardingCoordinator
    
    @State private var selectedTemplate: OnboardingPackageTemplate?
    @State private var showCustomPackage: Bool = false
    @State private var isSaving: Bool = false
    @State private var errorMessage: String?
    
    // Custom package fields
    @State private var packageName: String = ""
    @State private var packageDescription: String = ""
    @State private var sessions: String = ""
    @State private var price: String = ""
    @State private var expirationDays: String = ""
    @State private var packageCategory: PackageCategory = .pass
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.xl) {
                // Header
                OnboardingHeader(
                    icon: "tag.circle.fill",
                    title: "Create Your First Package",
                    subtitle: "Create a custom package to get started"
                )
                .padding(.bottom, Spacing.md)
                
                // Custom Package Form (mandatory)
                VStack(alignment: .leading, spacing: Spacing.md) {
                    Text("Package Details")
                        .font(.headingSmall)
                        .foregroundStyle(AppTheme.textPrimary)

                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        Text("Package Type")
                            .font(.bodyMedium)
                            .foregroundStyle(AppTheme.textSecondary)

                        Picker("Package Type", selection: $packageCategory) {
                            Text("Pass").tag(PackageCategory.pass)
                            Text("Class").tag(PackageCategory.classPass)
                        }
                        .pickerStyle(.segmented)
                    }
                    
                    OnboardingFormField(
                        icon: "tag",
                        placeholder: "Package Name",
                        text: $packageName
                    )
                    
                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        HStack(spacing: Spacing.xs) {
                            Image(systemName: "text.alignleft")
                                .foregroundStyle(AppTheme.textSecondary)
                                .frame(width: 24)
                            Text("Description")
                                .font(.bodyMedium)
                                .foregroundStyle(AppTheme.textSecondary)
                        }
                        TextEditor(text: $packageDescription)
                            .frame(height: 80)
                            .padding(Spacing.xs)
                            .background(Color(uiColor: .secondarySystemGroupedBackground))
                            .cornerRadius(CornerRadius.sm)
                            .overlay(
                                RoundedRectangle(cornerRadius: CornerRadius.sm)
                                    .stroke(Color(uiColor: .separator), lineWidth: 0.5)
                            )
                    }
                    
                    OnboardingFormField(
                        icon: "number",
                        placeholder: "Number of Sessions",
                        text: $sessions,
                        keyboardType: .numberPad
                    )
                    
                    OnboardingFormField(
                        icon: "dollarsign.circle",
                        placeholder: "Price",
                        text: $price,
                        keyboardType: .decimalPad
                    )
                    
                    OnboardingFormField(
                        icon: "calendar",
                        placeholder: "Expiration (days)",
                        text: $expirationDays,
                        keyboardType: .numberPad
                    )
                }
                
                // Helper text
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    HStack(alignment: .top, spacing: Spacing.sm) {
                        Image(systemName: "info.circle.fill")
                            .foregroundStyle(AppTheme.primary)
                            .font(.system(size: 20))
                        
                        VStack(alignment: .leading, spacing: Spacing.xxs) {
                            Text("Package Management")
                                .font(.headingSmall)
                                .foregroundStyle(AppTheme.textPrimary)
                            
                            Text("After setup, you can create, edit, and remove packages anytime in the Manage tab.")
                                .font(.bodySmall)
                                .foregroundStyle(AppTheme.textSecondary)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }
                }
                .padding()
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(AppTheme.primary.opacity(0.1))
                .cornerRadius(CornerRadius.md)
                
                // Error
                if let error = errorMessage {
                    Text(error)
                        .font(.bodyMedium)
                        .foregroundStyle(.red)
                        .padding()
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.red.opacity(0.1))
                        .cornerRadius(CornerRadius.md)
                }
                
                // Continue Button
                Button(action: saveAndContinue) {
                    HStack {
                        if isSaving {
                            ProgressView()
                                .tint(.white)
                        }
                        Text(isSaving ? "Creating..." : "Create Package & Continue")
                            .font(.headingSmall)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Spacing.md)
                    .background(canSave ? AppTheme.primary : AppTheme.textTertiary)
                    .foregroundStyle(.white)
                    .cornerRadius(CornerRadius.md)
                }
                .disabled(!canSave || isSaving)
            }
            .padding(Spacing.lg)
        }
        .background(Color(UIColor.systemBackground))
    }
    
    var canSave: Bool {
        return !packageName.isEmpty && 
               Int(sessions) != nil && 
               Double(price) != nil && 
               Int(expirationDays) != nil
    }
    
    func saveAndContinue() {
        guard let orgId = coordinator.orgId else { return }
        
        isSaving = true
        errorMessage = nil
        
        Task {
            do {
                let db = Firestore.firestore()
                
                // Create package option from custom input
                let priceValue = Double(price) ?? 250
                let sessionsValue = Int(sessions) ?? 1
                
                var packageOption = PackageOption(
                    title: packageName,
                    priceInCents: Int(priceValue * 100),
                    packageType: "",  // Will be auto-generated
                    packageCategory: packageCategory,
                    lessonCount: sessionsValue,
                    description: packageDescription
                )
                packageOption.ensurePackageType()
                
                // Create pricing structure with the new package
                let pricingStructure = PricingStructure(
                    tiers: [
                        PricingTier(
                            tierName: "Standard",
                            packages: [packageOption]
                        )
                    ],
                    lastUpdated: Date()
                )
                
                // Save to organization document
                let encoder = JSONEncoder()
                encoder.dateEncodingStrategy = .iso8601
                let data = try encoder.encode(pricingStructure)
                let dictionary = try JSONSerialization.jsonObject(with: data) as? [String: Any]
                
                guard let dictionary = dictionary else {
                    throw NSError(domain: "OnboardingPackages", code: -1,
                                 userInfo: [NSLocalizedDescriptionKey: "Failed to encode pricing structure"])
                }
                
                try await db.collection("organizations").document(orgId).setData([
                    "pricingStructure": dictionary
                ], merge: true)
                
                
                coordinator.data.packagesComplete = true
                coordinator.moveToNextStep()
                isSaving = false
                
            } catch {
                errorMessage = "Failed to create package: \(error.localizedDescription)"
                isSaving = false
            }
        }
    }

}

// MARK: - Package Template

struct OnboardingPackageTemplate: Identifiable {
    let id: String
    let name: String
    let sessions: Int
    let price: Double
    let expirationDays: Int
    let description: String
    
    static let templates: [OnboardingPackageTemplate] = [
        OnboardingPackageTemplate(
            id: "starter",
            name: "Starter Pack",
            sessions: 5,
            price: 150,
            expirationDays: 30,
            description: "Perfect for new clients"
        ),
        OnboardingPackageTemplate(
            id: "standard",
            name: "Standard Pack",
            sessions: 10,
            price: 280,
            expirationDays: 60,
            description: "Most popular option"
        ),
        OnboardingPackageTemplate(
            id: "premium",
            name: "Premium Pack",
            sessions: 20,
            price: 500,
            expirationDays: 90,
            description: "Best value for committed clients"
        )
    ]
}

// MARK: - Template Card

private struct OnboardingTemplateCard: View {
    let template: OnboardingPackageTemplate
    let isSelected: Bool
    let onSelect: () -> Void
    
    var body: some View {
        Button(action: onSelect) {
            HStack(spacing: Spacing.md) {
                // Radio button
                ZStack {
                    Circle()
                        .stroke(isSelected ? AppTheme.primary : Color.gray.opacity(0.3), lineWidth: 2)
                        .frame(width: 24, height: 24)
                    
                    if isSelected {
                        Circle()
                            .fill(AppTheme.primary)
                            .frame(width: 14, height: 14)
                    }
                }
                
                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    Text(template.name)
                        .font(.headingSmall)
                        .foregroundStyle(AppTheme.textPrimary)
                    
                    Text(template.description)
                        .font(.bodySmall)
                        .foregroundStyle(AppTheme.textSecondary)
                    
                    HStack(spacing: Spacing.md) {
                        Label("\(template.sessions) sessions", systemImage: "calendar")
                        Label("$\(Int(template.price))", systemImage: "dollarsign.circle")
                    }
                    .font(.labelMedium)
                    .foregroundStyle(AppTheme.textSecondary)
                }
                
                Spacer()
            }
            .padding()
            .background(isSelected ? AppTheme.primary.opacity(0.1) : AppTheme.surfaceSecondary)
            .overlay(
                RoundedRectangle(cornerRadius: CornerRadius.md)
                    .stroke(isSelected ? AppTheme.primary : Color.clear, lineWidth: 2)
            )
            .cornerRadius(CornerRadius.md)
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    OnboardingPackagesView()
        .environmentObject(OnboardingCoordinator())
}
