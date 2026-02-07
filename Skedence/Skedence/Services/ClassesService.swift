//
//  ClassesService.swift
//  Skedence
//
//  Phase 2.2: Refactored to follow ServiceProtocol standard
//

import Foundation
import Combine
import FirebaseAuth
import FirebaseFirestore
import FirebaseFunctions

@MainActor
final class ClassesService: ObservableObject {
    // MARK: - Published State (ServiceProtocol pattern)
    
    @Published private(set) var items: [GroupClass] = [] // Default to open classes
    @Published private(set) var isLoading = false
    @Published private(set) var error: Error?
    
    // MARK: - Additional Published State (domain-specific)
    
    @Published private(set) var upcomingClasses: [GroupClass] = []
    @Published private(set) var myRegisteredClasses: [GroupClass] = []
    @Published var registrationChangeToken = UUID() // Triggers UI refresh after registration
    
    // MARK: - Legacy Properties (for backward compatibility)
    
    /// Alias for items - maintains backward compatibility
    var classes: [GroupClass] { items }
    
    /// Alias for error - maintains backward compatibility
    var errorMessage: String? { error?.localizedDescription }
    
    // MARK: - Dependencies
    
    private let repository: ClassesRepository
    private let functions = Functions.functions()
    private let db = Firestore.firestore()  // Keep for legacy methods
    private var currentOrgId: String?
    
    init(repository: ClassesRepository = ClassesRepository()) {
        self.repository = repository
    }
    
    // MARK: - Public API
    
    /// Fetch open classes for the current organization
    func fetch() async throws {
        guard let orgId = currentOrgId else {
            throw ServiceError.invalidData("Organization ID not set")
        }
        try await loadOpenClassesInternal(orgId: orgId)
    }
    
    /// Refresh open classes without throwing
    func refresh() async {
        try? await fetch()
    }
    
    /// Load all open classes for registration (maintains backward compatibility)
    func loadOpenClasses(orgId: String) async {
        do {
            try await loadOpenClassesInternal(orgId: orgId)
        } catch {
            // Error already set in internal method
        }
    }
    
    // MARK: - Internal Implementation
    
    private func loadOpenClassesInternal(orgId: String) async throws {
        isLoading = true
        error = nil
        currentOrgId = orgId
        
        defer { isLoading = false }
        
        do {
            let classes = try await repository.fetchOpenClasses(orgId: orgId)
            items = classes
        } catch {
            self.error = mapRepositoryError(error)
            items = []
            throw self.error!
        }
    }
    
    // MARK: - Domain-Specific Methods
    
    /// Load next 3 upcoming classes
    func loadUpcomingClasses(orgId: String) async {
        error = nil
        currentOrgId = orgId
        
        do {
            let classes = try await repository.fetchUpcomingClasses(orgId: orgId)
            upcomingClasses = Array(classes.prefix(3))
        } catch {
            self.error = mapRepositoryError(error)
            print("Error loading upcoming classes: \(error)")
            upcomingClasses = []
        }
    }
    
    /// Load all classes for admin (no filters)
    func loadAllClasses(orgId: String) async {
        isLoading = true
        error = nil
        currentOrgId = orgId
        
        defer { isLoading = false }
        
        do {
            let classes = try await repository.fetchAll(orgId: orgId)
            items = classes
        } catch {
            self.error = mapRepositoryError(error)
            items = []
        }
    }
    
    // Register for a class using a class pass (calls backend function)
    func registerForClassWithPass(classId: String, classPassPackageId: String, athleteName: String?, secondAthleteName: String?, orgId: String) async throws {
        var data: [String: Any] = [
            "classId": classId,
            "classPassPackageId": classPassPackageId
        ]
        
        // Add athlete names if provided
        if let athleteName = athleteName {
            data["athleteName"] = athleteName
        }
        if let secondAthleteName = secondAthleteName, secondAthleteName != "New Athlete" {
            data["secondAthleteName"] = secondAthleteName
        }
        
        _ = try await functions.httpsCallable("registerForClass").call(data)
        
        // Trigger UI refresh
        registrationChangeToken = UUID()
        
        // Reload registered classes
        await loadMyRegisteredClasses(orgId: orgId)
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
            // Query by userId field, not document ID
            let snapshot = try await db.collection("classes")
                .document(classId)
                .collection("participants")
                .whereField("userId", isEqualTo: uid)
                .limit(to: 1)
                .getDocuments()
            
            return !snapshot.documents.isEmpty
        } catch {
            return false
        }
    }
    
    /// Load only classes the current user is registered for
    func loadMyRegisteredClasses(orgId: String) async {
        guard let userId = Auth.auth().currentUser?.uid else {
            myRegisteredClasses = []
            print("⚠️ No user ID for loading registered classes")
            return
        }
        
        print("🔍 Loading registered classes for user: \(userId), org: \(orgId)")
        error = nil
        currentOrgId = orgId
        
        do {
            let registeredClasses = try await repository.fetchUserRegistrations(orgId: orgId)
            myRegisteredClasses = registeredClasses
            print("✅ Loaded \(registeredClasses.count) registered classes")
            for cls in registeredClasses {
                print("  - \(cls.title) at \(cls.startTime)")
            }
        } catch {
            self.error = mapRepositoryError(error)
            myRegisteredClasses = []
            print("❌ Error loading registered classes: \(error.localizedDescription)")
        }
    }
    
    // MARK: - Helpers
    
    /// Map RepositoryError to ServiceError
    private func mapRepositoryError(_ error: Error) -> ServiceError {
        if let repoError = error as? RepositoryError {
            switch repoError {
            case .notFound:
                return ServiceError.notFound
            case .unauthorized:
                return ServiceError.notAuthenticated
            case .invalidData(let message):
                return ServiceError.invalidData(message)
            default:
                return ServiceError.networkError(error)
            }
        }
        return ServiceError.networkError(error)
    }
}
