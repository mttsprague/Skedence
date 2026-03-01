//
//  BillboardService.swift
//  Skedence
//
//  Service for loading billboard settings from Firestore
//

import Foundation
import Combine
import FirebaseFirestore

@MainActor
class BillboardService: ObservableObject {
    @Published var isEnabled = false
    @Published var message = ""
    @Published var isLoading = false
    
    private let db = Firestore.firestore()
    
    func loadBillboard(orgId: String) async {
        isLoading = true
        
        do {
            let doc = try await db.collection("organizations").document(orgId).getDocument()
            
            if let data = doc.data() {
                isEnabled = data["billboardEnabled"] as? Bool ?? false
                message = data["billboardMessage"] as? String ?? ""
            }
        } catch {
            print("Error loading billboard: \(error.localizedDescription)")
            isEnabled = false
            message = ""
        }
        
        isLoading = false
    }
}
