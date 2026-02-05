//
//  ClassPreviewRow.swift
//  Skedence
//
//  Extracted from HomeView.swift - Class preview card component
//

import SwiftUI

struct ClassPreviewRow: View {
    let groupClass: GroupClass
    @ObservedObject var classesService: ClassesService
    @State private var isRegistered = false

    var body: some View {
        CardView(padding: Spacing.md) {
            HStack(spacing: Spacing.md) {
                // Icon
                ZStack {
                    RoundedRectangle(cornerRadius: CornerRadius.sm, style: .continuous)
                        .fill(
                            LinearGradient(
                                colors: [AppTheme.secondary, AppTheme.secondaryLight],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 50, height: 50)
                    
                    Image(systemName: "person.fill")
                        .font(.system(size: 22, weight: .semibold))
                        .foregroundStyle(.white)
                }

                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    HStack {
                        Text(groupClass.title)
                            .font(.headingSmall)
                            .foregroundStyle(AppTheme.textPrimary)
                        
                        if isRegistered {
                            BadgeView(text: "Registered", color: AppTheme.success)
                        }
                    }

                    HStack(spacing: Spacing.xxs) {
                        Image(systemName: "calendar")
                            .font(.labelSmall)
                        Text(groupClass.startTime.formatted(.dateTime.weekday(.abbreviated).month(.abbreviated).day()))
                            .font(.labelMedium)
                    }
                    .foregroundStyle(AppTheme.textSecondary)

                    HStack(spacing: Spacing.xxs) {
                        Image(systemName: "clock")
                            .font(.labelSmall)
                        Text("\(groupClass.startTime.formatted(date: .omitted, time: .shortened)) - \(groupClass.endTime.formatted(date: .omitted, time: .shortened))")
                            .font(.labelMedium)
                    }
                    .foregroundStyle(AppTheme.textSecondary)
                    
                    HStack(spacing: Spacing.xxs) {
                        Image(systemName: "person.fill")
                            .font(.labelSmall)
                        Text(groupClass.trainerName)
                            .font(.labelMedium)
                    }
                    .foregroundStyle(AppTheme.textSecondary)
                    
                    // Capacity badge
                    if !isRegistered && groupClass.spotsRemaining <= 3 {
                        HStack(spacing: Spacing.xxs) {
                            Image(systemName: "person.2.fill")
                                .font(.labelSmall)
                            Text("\(groupClass.spotsRemaining) spots left")
                                .font(.labelMedium)
                        }
                        .foregroundStyle(AppTheme.secondary)
                    }
                }
                
                Spacer()
                
                Image(systemName: "chevron.right")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(AppTheme.textTertiary)
            }
        }
        .task(id: classesService.registrationChangeToken) {
            if let id = groupClass.id {
                isRegistered = await classesService.isRegistered(for: id)
            } else {
                isRegistered = false
            }
        }
    }
}
