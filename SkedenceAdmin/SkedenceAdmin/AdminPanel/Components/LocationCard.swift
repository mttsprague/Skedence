//
//  LocationCard.swift
//  SkedenceAdmin
//
//  Created by refactoring from AdminPanelView
//  Phase 1.1: AdminPanelView decomposition
//

import SwiftUI

struct LocationCard: View {
    let location: Location
    let onEdit: () -> Void
    let onDelete: () -> Void
    
    var body: some View {
        CardView(padding: Spacing.md) {
            VStack(alignment: .leading, spacing: Spacing.sm) {
                HStack {
                    VStack(alignment: .leading, spacing: Spacing.xxs) {
                        HStack(spacing: Spacing.xs) {
                            Text(location.name)
                                .font(.headingSmall)
                                .foregroundStyle(AppTheme.textPrimary)
                            
                            if location.isVisibleToClients == false {
                                Text("Hidden from clients")
                                    .font(.caption2.weight(.medium))
                                    .foregroundStyle(.white)
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(Color.orange)
                                    .clipShape(Capsule())
                            }
                        }
                        
                        Text(location.addressLine1)
                            .font(.bodyMedium)
                            .foregroundStyle(AppTheme.textSecondary)
                        
                        if let line2 = location.addressLine2, !line2.isEmpty {
                            Text(line2)
                                .font(.bodyMedium)
                                .foregroundStyle(AppTheme.textSecondary)
                        }
                        
                        Text(location.cityStateZip)
                            .font(.bodyMedium)
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                    
                    Spacer()
                    
                    Menu {
                        Button {
                            onEdit()
                        } label: {
                            Label("Edit", systemImage: "pencil")
                        }
                        
                        Button(role: .destructive) {
                            onDelete()
                        } label: {
                            Label("Delete", systemImage: "trash")
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle.fill")
                            .font(.title3)
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                }
            }
        }
    }
}
