//
//  NextLessonSection.swift
//  SkedenceAdmin
//
//  Extracted from ClientCardView - Phase 1.2
//

import SwiftUI

struct NextLessonSection: View {
    let lesson: ClientBooking?
    let isSelectedBooking: Bool
    
    var body: some View {
        Group {
            if let nextBooking = lesson {
                CardView {
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        HStack {
                            Text(isSelectedBooking ? "Selected Event" : "Next Event")
                                .font(.headingSmall)
                                .foregroundStyle(AppTheme.textPrimary)
                            
                            Spacer()
                            
                            if nextBooking.isClassBooking == true {
                                Label("Class", systemImage: "person.3.fill")
                                    .font(.labelSmall)
                                    .foregroundStyle(AppTheme.primary)
                                    .padding(.horizontal, Spacing.sm)
                                    .padding(.vertical, Spacing.xxs)
                                    .background(AppTheme.primary.opacity(0.1))
                                    .cornerRadius(8)
                            }
                        }
                        
                        VStack(alignment: .leading, spacing: Spacing.sm) {
                            HStack(spacing: Spacing.xs) {
                                Image(systemName: "calendar")
                                    .font(.system(size: 14))
                                    .foregroundStyle(AppTheme.textSecondary)
                                Text(nextBooking.formattedDate)
                                    .font(.bodyMedium)
                                    .foregroundStyle(AppTheme.textPrimary)
                            }
                            
                            HStack(spacing: Spacing.xs) {
                                Image(systemName: "person.fill")
                                    .font(.system(size: 14))
                                    .foregroundStyle(AppTheme.textSecondary)
                                Text(nextBooking.trainerName)
                                    .font(.bodyMedium)
                                    .foregroundStyle(AppTheme.textPrimary)
                            }
                            
                            HStack(spacing: Spacing.xs) {
                                Image(systemName: "clock")
                                    .font(.system(size: 14))
                                    .foregroundStyle(AppTheme.textSecondary)
                                Text(nextBooking.duration)
                                    .font(.bodyMedium)
                                    .foregroundStyle(AppTheme.textPrimary)
                            }
                            
                            if let location = nextBooking.location {
                                HStack(spacing: Spacing.xs) {
                                    Image(systemName: "mappin.circle.fill")
                                        .font(.system(size: 14))
                                        .foregroundStyle(AppTheme.textSecondary)
                                    Text(location)
                                        .font(.bodyMedium)
                                        .foregroundStyle(AppTheme.textPrimary)
                                }
                            }
                            
                            if nextBooking.isClassBooking != true {
                                HStack(spacing: Spacing.xs) {
                                    Image(systemName: "ticket.fill")
                                        .font(.system(size: 14))
                                        .foregroundStyle(AppTheme.textSecondary)
                                    Text(nextBooking.packageTypeName)
                                        .font(.bodyMedium)
                                        .foregroundStyle(AppTheme.textPrimary)
                                }
                            }
                            
                            // Show athlete names if present in booking
                            if let athleteName = nextBooking.athleteName, !athleteName.isEmpty {
                                HStack(spacing: Spacing.xs) {
                                    Image(systemName: "figure.run")
                                        .font(.system(size: 14))
                                        .foregroundStyle(AppTheme.primary)
                                    Text(athleteName)
                                        .font(.bodyMedium)
                                        .foregroundStyle(AppTheme.textPrimary)
                                    if let secondName = nextBooking.secondAthleteName, !secondName.isEmpty {
                                        Text("+ \(secondName)")
                                            .font(.bodyMedium)
                                            .foregroundStyle(AppTheme.textPrimary)
                                    }
                                }
                            }
                            
                            // Show lesson-specific notes if present
                            if let notes = nextBooking.lessonNotes, !notes.isEmpty {
                                VStack(alignment: .leading, spacing: Spacing.xxs) {
                                    HStack(spacing: Spacing.xs) {
                                        Image(systemName: "note.text")
                                            .font(.system(size: 14))
                                            .foregroundStyle(AppTheme.secondary)
                                        Text("Booking Notes:")
                                            .font(.labelSmall)
                                            .fontWeight(.semibold)
                                            .foregroundStyle(AppTheme.secondary)
                                    }
                                    Text(notes)
                                        .font(.bodySmall)
                                        .foregroundStyle(AppTheme.textSecondary)
                                        .padding(.leading, 20)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
