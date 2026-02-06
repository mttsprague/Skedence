//
//  SessionDetailView.swift
//  SkedenceAdmin
//
//  Session details view for admin to see booking-specific information
//

import SwiftUI
import FirebaseFirestore

struct SessionDetailView: View {
    let client: Client
    let booking: ClientBooking
    
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var dependencies: AdminAppDependencies
    private var auth: AuthManager { dependencies.auth }
    
    @State private var showCancelConfirmation = false
    @State private var showCancelOptions = false // New state for action sheet
    @State private var isCancelling = false
    @State private var cancelError: String?
    @State private var showClientCard = false
    @State private var showCancelSuccess = false
    @State private var cancelSuccessMessage = "" // Store the success message
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Header with client name
                    headerSection
                        .padding(.top, 8)
                    
                    // View Client Card button
                    viewClientCardButton
                    
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
            .sheet(isPresented: $showClientCard) {
                ClientCardView(client: client, selectedBooking: nil)
            }
            .confirmationDialog("Cancel Session", isPresented: $showCancelOptions, titleVisibility: .visible) {
                Button("Early Cancel (Refund Pass)", role: .destructive) {
                    Task { await cancelBooking(refundPass: true) }
                }
                Button("Late Cancel (No Refund)", role: .destructive) {
                    Task { await cancelBooking(refundPass: false) }
                }
                Button("Keep Session", role: .cancel) {}
            } message: {
                Text("Choose cancellation type:\n\n• Early Cancel: Client's pass will be refunded\n• Late Cancel: Client's pass will NOT be refunded")
            }
            .alert("Success", isPresented: $showCancelSuccess) {
                Button("OK") { }
            } message: {
                Text(cancelSuccessMessage)
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
                
                if let refCode = client.referenceCode {
                    Text(refCode)
                        .font(.system(size: 13, weight: .medium, design: .monospaced))
                        .foregroundStyle(AppTheme.textSecondary)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(
                            RoundedRectangle(cornerRadius: 4)
                                .fill(AppTheme.primary.opacity(0.1))
                        )
                } else if !client.emailAddress.isEmpty {
                    Text(client.emailAddress)
                        .font(.bodySmall)
                        .foregroundStyle(AppTheme.textSecondary)
                }
            }
            
            Spacer()
        }
    }
    
    // MARK: - View Client Card Button
    private var viewClientCardButton: some View {
        Button {
            showClientCard = true
        } label: {
            HStack(spacing: 8) {
                Image(systemName: "person.text.rectangle")
                    .font(.system(size: 15, weight: .medium))
                Text("View Client Card")
                    .font(.system(size: 15, weight: .medium))
            }
            .foregroundStyle(AppTheme.primary)
            .frame(maxWidth: .infinity)
            .frame(height: 44)
            .background(
                RoundedRectangle(cornerRadius: 10)
                    .fill(AppTheme.primary.opacity(0.1))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .strokeBorder(AppTheme.primary.opacity(0.3), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
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
                    // Use new athleteNames array if available, otherwise fall back to legacy fields
                    if let athleteNames = booking.athleteNames, !athleteNames.isEmpty {
                        // New format: display all athletes from array
                        ForEach(Array(athleteNames.enumerated()), id: \.offset) { index, name in
                            if index > 0 {
                                Divider()
                                    .padding(.vertical, 4)
                            }
                            athleteDetailSection(
                                name: name,
                                birthday: getAthleteBirthday(at: index),
                                schoolClubTeam: getAthleteSchoolClubTeam(at: index),
                                experienceLevel: getAthleteExperienceLevel(at: index),
                                position: getAthletePosition(at: index)
                            )
                        }
                    } else {
                        // Legacy format: display first two athletes
                        if let athleteName = booking.athleteName, !athleteName.isEmpty {
                            athleteDetailSection(
                                name: athleteName,
                                birthday: client.athleteBirthday,
                                schoolClubTeam: client.athleteSchoolClubTeam,
                                experienceLevel: client.athleteExperienceLevel,
                                position: client.athletePosition
                            )
                        }
                        
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
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(16)
        }
    }
    
    // Helper methods to get athlete data by index
    private func getAthleteBirthday(at index: Int) -> String? {
        switch index {
        case 0: return client.athleteBirthday
        case 1: return client.athlete2Birthday
        case 2: return client.athlete3Birthday
        default: return nil
        }
    }
    
    private func getAthleteSchoolClubTeam(at index: Int) -> String? {
        switch index {
        case 0: return client.athleteSchoolClubTeam
        case 1: return client.athlete2SchoolClubTeam
        case 2: return client.athlete3SchoolClubTeam
        default: return nil
        }
    }
    
    private func getAthleteExperienceLevel(at index: Int) -> String? {
        switch index {
        case 0: return client.athleteExperienceLevel
        case 1: return client.athlete2ExperienceLevel
        case 2: return client.athlete3ExperienceLevel
        default: return nil
        }
    }
    
    private func getAthletePosition(at index: Int) -> String? {
        switch index {
        case 0: return client.athletePosition
        case 1: return client.athlete2Position
        case 2: return client.athlete3Position
        default: return nil
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
                
                // Waiver Status
                WaiverStatusView(clientId: client.id, athleteName: name)
                    .padding(.leading, 24)
                    .padding(.top, 4)
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
            showCancelOptions = true
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
    private func cancelBooking(refundPass: Bool) async {
        let bookingId = booking.id
        guard let orgId = auth.currentOrgId else {
            cancelError = "Missing booking or organization information"
            return
        }
        
        isCancelling = true
        defer { isCancelling = false }
        
        do {
            try await FunctionsService.shared.adminCancelLesson(
                bookingId: bookingId,
                orgId: orgId,
                clientId: client.id,
                refundPass: refundPass
            )
            
            // Set appropriate success message
            if refundPass {
                cancelSuccessMessage = "Session cancelled successfully! The client's pass has been refunded."
            } else {
                cancelSuccessMessage = "Session cancelled successfully. The client's pass was not refunded."
            }
            
            // Show success and dismiss
            showCancelSuccess = true
            
            // Dismiss after a short delay
            try? await Task.sleep(nanoseconds: 1_500_000_000) // 1.5 seconds
            dismiss()
        } catch let error as NSError {
            // Check if it's a Functions error
            if error.domain == "com.firebase.functions" {
                if let message = error.userInfo["message"] as? String {
                    cancelError = message
                } else if let details = error.userInfo[NSLocalizedDescriptionKey] as? String {
                    cancelError = details
                } else {
                    cancelError = "Cloud Function error: \(error.localizedDescription)"
                }
            } else {
                cancelError = error.localizedDescription
            }
        }
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

// MARK: - Waiver Status View
struct WaiverStatusView: View {
    let clientId: String
    let athleteName: String
    
    @State private var hasWaiver = false
    @State private var isLoading = true
    
    var body: some View {
        HStack(spacing: 6) {
            if isLoading {
                ProgressView()
                    .scaleEffect(0.7)
                    .frame(width: 16, height: 16)
                Text("Checking waiver...")
                    .font(.system(size: 13))
                    .foregroundStyle(AppTheme.textTertiary)
            } else if hasWaiver {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 14))
                    .foregroundStyle(.green)
                Text("Waiver Signed")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(.green)
            } else {
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.system(size: 14))
                    .foregroundStyle(.orange)
                Text("No Waiver")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(.orange)
            }
        }
        .task {
            await checkWaiverStatus()
        }
    }
    
    private func checkWaiverStatus() async {
        isLoading = true
        defer { isLoading = false }
        
        do {
            let db = Firestore.firestore()
            // Query the correct subcollection: users/{userId}/documents
            let documentsSnapshot = try await db.collection("users")
                .document(clientId)
                .collection("documents")
                .whereField("type", isEqualTo: "waiver")
                .getDocuments()
            
            for doc in documentsSnapshot.documents {
                let data = doc.data()
                if let docAthleteName = data["athleteName"] as? String {
                    // Normalize both names for comparison
                    let normalizedDocName = docAthleteName.trimmingCharacters(in: .whitespaces).lowercased()
                    let normalizedTargetName = athleteName.trimmingCharacters(in: .whitespaces).lowercased()
                    
                    if normalizedDocName == normalizedTargetName {
                        hasWaiver = true
                        return
                    }
                }
            }
            
            hasWaiver = false
        } catch {
            hasWaiver = false
        }
    }
}
