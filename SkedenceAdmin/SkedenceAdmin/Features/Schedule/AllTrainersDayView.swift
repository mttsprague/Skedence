//
//  AllTrainersDayView.swift
//  SkedenceAdmin
//
//  Created by Assistant on 10/14/25.
//

import SwiftUI
import Combine
import FirebaseFirestore

// MARK: - ViewModel for AllTrainersDay
@MainActor
final class AllTrainersDayViewModel: ObservableObject {
    @Published var trainers: [Trainer] = []
    @Published var slotsByTrainer: [String: [TrainerScheduleSlot]] = [:]
    @Published var currentDay: Date = Date()

    private let scheduleRepo = ScheduleRepository()

    func loadInitial(selectedDate: Date, orgId: String) async {
        do {
            let list = try await FirestoreService.shared.fetchAllTrainers(orgId: orgId)
            // Keep only active trainers
            let active = list.filter { $0.active }
            self.trainers = active
            await reload(for: selectedDate, orgId: orgId)
        } catch {
            self.trainers = []
            self.slotsByTrainer = [:]
        }
    }

    func reload(for day: Date, orgId: String) async {
        currentDay = day

        let cal = Calendar.current
        let startOfDay = cal.startOfDay(for: day)
        let endOfDay = cal.date(byAdding: .day, value: 1, to: startOfDay) ?? startOfDay.addingTimeInterval(86400)

        var newMap: [String: [TrainerScheduleSlot]] = [:]

        for trainer in trainers {
            guard let trainerId = trainer.id else { continue }
            do {
                let slots = try await scheduleRepo.fetchScheduleSlots(trainerId: trainerId, from: startOfDay, to: endOfDay, orgId: orgId)
                newMap[trainerId] = slots.sorted { $0.startTime < $1.startTime }
            } catch {
                newMap[trainerId] = []
            }
        }

        self.slotsByTrainer = newMap
    }

    func slotFor(trainerId: String, atHour hour: Int) -> TrainerScheduleSlot? {
        guard let slots = slotsByTrainer[trainerId] else { return nil }
        let cal = Calendar.current
        guard
            let cellStart = cal.date(bySettingHour: hour, minute: 0, second: 0, of: currentDay),
            let cellEnd = cal.date(byAdding: .hour, value: 1, to: cellStart)
        else { return nil }

        // Return any slot that overlaps the hour cell (on-the-hour bookings will match exactly)
        return slots.first(where: { slot in
            slot.startTime < cellEnd && slot.endTime > cellStart
        })
    }
    
    // MARK: - Slot Positioning Helpers
    
    /// Calculate Y offset for a slot based on its actual start time
    func slotYOffset(for slot: TrainerScheduleSlot, firstHour: Int, rowHeight: CGFloat, rowVerticalPadding: CGFloat) -> CGFloat? {
        let cal = Calendar.current
        let components = cal.dateComponents([.hour, .minute], from: slot.startTime)
        guard let hour = components.hour, let minute = components.minute else { return nil }
        
        // Calculate offset from first visible hour
        let hourOffset = hour - firstHour
        let minuteFraction = CGFloat(minute) / 60.0
        
        // Each hour has: rowHeight + (2 * rowVerticalPadding)
        let perHourHeight = rowHeight + (rowVerticalPadding * 2)
        
        // Include the initial top padding
        let offset = CGFloat(hourOffset) * perHourHeight + minuteFraction * rowHeight + rowVerticalPadding
        
        return offset
    }
    
    /// Calculate height for a slot based on its actual duration
    func slotHeight(for slot: TrainerScheduleSlot, rowHeight: CGFloat) -> CGFloat? {
        let duration = slot.endTime.timeIntervalSince(slot.startTime)
        let durationInMinutes = duration / 60.0
        
        // Height proportional to duration (56px per hour)
        let height = (CGFloat(durationInMinutes) / 60.0) * rowHeight
        
        return max(height, 20) // Minimum height for visibility
    }
}

struct AllTrainersDayView: View {
    @EnvironmentObject private var dependencies: AdminAppDependencies
    private var auth: AuthManager { dependencies.auth }
    @ObservedObject var scheduleViewModel: ScheduleViewModel
    @StateObject private var viewModel = AllTrainersDayViewModel()
    
    // Sheet presentation contexts
    @State private var sessionDetailContext: SessionDetailContext?
    @State private var selectedClassId: String?
    @State private var selectedClassName: String?
    @State private var preloadedParticipants: [ClassParticipant]?
    @State private var classParticipantsShown: Bool = false
    @State private var editorContext: ScheduleEditorContext?

    // Layout constants (matching ScheduleView)
    private let rowHeight: CGFloat = 56
    private let rowVerticalPadding: CGFloat = 1
    private let timeColWidth: CGFloat = 44
    private let columnSpacing: CGFloat = 0
    private let gridHeaderVPad: CGFloat = 2
    private let horizontalPaddingPerCell: CGFloat = 2
    
    // Track if we've done initial scroll to current time
    @State private var hasScrolledToCurrentTime = false

    var body: some View {
        VStack(spacing: 0) {
            // Day navigation controls - DEBUG: Add red background
            HStack {
                Button {
                    shiftDay(by: -1)
                } label: {
                    Image(systemName: "chevron.left.circle.fill")
                        .font(.title3)
                        .foregroundStyle(.primary)
                }
                .buttonStyle(.plain)
                
                Spacer()
                
                Text(scheduleViewModel.selectedDate.formatted(.dateTime.weekday(.wide).month(.abbreviated).day().year()))
                    .font(.subheadline)
                
                Spacer()
                
                Button {
                    shiftDay(by: 1)
                } label: {
                    Image(systemName: "chevron.right.circle.fill")
                        .font(.title3)
                        .foregroundStyle(.primary)
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)

            let headerRowHeight: CGFloat = 44.0 // trainer avatar+name header height
            
            AllTrainersDayGrid(
                trainers: viewModel.trainers,
                visibleHours: scheduleViewModel.visibleHours,
                selectedDate: scheduleViewModel.selectedDate,
                isAdmin: auth.isAdmin,
                rowHeight: rowHeight,
                rowVerticalPadding: rowVerticalPadding,
                timeColWidth: timeColWidth,
                columnSpacing: columnSpacing,
                gridHeaderVPad: gridHeaderVPad,
                horizontalPaddingPerCell: horizontalPaddingPerCell,
                headerRowHeight: headerRowHeight,
                hasScrolledToCurrentTime: $hasScrolledToCurrentTime,
                slotFor: { trainerId, hour in
                    viewModel.slotFor(trainerId: trainerId, atHour: hour)
                },
                onSlotTap: { slot in
                    handleSlotTap(slot)
                },
                onEmptyCellTap: { trainerId, hour in
                    if auth.isAdmin {
                        editorContext = ScheduleEditorContext(day: viewModel.currentDay, hour: hour, trainerId: trainerId)
                    }
                }
            )
            .simultaneousGesture(
                DragGesture(minimumDistance: 50)
                    .onEnded { value in
                        let horizontalMovement = value.translation.width
                        if horizontalMovement < -50 {
                            // Swipe left - next day
                            shiftDay(by: 1)
                        } else if horizontalMovement > 50 {
                            // Swipe right - previous day
                            shiftDay(by: -1)
                        }
                    }
            )
        }
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarHidden(true)
        .task {
            if let orgId = auth.currentOrgId {
                await viewModel.loadInitial(
                    selectedDate: scheduleViewModel.selectedDate,
                    orgId: orgId
                )
            }
        }
        .onAppear {
            // Reload schedule data whenever view appears (e.g., after switching tabs)
            Task {
                if let orgId = auth.currentOrgId {
                    await viewModel.reload(for: scheduleViewModel.selectedDate, orgId: orgId)
                }
            }
        }
        .refreshable {
            // Pull to refresh
            if let orgId = auth.currentOrgId {
                await viewModel.reload(for: scheduleViewModel.selectedDate, orgId: orgId)
            }
        }
        .onChange(of: scheduleViewModel.selectedDate) { _, newValue in
            Task {
                if let orgId = auth.currentOrgId {
                    await viewModel.reload(for: newValue, orgId: orgId)
                }
            }
        }
        .sheet(item: $sessionDetailContext) { context in
            SessionDetailView(client: context.client, booking: context.booking)
                .environmentObject(dependencies)
        }
        .sheet(item: $editorContext) { context in
            if let orgId = auth.currentOrgId {
                // Configure AvailabilityEditorSheet for admin editing a specific trainer
                AvailabilityEditorSheet(
                    defaultDay: scheduleViewModel.selectedDate,
                    defaultHour: context.hour,
                    isAdmin: auth.isAdmin,
                    editingTrainerId: context.trainerId,
                    orgId: orgId,
                    onSaveSingle: { day, start, end, status, applyToAll, location in
                        Task {
                            // If applying to all trainers (only valid for unavailability)
                            if applyToAll && status == .unavailable {
                                await scheduleViewModel.setCustomSlotForAllTrainers(
                                    on: day,
                                    startTime: start,
                                    endTime: end,
                                    status: status,
                                    location: location
                                )
                            } else {
                                // Set which trainer we're editing, then save single/multi-hour slots
                                scheduleViewModel.editingTrainerId = context.trainerId
                                await scheduleViewModel.setCustomSlot(
                                    on: day,
                                    startTime: start,
                                    endTime: end,
                                    status: status,
                                    location: location
                                )
                            }
                            // Reload day view after saving
                            await viewModel.reload(for: scheduleViewModel.selectedDate, orgId: orgId)
                        }
                    },
                    onSaveOngoing: { startDate, endDate, dailyStartHour, dailyEndHour, slotDuration, daysOfWeek, status, applyToAll, location in
                        Task {
                            if applyToAll && status == .unavailable {
                                await scheduleViewModel.openAvailabilityForAllTrainers(
                                    start: startDate,
                                    end: endDate,
                                    dailyStartHour: dailyStartHour,
                                    dailyEndHour: dailyEndHour,
                                    slotDurationMinutes: slotDuration,
                                    selectedDaysOfWeek: daysOfWeek,
                                    status: status,
                                    location: location
                                )
                            } else {
                                scheduleViewModel.editingTrainerId = context.trainerId
                                await scheduleViewModel.openAvailability(
                                    start: startDate,
                                    end: endDate,
                                    dailyStartHour: dailyStartHour,
                                    dailyEndHour: dailyEndHour,
                                    slotDurationMinutes: slotDuration,
                                    selectedDaysOfWeek: daysOfWeek,
                                    status: status,
                                    location: location
                                )
                            }
                            await viewModel.reload(for: scheduleViewModel.selectedDate, orgId: orgId)
                        }
                    },
                    onBookingCompleted: {
                        await viewModel.reload(for: scheduleViewModel.selectedDate, orgId: orgId)
                    }
                )
            }
        }
        .sheet(isPresented: $classParticipantsShown) {
            if let classId = selectedClassId, let className = selectedClassName {
                ClassParticipantsView(
                    classId: classId,
                    classTitle: className,
                    preloadedParticipants: preloadedParticipants
                )
                .environmentObject(dependencies)
            } else {
                // Always return a view to satisfy the ViewBuilder's opaque return type
                EmptyView()
            }
        }
    }
    
    func handleSlotTap(_ slot: TrainerScheduleSlot) {
        // Check if this is a class booking
        if slot.isClass, let classId = slot.classId {
            // Use cached participants if available
            if let cached = scheduleViewModel.participantsByClassId[classId] {
                selectedClassId = classId
                selectedClassName = slot.clientName ?? "Group Class"
                self.preloadedParticipants = cached
                self.classParticipantsShown = true
                return
            }
            
            // Fetch participants BEFORE showing sheet
            Task {
                do {
                    let participants = try await fetchParticipants(classId: classId)
                    await MainActor.run {
                        scheduleViewModel.participantsByClassId[classId] = participants
                        selectedClassId = classId
                        selectedClassName = slot.clientName ?? "Group Class"
                        self.preloadedParticipants = participants
                        self.classParticipantsShown = true
                    }
                } catch {
                    await MainActor.run {
                        selectedClassId = classId
                        selectedClassName = slot.clientName ?? "Group Class"
                        self.preloadedParticipants = []
                        self.classParticipantsShown = true
                    }
                }
            }
            return
        }
        
        // Handle regular client booking - show SessionDetailView
        if slot.isBooked, let clientId = slot.clientId {
            // Fetch data BEFORE showing sheet
            Task {
                // Try to fetch full booking details
                var booking: ClientBooking?
                
                do {
                    let db = Firestore.firestore()
                    // First try with clientId (new bookings)
                    var bookingsSnapshot = try await db.collection("bookings")
                        .whereField("clientId", isEqualTo: clientId)
                        .whereField("trainerId", isEqualTo: slot.trainerId)
                        .whereField("startTime", isEqualTo: Timestamp(date: slot.startTime))
                        .limit(to: 1)
                        .getDocuments()
                    
                    // If not found, try with clientUID (old bookings)
                    if bookingsSnapshot.documents.isEmpty {
                        bookingsSnapshot = try await db.collection("bookings")
                            .whereField("clientUID", isEqualTo: clientId)
                            .whereField("trainerId", isEqualTo: slot.trainerId)
                            .whereField("startTime", isEqualTo: Timestamp(date: slot.startTime))
                            .limit(to: 1)
                            .getDocuments()
                    }
                    
                    if let bookingDoc = bookingsSnapshot.documents.first {
                        let data = bookingDoc.data()
                        // Try to get trainer name from booking document first
                        let trainerName = data["trainerName"] as? String ?? viewModel.trainers
                            .first(where: { $0.id == slot.trainerId })?
                            .displayName ?? "Trainer"
                        
                        booking = ClientBooking(
                            id: bookingDoc.documentID,
                            trainerId: slot.trainerId,
                            trainerName: trainerName,
                            startTime: slot.startTime,
                            endTime: slot.endTime,
                            status: data["status"] as? String ?? "confirmed",
                            location: slot.location,
                            bookedAt: (data["bookedAt"] as? Timestamp)?.dateValue() ?? slot.bookedAt,
                            isClassBooking: slot.isClassBooking,
                            classId: slot.classId,
                            athleteName: data["athleteName"] as? String,
                            secondAthleteName: data["secondAthleteName"] as? String,
                            lessonNotes: data["lessonNotes"] as? String
                        )
                    }
                } catch {
                }
                
                // Fallback to basic booking info if not found
                if booking == nil {
                    let trainerName = viewModel.trainers
                        .first(where: { $0.id == slot.trainerId })?
                        .displayName ?? "Trainer"
                    
                    booking = ClientBooking(
                        id: slot.id,
                        trainerId: slot.trainerId,
                        trainerName: trainerName,
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                        status: "confirmed",
                        location: slot.location,
                        bookedAt: slot.bookedAt,
                        isClassBooking: slot.isClassBooking,
                        classId: slot.classId
                    )
                }
                
                let fetched = try? await FirestoreService.shared.fetchClient(by: clientId)
                await MainActor.run {
                    let client = fetched ?? Client(
                        id: clientId,
                        firstName: slot.clientName ?? "Booked",
                        lastName: "",
                        emailAddress: "",
                        phoneNumber: "",
                        photoURL: nil
                    )
                    
                    if let fetched = fetched {
                        scheduleViewModel.clientsById[clientId] = fetched
                    }
                    
                    self.sessionDetailContext = SessionDetailContext(client: client, booking: booking!)
                }
            }
        }
    }
    
    private func fetchParticipants(classId: String) async throws -> [ClassParticipant] {
        guard !classId.isEmpty else {
            return []
        }
        
        let db = Firestore.firestore()
        let snapshot = try await db.collection("classes")
            .document(classId)
            .collection("participants")
            .order(by: "registeredAt", descending: false)
            .getDocuments()
        
        var results: [ClassParticipant] = []
        for doc in snapshot.documents {
            let data = doc.data()
            guard let userId = data["userId"] as? String,
                  let firstName = data["firstName"] as? String,
                  let lastName = data["lastName"] as? String,
                  let timestamp = data["registeredAt"] as? Timestamp else {
                continue
            }
            let participant = ClassParticipant(
                id: doc.documentID,
                userId: userId,
                firstName: firstName,
                lastName: lastName,
                athleteName: data["athleteName"] as? String,
                registeredAt: timestamp.dateValue()
            )
            results.append(participant)
        }
        return results
    }

    private func shiftWeek(by delta: Int) {
        let cal = Calendar.current
        if let newDate = cal.date(byAdding: .day, value: 7 * delta, to: scheduleViewModel.selectedDate) {
            withAnimation(.easeInOut) {
                scheduleViewModel.selectedDate = newDate
            }
        }
    }
    
    private func shiftDay(by delta: Int) {
        let cal = Calendar.current
        if let newDate = cal.date(byAdding: .day, value: delta, to: scheduleViewModel.selectedDate) {
            withAnimation(.easeInOut) {
                scheduleViewModel.selectedDate = newDate
            }
        }
    }
    
    private func jumpToCurrentWeek() {
        withAnimation(.easeInOut) {
            scheduleViewModel.selectedDate = Date()
            hasScrolledToCurrentTime = false
        }
    }
    
    private func refreshSchedule() async {
        if let orgId = auth.currentOrgId {
            await viewModel.reload(for: scheduleViewModel.selectedDate, orgId: orgId)
        }
    }

    private var header: some View {
        HStack(spacing: 12) {
            avatarView
                .frame(width: 36, height: 36)

            VStack(alignment: .leading, spacing: 2) {
                Text(auth.trainerDisplayName ?? "Schedule")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.primary)
                    .lineLimit(1)

                if auth.isAuthenticated {
                    Text("You")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()
            
            // Jump to current week button
            Button {
                jumpToCurrentWeek()
            } label: {
                Image(systemName: "calendar.circle.fill")
                    .font(.title2)
                    .foregroundStyle(AppTheme.primary)
                    .symbolRenderingMode(.hierarchical)
            }
            .buttonStyle(.plain)
            
            // Refresh button
            Button {
                Task {
                    await refreshSchedule()
                }
            } label: {
                Image(systemName: "arrow.clockwise.circle.fill")
                    .font(.title2)
                    .foregroundStyle(AppTheme.primary)
                    .symbolRenderingMode(.hierarchical)
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
        .padding(.top, 8)
    }

    @ViewBuilder
    private var avatarView: some View {
        if let urlString = auth.trainerPhotoURLString, let url = URL(string: urlString) {
            AsyncImage(url: url) { phase in
                switch phase {
                case .empty:
                    Circle().fill(Color.gray.opacity(0.2))
                        .overlay(ProgressView())
                case .success(let image):
                    image
                        .resizable()
                        .scaledToFill()
                        .clipShape(Circle())
                case .failure:
                    Circle().fill(Color.gray.opacity(0.2))
                        .overlay(Image(systemName: "person.crop.circle.fill").font(.system(size: 20)).foregroundStyle(.secondary))
                @unknown default:
                    Circle().fill(Color.gray.opacity(0.2))
                }
            }
        } else {
            Circle()
                .fill(Color.gray.opacity(0.2))
                .overlay(
                    Image(systemName: "person.crop.circle.fill")
                        .font(.system(size: 20))
                        .foregroundStyle(.secondary)
                )
        }
    }

    // MARK: - Helpers

    fileprivate func hourLabel(_ hour: Int) -> String {
        let comps = DateComponents(calendar: Calendar.current, hour: hour)
        let date = comps.date ?? Date()
        return date.formatted(.dateTime.hour(.defaultDigits(amPM: .abbreviated)))
    }

    fileprivate func currentTimeYOffset(for date: Date, firstHour: Int?, rowHeight: CGFloat, rowVerticalPadding: CGFloat, visibleHours: [Int]) -> CGFloat? {
        guard let firstHour, let lastHour = visibleHours.last else { return nil }
        let comps = Calendar.current.dateComponents([.hour, .minute], from: date)
        guard let hour = comps.hour, let minute = comps.minute else { return nil }
        if hour < firstHour || hour > lastHour + 1 { return nil }

        let perHourHeight = rowHeight + (rowVerticalPadding * 2)
        let initialTopPadding: CGFloat = rowVerticalPadding
        let wholeHours = CGFloat(max(0, hour - firstHour))
        let fraction = CGFloat(min(max(minute, 0), 59)) / 60.0
        return initialTopPadding + (wholeHours + fraction) * perHourHeight
    }
}

// MARK: - Extracted Grid View
private struct AllTrainersDayGrid: View {
    let trainers: [Trainer]
    let visibleHours: [Int]
    let selectedDate: Date
    let isAdmin: Bool

    let rowHeight: CGFloat
    let rowVerticalPadding: CGFloat
    let timeColWidth: CGFloat
    let columnSpacing: CGFloat
    let gridHeaderVPad: CGFloat
    let horizontalPaddingPerCell: CGFloat
    let headerRowHeight: CGFloat

    @Binding var hasScrolledToCurrentTime: Bool

    let slotFor: (_ trainerId: String, _ hour: Int) -> TrainerScheduleSlot?
    let onSlotTap: (_ slot: TrainerScheduleSlot) -> Void
    let onEmptyCellTap: (_ trainerId: String, _ hour: Int) -> Void

    var body: some View {
        let calculatedTrainerWidth: CGFloat = 120
        
        ScrollableGridContent(
            trainers: trainers,
            visibleHours: visibleHours,
            rowHeight: rowHeight,
            rowVerticalPadding: rowVerticalPadding,
            timeColWidth: timeColWidth,
            columnSpacing: columnSpacing,
            gridHeaderVPad: gridHeaderVPad,
            headerRowHeight: headerRowHeight,
            calculatedTrainerWidth: calculatedTrainerWidth,
            horizontalPaddingPerCell: horizontalPaddingPerCell,
            selectedDate: selectedDate,
            hasScrolledToCurrentTime: $hasScrolledToCurrentTime,
            slotFor: slotFor,
            onSlotTap: onSlotTap,
            onEmptyCellTap: onEmptyCellTap
        )
    }

    private func hourLabel(_ hour: Int) -> String {
        let comps = DateComponents(calendar: Calendar.current, hour: hour)
        let date = comps.date ?? Date()
        return date.formatted(.dateTime.hour(.defaultDigits(amPM: .abbreviated)))
    }

    private func currentTimeYOffset(for date: Date, firstHour: Int?, rowHeight: CGFloat, rowVerticalPadding: CGFloat, visibleHours: [Int]) -> CGFloat? {
        guard let firstHour, let lastHour = visibleHours.last else { return nil }
        let comps = Calendar.current.dateComponents([.hour, .minute], from: date)
        guard let hour = comps.hour, let minute = comps.minute else { return nil }
        if hour < firstHour || hour > lastHour + 1 { return nil }

        let perHourHeight = rowHeight + (rowVerticalPadding * 2)
        let initialTopPadding: CGFloat = rowVerticalPadding
        let wholeHours = CGFloat(max(0, hour - firstHour))
        let fraction = CGFloat(min(max(minute, 0), 59)) / 60.0
        return initialTopPadding + (wholeHours + fraction) * perHourHeight
    }
}

private struct ScrollableGridContent: View {
    let trainers: [Trainer]
    let visibleHours: [Int]
    let rowHeight: CGFloat
    let rowVerticalPadding: CGFloat
    let timeColWidth: CGFloat
    let columnSpacing: CGFloat
    let gridHeaderVPad: CGFloat
    let headerRowHeight: CGFloat
    let calculatedTrainerWidth: CGFloat
    let horizontalPaddingPerCell: CGFloat
    let selectedDate: Date

    @Binding var hasScrolledToCurrentTime: Bool

    let slotFor: (_ trainerId: String, _ hour: Int) -> TrainerScheduleSlot?
    let onSlotTap: (_ slot: TrainerScheduleSlot) -> Void
    let onEmptyCellTap: (_ trainerId: String, _ hour: Int) -> Void
    
    // Helper: Get all slots for a trainer across all visible hours
    private func getAllSlots(for trainerId: String) -> [TrainerScheduleSlot] {
        var slots: [TrainerScheduleSlot] = []
        var seenSlotIds = Set<String>()
        
        for hour in visibleHours {
            if let slot = slotFor(trainerId, hour), !seenSlotIds.contains(slot.id) {
                slots.append(slot)
                seenSlotIds.insert(slot.id)
            }
        }
        
        return slots
    }
    
    // Helper: Calculate Y offset for absolute positioning
    private func slotYOffset(for slot: TrainerScheduleSlot) -> CGFloat? {
        guard let firstHour = visibleHours.first else { return nil }
        
        let cal = Calendar.current
        let components = cal.dateComponents([.hour, .minute], from: slot.startTime)
        guard let hour = components.hour, let minute = components.minute else { return nil }
        
        let hourOffset = hour - firstHour
        let minuteFraction = CGFloat(minute) / 60.0
        let perHourHeight = rowHeight + (rowVerticalPadding * 2)
        let offset = CGFloat(hourOffset) * perHourHeight + minuteFraction * rowHeight + rowVerticalPadding
        
        return offset
    }
    
    // Helper: Calculate height based on duration
    private func slotHeight(for slot: TrainerScheduleSlot) -> CGFloat? {
        let duration = slot.endTime.timeIntervalSince(slot.startTime)
        let durationInMinutes = duration / 60.0
        let height = (CGFloat(durationInMinutes) / 60.0) * rowHeight
        return max(height, 20)
    }

    var body: some View {
        ScrollViewReader { verticalScrollProxy in
            ScrollView(.vertical, showsIndicators: true) {
                GeometryReader { geometry in
                    let trainerCount = CGFloat(max(1, trainers.count))
                    let maxTrainersForWidth: CGFloat = 4 // Cap at 4 trainers for width calculation
                    let trainersForWidth = min(trainerCount, maxTrainersForWidth)
                    let totalHorizontalPadding = horizontalPaddingPerCell * 2 * trainersForWidth
                    let availableWidth = geometry.size.width - timeColWidth - totalHorizontalPadding - 20 // Extra padding for scrollbar
                    let dynamicTrainerWidth = max(120, availableWidth / trainersForWidth)
                    
                    VStack(spacing: 0) {
                        // Trainer headers at top - with horizontal scroll
                        HStack(spacing: 0) {
                            // Spacer for time column
                            Color.clear
                                .frame(width: timeColWidth)
                            
                            // Scrollable trainer headers
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: columnSpacing) {
                                    ForEach(trainers) { trainer in
                                        TrainerHeaderCell(trainer: trainer)
                                            .frame(width: dynamicTrainerWidth, height: headerRowHeight)
                                    }
                                }
                                .padding(.vertical, 4)
                                .padding(.leading, 6)
                                .padding(.trailing, 8)
                            }
                        }
                        
                        // Grid content
                        ZStack(alignment: .topLeading) {
                            HStack(spacing: 0) {
                                // Fixed left time column
                                VStack(spacing: 0) {
                                ForEach(visibleHours, id: \.self) { hour in
                                    Text(hourLabel(hour))
                                        .font(.caption2)
                                        .foregroundStyle(.secondary)
                                        .frame(maxWidth: .infinity, alignment: .center)
                                        .frame(height: rowHeight)
                                        .background(Color(UIColor.systemGray6))
                                        .padding(.vertical, rowVerticalPadding)
                                        .id("hour-\(hour)")
                                }
                            }
                            .frame(width: timeColWidth)
                            .background(Color(UIColor.systemGray6))

                            // Right: horizontally scrollable grid cells
                            ScrollView(.horizontal, showsIndicators: true) {
                                HStack(spacing: columnSpacing) {
                                    ForEach(trainers, id: \.id) { trainer in
                                        ZStack(alignment: .topLeading) {
                                            // Background grid cells for visual reference (purely visual - no tap handling)
                                            VStack(spacing: 0) {
                                                ForEach(visibleHours, id: \.self) { hour in
                                                    RoundedRectangle(cornerRadius: 12)
                                                        .fill(Color(UIColor.systemGray5))
                                                        .frame(width: dynamicTrainerWidth, height: rowHeight)
                                                        .padding(.vertical, rowVerticalPadding)
                                                }
                                            }
                                            .padding(.horizontal, horizontalPaddingPerCell)
                                            .allowsHitTesting(false) // Purely visual background
                                            
                                            // Absolutely positioned slots overlay
                                            if let trainerId = trainer.id {
                                                let slots = getAllSlots(for: trainerId)
                                                ForEach(slots) { slot in
                                                    if let yOffset = slotYOffset(for: slot),
                                                       let height = slotHeight(for: slot) {
                                                        Button(action: {
                                                            onSlotTap(slot)
                                                        }) {
                                                            EventCell(slot: slot, viewingTrainerId: trainerId)
                                                                .frame(width: dynamicTrainerWidth, height: height)
                                                                .padding(.horizontal, horizontalPaddingPerCell)
                                                        }
                                                        .buttonStyle(PlainButtonStyle())
                                                        .offset(y: yOffset)
                                                    }
                                                }
                                                
                                                // Empty area tap detection (on top layer)
                                                GeometryReader { geometry in
                                                    Color.clear
                                                        .contentShape(Rectangle())
                                                        .onTapGesture { location in
                                                            // Check if tap hit any slot - if so, handle it
                                                            var hitSlot: TrainerScheduleSlot? = nil
                                                            for slot in slots {
                                                                if let yOffset = slotYOffset(for: slot),
                                                                   let height = slotHeight(for: slot) {
                                                                    let slotFrame = CGRect(x: horizontalPaddingPerCell, y: yOffset,
                                                                                           width: dynamicTrainerWidth - (horizontalPaddingPerCell * 2), height: height)
                                                                    if slotFrame.contains(location) {
                                                                        hitSlot = slot
                                                                        break
                                                                    }
                                                                }
                                                            }
                                                            
                                                            if let slot = hitSlot {
                                                                onSlotTap(slot)
                                                            } else {
                                                                // Calculate which hour was tapped
                                                                let hourHeight = rowHeight + (rowVerticalPadding * 2)
                                                                let hourIndex = Int(location.y / hourHeight)
                                                                if hourIndex >= 0 && hourIndex < visibleHours.count {
                                                                    let hour = visibleHours[hourIndex]
                                                                    onEmptyCellTap(trainerId, hour)
                                                                }
                                                            }
                                                        }
                                                }
                                                .allowsHitTesting(true)
                                            }
                                        }
                                        .frame(width: dynamicTrainerWidth)
                                    }
                                }
                                .padding(.bottom, 8)
                            } // Close ScrollView horizontal
                        } // Close HStack
                    
                        // Timeline scrolls WITH content and stays at the current time position (e.g., 5pm line stays at 5pm)
                        if Calendar.current.isDateInToday(selectedDate) {
                            TimelineView(.everyMinute) { context in
                                if let y = currentTimeYOffset(
                                    for: context.date,
                                    firstHour: visibleHours.first,
                                    rowHeight: rowHeight,
                                    rowVerticalPadding: rowVerticalPadding,
                                    visibleHours: visibleHours
                                ) {
                                    HStack(spacing: 0) {
                                        Circle()
                                            .fill(.red)
                                            .frame(width: 10, height: 10)
                                        Rectangle()
                                            .fill(Color.red)
                                            .frame(height: 2)
                                    }
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .offset(x: 0, y: y)
                                    .allowsHitTesting(false)
                                }
                            }
                        }
                    } // Close ZStack
                    .background(Color(UIColor.systemGray6))
                    } // Close VStack
                    .onAppear {
                        scrollToCurrentTime(verticalScrollProxy: verticalScrollProxy)
                    }
                    .onChange(of: hasScrolledToCurrentTime) { _, newValue in
                        if !newValue {
                            scrollToCurrentTime(verticalScrollProxy: verticalScrollProxy)
                        }
                    }
                } // Close GeometryReader
            } // Close ScrollView
        } // Close ScrollViewReader
    }
    
    private func currentTimeYOffset(for date: Date, firstHour: Int?, rowHeight: CGFloat, rowVerticalPadding: CGFloat, visibleHours: [Int]) -> CGFloat? {
        guard let firstHour, let lastHour = visibleHours.last else { return nil }
        let comps = Calendar.current.dateComponents([.hour, .minute], from: date)
        guard let hour = comps.hour, let minute = comps.minute else { return nil }
        if hour < firstHour || hour > lastHour + 1 { return nil }

        let perHourHeight = rowHeight + (rowVerticalPadding * 2)
        let initialTopPadding: CGFloat = rowVerticalPadding
        let wholeHours = CGFloat(max(0, hour - firstHour))
        let fraction = CGFloat(min(max(minute, 0), 59)) / 60.0
        return initialTopPadding + (wholeHours + fraction) * perHourHeight
    }

    private func hourLabel(_ hour: Int) -> String {
        let comps = DateComponents(calendar: Calendar.current, hour: hour)
        let date = comps.date ?? Date()
        return date.formatted(.dateTime.hour(.defaultDigits(amPM: .abbreviated)))
    }

    private func scrollToCurrentTime(verticalScrollProxy: ScrollViewProxy) {
        guard !hasScrolledToCurrentTime else { return }
        
        let now = Date()
        let comps = Calendar.current.dateComponents([.hour], from: now)
        guard let currentHour = comps.hour else { return }
        
        // Scroll to the current hour, centered
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            withAnimation(.easeInOut(duration: 0.5)) {
                verticalScrollProxy.scrollTo("hour-\(currentHour)", anchor: .center)
            }
            hasScrolledToCurrentTime = true
        }
    }
}

// MARK: - Trainer header cell
private struct TrainerHeaderCell: View {
    let trainer: Trainer

    var body: some View {
        HStack(spacing: 8) {
            TrainerAvatar(urlString: trainer.photoURL ?? trainer.avatarUrl ?? trainer.imageUrl)
                .frame(width: 28, height: 28)
            Text(trainer.displayName)
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
                .lineLimit(1)
            Spacer()
        }
        .padding(.horizontal, 8)
    }
}

private struct TrainerAvatar: View {
    let urlString: String?

    var body: some View {
        Group {
            if let urlString, let url = URL(string: urlString), !urlString.isEmpty {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .empty:
                        Circle().fill(Color.gray.opacity(0.2)).overlay(ProgressView())
                    case .success(let image):
                        image.resizable().scaledToFill().clipShape(Circle())
                    case .failure:
                        Circle().fill(Color.gray.opacity(0.2))
                            .overlay(Image(systemName: "person.crop.circle.fill").font(.system(size: 16)).foregroundStyle(.secondary))
                    @unknown default:
                        Circle().fill(Color.gray.opacity(0.2))
                    }
                }
            } else {
                Circle()
                    .fill(Color.gray.opacity(0.2))
                    .overlay(Image(systemName: "person.crop.circle.fill").font(.system(size: 16)).foregroundStyle(.secondary))
            }
        }
    }
}

#Preview {
    AllTrainersDayView(scheduleViewModel: ScheduleViewModel())
        .environmentObject(AuthManager())
}
