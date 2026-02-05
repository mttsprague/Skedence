//
//  BookingInstructionsSheet.swift
//  Skedence
//
//  Extracted from BookView.swift - Booking instructions UI
//

import SwiftUI

struct BookingInstructionsSheet: View {
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: Spacing.xl) {
                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        Text("How to Book a Lesson")
                            .font(.headingLarge)
                            .foregroundStyle(AppTheme.textPrimary)
                        Text("Follow these simple steps to schedule your private")
                            .font(.bodyLarge)
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                    .padding(.horizontal, Spacing.lg)
                    
                    VStack(spacing: Spacing.lg) {
                        InstructionStepCard(
                            stepNumber: 1,
                            icon: "person.circle.fill",
                            title: "Select Your Trainer",
                            description: "Choose from our professional trainers. Tap the trainer card to see all available options.",
                            color: AppTheme.primary
                        )
                        
                        InstructionStepCard(
                            stepNumber: 2,
                            icon: "calendar",
                            title: "Choose a Date",
                            description: "Browse the calendar and select a day that works for you. Available dates are highlighted.",
                            color: AppTheme.secondary
                        )
                        
                        InstructionStepCard(
                            stepNumber: 3,
                            icon: "clock.fill",
                            title: "Pick Your Time",
                            description: "Select from available time slots. Each slot shows the duration and start time.",
                            color: AppTheme.primary
                        )
                        
                        InstructionStepCard(
                            stepNumber: 4,
                            icon: "checkmark.circle.fill",
                            title: "Confirm Booking",
                            description: "Review your selection and tap 'Book Lesson'. Your private will be confirmed instantly.",
                            color: AppTheme.success
                        )
                    }
                    .padding(.horizontal, Spacing.lg)
                    
                    CardView(padding: Spacing.md) {
                        HStack(spacing: Spacing.sm) {
                            Image(systemName: "info.circle.fill")
                                .font(.system(size: 20))
                                .foregroundStyle(AppTheme.primary)
                            VStack(alignment: .leading, spacing: Spacing.xxs) {
                                Text("Need Lessons?")
                                    .font(.headingSmall)
                                    .foregroundStyle(AppTheme.textPrimary)
                                Text("Purchase lesson packages from the Profile tab before booking.")
                                    .font(.bodyMedium)
                                    .foregroundStyle(AppTheme.textSecondary)
                            }
                        }
                    }
                    .padding(.horizontal, Spacing.lg)
                }
                .padding(.vertical, Spacing.xl)
            }
            .background(Color.platformGroupedBackground.ignoresSafeArea())
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
        }
    }
}

private struct InstructionStepCard: View {
    let stepNumber: Int
    let icon: String
    let title: String
    let description: String
    let color: Color
    
    var body: some View {
        CardView(padding: Spacing.md) {
            HStack(alignment: .top, spacing: Spacing.md) {
                ZStack {
                    Circle()
                        .fill(
                            LinearGradient(
                                colors: [color, color.opacity(0.7)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 56, height: 56)
                    
                    VStack(spacing: 2) {
                        Image(systemName: icon)
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundStyle(.white)
                        Text("\(stepNumber)")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(.white.opacity(0.9))
                    }
                }
                
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text(title)
                        .font(.headingSmall)
                        .foregroundStyle(AppTheme.textPrimary)
                    Text(description)
                        .font(.bodyMedium)
                        .foregroundStyle(AppTheme.textSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: 0)
            }
        }
    }
}
