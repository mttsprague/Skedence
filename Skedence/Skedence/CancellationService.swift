//
//  CancellationService.swift
//  Skedence
//
//  Created by Assistant on 12/31/25.
//

import Foundation
import FirebaseFunctions
import FirebaseAuth
import FirebaseFirestore
import Combine

@MainActor
final class CancellationService: ObservableObject {
    // Satisfy ObservableObject conformance when there are no @Published properties
    let objectWillChange = ObservableObjectPublisher()
    
    private let functions = Functions.functions()
    private let db = Firestore.firestore()
    
    func cancelLesson(bookingId: String) async throws {
        guard let user = Auth.auth().currentUser else { throw CancellationError.notAuthenticated }
        let uid = user.uid
        
        // Get booking details before canceling for activity log
        let bookingDoc = try await db.collection("bookings").document(bookingId).getDocument()
        let bookingData = bookingDoc.data()
        
        let callable = functions.httpsCallable("cancelLesson")
        let data: [String: Any] = ["bookingId": bookingId]
        
        do {
            _ = try await callable.call(data)
            
            // Log activity after successful cancellation
            if let bookingData = bookingData,
               let orgId = bookingData["orgId"] as? String,
               let clientName = bookingData["clientName"] as? String,
               let trainerName = bookingData["trainerName"] as? String,
               let trainerId = bookingData["trainerId"] as? String,
               let clientId = bookingData["clientId"] as? String {
                
                let startTime = (bookingData["startTime"] as? Timestamp)?.dateValue() ?? Date()
                
                Task {
                    try? await ActivityLogger.shared.log(
                        type: .lessonCanceled,
                        actorId: uid,
                        actorName: user.displayName ?? clientName,
                        actorRole: .client,
                        targetId: bookingId,
                        targetName: "\(clientName) with \(trainerName)",
                        targetType: "lesson",
                        description: "\(user.displayName ?? clientName) canceled lesson for \(clientName) with \(trainerName) scheduled for \(ActivityLogger.formatDateTime(startTime))",
                        metadata: [
                            "lessonId": bookingId,
                            "clientId": clientId,
                            "trainerId": trainerId,
                            "startTime": startTime.ISO8601Format()
                        ],
                        orgId: orgId
                    )
                }
            }
        } catch {
            print("Error cancelling lesson: \(error)")
            throw CancellationError.cancellationFailed(error.localizedDescription)
        }
    }
    
    func cancelClassRegistration(classId: String) async throws {
        let callable = functions.httpsCallable("cancelClassRegistration")
        let data: [String: Any] = ["classId": classId]
        
        do {
            _ = try await callable.call(data)
        } catch {
            print("Error cancelling class registration: \(error)")
            throw CancellationError.cancellationFailed(error.localizedDescription)
        }
    }
    
    enum CancellationError: LocalizedError {
        case notAuthenticated
        case cancellationFailed(String)
        
        var errorDescription: String? {
            switch self {
            case .notAuthenticated:
                return "You must be signed in to cancel."
            case .cancellationFailed(let message):
                return "Cancellation failed: \(message)"
            }
        }
    }
}
