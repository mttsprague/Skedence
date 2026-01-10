//
//  TrainersService.swift
//  Skedence
//
//  Created by Matthew Sprague on 10/14/25.
//


import Foundation
import Combine
import FirebaseFirestore

@MainActor
final class TrainersService: ObservableObject {
    @Published private(set) var trainers: [Trainer] = []
    @Published private(set) var isLoading = false
    @Published private(set) var errorMessage: String?

    private let db = Firestore.firestore()

    func loadAll(orgId: String) async {
        isLoading = true
        errorMessage = nil
        do {
            let snap = try await db.collection("trainers")
                .whereField("orgId", isEqualTo: orgId)
                .getDocuments()
            trainers = snap.documents.map { doc in
                let data = doc.data()
                
                // Handle both old (name) and new (firstName/lastName) schema
                var firstName = data["firstName"] as? String
                var lastName = data["lastName"] as? String
                
                // Fallback to old 'name' field if firstName doesn't exist
                if firstName == nil, let oldName = data["name"] as? String {
                    let parts = oldName.split(separator: " ", maxSplits: 1)
                    firstName = String(parts.first ?? "")
                    lastName = parts.count > 1 ? String(parts[1]) : ""
                }
                
                return Trainer(
                    id: doc.documentID,
                    firstName: firstName,
                    lastName: lastName,
                    email: data["email"] as? String,
                    avatarUrl: data["avatarUrl"] as? String,
                    photoURL: data["photoURL"] as? String,
                    imageUrl: data["imageUrl"] as? String,
                    active: data["active"] as? Bool
                )
            }
        } catch {
            errorMessage = error.localizedDescription
            trainers = []
        }
        isLoading = false
    }
}
