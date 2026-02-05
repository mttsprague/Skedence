//
//  OnboardingBusinessDetailsView.swift
//  SkedenceAdmin
//
//  Step 2: Business contact details
//

import SwiftUI
import FirebaseFirestore

struct OnboardingBusinessDetailsView: View {
    @EnvironmentObject var coordinator: OnboardingCoordinator
    
    @State private var phone: String = ""
    @State private var website: String = ""
    @State private var contactEmail: String = ""
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
                OnboardingHeader(
                    icon: "phone.badge.checkmark",
                    title: "Business Contact Details",
                    subtitle: "Help clients reach you easily"
                )
                .padding(.bottom, Spacing.md)
                
                // Contact Info
                VStack(alignment: .leading, spacing: Spacing.md) {
                    OnboardingSectionHeader(title: "Contact Information", icon: "phone.circle")
                    
                    OnboardingFormField(
                        icon: "phone",
                        placeholder: "Business Phone",
                        text: $phone,
                        keyboardType: .phonePad
                    )
                    
                    OnboardingFormField(
                        icon: "envelope",
                        placeholder: "Contact Email (optional)",
                        text: $contactEmail,
                        keyboardType: .emailAddress
                    )
                    .textInputAutocapitalization(.never)
                    
                    OnboardingFormField(
                        icon: "globe",
                        placeholder: "Website (optional)",
                        text: $website,
                        keyboardType: .URL
                    )
                    .textInputAutocapitalization(.never)
                }
                
                // Business Address
                VStack(alignment: .leading, spacing: Spacing.md) {
                    OnboardingSectionHeader(title: "Business Address", icon: "mappin.circle")
                    
                    OnboardingFormField(
                        icon: "mappin",
                        placeholder: "Address Line 1",
                        text: $addressLine1
                    )
                    
                    OnboardingFormField(
                        icon: "mappin",
                        placeholder: "Address Line 2 (optional)",
                        text: $addressLine2
                    )
                    
                    OnboardingFormField(
                        icon: "building.2",
                        placeholder: "City",
                        text: $city
                    )
                    
                    HStack(spacing: Spacing.sm) {
                        OnboardingFormField(
                            icon: "map",
                            placeholder: "State",
                            text: $state
                        )
                        
                        OnboardingFormField(
                            icon: "number",
                            placeholder: "ZIP",
                            text: $zipCode,
                            keyboardType: .numberPad
                        )
                    }
                }
                
                // Helper text
                Text("💡 This information will be shown to clients when they book sessions")
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
                    OnboardingPrimaryButton(
                        title: "Continue",
                        isLoading: isSaving,
                        isEnabled: canContinue,
                        action: saveAndContinue
                    )
                    
                    OnboardingSecondaryButton(
                        title: "Skip for Now",
                        action: skipStep
                    )
                }
            }
            .padding(Spacing.lg)
        }
        .background(Color(UIColor.systemBackground))
        .onAppear {
        }
    }
    
    var canContinue: Bool {
        !phone.isEmpty
    }
    
    func saveAndContinue() {
        guard let orgId = coordinator.orgId else {
            errorMessage = "Setup error: Organization not found. Please restart onboarding."
            return
        }
        
        isSaving = true
        errorMessage = nil
        
        Task {
            do {
                let db = Firestore.firestore()
                
                var updates: [String: Any] = [:]
                
                if !phone.isEmpty {
                    updates["contactPhone"] = phone
                }
                if !contactEmail.isEmpty {
                    updates["contactEmail"] = contactEmail
                }
                if !website.isEmpty {
                    updates["website"] = website
                }
                if !addressLine1.isEmpty {
                    updates["address"] = [
                        "line1": addressLine1,
                        "line2": addressLine2,
                        "city": city,
                        "state": state,
                        "zipCode": zipCode
                    ]
                }
                
                updates["updatedAt"] = Timestamp(date: Date())
                
                try await db.collection("organizations")
                    .document(orgId)
                    .updateData(updates)
                
                // Store in coordinator with type-safe model
                coordinator.data.contactPhone = phone
                coordinator.data.contactEmail = contactEmail.isEmpty ? nil : contactEmail
                coordinator.data.website = website.isEmpty ? nil : website
                
                if !addressLine1.isEmpty {
                    coordinator.data.address = OnboardingData.Address(
                        line1: addressLine1,
                        line2: addressLine2.isEmpty ? nil : addressLine2,
                        city: city,
                        state: state,
                        zipCode: zipCode
                    )
                }
                
                coordinator.moveToNextStep()
                isSaving = false
                
            } catch {
                errorMessage = "Failed to save: \(error.localizedDescription)"
                isSaving = false
            }
        }
    }
    
    func skipStep() {
        coordinator.moveToNextStep()
    }
}

#Preview {
    OnboardingBusinessDetailsView()
        .environmentObject(OnboardingCoordinator())
}
