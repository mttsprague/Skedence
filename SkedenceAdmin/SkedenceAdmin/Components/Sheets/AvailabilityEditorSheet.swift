//
//  AvailabilityEditorSheet.swift
//  SkedenceAdmin
//
//  Created by Assistant on 10/13/25.
//

import SwiftUI
import FirebaseFirestore

struct AvailabilityEditorSheet: View {
    let defaultDay: Date
    let defaultHour: Int
    let isAdmin: Bool
    let editingTrainerId: String?
    let orgId: String?
    let onSaveSingle: (Date, Date, Date, TrainerScheduleSlot.Status, Bool, String?) -> Void
    let onSaveOngoing: (Date?, Date?, Int?, Int?, Int?, [Int]?, TrainerScheduleSlot.Status, Bool, String?) -> Void
    let onBookingCompleted: () async -> Void

    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var dependencies: AdminAppDependencies
    
    // Convenience accessor
    private var locationsService: LocationsService { dependencies.locations }

    // Single-slot state
    @State private var singleDay: Date
    @State private var singleStart: Date
    @State private var singleEnd: Date
    @State private var singleStatus: TrainerScheduleSlot.Status = .open
    @State private var selectedLocation: Location?

    // Recurring toggle and inputs
    @State private var recurringEnabled: Bool = false
    @State private var bulkStartDate: Date? = nil
    @State private var bulkEndDate: Date? = nil

    // Recurring: selected weekdays and common daily window with minute precision
    // Weekday indices 0...6 => Sunday...Saturday
    @State private var selectedWeekdays: Set<Int> = []
    @State private var recurringStartHour: Int
    @State private var recurringStartMinute: Int
    @State private var recurringEndHour: Int
    @State private var recurringEndMinute: Int
    @State private var recurringSlotDuration: Int = 60 // Duration in minutes
    @State private var recurringLocation: Location?
    
    // Admin: apply unavailability to all trainers
    @State private var applyToAllTrainers: Bool = false
    
    // Main tab selection
    @State private var mainTab: MainTab = .editAvailability
    
    enum MainTab {
        case editAvailability
        case bookLesson
    }
    
    // Admin booking state
    @State private var allClients: [Client] = []
    @State private var selectedClientId: String?
    @State private var clientPackages: [LessonPackage] = []
    @State private var selectedPackageId: String?
    @State private var isLoadingClients: Bool = false
    @State private var isLoadingPackages: Bool = false
    @State private var isBooking: Bool = false
    @State private var bookingError: String?
    @State private var showBookingSuccess: Bool = false
    @State private var showBookingError: Bool = false
    @State private var bookingResultMessage: String = ""
    
    // Overlap detection state
    @State private var showOverlapWarning: Bool = false
    @State private var overlapMessage: String = ""
    @State private var pendingSaveAction: (() -> Void)? = nil

    init(
        defaultDay: Date,
        defaultHour: Int,
        isAdmin: Bool = false,
        editingTrainerId: String? = nil,
        orgId: String? = nil,
        onSaveSingle: @escaping (Date, Date, Date, TrainerScheduleSlot.Status, Bool, String?) -> Void,
        onSaveOngoing: @escaping (Date?, Date?, Int?, Int?, Int?, [Int]?, TrainerScheduleSlot.Status, Bool, String?) -> Void,
        onBookingCompleted: @escaping () async -> Void = { }
    ) {
        self.defaultDay = defaultDay
        self.defaultHour = defaultHour
        self.isAdmin = isAdmin
        self.editingTrainerId = editingTrainerId
        self.orgId = orgId
        self.onSaveSingle = onSaveSingle
        self.onSaveOngoing = onSaveOngoing
        self.onBookingCompleted = onBookingCompleted

        // Initialize state with provided defaults
        let cal = Calendar.current
        _singleDay = State(initialValue: defaultDay)
        // Allow any minute value - don't force to :00
        let start = cal.date(bySettingHour: defaultHour, minute: 0, second: 0, of: defaultDay) ?? defaultDay
        let end = cal.date(byAdding: .minute, value: 60, to: start) ?? start.addingTimeInterval(3600)
        _singleStart = State(initialValue: start)
        _singleEnd = State(initialValue: end)

        _recurringStartHour = State(initialValue: defaultHour)
        _recurringStartMinute = State(initialValue: 0)
        _recurringEndHour = State(initialValue: min(defaultHour + 1, 24))
        _recurringEndMinute = State(initialValue: 0)
    }

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Main tab selector (only shown for admin)
                if isAdmin {
                    Picker("Mode", selection: $mainTab) {
                        Text("Edit Availability").tag(MainTab.editAvailability)
                        Text("Book a Lesson").tag(MainTab.bookLesson)
                    }
                    .pickerStyle(.segmented)
                    .padding(.horizontal)
                    .padding(.top, 8)
                    .padding(.bottom, 4)
                }
                
                // Content based on selected main tab
                if mainTab == .editAvailability {
                    editAvailabilityContent
                } else if isAdmin {
                    bookLessonContent
                }
            }
            .navigationTitle(mainTab == .editAvailability ? "Edit Availability" : "Book a Lesson")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                if mainTab == .editAvailability && !recurringEnabled {
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Save") { 
                            saveSingle()
                        }
                        .disabled(singleSaveDisabled)
                    }
                }
            }
            .alert("Success", isPresented: $showBookingSuccess) {
                Button("OK", role: .cancel) { }
            } message: {
                Text(bookingResultMessage)
            }
            .alert("Booking Failed", isPresented: $showBookingError) {
                Button("OK", role: .cancel) { }
            } message: {
                Text(bookingResultMessage)
            }
            .alert("Time Slot Overlap", isPresented: $showOverlapWarning) {
                Button("Cancel", role: .cancel) {
                    pendingSaveAction = nil
                }
                Button("Create Anyway") {
                    if let action = pendingSaveAction {
                        action()
                    }
                    pendingSaveAction = nil
                    dismiss()
                }
            } message: {
                Text(overlapMessage)
            }
            .onAppear {
                if isAdmin {
                    loadClients()
                }
                // Load locations
                if let orgId = orgId {
                    locationsService.loadLocations(orgId: orgId)
                }
            }
        }
        .navigationViewStyle(.stack)
    }
    
    // MARK: - Edit Availability Content
    
    private var editAvailabilityContent: some View {
        Form {
            // Top choice: Availability vs Unavailability (status for single slot)
            Picker("Status", selection: $singleStatus) {
                Text("Availability").tag(TrainerScheduleSlot.Status.open)
                Text("Unavailability").tag(TrainerScheduleSlot.Status.unavailable)
            }
            .pickerStyle(.segmented)
            
            // Admin: Apply to all trainers (only for unavailability)
            if isAdmin && singleStatus == .unavailable {
                Section {
                    Toggle("Apply to all trainers", isOn: $applyToAllTrainers)
                } footer: {
                    Text("When enabled, this unavailability will be applied to all trainers' schedules.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }

            // Single-slot editor
            singleSection

            // Recurring editor (toggle on/off, then show details)
            recurringSection
        }
    }
    
    // MARK: - Book Lesson Content
    
    private var bookLessonContent: some View {
        Form {
            Section {
                // Client selector
                if isLoadingClients {
                    HStack {
                        ProgressView()
                        Text("Loading clients...")
                            .foregroundStyle(.secondary)
                    }
                } else if allClients.isEmpty {
                    Text("No clients found")
                        .foregroundStyle(.secondary)
                } else {
                    Picker("Client", selection: $selectedClientId) {
                        Text("Select a client...").tag(nil as String?)
                        ForEach(allClients) { client in
                            Text(client.fullName).tag(Optional(client.id))
                        }
                    }
                    .onChange(of: selectedClientId) { _, newValue in
                        if let clientId = newValue {
                            loadPackagesForClient(clientId)
                        } else {
                            clientPackages = []
                            selectedPackageId = nil
                        }
                    }
                }
            } header: {
                Text("Select Client")
            }
            
            Section {
                DatePicker("Start Time", selection: $singleStart, displayedComponents: [.date, .hourAndMinute])
                    .onChange(of: singleStart) { _, _ in
                        // Ensure end is at least 1 hour after start
                        let cal = Calendar.current
                        let minEnd = cal.date(byAdding: .hour, value: 1, to: singleStart) ?? singleStart.addingTimeInterval(3600)
                        if singleEnd < minEnd {
                            singleEnd = minEnd
                        }
                    }
                
                DatePicker("End Time", selection: $singleEnd, displayedComponents: [.date, .hourAndMinute])
            } header: {
                Text("Lesson Time")
            }
            
            Section {
                // Location picker
                Picker("Location", selection: $selectedLocation) {
                    Text("Select Location").tag(nil as Location?)
                    ForEach(locationsService.locations) { location in
                        Text(location.name).tag(location as Location?)
                    }
                }
            } header: {
                Text("Lesson Location")
            } footer: {
                if selectedLocation == nil {
                    Text("⚠️ Location is required")
                        .font(.footnote)
                        .foregroundStyle(.red)
                }
            }
            
            Section {
                // Package selector - show individual packages like client app
                if selectedClientId != nil {
                    if isLoadingPackages {
                        HStack {
                            ProgressView()
                            Text("Loading packages...")
                                .foregroundStyle(.secondary)
                        }
                    } else if availablePackages.isEmpty {
                        Text("No available passes for this client")
                            .foregroundStyle(.secondary)
                            .font(.caption)
                    } else {
                        Picker("Select Pass", selection: $selectedPackageId) {
                            Text("Choose a pass...").tag(nil as String?)
                            ForEach(availablePackages) { package in
                                Text("\(package.packageDisplayName) (\(package.lessonsRemaining) left)")
                                    .tag(Optional(package.id))
                            }
                        }
                        .pickerStyle(.menu)
                    }
                } else {
                    Text("Please select a client first")
                        .foregroundStyle(.secondary)
                        .font(.caption)
                }
            } header: {
                Text("Lesson Package")
            }
            
            Section {
                Button {
                    Task {
                        await bookLesson()
                    }
                } label: {
                    HStack {
                        Spacer()
                        if isBooking {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                .scaleEffect(0.8)
                        }
                        Text(isBooking ? "Booking..." : "Book Lesson")
                        Spacer()
                    }
                }
                .listRowBackground((canBookLesson && !isBooking) ? Color.accentColor : Color.gray)
                .foregroundStyle(.white)
                .disabled(!canBookLesson || isBooking)
                
                if let error = bookingError {
                    Text(error)
                        .foregroundStyle(.red)
                        .font(.caption)
                }
            }
        }
    }

    private var singleSection: some View {
        Section {
            DatePicker("Day", selection: $singleDay, displayedComponents: .date)
                .onChange(of: singleDay) { _, _ in
                    // Re-anchor both times to selected day, preserve minutes
                    let cal = Calendar.current
                    singleStart = anchor(time: singleStart, toDay: singleDay, calendar: cal)
                    singleEnd = anchor(time: singleEnd, toDay: singleDay, calendar: cal)
                }

            // Start time: editable with minute precision
            DatePicker("Start", selection: $singleStart, displayedComponents: .hourAndMinute)
                .onChange(of: singleStart) { _, newValue in
                    // Ensure end is at least 15 minutes after start
                    let minEnd = Calendar.current.date(byAdding: .minute, value: 15, to: newValue) ?? newValue.addingTimeInterval(900)
                    if singleEnd < minEnd {
                        singleEnd = minEnd
                    }
                }

            // End time: editable with minute precision, must be >= start + 15 min
            DatePicker(
                "End",
                selection: $singleEnd,
                in: (Calendar.current.date(byAdding: .minute, value: 15, to: singleStart) ?? singleStart.addingTimeInterval(900))...,
                displayedComponents: .hourAndMinute
            )
            
            // Location picker
            Picker("Location", selection: $selectedLocation) {
                Text("Select Location").tag(nil as Location?)
                ForEach(locationsService.locations) { location in
                    Text(location.name).tag(location as Location?)
                }
            }
        } header: {
            Text("Single Slot")
        } footer: {
            if !recurringEnabled && selectedLocation == nil {
                Text("⚠️ Location is required for single slots")
                    .font(.footnote)
                    .foregroundStyle(.red)
            } else if recurringEnabled {
                Text("💡 Location not required when using recurring")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            } else {
                Text("ℹ️ Schedule hours: 6:00 AM - 12:00 AM (midnight)")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var recurringSection: some View {
        Group {
            Section {
                Toggle("Recurring", isOn: $recurringEnabled)

                if recurringEnabled {
                    VStack(alignment: .center, spacing: 12) {
                        Text("Days of Week")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(.secondary)
                            .frame(maxWidth: .infinity, alignment: .center)

                        // Single-line, centered weekday chips
                        FlexibleWeekdayChips(
                            selected: $selectedWeekdays,
                            weekdaySymbols: Calendar.current.shortWeekdaySymbols
                        )
                        .frame(maxWidth: .infinity, alignment: .center)

                        // Common daily window with minute precision
                        Text("Daily Start Time")
                            .font(.subheadline)
                            .foregroundStyle(AppTheme.textSecondary)
                        
                        HStack {
                            Text("Hour")
                            Spacer()
                            Picker("", selection: $recurringStartHour) {
                                ForEach(6...23, id: \.self) { h in
                                    Text("\(h)").tag(h)
                                }
                            }
                            .pickerStyle(.menu)
                        }
                        
                        HStack {
                            Text("Minute")
                            Spacer()
                            Picker("", selection: $recurringStartMinute) {
                                Text(":00").tag(0)
                                Text(":15").tag(15)
                                Text(":30").tag(30)
                                Text(":45").tag(45)
                            }
                            .pickerStyle(.menu)
                            .id("startMinute")
                        }
                        
                        Text("Daily End Time")
                            .font(.subheadline)
                            .foregroundStyle(AppTheme.textSecondary)
                        
                        HStack {
                            Text("Hour")
                            Spacer()
                            Picker("", selection: $recurringEndHour) {
                                ForEach(7...24, id: \.self) { h in
                                    Text("\(h)").tag(h)
                                }
                            }
                            .pickerStyle(.menu)
                        }
                        
                        HStack {
                            Text("Minute")
                            Spacer()
                            Picker("", selection: $recurringEndMinute) {
                                Text(":00").tag(0)
                                Text(":15").tag(15)
                                Text(":30").tag(30)
                                Text(":45").tag(45)
                            }
                            .pickerStyle(.menu)
                            .id("endMinute")
                        }
                        
                        // Slot duration picker
                        Picker("Slot Duration", selection: $recurringSlotDuration) {
                            Text("15 minutes").tag(15)
                            Text("30 minutes").tag(30)
                            Text("45 minutes").tag(45)
                            Text("1 hour").tag(60)
                            Text("1.5 hours").tag(90)
                            Text("2 hours").tag(120)
                        }
                        .pickerStyle(.menu)

                        // Date range
                        DatePicker("Start Date", selection: Binding<Date>(
                            get: { bulkStartDate ?? Calendar.current.startOfDay(for: defaultDay) },
                            set: { bulkStartDate = $0 }
                        ), displayedComponents: .date)

                        DatePicker("End Date", selection: Binding<Date>(
                            get: {
                                if let d = bulkEndDate { return d }
                                // Default to one month after start
                                let start = bulkStartDate ?? Calendar.current.startOfDay(for: defaultDay)
                                return Calendar.current.date(byAdding: .month, value: 1, to: start) ?? start
                            },
                            set: { bulkEndDate = $0 }
                        ), displayedComponents: .date)
                        
                        // Location picker for recurring
                        Picker("Location", selection: $recurringLocation) {
                            Text("Select Location").tag(nil as Location?)
                            ForEach(locationsService.locations) { location in
                                Text(location.name).tag(location as Location?)
                            }
                        }
                        
                        // Apply recurring button
                        Button {
                            applyRecurring()
                        } label: {
                            HStack {
                                Spacer()
                                Text("Apply Recurring Schedule")
                                    .font(.headline)
                                Spacer()
                            }
                            .padding(.vertical, 12)
                            .background(recurringDisabled ? Color.gray : Color.accentColor)
                            .foregroundStyle(.white)
                            .cornerRadius(10)
                        }
                        .buttonStyle(.plain)
                        .disabled(recurringDisabled)
                        .padding(.top, 8)
                    }
                    .frame(maxWidth: .infinity, alignment: .center)
                }
            } header: {
                Text("Recurring")
            } footer: {
                if recurringEnabled && recurringLocation == nil {
                    Text("⚠️ Location is required for recurring availability")
                        .font(.footnote)
                        .foregroundStyle(.red)
                } else if recurringEnabled {
                    Text("ℹ️ Recurring hours: 6:00 AM - 12:00 AM (midnight)")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
        }
    }
    
    private var availablePackages: [LessonPackage] {
        // Only show lesson packages (pass category), not class packages
        // Sort by expiration date (earliest first) then by purchase date (oldest first)
        clientPackages
            .filter { !$0.isExpired && $0.lessonsRemaining > 0 && $0.canBookLessons }
            .filter { $0.packageCategory != "classPass" && $0.packageType != "class" && $0.packageType != "class_pass" }
            .sorted { pkg1, pkg2 in
                // Sort by expiration date first (if both have one, earliest first)
                if let exp1 = pkg1.expirationDate, let exp2 = pkg2.expirationDate {
                    return exp1 < exp2
                } else if pkg1.expirationDate != nil {
                    return true // pkg1 has expiration, prioritize it
                } else if pkg2.expirationDate != nil {
                    return false // pkg2 has expiration, prioritize it
                }
                // If neither has expiration or both don't, use oldest purchase date
                return pkg1.purchaseDate < pkg2.purchaseDate
            }
    }
    
    private var canBookLesson: Bool {
        guard let clientId = selectedClientId,
              let packageId = selectedPackageId,
              !clientId.isEmpty,
              !packageId.isEmpty,
              selectedLocation != nil,  // Location is required
              singleEnd > singleStart,
              !isBooking else {
            return false
        }
        return true
    }
    
    // MARK: - Admin Booking Functions
    
    private func loadClients() {
        guard let trainerId = editingTrainerId,
              let orgId = orgId else {
            return
        }
        
        isLoadingClients = true
        Task {
            do {
                let clients = try await ClientsRepository().fetchClients(trainerId: trainerId, orgId: orgId)
                await MainActor.run {
                    self.allClients = clients
                    self.isLoadingClients = false
                }
            } catch {
                await MainActor.run {
                    self.bookingError = "Failed to load clients: \(error.localizedDescription)"
                    self.isLoadingClients = false
                }
            }
        }
    }
    
    private func loadPackagesForClient(_ clientId: String) {
        isLoadingPackages = true
        bookingError = nil
        selectedPackageId = nil
        
        Task {
            do {
                let packages = try await FirestoreClientsService.shared.fetchClientPackages(clientId: clientId)
                await MainActor.run {
                    self.clientPackages = packages
                    self.isLoadingPackages = false
                }
            } catch {
                await MainActor.run {
                    self.bookingError = "Failed to load packages: \(error.localizedDescription)"
                    self.clientPackages = []
                    self.isLoadingPackages = false
                }
            }
        }
    }
    
    private func bookLesson() async {
        guard let clientId = selectedClientId,
              let packageId = selectedPackageId else {
            bookingError = "Please select a client and package"
            return
        }
        
        guard selectedLocation != nil else {
            bookingError = "Please select a location"
            return
        }
        
        
        isBooking = true
        bookingError = nil
        
        guard let trainerId = editingTrainerId,
              let orgId = orgId else {
            bookingError = "Missing trainer or organization"
            isBooking = false
            return
        }

        do {
            try await FirestoreScheduleService.shared.upsertTrainerSlot(
                trainerId: trainerId,
                orgId: orgId,
                startTime: singleStart,
                endTime: singleEnd,
                status: .open,
                location: selectedLocation?.name
            )

            let slotId = scheduleDocId(for: singleStart)

            try await FirestoreClientsService.shared.adminBookLesson(
                trainerId: trainerId,
                slotId: slotId,
                clientId: clientId,
                packageId: packageId,
                orgId: orgId
            )

            await onBookingCompleted()

            isBooking = false
            bookingResultMessage = "Lesson successfully booked!"
            showBookingSuccess = true

            // Wait for user to see success alert, then dismiss
            try? await Task.sleep(nanoseconds: 1_500_000_000) // 1.5 seconds
            dismiss()
        } catch {
            isBooking = false
            bookingResultMessage = "Booking failed: \(error.localizedDescription)"
            showBookingError = true
        }
    }

    private var singleSaveDisabled: Bool {
        // Location IS required for single slots ONLY if recurring is not enabled
        if !recurringEnabled && selectedLocation == nil { return true }
        if singleEnd <= singleStart { return true }
        
        // Enforce 6am-12am range for single slots
        let cal = Calendar.current
        let startHour = cal.component(.hour, from: singleStart)
        let endHour = cal.component(.hour, from: singleEnd)
        
        // Start must be between 6am and 11pm
        if startHour < 6 || startHour > 23 { return true }
        // End must be after 6am and up to 12am (hour 0 of next day is ok if it's the next day)
        if endHour < 6 && !cal.isDate(singleEnd, inSameDayAs: singleStart.addingTimeInterval(86400)) {
            // If end hour is < 6 and it's not the next day, invalid
            return true
        }
        
        return false
    }

    private var recurringDisabled: Bool {
        guard recurringEnabled else { return false }
        // Location IS required for recurring
        if recurringLocation == nil { return true }
        // Need at least one day selected
        if selectedWeekdays.isEmpty { return true }
        // Validate daily window
        if recurringEndHour <= recurringStartHour { return true }
        // Enforce 6am-12am range
        if recurringStartHour < 6 || recurringStartHour > 23 { return true }
        if recurringEndHour < 7 || recurringEndHour > 24 { return true }
        // Validate date range - use default end date if not set (matching DatePicker behavior)
        let start = bulkStartDate ?? Calendar.current.startOfDay(for: defaultDay)
        let end = bulkEndDate ?? Calendar.current.date(byAdding: .month, value: 1, to: start) ?? start
        if end < start { return true }
        return false
    }

    private func saveSingle() {
        let cal = Calendar.current
        // Don't round to hour - respect exact time selections
        let startOnDay = anchor(time: singleStart, toDay: singleDay, calendar: cal)
        let endOnDay = anchor(time: singleEnd, toDay: singleDay, calendar: cal)
        
        // Calculate the duration in minutes between start and end
        let minutesBetween = cal.dateComponents([.minute], from: startOnDay, to: endOnDay).minute ?? 60
        
        // Check for overlaps before saving
        guard minutesBetween >= 15 else { return } // Minimum 15 minutes
        
        Task {
            if await checkForOverlap(start: startOnDay, end: endOnDay) {
                // Show warning and store the save action
                await MainActor.run {
                    let formatter = DateFormatter()
                    formatter.dateFormat = "h:mm a"
                    overlapMessage = "This time slot (\(formatter.string(from: startOnDay)) - \(formatter.string(from: endOnDay))) overlaps with an existing slot. Do you want to create it anyway?"
                    pendingSaveAction = {
                        self.onSaveSingle(self.singleDay, startOnDay, endOnDay, self.singleStatus, self.applyToAllTrainers, self.selectedLocation?.name)
                    }
                    showOverlapWarning = true
                }
            } else {
                // No overlap, save directly
                await MainActor.run {
                    onSaveSingle(singleDay, startOnDay, endOnDay, singleStatus, applyToAllTrainers, selectedLocation?.name)
                    dismiss()
                }
            }
        }
    }
    
    private func checkForOverlap(start: Date, end: Date) async -> Bool {
        guard let trainerId = editingTrainerId, let orgId = orgId else { return false }
        
        // Query existing slots for this trainer on this day
        do {
            let db = Firestore.firestore()
            let cal = Calendar.current
            let dayStart = cal.startOfDay(for: start)
            let dayEnd = cal.date(byAdding: .day, value: 1, to: dayStart) ?? dayStart.addingTimeInterval(86400)
            
            let snapshot = try await db.collection("trainers")
                .document(trainerId)
                .collection("schedules")
                .whereField("startTime", isGreaterThanOrEqualTo: Timestamp(date: dayStart))
                .whereField("startTime", isLessThan: Timestamp(date: dayEnd))
                .getDocuments()
            
            // Check if any existing slot overlaps with the new slot
            for doc in snapshot.documents {
                let data = doc.data()
                guard let existingStart = (data["startTime"] as? Timestamp)?.dateValue(),
                      let existingEnd = (data["endTime"] as? Timestamp)?.dateValue() else {
                    continue
                }
                
                // Check for overlap: new slot overlaps if it starts before existing ends AND ends after existing starts
                if start < existingEnd && end > existingStart {
                    return true // Overlap detected
                }
            }
            
            return false // No overlap
        } catch {
            print("Error checking for overlap: \(error)")
            return false // On error, allow creation (fail open)
        }
    }

    private func applyRecurring() {
        // Validate times before saving
        let startTotalMinutes = recurringStartHour * 60 + recurringStartMinute
        let endTotalMinutes = recurringEndHour * 60 + recurringEndMinute
        
        // Ensure end time is after start time (at least the slot duration)
        guard endTotalMinutes > startTotalMinutes else {
            print("⚠️ End time must be after start time")
            return
        }
        
        // Send to Cloud Function with selected duration and weekdays
        let startDateToUse = bulkStartDate ?? Calendar.current.startOfDay(for: defaultDay)
        
        // Use default end date if not explicitly set (matching validation logic)
        let endDateToUse = bulkEndDate ?? Calendar.current.date(byAdding: .month, value: 1, to: startDateToUse) ?? startDateToUse
        
        let daysArray = selectedWeekdays.isEmpty ? nil : Array(selectedWeekdays).sorted()
        
        // Note: We collect minute fields in UI, but onSaveOngoing currently only accepts hour-level
        // values. When the callback is updated to include minutes, pass recurringStartMinute and
        // recurringEndMinute accordingly.
        onSaveOngoing(startDateToUse, endDateToUse, recurringStartHour, recurringEndHour, recurringSlotDuration, daysArray, singleStatus, applyToAllTrainers, recurringLocation?.name)
        
        dismiss()
    }

    // MARK: - Helpers

    private func scheduleDocId(for start: Date) -> String {
        let calendar = Calendar(identifier: .gregorian)
        let utcTimezone = TimeZone(secondsFromGMT: 0)!
        var utcCalendar = calendar
        utcCalendar.timeZone = utcTimezone

        let comps = utcCalendar.dateComponents([.year, .month, .day, .hour], from: start)
        let y = comps.year ?? 1970
        let m = comps.month ?? 1
        let d = comps.day ?? 1
        let h = comps.hour ?? 0
        return String(format: "%04d-%02d-%02dT%02d", y, m, d, h)
    }

    private func snapAndSyncTimes(anchorToDay: Bool = false) {
        let cal = Calendar.current

        // Optionally re-anchor both to the selected day
        if anchorToDay {
            singleStart = anchor(time: singleStart, toDay: singleDay, calendar: cal)
            singleEnd = anchor(time: singleEnd, toDay: singleDay, calendar: cal)
        }

        // Snap both to the hour
        singleStart = roundDownToHour(singleStart, calendar: cal)
        singleEnd = roundDownToHour(singleEnd, calendar: cal)

        // Ensure end >= start + 1 hour
        let minEnd = cal.date(byAdding: .hour, value: 1, to: singleStart) ?? singleStart.addingTimeInterval(3600)
        if singleEnd < minEnd {
            singleEnd = minEnd
        }
    }

    private func anchor(time: Date, toDay day: Date, calendar cal: Calendar) -> Date {
        let t = cal.dateComponents([.hour, .minute, .second], from: time)
        var d = cal.dateComponents([.year, .month, .day], from: day)
        d.hour = t.hour
        d.minute = t.minute
        d.second = t.second
        return cal.date(from: d) ?? day
    }

    private func roundDownToHour(_ date: Date, calendar cal: Calendar) -> Date {
        let comps = cal.dateComponents([.year, .month, .day, .hour], from: date)
        return cal.date(from: comps) ?? date
    }
}

// A single-line, centered row of weekday chips (abbreviated) supporting multi-select.
// Uses Calendar.shortWeekdaySymbols (Sunday-first).
private struct FlexibleWeekdayChips: View {
    @Binding var selected: Set<Int> // 0...6 => Sunday...Saturday
    let weekdaySymbols: [String]

    var body: some View {
        HStack(spacing: 6) {
            ForEach(0..<7, id: \.self) { index in
                let isOn = selected.contains(index)
                Button {
                    if isOn {
                        selected.remove(index)
                    } else {
                        selected.insert(index)
                    }
                } label: {
                    Text(shortSymbol(index))
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(isOn ? .white : .primary)
                        .frame(height: 32)
                        .frame(maxWidth: .infinity)
                        .background(
                            Capsule().fill(isOn ? Color.accentColor : Color.secondary.opacity(0.15))
                        )
                }
                .buttonStyle(.plain)
                .accessibilityLabel(weekdaySymbols[index])
                .accessibilityAddTraits(isOn ? .isSelected : [])
            }
        }
        .frame(maxWidth: .infinity, alignment: .center)
    }

    private func shortSymbol(_ index: Int) -> String {
        let i = max(0, min(6, index))
        return String(weekdaySymbols[i].prefix(3))
    }
}

private struct HourPickerRow: View {
    let title: String
    @Binding var hour: Int
    var range: ClosedRange<Int> = 0...23 // Default range, can be customized

    var body: some View {
        HStack {
            Text(title)
            Spacer()
            Picker("", selection: $hour) {
                ForEach(Array(range), id: \.self) { h in
                    Text(hourLabel(h)).tag(h)
                }
            }
            .pickerStyle(.menu)
        }
    }

    private func hourLabel(_ hour: Int) -> String {
        // Handle hour 24 as "12:00 AM (midnight)"
        if hour == 24 {
            return "12:00 AM"
        }
        let comps = DateComponents(calendar: Calendar.current, hour: hour)
        let date = comps.date ?? Date()
        return date.formatted(.dateTime.hour(.defaultDigits(amPM: .abbreviated)))
    }
}

private struct OptionalDatePickerRow: View {
    let title: String
    @Binding var date: Date?

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Toggle(isOn: Binding(
                get: { date != nil },
                set: { newValue in
                    if newValue {
                        if date == nil {
                            date = Calendar.current.startOfDay(for: Date())
                        }
                    } else {
                        date = nil
                    }
                }
            )) {
                Text(title)
            }

            if let current = date {
                DatePicker(
                    "",
                    selection: Binding<Date>(
                        get: { current },
                        set: { newValue in date = newValue }
                    ),
                    displayedComponents: .date
                )
                .datePickerStyle(.compact)
                .labelsHidden()
                .padding(.leading, 32)
            }
        }
    }
}
