//
//  ScheduleSection.swift
//  SkedenceAdmin
//
//  Extracted from ClientCardView - Phase 1.2
//

import SwiftUI

struct ScheduleSection: View {
    let upcomingBookings: [ClientBooking]
    let pastBookings: [ClientBooking]
    let isLoading: Bool
    let isAdmin: Bool
    let onCancelBooking: (String) -> Void
    
    var body: some View {
        VStack(spacing: Spacing.md) {
            // Upcoming Visits
            CardView {
                VStack(alignment: .leading, spacing: Spacing.md) {
                    HStack {
                        Text("Upcoming Visits")
                            .font(.headingSmall)
                            .foregroundStyle(AppTheme.textPrimary)
                        
                        Spacer()
                        
                        if isLoading {
                            ProgressView()
                                .scaleEffect(0.8)
                        }
                    }
                    
                    if upcomingBookings.isEmpty && !isLoading {
                        VStack(spacing: Spacing.sm) {
                            Image(systemName: "calendar.badge.clock")
                                .font(.system(size: 32))
                                .foregroundStyle(AppTheme.textTertiary)
                            Text("No upcoming visits")
                                .font(.bodyMedium)
                                .foregroundStyle(AppTheme.textSecondary)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, Spacing.md)
                    } else {
                        VStack(spacing: Spacing.xs) {
                            ForEach(upcomingBookings) { booking in
                                upcomingBookingRow(booking)
                            }
                        }
                    }
                }
            }
            
            // Visit History
            CardView {
                VStack(alignment: .leading, spacing: Spacing.md) {
                    Text("Visit History")
                        .font(.headingSmall)
                        .foregroundStyle(AppTheme.textPrimary)
                    
                    if pastBookings.isEmpty && !isLoading {
                        VStack(spacing: Spacing.sm) {
                            Image(systemName: "clock.arrow.circlepath")
                                .font(.system(size: 32))
                                .foregroundStyle(AppTheme.textTertiary)
                            Text("No past visits")
                                .font(.bodyMedium)
                                .foregroundStyle(AppTheme.textSecondary)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, Spacing.md)
                    } else {
                        VStack(spacing: Spacing.xs) {
                            ForEach(pastBookings.prefix(10)) { booking in
                                bookingRow(booking)
                            }
                        }
                    }
                }
            }
        }
    }
    
    private func bookingRow(_ booking: ClientBooking) -> some View {
        HStack(spacing: Spacing.sm) {
            Image(systemName: booking.isClassBooking == true ? "person.3.fill" : "calendar")
                .font(.system(size: 16))
                .foregroundStyle(AppTheme.primary)
                .frame(width: 24)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(booking.trainerName)
                    .font(.bodyMedium)
                    .fontWeight(.medium)
                    .foregroundStyle(AppTheme.textPrimary)
                
                Text(booking.formattedDate)
                    .font(.labelSmall)
                    .foregroundStyle(AppTheme.textSecondary)
            }
            
            Spacer()
            
            Text(booking.duration)
                .font(.labelMedium)
                .foregroundStyle(AppTheme.textTertiary)
        }
        .padding(.vertical, Spacing.xxs)
    }
    
    private func upcomingBookingRow(_ booking: ClientBooking) -> some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            HStack(spacing: Spacing.sm) {
                Image(systemName: booking.isClassBooking == true ? "person.3.fill" : "calendar")
                    .font(.system(size: 16))
                    .foregroundStyle(AppTheme.primary)
                    .frame(width: 24)
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(booking.trainerName)
                        .font(.bodyMedium)
                        .fontWeight(.medium)
                        .foregroundStyle(AppTheme.textPrimary)
                    
                    Text(booking.formattedDate)
                        .font(.labelSmall)
                        .foregroundStyle(AppTheme.textSecondary)
                }
                
                Spacer()
                
                Text(booking.duration)
                    .font(.labelMedium)
                    .foregroundStyle(AppTheme.textTertiary)
            }
            
            // Cancel button for admins/owners
            if isAdmin {
                Button(action: {
                    onCancelBooking(booking.id)
                }) {
                    HStack(spacing: Spacing.xs) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.labelSmall)
                        Text("Cancel Lesson")
                            .font(.labelMedium)
                            .fontWeight(.medium)
                    }
                    .foregroundStyle(.red)
                    .padding(.vertical, Spacing.xs)
                    .padding(.horizontal, Spacing.sm)
                    .background(Color.red.opacity(0.1))
                    .cornerRadius(8)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.vertical, Spacing.xxs)
    }
}
