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
    @State private var sessions: String = ""
    @State private var price: String = ""
    @State private var expirationDays: String = ""
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.xl) {
                // Header
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    Image(systemName: "tag.circle.fill")
                        .font(.system(size: 56))
                        .foregroundStyle(AppTheme.primary)
                        .frame(maxWidth: .infinity, alignment: .center)
                        .padding(.bottom, Spacing.xs)
                    
                    Text("Create Your First Package")
                        .font(.displaySmall)
                        .foregroundStyle(AppTheme.textPrimary)
                        .frame(maxWidth: .infinity, alignment: .center)
                    
                    Text("Choose a template or create your own")
                        .font(.bodyLarge)
                        .foregroundStyle(AppTheme.textSecondary)
                        .frame(maxWidth: .infinity, alignment: .center)
                        .multilineTextAlignment(.center)
                }
                .padding(.bottom, Spacing.md)
                
                // Quick Templates
                if !showCustomPackage {
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        Text("Quick Templates")
                            .font(.headingSmall)
                            .foregroundStyle(AppTheme.textPrimary)
                        
                        ForEach(OnboardingPackageTemplate.templates) { template in
                            OnboardingTemplateCard(
                                template: template,
                                isSelected: selectedTemplate?.id == template.id,
                                onSelect: { selectedTemplate = template }
                            )
                        }
                        
                        Button(action: { showCustomPackage = true }) {
                            HStack {
                                Image(systemName: "plus.circle.fill")
                                Text("Create Custom Package")
                            }
                            .font(.bodyMedium)
                            .foregroundStyle(AppTheme.primary)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, Spacing.md)
                            .background(AppTheme.primary.opacity(0.1))
                            .cornerRadius(CornerRadius.md)
                        }
                    }
                } else {
                    // Custom Package Form
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        HStack {
                            Text("Custom Package")
                                .font(.headingSmall)
                                .foregroundStyle(AppTheme.textPrimary)
                            
                            Spacer()
                            
                            Button(action: { showCustomPackage = false }) {
                                Text("Use Template")
                                    .font(.bodySmall)
                                    .foregroundStyle(AppTheme.primary)
                            }
                        }
                        
                        FormField(
                            icon: "tag",
                            placeholder: "Package Name",
                            text: $packageName
                        )
                        
                        FormField(
                            icon: "number",
                            placeholder: "Number of Sessions",
                            text: $sessions,
                            keyboardType: .numberPad
                        )
                        
                        FormField(
                            icon: "dollarsign.circle",
                            placeholder: "Price",
                            text: $price,
                            keyboardType: .decimalPad
                        )
                        
                        FormField(
                            icon: "calendar",
                            placeholder: "Expiration (days)",
                            text: $expirationDays,
                            keyboardType: .numberPad
                        )
                    }
                }
                
                // Helper text
                Text("💡 You can add more packages and customize pricing later")
                    .font(.bodySmall)
                    .foregroundStyle(AppTheme.textSecondary)
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(AppTheme.surfaceSecondary)
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
                
                // Buttons
                VStack(spacing: Spacing.sm) {
                    if canSave {
                        Button(action: saveAndContinue) {
                            HStack {
                                if isSaving {
                                    ProgressView()
                                        .tint(.white)
                                }
                                Text(isSaving ? "Creating..." : "Create Package")
                                    .font(.headingSmall)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, Spacing.md)
                            .background(AppTheme.primary)
                            .foregroundStyle(.white)
                            .cornerRadius(CornerRadius.md)
                        }
                        .disabled(isSaving)
                    }
                    
                    Button(action: skipStep) {
                        Text("Skip for Now")
                            .font(.bodyMedium)
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                }
            }
            .padding(Spacing.lg)
        }
        .background(Color(UIColor.systemBackground))
    }
    
    var canSave: Bool {
        if showCustomPackage {
            return !packageName.isEmpty && 
                   Int(sessions) != nil && 
                   Double(price) != nil && 
                   Int(expirationDays) != nil
        } else {
            return selectedTemplate != nil
        }
    }
    
    func saveAndContinue() {
        guard let orgId = coordinator.orgId else { return }
        
        isSaving = true
        errorMessage = nil
        
        Task {
            do {
                let db = Firestore.firestore()
                
                // Create package option
                let packageOption: PackageOption
                
                if let template = selectedTemplate {
                    packageOption = PackageOption(
                        title: template.name,
                        priceInCents: Int(template.price * 100),
                        packageType: template.name.lowercased().replacingOccurrences(of: " ", with: "_")
                    )
                } else {
                    let priceValue = Double(price) ?? 250
                    packageOption = PackageOption(
                        title: packageName,
                        priceInCents: Int(priceValue * 100),
                        packageType: packageName.lowercased().replacingOccurrences(of: " ", with: "_")
                    )
                }
                
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
                
                print("✅ OnboardingPackages: Saved pricing structure for org \(orgId)")
                print("   Package: \(packageOption.title) - \(packageOption.formattedPrice)")
                
                coordinator.organizationData["packagesComplete"] = true
                coordinator.moveToNextStep()
                isSaving = false
                
            } catch {
                errorMessage = "Failed to create package: \(error.localizedDescription)"
                isSaving = false
            }
        }
    }
    
    func skipStep() {
        coordinator.moveToNextStep()
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

// MARK: - Form Field

private struct FormField: View {
    let icon: String
    let placeholder: String
    @Binding var text: String
    var keyboardType: UIKeyboardType = .default
    
    var body: some View {
        HStack(spacing: Spacing.sm) {
            Image(systemName: icon)
                .foregroundStyle(AppTheme.textSecondary)
                .frame(width: 24)
            
            TextField(placeholder, text: $text)
                .font(.bodyMedium)
                .keyboardType(keyboardType)
        }
        .padding()
        .background(AppTheme.surfaceSecondary)
        .cornerRadius(CornerRadius.md)
    }
}

#Preview {
    OnboardingPackagesView()
        .environmentObject(OnboardingCoordinator())
}
