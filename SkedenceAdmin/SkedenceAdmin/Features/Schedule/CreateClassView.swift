//
//  CreateClassView.swift
//  SkedenceAdmin
//
//  Extracted from AdminPanelView
//

import SwiftUI

struct CreateClassView: View {
    @EnvironmentObject private var dependencies: AdminAppDependencies
    private var auth: AuthManager { dependencies.auth }
    @Environment(\.dismiss) private var dismiss
    @ObservedObject var adminService: AdminService
    @ObservedObject var trainersService: TrainersService
    
    // Convenience accessor
    private var locationsService: LocationsService { dependencies.locations }
    let onCreated: () -> Void
    
    @State private var title = ""
    @State private var description = ""
    @State private var startDate = Date()
    @State private var endDate = Date().addingTimeInterval(3600)
    @State private var maxParticipants = 20
    @State private var selectedLocation: Location?
    @State private var selectedTrainer: Trainer?
    @State private var isCreating = false
    @State private var errorMessage: String?
    @State private var showLocationError = false
    @State private var isRecurring = false
    @State private var recurringEndDate = Calendar.current.date(byAdding: .month, value: 1, to: Date()) ?? Date()
    @State private var selectedDays: Set<Int> = [] // 1=Sunday, 2=Monday, etc.
    
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
                    
                    Picker("Location", selection: $selectedLocation) {
                        Text("Select a location").tag(nil as Location?)
                        ForEach(locationsService.locations) { location in
                            Text(location.name).tag(location as Location?)
                        }
                    }
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
                    DatePicker("Start Time", selection: $startDate, in: Date()...)
                    DatePicker("End Time", selection: $endDate, in: startDate...)
                }
                
                Section("Recurring") {
                    Toggle("Repeat Weekly", isOn: $isRecurring)
                    
                    if isRecurring {
                        DatePicker("Repeat Until", selection: $recurringEndDate, in: startDate..., displayedComponents: .date)
                        
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Repeat On")
                                .font(.callout)
                                .foregroundStyle(AppTheme.textSecondary)
                            
                            HStack(spacing: 8) {
                                DayButton(day: "Su", dayIndex: 1, selectedDays: $selectedDays)
                                DayButton(day: "M", dayIndex: 2, selectedDays: $selectedDays)
                                DayButton(day: "T", dayIndex: 3, selectedDays: $selectedDays)
                                DayButton(day: "W", dayIndex: 4, selectedDays: $selectedDays)
                                DayButton(day: "Th", dayIndex: 5, selectedDays: $selectedDays)
                                DayButton(day: "F", dayIndex: 6, selectedDays: $selectedDays)
                                DayButton(day: "Sa", dayIndex: 7, selectedDays: $selectedDays)
                            }
                        }
                        
                        Text("Only the next 3 upcoming classes will be visible")
                            .font(.caption)
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                }
                
                Section("Capacity") {
                    Stepper("Max Participants: \(maxParticipants)", value: $maxParticipants, in: 1...50)
                }
                
                if let errorMessage = errorMessage {
                    Section {
                        Text(errorMessage)
                            .foregroundStyle(AppTheme.error)
                            .font(.bodySmall)
                    }
                }
            }
            .navigationTitle("Create Class")
            .navigationBarTitleDisplayMode(.inline)
            .keyboardDismissToolbar()
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Create") {
                        if locationsService.locations.isEmpty {
                            showLocationError = true
                        } else {
                            Task { await createClass() }
                        }
                    }
                    .disabled(isCreating || title.isEmpty || description.isEmpty || selectedTrainer == nil || selectedLocation == nil)
                }
            }
            .alert("No Locations Available", isPresented: $showLocationError) {
                Button("OK", role: .cancel) {}
            } message: {
                Text("You need to create at least one location before creating a class. Please go to Settings and add a location first.")
            }
            .task {
                if let orgId = auth.currentOrgId {
                    locationsService.loadLocations(orgId: orgId)
                }
            }
        }
        .navigationViewStyle(.stack)
    }
    
    private func createClass() async {
        guard let trainer = selectedTrainer else {
            errorMessage = "Please select a head trainer"
            return
        }
        guard let location = selectedLocation else {
            errorMessage = "Please select a location"
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
        
        if endDate <= startDate {
            errorMessage = "End time must be after start time"
            return
        }
        
        if isRecurring && selectedDays.isEmpty {
            errorMessage = "Please select at least one day to repeat"
            return
        }
        
        isCreating = true
        errorMessage = nil
        
        do {
            guard let orgId = auth.currentOrgId else {
                errorMessage = "Organization ID not found"
                isCreating = false
                return
            }
            
            if isRecurring {
                // Generate recurring classes, but only create the next 3 occurrences
                var occurrences: [Date] = []
                var currentDate = startDate
                let calendar = Calendar.current
                
                while currentDate <= recurringEndDate && occurrences.count < 3 {
                    let weekday = calendar.component(.weekday, from: currentDate)
                    if selectedDays.contains(weekday) {
                        occurrences.append(currentDate)
                    }
                    currentDate = calendar.date(byAdding: .day, value: 1, to: currentDate) ?? currentDate
                }
                
                // Create each occurrence
                for occurrence in occurrences {
                    let duration = endDate.timeIntervalSince(startDate)
                    let occurrenceEnd = occurrence.addingTimeInterval(duration)
                    
                    try await adminService.createClass(
                        orgId: orgId,
                        title: title,
                        description: description,
                        startTime: occurrence,
                        endTime: occurrenceEnd,
                        maxParticipants: maxParticipants,
                        location: location.name,
                        trainerId: trainerId,
                        trainerName: trainerName,
                        priceInCents: 0
                    )
                }
            } else {
                // Create single class
                try await adminService.createClass(
                    orgId: orgId,
                    title: title,
                    description: description,
                    startTime: startDate,
                    endTime: endDate,
                    maxParticipants: maxParticipants,
                    location: location.name,
                    trainerId: trainerId,
                    trainerName: trainerName,
                    priceInCents: 0
                )
            }
            
            onCreated()
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
        
        isCreating = false
    }
}

struct DayButton: View {
    let day: String
    let dayIndex: Int
    @Binding var selectedDays: Set<Int>
    
    var body: some View {
        Button {
            if selectedDays.contains(dayIndex) {
                selectedDays.remove(dayIndex)
            } else {
                selectedDays.insert(dayIndex)
            }
        } label: {
            Text(day)
                .font(.caption)
                .fontWeight(.medium)
                .frame(width: 36, height: 36)
                .background(selectedDays.contains(dayIndex) ? AppTheme.primary : Color(.systemGray5))
                .foregroundStyle(selectedDays.contains(dayIndex) ? .white : AppTheme.textSecondary)
                .cornerRadius(18)
        }
        .buttonStyle(.plain)
    }
}
