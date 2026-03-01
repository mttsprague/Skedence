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
        
        guard Auth.auth().currentUser?.uid != nil else {
            let authError = CancellationError.notAuthenticated
            self.error = authError
            throw authError
        }
        
        do {
            _ = try await repository.cancelLesson(bookingId: bookingId)
            
            // Activity logging now handled by cloud function
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
