//
//  LocationsService.swift
//  SkedenceAdmin
//
//  Created by Assistant on 1/11/26.
//

import Foundation
import FirebaseFirestore
import Combine

enum LocationsServiceError: Error, LocalizedError {
    case missingLocationId
    case missingOrgId
    case invalidLocation
    case addFailed(String)
    case updateFailed(String)
    case deleteFailed(String)
    case fetchFailed(String)
    
    var errorDescription: String? {
        switch self {
        case .missingLocationId:
            return "Location ID is required"
        case .missingOrgId:
            return "Organization ID is required"
        case .invalidLocation:
            return "Location data is invalid"
        case .addFailed(let message):
            return "Failed to add location: \(message)"
        case .updateFailed(let message):
            return "Failed to update location: \(message)"
        case .deleteFailed(let message):
            return "Failed to delete location: \(message)"
        case .fetchFailed(let message):
            return "Failed to load locations: \(message)"
        }
    }
}

@MainActor
class LocationsService: ObservableObject {
    @Published private(set) var locationsState: LoadingState<[Location]> = .idle
    
    private let db = Firestore.firestore()
    private var listener: ListenerRegistration?
    
    // Convenience accessors for backward compatibility
    var locations: [Location] { locationsState.data ?? [] }
    var isLoading: Bool { locationsState.isLoading }
    var errorMessage: String? { locationsState.errorMessage }
    
    func loadLocations(orgId: String) {
        guard !orgId.isEmpty else {
            locationsState = .error(LocationsServiceError.missingOrgId)
            return
        }
        
        locationsState = .loading
        
        listener?.remove()
        listener = db.collection("locations")
            .whereField("orgId", isEqualTo: orgId)
            .whereField("isActive", isEqualTo: true)
            .order(by: "createdAt", descending: false)
            .addSnapshotListener { [weak self] snapshot, error in
                guard let self = self else { return }
                
                if let error = error {
                    self.locationsState = .error(LocationsServiceError.fetchFailed(error.localizedDescription))
                    return
                }
                
                guard let documents = snapshot?.documents else {
                    self.locationsState = .loaded([])
                    return
                }
                
                let locations = documents.compactMap { doc in
                    try? doc.data(as: Location.self)
                }
                self.locationsState = .loaded(locations)
            }
    }
    
    // MARK: - CRUD Operations
    
    func addLocation(_ location: Location) async throws {
        var newLocation = location
        newLocation.createdAt = Timestamp(date: Date())
        newLocation.updatedAt = Timestamp(date: Date())
        newLocation.isActive = true
        if newLocation.isVisibleToClients == nil {
            newLocation.isVisibleToClients = true
        }
        
        // Use sanitized location name as document ID
        let locationId = sanitizeLocationName(location.name)
        
        do {
            try db.collection("locations").document(locationId).setData(from: newLocation)
        } catch {
            throw LocationsServiceError.addFailed(error.localizedDescription)
        }
    }
    
    // Helper function to sanitize location name for use as document ID
    private func sanitizeLocationName(_ name: String) -> String {
        return name
            .lowercased()
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: "[^a-z0-9\\s-]", with: "", options: .regularExpression) // Remove special chars
            .replacingOccurrences(of: "\\s+", with: "_", options: .regularExpression) // Replace spaces with underscores
            .replacingOccurrences(of: "-+", with: "_", options: .regularExpression) // Replace hyphens with underscores
            .replacingOccurrences(of: "_+", with: "_", options: .regularExpression) // Replace multiple underscores
            .trimmingCharacters(in: CharacterSet(charactersIn: "_")) // Remove leading/trailing underscores
    }
    
    func updateLocation(_ location: Location) async throws {
        guard let id = location.id else {
            throw LocationsServiceError.missingLocationId
        }
        
        // Get the old location name for cascading updates
        let oldLocationSnapshot = try await db.collection("locations").document(id).getDocument()
        let oldLocationName = oldLocationSnapshot.data()?["name"] as? String
        
        var updatedLocation = location
        updatedLocation.updatedAt = Timestamp(date: Date())
        
        do {
            // Update the location document
            try db.collection("locations").document(id).setData(from: updatedLocation, merge: true)
            
            // CASCADE UPDATE: Update location name in all schedules, bookings, and classes
            if let oldName = oldLocationName, oldName != location.name {
                print("📍 Cascading location update from \"\(oldName)\" to \"\(location.name)\"")
                
                // Update all trainer schedules with this location
                let trainersQuery = db.collection("trainers")
                    .whereField("orgId", isEqualTo: location.orgId)
                    .whereField("active", isEqualTo: true)
                let trainersSnapshot = try await trainersQuery.getDocuments()
                
                var schedulesUpdated = 0
                for trainerDoc in trainersSnapshot.documents {
                    let schedulesQuery = trainerDoc.reference.collection("schedules")
                        .whereField("location", isEqualTo: oldName)
                    let schedulesSnapshot = try await schedulesQuery.getDocuments()
                    
                    for scheduleDoc in schedulesSnapshot.documents {
                        try await scheduleDoc.reference.updateData(["location": location.name])
                        schedulesUpdated += 1
                    }
                }
                
                // Update all bookings with this location
                let bookingsQuery = db.collection("bookings")
                    .whereField("orgId", isEqualTo: location.orgId)
                    .whereField("location", isEqualTo: oldName)
                let bookingsSnapshot = try await bookingsQuery.getDocuments()
                
                for bookingDoc in bookingsSnapshot.documents {
                    try await bookingDoc.reference.updateData(["location": location.name])
                }
                let bookingsUpdated = bookingsSnapshot.documents.count
                
                // Update all classes with this location
                let classesQuery = db.collection("classes")
                    .whereField("orgId", isEqualTo: location.orgId)
                    .whereField("location", isEqualTo: oldName)
                let classesSnapshot = try await classesQuery.getDocuments()
                
                for classDoc in classesSnapshot.documents {
                    try await classDoc.reference.updateData(["location": location.name])
                }
                let classesUpdated = classesSnapshot.documents.count
                
                let totalUpdates = schedulesUpdated + bookingsUpdated + classesUpdated
                print("📍 Location update cascaded to \(totalUpdates) documents")
            }
        } catch {
            throw LocationsServiceError.updateFailed(error.localizedDescription)
        }
    }
    
    func deleteLocation(_ location: Location) async throws {
        guard let id = location.id else {
            throw LocationsServiceError.missingLocationId
        }
        
        do {
            // Soft delete - mark as inactive
            try await db.collection("locations").document(id).updateData([
                "isActive": false,
                "updatedAt": Timestamp(date: Date())
            ])
        } catch {
            throw LocationsServiceError.deleteFailed(error.localizedDescription)
        }
    }
    
    deinit {
        listener?.remove()
    }
}

