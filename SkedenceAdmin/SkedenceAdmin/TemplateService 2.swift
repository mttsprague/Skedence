import Foundation
import FirebaseFirestore

struct TemplateService {
    static func applyTemplate(_ template: SportTemplate, to organizationId: String) async throws {
        let db = Firestore.firestore()
        let orgRef = db.collection("organizations").document(organizationId)
        
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
        
        print("✅ Applied \(template.name) template to organization \(organizationId)")
    }
    
    static func createDefaultAvailability(for organizationId: String, trainerId: String) async throws {
        let db = Firestore.firestore()
        let availabilityRef = db.collection("organizations").document(organizationId)
            .collection("availability")
        
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
        
        print("✅ Created default availability for trainer \(trainerId)")
    }
}
