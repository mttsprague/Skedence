//
//  ClientsRepository.swift
//  SkedenceAdmin
//
//  Created by Matthew Sprague on 10/12/25.
//

import Foundation
import Combine

struct ClientsRepository {
    func fetchClients(trainerId: String, orgId: String) async throws -> [Client] {
        try await FirestoreClientsService.shared.fetchTrainerClients(trainerId: trainerId, orgId: orgId)
    }
}
