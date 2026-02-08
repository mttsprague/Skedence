//
//  FunctionsService.swift
//  SkedenceAdmin
//
//  Created by Matthew Sprague on 10/12/25.
//

import Foundation

#if canImport(FirebaseFunctions)
import FirebaseFunctions
#endif
#if canImport(FirebaseAuth)
import FirebaseAuth
#endif

enum FunctionsServiceError: Error, LocalizedError {
    case notAvailable
    case unauthenticated
    case invalidResponse
    case server(code: Int, message: String)

    var errorDescription: String? {
        switch self {
        case .notAvailable: return "Firebase Functions is not available in this build."
        case .unauthenticated: return "Please sign in to continue."
        case .invalidResponse: return "Unexpected response from the server."
        case .server(_, let message): return message
        }
    }
}

struct BookLessonResult: Decodable {
    let message: String
    let bookingId: String?
}

struct ProcessAvailabilityResult: Decodable {
    let message: String
    let slotsAdded: Int?
}

struct AdminPaymentResult: Decodable {
    let clientSecret: String
    let publishableKey: String
    let paymentIntentId: String
}

final class FunctionsService {
    static let shared = FunctionsService()

    private init() {}

    // Change region if your functions are deployed elsewhere
    #if canImport(FirebaseFunctions)
    private lazy var functions = Functions.functions(region: "us-central1")
    #endif

    // MARK: - Calls

    func bookLesson(trainerId: String, slotId: String, lessonPackageId: String) async throws -> BookLessonResult {
        #if canImport(FirebaseFunctions)
        guard Auth.auth().currentUser != nil else { throw FunctionsServiceError.unauthenticated }

        let payload: [String: Any] = [
            "trainerId": trainerId,
            "slotId": slotId,
            "lessonPackageId": lessonPackageId
        ]

        do {
            let result = try await functions.httpsCallable("bookLesson").call(payload)
            guard let dict = result.data as? [String: Any],
                  let message = dict["message"] as? String else {
                throw FunctionsServiceError.invalidResponse
            }
            let bookingId = dict["bookingId"] as? String
            return BookLessonResult(message: message, bookingId: bookingId)
        } catch let error as NSError {
            if error.domain == FunctionsErrorDomain {
                let code = error.code
                let message = error.localizedDescription
                throw FunctionsServiceError.server(code: code, message: message)
            }
            throw error
        }
        #else
        throw FunctionsServiceError.notAvailable
        #endif
    }

    func processTrainerAvailability(
        trainerId: String? = nil,
        startDate: String? = nil,
        endDate: String? = nil,
        dailyStartHour: Int? = nil,
        dailyEndHour: Int? = nil,
        slotDurationMinutes: Int? = nil,
        daysOfWeek: [Int]? = nil,
        status: String = "open",
        location: String? = nil
    ) async throws -> ProcessAvailabilityResult {
        #if canImport(FirebaseFunctions)
        guard Auth.auth().currentUser != nil else { throw FunctionsServiceError.unauthenticated }

        // Compute timezoneOffsetMinutes with JavaScript semantics (minutes to add to LOCAL to get UTC, positive west of UTC).
        // Use the start date's local offset if provided, so DST is respected for the intended range.
        let tzMinutes: Int = {
            if let startDate {
                // Parse the local date-only string "yyyy-MM-dd" in the user's current timezone
                var comps = DateComponents()
                let parts = startDate.split(separator: "-").map(String.init)
                if parts.count == 3, let y = Int(parts[0]), let m = Int(parts[1]), let d = Int(parts[2]) {
                    comps.year = y; comps.month = m; comps.day = d
                    if let localMidnight = Calendar.current.date(from: comps) {
                        return -(TimeZone.current.secondsFromGMT(for: localMidnight) / 60)
                    }
                }
            }
            // Fallback: current offset
            return -(TimeZone.current.secondsFromGMT() / 60)
        }()

        var payload: [String: Any] = [
            "timezoneOffsetMinutes": tzMinutes,
            "status": status
        ]
        if let trainerId { payload["trainerId"] = trainerId }
        if let startDate { payload["startDate"] = startDate }
        if let endDate { payload["endDate"] = endDate }
        if let dailyStartHour { payload["dailyStartHour"] = dailyStartHour }
        if let dailyEndHour { payload["dailyEndHour"] = dailyEndHour }
        if let slotDurationMinutes { payload["slotDurationMinutes"] = slotDurationMinutes }
        if let daysOfWeek { payload["daysOfWeek"] = daysOfWeek }
        if let location { payload["location"] = location }

        do {
            let result = try await functions.httpsCallable("processTrainerAvailability").call(payload)
            guard let dict = result.data as? [String: Any],
                  let message = dict["message"] as? String else {
                throw FunctionsServiceError.invalidResponse
            }
            let slotsAdded = dict["slotsAdded"] as? Int
            return ProcessAvailabilityResult(message: message, slotsAdded: slotsAdded)
        } catch let error as NSError {
            if error.domain == FunctionsErrorDomain {
                let code = error.code
                let message = error.localizedDescription
                throw FunctionsServiceError.server(code: code, message: message)
            }
            throw error
        }
        #else
        throw FunctionsServiceError.notAvailable
        #endif
    }
    
    func adminProcessPayment(
        orgId: String,
        userId: String,
        amount: Int,
        description: String,
        saveCard: Bool
    ) async throws -> AdminPaymentResult {
        #if canImport(FirebaseFunctions)
        guard Auth.auth().currentUser != nil else { throw FunctionsServiceError.unauthenticated }
        
        let payload: [String: Any] = [
            "orgId": orgId,
            "userId": userId,
            "amount": amount,
            "description": description,
            "saveCard": saveCard
        ]
        
        do {
            let result = try await functions.httpsCallable("adminProcessPayment").call(payload)
            guard let dict = result.data as? [String: Any],
                  let clientSecret = dict["clientSecret"] as? String,
                  let publishableKey = dict["publishableKey"] as? String,
                  let paymentIntentId = dict["paymentIntentId"] as? String else {
                throw FunctionsServiceError.invalidResponse
            }
            return AdminPaymentResult(
                clientSecret: clientSecret,
                publishableKey: publishableKey,
                paymentIntentId: paymentIntentId
            )
        } catch let error as NSError {
            if error.domain == FunctionsErrorDomain {
                let code = error.code
                let message = error.localizedDescription
                throw FunctionsServiceError.server(code: code, message: message)
            }
            throw error
        }
        #else
        throw FunctionsServiceError.notAvailable
        #endif
    }
    
    func confirmAdminPayment(
        orgId: String,
        userId: String,
        paymentIntentId: String,
        saveCard: Bool
    ) async throws {
        #if canImport(FirebaseFunctions)
        guard Auth.auth().currentUser != nil else { throw FunctionsServiceError.unauthenticated }
        
        let payload: [String: Any] = [
            "orgId": orgId,
            "userId": userId,
            "paymentIntentId": paymentIntentId,
            "saveCard": saveCard
        ]
        
        do {
            _ = try await functions.httpsCallable("confirmAdminPayment").call(payload)
        } catch let error as NSError {
            if error.domain == FunctionsErrorDomain {
                let code = error.code
                let message = error.localizedDescription
                throw FunctionsServiceError.server(code: code, message: message)
            }
            throw error
        }
        #else
        throw FunctionsServiceError.notAvailable
        #endif
    }
    
    func adminChargeWithSavedCard(
        orgId: String,
        userId: String,
        paymentMethodId: String,
        amount: Int,
        description: String
    ) async throws -> (paymentIntentId: String, status: String) {
        #if canImport(FirebaseFunctions)
        guard let currentUser = Auth.auth().currentUser else {
            throw FunctionsServiceError.unauthenticated
        }
        
        
        // Force token refresh to ensure we have a valid auth token
        try await forceRefreshIDToken(for: currentUser)
        
        // Get and log the token for debugging
        if let _ = try? await currentUser.getIDToken() {
        }
        
        // Use the default Functions instance (uses default Firebase app with Auth)
        
        let payload: [String: Any] = [
            "orgId": orgId,
            "userId": userId,
            "paymentMethodId": paymentMethodId,
            "amount": amount,
            "description": description
        ]
        
        
        do {
            let result = try await functions.httpsCallable("adminChargeWithSavedCard").call(payload)
            
            guard let dict = result.data as? [String: Any],
                  let paymentIntentId = dict["paymentIntentId"] as? String,
                  let status = dict["status"] as? String else {
                throw FunctionsServiceError.invalidResponse
            }
            
            return (paymentIntentId, status)
        } catch let error as NSError {
            
            if error.domain == FunctionsErrorDomain {
                let code = error.code
                let message = error.localizedDescription
                throw FunctionsServiceError.server(code: code, message: message)
            }
            throw error
        }
        #else
        throw FunctionsServiceError.notAvailable
        #endif
    }
    
    func adminCancelLesson(
        bookingId: String,
        orgId: String,
        clientId: String,
        refundPass: Bool = true // Default to true for backward compatibility
    ) async throws {
        #if canImport(FirebaseFunctions)
        guard Auth.auth().currentUser != nil else {
            throw FunctionsServiceError.unauthenticated
        }
        
        let payload: [String: Any] = [
            "bookingId": bookingId,
            "orgId": orgId,
            "clientId": clientId,
            "refundPass": refundPass
        ]
        
        print("📤 Calling adminCancelLesson with payload: \(payload)")
        
        do {
            let result = try await functions.httpsCallable("adminCancelLesson").call(payload)
            print("✅ adminCancelLesson success: \(result.data)")
        } catch let error as NSError {
            print("❌ adminCancelLesson error caught:")
            print("   Domain: \(error.domain)")
            print("   Code: \(error.code)")
            print("   LocalizedDescription: \(error.localizedDescription)")
            print("   UserInfo: \(error.userInfo)")
            
            if error.domain == FunctionsErrorDomain {
                let code = error.code
                // Try to extract the actual error message from various possible locations
                var message = error.localizedDescription
                
                if let details = error.userInfo["details"] as? String {
                    message = details
                } else if let nsError = error.userInfo[NSUnderlyingErrorKey] as? NSError {
                    message = nsError.localizedDescription
                } else if let errorInfo = error.userInfo["error"] as? [String: Any],
                          let errorMessage = errorInfo["message"] as? String {
                    message = errorMessage
                }
                
                print("   Throwing server error with message: \(message)")
                throw FunctionsServiceError.server(code: code, message: message)
            }
            throw error
        }
        #else
        throw FunctionsServiceError.notAvailable
        #endif
    }
    
    #if canImport(FirebaseAuth)
    // Bridge the completion-handler API to async/await
    private func forceRefreshIDToken(for user: User) async throws {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            user.getIDTokenForcingRefresh(true) { _, error in
                if let error {
                    continuation.resume(throwing: error)
                } else {
                    continuation.resume()
                }
            }
        }
    }
    #endif
}
