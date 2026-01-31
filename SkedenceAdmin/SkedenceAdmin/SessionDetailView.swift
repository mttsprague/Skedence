//
//  SessionDetailView.swift
//  SkedenceAdmin
//
//  Session details view for admin to see booking-specific information
//

import SwiftUI

struct SessionDetailView: View {
    let client: Client
    let booking: ClientBooking
    
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var auth: AuthManager
    
    @State private var showCancelConfirmation = false
    @State private var isCancelling = false
    @State private var cancelError: String?
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Header with client name
                    headerSection
                        .padding(.top, 8)
                    
                    // Session details card
                    sessionDetailsCard
                    
                    // Athlete information
                    athleteInformationCard
                    
                    // Lesson notes
                    if let notes = booking.lessonNotes, !notes.isEmpty {
                        lessonNotesCard(notes: notes)
                    }
                    
                    // Cancel button for upcoming sessions
                    if booking.startTime > Date() {
                        cancelButton
                            .padding(.top, 8)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 24)
            }
            .background(Color.platformGroupedBackground.ignoresSafeArea())
            .navigationTitle("\(client.fullName) Session")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 24))
                            .foregroundStyle(AppTheme.textTertiary)
                    }
                }
            }
            .alert("Cancel Session?", isPresented: $showCancelConfirmation) {
                Button("Cancel", role: .destructive) {
                    Task { await cancelBooking() }
                }
                Button("Keep Session", role: .cancel) {}
            } message: {
                Text("Are you sure you want to cancel this session? This action cannot be undone.")
            }
            .alert("Error", isPresented: .constant(cancelError != nil)) {
                Button("OK") { cancelError = nil }
            } message: {
                if let error = cancelError {
                    Text(error)
                }
            }
        }
    }
    
    // MARK: - Header Section
    private var headerSection: some View {
        HStack(spacing: Spacing.md) {
            // Client avatar
            ZStack {
                Circle()
                    .fill(AppTheme.primary.opacity(0.1))
                    .frame(width: 60, height: 60)
                Text(client.initials)
                    .font(.system(size: 24, weight: .semibold))
                    .foregroundStyle(AppTheme.primary)
            }
            
            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text(client.fullName)
                    .font(.headingMedium)
                    .foregroundStyle(AppTheme.textPrimary)
                
                if !client.emailAddress.isEmpty {
                    Text(client.emailAddress)
                        .font(.bodySmall)
                        .foregroundStyle(AppTheme.textSecondary)
                }
            }
            
            Spacer()
        }
    }
    
    // MARK: - Session Details Card
    private var sessionDetailsCard: some View {
        CardView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Session Details")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(AppTheme.textPrimary)
                
                VStack(alignment: .leading, spacing: 12) {
                    detailRow(icon: "calendar", text: booking.formattedDate)
                    detailRow(icon: "clock", text: booking.duration)
                    detailRow(icon: "person.fill", text: booking.trainerName)
                    
                    if let location = booking.location {
                        detailRow(icon: "mappin.circle.fill", text: location)
                    }
                    
                    detailRow(icon: "ticket.fill", text: booking.packageTypeName)
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
                    // First athlete
                    if let athleteName = booking.athleteName, !athleteName.isEmpty {
                        athleteDetailSection(
                            name: athleteName,
                            birthday: client.athleteBirthday,
                            schoolClubTeam: client.athleteSchoolClubTeam,
                            experienceLevel: client.athleteExperienceLevel,
                            position: client.athletePosition
                        )
                    }
                    
                    // Second athlete
                    if let secondName = booking.secondAthleteName, !secondName.isEmpty {
                        Divider()
                            .padding(.vertical, 4)
                        athleteDetailSection(
                            name: secondName,
                            birthday: client.athlete2Birthday,
                            schoolClubTeam: client.athlete2SchoolClubTeam,
                            experienceLevel: client.athlete2ExperienceLevel,
                            position: client.athlete2Position
                        )
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(16)
        }
    }
    
    private func athleteDetailSection(
        name: String,
        birthday: String?,
        schoolClubTeam: String?,
        experienceLevel: String?,
        position: String?
    ) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                Image(systemName: "figure.run")
                    .font(.system(size: 16))
                    .foregroundStyle(AppTheme.primary)
                Text(name)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(AppTheme.textPrimary)
            }
            
            VStack(alignment: .leading, spacing: 8) {
                if let birthday = birthday, !birthday.isEmpty {
                    HStack(spacing: 8) {
                        Image(systemName: "calendar")
                            .font(.system(size: 13))
                            .foregroundStyle(AppTheme.textSecondary)
                            .frame(width: 16)
                        Text("Birthday: \(birthday)")
                            .font(.system(size: 14))
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                    .padding(.leading, 24)
                }
                
                if let school = schoolClubTeam, !school.isEmpty {
                    HStack(spacing: 8) {
                        Image(systemName: "building.2")
                            .font(.system(size: 13))
                            .foregroundStyle(AppTheme.textSecondary)
                            .frame(width: 16)
                        Text(school)
                            .font(.system(size: 14))
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                    .padding(.leading, 24)
                }
                
                if let experience = experienceLevel, !experience.isEmpty {
                    HStack(spacing: 8) {
                        Image(systemName: "star.fill")
                            .font(.system(size: 13))
                            .foregroundStyle(AppTheme.textSecondary)
                            .frame(width: 16)
                        Text(experience)
                            .font(.system(size: 14))
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                    .padding(.leading, 24)
                }
                
                if let position = position, !position.isEmpty {
                    HStack(spacing: 8) {
                        Image(systemName: "sportscourt")
                            .font(.system(size: 13))
                            .foregroundStyle(AppTheme.textSecondary)
                            .frame(width: 16)
                        Text(position)
                            .font(.system(size: 14))
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                    .padding(.leading, 24)
                }
            }
        }
    }
    
    // MARK: - Lesson Notes Card
    private func lessonNotesCard(notes: String) -> some View {
        CardView {
            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 8) {
                    Image(systemName: "note.text")
                        .font(.system(size: 16))
                        .foregroundStyle(AppTheme.secondary)
                    Text("Lesson Notes")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(AppTheme.textPrimary)
                }
                
                Text(notes)
                    .font(.system(size: 15))
                    .foregroundStyle(AppTheme.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(16)
        }
    }
    
    // MARK: - Cancel Button
    private var cancelButton: some View {
        Button {
            showCancelConfirmation = true
        } label: {
            HStack(spacing: Spacing.sm) {
                if isCancelling {
                    ProgressView()
                        .tint(.white)
                } else {
                    Image(systemName: "xmark.circle.fill")
                }
                Text(isCancelling ? "Cancelling..." : "Cancel Session")
            }
        }
        .buttonStyle(DestructiveButtonStyle())
        .disabled(isCancelling)
    }
    
    // MARK: - Helper Views
    private func detailRow(icon: String, text: String) -> some View {
        HStack(spacing: 10) {
            Image(systemName: icon)
                .font(.system(size: 14))
                .foregroundStyle(AppTheme.textSecondary)
                .frame(width: 20)
            Text(text)
                .font(.system(size: 15))
                .foregroundStyle(AppTheme.textPrimary)
        }
    }
    
    // MARK: - Actions
    private func cancelBooking() async {
        isCancelling = true
        defer { isCancelling = false }
        
        // TODO: Implement cancel booking logic (perform async/throwing work here if needed)
        dismiss()
    }
}

// MARK: - Destructive Button Style
struct DestructiveButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headingSmall)
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .frame(height: 56)
            .background(
                RoundedRectangle(cornerRadius: CornerRadius.md)
                    .fill(Color.red)
            )
            .opacity(configuration.isPressed ? 0.8 : 1.0)
    }
}
