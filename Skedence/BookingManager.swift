// BookingManager.swift
import Foundation
import StoreKit
import Combine
import FirebaseFunctions
import FirebaseAuth
import FirebaseFirestore

@MainActor
final class BookingManager: ObservableObject {
    private let functions = Functions.functions()
    private let db = Firestore.firestore()

    // If lessonPackageId is provided and non-empty, use it directly.
    // Otherwise, automatically choose the package with the closest expiration date.
    func bookLesson(trainerId: String, slotId: String, lessonPackageId: String, athleteName: String? = nil, secondAthleteName: String? = nil, athleteNames: [String]? = nil, lessonNotes: String? = nil) async throws -> Booking {
        guard let user = Auth.auth().currentUser else { throw BookingCallError.notAuthenticated }
        let uid = user.uid

        // 1) Determine which package to use
        let packageId: String
        if !lessonPackageId.isEmpty {
            // User explicitly selected a package
            packageId = lessonPackageId
        } else {
            // Auto-select the package that expires the soonest but is still valid
            guard let chosenId = try await chooseSoonestExpiringPackageId(for: uid) else {
                throw BookingCallError.noAvailablePackage
            }
            packageId = chosenId
        }

        // Debug prints to verify what we send to the Cloud Function
        print("BookingManager.bookLesson → Calling CF 'bookLesson'")
        print("  trainerId: \(trainerId)")
        print("  slotId: \(slotId)")
        print("  chosenPackageId: \(packageId)")
        print("  clientUID: \(uid)")
        print("  clientName: \(user.displayName ?? "N/A")")

        // 2) Call Cloud Function using the chosen package.
        var payload: [String: Any] = [
            "trainerId": trainerId,
            "slotId": slotId,
            "lessonPackageId": packageId
        ]
        
        // Add optional fields if provided
        if let athleteName = athleteName {
            payload["athleteName"] = athleteName
        }
        if let secondAthleteName = secondAthleteName {
            payload["secondAthleteName"] = secondAthleteName
        }
        if let athleteNames = athleteNames, !athleteNames.isEmpty {
            payload["athleteNames"] = athleteNames
        }
        if let lessonNotes = lessonNotes, !lessonNotes.isEmpty {
            payload["lessonNotes"] = lessonNotes
        }
        
        // 2.1) Call Cloud Function with enhanced error diagnostics
        let result: HTTPSCallableResult
        do {
            result = try await functions.httpsCallable("bookLesson").call(payload)
        } catch let error as NSError {
            print("❌ BookingManager.bookLesson → Cloud Function Error:")
            print("   Domain: \(error.domain)")
            print("   Code: \(error.code)")
            print("   Description: \(error.localizedDescription)")
            print("   User Info: \(error.userInfo)")
            
            // Check if it's an authentication error
            if error.domain == "com.firebase.functions" {
                switch error.code {
                case 16: // UNAUTHENTICATED
                    print("   ⚠️ UNAUTHENTICATED error detected")
                    print("   This could be:")
                    print("   1. App Check token invalid (most common)")
                    print("   2. Firebase Auth token expired or invalid")
                    print("   3. User not signed in properly")
                    
                    // Check if error message mentions App Check
                    if let errorMessage = error.localizedDescription.lowercased(),
                       errorMessage.contains("app check") || errorMessage.contains("blocked") {
                        print("   ⚠️ App Check is blocking the request!")
                        throw BookingCallError.server("App Check validation failed. Please contact support.")
                    }
                    throw BookingCallError.notAuthenticated
                    
                case 7: // PERMISSION_DENIED
                    print("   ⚠️ PERMISSION_DENIED error")
                    throw BookingCallError.server("Permission denied. Please contact support.")
                    
                case 5: // NOT_FOUND
                    print("   ⚠️ NOT_FOUND error")
                    throw BookingCallError.server("Resource not found. Please try again.")
                    
                default:
                    break
                }
            }
            
            throw BookingCallError.server(error.localizedDescription)
        }

        // 3) Decode server response
        guard let dict = result.data as? [String: Any] else {
            print("BookingManager.bookLesson → Invalid response shape. Raw data: \(String(describing: result.data))")
            throw BookingCallError.invalidResponse
        }
        if let errMsg = dict["error"] as? String {
            print("BookingManager.bookLesson → Server error: \(errMsg)")
            throw BookingCallError.server(errMsg)
        }

        // IMPORTANT: Do not update lessonPackages from the client.
        // The Cloud Function must perform lessonsUsed increment and any related writes.

        if let bookingDict = dict["booking"] as? [String: Any] {
            let booking = try decodeBooking(from: bookingDict)
            print("BookingManager.bookLesson → Success. Booking id: \(booking.id ?? "<nil>")")
            
            // Activity logging now handled by cloud function
            
            return booking
        }

        if let message = dict["message"] as? String {
            print("BookingManager.bookLesson → Success message: \(message)")
            return Booking(
                id: nil,
                clientUID: uid,
                trainerUID: trainerId,
                scheduleSlotId: slotId,
                lessonPackageId: packageId,
                startTime: nil,
                endTime: nil,
                status: "confirmed",
                location: nil,
                createdAt: nil,
                updatedAt: nil,
                athleteName: athleteName,
                secondAthleteName: secondAthleteName,
                lessonNotes: lessonNotes
            )
        }

        print("BookingManager.bookLesson → Missing 'booking' and 'message' in response: \(dict)")
        throw BookingCallError.invalidResponse
    }

    // MARK: - Package selection

    private func chooseSoonestExpiringPackageId(for uid: String) async throws -> String? {
        let now = Date()
        
        // Helper to decode packages
        func date(from any: Any?) -> Date? {
            if let ts = any as? Timestamp { return ts.dateValue() }
            if let d = any as? Date { return d }
            if let dict = any as? [String: Any], let seconds = dict["_seconds"] as? TimeInterval {
                return Date(timeIntervalSince1970: seconds)
            }
            return nil
        }
        
        struct Pkg {
            let id: String
            let total: Int
            let used: Int
            let expiration: Date
        }
        
        func parsePackages(from snap: QuerySnapshot) -> [Pkg] {
            return snap.documents.compactMap { doc in
                let data = doc.data()
                
                // Check if this is a class pass using the new packageCategory field first
                if let packageCategory = data["packageCategory"] as? String {
                    // Exclude class passes using the enum value
                    if packageCategory == "classPass" || packageCategory == "class" {
                        return nil
                    }
                } else if let packageType = data["packageType"] as? String {
                    // Fallback to checking packageType for backward compatibility
                    if packageType == "class_pass" || packageType == "class" {
                        return nil
                    }
                }
                
                guard
                    let total = data["totalLessons"] as? Int,
                    let used = data["lessonsUsed"] as? Int,
                    let exp = date(from: data["expirationDate"])
                else { return nil }
                
                return Pkg(id: doc.documentID, total: total, used: used, expiration: exp)
            }
        }
        
        // Try NEW path first: organizations/{orgId}/users/{userId}/packages
        // Query users by authUserId to find actual user document ID
        let userQuery = try await db.collection("users")
            .whereField("authUserId", isEqualTo: uid)
            .limit(to: 1)
            .getDocuments()
        
        guard let userDoc = userQuery.documents.first else {
            print("⚠️ BookingManager: No user document found for authUserId: \(uid)")
            return nil
        }
        
        let userId = userDoc.documentID
        let userData = userDoc.data()
        
        if let orgId = userData["orgId"] as? String {
            let newPathSnap = try await db.collection("organizations")
                .document(orgId)
                .collection("users")
                .document(userId)
                .collection("packages")
                .order(by: "expirationDate", descending: false)
                .getDocuments()
            
            let newPathPkgs = parsePackages(from: newPathSnap)
            let chosen = newPathPkgs.first { pkg in
                pkg.expiration >= now && (pkg.total - pkg.used) > 0
            }
            
            if let chosenId = chosen?.id {
                print("📦 BookingManager: Selected package \(chosenId) from NEW path")
                return chosenId
            }
        }
        
        // Fallback to OLD path: users/{userId}/lessonPackages
        let oldPathSnap = try await db.collection("users")
            .document(userId)
            .collection("lessonPackages")
            .order(by: "expirationDate", descending: false)
            .getDocuments()
        
        let oldPathPkgs = parsePackages(from: oldPathSnap)
        let chosen = oldPathPkgs.first { pkg in
            pkg.expiration >= now && (pkg.total - pkg.used) > 0
        }
        
        if let chosenId = chosen?.id {
            print("📦 BookingManager: Selected package \(chosenId) from OLD path")
        }
        
        return chosen?.id
    }

    // MARK: - Decode booking helper

    private func getOrgIdForUser(_ uid: String) async throws -> String? {
        // Query users by authUserId to find actual document
        let userQuery = try await db.collection("users")
            .whereField("authUserId", isEqualTo: uid)
            .limit(to: 1)
            .getDocuments()
        
        guard let userDoc = userQuery.documents.first else {
            return nil
        }
        
        return userDoc.data()["orgId"] as? String
    }

    private func decodeBooking(from dict: [String: Any]) throws -> Booking {
        func date(from any: Any?) -> Date? {
            if let ts = any as? Timestamp { return ts.dateValue() }
            if let d = any as? Date { return d }
            if let tdict = any as? [String: Any], let seconds = tdict["_seconds"] as? TimeInterval {
                return Date(timeIntervalSince1970: seconds)
            }
            return nil
        }
        return Booking(
            id: dict["id"] as? String,
            clientUID: dict["clientUID"] as? String ?? "",
            trainerUID: dict["trainerUID"] as? String ?? dict["trainerId"] as? String ?? "",
            scheduleSlotId: dict["scheduleSlotId"] as? String ?? dict["slotId"] as? String,
            lessonPackageId: dict["lessonPackageId"] as? String ?? dict["packageId"] as? String,
            startTime: date(from: dict["startTime"]),
            endTime: date(from: dict["endTime"]),
            status: dict["status"] as? String ?? "confirmed",
            // Accept either createdAt/updatedAt or bookedAt (server currently writes bookedAt)
            location: dict["location"] as? String,
            createdAt: date(from: dict["createdAt"] ?? dict["bookedAt"]),
            updatedAt: date(from: dict["updatedAt"] ?? dict["bookedAt"]),
            athleteName: dict["athleteName"] as? String,
            secondAthleteName: dict["secondAthleteName"] as? String,
            lessonNotes: dict["lessonNotes"] as? String
        )
    }
}
