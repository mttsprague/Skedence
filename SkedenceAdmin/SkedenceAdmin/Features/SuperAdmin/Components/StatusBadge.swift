//
//  StatusBadge.swift
//  SkedenceAdmin
//
//  Extracted from SuperAdminView - Phase 1.3
//

import SwiftUI

struct StatusBadge: View {
    let text: String
    let isActive: Bool
    
    var body: some View {
        Text(text.capitalized)
            .font(.labelSmall)
            .foregroundStyle(.white)
            .padding(.horizontal, Spacing.xs)
            .padding(.vertical, 4)
            .background(isActive ? AppTheme.success : Color.gray)
            .cornerRadius(CornerRadius.xs)
    }
}
