//
//  LocationsService.swift
//  Skedence
//
//  Created by Assistant on 1/9/26.
//

import Foundation
import FirebaseFirestore
import Combine

class LocationsService: ObservableObject {
    @Published var locations: [Location] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private let db = Firestore.firestore()
    private var listener: ListenerRegistration?
    
    func loadLocations(orgId: String) {
        isLoading = true
        errorMessage = nil
        
        listener?.remove()
        listener = db.collection("locations")
            .whereField("orgId", isEqualTo: orgId)
            .whereField("isActive", isEqualTo: true)
            .order(by: "createdAt", descending: false)
            .addSnapshotListener { [weak self] snapshot, error in
                guard let self = self else { return }
                
                self.isLoading = false
                
                if let error = error {
                    self.errorMessage = "Failed to load locations: \(error.localizedDescription)"
                    print("❌ Error loading locations: \(error)")
                    return
                }
                
                guard let documents = snapshot?.documents else {
                    self.locations = []
                    return
                }
                
                self.locations = documents.compactMap { doc in
                    try? doc.data(as: Location.self)
                }
                
                print("✅ Loaded \(self.locations.count) locations")
            }
    }
    
    func addLocation(_ location: Location) async throws {
        var newLocation = location
        newLocation.createdAt = Timestamp(date: Date())
        newLocation.updatedAt = Timestamp(date: Date())
        newLocation.isActive = true
        
        let _ = try db.collection("locations").addDocument(from: newLocation)
        print("✅ Location added successfully")
    }
    
    func updateLocation(_ location: Location) async throws {
        guard let id = location.id else {
            throw NSError(domain: "LocationsService", code: -1, userInfo: [NSLocalizedDescriptionKey: "Location ID is required"])
        }
        
        var updatedLocation = location
        updatedLocation.updatedAt = Timestamp(date: Date())
        
        try db.collection("locations").document(id).setData(from: updatedLocation, merge: true)
        print("✅ Location updated successfully")
    }
    
    func deleteLocation(_ location: Location) async throws {
        guard let id = location.id else {
            throw NSError(domain: "LocationsService", code: -1, userInfo: [NSLocalizedDescriptionKey: "Location ID is required"])
        }
        
        // Soft delete - just mark as inactive
        try await db.collection("locations").document(id).updateData([
            "isActive": false,
            "updatedAt": Timestamp(date: Date())
        ])
        print("✅ Location deleted successfully")
    }
    
    deinit {
        listener?.remove()
    }
}
