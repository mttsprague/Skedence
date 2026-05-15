//
//  MyUpcomingLessonsView.swift
//  Skedence
//
//  Created by Matthew Sprague on 10/16/25.
//

import SwiftUI

enum ScheduleTab: String, CaseIterable {
    case upcoming = "Upcoming"
    case completed = "Completed"
}

struct MyUpcomingLessonsView: View {
    @EnvironmentObject var auth: AuthManager
    @ObservedObject var bookingsService: BookingsService
    @ObservedObject var trainersService: TrainersService
    @ObservedObject var classesService: ClassesService
    @StateObject private var cancellationService = CancellationService()
    @StateObject private var packagesService = PackagesService()
    @StateObject private var settingsService = SettingsService()
    
    @State private var selectedTab: ScheduleTab = .upcoming
    @State private var itemToCancel: ScheduleItem?
    @State private var showCancelAlert = false
    @State private var isCancelling = false
    @State private var cancelError: String?
    @State private var selectedBooking: Booking?
    @State private var selectedClass: GroupClass?
    @State private var packageNames: [String: String] = [:] // packageId -> packageName

    private var upcoming: [Booking] {
        let now = Date()
        return bookingsService.myBookings
            .filter { !$0.isClassBooking && ($0.startTime ?? now) >= now }
            .sorted { ($0.startTime ?? .distantFuture) < ($1.startTime ?? .distantFuture) }
    }
    
    private var upcomingClasses: [GroupClass] {
        let now = Date()
        return classesService.myRegisteredClasses
            .filter { $0.startTime >= now }
            .sorted { $0.startTime < $1.startTime }
    }
    
    private var completed: [Booking] {
        let now = Date()
        return bookingsService.myBookings
            .filter { !$0.isClassBooking && ($0.endTime ?? now) < now && $0.status != "cancelled" }
            .sorted { ($0.startTime ?? .distantPast) > ($1.startTime ?? .distantPast) }
    }
    
    private var completedClasses: [GroupClass] {
        let now = Date()
        return classesService.myRegisteredClasses
            .filter { $0.endTime < now }
            .sorted { $0.startTime > $1.startTime }
    }
    
    private var allUpcoming: [ScheduleItem] {
        var items: [ScheduleItem] = []
        items.append(contentsOf: upcoming.map { .lesson($0) })
        items.append(contentsOf: upcomingClasses.map { .classItem($0) })
        return items.sorted { $0.date < $1.date }
    }
    
    private var allCompleted: [ScheduleItem] {
        var items: [ScheduleItem] = []
        items.append(contentsOf: completed.map { .lesson($0) })
        items.append(contentsOf: completedClasses.map { .classItem($0) })
        return items.sorted { $0.date > $1.date }
    }
    
    private var displayedItems: [ScheduleItem] {
        selectedTab == .upcoming ? allUpcoming : allCompleted
    }
    
    private var groupedByDate: [Date: [ScheduleItem]] {
        Dictionary(grouping: displayedItems) { item in
            Calendar.current.startOfDay(for: item.date)
        }
    }
    
    private func dateHeader(for date: Date) -> some View {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEEE – MMM d"
        let dateString = formatter.string(from: date)
        let isToday = Calendar.current.isDateInToday(date)
        
        return HStack {
            Text(dateString)
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(isToday ? .red : .primary)
                .textCase(nil)
            Spacer()
        }
        .padding(.horizontal, 0)
        .padding(.top, 16)
        .padding(.bottom, 8)
    }    
    private func canCancelItem(_ item: ScheduleItem) -> Bool {
        // Use org settings for minimum cancellation hours
        let minHours = settingsService.settings?.minCancellationHours ?? 24
        let now = Date()
        let cancellationDeadline = now.addingTimeInterval(Double(minHours) * 60 * 60)
        return item.date > cancellationDeadline
    }
    var body: some View {
        VStack(spacing: 0) {
            // Tab Selector
            Picker("Schedule View", selection: $selectedTab) {
                ForEach(ScheduleTab.allCases, id: \.self) { tab in
                    Text(tab.rawValue).tag(tab)
                }
            }
            .pickerStyle(.segmented)
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            
            List {
                if (bookingsService.isLoading || classesService.isLoading) && displayedItems.isEmpty {
                    ProgressView()
                } else if displayedItems.isEmpty {
                    Text(selectedTab == .upcoming ? "No upcoming lessons or classes." : "No completed lessons or classes.")
                        .foregroundStyle(.secondary)
                } else {
                    ForEach(groupedByDate.keys.sorted(by: selectedTab == .upcoming ? (<) : (>)), id: \.self) { date in
                        Section {
                            ForEach(groupedByDate[date] ?? []) { item in
                                scheduleItemRow(item)
                            }
                        } header: {
                            dateHeader(for: date)
                        }
                    }
                }
            }
            .listStyle(.plain)
        }
        .navigationTitle("My Schedule")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            guard let orgId = auth.currentOrgId, let userId = auth.currentUserId else { return }
            
            // Load settings
            await settingsService.loadSettings(orgId: orgId)
            
            if trainersService.trainers.isEmpty {
                await trainersService.loadAll(orgId: orgId)
            }
            if bookingsService.myBookings.isEmpty {
                await bookingsService.loadMyBookings(orgId: orgId)
            }
            if classesService.myRegisteredClasses.isEmpty {
                await classesService.loadMyRegisteredClasses(userId: userId, orgId: orgId)
            }
            
            // Load packages to get custom names
            await packagesService.loadMyPackages(orgId: orgId)
            packageNames = Dictionary(uniqueKeysWithValues: packagesService.packages.compactMap { pkg in
                guard let id = pkg.id, let name = pkg.packageName else { return nil }
                return (id, name)
            })
        }
        .refreshable {
            guard let orgId = auth.currentOrgId, let userId = auth.currentUserId else { return }
            await bookingsService.loadMyBookings(orgId: orgId)
            await classesService.loadMyRegisteredClasses(userId: userId, orgId: orgId)
            
            // Refresh package names
            await packagesService.loadMyPackages(orgId: orgId)
            packageNames = Dictionary(uniqueKeysWithValues: packagesService.packages.compactMap { pkg in
                guard let id = pkg.id, let name = pkg.packageName else { return nil }
                return (id, name)
            })
        }
        .alert("Cancel Booking", isPresented: $showCancelAlert) {
            Button("Cancel", role: .cancel) {
                itemToCancel = nil
            }
            Button("Confirm", role: .destructive) {
                Task {
                    await handleCancellation()
                }
            }
        } message: {
            Text("Are you sure you want to cancel this booking? Your lesson credit will be returned to your account.")
        }
        .overlay {
            if isCancelling {
                ProgressView("Cancelling...")
                    .padding()
                    .background(Color(UIColor.systemBackground))
                    .cornerRadius(10)
                    .shadow(radius: 10)
            }
        }
        .alert("Cancellation Error", isPresented: Binding(
            get: { cancelError != nil },
            set: { if !$0 { cancelError = nil } }
        )) {
            Button("OK", role: .cancel) {
                cancelError = nil
            }
        } message: {
            if let error = cancelError {
                Text(error)
            }
        }
        .sheet(item: $selectedBooking) { booking in
            SessionDetailSheet(booking: booking, trainersService: trainersService)
                .presentationDetents([.large])
                .presentationDragIndicator(.visible)
        }
        .sheet(item: $selectedClass) { classItem in
            ClassDetailSheet(classItem: classItem, trainersService: trainersService)
                .presentationDetents([.large])
                .presentationDragIndicator(.visible)
        }
    }

    private func trainerName(for trainerId: String) -> String {
        trainersService.trainers.first(where: { $0.id == trainerId })?.name ?? "Trainer"
    }
    
    @ViewBuilder
    private func scheduleItemRow(_ item: ScheduleItem) -> some View {
        let isCancellable = canCancelItem(item)
        
        switch item {
        case .lesson(let booking):
            Button {
                selectedBooking = booking
            } label: {
                LessonRow(
                    booking: booking,
                    packageName: booking.lessonPackageId.flatMap { packageNames[$0] } ?? "Private Lesson",
                    trainerName: trainerName(for: booking.trainerUID),
                    isCancellable: isCancellable,
                    onCancel: { handleCancelAction(item, isCancellable, type: "Lessons") }
                )
            }
            .buttonStyle(.plain)
            .listRowModifiers(item: item, isCancellable: isCancellable, onCancel: { showCancelAlert = true; itemToCancel = item })
            
        case .classItem(let classItem):
            Button {
                selectedClass = classItem
            } label: {
                ClassRow(
                    classItem: classItem,
                    trainerName: trainerName(for: classItem.trainerId),
                    isCancellable: isCancellable,
                    onCancel: { handleCancelAction(item, isCancellable, type: "Classes") }
                )
            }
            .buttonStyle(.plain)
            .listRowModifiers(item: item, isCancellable: isCancellable, onCancel: { showCancelAlert = true; itemToCancel = item })
        }
    }
    
    private func handleCancelAction(_ item: ScheduleItem, _ isCancellable: Bool, type: String) {
        if isCancellable {
            itemToCancel = item
            showCancelAlert = true
        } else {
            // Check if the lesson/class has already occurred
            if item.date < Date() {
                cancelError = "This booking has already occurred."
            } else {
                let hours = settingsService.settings?.minCancellationHours ?? 24
                cancelError = "\(type) cannot be cancelled within \(hours) hours of the start time."
            }
        }
    }
    
    private func handleCancellation() async {
        guard let item = itemToCancel else { return }
        
        isCancelling = true
        defer { isCancelling = false }
        
        do {
            switch item {
            case .lesson(let booking):
                guard let bookingId = booking.id else {
                    cancelError = "Invalid booking ID"
                    return
                }
                try await cancellationService.cancelLesson(bookingId: bookingId)
                
            case .classItem(let classItem):
                guard let classId = classItem.id else {
                    cancelError = "Invalid class ID"
                    return
                }
                try await cancellationService.cancelClassRegistration(classId: classId)
            }
            
            // Refresh all data
            guard let orgId = auth.currentOrgId, let userId = auth.currentUserId else { return }
            await bookingsService.loadMyBookings(orgId: orgId)
            await classesService.loadMyRegisteredClasses(userId: userId, orgId: orgId)
            await packagesService.loadMyPackages()
            
            itemToCancel = nil
            
        } catch {
            cancelError = error.localizedDescription
        }
    }
}

// MARK: - View Extensions

private extension View {
    func listRowModifiers(item: ScheduleItem, isCancellable: Bool, onCancel: @escaping () -> Void) -> some View {
        self
            .listRowSeparator(.hidden)
            .listRowBackground(Color.clear)
            .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                if isCancellable {
                    Button(role: .destructive, action: onCancel) {
                        Label("Cancel", systemImage: "xmark.circle")
                    }
                }
            }
    }
}

// MARK: - Schedule Item Type

fileprivate enum ScheduleItem: Identifiable {
    case lesson(Booking)
    case classItem(GroupClass)
    
    var id: String {
        switch self {
        case .lesson(let booking): return "lesson-\(booking.id ?? "")"
        case .classItem(let classItem): return "class-\(classItem.id ?? "")"
        }
    }
    
    var date: Date {
        switch self {
        case .lesson(let booking): return booking.startTime ?? .distantFuture
        case .classItem(let classItem): return classItem.startTime
        }
    }
}

// MARK: - Supporting Views

private struct LessonRow: View {
    let booking: Booking
    let packageName: String
    let trainerName: String
    let isCancellable: Bool
    let onCancel: () -> Void

    var body: some View {
        HStack(alignment: .top, spacing: 0) {
            // Color bar on left
            Rectangle()
                .fill(Brand.primary)
                .frame(width: 4)
            
            VStack(alignment: .leading, spacing: 2) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(packageName)
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(.primary)
                        
                        HStack(spacing: 4) {
                            Image(systemName: "mappin.circle.fill")
                                .font(.system(size: 12))
                                .foregroundStyle(.secondary)
                            Text(booking.location ?? "Location TBD")
                                .font(.system(size: 14))
                                .foregroundStyle(.secondary)
                        }
                        
                        HStack(spacing: 4) {
                            Text(trainerName)
                                .font(.system(size: 14))
                                .foregroundStyle(.secondary)
                        }
                    }
                    
                    Spacer()
                    
                    VStack(alignment: .trailing, spacing: 4) {
                        // Time on right side
                        if let s = booking.startTime, let e = booking.endTime {
                            Text(s.formatted(date: .omitted, time: .shortened))
                                .font(.system(size: 14))
                                .foregroundStyle(.primary)
                            Text(e.formatted(date: .omitted, time: .shortened))
                                .font(.system(size: 14))
                                .foregroundStyle(.secondary)
                        } else {
                            Text("TBD")
                                .font(.system(size: 14))
                                .foregroundStyle(.secondary)
                        }
                        
                        // Cancel button/indicator
                        Button(action: onCancel) {
                            Image(systemName: isCancellable ? "xmark.circle.fill" : "lock.circle.fill")
                                .font(.system(size: 20))
                                .foregroundStyle(isCancellable ? .red : .gray.opacity(0.5))
                        }
                        .buttonStyle(.plain)
                        .padding(.top, 4)
                    }
                }
            }
            .padding(.leading, 12)
            .padding(.vertical, 12)
            .padding(.trailing, 16)
        }
        .background(Color.platformBackground)
    }
}
private struct ClassRow: View {
    let classItem: GroupClass
    let trainerName: String
    let isCancellable: Bool
    let onCancel: () -> Void

    var body: some View {
        HStack(alignment: .top, spacing: 0) {
            // Color bar on left - different color for classes
            Rectangle()
                .fill(Brand.secondary)
                .frame(width: 4)
            
            VStack(alignment: .leading, spacing: 2) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(classItem.title)
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(.primary)
                        
                        HStack(spacing: 4) {
                            Image(systemName: "mappin.circle.fill")
                                .font(.system(size: 12))
                                .foregroundStyle(.secondary)
                            Text(classItem.location)
                                .font(.system(size: 14))
                                .foregroundStyle(.secondary)
                        }
                        
                        HStack(spacing: 4) {
                            Text(trainerName)
                                .font(.system(size: 14))
                                .foregroundStyle(.secondary)
                        }
                    }
                    
                    Spacer()
                    
                    VStack(alignment: .trailing, spacing: 4) {
                        // Time on right side
                        Text(classItem.startTime.formatted(date: .omitted, time: .shortened))
                            .font(.system(size: 14))
                            .foregroundStyle(.primary)
                        Text(classItem.endTime.formatted(date: .omitted, time: .shortened))
                            .font(.system(size: 14))
                            .foregroundStyle(.secondary)
                        
                        // Cancel button/indicator
                        Button(action: onCancel) {
                            Image(systemName: isCancellable ? "xmark.circle.fill" : "lock.circle.fill")
                                .font(.system(size: 20))
                                .foregroundStyle(isCancellable ? .red : .gray.opacity(0.5))
                        }
                        .buttonStyle(.plain)
                        .padding(.top, 4)
                    }
                }
            }
            .padding(.leading, 12)
            .padding(.vertical, 12)
            .padding(.trailing, 16)
        }
        .background(Color.platformBackground)
    }
}

// MARK: - Class Detail Sheet

private struct ClassDetailSheet: View {
    let classItem: GroupClass
    @ObservedObject var trainersService: TrainersService
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                HStack {
                    Spacer()
                    Button { dismiss() } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 28))
                            .foregroundStyle(.tertiary)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 8)
                
                Text("Class Details")
                    .font(.system(size: 28, weight: .bold))
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 16)
                
                VStack(alignment: .leading, spacing: 16) {
                    Text(classItem.title)
                        .font(.system(size: 20, weight: .semibold))
                    
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Image(systemName: "calendar").frame(width: 20)
                            Text(classItem.startTime.formatted(date: .long, time: .omitted))
                        }
                        HStack {
                            Image(systemName: "clock").frame(width: 20)
                            Text("\(classItem.startTime.formatted(date: .omitted, time: .shortened)) - \(classItem.endTime.formatted(date: .omitted, time: .shortened))")
                        }
                        HStack {
                            Image(systemName: "person.fill").frame(width: 20)
                            Text(trainersService.trainers.first(where: { $0.id == classItem.trainerId })?.name ?? "Trainer")
                        }
                        HStack {
                            Image(systemName: "mappin.circle.fill").frame(width: 20)
                            Text(classItem.location)
                        }
                        HStack {
                            Image(systemName: "person.3.fill").frame(width: 20)
                            Text("\(classItem.currentParticipants)/\(classItem.maxParticipants) participants")
                        }
                    }
                    .font(.system(size: 14))
                }
                .padding(16)
                .background(Color(UIColor.secondarySystemGroupedBackground))
                .cornerRadius(12)
                .padding(.horizontal, 16)
                
                if !classItem.description.isEmpty {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("About This Class")
                            .font(.system(size: 18, weight: .semibold))
                        Text(classItem.description)
                            .font(.system(size: 14))
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(16)
                    .background(Color(UIColor.secondarySystemGroupedBackground))
                    .cornerRadius(12)
                    .padding(.horizontal, 16)
                }
            }
            .padding(.vertical, 8)
        }
        .background(Color(UIColor.systemGroupedBackground))
    }
}
