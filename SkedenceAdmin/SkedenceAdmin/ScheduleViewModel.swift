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

    // State used by ScheduleView
    @Published var weekDays: [Date] = []
    @Published var selectedDate: Date = Date() {
        didSet {
            // Rebuild the visible week whenever the selected day changes
            buildCurrentWeek(anchor: selectedDate)
        }
    }
    @Published var visibleHours: [Int] = Array(6...23) // 6am - 11pm (with 12am/midnight as last slot)
    @Published var slotsByDay: [DateOnly: [TrainerScheduleSlot]] = [:]

    // Client cache for instant presentation
    @Published var clientsById: [String: Client] = [:]
    
    // Class participants cache for instant presentation
    @Published var participantsByClassId: [String: [ClassParticipant]] = [:]

    private let scheduleRepo = ScheduleRepository()

    init() {
        buildCurrentWeek(anchor: Date())
    }

    // Allow the view to update the trainer id from Auth
    func setTrainerId(_ id: String) {
        myTrainerId = id
        editingTrainerId = id // Default to editing own schedule
        Task { await loadWeek() }
    }
    
    // Allow the view to update the orgId from Auth
    func setOrgId(_ id: String?) {
        orgId = id
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
            print("❌ Error counting slots: \(error)")
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
    
    // Load all trainers (for admin selector)
    func loadAllTrainers() async {
        guard let orgId = orgId else {
            print("⚠️ No orgId available for loadAllTrainers")
            allTrainers = []
            return
        }
        print("🔄 Loading trainers for orgId: \(orgId)")
        do {
            allTrainers = try await FirestoreService.shared.fetchAllTrainers(orgId: orgId)
            print("✅ Loaded \(allTrainers.count) trainers: \(allTrainers.map { $0.displayName })")
        } catch {
            print("❌ Error loading trainers: \(error)")
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
            print("⚠️ No orgId available for loadWeek")
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
            
            // Prefetch class participants for all class bookings in this week
            await prefetchClassParticipantsForVisibleWeek()
        } catch {
            self.slotsByDay = [:]
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
    
    // MARK: - Prefetch class participants for instant sheet presentation
    func prefetchClassParticipantsForVisibleWeek() async {
        // Collect unique class IDs from class bookings
        let allClassIds = Set(slotsByDay.values.flatMap { daySlots in
            daySlots.compactMap { $0.isClass ? $0.classId : nil }
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
            
            return ClassParticipant(
                id: doc.documentID,
                userId: userId,
                firstName: firstName,
                lastName: lastName,
                registeredAt: registeredAtTimestamp.dateValue()
            )
        }
        
        return participants
    }

    // MARK: - Editing availability (single slot at hour granularity)
    func setSlotStatus(on day: Date, hour: Int, status: TrainerScheduleSlot.Status) async {
        let cal = Calendar.current
        guard let start = cal.date(bySettingHour: hour, minute: 0, second: 0, of: day),
              let end = cal.date(byAdding: .hour, value: 1, to: start) else { return }
        await setCustomSlot(on: day, startTime: start, endTime: end, status: status)
    }

    // Allows custom start/end (from the wheel editor)
    // Updated: Splits multi-hour blocks into one-hour slots
    func setCustomSlot(on day: Date, startTime: Date, endTime: Date, status: TrainerScheduleSlot.Status, billingPlan: String = "free") async {
        guard endTime > startTime else { return }

        let calendar = Calendar.current
        var currentSlotStart = startTime
        // Use editingTrainerId if set (admin editing another trainer), otherwise use myTrainerId
        let trainerId = editingTrainerId ?? myTrainerId
        
        // Only enforce slot limits for "open" status
        if status == .open {
            guard let orgId = orgId else {
                print("❌ No orgId available for schedule operation")
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

        while currentSlotStart < endTime {
            guard let nextHour = calendar.date(byAdding: .hour, value: 1, to: currentSlotStart) else { break }

            // For strict 1-hour "open" slots, skip partial trailing hour
            if nextHour > endTime && status == .open {
                break
            }

            let actualSlotEnd = min(nextHour, endTime)
            do {
                guard let orgId = orgId else {
                    print("❌ No orgId available for schedule operation")
                    continue
                }
                try await scheduleRepo.upsertSlot(
                    trainerId: trainerId,
                    orgId: orgId,
                    startTime: currentSlotStart,
                    endTime: actualSlotEnd,
                    status: status
                )
            } catch {
                print("Failed to upsert slot for \(currentSlotStart): \(error)")
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
            print("Failed to delete slot: \(error)")
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
        status: TrainerScheduleSlot.Status = .open
    ) async {
        let fmt = DateFormatter()
        fmt.calendar = Calendar(identifier: .gregorian)
        // IMPORTANT: Use LOCAL timezone for date-only strings so the server interprets them as local days.
        fmt.timeZone = .current
        fmt.dateFormat = "yyyy-MM-dd"

        let startStr = start.map { fmt.string(from: $0) }
        let endStr = end.map { fmt.string(from: $0) }
        
        // Use editingTrainerId if set (admin editing another trainer), otherwise nil (uses authenticated user)
        let targetTrainerId = editingTrainerId != myTrainerId ? editingTrainerId : nil

        do {
            let result = try await FunctionsService.shared.processTrainerAvailability(
                trainerId: targetTrainerId,
                startDate: startStr,
                endDate: endStr,
                dailyStartHour: dailyStartHour,
                dailyEndHour: dailyEndHour,
                slotDurationMinutes: slotDurationMinutes,
                daysOfWeek: selectedDaysOfWeek,
                status: status.rawValue
            )
            print("processTrainerAvailability: \(result.message) slotsAdded=\(result.slotsAdded ?? 0)")
            await loadWeek()
        } catch {
            print("Failed to process availability: \(error)")
        }
    }
    
    // Admin-only: Set custom slot for all trainers
    func setCustomSlotForAllTrainers(on day: Date, startTime: Date, endTime: Date, status: TrainerScheduleSlot.Status) async {
        guard status == .unavailable else { return }
        guard let orgId = orgId else {
            print("⚠️ No orgId available for setCustomSlotForAllTrainers")
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
                            status: status
                        )
                    } catch {
                        print("Failed to set slot for trainer \(String(describing: trainer.id)): \(error)")
                    }
                    
                    currentSlotStart = nextHour
                }
            }
            
            await loadWeek()
        } catch {
            print("Failed to fetch trainers or set slots: \(error)")
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
        status: TrainerScheduleSlot.Status = .unavailable
    ) async {
        guard status == .unavailable else { return }
        guard let orgId = orgId else {
            print("⚠️ No orgId available for openAvailabilityForAllTrainers")
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
                    let result = try await FunctionsService.shared.processTrainerAvailability(
                        trainerId: trainerId,
                        startDate: startStr,
                        endDate: endStr,
                        dailyStartHour: dailyStartHour,
                        dailyEndHour: dailyEndHour,
                        slotDurationMinutes: slotDurationMinutes,
                        daysOfWeek: selectedDaysOfWeek,
                        status: status.rawValue
                    )
                    print("Applied to \(trainer.displayName): \(result.message) slotsAdded=\(result.slotsAdded ?? 0)")
                } catch {
                    print("Failed to process availability for trainer \(String(describing: trainer.id)): \(error)")
                }
            }
            
            await loadWeek()
        } catch {
            print("Failed to fetch trainers or process availability: \(error)")
        }
    }
    
    // Admin function to book a lesson for a client
    func bookLessonForClient(clientId: String, startTime: Date, endTime: Date, packageId: String) async -> Bool {
        print("🎯 START")
        
        guard let trainerId = editingTrainerId else {
            print("❌ No trainer")
            return false
        }
        
        print("🎯 Have trainer")
        
        do {
            guard let orgId = orgId else {
                print("❌ No orgId available")
                return false
            }
            
            print("🎯 Creating slot")
            try await scheduleRepo.upsertSlot(
                trainerId: trainerId,
                orgId: orgId,
                startTime: startTime,
                endTime: endTime,
                status: .open
            )
            print("✅ Slot OK")
            
            print("🎯 Gen ID")
            let slotId = generateScheduleDocId(for: startTime)
            print("✅ ID OK")
            
            print("🎯 Booking")
            try await FirestoreService.shared.adminBookLesson(
                trainerId: trainerId,
                slotId: slotId,
                clientId: clientId,
                packageId: packageId,
                orgId: orgId
            )
            print("✅ Booked")
            
            // Wait a moment for Firestore to propagate changes
            try? await Task.sleep(nanoseconds: 1_000_000_000) // 1 second
            
            print("🔄 Reload")
            await loadWeek()
            print("✅ Done")
            return true
        } catch {
            print("❌ Err: \\(error.localizedDescription)")
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
