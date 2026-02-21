//
//  ActivityLogger.swift
//  SkedenceAdmin
//
//  Created by AI Assistant on 2/3/26.
//

import Foundation
import FirebaseFirestore

struct ActivityLogger {
    private let db = Firestore.firestore()
    
    enum ActivityType: String {
        case trainerCreated = "trainer_created"
        case trainerActivated = "trainer_activated"
        case trainerDeactivated = "trainer_deactivated"
        case clientRegistered = "client_registered"
        case clientProfileUpdated = "client_profile_updated"
        case lessonBooked = "lesson_booked"
        case lessonCanceled = "lesson_canceled"
        case lessonCompleted = "lesson_completed"
        case lessonRescheduled = "lesson_rescheduled"
        case passPurchased = "pass_purchased"
        case passActivated = "pass_activated"
        case passExpired = "pass_expired"
        case availabilityOpened = "availability_opened"
        case availabilityClosed = "availability_closed"
        case availabilityUpdated = "availability_updated"
        case classCreated = "class_created"
        case classCanceled = "class_canceled"
        case classEnrollment = "class_enrollment"
        case locationCreated = "location_created"
        case locationUpdated = "location_updated"
        case locationDeleted = "location_deleted"
        case paymentReceived = "payment_received"
        case paymentRefunded = "payment_refunded"
        case scheduleUpdated = "schedule_updated"
    }
    
    enum ActorRole: String {
        case owner, admin, trainer, client, system
    }
    
    func log(
        type: ActivityType,
        actorId: String,
        actorName: String,
        actorRole: ActorRole,
        targetId: String? = nil,
        targetName: String? = nil,
        targetType: String? = nil,
        description: String,
        metadata: [String: Any]? = nil,
        orgId: String
    ) async throws {
        var activityData: [String: Any] = [
            "type": type.rawValue,
            "actorId": actorId,
            "actorName": actorName,
            "actorRole": actorRole.rawValue,
            "description": description,
            "orgId": orgId,
            "timestamp": Timestamp(date: Date()),
            "createdAt": Timestamp(date: Date())
        ]
        
        if let targetId = targetId {
            activityData["targetId"] = targetId
        }
        if let targetName = targetName {
            activityData["targetName"] = targetName
        }
        if let targetType = targetType {
            activityData["targetType"] = targetType
        }
        if let metadata = metadata {
            activityData["metadata"] = metadata
        }
        
        // Generate activity ID: {actorId}_{activityType}_{timestamp}
        let timestamp = Int(Date().timeIntervalSince1970)
        let activityId = "\(actorId)_\(type.rawValue)_\(timestamp)"
        
        try await db.collection("activities").document(activityId).setData(activityData)
    }
    
    // Helper function to format dates consistently
    static func formatDateTime(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
    
    static func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        return formatter.string(from: date)
    }
    
    static func formatTime(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}

// Global instance
extension ActivityLogger {
    static let shared = ActivityLogger()
}
