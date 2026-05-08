//
//  UpcomingClassesSection.swift
//  Skedence
//
//  Phase 6.2: Refactored to use LoadableView pattern
//

import SwiftUI

struct UpcomingClassesSection: View {
    @ObservedObject var classesService: ClassesService
    @Binding var bookViewMode: Int
    @Binding var selectedTab: Int
    @Binding var selectedClassId: String?
    @ObservedObject var pricingService: PricingStructureService
    
    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            SectionHeaderView(title: "Upcoming Classes")
            
            // Phase 6.2: Convert service state to LoadingState
            let loadingState: LoadingState<[GroupClass]> = {
                if classesService.isLoading && classesService.upcomingClasses.isEmpty {
                    return .loading
                } else if let error = classesService.error {
                    return .failure(error)
                } else {
                    return .success(classesService.upcomingClasses)
                }
            }()
            
            LoadableView(
                state: loadingState,
                emptyMessage: "No upcoming classes"
            ) { classes in
                if classes.isEmpty {
                    // Custom empty state for classes
                    CardView(padding: Spacing.lg) {
                        VStack(spacing: Spacing.sm) {
                            Image(systemName: "calendar.badge.clock")
                                .font(.system(size: 40))
                                .foregroundStyle(AppTheme.textTertiary)
                            Text("No upcoming classes")
                                .font(.bodyMedium)
                                .foregroundStyle(AppTheme.textSecondary)
                            Text("Check back soon for new class schedules")
                                .font(.labelSmall)
                                .foregroundStyle(AppTheme.textTertiary)
                                .multilineTextAlignment(.center)
                        }
                        .frame(maxWidth: .infinity)
                    }
                } else {
                    VStack(spacing: Spacing.sm) {
                        ForEach(classes) { groupClass in
                            Button {
                                selectedClassId = groupClass.id
                                bookViewMode = 1
                                selectedTab = 1
                            } label: {
                                ClassPreviewRow(
                                    groupClass: groupClass,
                                    classesService: classesService,
                                    pricingService: pricingService
                                )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
        }
    }
}
