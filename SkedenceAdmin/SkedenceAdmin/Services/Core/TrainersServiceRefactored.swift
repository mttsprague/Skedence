//
//  TrainersServiceRefactored.swift
//  SkedenceAdmin
//
//  Phase 3.3: Example service using LoadingState<T> pattern
//

import Foundation
import Combine
import FirebaseFirestore

@MainActor
final class TrainersServiceRefactored: ObservableObject {
    @Published private(set) var trainersState: LoadingState<[Trainer]> = .idle
    
    private let db = Firestore.firestore()
    
    var trainers: [Trainer] {
        trainersState.data ?? []
    }
    
    var isLoading: Bool {
        trainersState.isLoading
    }
    
    var errorMessage: String? {
        trainersState.errorMessage
    }

    func loadAll(orgId: String) async {
        guard !orgId.isEmpty else {
            trainersState = .error(TrainersServiceError.orgIdMissing)
            return
        }
        
        trainersState = .loading
        
        do {
            let snap = try await db.collection("trainers")
                .whereField("orgId", isEqualTo: orgId)
                .getDocuments()
            
            let trainers = snap.documents.map { doc in
                let data = doc.data()
                
                return Trainer(
                    id: doc.documentID,
                    firstName: data["firstName"] as? String,
                    lastName: data["lastName"] as? String,
                    email: data["email"] as? String,
                    avatarUrl: data["avatarUrl"] as? String,
                    photoURL: data["photoURL"] as? String,
                    imageUrl: data["imageUrl"] as? String,
                    active: (data["active"] as? Bool) ?? true
                )
            }
            
            trainersState = .loaded(trainers)
        } catch {
            trainersState = .error(TrainersServiceError.fetchFailed(error.localizedDescription))
        }
    }
    
    func refresh(orgId: String) async {
        await loadAll(orgId: orgId)
    }
}
