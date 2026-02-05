//
//  UsersSection.swift
//  SkedenceAdmin
//
//  Extracted from SuperAdminView - Phase 1.3
//

import SwiftUI

struct UsersSection: View {
    let users: [AdminUser]
    let isLoading: Bool
    
    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            if isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity)
                    .padding()
            } else if users.isEmpty {
                EmptyStateView(
                    icon: "person.2",
                    title: "No Staff Members",
                    message: "Owners, admins, and trainers will appear here"
                )
            } else {
                ForEach(users) { user in
                    UserCard(user: user)
                }
            }
        }
        .padding()
    }
}
