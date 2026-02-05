//
//  CancellationService.swift
//  Skedence
//
//  Phase 2.2: Refactored to follow ServiceProtocol standard
//

import Foundation
import FirebaseAuth
import FirebaseFirestore
import Combine

@MainActor
final class CancellationService: ObservableObject {
    // MARK: - Published State (ServiceProtocol pattern)
    
    @Published private(set) var isProcessing = false
    @Published private(set) var error: Error?
    
    // MARK: - Legacy Properties (for backward compatibility)
    
    /// Alias for error - maintains backward compatibility
    var errorMessage: String? { error?.localizedDescription }
    
    // MARK: - Dependencies
    
    private let repository = CancellationRepository()
    private let db = Firestore.firestore()
    
    // MARK: - Public API
    
    /// Cancel a lesson booking
    func cancelLesson(bookingId: String) async throws {
        isProcessing = true
        error = nil
        defer { isProcessing = false }
        
        guard let user = Auth.auth().currentUser else {
            let authError = CancellationError.notAuthenticated
            self.error = authError
            throw authError
        }
        let uid = user.uid
        
        // Get booking details before canceling for activity log
        let bookingDoc = try await db.collection("bookings").document(bookingId).getDocument()
        let bookingData = bookingDoc.data()
        
        do {
            _ = try await repository.cancelLesson(bookingId: bookingId)
            
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
        } catch let cancelError {
            let wrappedError = CancellationError.cancellationFailed(cancelError.localizedDescription)
            self.error = wrappedError
            throw wrappedError
        }
    }
    
    /// Cancel a class registration
    func cancelClassRegistration(classId: String) async throws {
        isProcessing = true
        error = nil
        defer { isProcessing = false }
        
        do {
            _ = try await repository.callFunction(
                name: "cancelClassRegistration",
                data: ["classId": classId]
            )
        } catch {
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
