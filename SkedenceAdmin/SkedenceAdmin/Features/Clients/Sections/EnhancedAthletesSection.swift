//
//  EnhancedAthletesSection.swift
//  SkedenceAdmin
//
//  Enhanced athlete display with comprehensive information
//

import SwiftUI

struct EnhancedAthletesSection: View {
    let profile: UserProfile
    
    private var athletesList: [AthleteDetails] {
        var athletes: [AthleteDetails] = []
        
        // Try new format first
        if !profile.athletes.isEmpty {
            athletes = profile.athletes.map { athlete in
                AthleteDetails(
                    name: athlete.displayName,
                    birthday: athlete.birthday,
                    position: athlete.position,
                    schoolClubTeam: athlete.schoolClubTeam,
                    experienceLevel: athlete.experienceLevel
                )
            }
        } else {
            // Fall back to legacy format
            if let firstName = profile.athleteFirstName,
               let lastName = profile.athleteLastName,
               !firstName.isEmpty || !lastName.isEmpty {
                athletes.append(AthleteDetails(
                    name: "\(firstName) \(lastName)".trimmingCharacters(in: .whitespaces),
                    birthday: profile.athleteBirthday,
                    position: profile.athletePosition,
                    schoolClubTeam: profile.athleteSchoolClubTeam,
                    experienceLevel: profile.athleteExperienceLevel
                ))
            }
            
            if let firstName = profile.athlete2FirstName,
               let lastName = profile.athlete2LastName,
               !firstName.isEmpty || !lastName.isEmpty {
                athletes.append(AthleteDetails(
                    name: "\(firstName) \(lastName)".trimmingCharacters(in: .whitespaces),
                    birthday: profile.athlete2Birthday,
                    position: profile.athlete2Position,
                    schoolClubTeam: profile.athlete2SchoolClubTeam,
                    experienceLevel: profile.athlete2ExperienceLevel
                ))
            }
            
            if let firstName = profile.athlete3FirstName,
               let lastName = profile.athlete3LastName,
               !firstName.isEmpty || !lastName.isEmpty {
                athletes.append(AthleteDetails(
                    name: "\(firstName) \(lastName)".trimmingCharacters(in: .whitespaces),
                    birthday: profile.athlete3Birthday,
                    position: profile.athlete3Position,
                    schoolClubTeam: profile.athlete3SchoolClubTeam,
                    experienceLevel: profile.athlete3ExperienceLevel
                ))
            }
        }
        
        return athletes.filter { !$0.name.isEmpty }
    }
    
    var body: some View {
        Group {
            if !athletesList.isEmpty {
                CardView {
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        Text("Athletes")
                            .font(.headingSmall)
                            .foregroundStyle(AppTheme.textPrimary)
                        
                        VStack(spacing: Spacing.md) {
                            ForEach(Array(athletesList.enumerated()), id: \.offset) { index, athlete in
                                if index > 0 {
                                    Divider()
                                }
                                enhancedAthleteRow(athlete: athlete)
                            }
                        }
                    }
                }
            }
        }
    }
    
    private func enhancedAthleteRow(athlete: AthleteDetails) -> some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            // Name and Position
            HStack(spacing: Spacing.xs) {
                Image(systemName: "figure.run")
                    .font(.system(size: 16))
                    .foregroundStyle(AppTheme.primary)
                
                Text(athlete.name)
                    .font(.bodyLarge)
                    .fontWeight(.semibold)
                    .foregroundStyle(AppTheme.textPrimary)
                
                if let position = athlete.position, !position.isEmpty {
                    Text("•")
                        .foregroundStyle(AppTheme.textTertiary)
                    Text(position)
                        .font(.bodyMedium)
                        .foregroundStyle(AppTheme.textSecondary)
                }
            }
            
            VStack(alignment: .leading, spacing: Spacing.xs) {
                // Birthday
                if let birthday = athlete.birthday, !birthday.isEmpty {
                    HStack(spacing: Spacing.xs) {
                        Image(systemName: "calendar")
                            .font(.system(size: 12))
                            .foregroundStyle(AppTheme.textTertiary)
                            .frame(width: 20)
                        Text("Birthday:")
                            .font(.labelSmall)
                            .foregroundStyle(AppTheme.textSecondary)
                        Text(birthday)
                            .font(.bodySmall)
                            .foregroundStyle(AppTheme.textPrimary)
                    }
                }
                
                // School/Club/Team
                if let school = athlete.schoolClubTeam, !school.isEmpty {
                    HStack(spacing: Spacing.xs) {
                        Image(systemName: "building.2.fill")
                            .font(.system(size: 12))
                            .foregroundStyle(AppTheme.textTertiary)
                            .frame(width: 20)
                        Text("Team:")
                            .font(.labelSmall)
                            .foregroundStyle(AppTheme.textSecondary)
                        Text(school)
                            .font(.bodySmall)
                            .foregroundStyle(AppTheme.textPrimary)
                    }
                }
                
                // Experience Level
                if let experience = athlete.experienceLevel, !experience.isEmpty {
                    HStack(spacing: Spacing.xs) {
                        Image(systemName: "star.fill")
                            .font(.system(size: 12))
                            .foregroundStyle(experienceLevelColor(experience))
                            .frame(width: 20)
                        Text("Level:")
                            .font(.labelSmall)
                            .foregroundStyle(AppTheme.textSecondary)
                        Text(experience)
                            .font(.bodySmall)
                            .fontWeight(.medium)
                            .foregroundStyle(experienceLevelColor(experience))
                    }
                }
            }
            .padding(.leading, 24)
        }
    }
    
    private func experienceLevelColor(_ level: String) -> Color {
        switch level.lowercased() {
        case "beginner":
            return .orange
        case "intermediate":
            return .blue
        case "advanced":
            return .purple
        case "elite":
            return .red
        default:
            return AppTheme.textSecondary
        }
    }
}

// Helper struct for organizing athlete data
private struct AthleteDetails {
    let name: String
    let birthday: String?
    let position: String?
    let schoolClubTeam: String?
    let experienceLevel: String?
}
