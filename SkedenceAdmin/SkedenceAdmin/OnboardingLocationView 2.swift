//
//  OnboardingLocationView.swift
//  SkedenceAdmin
//
//  Step 4: Add first location (optional)
//

import SwiftUI
import FirebaseFirestore

struct OnboardingLocationView: View {
    @EnvironmentObject var coordinator: OnboardingCoordinator
    
    @State private var locationName: String = ""
    @State private var addressLine1: String = ""
    @State private var addressLine2: String = ""
    @State private var city: String = ""
    @State private var state: String = ""
    @State private var zipCode: String = ""
    
    @State private var isSaving: Bool = false
    @State private var errorMessage: String?
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.xl) {
                // Header
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    Image(systemName: "mappin.circle.fill")
                        .font(.system(size: 56))
                        .foregroundStyle(AppTheme.primary)
                        .frame(maxWidth: .infinity, alignment: .center)
                        .padding(.bottom, Spacing.xs)
                    
                    Text("Add Your First Location")
                        .font(.displaySmall)
                        .foregroundStyle(AppTheme.textPrimary)
                        .frame(maxWidth: .infinity, alignment: .center)
                    
                    Text("Where will you train your clients?")
                        .font(.bodyLarge)
                        .foregroundStyle(AppTheme.textSecondary)
                        .frame(maxWidth: .infinity, alignment: .center)
                        .multilineTextAlignment(.center)
                }
                .padding(.bottom, Spacing.md)
                
                // Form
                VStack(alignment: .leading, spacing: Spacing.md) {
                    FormField(
                        icon: "building.2",
                        placeholder: "Location Name (e.g., Main Gym, Studio A)",
                        text: $locationName
                    )
                    
                    FormField(
                        icon: "mappin",
                        placeholder: "Address Line 1",
                        text: $addressLine1
                    )
                    
                    FormField(
                        icon: "mappin",
                        placeholder: "Address Line 2 (optional)",
                        text: $addressLine2
                    )
                    
                    FormField(
                        icon: "building.2",
                        placeholder: "City",
                        text: $city
                    )
                    
                    HStack(spacing: Spacing.sm) {
                        FormField(
                            icon: "map",
                            placeholder: "State",
                            text: $state
                        )
                        
                        FormField(
                            icon: "number",
                            placeholder: "ZIP",
                            text: $zipCode,
                            keyboardType: .numberPad
                        )
                    }
                }
                
                // Helper text
                Text("💡 You can add more locations later from the Manage tab")
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
                                Text(isSaving ? "Saving..." : "Add Location")
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
        !locationName.isEmpty &&
        !addressLine1.isEmpty &&
        !city.isEmpty &&
        !state.isEmpty &&
        !zipCode.isEmpty
    }
    
    func saveAndContinue() {
        guard let orgId = coordinator.orgId, canSave else { return }
        
        isSaving = true
        errorMessage = nil
        
        Task {
            do {
                let db = Firestore.firestore()
                
                let locationData: [String: Any] = [
                    "name": locationName,
                    "addressLine1": addressLine1,
                    "addressLine2": addressLine2,
                    "city": city,
                    "state": state,
                    "zipCode": zipCode,
                    "orgId": orgId,
                    "isActive": true,
                    "createdAt": Timestamp(date: Date()),
                    "updatedAt": Timestamp(date: Date())
                ]
                
                try await db.collection("locations").addDocument(data: locationData)
                
                coordinator.moveToNextStep()
                isSaving = false
                
            } catch {
                errorMessage = "Failed to save location: \(error.localizedDescription)"
                isSaving = false
            }
        }
    }
    
    func skipStep() {
        coordinator.moveToNextStep()
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
    OnboardingLocationView()
        .environmentObject(OnboardingCoordinator())
}
