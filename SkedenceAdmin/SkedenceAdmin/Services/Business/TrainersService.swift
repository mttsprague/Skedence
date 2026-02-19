//
//  TrainersService.swift
//  Skedence
//
//  Created by Matthew Sprague on 10/14/25.
//

import Foundation
import Combine
import FirebaseFirestore

enum TrainersServiceError: Error, LocalizedError {
    case orgIdMissing
    case trainerNotFound
    case fetchFailed(String)
    
    var errorDescription: String? {
        switch self {
        case .orgIdMissing:
            return "Organization ID is required"
        case .trainerNotFound:
            return "Trainer not found"
        case .fetchFailed(let message):
            return "Failed to fetch trainers: \(message)"
        }
    }
}

@MainActor
final class TrainersService: ObservableObject {
    @Published private(set) var trainers: [Trainer] = []
    @Published private(set) var isLoading = false
    @Published private(set) var errorMessage: String?

    private let db = Firestore.firestore()

    func loadAll(orgId: String) async {
        guard !orgId.isEmpty else {
            errorMessage = TrainersServiceError.orgIdMissing.localizedDescription
            return
        }
        
        isLoading = true
        errorMessage = nil
        
        do {
            let snap = try await db.collection("trainers")
                .whereField("orgId", isEqualTo: orgId)
                .getDocuments()
            
            trainers = snap.documents.map { doc in
                let data = doc.data()
                
                return Trainer(
                    id: doc.documentID,
                    firstName: data["firstName"] as? String,
                    lastName: data["lastName"] as? String,
                    email: data["email"] as? String,
                    avatarUrl: data["avatarUrl"] as? String,
                    photoURL: data["photoURL"] as? String,
                    imageUrl: data["imageUrl"] as? String,
                    active: (data["active"] as? Bool) ?? true,
                    trainerDescription: data["trainerDescription"] as? String
                )
            }
        } catch {
            errorMessage = TrainersServiceError.fetchFailed(error.localizedDescription).localizedDescription
            trainers = []
        }
        
        isLoading = false
    }
}
