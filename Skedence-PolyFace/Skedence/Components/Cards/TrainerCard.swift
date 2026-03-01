//
//  TrainerCard.swift
//  Skedence
//
//  Phase 5.1: Reusable trainer card component with avatar and details
//

import SwiftUI

/// A card component for displaying trainer information with avatar
struct TrainerCard: View {
    let trainer: Trainer
    let onTap: (() -> Void)?
    
    init(trainer: Trainer, onTap: (() -> Void)? = nil) {
        self.trainer = trainer
        self.onTap = onTap
    }
    
    var body: some View {
        CardView(padding: Spacing.md) {
            Button {
                onTap?()
            } label: {
                HStack(spacing: Spacing.md) {
                    // Avatar
                    TrainerAvatarView(trainer: trainer, size: 48)
                    
                    // Info
                    VStack(alignment: .leading, spacing: Spacing.xxs) {
                        Text(trainer.name ?? "Unnamed")
                            .font(.headingSmall)
                            .foregroundStyle(AppTheme.textPrimary)
                        
                        // Subtitle (no specialty field on Trainer model)
                        Text("Professional Trainer")
                            .font(.bodyMedium)
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                    
                    Spacer()
                    
                    // Chevron (only if tappable)
                    if onTap != nil {
                        Image(systemName: "chevron.right.circle.fill")
                            .font(.system(size: 24))
                            .foregroundStyle(AppTheme.primary.opacity(0.3))
                    }
                }
            }
            .buttonStyle(.plain)
            .disabled(onTap == nil)
        }
    }
}

/// Reusable trainer avatar view with image loading
struct TrainerAvatarView: View {
    let trainer: Trainer?
    var size: CGFloat = 36
    
    private var cornerRadius: CGFloat { size / 2 }
    
    var body: some View {
        Group {
            if let url = trainerImageURL(from: trainer) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .empty: placeholder
                    case .success(let image): image.resizable().scaledToFill()
                    case .failure: placeholder
                    @unknown default: placeholder
                    }
                }
            } else {
                placeholder
            }
        }
        .frame(width: size, height: size)
        .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                .stroke(Color.black.opacity(0.05), lineWidth: 0.5)
        )
        .shadow(color: .black.opacity(0.04), radius: 1, x: 0, y: 1)
    }
    
    private var placeholder: some View {
        ZStack {
            Circle()
                .fill(
                    LinearGradient(
                        colors: [AppTheme.primary.opacity(0.8), AppTheme.primaryLight.opacity(0.8)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
            Image(systemName: "person.crop.circle.fill")
                .font(.system(size: size * 0.6))
                .foregroundStyle(.white)
        }
    }
    
    private func trainerImageURL(from trainer: Trainer?) -> URL? {
        guard let trainer = trainer else { return nil }
        
        // Prefer avatarUrl, then photoURL, then imageUrl
        let urlString = trainer.avatarUrl ?? trainer.photoURL ?? trainer.imageUrl
        guard let urlString, !urlString.isEmpty else { return nil }
        return URL(string: urlString)
    }
}
