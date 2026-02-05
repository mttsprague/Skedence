//
//  PricingStructureService.swift
//  Skedence
//
//  Created on 1/9/26.
//

import Foundation
import SwiftUI
import Combine
import FirebaseFirestore

enum PricingStructureServiceError: Error, LocalizedError {
    case missingOrgId
    case loadFailed(String)
    case saveFailed(String)
    case encodingFailed
    
    var errorDescription: String? {
        switch self {
        case .missingOrgId:
            return "Organization ID is required"
        case .loadFailed(let message):
            return "Failed to load pricing structure: \(message)"
        case .saveFailed(let message):
            return "Failed to save pricing structure: \(message)"
        case .encodingFailed:
            return "Failed to encode pricing structure"
        }
    }
}

@MainActor
class PricingStructureService: ObservableObject {
    private let db = Firestore.firestore()
    
    @Published private(set) var pricingState: LoadingState<PricingStructure> = .idle
    
    // Convenience accessors for backward compatibility
    var pricingStructure: PricingStructure? { pricingState.data }
    var isLoading: Bool { pricingState.isLoading }
    var error: String? { pricingState.errorMessage }
    
    /// Load pricing structure for an organization
    func loadPricingStructure(for orgId: String) async {
        guard !orgId.isEmpty else {
            pricingState = .error(PricingStructureServiceError.missingOrgId)
            return
        }
        
        pricingState = .loading
        
        do {
            let docRef = db.collection("organizations").document(orgId)
            let document = try await docRef.getDocument()
            
            guard document.exists else {
                // No pricing structure set yet, return empty
                pricingState = .loaded(PricingStructure(tiers: [], lastUpdated: Date()))
                return
            }
            
            // Check if pricingStructure field exists
            guard let data = document.data(),
                  let pricingData = data["pricingStructure"] as? [String: Any] else {
                // No pricing structure field, return empty
                pricingState = .loaded(PricingStructure(tiers: [], lastUpdated: Date()))
                return
            }
            
            // Decode pricing structure
            let jsonData = try JSONSerialization.data(withJSONObject: pricingData)
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            
            let decoded = try decoder.decode(PricingStructure.self, from: jsonData)
            pricingState = .loaded(decoded)
            
        } catch {
            pricingState = .error(PricingStructureServiceError.loadFailed(error.localizedDescription))
        }
    }
    
    /// Save pricing structure for an organization
    func savePricingStructure(_ structure: PricingStructure, for orgId: String) async throws {
        guard !orgId.isEmpty else {
            throw PricingStructureServiceError.missingOrgId
        }
        
        pricingState = .loading
        
        do {
            // Encode to dictionary
            let encoder = JSONEncoder()
            encoder.dateEncodingStrategy = .iso8601
            let data = try encoder.encode(structure)
            let dictionary = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            
            guard let dictionary = dictionary else {
                throw PricingStructureServiceError.encodingFailed
            }
            
            // Save to Firestore
            let docRef = db.collection("organizations").document(orgId)
            try await docRef.setData([
                "pricingStructure": dictionary
            ], merge: true)
            
            // Update local state
            pricingState = .loaded(structure)
            
        } catch {
            pricingState = .error(PricingStructureServiceError.saveFailed(error.localizedDescription))
            throw error
        }
    }
    
    /// Get all package options across all tiers (for dropdowns)
    var allPackageOptions: [PackageOption] {
        pricingStructure?.allPackages ?? []
    }
    
    /// Get package titles for picker
    var packageTitles: [String] {
        allPackageOptions.map { $0.title }
    }
    
    /// Find package by title
    func package(withTitle title: String) -> PackageOption? {
        pricingStructure?.package(withTitle: title)
    }
}
