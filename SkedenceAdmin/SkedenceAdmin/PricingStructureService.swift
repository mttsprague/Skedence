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

@MainActor
class PricingStructureService: ObservableObject {
    private let db = Firestore.firestore()
    
    @Published var pricingStructure: PricingStructure?
    @Published var isLoading = false
    @Published var error: String?
    
    /// Load pricing structure for an organization
    func loadPricingStructure(for orgId: String) async {
        isLoading = true
        error = nil
        
        do {
            let docRef = db.collection("organizations").document(orgId)
            let document = try await docRef.getDocument()
            
            guard document.exists else {
                // No pricing structure set yet, use default
                print("⚠️ No pricing structure found for org \(orgId), using default")
                pricingStructure = PricingStructure.default
                isLoading = false
                return
            }
            
            // Check if pricingStructure field exists
            guard let data = document.data(),
                  let pricingData = data["pricingStructure"] as? [String: Any] else {
                // No pricing structure field, use default
                print("⚠️ No pricingStructure field found, using default")
                pricingStructure = PricingStructure.default
                isLoading = false
                return
            }
            
            // Decode pricing structure
            let jsonData = try JSONSerialization.data(withJSONObject: pricingData)
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            
            let decoded = try decoder.decode(PricingStructure.self, from: jsonData)
            pricingStructure = decoded
            
            print("✅ Loaded pricing structure with \(decoded.tiers.count) tiers")
            
        } catch {
            self.error = "Failed to load pricing: \(error.localizedDescription)"
            print("❌ Error loading pricing structure: \(error)")
            // Fallback to default on error
            pricingStructure = PricingStructure.default
        }
        
        isLoading = false
    }
    
    /// Save pricing structure for an organization
    func savePricingStructure(_ structure: PricingStructure, for orgId: String) async throws {
        isLoading = true
        error = nil
        
        do {
            // Encode to dictionary
            let encoder = JSONEncoder()
            encoder.dateEncodingStrategy = .iso8601
            let data = try encoder.encode(structure)
            let dictionary = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            
            guard let dictionary = dictionary else {
                throw NSError(domain: "PricingStructureService", code: -1,
                             userInfo: [NSLocalizedDescriptionKey: "Failed to encode pricing structure"])
            }
            
            // Save to Firestore
            let docRef = db.collection("organizations").document(orgId)
            try await docRef.setData([
                "pricingStructure": dictionary
            ], merge: true)
            
            // Update local state
            pricingStructure = structure
            
            print("✅ Saved pricing structure with \(structure.tiers.count) tiers")
            
        } catch {
            self.error = "Failed to save pricing: \(error.localizedDescription)"
            print("❌ Error saving pricing structure: \(error)")
            throw error
        }
        
        isLoading = false
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
