//
//  NotesSection.swift
//  SkedenceAdmin
//
//  Extracted from ClientCardView - Phase 1.2
//

import SwiftUI

struct NotesSection: View {
    let notes: String?
    
    var body: some View {
        Group {
            if let notes = notes, !notes.isEmpty {
                CardView {
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        Text("Notes")
                            .font(.headingSmall)
                            .foregroundStyle(AppTheme.textPrimary)
                        
                        Text(notes)
                            .font(.bodyMedium)
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                }
            }
        }
    }
}
