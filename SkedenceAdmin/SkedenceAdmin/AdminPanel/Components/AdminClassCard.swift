//
//  AdminClassCard.swift
//  SkedenceAdmin
//
//  Created by refactoring from AdminPanelView
//  Phase 1.1: AdminPanelView decomposition
//

import SwiftUI

struct AdminClassCard: View {
    let classItem: GroupClass
    let onTap: () -> Void
    let onToggleRegistration: (Bool) -> Void
    let onDelete: () -> Void
    
    @State private var showingDeleteAlert = false
    
    var body: some View {
        CardView {
            VStack(alignment: .leading, spacing: Spacing.md) {
                HStack {
                    VStack(alignment: .leading, spacing: Spacing.xxs) {
                        Text(classItem.title)
                            .font(.headingSmall)
                            .foregroundStyle(AppTheme.textPrimary)
                        
                        Text(classItem.description)
                            .font(.bodySmall)
                            .foregroundStyle(AppTheme.textSecondary)
                            .lineLimit(2)
                    }
                    
                    Spacer()
                    
                    if classItem.isOpenForRegistration {
                        BadgeView(text: "Open", color: AppTheme.success)
                    } else {
                        BadgeView(text: "Closed", color: AppTheme.textTertiary)
                    }
                }
                
                Divider()
                
                HStack(spacing: Spacing.md) {
                    VStack(alignment: .leading, spacing: Spacing.xxs) {
                        HStack(spacing: Spacing.xxs) {
                            Image(systemName: "calendar")
                                .font(.labelSmall)
                            Text(classItem.startTime.formatted(date: .abbreviated, time: .omitted))
                                .font(.labelMedium)
                                .lineLimit(1)
                        }
                        
                        HStack(spacing: Spacing.xxs) {
                            Image(systemName: "clock")
                                .font(.labelSmall)
                            Text("\(classItem.startTime.formatted(date: .omitted, time: .shortened)) - \(classItem.endTime.formatted(date: .omitted, time: .shortened))")
                                .font(.labelMedium)
                                .lineLimit(1)
                        }
                        
                        HStack(spacing: Spacing.xxs) {
                            Image(systemName: "mappin.circle")
                                .font(.labelSmall)
                            Text(classItem.location)
                                .font(.labelMedium)
                                .lineLimit(1)
                        }
                        
                        HStack(spacing: Spacing.xxs) {
                            Image(systemName: "person.fill")
                                .font(.labelSmall)
                            Text(classItem.trainerName)
                                .font(.labelMedium)
                                .lineLimit(1)
                        }
                    }
                    .foregroundStyle(AppTheme.textSecondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    
                    VStack(alignment: .trailing, spacing: Spacing.xxs) {
                        Text("\(classItem.currentParticipants)/\(classItem.maxParticipants)")
                            .font(.headingSmall)
                            .foregroundStyle(AppTheme.primary)
                        
                        Text("registered")
                            .font(.labelSmall)
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                    .frame(minWidth: 70)
                }
                
                Divider()
                
                HStack(spacing: Spacing.sm) {
                    Button {
                        onTap()
                    } label: {
                        HStack(spacing: Spacing.xxs) {
                            Image(systemName: "pencil.circle")
                                .font(.system(size: 14, weight: .semibold))
                            Text("Edit")
                                .font(.labelMedium)
                        }
                        .foregroundStyle(.white)
                        .padding(.horizontal, Spacing.sm)
                        .padding(.vertical, Spacing.xs)
                        .background(
                            RoundedRectangle(cornerRadius: CornerRadius.xs, style: .continuous)
                                .fill(AppTheme.primary)
                        )
                    }
                    .buttonStyle(.plain)
                    
                    Button {
                        onToggleRegistration(!classItem.isOpenForRegistration)
                    } label: {
                        HStack(spacing: Spacing.xxs) {
                            Image(systemName: classItem.isOpenForRegistration ? "pause.circle" : "play.circle")
                                .font(.system(size: 14, weight: .semibold))
                            Text(classItem.isOpenForRegistration ? "Close" : "Open")
                                .font(.labelMedium)
                        }
                        .foregroundStyle(.white)
                        .padding(.horizontal, Spacing.sm)
                        .padding(.vertical, Spacing.xs)
                        .background(
                            RoundedRectangle(cornerRadius: CornerRadius.xs, style: .continuous)
                                .fill(classItem.isOpenForRegistration ? AppTheme.warning : AppTheme.success)
                        )
                    }
                    .buttonStyle(.plain)
                    
                    Spacer()
                    
                    Button {
                        showingDeleteAlert = true
                    } label: {
                        HStack(spacing: Spacing.xxs) {
                            Image(systemName: "trash")
                                .font(.system(size: 14, weight: .semibold))
                            Text("Delete")
                                .font(.labelMedium)
                        }
                        .foregroundStyle(.white)
                        .padding(.horizontal, Spacing.sm)
                        .padding(.vertical, Spacing.xs)
                        .background(
                            RoundedRectangle(cornerRadius: CornerRadius.xs, style: .continuous)
                                .fill(AppTheme.error)
                        )
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .alert("Delete Class", isPresented: $showingDeleteAlert) {
            Button("Cancel", role: .cancel) { }
            Button("Delete", role: .destructive) {
                onDelete()
            }
        } message: {
            Text("Are you sure you want to delete this class? This action cannot be undone.")
        }
    }
}
