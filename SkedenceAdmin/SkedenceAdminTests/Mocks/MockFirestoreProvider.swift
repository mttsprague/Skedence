//
//  MockFirestoreProvider.swift
//  SkedenceAdminTests
//
//  Mock Firestore for testing without Firebase dependency
//

import Foundation
import Combine
@testable import SkedenceAdmin

// MARK: - Firestore Provider Protocol

/// Protocol to abstract Firestore dependency for testing
protocol FirestoreProvider {
    func document(path: String) -> MockDocumentReference
    func collection(path: String) -> MockCollectionReference
}

// MARK: - Mock Firestore Implementation

class MockFirestore: FirestoreProvider {
    var documents: [String: [String: Any]] = [:]
    var listeners: [String: ([String: Any]) -> Void] = []
    
    func document(path: String) -> MockDocumentReference {
        return MockDocumentReference(path: path, firestore: self)
    }
    
    func collection(path: String) -> MockCollectionReference {
        return MockCollectionReference(path: path, firestore: self)
    }
    
    func setData(_ data: [String: Any], forPath path: String) {
        documents[path] = data
        
        // Notify listener if exists
        if let listener = listeners[path] {
            listener(data)
        }
    }
    
    func getData(forPath path: String) -> [String: Any]? {
        return documents[path]
    }
    
    func addListener(forPath path: String, handler: @escaping ([String: Any]) -> Void) {
        listeners[path] = handler
        
        // Immediately call with existing data if available
        if let data = documents[path] {
            handler(data)
        }
    }
    
    func removeListener(forPath path: String) {
        listeners.removeValue(forKey: path)
    }
    
    func clear() {
        documents.removeAll()
        listeners.removeAll()
    }
}

// MARK: - Mock Document Reference

class MockDocumentReference {
    let path: String
    weak var firestore: MockFirestore?
    
    init(path: String, firestore: MockFirestore) {
        self.path = path
        self.firestore = firestore
    }
    
    func setData(_ data: [String: Any]) async throws {
        firestore?.setData(data, forPath: path)
    }
    
    func updateData(_ data: [String: Any]) async throws {
        if var existing = firestore?.getData(forPath: path) {
            for (key, value) in data {
                existing[key] = value
            }
            firestore?.setData(existing, forPath: path)
        } else {
            firestore?.setData(data, forPath: path)
        }
    }
    
    func getDocument() async throws -> MockDocumentSnapshot {
        let data = firestore?.getData(forPath: path)
        return MockDocumentSnapshot(path: path, data: data, exists: data != nil)
    }
    
    func addSnapshotListener(_ handler: @escaping (MockDocumentSnapshot?, Error?) -> Void) -> MockListenerRegistration {
        firestore?.addListener(forPath: path) { data in
            let snapshot = MockDocumentSnapshot(path: self.path, data: data, exists: true)
            handler(snapshot, nil)
        }
        
        return MockListenerRegistration(path: path, firestore: firestore)
    }
}

// MARK: - Mock Collection Reference

class MockCollectionReference {
    let path: String
    weak var firestore: MockFirestore?
    
    init(path: String, firestore: MockFirestore) {
        self.path = path
        self.firestore = firestore
    }
    
    func document(_ documentId: String) -> MockDocumentReference {
        let fullPath = "\(path)/\(documentId)"
        return MockDocumentReference(path: fullPath, firestore: firestore!)
    }
    
    func whereField(_ field: String, isEqualTo value: Any) -> MockQuery {
        return MockQuery(collectionPath: path, firestore: firestore, filters: [(field, value)])
    }
    
    func getDocuments() async throws -> MockQuerySnapshot {
        // Return all documents in this collection
        let documents = firestore?.documents.filter { $0.key.hasPrefix(path) } ?? [:]
        let snapshots = documents.map { path, data in
            MockDocumentSnapshot(path: path, data: data, exists: true)
        }
        return MockQuerySnapshot(documents: snapshots)
    }
}

// MARK: - Mock Query

class MockQuery {
    let collectionPath: String
    weak var firestore: MockFirestore?
    var filters: [(String, Any)]
    
    init(collectionPath: String, firestore: MockFirestore?, filters: [(String, Any)] = []) {
        self.collectionPath = collectionPath
        self.firestore = firestore
        self.filters = filters
    }
    
    func whereField(_ field: String, isEqualTo value: Any) -> MockQuery {
        var newFilters = filters
        newFilters.append((field, value))
        return MockQuery(collectionPath: collectionPath, firestore: firestore, filters: newFilters)
    }
    
    func limit(to limit: Int) -> MockQuery {
        return self // Simplified for testing
    }
    
    func getDocuments() async throws -> MockQuerySnapshot {
        // Filter documents based on query criteria
        let documents = firestore?.documents.filter { path, data in
            guard path.hasPrefix(collectionPath) else { return false }
            
            // Check all filters match
            for (field, value) in filters {
                if let fieldValue = data[field] as? String,
                   let stringValue = value as? String {
                    if fieldValue != stringValue {
                        return false
                    }
                } else if let fieldValue = data[field] as? Bool,
                          let boolValue = value as? Bool {
                    if fieldValue != boolValue {
                        return false
                    }
                }
            }
            
            return true
        } ?? [:]
        
        let snapshots = documents.map { path, data in
            MockDocumentSnapshot(path: path, data: data, exists: true)
        }
        
        return MockQuerySnapshot(documents: snapshots)
    }
}

// MARK: - Mock Snapshot Types

struct MockDocumentSnapshot {
    let path: String
    let data: [String: Any]?
    let exists: Bool
    
    func data() -> [String: Any]? {
        return data
    }
}

struct MockQuerySnapshot {
    let documents: [MockDocumentSnapshot]
    
    var isEmpty: Bool {
        documents.isEmpty
    }
    
    var count: Int {
        documents.count
    }
}

// MARK: - Mock Listener Registration

class MockListenerRegistration {
    let path: String
    weak var firestore: MockFirestore?
    
    init(path: String, firestore: MockFirestore?) {
        self.path = path
        self.firestore = firestore
    }
    
    func remove() {
        firestore?.removeListener(forPath: path)
    }
}
