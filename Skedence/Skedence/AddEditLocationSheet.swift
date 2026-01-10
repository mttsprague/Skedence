//
//  AddEditLocationSheet.swift
//  Skedence
//
//  Created by Assistant on 1/9/26.
//

import SwiftUI

struct AddEditLocationSheet: View {
    @EnvironmentObject var auth: AuthManager
    @ObservedObject var locationsService: LocationsService
    @Environment(\.dismiss) private var dismiss
    
    let locationToEdit: Location?
    let onSave: () -> Void
    
    @State private var name: String
    @State private var addressLine1: String
    @State private var addressLine2: String
    @State private var city: String
    @State private var state: String
    @State private var zipCode: String
    @State private var isSaving = false
    @State private var errorMessage: String?
    
    init(locationsService: LocationsService, locationToEdit: Location? = nil, onSave: @escaping () -> Void) {
        self.locationsService = locationsService
        self.locationToEdit = locationToEdit
        self.onSave = onSave
        
        _name = State(initialValue: locationToEdit?.name ?? "")
        _addressLine1 = State(initialValue: locationToEdit?.addressLine1 ?? "")
        _addressLine2 = State(initialValue: locationToEdit?.addressLine2 ?? "")
        _city = State(initialValue: locationToEdit?.city ?? "")
        _state = State(initialValue: locationToEdit?.state ?? "")
        _zipCode = State(initialValue: locationToEdit?.zipCode ?? "")
    }
    
    var body: some View {
        NavigationView {
            Form {
                Section {
                    TextField("Location Name", text: $name)
                        .textContentType(.organizationName)
                } header: {
                    Text("Name")
                } footer: {
                    Text("e.g., Main Studio, Downtown Location")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                
                Section("Address") {
                    TextField("Street Address", text: $addressLine1)
                        .textContentType(.streetAddressLine1)
                    
                    TextField("Apt, Suite, etc. (optional)", text: $addressLine2)
                        .textContentType(.streetAddressLine2)
                    
                    TextField("City", text: $city)
                        .textContentType(.addressCity)
                    
                    HStack {
                        TextField("State", text: $state)
                            .textContentType(.addressState)
                            .autocapitalization(.allCharacters)
                            .frame(maxWidth: 100)
                        
                        TextField("ZIP Code", text: $zipCode)
                            .textContentType(.postalCode)
                            .keyboardType(.numberPad)
                    }
                }
                
                if let error = errorMessage {
                    Section {
                        Text(error)
                            .font(.caption)
                            .foregroundStyle(.red)
                    }
                }
            }
            .navigationTitle(locationToEdit == nil ? "Add Location" : "Edit Location")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .confirmationAction) {
                    Button(locationToEdit == nil ? "Add" : "Save") {
                        saveLocation()
                    }
                    .disabled(isSaving || !isValid)
                }
            }
            .disabled(isSaving)
            .overlay {
                if isSaving {
                    ProgressView()
                        .scaleEffect(1.5)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .background(Color.black.opacity(0.2))
                }
            }
        }
    }
    
    private var isValid: Bool {
        !name.trimmingCharacters(in: .whitespaces).isEmpty &&
        !addressLine1.trimmingCharacters(in: .whitespaces).isEmpty &&
        !city.trimmingCharacters(in: .whitespaces).isEmpty &&
        !state.trimmingCharacters(in: .whitespaces).isEmpty &&
        !zipCode.trimmingCharacters(in: .whitespaces).isEmpty
    }
    
    private func saveLocation() {
        guard let orgId = auth.currentOrgId else {
            errorMessage = "Organization ID not found"
            return
        }
        
        isSaving = true
        errorMessage = nil
        
        Task {
            do {
                if let existing = locationToEdit {
                    // Update existing location
                    var updated = existing
                    updated.name = name.trimmingCharacters(in: .whitespaces)
                    updated.addressLine1 = addressLine1.trimmingCharacters(in: .whitespaces)
                    updated.addressLine2 = addressLine2.trimmingCharacters(in: .whitespaces).isEmpty ? nil : addressLine2.trimmingCharacters(in: .whitespaces)
                    updated.city = city.trimmingCharacters(in: .whitespaces)
                    updated.state = state.trimmingCharacters(in: .whitespaces).uppercased()
                    updated.zipCode = zipCode.trimmingCharacters(in: .whitespaces)
                    
                    try await locationsService.updateLocation(updated)
                } else {
                    // Create new location
                    let newLocation = Location(
                        name: name.trimmingCharacters(in: .whitespaces),
                        addressLine1: addressLine1.trimmingCharacters(in: .whitespaces),
                        addressLine2: addressLine2.trimmingCharacters(in: .whitespaces).isEmpty ? nil : addressLine2.trimmingCharacters(in: .whitespaces),
                        city: city.trimmingCharacters(in: .whitespaces),
                        state: state.trimmingCharacters(in: .whitespaces).uppercased(),
                        zipCode: zipCode.trimmingCharacters(in: .whitespaces),
                        orgId: orgId,
                        isActive: true
                    )
                    
                    try await locationsService.addLocation(newLocation)
                }
                
                onSave()
                dismiss()
            } catch {
                errorMessage = error.localizedDescription
                isSaving = false
            }
        }
    }
}
