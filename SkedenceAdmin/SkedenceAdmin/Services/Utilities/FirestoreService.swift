//
//  FirestoreService.swift
//  SkedenceAdmin
//
//  Created by Matthew Sprague on 10/12/25.
//

import Foundation

#if canImport(FirebaseCore)
import FirebaseCore
#endif

#if canImport(FirebaseFirestore)
import FirebaseFirestore
#endif

#if canImport(FirebaseFirestoreSwift)
import FirebaseFirestoreSwift
#endif

#if canImport(FirebaseAuth)
import FirebaseAuth
#endif

enum FirestoreServiceError: Error {
    case notAvailable
    case decoding
}

final class FirestoreService {
    static let shared = FirestoreService()
    private init() {}

    var db: Any? {
        #if canImport(FirebaseFirestore)
        return Firestore.firestore()
        #else
        return nil
        #endif
    }

    // MARK: - Schedule (fetch)
    func fetchTrainerSchedule(trainerId: String, from: Date, to: Date, orgId: String) async throws -> [TrainerScheduleSlot] {
        #if canImport(FirebaseFirestore)
        // Validate trainerId is not empty
        guard !trainerId.isEmpty else {
            return []
        }
        
        
        let db = Firestore.firestore()
        let startTs = Timestamp(date: from)
        let endTs = Timestamp(date: to)

        // DEBUG: Check if there are ANY schedules for this trainer
        let anySchedulesSnapshot = try? await db.collection("trainers")
            .document(trainerId)
            .collection("schedules")
            .limit(to: 5)
            .getDocuments()
        if anySchedulesSnapshot?.documents.first != nil {
        }

        var mergedById: [String: TrainerScheduleSlot] = [:]

        // --- 1) Fetch open/unavailable slots from trainer subcollection
        let trainerScheduleSnapshot = try await db.collection("trainers")
            .document(trainerId)
            .collection("schedules")
            .whereField("startTime", isGreaterThanOrEqualTo: startTs)
            .whereField("startTime", isLessThan: endTs)
            .order(by: "startTime")
            .getDocuments()

        
        let subcollectionSlots: [TrainerScheduleSlot] = trainerScheduleSnapshot.documents.compactMap { doc in
            let data = doc.data()

            // Required time fields
            guard
                let startTs = data["startTime"] as? Timestamp,
                let endTs = data["endTime"] as? Timestamp
            else {
                return nil
            }

            // Status: if missing, default to .open. If somehow .booked, we’ll exclude below.
            let status: TrainerScheduleSlot.Status = {
                if let raw = data["status"] as? String, let s = TrainerScheduleSlot.Status(rawValue: raw) {
                    return s
                }
                return .open
            }()

            // Read class booking fields if present
            let isClassBooking = data["isClassBooking"] as? Bool
            let classId = data["classId"] as? String

            return TrainerScheduleSlot(
                id: doc.documentID,
                trainerId: trainerId,
                status: status,
                startTime: startTs.dateValue(),
                endTime: endTs.dateValue(),
                clientId: data["clientId"] as? String,
                clientName: data["clientName"] as? String,
                bookedAt: (data["bookedAt"] as? Timestamp)?.dateValue(),
                updatedAt: (data["updatedAt"] as? Timestamp)?.dateValue(),
                isClassBooking: isClassBooking,
                classId: classId
            )
        }

        for slot in subcollectionSlots {
            mergedById[slot.id] = slot
        }

        
        // --- 2) Fetch booked slots from top-level bookings collection
        // Accept both "confirmed" and "booked" as booked states (new data uses "confirmed").
        let bookingsSnapshot = try await db.collection("bookings")
            .whereField("orgId", isEqualTo: orgId)
            .whereField("trainerId", isEqualTo: trainerId)
            .whereField("startTime", isGreaterThanOrEqualTo: startTs)
            .whereField("startTime", isLessThan: endTs)
            .order(by: "startTime")
            .getDocuments()

        // Collect class IDs to check registration status
        var classIdsToCheck = Set<String>()
        for doc in bookingsSnapshot.documents {
            let data = doc.data()
            if let isClassBooking = data["isClassBooking"] as? Bool,
               isClassBooking == true,
               let classId = data["classId"] as? String {
                classIdsToCheck.insert(classId)
            }
        }
        
        // Fetch all class documents to check isOpenForRegistration
        var openClassIds = Set<String>()
        for classId in classIdsToCheck {
            // Guard against empty classId
            guard !classId.isEmpty else {
                continue
            }
            
            do {
                let classDoc = try await db.collection("classes").document(classId).getDocument()
                if classDoc.exists,
                   let classData = classDoc.data(),
                   let isOpen = classData["isOpenForRegistration"] as? Bool,
                   isOpen == true {
                    openClassIds.insert(classId)
                }
            } catch {
                // If we can't fetch the class, skip it (treat as closed)
                continue
            }
        }
        
        let bookedSlots: [TrainerScheduleSlot] = bookingsSnapshot.documents.compactMap { doc in
            let data = doc.data()

            // Only include confirmed/booked bookings
            guard
                let bookedStatus = data["status"] as? String,
                bookedStatus == "confirmed" || bookedStatus == "booked",
                let startTs = data["startTime"] as? Timestamp,
                let endTs = data["endTime"] as? Timestamp
            else {
                return nil
            }
            
            // Filter out closed classes
            let isClassBooking = data["isClassBooking"] as? Bool
            let classId = data["classId"] as? String
            if isClassBooking == true, let classId = classId {
                // Only include if the class is open for registration
                guard openClassIds.contains(classId) else {
                    return nil
                }
            }

            // Prefer scheduleSlotId (often matches deterministic scheduleDocId), then slotId, then fallback to booking doc id
            let slotIdentifier =
                (data["scheduleSlotId"] as? String) ??
                (data["slotId"] as? String) ??
                doc.documentID

            let clientUID = data["clientUID"] as? String
            let clientName = data["clientName"] as? String

            return TrainerScheduleSlot(
                id: slotIdentifier,
                trainerId: trainerId,
                status: .booked,
                startTime: startTs.dateValue(),
                endTime: endTs.dateValue(),
                clientId: clientUID,
                clientName: clientName,
                bookedAt: (data["bookedAt"] as? Timestamp)?.dateValue(),
                updatedAt: (data["updatedAt"] as? Timestamp)?.dateValue(),
                isClassBooking: isClassBooking,
                classId: classId
            )
        }

        // Overwrite any open/unavailable slot with the booked one if ids collide.
        for slot in bookedSlots {
            mergedById[slot.id] = slot
        }

        // Return merged list; sorting by startTime for stable presentation
        let combined = Array(mergedById.values).sorted { $0.startTime < $1.startTime }
        return combined
        #else
        // No Firestore in this build; return empty to keep app usable
        return []
        #endif
    }

    // MARK: - Schedule (write APIs)
    // Deterministic document ID per trainer per startTime (UTC, hour resolution)
    private func scheduleDocId(for start: Date) -> String {
        let calendar = Calendar(identifier: .gregorian)
        let utcTimezone = TimeZone(secondsFromGMT: 0)!
        var utcCalendar = calendar
        utcCalendar.timeZone = utcTimezone
        
        let comps = utcCalendar.dateComponents([.year, .month, .day, .hour], from: start)
        let y = comps.year ?? 1970
        let m = comps.month ?? 1
        let d = comps.day ?? 1
        let h = comps.hour ?? 0
        // e.g., 2025-10-13T06
        return String(format: "%04d-%02d-%02dT%02d", y, m, d, h)
    }

    func upsertTrainerSlot(trainerId: String, orgId: String, startTime: Date, endTime: Date, status: TrainerScheduleSlot.Status, location: String? = nil) async throws {
        #if canImport(FirebaseFirestore)
        let db = Firestore.firestore()
        let docId = scheduleDocId(for: startTime)
        let ref = db.collection("trainers").document(trainerId).collection("schedules").document(docId)

        var data: [String: Any] = [
            "startTime": Timestamp(date: startTime),
            "endTime": Timestamp(date: endTime),
            "status": status.rawValue,
            "orgId": orgId,
            "updatedAt": FieldValue.serverTimestamp()
        ]
        
        // Add location if provided
        if let location = location {
            data["location"] = location
        }
        
        try await ref.setData(data, merge: true)
        #else
        throw FirestoreServiceError.notAvailable
        #endif
    }

    func deleteTrainerSlot(trainerId: String, startTime: Date) async throws {
        #if canImport(FirebaseFirestore)
        let db = Firestore.firestore()
        let docId = scheduleDocId(for: startTime)
        let ref = db.collection("trainers").document(trainerId).collection("schedules").document(docId)
        try await ref.delete()
        #else
        throw FirestoreServiceError.notAvailable
        #endif
    }

    // MARK: - Trainers (list)
    func fetchAllTrainers(orgId: String) async throws -> [Trainer] {
        #if canImport(FirebaseFirestore)
        let db = Firestore.firestore()
        let snapshot = try await db.collection("trainers")
            .whereField("orgId", isEqualTo: orgId)
            .getDocuments()
        let trainers: [Trainer] = snapshot.documents.compactMap { doc in
            let data = doc.data()
            // Try firstName/lastName first, fall back to name field
            let firstName = data["firstName"] as? String
            let lastName = data["lastName"] as? String
            let name: String
            if let first = firstName, let last = lastName {
                name = "\(first) \(last)".trimmingCharacters(in: .whitespaces)
            } else if let first = firstName {
                name = first
            } else if let last = lastName {
                name = last
            } else {
                name = (data["name"] as? String) ?? "Unknown"
            }
            
            let email = (data["email"] as? String) ?? ""
            let avatarUrl = data["avatarUrl"] as? String
            let photoURL = data["photoURL"] as? String
            let imageUrl = data["imageUrl"] as? String
            let active = (data["active"] as? Bool) ?? true
            return Trainer(
                id: doc.documentID,
                firstName: firstName,
                lastName: lastName,
                email: email,
                avatarUrl: avatarUrl,
                photoURL: photoURL,
                imageUrl: imageUrl,
                orgId: orgId,
                active: active,
                admin: false,
                name: name
            )
        }
        return trainers
        #else
        // No Firestore in this build; provide a small placeholder list
        return [
            Trainer(
                id: "trainer_demo",
                firstName: "Demo",
                lastName: "Trainer",
                email: "demo@example.com",
                avatarUrl: nil,
                photoURL: nil,
                imageUrl: nil,
                orgId: nil,
                active: true,
                admin: false,
                name: "Demo Trainer"
            )
        ]
        #endif
    }
    
    func fetchTrainer(by id: String) async throws -> Trainer? {
        guard !id.isEmpty else {
            return nil
        }
        
        #if canImport(FirebaseFirestore)
        let db = Firestore.firestore()
        let doc = try await db.collection("trainers").document(id).getDocument()
        guard let data = doc.data() else { return nil }
        
        let firstName = data["firstName"] as? String
        let lastName = data["lastName"] as? String
        let name = (data["name"] as? String) ?? "Unknown"
        let email = (data["email"] as? String) ?? ""
        let avatarUrl = data["avatarUrl"] as? String
        let photoURL = data["photoURL"] as? String
        let imageUrl = data["imageUrl"] as? String
        let orgId = data["orgId"] as? String
        let active = (data["active"] as? Bool) ?? true
        
        return Trainer(
            id: doc.documentID,
            firstName: firstName,
            lastName: lastName,
            email: email,
            avatarUrl: avatarUrl,
            photoURL: photoURL,
            imageUrl: imageUrl,
            orgId: orgId,
            active: active,
            admin: false,
            name: name
        )
        #else
        return Trainer(
            id: "trainer_demo",
            firstName: "Demo",
            lastName: "Trainer",
            email: "demo@example.com",
            avatarUrl: nil,
            photoURL: nil,
            imageUrl: nil,
            orgId: nil,
            active: true,
            admin: false,
            name: "Demo Trainer"
        )
        #endif
    }

    // MARK: - Users (profiles) compliant with rules
    func createOrUpdateUserProfile(uid: String, firstName: String, lastName: String, emailAddress: String, phoneNumber: String? = nil, photoURL: String? = nil, active: Bool = true) async throws {
        guard !uid.isEmpty else {
            throw FirestoreServiceError.notAvailable
        }
        
        #if canImport(FirebaseFirestore)
        let ref = Firestore.firestore().collection("users").document(uid)

        let now = FieldValue.serverTimestamp()
        // Only allowed keys per rules
        var data: [String: Any] = [
            "emailAddress": emailAddress,
            "firstName": firstName,
            "lastName": lastName,
            "phoneNumber": phoneNumber ?? "",
            "photoURL": photoURL ?? "",
            "active": active,
            "updatedAt": now
        ]

        // If doc does not exist, also set createdAt
        let snap = try await ref.getDocument()
        if !snap.exists {
            data["createdAt"] = now
        }

        try await ref.setData(data, merge: true)
        #else
        throw FirestoreServiceError.notAvailable
        #endif
    }

    // MARK: - Trainers (owner-writable)
    func createOrUpdateTrainerProfile(trainerId: String, firstName: String, lastName: String, email: String, avatarUrl: String? = nil, photoURL: String? = nil, imageUrl: String? = nil, active: Bool = true) async throws {
        guard !trainerId.isEmpty else {
            throw FirestoreServiceError.notAvailable
        }
        
        #if canImport(FirebaseFirestore)
        let ref = Firestore.firestore().collection("trainers").document(trainerId)
        var data: [String: Any] = [
            "firstName": firstName,
            "lastName": lastName,
            "email": email,
            "active": active
        ]
        if let avatarUrl { data["avatarUrl"] = avatarUrl }
        if let photoURL { data["photoURL"] = photoURL }
        if let imageUrl { data["imageUrl"] = imageUrl }

        try await ref.setData(data, merge: true)
        #else
        throw FirestoreServiceError.notAvailable
        #endif
    }

    // MARK: - Clients (from top-level users collection)
    func fetchTrainerClients(trainerId: String, orgId: String) async throws -> [Client] {
        #if canImport(FirebaseFirestore)
        let db = Firestore.firestore()
        let query: Query = db.collection("users")
            .whereField("orgId", isEqualTo: orgId)

        // NOTE: If your user docs may not have `active`, this filter will exclude them.
        // Remove or re-enable once data is normalized.
        // query = query.whereField("active", isEqualTo: true)

        // If you add a linkage field (e.g., "trainerId"), you can enable this filter:
        // query = query.whereField("trainerId", isEqualTo: trainerId)

        let snapshot = try await query.getDocuments()
        
        // Fetch all trainer/admin/owner IDs in this org to exclude them from clients list
        let trainersSnapshot = try await db.collection("trainers")
            .whereField("orgId", isEqualTo: orgId)
            .getDocuments()
        let trainerIds = Set(trainersSnapshot.documents.map { $0.documentID })
        
        // Also check orgMembers for staff roles (trainer, admin, owner)
        let orgMembersSnapshot = try await db.collection("orgMembers")
            .whereField("orgId", isEqualTo: orgId)
            .getDocuments()
        let staffUserIds = Set(orgMembersSnapshot.documents.compactMap { doc -> String? in
            let role = doc.data()["role"] as? String ?? "client"
            // Exclude trainers, admins, and owners from clients list
            if role == "trainer" || role == "admin" || role == "owner" {
                return doc.data()["userId"] as? String
            }
            return nil
        })
        
        let clients: [Client] = snapshot.documents.compactMap { doc in
            // Skip if this user is a trainer (in trainers collection)
            if trainerIds.contains(doc.documentID) {
                return nil
            }
            
            // Skip if this user has a staff role (trainer/admin/owner) in orgMembers
            if staffUserIds.contains(doc.documentID) {
                return nil
            }
            
            let data = doc.data()
            guard
                let firstName = data["firstName"] as? String,
                let lastName = data["lastName"] as? String,
                let emailAddress = data["emailAddress"] as? String
            else {
                return nil
            }
            let phoneNumber = data["phoneNumber"] as? String ?? ""
            let photoURL = data["photoURL"] as? String
            let athleteFirstName = data["athleteFirstName"] as? String
            let athleteLastName = data["athleteLastName"] as? String
            let athleteBirthday = data["athleteBirthday"] as? String
            let athletePosition = data["athletePosition"] as? String
            let athleteSchoolClubTeam = data["athleteSchoolClubTeam"] as? String
            let athleteExperienceLevel = data["athleteExperienceLevel"] as? String
            let athlete2FirstName = data["athlete2FirstName"] as? String
            let athlete2LastName = data["athlete2LastName"] as? String
            let athlete2Birthday = data["athlete2Birthday"] as? String
            let athlete2Position = data["athlete2Position"] as? String
            let athlete2SchoolClubTeam = data["athlete2SchoolClubTeam"] as? String
            let athlete2ExperienceLevel = data["athlete2ExperienceLevel"] as? String
            let athlete3FirstName = data["athlete3FirstName"] as? String
            let athlete3LastName = data["athlete3LastName"] as? String
            let athlete3Birthday = data["athlete3Birthday"] as? String
            let athlete3Position = data["athlete3Position"] as? String
            let notesForCoach = data["notesForCoach"] as? String
            return Client(
                id: doc.documentID,
                firstName: firstName,
                lastName: lastName,
                emailAddress: emailAddress,
                phoneNumber: phoneNumber,
                photoURL: photoURL,
                athleteFirstName: athleteFirstName,
                athleteLastName: athleteLastName,
                athleteBirthday: athleteBirthday,
                athletePosition: athletePosition,
                athleteSchoolClubTeam: athleteSchoolClubTeam,
                athleteExperienceLevel: athleteExperienceLevel,
                athlete2FirstName: athlete2FirstName,
                athlete2LastName: athlete2LastName,
                athlete2Birthday: athlete2Birthday,
                athlete2Position: athlete2Position,
                athlete2SchoolClubTeam: athlete2SchoolClubTeam,
                athlete2ExperienceLevel: athlete2ExperienceLevel,
                athlete3FirstName: athlete3FirstName,
                athlete3LastName: athlete3LastName,
                athlete3Birthday: athlete3Birthday,
                athlete3Position: athlete3Position,
                notesForCoach: notesForCoach
            )
        }
        return clients
        #else
        // No Firestore in this build; return a placeholder list
        return [
            Client(id: "client_demo", firstName: "Alex", lastName: "Smith", emailAddress: "alex@example.com", phoneNumber: "555-123-4567", photoURL: nil)
        ]
        #endif
    }

    // MARK: - Single client fetch
    func fetchClient(by uid: String) async throws -> Client? {
        guard !uid.isEmpty else {
            return nil
        }
        
        #if canImport(FirebaseFirestore)
        let db = Firestore.firestore()
        let snap = try await db.collection("users").document(uid).getDocument()
        guard let data = snap.data() else { return nil }
        guard
            let firstName = data["firstName"] as? String,
            let lastName = data["lastName"] as? String,
            let emailAddress = data["emailAddress"] as? String
        else {
            return nil
        }
        let phoneNumber = data["phoneNumber"] as? String ?? ""
        let photoURL = data["photoURL"] as? String
        let athleteFirstName = data["athleteFirstName"] as? String
        let athleteLastName = data["athleteLastName"] as? String
        let athleteBirthday = data["athleteBirthday"] as? String
        let athletePosition = data["athletePosition"] as? String
        let athleteSchoolClubTeam = data["athleteSchoolClubTeam"] as? String
        let athleteExperienceLevel = data["athleteExperienceLevel"] as? String
        let athlete2FirstName = data["athlete2FirstName"] as? String
        let athlete2LastName = data["athlete2LastName"] as? String
        let athlete2Birthday = data["athlete2Birthday"] as? String
        let athlete2Position = data["athlete2Position"] as? String
        let athlete2SchoolClubTeam = data["athlete2SchoolClubTeam"] as? String
        let athlete2ExperienceLevel = data["athlete2ExperienceLevel"] as? String
        let athlete3FirstName = data["athlete3FirstName"] as? String
        let athlete3LastName = data["athlete3LastName"] as? String
        let athlete3Birthday = data["athlete3Birthday"] as? String
        let athlete3Position = data["athlete3Position"] as? String
        let athlete3SchoolClubTeam = data["athlete3SchoolClubTeam"] as? String
        let athlete3ExperienceLevel = data["athlete3ExperienceLevel"] as? String
        let notesForCoach = data["notesForCoach"] as? String
        return Client(
            id: snap.documentID,
            firstName: firstName,
            lastName: lastName,
            emailAddress: emailAddress,
            phoneNumber: phoneNumber,
            photoURL: photoURL,
            athleteFirstName: athleteFirstName,
            athleteLastName: athleteLastName,
            athleteBirthday: athleteBirthday,
            athletePosition: athletePosition,
            athleteSchoolClubTeam: athleteSchoolClubTeam,
            athleteExperienceLevel: athleteExperienceLevel,
            athlete2FirstName: athlete2FirstName,
            athlete2LastName: athlete2LastName,
            athlete2Birthday: athlete2Birthday,
            athlete2Position: athlete2Position,
            athlete2SchoolClubTeam: athlete2SchoolClubTeam,
            athlete2ExperienceLevel: athlete2ExperienceLevel,
            athlete3FirstName: athlete3FirstName,
            athlete3LastName: athlete3LastName,
            athlete3Birthday: athlete3Birthday,
            athlete3Position: athlete3Position,
            athlete3SchoolClubTeam: athlete3SchoolClubTeam,
            athlete3ExperienceLevel: athlete3ExperienceLevel,
            notesForCoach: notesForCoach
        )
        #else
        return Client(id: "client_demo", firstName: "Alex", lastName: "Smith", emailAddress: "alex@example.com", phoneNumber: "555-123-4567", photoURL: nil)
        #endif
    }
    
    // MARK: - Client Lesson Packages
    func fetchClientPackages(clientId: String) async throws -> [LessonPackage] {
        guard !clientId.isEmpty else {
            return []
        }
        
        #if canImport(FirebaseFirestore)
        let db = Firestore.firestore()
        
        // First, get the client's orgId
        let userDoc = try await db.collection("users").document(clientId).getDocument()
        let orgId = userDoc.data()?["orgId"] as? String
        
        var snapshot: QuerySnapshot
        var packageTitleByType: [String: String] = [:]
        
        // Try NEW path first (organizations/{orgId}/users/{userId}/packages)
        if let orgId = orgId {
            // Build packageType -> title map from pricing structure (for display names)
            var pricingData: [String: Any]?
            if let orgData = try? await db.collection("organizations").document(orgId).getDocument().data(),
               let orgPricing = orgData["pricingStructure"] as? [String: Any] {
                pricingData = orgPricing
            } else if let legacyDoc = try? await db.collection("organizations").document(orgId)
                        .collection("pricingStructure").document("current").getDocument(),
                      let legacyData = legacyDoc.data() {
                pricingData = legacyData
            }
            if let pricingData = pricingData,
               let tiers = pricingData["tiers"] as? [[String: Any]] {
                for tier in tiers {
                    if let packages = tier["packages"] as? [[String: Any]] {
                        for package in packages {
                            if let pkgType = package["packageType"] as? String,
                               let title = package["title"] as? String {
                                packageTitleByType[pkgType] = title
                            }
                        }
                    }
                }
            }

            snapshot = try await db.collection("organizations")
                .document(orgId)
                .collection("users")
                .document(clientId)
                .collection("packages")
                .order(by: "purchaseDate", descending: true)
                .getDocuments()
            
            // If no packages found in new path, fall back to old path
            if snapshot.documents.isEmpty {
                snapshot = try await db.collection("users")
                    .document(clientId)
                    .collection("lessonPackages")
                    .order(by: "purchaseDate", descending: true)
                    .getDocuments()
            }
        } else {
            // No orgId, use old path
            snapshot = try await db.collection("users")
                .document(clientId)
                .collection("lessonPackages")
                .order(by: "purchaseDate", descending: true)
                .getDocuments()
        }
        
        let packages: [LessonPackage] = snapshot.documents.compactMap { doc in
            let data = doc.data()
            guard
                let packageType = data["packageType"] as? String,
                let totalLessons = data["totalLessons"] as? Int,
                let lessonsUsed = data["lessonsUsed"] as? Int,
                let purchaseDateTs = data["purchaseDate"] as? Timestamp
            else {
                return nil
            }
            
            let expirationDate = (data["expirationDate"] as? Timestamp)?.dateValue()
            let transactionId = data["transactionId"] as? String
            let packageCategory = data["packageCategory"] as? String
            let packageName = data["packageName"] as? String ?? packageTitleByType[packageType]
            let trainerId = data["trainerId"] as? String
            
            return LessonPackage(
                id: doc.documentID,
                packageType: packageType,
                packageCategory: packageCategory,
                packageName: packageName,
                trainerId: trainerId,
                totalLessons: totalLessons,
                lessonsUsed: lessonsUsed,
                purchaseDate: purchaseDateTs.dateValue(),
                expirationDate: expirationDate,
                transactionId: transactionId
            )
        }
        return packages
        #else
        return []
        #endif
    }
    
    // MARK: - Admin Booking
    func adminBookLesson(trainerId: String, slotId: String, clientId: String, packageId: String, orgId: String) async throws {
        guard !trainerId.isEmpty, !slotId.isEmpty, !clientId.isEmpty, !packageId.isEmpty, !orgId.isEmpty else {
            throw FirestoreServiceError.notAvailable
        }
        let safeTrainerId = trainerId
        let safeClientId = clientId
        let safePackageId = packageId
        let safeOrgId = orgId
        
        #if canImport(FirebaseFirestore)
        let db = Firestore.firestore()
        
        // 1. Get the slot reference and data
        let slotRef = db.collection("trainers")
            .document(safeTrainerId)
            .collection("schedules")
            .document(slotId)
        
        let slotSnap = try await slotRef.getDocument()
        guard let slotData = slotSnap.data(),
              let startTs = slotData["startTime"] as? Timestamp,
              let endTs = slotData["endTime"] as? Timestamp else {
            throw FirestoreServiceError.decoding
        }
        
        // 2. Get trainer name (best-effort; avoid extra Firestore round-trip)
        let trainerName = (slotData["trainerName"] as? String) ?? "Trainer"
        
        // 3. Get client name (best-effort; avoid blocking booking if fetch fails)
        var clientName = (slotData["clientName"] as? String) ?? "Client"
        if clientName == "Client" {
            let clientRef = db.collection("users").document(safeClientId)
            if let clientSnap = try? await clientRef.getDocument(),
               let clientData = clientSnap.data() {
                let firstName = clientData["firstName"] as? String ?? ""
                let lastName = clientData["lastName"] as? String ?? ""
                let combined = "\(firstName) \(lastName)".trimmingCharacters(in: .whitespaces)
                if !combined.isEmpty { clientName = combined }
            } else {
            }
        }
        
        // 3a. Validate package - ensure it's not a class pass
        var packageRef = db.collection("organizations")
            .document(safeOrgId)
            .collection("users")
            .document(safeClientId)
            .collection("packages")
            .document(safePackageId)
        
        var packageSnap = try await packageRef.getDocument()
        if packageSnap.data() == nil {
            // Fallback to old path for legacy packages
            packageRef = db.collection("users")
                .document(safeClientId)
                .collection("lessonPackages")
                .document(safePackageId)
            packageSnap = try await packageRef.getDocument()
        }
        
        guard let packageData = packageSnap.data() else {
            throw FirestoreServiceError.notAvailable
        }
        
        // Check if package is a class pass (not allowed for lesson bookings)
        let packageType = packageData["packageType"] as? String ?? ""
        let packageCategory = packageData["packageCategory"] as? String
        
        if packageType == "class" || packageType == "class_pass" || packageCategory == "class" {
            throw FirestoreServiceError.notAvailable
        }
        
        // Check package has lessons remaining
        let lessonsUsed = packageData["lessonsUsed"] as? Int ?? 0
        let totalLessons = packageData["totalLessons"] as? Int ?? 0
        if lessonsUsed >= totalLessons {
            throw FirestoreServiceError.notAvailable
        }
        
        // Check package is not expired
        if let expirationTimestamp = packageData["expirationDate"] as? Timestamp {
            if expirationTimestamp.dateValue() < Date() {
                throw FirestoreServiceError.notAvailable
            }
        }
        
        // 4. Create a batch
        let batch = db.batch()
        
        // 5. Create the booking document with all required fields including orgId
        let bookingRef = db.collection("bookings").document()
        batch.setData([
            "clientUID": safeClientId,
            "clientName": clientName,
            "trainerUID": safeTrainerId,
            "trainerId": safeTrainerId,
            "trainerName": trainerName,
            "startTime": startTs,
            "endTime": endTs,
            "status": "confirmed",
            "bookedAt": Timestamp(date: Date()),
            "packageId": safePackageId,
            "lessonPackageId": safePackageId,
            "scheduleSlotId": slotId,
            "slotId": slotId,
            "orgId": safeOrgId
        ], forDocument: bookingRef)
        
        // 6. Increment the package lessons used (packageIdCopy already defined above)
        batch.updateData([
            "lessonsUsed": FieldValue.increment(Int64(1))
        ], forDocument: packageRef)
        
        // 7. Update the slot to show it's booked
        batch.updateData([
            "status": "booked",
            "clientId": safeClientId,
            "clientName": clientName,
            "bookedAt": Timestamp(date: Date()),
            "updatedAt": Timestamp(date: Date())
        ], forDocument: slotRef)
        
        // Commit all changes atomically
        try await batch.commit()
        
        // Log activity for admin/owner booking
        if let currentUser = Auth.auth().currentUser {
            let actorName = currentUser.displayName ?? "Admin"
            let startTime = startTs.dateValue()
            let endTime = endTs.dateValue()
            
            try? await ActivityLogger.shared.log(
                type: .lessonBooked,
                actorId: currentUser.uid,
                actorName: actorName,
                actorRole: .admin,
                targetId: safeClientId,
                targetName: clientName,
                targetType: "client",
                description: "\(actorName) booked a lesson for \(clientName) with \(trainerName) on \(ActivityLogger.formatDateTime(startTime))",
                metadata: [
                    "trainerId": safeTrainerId,
                    "trainerName": trainerName,
                    "startTime": ActivityLogger.formatDateTime(startTime),
                    "endTime": ActivityLogger.formatDateTime(endTime),
                    "packageId": safePackageId,
                    "bookingId": bookingRef.documentID,
                    "timestamp": Timestamp(date: Date())
                ],
                orgId: safeOrgId
            )
        }
        
        #else
        throw FirestoreServiceError.notAvailable
        #endif
    }
    
    // MARK: - Client Bookings
    func fetchClientBookings(clientId: String, upcoming: Bool, orgId: String) async throws -> [ClientBooking] {
        guard !clientId.isEmpty, !orgId.isEmpty else {
            return []
        }
        
        #if canImport(FirebaseFirestore)
        let db = Firestore.firestore()
        let now = Timestamp(date: Date())
        
        var query = db.collection("bookings")
            .whereField("orgId", isEqualTo: orgId)
            .whereField("clientUID", isEqualTo: clientId)
            .whereField("status", in: ["confirmed", "booked"])
        
        if upcoming {
            query = query.whereField("startTime", isGreaterThanOrEqualTo: now)
                .order(by: "startTime", descending: false)
        } else {
            query = query.whereField("startTime", isLessThan: now)
                .order(by: "startTime", descending: true)
        }
        
        let snapshot = try await query.limit(to: 20).getDocuments()
        
        let bookings: [ClientBooking] = await withTaskGroup(of: ClientBooking?.self) { group in
            for doc in snapshot.documents {
                group.addTask {
                    let data = doc.data()
                    guard
                        let trainerId = data["trainerId"] as? String,
                        let startTimeTs = data["startTime"] as? Timestamp,
                        let endTimeTs = data["endTime"] as? Timestamp,
                        let status = data["status"] as? String
                    else {
                        return nil
                    }
                    
                    let trainerName = data["trainerName"] as? String ?? "Unknown"
                    let bookedAt = (data["bookedAt"] as? Timestamp)?.dateValue()
                    let isClassBooking = data["isClassBooking"] as? Bool
                    let classId = data["classId"] as? String
                    let packageId = data["packageId"] as? String ?? data["lessonPackageId"] as? String
                    let location = data["location"] as? String
                    let athleteName = data["athleteName"] as? String
                    let secondAthleteName = data["secondAthleteName"] as? String
                    
                    // Fetch package type if packageId exists
                    var packageType: String? = nil
                    if let pkgId = packageId, !pkgId.isEmpty, !clientId.isEmpty {
                        do {
                            let packageDoc = try await db.collection("users")
                                .document(clientId)
                                .collection("lessonPackages")
                                .document(pkgId)
                                .getDocument()
                            packageType = packageDoc.data()?["packageType"] as? String
                        } catch {
                        }
                    }
                    
                    return ClientBooking(
                        id: doc.documentID,
                        trainerId: trainerId,
                        trainerName: trainerName,
                        startTime: startTimeTs.dateValue(),
                        endTime: endTimeTs.dateValue(),
                        status: status,
                        location: location,
                        bookedAt: bookedAt,
                        isClassBooking: isClassBooking,
                        classId: classId,
                        packageId: packageId,
                        packageType: packageType,
                        athleteName: athleteName,
                        secondAthleteName: secondAthleteName
                    )
                }
            }
            
            var results: [ClientBooking] = []
            for await booking in group {
                if let booking = booking {
                    results.append(booking)
                }
            }
            return results
        }
        
        return bookings
        #else
        return []
        #endif
    }
    
    // MARK: - Client Documents
    func fetchClientDocuments(clientId: String) async throws -> [ClientDocument] {
        guard !clientId.isEmpty else {
            return []
        }
        
        #if canImport(FirebaseFirestore)
        let db = Firestore.firestore()
        let snapshot = try await db.collection("users")
            .document(clientId)
            .collection("documents")
            .order(by: "uploadedAt", descending: true)
            .getDocuments()
        
        let documents: [ClientDocument] = snapshot.documents.compactMap { doc in
            let data = doc.data()
            guard
                let name = data["name"] as? String,
                let type = data["type"] as? String,
                let uploadedAtTs = data["uploadedAt"] as? Timestamp
            else {
                return nil
            }
            
            let url = data["url"] as? String
            
            return ClientDocument(
                id: doc.documentID,
                name: name,
                type: type,
                uploadedAt: uploadedAtTs.dateValue(),
                url: url
            )
        }
        return documents
        #else
        return []
        #endif
    }
}

