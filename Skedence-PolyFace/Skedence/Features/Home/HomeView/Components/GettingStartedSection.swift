//
//  GettingStartedSection.swift
//  Skedence
//
//  Extracted from HomeView.swift - Onboarding steps section
//

import SwiftUI

struct GettingStartedSection: View {
    @Binding var selectedTab: Int
    @Binding var bookViewMode: Int
    @Binding var profileTab: String?
    @AppStorage("gettingStartedExpanded") private var isExpanded: Bool = true
    
    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Button {
                withAnimation {
                    isExpanded.toggle()
                }
            } label: {
                HStack {
                    SectionHeaderView(title: "Getting Started")
                    Spacer()
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .foregroundStyle(AppTheme.textSecondary)
                        .font(.system(size: 14, weight: .semibold))
                }
            }
            .buttonStyle(.plain)
            
            if isExpanded {
                VStack(spacing: Spacing.md) {
                    // Step 1: Purchase Passes
                    Button {
                        selectedTab = 2 // Navigate to Profile tab
                        profileTab = "PASSES" // Show passes tab
                    } label: {
                        GettingStartedStepCard(
                            stepNumber: 1,
                            title: "Purchase Passes",
                            description: "Get your passes in Profile",
                            color: AppTheme.primary,
                            icon: "arrow.right.circle.fill"
                        )
                    }
                    .buttonStyle(.plain)
                    
                    // Step 2: View Availability
                    Button {
                        selectedTab = 1 // Navigate to Book tab
                        bookViewMode = 0 // Set to lessons mode
                    } label: {
                        GettingStartedStepCard(
                            stepNumber: 2,
                            title: "View Classes and Trainer Availability",
                            description: "View trainers availability in the book tab",
                            color: AppTheme.secondary,
                            icon: "arrow.right.circle.fill"
                        )
                    }
                    .buttonStyle(.plain)
                    
                    // Step 3: Book Your Private
                    GettingStartedStepCard(
                        stepNumber: 3,
                        title: "Book Your Private!",
                        description: "Confirm your booking and you're all set",
                        color: AppTheme.success,
                        icon: "checkmark.circle.fill"
                    )
                }
            }
        }
    }
}

private struct GettingStartedStepCard: View {
    let stepNumber: Int
    let title: String
    let description: String
    let color: Color
    let icon: String
    
    var body: some View {
        CardView(padding: Spacing.md) {
            HStack(spacing: Spacing.md) {
                // Step number badge
                ZStack {
                    Circle()
                        .fill(
                            LinearGradient(
                                colors: [color, color.opacity(0.7)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 44, height: 44)
                    
                    Text("\(stepNumber)")
                        .font(.system(size: 20, weight: .bold))
                        .foregroundStyle(.white)
                }
                
                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    Text(title)
                        .font(.headingSmall)
                        .foregroundStyle(AppTheme.textPrimary)
                    
                    Text(description)
                        .font(.bodyMedium)
                        .foregroundStyle(AppTheme.textSecondary)
                }
                
                Spacer()
                
                Image(systemName: icon)
                    .font(.system(size: 24))
                    .foregroundStyle(color)
            }
        }
    }
}
