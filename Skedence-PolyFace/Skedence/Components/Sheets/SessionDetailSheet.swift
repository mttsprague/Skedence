//
//  SessionDetailSheet.swift
//  Skedence
//
//  Client-facing session details sheet for viewing booking information
//

import SwiftUI
import FirebaseAuth
import FirebaseFirestore

struct SessionDetailSheet: View {
    let booking: Booking
    @ObservedObject var trainersService: TrainersService
    
    @Environment(\.dismiss) private var dismiss
    @State private var userProfile: UserProfile?
    @State private var isLoadingProfile = false
    
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
                
                // Client profile information
                if let profile = userProfile {
                    profileInformationCard(profile: profile)
                }
                
                // Lesson notes
                if let notes = booking.lessonNotes, !notes.isEmpty {
                    lessonNotesCard(notes: notes)
                }
            }
            .padding(.vertical, 8)
        }
        .background(Color(UIColor.systemGroupedBackground))
        .task {
            await loadUserProfile()
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
                        Text(displayStatus)
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
                    // Use athleteNames array if available (supports 3+ athletes),
                    // otherwise fall back to individual fields for backward compatibility
                    let names: [String] = {
                        if let arr = booking.athleteNames, !arr.isEmpty {
                            return arr
                        }
                        var fallback: [String] = []
                        if let n = booking.athleteName, !n.isEmpty { fallback.append(n) }
                        if let n = booking.secondAthleteName, !n.isEmpty { fallback.append(n) }
                        return fallback
                    }()
                    
                    if names.isEmpty {
                        Text("Participant information not available")
                            .font(.system(size: 14))
                            .foregroundStyle(AppTheme.textSecondary)
                            .padding(.vertical, 8)
                    } else {
                        ForEach(Array(names.enumerated()), id: \.offset) { index, name in
                            if index > 0 {
                                Divider()
                                    .padding(.vertical, 4)
                            }
                            athleteSection(name: name)
                        }
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
    
    // MARK: - Profile Information Card
    private func profileInformationCard(profile: UserProfile) -> some View {
        CardView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Your Information")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(AppTheme.textPrimary)
                
                VStack(alignment: .leading, spacing: 12) {
                    // Emergency Contact
                    if let emergencyName = profile.emergencyContactName, !emergencyName.isEmpty,
                       let emergencyNumber = profile.emergencyContactNumber, !emergencyNumber.isEmpty {
                        HStack(spacing: 8) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .font(.system(size: 14))
                                .foregroundStyle(AppTheme.primary)
                                .frame(width: 20)
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Emergency Contact")
                                    .font(.system(size: 13, weight: .medium))
                                    .foregroundStyle(AppTheme.textSecondary)
                                Text(emergencyName)
                                    .font(.system(size: 14))
                                    .foregroundStyle(AppTheme.textPrimary)
                                Text(emergencyNumber)
                                    .font(.system(size: 14))
                                    .foregroundStyle(AppTheme.textPrimary)
                            }
                        }
                    }
                    
                    // Phone Number
                    if let phone = profile.phoneNumber, !phone.isEmpty {
                        if profile.emergencyContactName != nil {
                            Divider()
                                .padding(.vertical, 4)
                        }
                        HStack(spacing: 8) {
                            Image(systemName: "phone.fill")
                                .font(.system(size: 14))
                                .foregroundStyle(AppTheme.primary)
                                .frame(width: 20)
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Phone Number")
                                    .font(.system(size: 13, weight: .medium))
                                    .foregroundStyle(AppTheme.textSecondary)
                                Text(phone)
                                    .font(.system(size: 14))
                                    .foregroundStyle(AppTheme.textPrimary)
                            }
                        }
                    }
                    
                    // Notes for Coach
                    if let notes = profile.notesForCoach, !notes.isEmpty {
                        Divider()
                            .padding(.vertical, 4)
                        HStack(alignment: .top, spacing: 8) {
                            Image(systemName: "note.text")
                                .font(.system(size: 14))
                                .foregroundStyle(AppTheme.primary)
                                .frame(width: 20)
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Notes for Coach")
                                    .font(.system(size: 13, weight: .medium))
                                    .foregroundStyle(AppTheme.textSecondary)
                                Text(notes)
                                    .font(.system(size: 14))
                                    .foregroundStyle(AppTheme.textPrimary)
                                    .fixedSize(horizontal: false, vertical: true)
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
    
    // MARK: - Load User Profile
    private func loadUserProfile() async {
        guard let currentUser = Auth.auth().currentUser else { return }
        isLoadingProfile = true
        defer { isLoadingProfile = false }
        
        do {
            let db = Firestore.firestore()
            let userDoc = try await db.collection("users")
                .document(currentUser.uid)
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
                emailAddress: data["emailAddress"] as? String,
                firstName: data["firstName"] as? String,
                lastName: data["lastName"] as? String,
                phoneNumber: data["phoneNumber"] as? String,
                emergencyContactName: data["emergencyContactName"] as? String,
                emergencyContactNumber: data["emergencyContactNumber"] as? String,
                referredBy: data["referredBy"] as? String,
                notesForCoach: data["notesForCoach"] as? String,
                athletes: athletesArray
            )
        } catch {
            print("Error loading user profile: \(error.localizedDescription)")
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
        let count: Int
        if let names = booking.athleteNames, !names.isEmpty {
            count = names.count
        } else {
            var c = 1
            if let second = booking.secondAthleteName, !second.isEmpty { c = 2 }
            count = c
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
        // If lesson is in the past, treat as completed regardless of stored status
        if let endTime = booking.endTime, endTime < Date() {
            return "flag.checkered"
        }
        
        switch booking.status.lowercased() {
        case "confirmed": return "checkmark.circle.fill"
        case "cancelled": return "xmark.circle.fill"
        case "completed": return "flag.checkered"
        default: return "circle.fill"
        }
    }
    
    private var statusColor: Color {
        // If lesson is in the past, treat as completed regardless of stored status
        if let endTime = booking.endTime, endTime < Date() {
            return AppTheme.primary
        }
        
        switch booking.status.lowercased() {
        case "confirmed": return AppTheme.success
        case "cancelled": return AppTheme.error
        case "completed": return AppTheme.primary
        default: return AppTheme.textSecondary
        }
    }
    
    private var displayStatus: String {
        // If lesson is in the past, show as "Completed" regardless of stored status
        if let endTime = booking.endTime, endTime < Date() {
            return "Completed"
        }
        
        return booking.status.capitalized
    }
}
