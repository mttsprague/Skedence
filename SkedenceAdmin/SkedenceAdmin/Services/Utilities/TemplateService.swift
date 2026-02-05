import Foundation
import FirebaseFirestore

enum TemplateServiceError: Error, LocalizedError {
    case missingOrgId
    case invalidTemplate
    case applyFailed(String)
    case availabilityFailed(String)
    
    var errorDescription: String? {
        switch self {
        case .missingOrgId:
            return "Organization ID is required"
        case .invalidTemplate:
            return "Invalid template configuration"
        case .applyFailed(let message):
            return "Failed to apply template: \(message)"
        case .availabilityFailed(let message):
            return "Failed to create availability: \(message)"
        }
    }
}

struct TemplateService {
    static func applyTemplate(_ template: SportTemplate, to organizationId: String) async throws {
        guard !organizationId.isEmpty else {
            throw TemplateServiceError.missingOrgId
        }
        
        let db = Firestore.firestore()
        let orgRef = db.collection("organizations").document(organizationId)
        
        do {
            // 1. Create packages from template
            for (index, packageTemplate) in template.packageTemplates.enumerated() {
                let packageData: [String: Any] = [
                    "name": packageTemplate.name,
                    "description": "Professional \(template.name.lowercased()) training",
                    "price": packageTemplate.price,
                    "sessionsPerPackage": packageTemplate.sessionsPerPackage,
                    "durationMinutes": packageTemplate.duration,
                    "isActive": true,
                    "createdAt": Timestamp(date: Date()),
                    "order": index
                ]
                
                try await orgRef.collection("packages").addDocument(data: packageData)
            }
            
            // 2. Set cancellation policy
            try await orgRef.updateData([
                "cancellationPolicy": [
                    "hours": template.defaultCancellationHours,
                    "description": "Cancellations must be made at least \(template.defaultCancellationHours) hours in advance"
                ]
            ])
            
            // 3. Set reminder schedule
            try await orgRef.updateData([
                "reminderSchedule": template.reminderSchedule.map { hours in
                    return [
                        "hours": hours,
                        "enabled": true
                    ]
                }
            ])
            
            // 4. Set template metadata
            try await orgRef.updateData([
                "template": template.id,
                "templateAppliedAt": Timestamp(date: Date())
            ])
        } catch {
            throw TemplateServiceError.applyFailed(error.localizedDescription)
        }
    }
    
    static func createDefaultAvailability(for organizationId: String, trainerId: String) async throws {
        guard !organizationId.isEmpty else {
            throw TemplateServiceError.missingOrgId
        }
        guard !trainerId.isEmpty else {
            throw TemplateServiceError.availabilityFailed("Trainer ID is required")
        }
        
        let db = Firestore.firestore()
        let availabilityRef = db.collection("organizations").document(organizationId)
            .collection("availability")
        
        do {
            // Create weekday availability (Monday-Friday, 9am-5pm)
            let weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
            
            for day in weekdays {
                let availabilityData: [String: Any] = [
                    "trainerId": trainerId,
                    "dayOfWeek": day,
                    "startTime": "09:00",
                    "endTime": "17:00",
                    "isActive": true,
                    "createdAt": Timestamp(date: Date())
                ]
                
                try await availabilityRef.addDocument(data: availabilityData)
            }
        } catch {
            throw TemplateServiceError.availabilityFailed(error.localizedDescription)
        }
    }
}
