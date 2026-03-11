//
//  ClassCard.swift
//  Skedence
//
//  Phase 5.1: Extracted from BookView.swift - Reusable class card component
//

import SwiftUI

/// A card component for displaying group class information with registration status
struct ClassCard: View {
    let classItem: GroupClass
    let onTap: () -> Void
    @ObservedObject var classesService: ClassesService
    @State private var isRegistered = false
    @State private var seriesClasses: [GroupClass] = []
    
    var body: some View {
        Button(action: onTap) {
            CardView {
                VStack(alignment: .leading, spacing: Spacing.lg) {
                    // Header with title and registration badge
                    HStack(alignment: .top) {
                        VStack(alignment: .leading, spacing: Spacing.xs) {
                            Text(classItem.title)
                                .font(.headingMedium)
                                .foregroundStyle(AppTheme.secondary)
                                .fontWeight(.semibold)
                            if isRegistered {
                                BadgeView(text: "✓ You're Registered", color: AppTheme.success)
                            }
                            // Show multi-day indicator
                            if classItem.isPartOfSeries == true, let total = classItem.totalSeriesClasses {
                                BadgeView(text: "\(total)-Day Series", color: AppTheme.secondary)
                            }
                        }
                        Spacer()
                        if !isRegistered {
                            if classItem.isFull {
                                BadgeView(text: "Full", color: AppTheme.error)
                            } else {
                                BadgeView(text: "\(classItem.spotsRemaining) spots left", color: AppTheme.success)
                            }
                        }
                    }
                    
                    // Description
                    Text(classItem.description)
                        .font(.bodyMedium)
                        .foregroundStyle(AppTheme.textSecondary)
                        .lineLimit(3)
                        .fixedSize(horizontal: false, vertical: true)
                    
                    Divider()
                    
                    // Class details
                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        // Show all dates if multi-day series
                        if classItem.isPartOfSeries == true && !seriesClasses.isEmpty {
                            DetailRow(
                                icon: "calendar",
                                text: formatSeriesDates(seriesClasses)
                            )
                            DetailRow(
                                icon: "clock",
                                text: formatSeriesTimes(seriesClasses)
                            )
                        } else {
                            // Single day class
                            DetailRow(icon: "calendar", text: classItem.startTime.formatted(date: .abbreviated, time: .omitted))
                            DetailRow(icon: "clock", text: classItem.startTime.formatted(date: .omitted, time: .shortened))
                        }
                        DetailRow(icon: "mappin.circle", text: classItem.location)
                        DetailRow(icon: "person.fill", text: classItem.trainerName)
                    }
                    
                    // Register button (only shown if not registered)
                    if !isRegistered {
                        Divider()
                        Button(action: onTap) {
                            HStack {
                                Image(systemName: "person.badge.plus")
                                Text("Register").fontWeight(.semibold)
                            }
                            .font(.bodyMedium)
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, Spacing.sm)
                            .background(AppTheme.primary)
                            .cornerRadius(CornerRadius.sm)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
        .buttonStyle(.plain)
        .task(id: classesService.registrationChangeToken) {
            if let id = classItem.id {
                isRegistered = await classesService.isRegistered(for: id)
            } else {
                isRegistered = false
            }
            
            // Load all classes in the series if this is a multi-day class
            if classItem.isPartOfSeries == true, let seriesId = classItem.seriesId {
                await loadSeriesClasses(seriesId)
            }
        }
    }
    
    // MARK: - Helper Methods
    
    /// Load all classes in the series for displaying multiple dates
    private func loadSeriesClasses(_ seriesId: String) async {
        // Get all classes with this seriesId from the service's loaded classes
        let allClasses = classesService.classes.filter { cls in
            cls.seriesId == seriesId
        }
        
        // Sort by start time to show in chronological order
        seriesClasses = allClasses.sorted { $0.startTime < $1.startTime }
    }
    
    /// Format series dates as "Mon 3/10, Tue 3/11, Wed 3/12"
    private func formatSeriesDates(_ classes: [GroupClass]) -> String {
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "EEE M/d" // "Mon 3/10"
        
        let dates = classes.map { dateFormatter.string(from: $0.startTime) }
        return dates.joined(separator: ", ")
    }
    
    /// Format series times as "9:00 AM - 10:00 AM" (assumes same time each day)
    private func formatSeriesTimes(_ classes: [GroupClass]) -> String {
        guard let firstClass = classes.first else { return "" }
        
        let timeFormatter = DateFormatter()
        timeFormatter.dateFormat = "h:mm a"
        
        let startTime = timeFormatter.string(from: firstClass.startTime)
        let endTime = timeFormatter.string(from: firstClass.endTime)
        
        return "\(startTime) - \(endTime)"
    }
}

/// Helper view for icon + text detail rows
private struct DetailRow: View {
    let icon: String
    let text: String
    
    var body: some View {
        HStack(spacing: Spacing.sm) {
            Image(systemName: icon)
                .font(.bodyMedium)
                .foregroundStyle(AppTheme.secondary)
                .frame(width: 20)
            Text(text)
                .font(.bodyMedium)
                .foregroundStyle(AppTheme.textPrimary)
        }
    }
}
