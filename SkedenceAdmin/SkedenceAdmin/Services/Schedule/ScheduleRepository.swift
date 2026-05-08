//
//  ScheduleRepository.swift
//  SkedenceAdmin
//
//  Created by Matthew Sprague on 10/12/25.
//

import Foundation
import Combine

struct ScheduleRepository {
    func fetchScheduleSlots(trainerId: String, from: Date, to: Date, orgId: String) async throws -> [TrainerScheduleSlot] {
        try await FirestoreScheduleService.shared.fetchTrainerSchedule(trainerId: trainerId, from: from, to: to, orgId: orgId)
    }

    func upsertSlot(trainerId: String, orgId: String, startTime: Date, endTime: Date, status: TrainerScheduleSlot.Status, location: String? = nil, createdByRole: String? = nil, createdById: String? = nil, isOrgWide: Bool = false) async throws {
        try await FirestoreScheduleService.shared.upsertTrainerSlot(trainerId: trainerId, orgId: orgId, startTime: startTime, endTime: endTime, status: status, location: location, createdByRole: createdByRole, createdById: createdById, isOrgWide: isOrgWide)
    }

    func deleteSlot(trainerId: String, startTime: Date) async throws {
        try await FirestoreScheduleService.shared.deleteTrainerSlot(trainerId: trainerId, startTime: startTime)
    }
}

