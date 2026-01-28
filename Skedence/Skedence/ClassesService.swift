//
//  ClassesService.swift
//  Skedence
//
//  Created by Assistant on 12/31/25.
//

import Foundation
import Combine
import FirebaseAuth
import FirebaseFirestore
import FirebaseFunctions

@MainActor
final class ClassesService: ObservableObject {
    @Published private(set) var classes: [GroupClass] = []
    @Published private(set) var upcomingClasses: [GroupClass] = []
    @Published private(set) var myRegisteredClasses: [GroupClass] = []
    @Published private(set) var isLoading = false
    @Published private(set) var errorMessage: String?
    @Published var registrationChangeToken = UUID() // Triggers UI refresh after registration
    
    private let db = Firestore.firestore()
    private let functions = Functions.functions()
    
    // Load all open classes for registration
    func loadOpenClasses(orgId: String) async {
        isLoading = true
        errorMessage = nil
        
        do {
            let now = Timestamp(date: Date())
            let snapshot = try await db.collection("classes")
                .whereField("orgId", isEqualTo: orgId)
                .whereField("startTime", isGreaterThan: now)
                .whereField("isOpenForRegistration", isEqualTo: true)
                .order(by: "startTime")
                .getDocuments()
            
            classes = snapshot.documents.compactMap { doc in
                decodeClass(id: doc.documentID, data: doc.data())
            }
        } catch {
            errorMessage = error.localizedDescription
            classes = []
        }
        
        isLoading = false
    }
    
    // Load next 3 upcoming classes
    func loadUpcomingClasses(orgId: String) async {
        do {
            let now = Timestamp(date: Date())
            let snapshot = try await db.collection("classes")
                .whereField("orgId", isEqualTo: orgId)
                .whereField("startTime", isGreaterThan: now)
                .whereField("isOpenForRegistration", isEqualTo: true)
                .order(by: "startTime")
                .limit(to: 3)
                .getDocuments()
            
            upcomingClasses = snapshot.documents.compactMap { doc in
                decodeClass(id: doc.documentID, data: doc.data())
            }
        } catch {
            print("Error loading upcoming classes: \(error)")
            upcomingClasses = []
        }
    }
    
    // Load all classes for admin (no filters)
    func loadAllClasses(orgId: String) async {
        isLoading = true
        errorMessage = nil
        
        do {
            let snapshot = try await db.collection("classes")
                .whereField("orgId", isEqualTo: orgId)
                .order(by: "startTime", descending: true)
                .getDocuments()
            
            classes = snapshot.documents.compactMap { doc in
                decodeClass(id: doc.documentID, data: doc.data())
            }
        } catch {
            errorMessage = error.localizedDescription
            classes = []
        }
        
        isLoading = false
    }
    
    // Register for a class using a class pass (calls backend function)
    func registerForClassWithPass(classId: String, classPassPackageId: String, orgId: String) async throws {
        let data: [String: Any] = [
            "classId": classId,
            "classPassPackageId": classPassPackageId
        ]
        
        let result = try await functions.httpsCallable("registerForClass").call(data)
        
        if let message = (result.data as? [String: Any])?["message"] as? String {
            print("✅ Registration success: \(message)")
        }
        
        // Trigger UI refresh
        registrationChangeToken = UUID()
        print("🔄 Triggered registrationChangeToken update")
        
        // Reload registered classes
        print("🔄 Reloading myRegisteredClasses for orgId: \(orgId)")
        await loadMyRegisteredClasses(orgId: orgId)
        print("✅ myRegisteredClasses reloaded, count: \(myRegisteredClasses.count)")
    }
    
    // Register for a class (old direct method - deprecated)
    func registerForClass(classId: String, firstName: String, lastName: String) async throws {
        guard let uid = Auth.auth().currentUser?.uid else {
            throw NSError(domain: "ClassesService", code: -1, 
                         userInfo: [NSLocalizedDescriptionKey: "Not signed in"])
        }
        
        let classRef = db.collection("classes").document(classId)
        
        _ = try await db.runTransaction { transaction, errorPointer in
            let classDoc: DocumentSnapshot
            do {
                try classDoc = transaction.getDocument(classRef)
            } catch let fetchError as NSError {
                errorPointer?.pointee = fetchError
                return nil
            }
            
            guard let data = classDoc.data(),
                  let currentParticipants = data["currentParticipants"] as? Int,
                  let maxParticipants = data["maxParticipants"] as? Int else {
                let error = NSError(domain: "ClassesService", code: -1,
                                   userInfo: [NSLocalizedDescriptionKey: "Invalid class data"])
                errorPointer?.pointee = error
                return nil
            }
            
            if currentParticipants >= maxParticipants {
                let error = NSError(domain: "ClassesService", code: -1,
                                   userInfo: [NSLocalizedDescriptionKey: "Class is full"])
                errorPointer?.pointee = error
                return nil
            }
            
            // Increment participants
            transaction.updateData(["currentParticipants": currentParticipants + 1], forDocument: classRef)
            
            // Add user to participants subcollection with their name
            let participantRef = classRef.collection("participants").document(uid)
            transaction.setData([
                "userId": uid,
                "firstName": firstName,
                "lastName": lastName,
                "registeredAt": Timestamp(date: Date())
            ], forDocument: participantRef)
            
            return nil
        }
    }
    
    // Check if user is registered for a class
    func isRegistered(for classId: String) async -> Bool {
        guard let uid = Auth.auth().currentUser?.uid else { return false }
        
        do {
            let doc = try await db.collection("classes")
                .document(classId)
                .collection("participants")
                .document(uid)
                .getDocument()
            
            return doc.exists
        } catch {
            return false
        }
    }
    
    // Load only classes the current user is registered for
    func loadMyRegisteredClasses(orgId: String) async {
        guard let uid = Auth.auth().currentUser?.uid else {
            myRegisteredClasses = []
            return
        }
        
        do {
            let now = Timestamp(date: Date())
            print("📚 loadMyRegisteredClasses: uid=\(uid), orgId=\(orgId), now=\(now.dateValue())")
            
            // Get all upcoming classes first
            let classesSnapshot = try await db.collection("classes")
                .whereField("orgId", isEqualTo: orgId)
                .whereField("startTime", isGreaterThan: now)
                .order(by: "startTime")
                .getDocuments()
            
            print("📚 loadMyRegisteredClasses: Found \(classesSnapshot.documents.count) upcoming classes for orgId")
            
            var registeredClasses: [GroupClass] = []
            
            // For each class, check if user is registered
            for doc in classesSnapshot.documents {
                let classData = doc.data()
                print("📚 Checking class '\(classData["title"] ?? "unknown")' (id: \(doc.documentID))")
                
                let participantDoc = try await db.collection("classes")
                    .document(doc.documentID)
                    .collection("participants")
                    .document(uid)
                    .getDocument()
                
                print("📚 User registered for this class: \(participantDoc.exists)")
                
                if participantDoc.exists,
                   let groupClass = decodeClass(id: doc.documentID, data: doc.data()) {
                    print("📚 ✅ Adding class '\(groupClass.title)' to myRegisteredClasses")
                    registeredClasses.append(groupClass)
                }
            }
            
            myRegisteredClasses = registeredClasses.sorted { $0.startTime < $1.startTime }
            print("📚 loadMyRegisteredClasses complete: myRegisteredClasses.count = \(myRegisteredClasses.count)")
        } catch {
            print("❌ Error loading registered classes: \(error)")
            myRegisteredClasses = []
        }
    }
    
    private func decodeClass(id: String, data: [String: Any]) -> GroupClass? {
        guard
            let title = data["title"] as? String,
            let description = data["description"] as? String,
            let startTime = (data["startTime"] as? Timestamp)?.dateValue(),
            let endTime = (data["endTime"] as? Timestamp)?.dateValue(),
            let maxParticipants = data["maxParticipants"] as? Int,
            let currentParticipants = data["currentParticipants"] as? Int,
            let location = data["location"] as? String,
            let isOpenForRegistration = data["isOpenForRegistration"] as? Bool,
            let trainerId = data["trainerId"] as? String,
            let trainerName = data["trainerName"] as? String,
            let createdBy = data["createdBy"] as? String,
            let createdAt = (data["createdAt"] as? Timestamp)?.dateValue()
        else {
            return nil
        }
        
        // Price defaults to 2000 cents ($20) for backward compatibility with existing classes
        let priceInCents = data["priceInCents"] as? Int ?? 2000
        
        return GroupClass(
            id: id,
            title: title,
            description: description,
            startTime: startTime,
            endTime: endTime,
            maxParticipants: maxParticipants,
            currentParticipants: currentParticipants,
            location: location,
            isOpenForRegistration: isOpenForRegistration,
            trainerId: trainerId,
            trainerName: trainerName,
            createdBy: createdBy,
            createdAt: createdAt,
            priceInCents: priceInCents
        )
    }
}
