//
//  CreateClassView.swift
//  SkedenceAdmin
//
//  Extracted from AdminPanelView
//

import SwiftUI
import FirebaseFirestore

struct CreateClassView: View {
    @EnvironmentObject private var dependencies: AdminAppDependencies
    private var auth: AuthManager { dependencies.auth }
    @Environment(\.dismiss) private var dismiss
    @ObservedObject var adminService: AdminService
    @ObservedObject var trainersService: TrainersService
    
    // Convenience accessor
    private var locationsService: LocationsService { dependencies.locations }
    private var pricingService: PricingStructureService { dependencies.pricing }
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
    @State private var selectedPackageIds: Set<String> = [] // Selected class pass package types (not UUIDs)
    
    // Multi-day series (new feature)
    @State private var additionalDates: [Date] = [] // Additional dates for multi-day series
    @State private var showingDatePicker = false
    @State private var newDate = Date()
    
    // Overlap detection
    @State private var showOverlapAlert = false
    @State private var overlapConflicts: [(name: String, type: String, time: String)] = []
    @State private var pendingCreation = false
    
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
                    DatePicker("Start Time", selection: $startDate, in: Date()...)
                    DatePicker("End Time", selection: $endDate, in: startDate...)
                }
                
                // Multi-Day Series Section
                Section {
                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        HStack {
                            Text("Additional Dates (Optional)")
                                .font(.headline)
                                .foregroundStyle(AppTheme.textPrimary)
                            Spacer()
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
                        
                        Text("Create a multi-day class series by adding multiple dates")
                            .font(.caption)
                            .foregroundStyle(AppTheme.textSecondary)
                        
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
                                    Text("Total classes to create: \(1 + additionalDates.count)")
                                        .font(.caption.weight(.semibold))
                                        .foregroundStyle(AppTheme.primary)
                                    Text("All classes will use the same time and settings")
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
            .alert("Schedule Conflict Detected", isPresented: $showOverlapAlert) {
                Button("Cancel", role: .cancel) {
                    overlapConflicts = []
                    pendingCreation = false
                }
                Button("Confirm & Create") {
                    pendingCreation = true
                    Task { await createClass() }
                }
            } message: {
                if overlapConflicts.isEmpty {
                    Text("This class overlaps with existing session(s).")
                } else {
                    let conflictText = overlapConflicts.map { "\($0.name) (\($0.type)) - \($0.time)" }.joined(separator: "\n")
                    Text("This class overlaps with:\n\n\(conflictText)\n\nBoth sessions will appear side-by-side on the schedule.")
                }
            }
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
            .task {
                if let orgId = auth.currentOrgId {
                    locationsService.loadLocations(orgId: orgId)
                }
            }
        }
        .navigationViewStyle(.stack)
    }
    
    // Check for overlapping sessions
    private func checkForOverlaps(trainerId: String, dates: [Date], startTime: Date, duration: TimeInterval) async -> [(name: String, type: String, time: String)] {
        var conflicts: [(name: String, type: String, time: String)] = []
        let db = Firestore.firestore()
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "h:mm a"
        
        for date in dates {
            let checkStart = date
            let checkEnd = date.addingTimeInterval(duration)
            let calendar = Calendar.current
            
            // Check for overlapping classes
            do {
                let classesSnapshot = try await db.collection("classes")
                    .whereField("trainerId", isEqualTo: trainerId)
                    .whereField("orgId", isEqualTo: auth.currentOrgId ?? "")
                    .getDocuments()
                
                for classDoc in classesSnapshot.documents {
                    let data = classDoc.data()
                    guard let classStartTimestamp = data["startTime"] as? Timestamp,
                          let classEndTimestamp = data["endTime"] as? Timestamp else { continue }
                    
                    let classStart = classStartTimestamp.dateValue()
                    let classEnd = classEndTimestamp.dateValue()
                    
                    // Check if same day
                    if calendar.isDate(classStart, inSameDayAs: checkStart) {
                        // Check for time overlap
                        if (checkStart >= classStart && checkStart < classEnd) ||
                           (checkEnd > classStart && checkEnd <= classEnd) ||
                           (checkStart <= classStart && checkEnd >= classEnd) {
                            let title = data["title"] as? String ?? "Class"
                            let timeStr = "\(dateFormatter.string(from: classStart)) - \(dateFormatter.string(from: classEnd))"
                            conflicts.append((name: title, type: "Class", time: timeStr))
                        }
                    }
                }
                
                // Check for overlapping schedule slots
                let schedulesSnapshot = try await db.collection("trainers")
                    .document(trainerId)
                    .collection("schedules")
                    .getDocuments()
                
                for scheduleDoc in schedulesSnapshot.documents {
                    let data = scheduleDoc.data()
                    guard let scheduleStartTimestamp = data["startTime"] as? Timestamp,
                          let scheduleEndTimestamp = data["endTime"] as? Timestamp else { continue }
                    
                    let scheduleStart = scheduleStartTimestamp.dateValue()
                    let scheduleEnd = scheduleEndTimestamp.dateValue()
                    
                    // Check if same day
                    if calendar.isDate(scheduleStart, inSameDayAs: checkStart) {
                        // Check for time overlap
                        if (checkStart >= scheduleStart && checkStart < scheduleEnd) ||
                           (checkEnd > scheduleStart && checkEnd <= scheduleEnd) ||
                           (checkStart <= scheduleStart && checkEnd >= scheduleEnd) {
                            let isClassBooking = data["isClassBooking"] as? Bool ?? false
                            let status = data["status"] as? String ?? ""
                            let clientName = data["clientName"] as? String ?? ""
                            
                            let name: String
                            let type: String
                            if isClassBooking {
                                name = clientName.isEmpty ? "Class" : clientName
                                type = "Class"
                            } else if status == "booked" {
                                name = clientName.isEmpty ? "Lesson" : clientName
                                type = "Lesson"
                            } else {
                                name = "Available Time Slot"
                                type = "Availability"
                            }
                            
                            let timeStr = "\(dateFormatter.string(from: scheduleStart)) - \(dateFormatter.string(from: scheduleEnd))"
                            conflicts.append((name: name, type: type, time: timeStr))
                        }
                    }
                }
            } catch {
                print("Error checking overlaps: \(error)")
            }
        }
        
        return conflicts
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
        
        // Check for overlaps before creating (skip if already confirmed)
        if !pendingCreation {
            let allDates = [startDate] + additionalDates
            let duration = endDate.timeIntervalSince(startDate)
            let conflicts = await checkForOverlaps(trainerId: trainerId, dates: allDates, startTime: startDate, duration: duration)
            
            if !conflicts.isEmpty {
                overlapConflicts = conflicts
                showOverlapAlert = true
                return
            }
        }
        
        isCreating = true
        errorMessage = nil
        
        do {
            guard let orgId = auth.currentOrgId else {
                errorMessage = "Organization ID not found"
                isCreating = false
                return
            }
            
            // Check if multi-day series or recurring
            let allDates = [startDate] + additionalDates
            let isMultiDay = allDates.count > 1
            
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
                        priceInCents: 0,
                        eligiblePackageIds: Array(selectedPackageIds)
                    )
                }
            } else if isMultiDay {
                // Create multi-day series with unique seriesId
                let seriesId = "series_\(Int(Date().timeIntervalSince1970))_\(UUID().uuidString.prefix(9))"
                let duration = endDate.timeIntervalSince(startDate)
                
                for date in allDates {
                    let classStartTime = date
                    let classEndTime = date.addingTimeInterval(duration)
                    
                    try await adminService.createClass(
                        orgId: orgId,
                        title: title,
                        description: description,
                        startTime: classStartTime,
                        endTime: classEndTime,
                        maxParticipants: maxParticipants,
                        location: location.name,
                        trainerId: trainerId,
                        trainerName: trainerName,
                        priceInCents: 0,
                        eligiblePackageIds: Array(selectedPackageIds),
                        seriesId: seriesId,
                        isPartOfSeries: true,
                        totalSeriesClasses: allDates.count
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
                    priceInCents: 0,
                    eligiblePackageIds: Array(selectedPackageIds)
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

// Simple flow layout for wrapping package chips
struct FlowLayout: Layout {
    var spacing: CGFloat = 8
    
    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = FlowResult(in: proposal.replacingUnspecifiedDimensions().width, subviews: subviews, spacing: spacing)
        return result.size
    }
    
    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = FlowResult(in: bounds.width, subviews: subviews, spacing: spacing)
        for (index, subview) in subviews.enumerated() {
            subview.place(at: CGPoint(x: bounds.minX + result.frames[index].minX, y: bounds.minY + result.frames[index].minY), proposal: .unspecified)
        }
    }
    
    struct FlowResult {
        var frames: [CGRect] = []
        var size: CGSize = .zero
        
        init(in maxWidth: CGFloat, subviews: Subviews, spacing: CGFloat) {
            var currentX: CGFloat = 0
            var currentY: CGFloat = 0
            var lineHeight: CGFloat = 0
            
            for subview in subviews {
                let size = subview.sizeThatFits(.unspecified)
                
                if currentX + size.width > maxWidth && currentX > 0 {
                    currentX = 0
                    currentY += lineHeight + spacing
                    lineHeight = 0
                }
                
                frames.append(CGRect(x: currentX, y: currentY, width: size.width, height: size.height))
                lineHeight = max(lineHeight, size.height)
                currentX += size.width + spacing
            }
            
            self.size = CGSize(width: maxWidth, height: currentY + lineHeight)
        }
    }
}
