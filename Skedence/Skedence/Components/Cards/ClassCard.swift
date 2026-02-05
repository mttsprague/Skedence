//
//  ClassCard.swift
//  Skedence
//
//  Phase 5.1: Extracted from BookView.swift - Reusable class card component
//

import SwiftUI

/// A card component for displaying group class information with registration status
struct ClassCard: View {
    let classItem: GroupClass
    let onTap: () -> Void
    @ObservedObject var classesService: ClassesService
    @State private var isRegistered = false
    
    var body: some View {
        Button(action: onTap) {
            CardView {
                VStack(alignment: .leading, spacing: Spacing.lg) {
                    // Header with title and registration badge
                    HStack(alignment: .top) {
                        VStack(alignment: .leading, spacing: Spacing.xs) {
                            Text(classItem.title)
                                .font(.headingMedium)
                                .foregroundStyle(AppTheme.secondary)
                                .fontWeight(.semibold)
                            if isRegistered {
                                BadgeView(text: "✓ You're Registered", color: AppTheme.success)
                            }
                        }
                        Spacer()
                        if !isRegistered {
                            if classItem.isFull {
                                BadgeView(text: "Full", color: AppTheme.error)
                            } else {
                                BadgeView(text: "\(classItem.spotsRemaining) spots left", color: AppTheme.success)
                            }
                        }
                    }
                    
                    // Description
                    Text(classItem.description)
                        .font(.bodyMedium)
                        .foregroundStyle(AppTheme.textSecondary)
                        .lineLimit(3)
                        .fixedSize(horizontal: false, vertical: true)
                    
                    Divider()
                    
                    // Class details
                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        DetailRow(icon: "calendar", text: classItem.startTime.formatted(date: .abbreviated, time: .omitted))
                        DetailRow(icon: "clock", text: classItem.startTime.formatted(date: .omitted, time: .shortened))
                        DetailRow(icon: "mappin.circle", text: classItem.location)
                        DetailRow(icon: "person.fill", text: classItem.trainerName)
                    }
                    
                    // Register button (only shown if not registered)
                    if !isRegistered {
                        Divider()
                        Button(action: onTap) {
                            HStack {
                                Image(systemName: "person.badge.plus")
                                Text("Register").fontWeight(.semibold)
                            }
                            .font(.bodyMedium)
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, Spacing.sm)
                            .background(AppTheme.primary)
                            .cornerRadius(CornerRadius.sm)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
        .buttonStyle(.plain)
        .task(id: classesService.registrationChangeToken) {
            if let id = classItem.id {
                isRegistered = await classesService.isRegistered(for: id)
            } else {
                isRegistered = false
            }
        }
    }
}

/// Helper view for icon + text detail rows
private struct DetailRow: View {
    let icon: String
    let text: String
    
    var body: some View {
        HStack(spacing: Spacing.sm) {
            Image(systemName: icon)
                .font(.bodyMedium)
                .foregroundStyle(AppTheme.secondary)
                .frame(width: 20)
            Text(text)
                .font(.bodyMedium)
                .foregroundStyle(AppTheme.textPrimary)
        }
    }
}
