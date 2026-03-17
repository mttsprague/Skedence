//
//  ScheduleSection.swift
//  SkedenceAdmin
//
//  Extracted from ClientCardView - Phase 1.2
//

import SwiftUI

struct ScheduleSection: View {
    let upcomingLessons: [ClientBooking]
    let pastLessons: [ClientBooking]
    let upcomingClasses: [ClientBooking]
    let pastClasses: [ClientBooking]
    let isLoading: Bool
    let isAdmin: Bool
    let onCancelBooking: (String) -> Void
    
    var body: some View {
        VStack(spacing: Spacing.md) {
            // Upcoming Lessons
            CardView {
                VStack(alignment: .leading, spacing: Spacing.md) {
                    HStack {
                        Text("Upcoming Lessons")
                            .font(.headingSmall)
                            .foregroundStyle(AppTheme.textPrimary)
                        
                        Spacer()
                        
                        if isLoading {
                            ProgressView()
                                .scaleEffect(0.8)
                        }
                    }
                    
                    if upcomingLessons.isEmpty && !isLoading {
                        VStack(spacing: Spacing.sm) {
                            Image(systemName: "calendar.badge.clock")
                                .font(.system(size: 32))
                                .foregroundStyle(AppTheme.textTertiary)
                            Text("No upcoming lessons")
                                .font(.bodyMedium)
                                .foregroundStyle(AppTheme.textSecondary)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, Spacing.md)
                    } else {
                        VStack(spacing: Spacing.xs) {
                            ForEach(upcomingLessons) { booking in
                                upcomingBookingRow(booking)
                            }
                        }
                    }
                }
            }
            
            // Upcoming Classes
            CardView {
                VStack(alignment: .leading, spacing: Spacing.md) {
                    HStack {
                        Text("Upcoming Classes")
                            .font(.headingSmall)
                            .foregroundStyle(AppTheme.textPrimary)
                        
                        Spacer()
                        
                        if isLoading {
                            ProgressView()
                                .scaleEffect(0.8)
                        }
                    }
                    
                    if upcomingClasses.isEmpty && !isLoading {
                        VStack(spacing: Spacing.sm) {
                            Image(systemName: "person.3")
                                .font(.system(size: 32))
                                .foregroundStyle(AppTheme.textTertiary)
                            Text("No upcoming classes")
                                .font(.bodyMedium)
                                .foregroundStyle(AppTheme.textSecondary)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, Spacing.md)
                    } else {
                        VStack(spacing: Spacing.xs) {
                            ForEach(upcomingClasses) { booking in
                                upcomingBookingRow(booking)
                            }
                        }
                    }
                }
            }
            
            // Completed Lessons
            CardView {
                VStack(alignment: .leading, spacing: Spacing.md) {
                    Text("Completed Lessons")
                        .font(.headingSmall)
                        .foregroundStyle(AppTheme.textPrimary)
                    
                    if pastLessons.isEmpty && !isLoading {
                        VStack(spacing: Spacing.sm) {
                            Image(systemName: "clock.arrow.circlepath")
                                .font(.system(size: 32))
                                .foregroundStyle(AppTheme.textTertiary)
                            Text("No completed lessons")
                                .font(.bodyMedium)
                                .foregroundStyle(AppTheme.textSecondary)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, Spacing.md)
                    } else {
                        VStack(spacing: Spacing.xs) {
                            ForEach(pastLessons.prefix(10)) { booking in
                                bookingRow(booking)
                            }
                        }
                    }
                }
            }
            
            // Past Classes
            CardView {
                VStack(alignment: .leading, spacing: Spacing.md) {
                    Text("Past Classes")
                        .font(.headingSmall)
                        .foregroundStyle(AppTheme.textPrimary)
                    
                    if pastClasses.isEmpty && !isLoading {
                        VStack(spacing: Spacing.sm) {
                            Image(systemName: "person.3")
                                .font(.system(size: 32))
                                .foregroundStyle(AppTheme.textTertiary)
                            Text("No past classes")
                                .font(.bodyMedium)
                                .foregroundStyle(AppTheme.textSecondary)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, Spacing.md)
                    } else {
                        VStack(spacing: Spacing.xs) {
                            ForEach(pastClasses.prefix(10)) { booking in
                                bookingRow(booking)
                            }
                        }
                    }
                }
            }
        }
    }
    
    private func bookingRow(_ booking: ClientBooking) -> some View {
        HStack(alignment: .top, spacing: 0) {
            // Color bar on left  
            Rectangle()
                .fill(booking.isClassBooking == true ? AppTheme.secondary : AppTheme.primary)
                .frame(width: 4)
            
            VStack(alignment: .leading, spacing: 4) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 4) {
                        // Title
                        Text(booking.isClassBooking == true ? "Class" : "Private Lesson")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(AppTheme.textPrimary)
                        
                        // Trainer name
                        HStack(spacing: 4) {
                            Image(systemName: "person.fill")
                                .font(.system(size: 12))
                                .foregroundStyle(AppTheme.textSecondary)
                            Text(booking.trainerName)
                                .font(.system(size: 14))
                                .foregroundStyle(AppTheme.textSecondary)
                        }
                        
                        // Location if available
                        if let location = booking.location, !location.isEmpty {
                            HStack(spacing: 4) {
                                Image(systemName: "mappin.circle.fill")
                                    .font(.system(size: 12))
                                    .foregroundStyle(AppTheme.textSecondary)
                                Text(location)
                                    .font(.system(size: 14))
                                    .foregroundStyle(AppTheme.textSecondary)
                            }
                        }
                    }
                    
                    Spacer()
                    
                    // Time on right side
                    VStack(alignment: .trailing, spacing: 2) {
                        Text(booking.formattedStartTime)
                            .font(.system(size: 14))
                            .foregroundStyle(AppTheme.textPrimary)
                        Text(booking.formattedEndTime)
                            .font(.system(size: 14))
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                }
            }
            .padding(.leading, 12)
            .padding(.vertical, 12)
            .padding(.trailing, 16)
        }
    }
    
    private func upcomingBookingRow(_ booking: ClientBooking) -> some View {
        Button {
            // Tappable row (can be used for navigation in future)
        } label: {
            HStack(alignment: .top, spacing: 0) {
                // Color bar on left
                Rectangle()
                    .fill(booking.isClassBooking == true ? AppTheme.secondary : AppTheme.primary)
                    .frame(width: 4)
                
                VStack(alignment: .leading, spacing: 2) {
                    HStack(alignment: .top) {
                        VStack(alignment: .leading, spacing: 4) {
                            // Title (Lesson type or class name)
                            Text(booking.isClassBooking == true ? "Class" : "Private Lesson")
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundStyle(AppTheme.textPrimary)
                            
                            // Trainer name
                            HStack(spacing: 4) {
                                Image(systemName: "person.fill")
                                    .font(.system(size: 12))
                                    .foregroundStyle(AppTheme.textSecondary)
                                Text(booking.trainerName)
                                    .font(.system(size: 14))
                                    .foregroundStyle(AppTheme.textSecondary)
                            }
                            
                            // Location if available
                            if let location = booking.location, !location.isEmpty {
                                HStack(spacing: 4) {
                                    Image(systemName: "mappin.circle.fill")
                                        .font(.system(size: 12))
                                        .foregroundStyle(AppTheme.textSecondary)
                                    Text(location)
                                        .font(.system(size: 14))
                                        .foregroundStyle(AppTheme.textSecondary)
                                }
                            }
                        }
                        
                        Spacer()
                        
                        // Time on right side
                        VStack(alignment: .trailing, spacing: 2) {
                            Text(booking.formattedStartTime)
                                .font(.system(size: 14))
                                .foregroundStyle(AppTheme.textPrimary)
                            Text(booking.formattedEndTime)
                                .font(.system(size: 14))
                                .foregroundStyle(AppTheme.textSecondary)
                        }
                    }
                    
                    // Cancel button for admins/owners (keep functionality)
                    if isAdmin {
                        Button(action: {
                            onCancelBooking(booking.id)
                        }) {
                            HStack(spacing: Spacing.xs) {
                                Image(systemName: "xmark.circle.fill")
                                    .font(.labelSmall)
                                Text("Cancel")
                                    .font(.labelMedium)
                                    .fontWeight(.medium)
                            }
                            .foregroundStyle(.red)
                            .padding(.vertical, 6)
                            .padding(.horizontal, 12)
                            .background(Color.red.opacity(0.1))
                            .cornerRadius(8)
                        }
                        .buttonStyle(.plain)
                        .padding(.top, 4)
                    }
                }
                .padding(.leading, 12)
                .padding(.vertical, 12)
                .padding(.trailing, 16)
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}
