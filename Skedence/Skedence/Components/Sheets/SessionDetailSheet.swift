//
//  SessionDetailSheet.swift
//  Skedence
//
//  Client-facing session details sheet for viewing booking information
//

import SwiftUI
import FirebaseAuth

struct SessionDetailSheet: View {
    let booking: Booking
    @ObservedObject var trainersService: TrainersService
    
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Close button at top
                HStack {
                    Spacer()
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 28))
                            .foregroundStyle(AppTheme.textTertiary)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 8)
                
                // Title
                Text("Session Details")
                    .font(.system(size: 28, weight: .bold))
                    .foregroundStyle(AppTheme.textPrimary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 16)
                
                // Session details card
                sessionDetailsCard
                
                // Athlete information
                athleteInformationCard
                
                // Lesson notes
                if let notes = booking.lessonNotes, !notes.isEmpty {
                    lessonNotesCard(notes: notes)
                }
            }
            .padding(.vertical, 8)
        }
        .background(Color(UIColor.systemGroupedBackground))
    }
    
    // MARK: - Session Details Card
    private var sessionDetailsCard: some View {
        CardView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Session Details")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(AppTheme.textPrimary)
                
                VStack(alignment: .leading, spacing: 12) {
                    detailRow(icon: "calendar", text: formattedDate)
                    detailRow(icon: "clock", text: duration)
                    detailRow(icon: "person.fill", text: trainerName)
                    
                    if let location = booking.location {
                        detailRow(icon: "mappin.circle.fill", text: location)
                    }
                    
                    detailRow(icon: "ticket.fill", text: participantCountText)
                    
                    // Status badge
                    HStack(spacing: Spacing.xs) {
                        Image(systemName: statusIcon)
                            .font(.system(size: 14, weight: .medium))
                        Text(booking.status.capitalized)
                            .font(.labelMedium.bold())
                    }
                    .foregroundStyle(.white)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(
                        RoundedRectangle(cornerRadius: 8)
                            .fill(statusColor)
                    )
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(16)
        }
    }
    
    // MARK: - Athlete Information Card
    private var athleteInformationCard: some View {
        CardView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Participants")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(AppTheme.textPrimary)
                
                VStack(alignment: .leading, spacing: 16) {
                    // Primary athlete
                    if let athleteName = booking.athleteName, !athleteName.isEmpty {
                        athleteSection(name: athleteName)
                        
                        // Second athlete if exists
                        if let secondName = booking.secondAthleteName, !secondName.isEmpty {
                            Divider()
                                .padding(.vertical, 4)
                            athleteSection(name: secondName)
                        }
                    } else {
                        Text("Participant information not available")
                            .font(.system(size: 14))
                            .foregroundStyle(AppTheme.textSecondary)
                            .padding(.vertical, 8)
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(16)
        }
    }
    
    private func athleteSection(name: String) -> some View {
        HStack(spacing: Spacing.sm) {
            ZStack {
                Circle()
                    .fill(AppTheme.primary.opacity(0.1))
                    .frame(width: 44, height: 44)
                Image(systemName: "person.fill")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(AppTheme.primary)
            }
            
            VStack(alignment: .leading, spacing: 4) {
                Text(name)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(AppTheme.textPrimary)
                Text("Athlete")
                    .font(.system(size: 13))
                    .foregroundStyle(AppTheme.textSecondary)
            }
            
            Spacer()
        }
    }
    
    // MARK: - Lesson Notes Card
    private func lessonNotesCard(notes: String) -> some View {
        CardView {
            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: Spacing.xs) {
                    Image(systemName: "note.text")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(AppTheme.primary)
                    Text("Lesson Notes")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(AppTheme.textPrimary)
                }
                
                Text(notes)
                    .font(.bodyMedium)
                    .foregroundStyle(AppTheme.textSecondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(16)
        }
    }
    
    // MARK: - Detail Row
    private func detailRow(icon: String, text: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 16, weight: .medium))
                .foregroundStyle(AppTheme.primary)
                .frame(width: 24)
            
            Text(text)
                .font(.system(size: 15))
                .foregroundStyle(AppTheme.textPrimary)
            
            Spacer()
        }
    }
    
    // MARK: - Computed Properties
    
    private var formattedDate: String {
        guard let startTime = booking.startTime else { return "Date not available" }
        let formatter = DateFormatter()
        formatter.dateStyle = .long
        formatter.timeStyle = .none
        return formatter.string(from: startTime)
    }
    
    private var duration: String {
        guard let start = booking.startTime,
              let end = booking.endTime else {
            return "Time not available"
        }
        let startFormatter = DateFormatter()
        startFormatter.timeStyle = .short
        let endFormatter = DateFormatter()
        endFormatter.timeStyle = .short
        return "\(startFormatter.string(from: start)) - \(endFormatter.string(from: end))"
    }
    
    private var trainerName: String {
        // Look up trainer name if trainers are loaded, otherwise show "Loading..."
        if trainersService.trainers.isEmpty {
            return "Loading..."
        }
        return trainersService.trainers.first(where: { $0.id == booking.trainerUID })?.name ?? "Trainer"
    }
    
    private var participantCountText: String {
        var count = 1 // At least one athlete
        if let secondAthlete = booking.secondAthleteName, !secondAthlete.isEmpty {
            count = 2
        }
        
        switch count {
        case 1: return "One Athlete"
        case 2: return "Two Athletes"
        case 3: return "Three Athletes"
        case 4: return "Four Athletes"
        default: return "\(count) Athletes"
        }
    }
    
    private var statusIcon: String {
        switch booking.status.lowercased() {
        case "confirmed": return "checkmark.circle.fill"
        case "cancelled": return "xmark.circle.fill"
        case "completed": return "flag.checkered"
        default: return "circle.fill"
        }
    }
    
    private var statusColor: Color {
        switch booking.status.lowercased() {
        case "confirmed": return AppTheme.success
        case "cancelled": return AppTheme.error
        case "completed": return AppTheme.primary
        default: return AppTheme.textSecondary
        }
    }
}
