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
    @State private var userProfile: UserProfile?
    @State private var isLoadingProfile = false
    @State private var requiredFields: Set<String> = []
    
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
                    
                    // Client profile information
                    if let profile = userProfile {
                        clientProfileCard(profile: profile)
                    }
                    
                    // Session-specific notes (filled out during booking)
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
            .task {
                await loadUserProfile()
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
                    } else if let athleteName = booking.athleteName, !athleteName.isEmpty {
                        // Legacy format: display first athlete
                        athleteDetailSection(
                            name: athleteName,
                            birthday: client.athleteBirthday,
                            schoolClubTeam: client.athleteSchoolClubTeam,
                            experienceLevel: client.athleteExperienceLevel,
                            position: client.athletePosition
                        )
                        
                        // Second athlete if exists
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
                    } else {
                        // No athlete data stored in booking (older bookings)
                        Text("Participant information not available for this booking")
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
    
    // Helper methods to get athlete data by name with fallback to index
    private func getAthleteBirthday(at index: Int) -> String? {
        // Try to match by name first if athleteNames array exists
        if let athleteNames = booking.athleteNames, index < athleteNames.count {
            let athleteName = athleteNames[index]
            let data = getAthleteData(for: athleteName, fallbackIndex: index)
            return data.birthday
        }
        // Fallback to index-based matching
        return getAthleteDataByIndex(index).birthday
    }
    
    private func getAthleteSchoolClubTeam(at index: Int) -> String? {
        if let athleteNames = booking.athleteNames, index < athleteNames.count {
            let athleteName = athleteNames[index]
            let data = getAthleteData(for: athleteName, fallbackIndex: index)
            return data.schoolClubTeam
        }
        return getAthleteDataByIndex(index).schoolClubTeam
    }
    
    private func getAthleteExperienceLevel(at index: Int) -> String? {
        if let athleteNames = booking.athleteNames, index < athleteNames.count {
            let athleteName = athleteNames[index]
            let data = getAthleteData(for: athleteName, fallbackIndex: index)
            return data.experienceLevel
        }
        return getAthleteDataByIndex(index).experienceLevel
    }
    
    private func getAthletePosition(at index: Int) -> String? {
        if let athleteNames = booking.athleteNames, index < athleteNames.count {
            let athleteName = athleteNames[index]
            let data = getAthleteData(for: athleteName, fallbackIndex: index)
            return data.position
        }
        return getAthleteDataByIndex(index).position
    }
    
    // Match athlete name to client data with fallback to index
    private func getAthleteData(for name: String, fallbackIndex: Int) -> (birthday: String?, schoolClubTeam: String?, experienceLevel: String?, position: String?) {
        let normalizedName = name.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        
        // Check if it matches athlete 1
        if let athlete1Name = client.athleteFullName?.trimmingCharacters(in: .whitespacesAndNewlines).lowercased(),
           athlete1Name == normalizedName {
            return (client.athleteBirthday, client.athleteSchoolClubTeam, client.athleteExperienceLevel, client.athletePosition)
        }
        
        // Check if it matches athlete 2
        if let athlete2Name = client.athlete2FullName?.trimmingCharacters(in: .whitespacesAndNewlines).lowercased(),
           athlete2Name == normalizedName {
            return (client.athlete2Birthday, client.athlete2SchoolClubTeam, client.athlete2ExperienceLevel, client.athlete2Position)
        }
        
        // Check if it matches athlete 3
        if let athlete3Name = client.athlete3FullName?.trimmingCharacters(in: .whitespacesAndNewlines).lowercased(),
           athlete3Name == normalizedName {
            return (client.athlete3Birthday, client.athlete3SchoolClubTeam, client.athlete3ExperienceLevel, client.athlete3Position)
        }
        
        // No match found by name, fall back to index-based matching
        return getAthleteDataByIndex(fallbackIndex)
    }
    
    // Get athlete data by index position (fallback method)
    private func getAthleteDataByIndex(_ index: Int) -> (birthday: String?, schoolClubTeam: String?, experienceLevel: String?, position: String?) {
        switch index {
        case 0:
            return (client.athleteBirthday, client.athleteSchoolClubTeam, client.athleteExperienceLevel, client.athletePosition)
        case 1:
            return (client.athlete2Birthday, client.athlete2SchoolClubTeam, client.athlete2ExperienceLevel, client.athlete2Position)
        case 2:
            return (client.athlete3Birthday, client.athlete3SchoolClubTeam, client.athlete3ExperienceLevel, client.athlete3Position)
        default:
            return (nil, nil, nil, nil)
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
    
    // MARK: - Client Profile Card
    private func clientProfileCard(profile: UserProfile) -> some View {
        CardView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Client Information")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(AppTheme.textPrimary)
                
                VStack(alignment: .leading, spacing: 12) {
                    // Emergency Contact (only if required)
                    if requiredFields.contains("emergencyContactName") && (!profile.emergencyContactName.isEmpty || !profile.emergencyContactNumber.isEmpty) {
                        HStack(spacing: 8) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .font(.system(size: 14))
                                .foregroundStyle(AppTheme.secondary)
                                .frame(width: 20)
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Emergency Contact")
                                    .font(.system(size: 13, weight: .medium))
                                    .foregroundStyle(AppTheme.textSecondary)
                                if !profile.emergencyContactName.isEmpty {
                                    Text(profile.emergencyContactName)
                                        .font(.system(size: 14))
                                        .foregroundStyle(AppTheme.textPrimary)
                                }
                                if !profile.emergencyContactNumber.isEmpty {
                                    Text(profile.emergencyContactNumber)
                                        .font(.system(size: 14))
                                        .foregroundStyle(AppTheme.textPrimary)
                                }
                            }
                        }
                    }
                    
                    // Phone Number (only if required)
                    if requiredFields.contains("phoneNumber") && !profile.phoneNumber.isEmpty {
                        Divider()
                            .padding(.vertical, 4)
                        HStack(spacing: 8) {
                            Image(systemName: "phone.fill")
                                .font(.system(size: 14))
                                .foregroundStyle(AppTheme.secondary)
                                .frame(width: 20)
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Phone Number")
                                    .font(.system(size: 13, weight: .medium))
                                    .foregroundStyle(AppTheme.textSecondary)
                                Text(profile.phoneNumber)
                                    .font(.system(size: 14))
                                    .foregroundStyle(AppTheme.textPrimary)
                            }
                        }
                    }
                    
                    // Referral Source (only if required)
                    if requiredFields.contains("referredBy"), let referredBy = profile.referredBy, !referredBy.isEmpty {
                        Divider()
                            .padding(.vertical, 4)
                        HStack(spacing: 8) {
                            Image(systemName: "person.2.fill")
                                .font(.system(size: 14))
                                .foregroundStyle(AppTheme.secondary)
                                .frame(width: 20)
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Referred By")
                                    .font(.system(size: 13, weight: .medium))
                                    .foregroundStyle(AppTheme.textSecondary)
                                Text(referredBy)
                                    .font(.system(size: 14))
                                    .foregroundStyle(AppTheme.textPrimary)
                            }
                        }
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(16)
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
            .frame(height: 56) // Preserve the fixed height from the previous local style
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
    
    // MARK: - Load User Profile
    private func loadUserProfile() async {
        guard !client.id.isEmpty else { return }
        isLoadingProfile = true
        defer { isLoadingProfile = false }
        
        do {
            let db = Firestore.firestore()
            
            // Load org settings to get required fields
            if let orgId = auth.currentOrgId {
                let orgDoc = try await db.collection("organizations").document(orgId).getDocument()
                if let orgData = orgDoc.data(),
                   let fields = orgData["intakeFormFieldsPrivate"] as? [[String: Any]] {
                    requiredFields = Set(fields.filter { ($0["required"] as? Bool) == true }
                        .compactMap { $0["id"] as? String })
                }
            }
            
            let userDoc = try await db.collection("users")
                .document(client.id)
                .getDocument()
            
            guard let data = userDoc.data() else { return }
            
            // Parse athletes array
            var athletesArray: [AthleteInfo] = []
            if let athletesData = data["athletes"] as? [[String: Any]] {
                for athleteData in athletesData {
                    if let athlete = try? AthleteInfo(from: athleteData) {
                        athletesArray.append(athlete)
                    }
                }
            }
            
            userProfile = UserProfile(
                id: userDoc.documentID,
                emailAddress: data["emailAddress"] as? String ?? "",
                firstName: data["firstName"] as? String ?? "",
                lastName: data["lastName"] as? String ?? "",
                phoneNumber: data["phoneNumber"] as? String ?? "",
                emergencyContactName: data["emergencyContactName"] as? String ?? "",
                emergencyContactNumber: data["emergencyContactNumber"] as? String ?? "",
                referredBy: data["referredBy"] as? String,
                notesForCoach: data["notesForCoach"] as? String,
                athletes: athletesArray
            )
        } catch {
            print("Error loading user profile: \(error.localizedDescription)")
        }
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
