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
    
    // Convenience accessors
    private var pricingService: PricingStructureService { dependencies.pricing }
    private var locationsService: LocationsService { dependencies.locations }
    
    @State private var title = ""
    @State private var description = ""
    @State private var startDate = Date()
    @State private var endDate = Date()
    @State private var maxParticipants = 20
    @State private var selectedLocation: Location?
    @State private var selectedTrainer: Trainer?
    @State private var isUpdating = false
    @State private var errorMessage: String?
    @State private var selectedPackageIds: Set<String> = [] // Selected class pass package types (not UUIDs)
    
    // Multi-day series (new feature)
    @State private var additionalDates: [Date] = [] // Additional dates for multi-day series
    @State private var showingDatePicker = false
    @State private var newDate = Date()
    
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
                    DatePicker("Start Time", selection: $startDate)
                    DatePicker("End Time", selection: $endDate)
                }
                
                // Multi-Day Series Section
                Section {
                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        HStack {
                            Text("Additional Dates (Optional)")
                                .font(.headline)
                                .foregroundStyle(AppTheme.textPrimary)
                            Spacer()
                            
                            // Only allow adding dates if NOT already part of a series
                            if classItem.seriesId == nil {
                                Button {
                                    newDate = Calendar.current.date(byAdding: .day, value: 1, to: startDate) ?? Date()
                                    showingDatePicker = true
                                } label: {
                                    HStack(spacing: Spacing.xs) {
                                        Image(systemName: "plus.circle.fill")
                                        Text("Add Day")
                                    }
                                    .font(.bodyMedium.weight(.semibold))
                                    .foregroundStyle(.white)
                                    .padding(.horizontal, Spacing.sm)
                                    .padding(.vertical, Spacing.xs)
                                    .background(AppTheme.primary)
                                    .cornerRadius(CornerRadius.sm)
                                }
                            }
                        }
                        
                        if classItem.seriesId != nil {
                            HStack(spacing: Spacing.xs) {
                                Image(systemName: "info.circle.fill")
                                    .foregroundStyle(AppTheme.textSecondary)
                                Text("This class is part of a series. Edit each class separately to modify dates.")
                                    .font(.caption)
                                    .foregroundStyle(AppTheme.textSecondary)
                            }
                            .padding(Spacing.sm)
                            .background(Color(.systemGray6))
                            .cornerRadius(CornerRadius.sm)
                        } else {
                            Text("Add dates to create a multi-day class series")
                                .font(.caption)
                                .foregroundStyle(AppTheme.textSecondary)
                        }
                        
                        if !additionalDates.isEmpty {
                            VStack(spacing: Spacing.xs) {
                                ForEach(Array(additionalDates.enumerated()), id: \.offset) { index, date in
                                    HStack(spacing: Spacing.sm) {
                                        Image(systemName: "calendar")
                                            .foregroundStyle(AppTheme.textSecondary)
                                        Text(date.formatted(.dateTime.month(.wide).day().year()))
                                            .font(.bodyMedium)
                                            .foregroundStyle(AppTheme.textPrimary)
                                        Spacer()
                                        Button {
                                            additionalDates.remove(at: index)
                                        } label: {
                                            Image(systemName: "xmark.circle.fill")
                                                .foregroundStyle(.red)
                                        }
                                    }
                                    .padding(Spacing.sm)
                                    .background(Color(.systemGray6))
                                    .cornerRadius(CornerRadius.sm)
                                }
                            }
                            
                            // Summary info
                            HStack(spacing: Spacing.xs) {
                                Image(systemName: "info.circle.fill")
                                    .foregroundStyle(AppTheme.primary)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("Total classes: \(1 + additionalDates.count)")
                                        .font(.caption.weight(.semibold))
                                        .foregroundStyle(AppTheme.primary)
                                    Text("New classes will use the same time and settings")
                                        .font(.caption2)
                                        .foregroundStyle(AppTheme.textSecondary)
                                }
                            }
                            .padding(Spacing.sm)
                            .background(AppTheme.primary.opacity(0.1))
                            .cornerRadius(CornerRadius.sm)
                        }
                    }
                } header: {
                    Text("Multi-Day Series")
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
            .sheet(isPresented: $showingDatePicker) {
                NavigationView {
                    VStack(spacing: Spacing.md) {
                        DatePicker("Select Date", selection: $newDate, in: Date()..., displayedComponents: .date)
                            .datePickerStyle(.graphical)
                            .padding()
                        
                        Spacer()
                    }
                    .navigationTitle("Add Date")
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) {
                            Button("Cancel") { showingDatePicker = false }
                        }
                        ToolbarItem(placement: .confirmationAction) {
                            Button("Add") {
                                // Check for duplicates
                                let calendar = Calendar.current
                                let isDuplicate = additionalDates.contains { existingDate in
                                    calendar.isDate(existingDate, inSameDayAs: newDate)
                                } || calendar.isDate(startDate, inSameDayAs: newDate)
                                
                                if !isDuplicate {
                                    additionalDates.append(newDate)
                                    additionalDates.sort()
                                }
                                showingDatePicker = false
                            }
                        }
                    }
                }
                .presentationDetents([.medium])
            }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        Task { await updateClass() }
                    }
                    .disabled(isUpdating || title.isEmpty || description.isEmpty || selectedTrainer == nil || selectedLocation == nil)
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
            
            // Load locations and trainers
            Task {
                if let orgId = auth.currentOrgId {
                    // Load locations first
                    locationsService.loadLocations(orgId: orgId)
                    
                    // Find matching location by name
                    selectedLocation = locationsService.locations.first { $0.name == classItem.location }
                    
                    // Load trainers
                    await trainersService.loadAll(orgId: orgId)
                    
                    // Match trainer after loading
                    if let trainer = trainersService.trainers.first(where: { $0.id == classItem.trainerId }) {
                        selectedTrainer = trainer
                    }
                }
            }
            
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
            
            // If additional dates were added, create a multi-day series
            if !additionalDates.isEmpty {
                // Generate a series ID for the new multi-day series
                let seriesId = "series_\(Int(Date().timeIntervalSince1970))_\(UUID().uuidString.prefix(9))"
                let duration = endDate.timeIntervalSince(startDate)
                let totalClasses = 1 + additionalDates.count
                
                // Update the original class to be part of the series
                try await adminService.updateClass(
                    classId: classId,
                    orgId: orgId,
                    title: title,
                    description: description,
                    startTime: startDate,
                    endTime: endDate,
                    maxParticipants: maxParticipants,
                    location: selectedLocation?.name ?? "",
                    trainerId: trainerId,
                    trainerName: trainerName,
                    priceInCents: 0,
                    eligiblePackageIds: Array(selectedPackageIds),
                    seriesId: seriesId,
                    isPartOfSeries: true,
                    totalSeriesClasses: totalClasses
                )
                
                // Create new classes for additional dates
                for date in additionalDates {
                    let classStartTime = date
                    let classEndTime = date.addingTimeInterval(duration)
                    
                    try await adminService.createClass(
                        orgId: orgId,
                        title: title,
                        description: description,
                        startTime: classStartTime,
                        endTime: classEndTime,
                        maxParticipants: maxParticipants,
                        location: selectedLocation?.name ?? "",
                        trainerId: trainerId,
                        trainerName: trainerName,
                        priceInCents: 0,
                        eligiblePackageIds: Array(selectedPackageIds),
                        seriesId: seriesId,
                        isPartOfSeries: true,
                        totalSeriesClasses: totalClasses
                    )
                }
            } else {
                // Normal update without series
                try await adminService.updateClass(
                    classId: classId,
                    orgId: orgId,
                    title: title,
                    description: description,
                    startTime: startDate,
                    endTime: endDate,
                    maxParticipants: maxParticipants,
                    location: selectedLocation?.name ?? "",
                    trainerId: trainerId,
                    trainerName: trainerName,
                    priceInCents: 0,
                    eligiblePackageIds: Array(selectedPackageIds)
                )
            }
            
            onUpdated()
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
        
        isUpdating = false
    }
}
