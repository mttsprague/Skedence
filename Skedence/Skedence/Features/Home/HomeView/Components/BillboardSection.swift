//
//  BillboardSection.swift
//  Skedence
//
//  Billboard component for displaying announcements on home screen
//

import SwiftUI

struct BillboardSection: View {
    let message: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            // Section Header
            HStack(spacing: Spacing.sm) {
                Image(systemName: "megaphone.fill")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(AppTheme.primary)
                
                Text("Announcement")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(.primary)
                
                Spacer()
            }
            .padding(.horizontal, Spacing.lg)
            .padding(.top, Spacing.xs)
            
            // Billboard Card
            VStack(alignment: .leading, spacing: 0) {
                // Decorative Top Bar
                Rectangle()
                    .fill(
                        LinearGradient(
                            gradient: Gradient(colors: [
                                AppTheme.primary,
                                AppTheme.primary.opacity(0.8)
                            ]),
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .frame(height: 4)
                
                // Message Content
                HStack(alignment: .top, spacing: Spacing.md) {
                    // Icon
                    ZStack {
                        Circle()
                            .fill(AppTheme.primary.opacity(0.1))
                            .frame(width: 40, height: 40)
                        
                        Image(systemName: "megaphone.fill")
                            .font(.system(size: 18))
                            .foregroundColor(AppTheme.primary)
                    }
                    
                    // Message Text
                    Text(message)
                        .font(.system(size: 15, weight: .regular))
                        .foregroundColor(.primary)
                        .lineSpacing(4)
                        .fixedSize(horizontal: false, vertical: true)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                .padding(Spacing.lg)
            }
            .background(Color.platformBackground)
            .cornerRadius(CornerRadius.lg)
            .shadow(
                color: AppTheme.primary.opacity(0.08),
                radius: 8,
                x: 0,
                y: 2
            )
            .overlay(
                RoundedRectangle(cornerRadius: CornerRadius.lg)
                    .stroke(AppTheme.primary.opacity(0.15), lineWidth: 1)
            )
            .padding(.horizontal, Spacing.lg)
        }
    }
}

#Preview {
    VStack(spacing: Spacing.xl) {
        BillboardSection(message: "Holiday Hours: We will be closed December 24-26. Happy Holidays!")
        
        BillboardSection(message: "New class schedules are now available! Check out our expanded evening offerings.")
        
        BillboardSection(message: "📣 Special: Book 10 sessions and get 1 free! Offer ends this month.")
    }
    .padding()
    .background(Color.platformGroupedBackground)
}
