//
//  Trainer.swift
//  Skedence
//
//  Created by Matthew Sprague on 10/14/25.
//


import Foundation
import Combine

// /trainers/{trainerId}
struct Trainer: Identifiable, Hashable {
    var id: String?
    let firstName: String?
    let lastName: String?
    let email: String?
    let avatarUrl: String?
    let photoURL: String?
    let imageUrl: String?
    let active: Bool?
    
    var name: String? {
        guard let first = firstName, let last = lastName else { return nil }
        return "\(first) \(last)".trimmingCharacters(in: .whitespaces)
    }
}
