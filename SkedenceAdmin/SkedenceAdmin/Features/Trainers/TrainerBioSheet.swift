//
//  TrainerBioSheet.swift
//  SkedenceAdmin
//
//  Professional trainer bio display for More tab
//

import SwiftUI

struct TrainerBioSheet: View {
    @Environment(\.dismiss) var dismiss
    let trainer: Trainer
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Spacing.lg) {
                    // Header with Avatar and Name
                    VStack(spacing: Spacing.md) {
                        TrainerAvatarView(trainer: trainer, size: 80)
                        
                        Text(trainer.displayName)
                            .font(.system(size: 24, weight: .bold))
                            .foregroundStyle(AppTheme.textPrimary)
                        
                        if let email = trainer.email {
                            Text(email)
                                .font(.bodySmall)
                                .foregroundStyle(AppTheme.textSecondary)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.top, Spacing.lg)
                    
                    Divider()
                        .padding(.horizontal, Spacing.lg)
                    
                    // Bio Content
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        Text("About")
                            .font(.headingMedium)
                            .foregroundStyle(AppTheme.textPrimary)
                        
                        if let bio = trainer.trainerDescription, !bio.isEmpty {
                            Text(bio)
                                .font(.bodyMedium)
                                .foregroundStyle(AppTheme.textSecondary)
                                .lineSpacing(6)
                        } else {
                            Text("No bio available")
                                .font(.bodyMedium)
                                .foregroundStyle(AppTheme.textTertiary)
                                .italic()
                        }
                    }
                    .padding(.horizontal, Spacing.lg)
                    
                    Spacer(minLength: 40)
                }
            }
            .background(Color.platformBackground)
            .navigationTitle("Trainer Bio")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                    .foregroundStyle(AppTheme.primary)
                }
            }
        }
    }
}

// Reusable Trainer Avatar View
struct TrainerAvatarView: View {
    let trainer: Trainer
    let size: CGFloat
    
    var body: some View {
        Group {
            if let urlString = trainer.anyPhotoURLString,
               let url = URL(string: urlString),
               !urlString.isEmpty {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .scaledToFill()
                            .frame(width: size, height: size)
                            .clipShape(Circle())
                    case .failure(_):
                        DefaultTrainerAvatar(trainer: trainer, size: size)
                    case .empty:
                        ProgressView()
                            .frame(width: size, height: size)
                    @unknown default:
                        DefaultTrainerAvatar(trainer: trainer, size: size)
                    }
                }
            } else {
                DefaultTrainerAvatar(trainer: trainer, size: size)
            }
        }
    }
}

// Default Avatar with Initials
struct DefaultTrainerAvatar: View {
    let trainer: Trainer
    let size: CGFloat
    
    var initials: String {
        let first = trainer.firstName?.prefix(1).uppercased() ?? ""
        let last = trainer.lastName?.prefix(1).uppercased() ?? ""
        return first + last
    }
    
    var body: some View {
        Circle()
            .fill(AppTheme.primary.opacity(0.1))
            .frame(width: size, height: size)
            .overlay {
                Text(initials)
                    .font(.system(size: size * 0.4, weight: .semibold))
                    .foregroundStyle(AppTheme.primary)
            }
    }
}

#Preview {
    TrainerBioSheet(trainer: Trainer(
        id: "1",
        firstName: "John",
        lastName: "Smith",
        email: "john@example.com",
        trainerDescription: "Experienced volleyball coach with 10 years of training athletes at all levels."
    ))
}
