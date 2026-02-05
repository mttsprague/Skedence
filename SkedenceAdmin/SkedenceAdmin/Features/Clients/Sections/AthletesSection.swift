//
//  AthletesSection.swift
//  SkedenceAdmin
//
//  Extracted from ClientCardView - Phase 1.2
//

import SwiftUI

struct AthletesSection: View {
    let client: Client
    
    var body: some View {
        Group {
            if client.athleteFullName != nil {
                CardView {
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        Text("Athletes")
                            .font(.headingSmall)
                            .foregroundStyle(AppTheme.textPrimary)
                        
                        VStack(spacing: Spacing.sm) {
                            if let athleteName = client.athleteFullName {
                                athleteRow(
                                    name: athleteName,
                                    position: client.athletePosition,
                                    birthday: client.athleteBirthday
                                )
                            }
                            
                            if let athlete2Name = client.athlete2FullName {
                                Divider()
                                athleteRow(
                                    name: athlete2Name,
                                    position: client.athlete2Position,
                                    birthday: client.athlete2Birthday
                                )
                            }
                            
                            if let athlete3Name = client.athlete3FullName {
                                Divider()
                                athleteRow(
                                    name: athlete3Name,
                                    position: client.athlete3Position,
                                    birthday: client.athlete3Birthday
                                )
                            }
                        }
                    }
                }
            }
        }
    }
    
    private func athleteRow(name: String, position: String?, birthday: String?) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: Spacing.xs) {
                Image(systemName: "person.fill")
                    .font(.system(size: 14))
                    .foregroundStyle(AppTheme.textSecondary)
                Text(name)
                    .font(.bodyMedium)
                    .foregroundStyle(AppTheme.textPrimary)
                if let position = position {
                    Text("•")
                        .foregroundStyle(AppTheme.textTertiary)
                    Text(position)
                        .font(.bodyMedium)
                        .foregroundStyle(AppTheme.textSecondary)
                }
            }
            if let birthday = birthday {
                HStack(spacing: Spacing.xs) {
                    Image(systemName: "calendar")
                        .font(.system(size: 12))
                        .foregroundStyle(AppTheme.textTertiary)
                    Text(birthday)
                        .font(.bodySmall)
                        .foregroundStyle(AppTheme.textSecondary)
                }
                .padding(.leading, 20)
            }
        }
    }
}
