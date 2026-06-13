//
//  ScheduleViewModel.swift
//  SkedenceAdmin
//
//  Created by Matthew Sprague on 10/12/25.
//

import SwiftUI
import Foundation
import Combine
import FirebaseFirestore

enum ScheduleMode: Equatable {
    case myWeek
    case myDay
    case allTrainersDay
    case trainerDay(String) // trainerId
}

@MainActor
final class ScheduleViewModel: ObservableObject {
    // Default to demo; ScheduleView updates this from AuthManager when available
    private var myTrainerId: String = "trainer_demo"
    private var orgId: String?

    @Published var mode: ScheduleMode = .myWeek
    @Published var selectedTrainerId: String?
    @Published var allTrainers: [Trainer] = []
    @Published var editingTrainerId: String? // For admin: which trainer's schedule to edit
    
    // Slot limit enforcement
    @Published var showSlotLimitAlert = false
    @Published var slotLimitMessage = ""
    @Published var totalOpenSlotsCount = 0
    
    // Overlap detection
    @Published var showOverlapAlert = false
    @Published var overlapConflicts: [(name: String, type: String, time: String)] = []
    @Published var pendingSlot: (day: Date, startTime: Date, endTime: Date, status: TrainerScheduleSlot.Status, location: String?)? = nil
    @Published var recurringError: String?

    // State used by ScheduleView
    @Published var weekDays: [Date] = []
    @Published var selectedDate: Date = Date() {
        didSet {
            // Rebuild the visible week whenever the selected day changes
            buildCurrentWeek(anchor: selectedDate)
            // Reload schedule data when week changes
            Task {
                await loadWeek()
            }
        }
    }
    @Published var visibleHours: [Int] = Array(6...23) // 6am - 11pm (last slot ends at 12am)
    @Published var slotsByDay: [DateOnly: [TrainerScheduleSlot]] = [:]

    // Client cache for instant presentation
    @Published var clientsById: [String: Client] = [:]
    
    // Class participants cache for instant presentation
    @Published var participantsByClassId: [String: [ClassParticipant]] = [:]
    
    // Class title cache for instant presentation
    @Published var classTitlesByClassId: [String: String] = [:]

    // Real-time listener for schedule subcollection changes
    #if canImport(FirebaseFirestore)
    private var scheduleListener: ListenerRegistration?
    #endif
    private var activeListenerTrainerId: String?
    private var activeListenerWeekStart: Date?

    private let scheduleRepo = ScheduleRepository()

    init() {
        buildCurrentWeek(anchor: Date())
    }
    
    deinit {
        stopScheduleListener()
    }

    // Allow the view to update the trainer id from Auth
    func setTrainerId(_ id: String) {
        myTrainerId = id
        editingTrainerId = id // Default to editing own schedule
        stopScheduleListener() // Listener will be re-established by loadWeek
        Task { await loadWeek() }
    }
    
    // Allow the view to update the orgId from Auth
    func setOrgId(_ id: String?) {
        orgId = id
        stopScheduleListener() // Listener will be re-established by loadWeek
        Task { await loadWeek() }
    }
    
    // Count total open availability slots for free trial enforcement
    func countOpenSlots(for trainerId: String, orgId: String) async -> Int {
        do {
            #if canImport(FirebaseFirestore)
            let db = Firestore.firestore()
            
            // Count all open slots for this trainer (future slots only)
            let now = Date()
            let snapshot = try await db.collectionGroup("schedules")
                .whereField("trainerId", isEqualTo: trainerId)
                .whereField("orgId", isEqualTo: orgId)
                .whereField("status", isEqualTo: "open")
                .whereField("startTime", isGreaterThan: Timestamp(date: now))
                .getDocuments()
            
            return snapshot.documents.count
            #else
            return 0
            #endif
        } catch {
            return 0
        }
    }
    
    // Check if can add more slots based on billing plan
    func canAddSlots(billingPlan: String, currentSlotCount: Int) -> (allowed: Bool, message: String?) {
        // Free plan: limit to 2 slots
        if billingPlan.lowercased() == "free" {
            if currentSlotCount >= 2 {
                return (false, "Free trial allows 2 availability slots. Subscribe to add unlimited slots and grow your business!")
            }
        }
        
        // Paid plans: unlimited slots
        return (true, nil)
    }
    
    // Overlap confirmation handlers
    func confirmOverlap() async {
        guard let pending = pendingSlot else { return }
        showOverlapAlert = false
        
        // NOTE: Do NOT clear pendingSlot here. setCustomSlot checks `pendingSlot == nil`
        // to decide whether to run the overlap check. Keeping it non-nil causes the check
        // to be skipped on this confirmed call, so the write loop actually runs.
        
        // Proceed with creation
        await setCustomSlot(
            on: pending.day,
            startTime: pending.startTime,
            endTime: pending.endTime,
            status: pending.status,
            location: pending.location
        )
        
        // Reset state after the write completes
        pendingSlot = nil
        overlapConflicts = []
    }
    
    func cancelOverlap() {
        showOverlapAlert = false
        overlapConflicts = []
        pendingSlot = nil
    }
    
    // Load all trainers (for admin selector)
    func loadAllTrainers() async {
        guard let orgId = orgId else {
            allTrainers = []
            return
        }
        do {
            allTrainers = try await FirestoreService.shared.fetchAllTrainers(orgId: orgId)
        } catch {
            allTrainers = []
        }
    }

    // Title for the current week range, e.g. "Oct 13–19, 2025" or "Sep 30 – Oct 6, 2025"
    var weekTitle: String {
        guard let first = weekDays.first, let last = weekDays.last else {
            let formatter = DateFormatter()
            formatter.dateStyle = .medium
            return formatter.string(from: selectedDate)
        }

        let cal = Calendar.current
        let sameMonth = cal.component(.month, from: first) == cal.component(.month, from: last)
        let sameYear = cal.component(.year, from: first) == cal.component(.year, from: last)

        let startFormatter = DateFormatter()
        let endFormatter = DateFormatter()

        if sameYear {
            if sameMonth {
                startFormatter.setLocalizedDateFormatFromTemplate("MMM d")
                endFormatter.setLocalizedDateFormatFromTemplate("d, yyyy")
            } else {
                startFormatter.setLocalizedDateFormatFromTemplate("MMM d")
                endFormatter.setLocalizedDateFormatFromTemplate("MMM d, yyyy")
            }
        } else {
            startFormatter.setLocalizedDateFormatFromTemplate("MMM d, yyyy")
            endFormatter.setLocalizedDateFormatFromTemplate("MMM d, yyyy")
        }

        let startText = startFormatter.string(from: first)
        let endText = endFormatter.string(from: last)
        return "\(startText) – \(endText)"
    }

    func setMode(_ newMode: ScheduleMode) {
        mode = newMode
        switch newMode {
        case .myWeek:
            break
        case .myDay:
            break
        case .allTrainersDay:
            break
        case .trainerDay(let trainerId):
            selectedTrainerId = trainerId
        }
        Task { await loadWeek() }
    }

    func loadWeek() async {
        guard let orgId = orgId else {
            slotsByDay = [:]
            return
        }
        
        let trainerId: String
        // If admin is editing another trainer's schedule, use editingTrainerId
        if let editingId = editingTrainerId {
            trainerId = editingId
        } else {
            switch mode {
            case .trainerDay(let id):
                trainerId = id
            default:
                trainerId = myTrainerId
            }
        }

        
        // Determine week range based on selectedDate
        let cal = Calendar.current
        let startOfWeek = cal.date(from: cal.dateComponents([.yearForWeekOfYear, .weekOfYear], from: selectedDate)) ?? selectedDate
        let endOfWeek = cal.date(byAdding: .day, value: 7, to: startOfWeek) ?? selectedDate
        
        do {
            let slots = try await scheduleRepo.fetchScheduleSlots(trainerId: trainerId, from: startOfWeek, to: endOfWeek, orgId: orgId)
            
            var grouped: [DateOnly: [TrainerScheduleSlot]] = [:]
            for slot in slots {
                let key = DateOnly(slot.startTime)
                grouped[key, default: []].append(slot)
            }
            for key in grouped.keys {
                grouped[key]?.sort { $0.startTime < $1.startTime }
            }
            
            self.slotsByDay = grouped

            // Prefetch clients for all booked slots in this week
            await prefetchClientsForVisibleWeek()
            
            // Prefetch class titles for all class bookings in this week
            await prefetchClassTitlesForVisibleWeek()
            
            // Prefetch class participants for all class bookings in this week
            await prefetchClassParticipantsForVisibleWeek()
            
            // Set up real-time listener to catch admin-created org-wide unavailability
            // and any other remote schedule changes while the view is visible
            setupScheduleListener(trainerId: trainerId, weekStart: startOfWeek, weekEnd: endOfWeek, orgId: orgId)
        } catch {
            self.slotsByDay = [:]
        }
    }

    // MARK: - Real-time schedule listener (for org-wide admin unavailability)
    
    private func setupScheduleListener(trainerId: String, weekStart: Date, weekEnd: Date, orgId: String) {
        // Don't recreate listener if already watching same trainer+week
        if trainerId == activeListenerTrainerId, let active = activeListenerWeekStart, active == weekStart {
            return
        }
        stopScheduleListener()
        activeListenerTrainerId = trainerId
        activeListenerWeekStart = weekStart

        #if canImport(FirebaseFirestore)
        let db = Firestore.firestore()
        let startTs = Timestamp(date: weekStart)
        let endTs = Timestamp(date: weekEnd)

        // Skip the initial snapshot (already fetched via getDocuments above)
        var skippedInitial = false

        scheduleListener = db.collection("trainers")
            .document(trainerId)
            .collection("schedules")
            .whereField("startTime", isGreaterThanOrEqualTo: startTs)
            .whereField("startTime", isLessThan: endTs)
            .addSnapshotListener { [weak self] snapshot, error in
                guard let self, error == nil else { return }
                // Skip the initial invocation — data already loaded by getDocuments
                if !skippedInitial {
                    skippedInitial = true
                    return
                }
                // Only re-fetch if there are actual document changes
                guard let snapshot, !snapshot.documentChanges.isEmpty else { return }
                // Ensure we're still watching this trainer+week (guard against stale closures)
                guard self.activeListenerTrainerId == trainerId,
                      self.activeListenerWeekStart == weekStart else { return }
                Task { await self.refetchWeek(trainerId: trainerId, weekStart: weekStart, weekEnd: weekEnd, orgId: orgId) }
            }
        #endif
    }

    // Make this callable from nonisolated contexts like deinit,
    // but perform the actual work on the main actor.
    nonisolated func stopScheduleListener() {
        Task { @MainActor in
            #if canImport(FirebaseFirestore)
            self.scheduleListener?.remove()
            self.scheduleListener = nil
            #endif
            self.activeListenerTrainerId = nil
            self.activeListenerWeekStart = nil
        }
    }

    // Refetch week slots WITHOUT restarting the listener (used by snapshot callback)
    @MainActor
    private func refetchWeek(trainerId: String, weekStart: Date, weekEnd: Date, orgId: String) async {
        do {
            let slots = try await scheduleRepo.fetchScheduleSlots(trainerId: trainerId, from: weekStart, to: weekEnd, orgId: orgId)
            var grouped: [DateOnly: [TrainerScheduleSlot]] = [:]
            for slot in slots {
                let key = DateOnly(slot.startTime)
                grouped[key, default: []].append(slot)
            }
            for key in grouped.keys {
                grouped[key]?.sort { $0.startTime < $1.startTime }
            }
            self.slotsByDay = grouped
            await prefetchClientsForVisibleWeek()
            await prefetchClassTitlesForVisibleWeek()
            await prefetchClassParticipantsForVisibleWeek()
        } catch {
            // Keep existing slotsByDay on error
        }
    }

    // MARK: - Prefetch clients for instant sheet presentation
    func prefetchClientsForVisibleWeek() async {
        // Collect unique client IDs from booked slots
        let allIds = Set(slotsByDay.values.flatMap { daySlots in
            daySlots.compactMap { $0.isBooked ? $0.clientId : nil }
        })
        // Skip any already cached
        let missing = allIds.subtracting(clientsById.keys)
        guard !missing.isEmpty else { return }

        // Fetch concurrently off the main actor
        var fetched: [String: Client] = [:]
        await withTaskGroup(of: (String, Client?).self) { group in
            for id in missing {
                group.addTask {
                    let client = try? await FirestoreService.shared.fetchClient(by: id)
                    return (id, client)
                }
            }
            for await (id, client) in group {
                if let client {
                    fetched[id] = client
                }
            }
        }

        // Merge into cache
        for (id, client) in fetched {
            clientsById[id] = client
        }
    }
    
    // MARK: - Prefetch class titles for instant cell display
    func prefetchClassTitlesForVisibleWeek() async {
        // Collect unique class IDs from class slots
        let allClassIds: Set<String> = Set(slotsByDay.values.flatMap { daySlots in
            daySlots.compactMap { slot in
                guard slot.isClass, let classId = slot.classId, !classId.isEmpty else { return nil }
                return classId
            }
        })
        // Skip already cached
        let missing = allClassIds.subtracting(classTitlesByClassId.keys)
        guard !missing.isEmpty else { return }

        var fetched: [String: String] = [:]
        await withTaskGroup(of: (String, String?).self) { group in
            for classId in missing {
                group.addTask {
                    let title = await self.fetchClassTitle(classId: classId)
                    return (classId, title)
                }
            }
            for await (classId, title) in group {
                if let title {
                    fetched[classId] = title
                }
            }
        }

        for (classId, title) in fetched {
            classTitlesByClassId[classId] = title
        }
    }

    // MARK: - Prefetch class participants for instant sheet presentation
    func prefetchClassParticipantsForVisibleWeek() async {
        // Collect unique class IDs from class bookings
        let allClassIds: Set<String> = Set(slotsByDay.values.flatMap { daySlots in
            daySlots.compactMap { slot in
                guard slot.isClass, let classId = slot.classId, !classId.isEmpty else { return nil }
                return classId
            }
        })
        // Skip any already cached
        let missing = allClassIds.subtracting(participantsByClassId.keys)
        guard !missing.isEmpty else { return }

        // Fetch concurrently off the main actor
        var fetched: [String: [ClassParticipant]] = [:]
        await withTaskGroup(of: (String, [ClassParticipant]?).self) { group in
            for classId in missing {
                group.addTask {
                    let participants = try? await self.fetchParticipants(classId: classId)
                    return (classId, participants)
                }
            }
            for await (classId, participants) in group {
                if let participants {
                    fetched[classId] = participants
                }
            }
        }

        // Merge into cache
        for (classId, participants) in fetched {
            participantsByClassId[classId] = participants
        }
    }
    
    private func fetchParticipants(classId: String) async throws -> [ClassParticipant] {
        guard !classId.isEmpty else {
            return []
        }
        
        let db = Firestore.firestore()
        
        // Break the chain to help the compiler pick the async getDocuments() overload
        let query: Query = db.collection("classes")
            .document(classId)
            .collection("participants")
            .order(by: "registeredAt", descending: false)
        
        let snapshot: QuerySnapshot = try await query.getDocuments()
        
        let participants: [ClassParticipant] = snapshot.documents.compactMap { doc in
            let data = doc.data()
            guard let userId = data["userId"] as? String,
                  let firstName = data["firstName"] as? String,
                  let lastName = data["lastName"] as? String,
                  let registeredAtTimestamp = data["registeredAt"] as? Timestamp else {
                return nil
            }
            
            let athleteName = data["athleteName"] as? String
            
            return ClassParticipant(
                id: doc.documentID,
                userId: userId,
                firstName: firstName,
                lastName: lastName,
                athleteName: athleteName,
                registeredAt: registeredAtTimestamp.dateValue(),
                checkedIn: data["checkedIn"] as? Bool ?? false,
                checkedInAt: (data["checkedInAt"] as? Timestamp)?.dateValue()
            )
        }
        
        return participants
    }
    
    /// Fetch class title from Firestore and cache it
    func fetchClassTitle(classId: String) async -> String? {
        guard !classId.isEmpty else {
            return nil
        }
        
        // Check cache first
        if let cached = classTitlesByClassId[classId] {
            return cached
        }
        
        let db = Firestore.firestore()
        
        do {
            let doc = try await db.collection("classes")
                .document(classId)
                .getDocument()
            
            if let title = doc.data()?["title"] as? String {
                // Cache on main actor
                await MainActor.run {
                    classTitlesByClassId[classId] = title
                }
                return title
            }
        } catch {
            print("Error fetching class title: \(error.localizedDescription)")
        }
        
        return nil
    }

    // MARK: - Editing availability (single slot at hour granularity)
    func setSlotStatus(on day: Date, hour: Int, status: TrainerScheduleSlot.Status) async {
        let cal = Calendar.current
        guard let start = cal.date(bySettingHour: hour, minute: 0, second: 0, of: day),
              let end = cal.date(byAdding: .hour, value: 1, to: start) else { return }
        await setCustomSlot(on: day, startTime: start, endTime: end, status: status)
    }
    
    // Check for overlapping sessions
    func checkForOverlaps(trainerId: String, dates: [Date], startTime: Date, duration: TimeInterval) async -> [(name: String, type: String, time: String)] {
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
                    .whereField("orgId", isEqualTo: orgId ?? "")
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
                            
                            // Only flag booked lessons as real conflicts — open/unavailable slots can be overwritten
                            if !isClassBooking && status != "booked" { continue }
                            
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

    // Allows custom start/end (from the wheel editor)
    // Updated: Splits multi-hour blocks into one-hour slots
    func setCustomSlot(on day: Date, startTime: Date, endTime: Date, status: TrainerScheduleSlot.Status, billingPlan: String = "free", location: String? = nil, createdByRole: String? = nil, createdById: String? = nil, isOrgWide: Bool = false) async {
        guard endTime > startTime else { return }

        let calendar = Calendar.current
        var currentSlotStart = startTime
        // Use editingTrainerId if set (admin editing another trainer), otherwise use myTrainerId
        let trainerId = editingTrainerId ?? myTrainerId
        
        // Only enforce slot limits for "open" status
        if status == .open {
            guard let orgId = orgId else {
                return
            }
            
            // Count existing open slots
            let existingSlots = await countOpenSlots(for: trainerId, orgId: orgId)
            
            // Calculate how many new slots will be created
            let duration = endTime.timeIntervalSince(startTime)
            let hoursToCreate = Int(duration / 3600)
            
            // Check if adding these slots would exceed the limit
            let check = canAddSlots(billingPlan: billingPlan, currentSlotCount: existingSlots + hoursToCreate)
            
            if !check.allowed, let message = check.message {
                slotLimitMessage = message
                showSlotLimitAlert = true
                return
            }
        }
        
        // Check for overlaps before creating (skip if already confirmed via pendingSlot)
        if pendingSlot == nil {
            let duration = endTime.timeIntervalSince(startTime)
            let conflicts = await checkForOverlaps(trainerId: trainerId, dates: [startTime], startTime: startTime, duration: duration)
            
            if !conflicts.isEmpty {
                overlapConflicts = conflicts
                pendingSlot = (day: day, startTime: startTime, endTime: endTime, status: status, location: location)
                showOverlapAlert = true
                return
            }
        }

        while currentSlotStart < endTime {
            guard let nextHour = calendar.date(byAdding: .hour, value: 1, to: currentSlotStart) else { break }

            // For strict 1-hour "open" slots, skip partial trailing hour
            if nextHour > endTime && status == .open {
                break
            }

            let actualSlotEnd = min(nextHour, endTime)
            do {
                guard let orgId = orgId else {
                    continue
                }
                try await scheduleRepo.upsertSlot(
                    trainerId: trainerId,
                    orgId: orgId,
                    startTime: currentSlotStart,
                    endTime: actualSlotEnd,
                    status: status,
                    location: location,
                    createdByRole: createdByRole,
                    createdById: createdById,
                    isOrgWide: isOrgWide
                )
            } catch {
            }

            currentSlotStart = nextHour
        }

        await loadWeek()
    }

    func clearSlot(on day: Date, hour: Int) async {
        let cal = Calendar.current
        guard let start = cal.date(bySettingHour: hour, minute: 0, second: 0, of: day) else { return }

        // Use editingTrainerId if set (admin editing another trainer), otherwise use myTrainerId
        let trainerId = editingTrainerId ?? myTrainerId
        do {
            try await scheduleRepo.deleteSlot(trainerId: trainerId, startTime: start)
            await loadWeek()
        } catch {
        }
    }

    // MARK: - Bulk availability via Cloud Function
    func openAvailability(
        start: Date?,
        end: Date?,
        dailyStartHour: Int? = nil,
        dailyEndHour: Int? = nil,
        slotDurationMinutes: Int? = nil,
        selectedDaysOfWeek: [Int]? = nil,
        status: TrainerScheduleSlot.Status = .open,
        location: String? = nil
    ) async {
        let fmt = DateFormatter()
        fmt.calendar = Calendar(identifier: .gregorian)
        // IMPORTANT: Use LOCAL timezone for date-only strings so the server interprets them as local days.
        fmt.timeZone = .current
        fmt.dateFormat = "yyyy-MM-dd"

        let startStr = start.map { fmt.string(from: $0) }
        let endStr = end.map { fmt.string(from: $0) }
        
        // ALWAYS pass the trainerId - use editingTrainerId if set (admin editing another trainer), otherwise use myTrainerId
        let targetTrainerId = editingTrainerId ?? myTrainerId

        do {
            let result = try await FunctionsService.shared.processTrainerAvailability(
                trainerId: targetTrainerId,
                startDate: startStr,
                endDate: endStr,
                dailyStartHour: dailyStartHour,
                dailyEndHour: dailyEndHour,
                slotDurationMinutes: slotDurationMinutes,
                daysOfWeek: selectedDaysOfWeek,
                status: status.rawValue,
                location: location
            )
            
            // Log activity
            if let slotsAdded = result.slotsAdded, slotsAdded > 0 {
                // Activity logging can be added to cloud functions if needed
            }
            
            await loadWeek()
        } catch {
            let msg = (error as NSError).localizedDescription
            await MainActor.run {
                self.recurringError = msg.isEmpty ? "Failed to create availability. Please try again." : msg
            }
        }
    }
    
    // Admin-only: Set custom slot for all trainers
    func setCustomSlotForAllTrainers(on day: Date, startTime: Date, endTime: Date, status: TrainerScheduleSlot.Status, location: String? = nil, createdByRole: String? = nil, createdById: String? = nil) async {
        guard status == .unavailable else { return }
        guard let orgId = orgId else {
            return
        }
        
        do {
            let allTrainers = try await FirestoreService.shared.fetchAllTrainers(orgId: orgId)
            
            for trainer in allTrainers {
                guard trainer.active else { continue }
                guard let trainerId = trainer.id else { continue }
                
                let calendar = Calendar.current
                var currentSlotStart = startTime
                
                while currentSlotStart < endTime {
                    guard let nextHour = calendar.date(byAdding: .hour, value: 1, to: currentSlotStart) else { break }
                    let actualSlotEnd = min(nextHour, endTime)
                    
                    do {
                        try await scheduleRepo.upsertSlot(
                            trainerId: trainerId,
                            orgId: orgId,
                            startTime: currentSlotStart,
                            endTime: actualSlotEnd,
                            status: status,
                            location: location,
                            createdByRole: createdByRole,
                            createdById: createdById,
                            isOrgWide: true
                        )
                    } catch {
                    }
                    
                    currentSlotStart = nextHour
                }
            }
            
            await loadWeek()
        } catch {
        }
    }
    
    // Admin-only: Set recurring availability for all trainers
    func openAvailabilityForAllTrainers(
        start: Date?,
        end: Date?,
        dailyStartHour: Int? = nil,
        dailyEndHour: Int? = nil,
        slotDurationMinutes: Int? = nil,
        selectedDaysOfWeek: [Int]? = nil,
        status: TrainerScheduleSlot.Status = .unavailable,
        location: String? = nil
    ) async {
        guard status == .unavailable else { return }
        guard let orgId = orgId else {
            return
        }
        
        let fmt = DateFormatter()
        fmt.calendar = Calendar(identifier: .gregorian)
        fmt.timeZone = .current
        fmt.dateFormat = "yyyy-MM-dd"

        let startStr = start.map { fmt.string(from: $0) }
        let endStr = end.map { fmt.string(from: $0) }
        
        do {
            let allTrainers = try await FirestoreService.shared.fetchAllTrainers(orgId: orgId)
            
            for trainer in allTrainers {
                guard trainer.active else { continue }
                guard let trainerId = trainer.id else { continue }
                
                do {
                    _ = try await FunctionsService.shared.processTrainerAvailability(
                        trainerId: trainerId,
                        startDate: startStr,
                        endDate: endStr,
                        dailyStartHour: dailyStartHour,
                        dailyEndHour: dailyEndHour,
                        slotDurationMinutes: slotDurationMinutes,
                        daysOfWeek: selectedDaysOfWeek,
                        status: status.rawValue,
                        location: location
                    )
                } catch {
                }
            }
            
            await loadWeek()
        } catch {
        }
    }
    
    // Admin function to book a lesson for a client
    func bookLessonForClient(clientId: String, startTime: Date, endTime: Date, packageId: String) async -> Bool {
        
        guard let trainerId = editingTrainerId else {
            return false
        }
        
        
        do {
            guard let orgId = orgId else {
                return false
            }
            
            try await scheduleRepo.upsertSlot(
                trainerId: trainerId,
                orgId: orgId,
                startTime: startTime,
                endTime: endTime,
                status: .open
            )
            
            let slotId = generateScheduleDocId(for: startTime)
            
            do {
                try await FirestoreService.shared.adminBookLesson(
                    trainerId: trainerId,
                    slotId: slotId,
                    clientId: clientId,
                    packageId: packageId,
                    orgId: orgId
                )
            } catch {
                return false
            }
            
            // Wait a moment for Firestore to propagate changes
            try? await Task.sleep(nanoseconds: 1_000_000_000) // 1 second
            
            await loadWeek()
            return true
        } catch {
            return false
        }
    }
    
    // Generate deterministic schedule document ID (same logic as FirestoreService)
    private func generateScheduleDocId(for start: Date) -> String {
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

    private func buildCurrentWeek(anchor: Date) {
        let cal = Calendar.current
        let startOfWeek = cal.date(from: cal.dateComponents([.yearForWeekOfYear, .weekOfYear], from: anchor)) ?? anchor
        weekDays = (0..<7).compactMap { cal.date(byAdding: .day, value: $0, to: startOfWeek) }
        if !weekDays.contains(where: { cal.isDate($0, inSameDayAs: selectedDate) }) {
            selectedDate = weekDays.first ?? anchor
        }
    }

}
