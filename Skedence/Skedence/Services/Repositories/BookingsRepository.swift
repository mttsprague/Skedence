//
//  BookingsRepository.swift
//  Skedence
//
//  Firebase repository for bookings data access
//

import Foundation
import FirebaseFirestore
import FirebaseAuth

@MainActor
final class BookingsRepository: QueryableRepositoryProtocol {
    typealias DataType = Booking
    
    private let db = Firestore.firestore()
    
    nonisolated init() {}
    
    // MARK: - RepositoryProtocol Methods
    
    func fetchAll(orgId: String) async throws -> [Booking] {
        guard let userId = Auth.auth().currentUser?.uid else {
            throw RepositoryError.unauthorized
        }
        
        let snapshot = try await db.collection("bookings")
            .whereField("clientId", isEqualTo: userId)
            .whereField("orgId", isEqualTo: orgId)
            .order(by: "startTime", descending: true)
            .getDocuments()
        
        return snapshot.documents.map { doc in
            decodeBooking(id: doc.documentID, data: doc.data())
        }
    }
    
    func fetchById(id: String, orgId: String) async throws -> Booking? {
        let doc = try await db.collection("bookings").document(id).getDocument()
        
        guard doc.exists, let data = doc.data() else {
            throw RepositoryError.notFound
        }
        
        return decodeBooking(id: doc.documentID, data: data)
    }
    
    func create(_ item: Booking, orgId: String) async throws -> String {
        let bookingData = encodeBooking(item, orgId: orgId)
        let ref = try await db.collection("bookings").addDocument(data: bookingData)
        return ref.documentID
    }
    
    func update(id: String, data: [String: Any], orgId: String) async throws {
        try await db.collection("bookings").document(id).updateData(data)
    }
    
    func delete(id: String, orgId: String) async throws {
        try await db.collection("bookings").document(id).delete()
    }
    
    // MARK: - QueryableRepositoryProtocol Methods
    
    func fetch(where conditions: [String: Any], orgId: String) async throws -> [Booking] {
        var query: Query = db.collection("bookings")
        
        for (field, value) in conditions {
            query = query.whereField(field, isEqualTo: value)
        }
        
        query = query.whereField("orgId", isEqualTo: orgId)
        
        let snapshot = try await query.getDocuments()
        return snapshot.documents.map { decodeBooking(id: $0.documentID, data: $0.data()) }
    }
    
    func fetch(orderedBy field: String, descending: Bool, limit: Int?, orgId: String) async throws -> [Booking] {
        guard let userId = Auth.auth().currentUser?.uid else {
            throw RepositoryError.unauthorized
        }
        
        var query: Query = db.collection("bookings")
            .whereField("clientId", isEqualTo: userId)
            .whereField("orgId", isEqualTo: orgId)
            .order(by: field, descending: descending)
        
        if let limit = limit {
            query = query.limit(to: limit)
        }
        
        let snapshot = try await query.getDocuments()
        return snapshot.documents.map { decodeBooking(id: $0.documentID, data: $0.data()) }
    }
    
    // MARK: - Booking-Specific Methods
    
    /// Fetch upcoming bookings for current user
    func fetchUpcoming(orgId: String) async throws -> [Booking] {
        guard let userId = Auth.auth().currentUser?.uid else {
            throw RepositoryError.unauthorized
        }
        
        let now = Timestamp(date: Date())
        
        let snapshot = try await db.collection("bookings")
            .whereField("clientId", isEqualTo: userId)
            .whereField("orgId", isEqualTo: orgId)
            .whereField("startTime", isGreaterThan: now)
            .order(by: "startTime", descending: false)
            .getDocuments()
        
        return snapshot.documents.map { decodeBooking(id: $0.documentID, data: $0.data()) }
    }
    
    /// Fetch bookings within date range
    func fetchInRange(from startDate: Date, to endDate: Date, orgId: String) async throws -> [Booking] {
        guard let userId = Auth.auth().currentUser?.uid else {
            throw RepositoryError.unauthorized
        }
        
        let startTimestamp = Timestamp(date: startDate)
        let endTimestamp = Timestamp(date: endDate)
        
        let snapshot = try await db.collection("bookings")
            .whereField("clientId", isEqualTo: userId)
            .whereField("orgId", isEqualTo: orgId)
            .whereField("startTime", isGreaterThanOrEqualTo: startTimestamp)
            .whereField("startTime", isLessThanOrEqualTo: endTimestamp)
            .order(by: "startTime", descending: false)
            .getDocuments()
        
        return snapshot.documents.map { decodeBooking(id: $0.documentID, data: $0.data()) }
    }
    
    // MARK: - Encoding/Decoding
    
    private func decodeBooking(id: String, data: [String: Any]) -> Booking {
        return Booking(
            id: id,
            clientUID: data["clientUID"] as? String ?? "",
            trainerUID: (data["trainerUID"] as? String) ?? (data["trainerId"] as? String) ?? "",
            scheduleSlotId: (data["scheduleSlotId"] as? String) ?? (data["slotId"] as? String),
            lessonPackageId: (data["lessonPackageId"] as? String) ?? (data["packageId"] as? String),
            startTime: Self.date(from: data["startTime"]),
            endTime: Self.date(from: data["endTime"]),
            status: data["status"] as? String ?? "confirmed",
            location: data["location"] as? String,
            createdAt: Self.date(from: data["createdAt"] ?? data["bookedAt"]),
            updatedAt: Self.date(from: data["updatedAt"] ?? data["bookedAt"]),
            athleteName: data["athleteName"] as? String,
            secondAthleteName: data["secondAthleteName"] as? String,
            lessonNotes: data["lessonNotes"] as? String
        )
    }
    
    private func encodeBooking(_ booking: Booking, orgId: String) -> [String: Any] {
        var data: [String: Any] = [
            "clientUID": booking.clientUID,
            "trainerUID": booking.trainerUID,
            "status": booking.status,
            "orgId": orgId,
            "createdAt": Timestamp(date: booking.createdAt ?? Date())
        ]
        
        if let scheduleSlotId = booking.scheduleSlotId {
            data["scheduleSlotId"] = scheduleSlotId
        }
        
        if let lessonPackageId = booking.lessonPackageId {
            data["lessonPackageId"] = lessonPackageId
        }
        
        if let startTime = booking.startTime {
            data["startTime"] = Timestamp(date: startTime)
        }
        
        if let endTime = booking.endTime {
            data["endTime"] = Timestamp(date: endTime)
        }
        
        if let location = booking.location {
            data["location"] = location
        }
        
        if let athleteName = booking.athleteName {
            data["athleteName"] = athleteName
        }
        
        if let secondAthleteName = booking.secondAthleteName {
            data["secondAthleteName"] = secondAthleteName
        }
        
        if let lessonNotes = booking.lessonNotes {
            data["lessonNotes"] = lessonNotes
        }
        
        return data
    }
    
    private static func date(from any: Any?) -> Date? {
        if let ts = any as? Timestamp { return ts.dateValue() }
        if let d = any as? Date { return d }
        if let dict = any as? [String: Any], let seconds = dict["_seconds"] as? TimeInterval {
            return Date(timeIntervalSince1970: seconds)
        }
        return nil
    }
}
