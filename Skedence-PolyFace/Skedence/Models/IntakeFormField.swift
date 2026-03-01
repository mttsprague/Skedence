//
//  IntakeFormField.swift
//  Skedence
//
//  Created by GitHub Copilot
//

import Foundation
import Combine
import FirebaseFirestore

struct IntakeFormField: Codable, Identifiable {
    let id: String
    let label: String
    let fieldType: FieldType
    let required: Bool
    let placeholder: String?
    let options: [String]?
    let order: Int
    let section: Section
    
    enum FieldType: String, Codable {
        case text
        case email
        case phone
        case date
        case textarea
        case select
        case number
    }
    
    enum Section: String, Codable {
        case athlete
        case parent
        case emergency
        case other
    }
    
    var displayName: String {
        label
    }
}

// Service to load intake form fields from Firebase
class IntakeFormService: ObservableObject {
    @Published var fields: [IntakeFormField] = []
    @Published var privateFields: [IntakeFormField] = []
    @Published var classFields: [IntakeFormField] = []
    @Published var isLoading = false
    
    private let db = Firestore.firestore()
    
    // Default fields if none configured
    static let defaultFields: [IntakeFormField] = [
        IntakeFormField(id: "athleteFullName", label: "Athlete Full Name", fieldType: .text, required: true, placeholder: nil, options: nil, order: 0, section: .athlete),
        IntakeFormField(id: "athleteBirthday", label: "Athlete Birthday", fieldType: .date, required: true, placeholder: nil, options: nil, order: 1, section: .athlete),
        IntakeFormField(id: "schoolTeam", label: "School / Club Team", fieldType: .text, required: false, placeholder: nil, options: nil, order: 2, section: .athlete),
        IntakeFormField(id: "experienceLevel", label: "Experience Level", fieldType: .select, required: false, placeholder: nil, options: ["Beginner", "Intermediate", "Advanced", "Elite"], order: 3, section: .athlete),
        IntakeFormField(id: "parentFullName", label: "Parent / Guardian Full Name", fieldType: .text, required: true, placeholder: nil, options: nil, order: 4, section: .parent),
        IntakeFormField(id: "emergencyContactName", label: "Emergency Contact Name", fieldType: .text, required: true, placeholder: nil, options: nil, order: 5, section: .emergency),
        IntakeFormField(id: "emergencyContactNumber", label: "Emergency Contact Number", fieldType: .phone, required: true, placeholder: nil, options: nil, order: 6, section: .emergency),
        IntakeFormField(id: "coachNotes", label: "Notes for Coach (Goals, Injuries, Allergies, etc.)", fieldType: .textarea, required: false, placeholder: nil, options: nil, order: 7, section: .other),
        IntakeFormField(id: "referredBy", label: "Referred by?", fieldType: .text, required: false, placeholder: nil, options: nil, order: 8, section: .other),
    ]
    
    func loadFields(orgId: String, type: String = "private") async {
        await MainActor.run { isLoading = true }
        
        do {
            let doc = try await db.collection("organizations").document(orgId).getDocument()
            
            if let data = doc.data() {
                let fieldName = type == "class" ? "intakeFormFieldsClass" : "intakeFormFieldsPrivate"
                
                if let fieldsData = data[fieldName] as? [[String: Any]] {
                    let loadedFields = decodeFields(from: fieldsData)
                    await MainActor.run {
                        if type == "class" {
                            self.classFields = loadedFields
                        } else {
                            self.privateFields = loadedFields
                        }
                        self.fields = loadedFields
                        self.isLoading = false
                    }
                } else if let legacyFields = data["intakeFormFields"] as? [[String: Any]] {
                    // Migrate from old single field list
                    let loadedFields = decodeFields(from: legacyFields)
                    await MainActor.run {
                        if type == "class" {
                            self.classFields = loadedFields
                        } else {
                            self.privateFields = loadedFields
                        }
                        self.fields = loadedFields
                        self.isLoading = false
                    }
                } else {
                    // No custom fields, use defaults
                    await MainActor.run {
                        if type == "class" {
                            self.classFields = IntakeFormService.defaultFields
                        } else {
                            self.privateFields = IntakeFormService.defaultFields
                        }
                        self.fields = IntakeFormService.defaultFields
                        self.isLoading = false
                    }
                }
            } else {
                await MainActor.run {
                    if type == "class" {
                        self.classFields = IntakeFormService.defaultFields
                    } else {
                        self.privateFields = IntakeFormService.defaultFields
                    }
                    self.fields = IntakeFormService.defaultFields
                    self.isLoading = false
                }
            }
        } catch {
            await MainActor.run {
                if type == "class" {
                    self.classFields = IntakeFormService.defaultFields
                } else {
                    self.privateFields = IntakeFormService.defaultFields
                }
                self.fields = IntakeFormService.defaultFields
                self.isLoading = false
            }
        }
    }
    
    private func decodeFields(from fieldsData: [[String: Any]]) -> [IntakeFormField] {
        let decoder = JSONDecoder()
        var loadedFields: [IntakeFormField] = []
        
        for fieldData in fieldsData {
            if let jsonData = try? JSONSerialization.data(withJSONObject: fieldData),
               let field = try? decoder.decode(IntakeFormField.self, from: jsonData) {
                loadedFields.append(field)
            }
        }
        
        return loadedFields.sorted { $0.order < $1.order }
    }
}

// Dynamic form data storage
class IntakeFormData: ObservableObject {
    @Published var fieldValues: [String: Any] = [:]
    var onUpdate: (() -> Void)?
    
    func setValue(_ value: Any, forField fieldId: String) {
        fieldValues[fieldId] = value
        objectWillChange.send()
        onUpdate?()
    }
    
    func getValue(forField fieldId: String) -> Any? {
        return fieldValues[fieldId]
    }
    
    func getStringValue(forField fieldId: String) -> String {
        if let value = fieldValues[fieldId] as? String {
            return value
        }
        return ""
    }
    
    func getDateValue(forField fieldId: String) -> Date? {
        if let value = fieldValues[fieldId] as? Date {
            return value
        }
        return nil
    }
    
    func isFieldComplete(_ field: IntakeFormField) -> Bool {
        guard field.required else { return true }
        
        if let value = fieldValues[field.id] {
            if let stringValue = value as? String {
                return !stringValue.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            }
            if value is Date {
                return true
            }
            return true
        }
        return false
    }
    
    func areAllRequiredFieldsComplete(_ fields: [IntakeFormField]) -> Bool {
        return fields.allSatisfy { isFieldComplete($0) }
    }
    
    // Pre-populate from existing user profile
    func populateFromUserProfile(_ profile: UserProfile) {
        // Parent/Guardian info
        if let firstName = profile.firstName, let lastName = profile.lastName {
            fieldValues["parentFullName"] = "\(firstName) \(lastName)"
        }
        
        // Emergency contact
        if let emergencyName = profile.emergencyContactName {
            fieldValues["emergencyContactName"] = emergencyName
        }
        if let emergencyPhone = profile.emergencyContactNumber {
            fieldValues["emergencyContactNumber"] = emergencyPhone
        }
        
        // Other fields
        if let referral = profile.referredBy {
            fieldValues["referredBy"] = referral
        }
        if let notes = profile.notesForCoach {
            fieldValues["coachNotes"] = notes
        }
    }
    
    // Populate from athlete data
    func populateFromAthlete(_ athlete: AthleteInfo) {
        if let firstName = athlete.firstName, let lastName = athlete.lastName {
            fieldValues["athleteFullName"] = "\(firstName) \(lastName)"
        }
        if let birthday = athlete.birthday {
            // Convert string to date - try multiple formats
            let formatter = DateFormatter()
            var date: Date?
            
            // Try yyyy-MM-dd format first
            formatter.dateFormat = "yyyy-MM-dd"
            date = formatter.date(from: birthday)
            
            // If that fails, try MM/dd/yyyy format
            if date == nil {
                formatter.dateFormat = "MM/dd/yyyy"
                date = formatter.date(from: birthday)
            }
            
            if let parsedDate = date {
                fieldValues["athleteBirthday"] = parsedDate
            }
        }
        if let school = athlete.schoolClubTeam {
            fieldValues["schoolTeam"] = school
        }
        if let experience = athlete.experienceLevel {
            fieldValues["experienceLevel"] = experience
        }
    }
}
