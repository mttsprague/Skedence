//
//  EditClassView.swift
//  SkedenceAdmin
//
//  Extracted from AdminPanelView
//

import SwiftUI

struct EditClassView: View {
    @EnvironmentObject private var dependencies: AdminAppDependencies
    private var auth: AuthManager { dependencies.auth }
    @Environment(\.dismiss) private var dismiss
    let classItem: GroupClass
    @ObservedObject var adminService: AdminService
    @ObservedObject var trainersService: TrainersService
    let onUpdated: () -> Void
    
    // Convenience accessor
    private var pricingService: PricingStructureService { dependencies.pricing }
    
    @State private var title = ""
    @State private var description = ""
    @State private var startDate = Date()
    @State private var endDate = Date()
    @State private var maxParticipants = 20
    @State private var location = ""
    @State private var selectedTrainer: Trainer?
    @State private var isUpdating = false
    @State private var errorMessage: String?
    @State private var selectedPackageIds: Set<String> = [] // Selected class pass package types (not UUIDs)
    
    // Computed property for active class pass packages
    private var activeClassPasses: [PackageOption] {
        guard let pricing = pricingService.pricingStructure else { return [] }
        return pricing.allPackages.filter { $0.packageCategory == .classPass && $0.active }
    }
    
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
                            Text(trainer.displayName).tag(trainer as Trainer?)
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
                
                Section {
                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        Text("Eligible Class Passes *")
                            .font(.headline)
                            .foregroundStyle(AppTheme.textPrimary)
                        
                        Text("Select which class pass types can be used to register for this class")
                            .font(.caption)
                            .foregroundStyle(AppTheme.textSecondary)
                        
                        if activeClassPasses.isEmpty {
                            HStack(spacing: Spacing.xs) {
                                Image(systemName: "exclamationmark.triangle.fill")
                                    .foregroundStyle(.orange)
                                Text("No active class passes found. Create class passes in Pricing first.")
                                    .font(.caption)
                                    .foregroundStyle(.orange)
                            }
                            .padding(Spacing.sm)
                            .background(Color.orange.opacity(0.1))
                            .cornerRadius(CornerRadius.sm)
                        } else {
                            ForEach(activeClassPasses) { pkg in
                                Button {
                                    if selectedPackageIds.contains(pkg.packageType) {
                                        selectedPackageIds.remove(pkg.packageType)
                                    } else {
                                        selectedPackageIds.insert(pkg.packageType)
                                    }
                                } label: {
                                    HStack(spacing: Spacing.sm) {
                                        Image(systemName: selectedPackageIds.contains(pkg.packageType) ? "checkmark.square.fill" : "square")
                                            .foregroundStyle(selectedPackageIds.contains(pkg.packageType) ? AppTheme.primary : AppTheme.textSecondary)
                                        Text(pkg.title)
                                            .font(.bodyMedium)
                                            .foregroundStyle(AppTheme.textPrimary)
                                        Spacer()
                                    }
                                    .contentShape(Rectangle())
                                }
                                .buttonStyle(.plain)
                            }
                            
                            if !selectedPackageIds.isEmpty {
                                VStack(alignment: .leading, spacing: Spacing.xs) {
                                    Text("Selected: \(selectedPackageIds.count) pass type(s)")
                                        .font(.caption.weight(.medium))
                                        .foregroundStyle(AppTheme.primary)
                                    
                                    FlowLayout(spacing: Spacing.xs) {
                                        ForEach(Array(selectedPackageIds), id: \.self) { pkgType in
                                            if let pkg = activeClassPasses.first(where: { $0.packageType == pkgType }) {
                                                HStack(spacing: Spacing.xs) {
                                                    Text(pkg.title)
                                                        .font(.bodySmall)
                                                    Button {
                                                        selectedPackageIds.remove(pkgType)
                                                    } label: {
                                                        Image(systemName: "xmark.circle.fill")
                                                            .font(.caption2)
                                                    }
                                                }
                                                .padding(.horizontal, Spacing.xs)
                                                .padding(.vertical, 4)
                                                .background(AppTheme.primary.opacity(0.1))
                                                .foregroundStyle(AppTheme.primary)
                                                .cornerRadius(CornerRadius.sm)
                                            }
                                        }
                                    }
                                }
                                .padding(Spacing.sm)
                                .background(AppTheme.primary.opacity(0.05))
                                .cornerRadius(CornerRadius.sm)
                            }
                        }
                    }
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
            .keyboardDismissToolbar()
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
            title = classItem.title
            description = classItem.description
            startDate = classItem.startTime
            endDate = classItem.endTime
            maxParticipants = classItem.maxParticipants
            location = classItem.location
            
            // Convert old UUID-based eligiblePackageIds to packageType strings
            let loadedIds = Set(classItem.eligiblePackageIds)
            var convertedIds = Set<String>()
            
            for id in loadedIds {
                // Check if it's already a packageType (not a UUID)
                if activeClassPasses.contains(where: { $0.packageType == id }) {
                    convertedIds.insert(id)
                } else {
                    // Try to find matching package by UUID and convert to packageType
                    if let pkg = activeClassPasses.first(where: { $0.id == id }) {
                        convertedIds.insert(pkg.packageType)
                    }
                }
            }
            
            selectedPackageIds = convertedIds
            
            // Load trainers if not already loaded
            Task {
                if let orgId = auth.currentOrgId {
                    await trainersService.loadAll(orgId: orgId)
                    
                    // Match trainer after loading
                    if let trainer = trainersService.trainers.first(where: { $0.id == classItem.trainerId }) {
                        selectedTrainer = trainer
                    }
                }
            }
        }
    }
    
    private func updateClass() async {
        guard let trainer = selectedTrainer else {
            errorMessage = "Please select a head trainer"
            return
        }
        
        guard let trainerId = trainer.id, !trainerId.isEmpty else {
            errorMessage = "Selected trainer is missing ID."
            return
        }
        
        let trainerName = trainer.displayName
        if trainerName.isEmpty || trainerName == "Unknown" {
            errorMessage = "Selected trainer is missing name information."
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
                trainerName: trainerName,
                priceInCents: 0,
                eligiblePackageIds: Array(selectedPackageIds)
            )
            onUpdated()
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
        
        isUpdating = false
    }
}
