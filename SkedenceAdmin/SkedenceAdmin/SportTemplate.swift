import Foundation

struct SportTemplate: Identifiable {
    let id: String
    let name: String
    let icon: String
    let description: String
    let packageTemplates: [PackageTemplate]
    let defaultCancellationHours: Int
    let reminderSchedule: [Int] // hours before
    
    static let templates: [SportTemplate] = [
        SportTemplate(
            id: "volleyball",
            name: "Volleyball",
            icon: "🏐",
            description: "Perfect for volleyball academies, camps, and private training",
            packageTemplates: [
                PackageTemplate(name: "Private Training", duration: 60, price: 75, sessionsPerPackage: 1),
                PackageTemplate(name: "4-Pack Private", duration: 60, price: 280, sessionsPerPackage: 4),
                PackageTemplate(name: "Semi-Private (2-3 players)", duration: 60, price: 50, sessionsPerPackage: 1),
                PackageTemplate(name: "Group Training (4-8 players)", duration: 90, price: 35, sessionsPerPackage: 1),
                PackageTemplate(name: "Skills Clinic", duration: 120, price: 40, sessionsPerPackage: 1)
            ],
            defaultCancellationHours: 24,
            reminderSchedule: [24, 2]
        ),
        
        SportTemplate(
            id: "basketball",
            name: "Basketball",
            icon: "🏀",
            description: "Ideal for basketball training, skills development, and coaching",
            packageTemplates: [
                PackageTemplate(name: "Private Training", duration: 60, price: 80, sessionsPerPackage: 1),
                PackageTemplate(name: "5-Pack Private", duration: 60, price: 375, sessionsPerPackage: 5),
                PackageTemplate(name: "Partner Training", duration: 60, price: 50, sessionsPerPackage: 1),
                PackageTemplate(name: "Small Group (3-5 players)", duration: 75, price: 40, sessionsPerPackage: 1),
                PackageTemplate(name: "Shooting Clinic", duration: 90, price: 45, sessionsPerPackage: 1)
            ],
            defaultCancellationHours: 24,
            reminderSchedule: [24, 2]
        ),
        
        SportTemplate(
            id: "tennis",
            name: "Tennis",
            icon: "🎾",
            description: "Great for tennis lessons, clinics, and coaching services",
            packageTemplates: [
                PackageTemplate(name: "Private Lesson", duration: 45, price: 70, sessionsPerPackage: 1),
                PackageTemplate(name: "6-Pack Private", duration: 45, price: 390, sessionsPerPackage: 6),
                PackageTemplate(name: "Semi-Private", duration: 45, price: 45, sessionsPerPackage: 1),
                PackageTemplate(name: "Group Clinic (4-6 players)", duration: 60, price: 35, sessionsPerPackage: 1),
                PackageTemplate(name: "Junior Development", duration: 90, price: 40, sessionsPerPackage: 1)
            ],
            defaultCancellationHours: 24,
            reminderSchedule: [48, 4]
        ),
        
        SportTemplate(
            id: "golf",
            name: "Golf",
            icon: "⛳️",
            description: "Designed for golf instruction, lessons, and coaching programs",
            packageTemplates: [
                PackageTemplate(name: "Private Lesson", duration: 60, price: 100, sessionsPerPackage: 1),
                PackageTemplate(name: "4-Pack Private", duration: 60, price: 375, sessionsPerPackage: 4),
                PackageTemplate(name: "Playing Lesson (9 holes)", duration: 120, price: 175, sessionsPerPackage: 1),
                PackageTemplate(name: "Junior Golf Program", duration: 45, price: 50, sessionsPerPackage: 1),
                PackageTemplate(name: "Group Clinic (4-6 players)", duration: 90, price: 60, sessionsPerPackage: 1)
            ],
            defaultCancellationHours: 48,
            reminderSchedule: [48, 4]
        )
    ]
}

struct PackageTemplate {
    let name: String
    let duration: Int // minutes
    let price: Double
    let sessionsPerPackage: Int
}
