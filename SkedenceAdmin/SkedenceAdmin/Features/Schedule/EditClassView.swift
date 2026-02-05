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
                priceInCents: 0
            )
            onUpdated()
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
        
        isUpdating = false
    }
}
