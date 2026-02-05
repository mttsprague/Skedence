//
//  TrainerWeekView.swift
//  SkedenceAdmin
//
//  Created by Assistant
//

import SwiftUI
import FirebaseFirestore
import Combine

struct TrainerWeekView: View {
    @EnvironmentObject private var dependencies: AdminAppDependencies
    private var auth: AuthManager { dependencies.auth }
    let trainerId: String
    @ObservedObject var viewModel: ScheduleViewModel
    
    @StateObject private var trainerViewModel = TrainerWeekViewModel()
    
    // Sheet presentation contexts
    @State private var sessionDetailContext: SessionDetailContext?
    @State private var selectedClassId: String?
    @State private var selectedClassName: String?
    @State private var preloadedParticipants: [ClassParticipant]?
    @State private var classParticipantsShown: Bool = false
    @State private var editorContext: ScheduleEditorContext?
    
    // Track if we've done initial scroll to current time
    @State private var hasScrolledToCurrentTime = false
    
    var body: some View {
        VStack(spacing: 0) {
            // Header with trainer info
            header
            
            // Week strip
            WeekStrip(
                title: viewModel.weekTitle,
                weekDays: viewModel.weekDays,
                selectedDate: $viewModel.selectedDate,
                onPrevWeek: { shiftWeek(by: -1) },
                onNextWeek: { shiftWeek(by: 1) }
            )
            .padding(.top, 2)
            .padding(.bottom, 4)
            
            GeometryReader { geometry in
                let horizontalPaddingPerCell = ScheduleConstants.horizontalPaddingPerCell
                let totalHorizontalPadding = horizontalPaddingPerCell * 2 * 7
                let availableWidth = geometry.size.width - ScheduleConstants.timeColWidthWide - totalHorizontalPadding
                let calculatedDayWidth = max(10, availableWidth / 7)
                
                ScheduleGridView(
                    weekDays: viewModel.weekDays,
                    visibleHours: viewModel.visibleHours,
                    slotsByDay: trainerViewModel.slotsByDay,
                    isAdmin: auth.isAdmin,
                    timeColWidth: ScheduleConstants.timeColWidthWide,
                    rowHeight: ScheduleConstants.rowHeight,
                    rowVerticalPadding: ScheduleConstants.rowVerticalPadding,
                    columnSpacing: ScheduleConstants.columnSpacing,
                    dayColumnWidth: calculatedDayWidth,
                    viewingTrainerId: trainerId,
                    hasScrolledToCurrentTime: $hasScrolledToCurrentTime,
                    onEmptyTap: { day, hour in
                        if auth.isAdmin {
                            editorContext = ScheduleEditorContext(day: day, hour: hour)
                        }
                    },
                    onSlotTap: { slot, day, hour in
                        handleSlotTap(slot, defaultDay: day, defaultHour: hour)
                    },
                    onSetStatus: { day, hour, status in
                        if auth.isAdmin {
                            Task {
                                await setSlotStatus(on: day, hour: hour, status: status)
                            }
                        }
                    },
                    onClear: { day, hour in
                        if auth.isAdmin {
                            Task {
                                await clearSlot(on: day, hour: hour)
                            }
                        }
                    }
                )
                .simultaneousGesture(
                    DragGesture(minimumDistance: 50)
                        .onEnded { value in
                            let horizontalMovement = value.translation.width
                            if horizontalMovement < -50 {
                                // Swipe left - next week
                                shiftWeek(by: 1)
                            } else if horizontalMovement > 50 {
                                // Swipe right - previous week
                                shiftWeek(by: -1)
                            }
                        }
                )
            }
        }
        .gesture(
            DragGesture(minimumDistance: 50)
                .onEnded { value in
                    let horizontalMovement = value.translation.width
                    if horizontalMovement < -50 {
                        // Swipe left - next week
                        shiftWeek(by: 1)
                    } else if horizontalMovement > 50 {
                        // Swipe right - previous week
                        shiftWeek(by: -1)
                    }
                }
        )
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text(trainerViewModel.trainer?.displayName ?? "Trainer Schedule")
                    .font(.headline)
            }
        }
        .sheet(item: $sessionDetailContext) { context in
            SessionDetailView(client: context.client, booking: context.booking)
                .environmentObject(dependencies)
        }
        .sheet(item: $editorContext) { context in
            // Admin can create availability for this trainer
            AvailabilityEditorSheet(
                defaultDay: context.day,
                defaultHour: context.hour,
                isAdmin: auth.isAdmin,
                editingTrainerId: trainerId,
                orgId: auth.currentOrgId,
                onSaveSingle: { day, start, end, status, applyToAll, location in
                    Task {
                        if applyToAll && status == .unavailable {
                            await viewModel.setCustomSlotForAllTrainers(on: day, startTime: start, endTime: end, status: status, location: location)
                        } else {
                            guard let orgId = auth.currentOrgId else { return }
                            do {
                                try await ScheduleRepository().upsertSlot(
                                    trainerId: trainerId,
                                    orgId: orgId,
                                    startTime: start,
                                    endTime: end,
                                    status: status,
                                    location: location
                                )
                            } catch {
                            }
                        }
                        await refreshSchedule()
                    }
                },
                onSaveOngoing: { startDate, endDate, dailyStartHour, dailyEndHour, slotDurationMinutes, daysOfWeek, status, applyToAll, location in
                    Task {
                        if applyToAll && status == .unavailable {
                            await viewModel.openAvailabilityForAllTrainers(
                                start: startDate,
                                end: endDate,
                                dailyStartHour: dailyStartHour,
                                dailyEndHour: dailyEndHour,
                                slotDurationMinutes: slotDurationMinutes,
                                selectedDaysOfWeek: daysOfWeek,
                                status: status,
                                location: location
                            )
                        } else {
                            // IMPORTANT: Temporarily set editingTrainerId to ensure recurring schedule
                            // is created for this trainer, not the admin
                            let originalEditingTrainerId = viewModel.editingTrainerId
                            viewModel.editingTrainerId = trainerId
                            
                            await viewModel.openAvailability(
                                start: startDate,
                                end: endDate,
                                dailyStartHour: dailyStartHour,
                                dailyEndHour: dailyEndHour,
                                slotDurationMinutes: slotDurationMinutes,
                                selectedDaysOfWeek: daysOfWeek,
                                status: status,
                                location: location
                            )
                            
                            // Restore original editingTrainerId
                            viewModel.editingTrainerId = originalEditingTrainerId
                        }
                        await refreshSchedule()
                    }
                },
                onBookingCompleted: {
                    await refreshSchedule()
                }
            )
        }
        .sheet(isPresented: $classParticipantsShown) {
            if let classId = selectedClassId, let className = selectedClassName {
                ClassParticipantsView(
                    classId: classId,
                    classTitle: className,
                    preloadedParticipants: preloadedParticipants
                )
                .environmentObject(dependencies)
            }
        }
        .task {
            await trainerViewModel.loadTrainer(trainerId: trainerId)
            if let orgId = auth.currentOrgId {
                await trainerViewModel.loadWeek(weekDays: viewModel.weekDays, trainerId: trainerId, orgId: orgId)
            }
        }
        .onChange(of: viewModel.selectedDate) { oldValue, newValue in
            Task {
                if let orgId = auth.currentOrgId {
                    await trainerViewModel.loadWeek(weekDays: viewModel.weekDays, trainerId: trainerId, orgId: orgId)
                }
            }
            // Reset scroll flag when week changes
            if !Calendar.current.isDate(oldValue, equalTo: newValue, toGranularity: .weekOfYear) {
                hasScrolledToCurrentTime = false
            }
        }
    }
    
    private var header: some View {
        HStack(spacing: 12) {
            avatarView
                .frame(width: 36, height: 36)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(trainerViewModel.trainer?.displayName ?? "Trainer")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.primary)
                    .lineLimit(1)
                
                if let email = trainerViewModel.trainer?.email {
                    Text(email)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
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
    
    private var avatarView: some View {
        Group {
            if let urlString = trainerViewModel.trainer?.photoURL,
               let url = URL(string: urlString), !urlString.isEmpty {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .empty:
                        Circle().fill(Color.gray.opacity(0.2)).overlay(ProgressView())
                    case .success(let image):
                        image.resizable().scaledToFill().clipShape(Circle())
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
                    .overlay(Image(systemName: "person.crop.circle.fill").font(.system(size: 20)).foregroundStyle(.secondary))
            }
        }
    }
    
    private func shiftWeek(by weeks: Int) {
        guard let newDate = Calendar.current.date(byAdding: .day, value: weeks * 7, to: viewModel.selectedDate) else { return }
        viewModel.selectedDate = newDate
    }
    
    private func jumpToCurrentWeek() {
        withAnimation(.easeInOut) {
            viewModel.selectedDate = Date()
            hasScrolledToCurrentTime = false
        }
    }
    
    private func refreshSchedule() async {
        if let orgId = auth.currentOrgId {
            await trainerViewModel.loadWeek(weekDays: viewModel.weekDays, trainerId: trainerId, orgId: orgId)
        }
    }
    
    // Admin methods for managing other trainer's schedule
    private func setSlotStatus(on day: Date, hour: Int, status: TrainerScheduleSlot.Status) async {
        guard auth.isAdmin, let orgId = auth.currentOrgId else { return }
        
        let scheduleRepo = ScheduleRepository()
        let cal = Calendar.current
        guard let start = cal.date(bySettingHour: hour, minute: 0, second: 0, of: day),
              let end = cal.date(byAdding: .hour, value: 1, to: start) else { return }
        
        do {
            try await scheduleRepo.upsertSlot(
                trainerId: trainerId,
                orgId: orgId,
                startTime: start,
                endTime: end,
                status: status,
                location: nil
            )
            await refreshSchedule()
        } catch {
        }
    }
    
    private func clearSlot(on day: Date, hour: Int) async {
        guard auth.isAdmin, auth.currentOrgId != nil else { return }
        
        let scheduleRepo = ScheduleRepository()
        let cal = Calendar.current
        guard let cellStart = cal.date(bySettingHour: hour, minute: 0, second: 0, of: day),
              let cellEnd = cal.date(byAdding: .hour, value: 1, to: cellStart) else { return }
        
        let slots = trainerViewModel.slotsByDay[DateOnly(day)] ?? []
        let matching = slots.filter { $0.startTime < cellEnd && $0.endTime > cellStart }
        
        for slot in matching {
            do {
                try await scheduleRepo.deleteSlot(trainerId: trainerId, startTime: slot.startTime)
            } catch {
            }
        }
        
        await refreshSchedule()
    }
    
    private func handleSlotTap(_ slot: TrainerScheduleSlot, defaultDay: Date, defaultHour: Int) {
        // Check if this is a class booking
        if slot.isClass, let classId = slot.classId {
            // Use cached participants if available
            if let cached = viewModel.participantsByClassId[classId] {
                selectedClassId = classId
                selectedClassName = slot.clientName ?? "Group Class"
                preloadedParticipants = cached
                classParticipantsShown = true
                return
            }
            
            // Fetch participants BEFORE showing sheet
            Task {
                do {
                    let participants = try await fetchParticipants(classId: classId)
                    await MainActor.run {
                        viewModel.participantsByClassId[classId] = participants
                        selectedClassId = classId
                        selectedClassName = slot.clientName ?? "Group Class"
                        preloadedParticipants = participants
                        classParticipantsShown = true
                    }
                } catch {
                    await MainActor.run {
                        selectedClassId = classId
                        selectedClassName = slot.clientName ?? "Group Class"
                        preloadedParticipants = []
                        classParticipantsShown = true
                    }
                }
            }
            return
        }
        
        // Handle regular client booking
        if slot.isBooked, let clientId = slot.clientId {
            // Fetch data BEFORE showing sheet
            Task {
                // Try to fetch full booking details
                var booking: ClientBooking?
                
                do {
                    let db = Firestore.firestore()
                    let bookingsSnapshot = try await db.collection("bookings")
                        .whereField("clientId", isEqualTo: clientId)
                        .whereField("trainerId", isEqualTo: slot.trainerId)
                        .whereField("startTime", isEqualTo: Timestamp(date: slot.startTime))
                        .limit(to: 1)
                        .getDocuments()
                    
                    if let bookingDoc = bookingsSnapshot.documents.first {
                        let data = bookingDoc.data()
                        booking = ClientBooking(
                            id: bookingDoc.documentID,
                            trainerId: slot.trainerId,
                            trainerName: trainerViewModel.trainer?.displayName ?? "Trainer",
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
                    booking = ClientBooking(
                        id: slot.id,
                        trainerId: slot.trainerId,
                        trainerName: trainerViewModel.trainer?.displayName ?? "Trainer",
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
                        viewModel.clientsById[clientId] = fetched
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
        
        return snapshot.documents.compactMap { (doc) -> ClassParticipant? in
            let data = doc.data()
            guard let userId = data["userId"] as? String,
                  let firstName = data["firstName"] as? String,
                  let lastName = data["lastName"] as? String,
                  let timestamp = data["registeredAt"] as? Timestamp else {
                return nil
            }
            
            let athleteName = data["athleteName"] as? String
            
            return ClassParticipant(
                id: doc.documentID,
                userId: userId,
                firstName: firstName,
                lastName: lastName,
                athleteName: athleteName,
                registeredAt: timestamp.dateValue()
            )
        }
    }
}

// Extracted grid view to reduce type-checking complexity.
private struct ScheduleGridView: View {
    let weekDays: [Date]
    let visibleHours: [Int]
    let slotsByDay: [DateOnly: [TrainerScheduleSlot]]
    let isAdmin: Bool
    let timeColWidth: CGFloat
    let rowHeight: CGFloat
    let rowVerticalPadding: CGFloat
    let columnSpacing: CGFloat
    let dayColumnWidth: CGFloat
    let viewingTrainerId: String?
    @Binding var hasScrolledToCurrentTime: Bool
    
    let onEmptyTap: (Date, Int) -> Void
    let onSlotTap: (TrainerScheduleSlot, Date, Int) -> Void
    let onSetStatus: (Date, Int, TrainerScheduleSlot.Status) -> Void
    let onClear: (Date, Int) -> Void
    
    var body: some View {
        ScrollViewReader { verticalScrollProxy in
            ScrollView(.vertical, showsIndicators: true) {
                ZStack(alignment: .topLeading) {
                    HStack(spacing: 0) {
                        // Time column
                        VStack(spacing: 0) {
                            ForEach(visibleHours, id: \.self) { hour in
                                Text(hourLabel(hour))
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                                    .frame(maxWidth: .infinity, alignment: .trailing)
                                    .padding(.trailing, 6)
                                    .frame(height: rowHeight)
                                    .background(Color(UIColor.systemGray6))
                                    .padding(.vertical, rowVerticalPadding)
                                    .id("hour-\(hour)")
                            }
                        }
                        .frame(width: timeColWidth)
                        .background(Color(UIColor.systemGray6))
                        
                        // Days grid
                        HStack(spacing: columnSpacing) {
                            ForEach(weekDays, id: \.self) { day in
                                let isToday = Calendar.current.isDateInToday(day)
                                VStack(spacing: 0) {
                                    ForEach(visibleHours, id: \.self) { hour in
                                        HourDayCell(
                                            day: day,
                                            hour: hour,
                                            slotsForDay: slotsByDay[DateOnly(day)] ?? [],
                                            dayColumnWidth: dayColumnWidth,
                                            rowHeight: rowHeight,
                                            horizontalPadding: 2,
                                            isToday: isToday,
                                            viewingTrainerId: viewingTrainerId,
                                            onEmptyTap: {
                                                onEmptyTap(day, hour)
                                            },
                                            onSlotTap: { slot in
                                                onSlotTap(slot, day, hour)
                                            },
                                            onSetStatus: { status in
                                                if isAdmin {
                                                    onSetStatus(day, hour, status)
                                                }
                                            },
                                            onClear: {
                                                if isAdmin {
                                                    onClear(day, hour)
                                                }
                                            }
                                        )
                                        .padding(.vertical, rowVerticalPadding)
                                    }
                                }
                                .background(isToday ? Color.blue.opacity(0.08) : Color.clear)
                            }
                        }
                        .padding(.bottom, 8)
                    }
                    
                    // Current time indicator - scrolls WITH content at the time position
                    TimelineView(.everyMinute) { context in
                        if let y = currentTimeYOffset(for: context.date,
                                                      firstHour: visibleHours.first,
                                                      rowHeight: rowHeight,
                                                      rowVerticalPadding: rowVerticalPadding) {
                            Rectangle()
                                .fill(Color.red)
                                .frame(height: 2)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .offset(x: 0, y: y)
                                .allowsHitTesting(false)
                        }
                    }
                }
            }
            .background(Color(UIColor.systemGray6))
            .onAppear {
                scrollToCurrentTime(verticalScrollProxy: verticalScrollProxy)
            }
            .onChange(of: hasScrolledToCurrentTime) { _, newValue in
                if !newValue {
                    scrollToCurrentTime(verticalScrollProxy: verticalScrollProxy)
                }
            }
        }
    }
    
    private func hourLabel(_ hour: Int) -> String {
        let h = hour == 0 ? 12 : (hour > 12 ? hour - 12 : hour)
        let suffix = (hour < 12 || hour == 24) ? "am" : "pm"
        return "\(h)\(suffix)"
    }
    
    private func scrollToCurrentTime(verticalScrollProxy: ScrollViewProxy) {
        guard !hasScrolledToCurrentTime else { return }
        let now = Date()
        let comps = Calendar.current.dateComponents([.hour], from: now)
        guard let currentHour = comps.hour else { return }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            withAnimation(.easeInOut(duration: 0.5)) {
                verticalScrollProxy.scrollTo("hour-\(currentHour)", anchor: .center)
            }
            hasScrolledToCurrentTime = true
        }
    }
    
    private func currentTimeYOffset(for now: Date, firstHour: Int?, rowHeight: CGFloat, rowVerticalPadding: CGFloat) -> CGFloat? {
        guard let firstHour = firstHour else { return nil }
        let cal = Calendar.current
        let hour = cal.component(.hour, from: now)
        let minute = cal.component(.minute, from: now)
        let hoursFromStart = hour - firstHour
        guard hoursFromStart >= 0 else { return nil }
        let totalRowHeight = rowHeight + rowVerticalPadding * 2
        let fractionOfHour = CGFloat(minute) / 60.0
        return CGFloat(hoursFromStart) * totalRowHeight + fractionOfHour * totalRowHeight
    }
}

// MARK: - ViewModel for TrainerWeekView

@MainActor
final class TrainerWeekViewModel: ObservableObject {
    @Published var trainer: Trainer?
    @Published var slotsByDay: [DateOnly: [TrainerScheduleSlot]] = [:]
    
    private let scheduleRepo = ScheduleRepository()
    
    func loadTrainer(trainerId: String) async {
        do {
            trainer = try await FirestoreService.shared.fetchTrainer(by: trainerId)
        } catch {
        }
    }
    
    func loadWeek(weekDays: [Date], trainerId: String, orgId: String) async {
        var newSlotsByDay: [DateOnly: [TrainerScheduleSlot]] = [:]
        let cal = Calendar.current
        
        for day in weekDays {
            do {
                let startOfDay = cal.startOfDay(for: day)
                let endOfDay = cal.date(byAdding: .day, value: 1, to: startOfDay) ?? startOfDay.addingTimeInterval(24 * 60 * 60)
                let slots = try await scheduleRepo.fetchScheduleSlots(trainerId: trainerId, from: startOfDay, to: endOfDay, orgId: orgId)
                newSlotsByDay[DateOnly(day)] = slots
            } catch {
                newSlotsByDay[DateOnly(day)] = []
            }
        }
        
        slotsByDay = newSlotsByDay
    }
}
