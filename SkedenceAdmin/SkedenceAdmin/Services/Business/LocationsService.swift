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
        
        do {
            _ = try db.collection("locations").addDocument(from: newLocation)
        } catch {
            throw LocationsServiceError.addFailed(error.localizedDescription)
        }
    }
    
    func updateLocation(_ location: Location) async throws {
        guard let id = location.id else {
            throw LocationsServiceError.missingLocationId
        }
        
        var updatedLocation = location
        updatedLocation.updatedAt = Timestamp(date: Date())
        
        do {
            try db.collection("locations").document(id).setData(from: updatedLocation, merge: true)
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

