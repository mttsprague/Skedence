//
//  BookingCard.swift
//  Skedence
//
//  Phase 5.1: Extracted from ScheduleView.swift - Reusable booking/session card component
//

import SwiftUI

/// A card component for displaying upcoming booking/availability slot information
struct BookingCard: View {
    let slot: AvailabilitySlot
    
    var body: some View {
        HStack(alignment: .top, spacing: Spacing.md) {
            // Icon
            ZStack {
                RoundedRectangle(cornerRadius: CornerRadius.xs)
                    .fill(Brand.primary.opacity(0.12))
                Image(systemName: "calendar")
                    .foregroundStyle(Brand.primary)
            }
            .frame(width: 36, height: 36)
            
            // Content
            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text(slot.displayTitle)
                    .font(.headline)
                    .foregroundStyle(.primary)
                
                Text("\(slot.startTime.formatted(.dateTime.weekday(.abbreviated).month(.abbreviated).day())) • \(slot.startTime.formatted(date: .omitted, time: .shortened))–\(slot.endTime.formatted(date: .omitted, time: .shortened))")
                    .foregroundStyle(.secondary)
                
                if let status = slot.status?.capitalized {
                    Text(status)
                        .font(.caption)
                        .foregroundStyle(status.lowercased() == "open" ? .green : .secondary)
                }
            }
            
            Spacer()
            
            // Chevron
            Image(systemName: "chevron.right")
                .foregroundStyle(.secondary)
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: CornerRadius.md)
                .fill(Color.platformBackground)
                .shadow(color: .black.opacity(0.06), radius: 10, x: 0, y: 4)
        )
    }
}
