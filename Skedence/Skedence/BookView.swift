//
//  BookView.swift
//  Skedence
//
//  Created by Matthew Sprague on 10/14/25.
//


import SwiftUI
import StripePaymentSheet
import FirebaseAuth

struct BookView: View {
    @EnvironmentObject var auth: AuthManager
    // Removed subscription status - clients don't need to check this
    @ObservedObject var trainersService: TrainersService
    @ObservedObject var scheduleService: ScheduleService
    @ObservedObject var packagesService: PackagesService
    @ObservedObject var usersService: UsersService
    @StateObject private var bookingManager = BookingManager()
    @StateObject private var classesService = ClassesService()
    @StateObject private var settingsService = SettingsService()
    @StateObject private var pricingService = PricingStructureService()
    
    @Binding var initialMode: Int
    @Binding var selectedTab: Int
    @Binding var profileTab: String?

    @State private var mode: Mode = .lessons
    @State private var selectedTrainer: Trainer?
    @State private var monthStart: Date = Date().startOfMonth()
    @State private var selectedDate: Date = Date()
    @State private var selectedSlot: AvailabilitySlot?
    @State private var bookingInFlight = false
    @State private var bookingAlert: BookingAlert?
    @State private var selectedClass: GroupClass?
    @State private var showingClassRegistration = false
    @State private var selectedPackage: LessonPackage?
    @State private var showSubscriptionSheet = false
    @State private var showBookingInstructions = false

    enum Mode: String, CaseIterable { case lessons = "Lessons", classes = "Classes" }

    // Jeff-first ordering for the menu
    private var trainersOrdered: [Trainer] {
        trainersService.trainers.sorted { lhs, rhs in
            let lhsPriority = isJeff(lhs) ? 0 : 1
            let rhsPriority = isJeff(rhs) ? 0 : 1
            if lhsPriority != rhsPriority { return lhsPriority < rhsPriority }
            let ln = lhs.name ?? ""
            let rn = rhs.name ?? ""
            return ln.localizedCaseInsensitiveCompare(rn) == .orderedAscending
        }
    }
    
    // Get available lesson packages (excluding class passes)
    private var availableLessonPackages: [LessonPackage] {
        let now = Date()
        
        // Get all valid package types from current pricing structure
        let validPackageTypes = getCurrentPackageTypes(category: "pass")
        
        let filtered = packagesService.packages.filter { pkg -> Bool in
            let canBook = pkg.canBookLessons // Only pass packages, not class packages
            let hasRemaining = pkg.lessonsRemaining > 0
            let notExpired = pkg.expirationDate >= now
            let isCurrentPackage = validPackageTypes.isEmpty || validPackageTypes.contains(pkg.packageType)
            return canBook && hasRemaining && notExpired && isCurrentPackage
        }
        let sorted = filtered.sorted { (a, b) -> Bool in
            return a.expirationDate < b.expirationDate
        }
        return sorted
    }
    
    // Get available class passes (for booking classes)
    private var availableClassPasses: [LessonPackage] {
        let now = Date()
        
        // Get all valid package types from current pricing structure
        let validPackageTypes = getCurrentPackageTypes(category: "class")
        
        // Debug: Print all packages
        print("🔍 DEBUG availableClassPasses: All packages count: \(packagesService.packages.count)")
        print("🔍 Valid package types from pricing structure: \(validPackageTypes)")
        for pkg in packagesService.packages {
            print("🔍 Package: type=\(pkg.packageType), category=\(pkg.packageCategory ?? "nil"), name=\(pkg.packageName ?? "nil"), canBookClasses=\(pkg.canBookClasses), remaining=\(pkg.lessonsRemaining)")
        }
        
        let filtered = packagesService.packages.filter { pkg -> Bool in
            let canBook = pkg.canBookClasses // Only class packages
            let hasRemaining = pkg.lessonsRemaining > 0
            let notExpired = pkg.expirationDate >= now
            let isCurrentPackage = validPackageTypes.isEmpty || validPackageTypes.contains(pkg.packageType)
            print("🔍 Package \(pkg.packageType): canBook=\(canBook), hasRemaining=\(hasRemaining), notExpired=\(notExpired), isCurrentPackage=\(isCurrentPackage)")
            return canBook && hasRemaining && notExpired && isCurrentPackage
        }
        
        print("🔍 DEBUG availableClassPasses: Filtered class passes count: \(filtered.count)")
        
        let sorted = filtered.sorted { (a, b) -> Bool in
            return a.expirationDate < b.expirationDate
        }
        return sorted
    }
    
    // Helper to get all valid package types/IDs from current pricing structure
    private func getCurrentPackageTypes(category: String) -> Set<String> {
        guard let pricing = pricingService.pricingStructure else { return [] }
        
        var packageTypes = Set<String>()
        for tier in pricing.tiers {
            for package in tier.packages {
                // Match by category if specified
                if category == "pass" && package.packageCategory.rawValue == "pass" {
                    // Add both the package ID and packageType for matching
                    packageTypes.insert(package.id)
                    packageTypes.insert(package.packageType)
                } else if category == "class" && package.packageCategory.rawValue == "class" {
                    packageTypes.insert(package.id)
                    packageTypes.insert(package.packageType)
                }
            }
        }
        
        print("🔍 getCurrentPackageTypes(\(category)): Found \(packageTypes.count) valid types: \(packageTypes)")
        return packageTypes
    }

    var body: some View {
        mainContent
            .navigationViewStyle(.stack)
            .task {
                await loadInitialData()
            }
            .onAppear {
                setupInitialMode()
                // Reload classes when view appears if in classes mode
                if mode == .classes, let orgId = auth.currentOrgId {
                    Task { await classesService.loadOpenClasses(orgId: orgId) }
                }
            }
            .onChangeCompat(of: initialMode) { _, newValue in
                mode = newValue == 1 ? .classes : .lessons
            }
            .onChangeCompat(of: selectedTrainer?.id) { _, _ in
                Task {
                    await loadMonthIfPossible()
                    await loadDayIfPossible()
                }
            }
            .onChangeCompat(of: packagesService.packages) { _, _ in
                updateSelectedPackage()
            }
    }
    
    private var mainContent: some View {
        NavigationView {
            contentView
                .background(Color.platformGroupedBackground.ignoresSafeArea())
                .navigationTitle("Book a Time")
                .navigationBarTitleDisplayMode(.large)
                .alert(item: $bookingAlert) { alert in
                    Alert(
                        title: Text(alert.title),
                        message: Text(alert.message),
                        dismissButton: .default(Text("OK")) {
                            alert.action?()
                        }
                    )
                }
                .sheet(item: $selectedClass) { classItem in
                    classRegistrationSheet(for: classItem)
                }
                .sheet(isPresented: $showSubscriptionSheet) {
                    SubscriptionRequiredView()
                }
                .sheet(isPresented: $showBookingInstructions) {
                    BookingInstructionsSheet()
                }
        }
    }
    
    private var contentView: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.xl) {
                // Clients should never see subscription warnings
                // Backend enforces subscription limits
                
                modePicker
                
                // Show lessons or classes based on mode
                if mode == .lessons {
                    lessonsContent
                } else {
                    classesContent
                }
            }
            .padding(.vertical, Spacing.lg)
        }
        .onAppear {
            AnalyticsService.shared.logScreenView(screenName: "Book", screenClass: "BookView")
        }
    }
    
    private var modePicker: some View {
        Picker("Mode", selection: $mode) {
            Text("Lessons").tag(Mode.lessons)
            Text("Classes").tag(Mode.classes)
        }
        .pickerStyle(.segmented)
        .padding(.horizontal, Spacing.lg)
        .onChangeCompat(of: mode) { _, newMode in
            if newMode == .classes, let orgId = auth.currentOrgId {
                Task { await classesService.loadOpenClasses(orgId: orgId) }
            }
        }
    }
    
    private func classRegistrationSheet(for classItem: GroupClass) -> some View {
        ClassRegistrationSheet(
            classItem: classItem,
            classesService: classesService,
            usersService: usersService,
            packagesService: packagesService,
            onRegistered: {
                bookingAlert = BookingAlert(title: "Registered!", message: "You're registered for \(classItem.title)")
                if let orgId = auth.currentOrgId {
                    Task { await classesService.loadOpenClasses(orgId: orgId) }
                }
            }
        )
    }
    
    private func loadInitialData() async {
        guard let orgId = auth.currentOrgId else { return }
        
        // Load settings and pricing structure first
        await settingsService.loadSettings(orgId: orgId)
        await pricingService.loadPricingStructure(for: orgId)
        
        if trainersService.trainers.isEmpty {
            await trainersService.loadAll(orgId: orgId)
        }
        // Auto-select Jeff (or first trainer) once trainers are available
        if selectedTrainer == nil {
            if let jeff = trainersService.trainers.first(where: { isJeff($0) }) {
                selectedTrainer = jeff
            } else {
                selectedTrainer = trainersService.trainers.first
            }
            // After selecting default trainer, load availability
            await loadMonthIfPossible()
            await loadDayIfPossible()
        }
        await packagesService.loadMyPackages()
    }
    
    private func setupInitialMode() {
        // Sync mode with initialMode binding
        mode = initialMode == 1 ? .classes : .lessons
    }
    
    private func updateSelectedPackage() {
        if availableLessonPackages.count == 1 {
            selectedPackage = availableLessonPackages.first
        } else if let selected = selectedPackage, !availableLessonPackages.contains(where: { $0.id == selected.id }) {
            // Reset if selected package is no longer available
            selectedPackage = nil
        }
    }
    
    // MARK: - Lessons Content
    
    private var lessonsContent: some View {
        Group {
            VStack(alignment: .leading, spacing: Spacing.md) {
                HStack {
                    Text("Select Trainer")
                        .font(.headingMedium)
                        .foregroundStyle(AppTheme.textPrimary)
                    
                    Button {
                        showBookingInstructions = true
                    } label: {
                        Image(systemName: "info.circle")
                            .font(.system(size: 20))
                            .foregroundStyle(AppTheme.primary)
                    }
                    .buttonStyle(.plain)
                }
                .padding(.horizontal, Spacing.lg)

                CardView(padding: Spacing.md) {
                    Menu {
                        ForEach(trainersOrdered, id: \.id) { trainer in
                            Button {
                                selectedTrainer = trainer
                                selectedSlot = nil
                                Task {
                                    await loadMonthIfPossible()
                                    await loadDayIfPossible()
                                }
                            } label: {
                                HStack(spacing: Spacing.sm) {
                                    TrainerAvatarView(trainer: trainer, size: 28)
                                    Text(trainer.name ?? "Unnamed")
                                        .font(.bodyMedium)
                                }
                            }
                        }
                    } label: {
                        HStack(spacing: Spacing.md) {
                            TrainerAvatarView(trainer: selectedTrainer, size: 48)

                            VStack(alignment: .leading, spacing: Spacing.xxs) {
                                Text(selectedTrainer?.name ?? "")
                                    .font(.headingSmall)
                                    .foregroundStyle(AppTheme.textPrimary)
                                Text("Professional Trainer")
                                    .font(.bodySmall)
                                    .foregroundStyle(AppTheme.textSecondary)
                            }
                            Spacer()
                            Image(systemName: "chevron.up.chevron.down")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundStyle(AppTheme.textTertiary)
                        }
                    }
                }
                .padding(.horizontal, Spacing.lg)
            }

            VStack(alignment: .leading, spacing: Spacing.md) {
                Text("Choose Date")
                    .font(.headingMedium)
                    .foregroundStyle(AppTheme.textPrimary)
                    .padding(.horizontal, Spacing.lg)

                MonthCalendarView(monthStart: $monthStart,
                                  selectedDate: $selectedDate,
                                  availabilityByDay: scheduleService.monthAvailability) { _ in
                    Task {
                        selectedSlot = nil
                        await loadMonthIfPossible()
                        await loadDayIfPossible()
                    }
                }
                .onChangeCompat(of: selectedDate) { _, _ in
                    selectedSlot = nil
                    Task { await loadDayIfPossible() }
                }
            }

            VStack(alignment: .leading, spacing: Spacing.md) {
                Text("Available Times")
                    .font(.headingMedium)
                    .foregroundStyle(AppTheme.textPrimary)
                    .padding(.horizontal, Spacing.lg)

                VStack(spacing: Spacing.sm) {
                    if scheduleService.isLoadingDay {
                        HStack {
                            Spacer()
                            ProgressView()
                                .tint(AppTheme.primary)
                            Spacer()
                        }
                        .padding(Spacing.xl)
                    } else if scheduleService.daySlots.isEmpty {
                        EmptyStateView(
                            icon: "calendar.badge.clock",
                            title: "No Slots Available",
                            message: "There are no available time slots for this date. Try selecting a different date."
                        )
                        .padding(.horizontal, Spacing.lg)
                    } else {
                        ForEach(scheduleService.daySlots, id: \.id) { slot in
                            let isSelected = selectedSlot?.id == slot.id
                            let isBookable = canBookSlot(slot)
                            Button {
                                if isBookable {
                                    withAnimation(.easeInOut(duration: 0.2)) {
                                        selectedSlot = slot
                                    }
                                }
                            } label: {
                                HStack(spacing: Spacing.md) {
                                    ZStack {
                                        RoundedRectangle(cornerRadius: CornerRadius.xs, style: .continuous)
                                            .fill(isSelected ? AppTheme.primary.opacity(0.15) : AppTheme.primary.opacity(0.08))
                                            .frame(width: 48, height: 48)
                                        Image(systemName: isBookable ? "clock" : "clock.badge.exclamationmark")
                                            .font(.system(size: 20, weight: .semibold))
                                            .foregroundStyle(isBookable ? (isSelected ? AppTheme.primary : AppTheme.textSecondary) : AppTheme.textTertiary)
                                    }
                                    
                                    VStack(alignment: .leading, spacing: Spacing.xxs) {
                                        Text(slot.startTime.formatted(date: .omitted, time: .shortened))
                                            .font(.headingSmall)
                                            .foregroundStyle(isBookable ? AppTheme.textPrimary : AppTheme.textTertiary)
                                        if isBookable {
                                            Text("\(Int((slot.endTime.timeIntervalSince(slot.startTime)) / 60)) minutes")
                                                .font(.bodySmall)
                                                .foregroundStyle(AppTheme.textSecondary)
                                            if let location = slot.location {
                                                Label(location, systemImage: "mappin.circle.fill")
                                                    .font(.bodySmall)
                                                    .foregroundStyle(AppTheme.textSecondary)
                                            }
                                        } else {
                                            Text("Too close to start time")
                                                .font(.bodySmall)
                                                .foregroundStyle(AppTheme.textTertiary)
                                        }
                                    }
                                    
                                    Spacer()
                                    
                                    ZStack {
                                        Circle()
                                            .stroke(isSelected ? AppTheme.primary : AppTheme.textTertiary, lineWidth: 2)
                                            .frame(width: 24, height: 24)
                                        if isSelected {
                                            Circle()
                                                .fill(AppTheme.primary)
                                                .frame(width: 12, height: 12)
                                        }
                                    }
                                }
                                .padding(Spacing.md)
                                .background(
                                    RoundedRectangle(cornerRadius: CornerRadius.md, style: .continuous)
                                        .fill(Color.platformBackground)
                                        .overlay(
                                            RoundedRectangle(cornerRadius: CornerRadius.md, style: .continuous)
                                                .stroke(isSelected ? AppTheme.primary.opacity(0.3) : Color.clear, lineWidth: 2)
                                        )
                                )
                                .lightShadow()
                            }
                            .buttonStyle(.plain)
                            .padding(.horizontal, Spacing.lg)
                        }
                    }
                }
            }
            
            // Package selection (only show if user has multiple available passes)
            if availableLessonPackages.count > 1 {
                VStack(alignment: .leading, spacing: Spacing.md) {
                    Text("Select Pass to Use")
                        .font(.headingMedium)
                        .foregroundStyle(AppTheme.textPrimary)
                        .padding(.horizontal, Spacing.lg)

                    CardView(padding: Spacing.md) {
                        Menu {
                            ForEach(availableLessonPackages) { package in
                                Button {
                                    selectedPackage = package
                                } label: {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(package.packageName ?? package.packageType.capitalized)
                                            .font(.bodyMedium)
                                        Text("\(package.lessonsRemaining) left")
                                            .font(.caption)
                                            .foregroundStyle(AppTheme.textSecondary)
                                    }
                                }
                            }
                        } label: {
                            HStack(spacing: Spacing.md) {
                                ZStack {
                                    RoundedRectangle(cornerRadius: CornerRadius.xs, style: .continuous)
                                        .fill(AppTheme.primary.opacity(0.08))
                                        .frame(width: 48, height: 48)
                                    Image(systemName: "ticket")
                                        .font(.system(size: 20, weight: .semibold))
                                        .foregroundStyle(AppTheme.primary)
                                }
                                
                                VStack(alignment: .leading, spacing: Spacing.xxs) {
                                    Text(selectedPackage != nil ? (selectedPackage!.packageName ?? selectedPackage!.packageType.capitalized) : "Choose a pass")
                                        .font(.headingSmall)
                                        .foregroundStyle(AppTheme.textPrimary)
                                    Text(selectedPackage != nil ? "\(selectedPackage!.lessonsRemaining) left" : "Select which pass to use")
                                        .font(.bodySmall)
                                        .foregroundStyle(AppTheme.textSecondary)
                                }
                                Spacer()
                                Image(systemName: "chevron.up.chevron.down")
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundStyle(AppTheme.textTertiary)
                            }
                        }
                    }
                    .padding(.horizontal, Spacing.lg)
                }
            }

            Button {
                if !packagesService.hasAvailableLessons {
                    bookingAlert = .init(
                        title: "No Available Passes",
                        message: "Please purchase lesson passes to continue booking. Visit the Profile tab to buy lessons."
                    )
                } else {
                    Task { await performBooking() }
                }
            } label: {
                HStack(spacing: Spacing.sm) {
                    if bookingInFlight {
                        ProgressView()
                            .tint(.white)
                    } else if !packagesService.hasAvailableLessons {
                        Image(systemName: "cart.badge.plus")
                    }
                    Text(bookButtonText)
                }
            }
            .buttonStyle(PrimaryButtonStyle())
            .disabled(bookingInFlight || selectedTrainer == nil || selectedSlot == nil || (availableLessonPackages.count > 1 && selectedPackage == nil))
            .opacity((selectedTrainer != nil && selectedSlot != nil && (availableLessonPackages.count <= 1 || selectedPackage != nil)) ? 1.0 : 0.5)
            .padding(.horizontal, Spacing.lg)
            .padding(.top, Spacing.md)
        }
    }
    
    // MARK: - Classes Content
    
    private var classesContent: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Available Classes")
                .font(.headingMedium)
                .foregroundStyle(AppTheme.textPrimary)
            .padding(.horizontal, Spacing.lg)
            
            if classesService.isLoading {
                HStack {
                    Spacer()
                    ProgressView()
                        .tint(AppTheme.primary)
                    Spacer()
                }
                .padding(Spacing.xl)
            } else if classesService.classes.isEmpty {
                EmptyStateView(
                    icon: "calendar",
                    title: "No Classes Available",
                    message: "Check back soon for upcoming group classes!"
                )
                .padding(.horizontal, Spacing.lg)
                .padding(.top, Spacing.xl)
            } else {
                VStack(spacing: Spacing.sm) {
                    ForEach(classesService.classes) { classItem in
                        ClassCard(
                            classItem: classItem,
                            onTap: {
                                selectedClass = classItem
                            },
                            classesService: classesService
                        )
                        .padding(.horizontal, Spacing.lg)
                    }
                }
            }
        }
    }

    private func isJeff(_ trainer: Trainer) -> Bool {
        (trainer.name ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
            .localizedCaseInsensitiveCompare("Jeff Schmitz") == .orderedSame
    }
    
    private func formatPackageName(_ package: LessonPackage) -> String {
        // Use packageName if available, otherwise fall back to packageType
        let baseName: String
        if let name = package.packageName, !name.isEmpty {
            baseName = name
        } else {
            // Fallback for legacy packages without name
            switch package.packageType {
            case "private":
                baseName = "Private Lesson Pass"
            case "2_athlete":
                baseName = "2-Athlete Pass"
            case "3_athlete":
                baseName = "3-Athlete Pass"
            case "class_pass":
                baseName = "Class Pass"
            default:
                baseName = "\(package.totalLessons)-Lesson Pass"
            }
        }
        return "\(baseName) (\(package.lessonsRemaining) remaining)"
    }

    private var isBookEnabled: Bool {
        guard mode == .lessons,
              selectedTrainer?.id != nil,
              selectedSlot?.id != nil else { return false }
        return packagesService.hasAvailableLessons
    }
    
    private func canBookSlot(_ slot: AvailabilitySlot) -> Bool {
        // Use org settings for minimum booking hours
        let minHours = settingsService.settings?.minBookingHours ?? 4
        let now = Date()
        let minimumBookingTime = now.addingTimeInterval(Double(minHours) * 60 * 60)
        return slot.startTime >= minimumBookingTime
    }
    
    private var bookButtonText: String {
        if mode == .classes {
            return "Confirm Booking"
        }
        if !packagesService.hasAvailableLessons {
            return "Purchase Passes to Continue"
        }
        return bookingInFlight ? "Booking..." : "Confirm Booking"
    }

    private func loadDayIfPossible() async {
        guard let trainerId = selectedTrainer?.id, let orgId = auth.currentOrgId else { return }
        await scheduleService.loadOpenSlots(for: trainerId, on: selectedDate, orgId: orgId)
    }

    private func loadMonthIfPossible() async {
        guard let trainerId = selectedTrainer?.id, let orgId = auth.currentOrgId else { return }
        await scheduleService.loadMonthAvailability(for: trainerId, monthStart: monthStart, orgId: orgId)
    }

    private func performBooking() async {
        guard let trainerId = selectedTrainer?.id,
              let slotId = selectedSlot?.id,
              let slot = selectedSlot else { return }
        
        // Check if slot is within 5 hours
        if !canBookSlot(slot) {
            bookingAlert = .init(
                title: "Booking Not Available",
                message: "Lessons cannot be booked within 5 hours of the start time. Please contact Jeff Schmitz for assistance."
            )
            return
        }
        
        // If user has multiple passes, ensure they've selected one
        if availableLessonPackages.count > 1 && selectedPackage == nil {
            bookingAlert = .init(
                title: "Select a Pass",
                message: "Please select which pass you'd like to use for this booking."
            )
            return
        }
        
        bookingInFlight = true
        defer { bookingInFlight = false }
        do {
            // Use selected package if available, otherwise pass empty string for auto-selection
            let packageId = selectedPackage?.id ?? ""
            _ = try await bookingManager.bookLesson(trainerId: trainerId, slotId: slotId, lessonPackageId: packageId)
            
            // Track booking creation event
            AnalyticsService.shared.logBookingCreated(
                bookingId: "\(trainerId)_\(slotId)",
                trainerId: trainerId,
                clientId: Auth.auth().currentUser?.uid ?? ""
            )
            
            // Create success message with trainer name
            let trainerName = selectedTrainer?.name ?? "your trainer"
            bookingAlert = .init(
                title: "Booking Confirmed! 🎉",
                message: "You have successfully booked with \(trainerName). See you soon!"
            )
            
            // Refresh data after server writes complete
            await packagesService.loadMyPackages()
            await loadDayIfPossible()
            await loadMonthIfPossible()
            selectedSlot = nil
        } catch {
            let cleanMessage: String
            var navigateToPasses = false
            if error.localizedDescription.contains("credits") || error.localizedDescription.contains("package") {
                cleanMessage = "We couldn't complete your booking. That package has no passes remaining."
                navigateToPasses = true
            } else {
                cleanMessage = "We couldn't complete your booking. \(error.localizedDescription)"
            }
            bookingAlert = .init(
                title: "Booking Failed",
                message: cleanMessage,
                action: navigateToPasses ? {
                    profileTab = "PASSES"
                    selectedTab = 2 // Profile tab
                } : nil
            )
        }
    }

    private struct BookingAlert: Identifiable {
        let id = UUID()
        let title: String
        let message: String
        let action: (() -> Void)?
        
        init(title: String, message: String, action: (() -> Void)? = nil) {
            self.title = title
            self.message = message
            self.action = action
        }
    }
}

private extension Date {
    func startOfMonth() -> Date {
        Calendar.current.date(from: Calendar.current.dateComponents([.year, .month], from: self))!
    }
}

// MARK: - Trainer Avatar

private func trainerImageURL(from trainer: Trainer?) -> URL? {
    guard let trainer else { return nil }
    let urlString = trainer.photoURL?.trimmingCharacters(in: .whitespacesAndNewlines)
        ?? trainer.avatarUrl?.trimmingCharacters(in: .whitespacesAndNewlines)
        ?? trainer.imageUrl?.trimmingCharacters(in: .whitespacesAndNewlines)
    guard let s = urlString, !s.isEmpty else { return nil }
    return URL(string: s)
}

private struct TrainerAvatarView: View {
    let trainer: Trainer?
    var size: CGFloat = 36

    var body: some View {
        let cornerRadius = size / 2
        Group {
            if let url = trainerImageURL(from: trainer) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .empty:
                        placeholder
                    case .success(let image):
                        image
                            .resizable()
                            .scaledToFill()
                    case .failure:
                        placeholder
                    @unknown default:
                        placeholder
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
}

// MARK: - Class Card

private struct ClassCard: View {
    let classItem: GroupClass
    let onTap: () -> Void
    @ObservedObject var classesService: ClassesService
    @State private var isRegistered = false
    
    var body: some View {
        Button(action: onTap) {
            CardView {
                VStack(alignment: .leading, spacing: Spacing.lg) {
                    // Title and Status
                    HStack(alignment: .top) {
                        VStack(alignment: .leading, spacing: Spacing.xs) {
                            Text(classItem.title)
                                .font(.headingMedium)
                                .foregroundStyle(AppTheme.secondary)
                                .fontWeight(.semibold)
                            
                            if isRegistered {
                                BadgeView(text: "✓ You're Registered", color: AppTheme.success)
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
                    
                    // Class Details
                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        DetailRow(icon: "calendar", text: classItem.startTime.formatted(date: .abbreviated, time: .omitted))
                        DetailRow(icon: "clock", text: classItem.startTime.formatted(date: .omitted, time: .shortened))
                        DetailRow(icon: "mappin.circle", text: classItem.location)
                        DetailRow(icon: "person.fill", text: classItem.trainerName)
                    }
                }
            }
        }
        .buttonStyle(.plain)
        .task {
            if let id = classItem.id {
                isRegistered = await classesService.isRegistered(for: id)
            } else {
                isRegistered = false
            }
        }
    }
}

// Helper view for detail rows
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

// MARK: - Class Registration Sheet

private struct ClassRegistrationSheet: View {
    @EnvironmentObject var auth: AuthManager
    @Environment(\.dismiss) private var dismiss
    let classItem: GroupClass
    @ObservedObject var classesService: ClassesService
    @ObservedObject var usersService: UsersService
    @ObservedObject var packagesService: PackagesService
    let onRegistered: () -> Void
    
    @StateObject private var pricingService = PricingStructureService()
    @State private var isRegistering = false
    @State private var registrationSuccessful = false
    @State private var errorMessage: String?
    @State private var selectedClassPass: LessonPackage?
    @State private var registrationCount = 0
    
    // Get available class passes (for booking classes)
    private var availableClassPasses: [LessonPackage] {
        let now = Date()
        
        // Get all valid package types from current pricing structure
        let validPackageTypes = getCurrentPackageTypes(category: "class")
        
        // Debug: Print all packages
        print("🔍 DEBUG ClassRegistrationSheet: All packages count: \(packagesService.packages.count)")
        print("🔍 Valid class package types from pricing structure: \(validPackageTypes)")
        for pkg in packagesService.packages {
            print("🔍 ClassRegistrationSheet Package: type=\(pkg.packageType), category=\(pkg.packageCategory ?? "nil"), name=\(pkg.packageName ?? "nil"), canBookClasses=\(pkg.canBookClasses), remaining=\(pkg.lessonsRemaining)")
        }
        
        let filtered = packagesService.packages.filter { pkg -> Bool in
            let canBook = pkg.canBookClasses // Only class packages
            let hasRemaining = pkg.lessonsRemaining > 0
            let notExpired = pkg.expirationDate >= now
            let hasClassCategory = pkg.packageCategory == "class" // Must have class category
            let isCurrentPackage = validPackageTypes.isEmpty || validPackageTypes.contains(pkg.packageType)
            print("🔍 ClassRegistrationSheet Package \(pkg.packageType): canBook=\(canBook), hasRemaining=\(hasRemaining), notExpired=\(notExpired), hasClassCategory=\(hasClassCategory), isCurrentPackage=\(isCurrentPackage)")
            return canBook && hasRemaining && notExpired && hasClassCategory && isCurrentPackage
        }
        
        print("🔍 DEBUG ClassRegistrationSheet: Filtered class passes count: \(filtered.count)")
        
        let sorted = filtered.sorted { (a, b) -> Bool in
            return a.expirationDate < b.expirationDate
        }
        return sorted
    }
    
    // Helper to get all valid package types/IDs from current pricing structure
    private func getCurrentPackageTypes(category: String) -> Set<String> {
        guard let pricing = pricingService.pricingStructure else { return [] }
        
        var packageTypes = Set<String>()
        for tier in pricing.tiers {
            for package in tier.packages {
                // Match by category if specified
                if category == "class" && package.packageCategory.rawValue == "class" {
                    // Add both the package ID and packageType for matching
                    packageTypes.insert(package.id)
                    packageTypes.insert(package.packageType)
                }
            }
        }
        
        print("🔍 ClassRegistrationSheet getCurrentPackageTypes(\(category)): Found \(packageTypes.count) valid types: \(packageTypes)")
        return packageTypes
    }
    
    // Find available class pass (legacy - kept for backward compatibility)
    private var availableClassPass: LessonPackage? {
        availableClassPasses.first
    }
    
    private func formatPackageName(_ package: LessonPackage) -> String {
        // Use packageName if available, otherwise fall back to packageType
        let baseName: String
        if let name = package.packageName, !name.isEmpty {
            baseName = name
        } else {
            // Fallback for legacy packages without name
            switch package.packageType {
            case "private":
                baseName = "Private Lesson Pass"
            case "2_athlete":
                baseName = "2-Athlete Pass"
            case "3_athlete":
                baseName = "3-Athlete Pass"
            case "class_pass":
                baseName = "Class Pass"
            default:
                baseName = "\(package.totalLessons)-Lesson Pass"
            }
        }
        return "\(baseName) (\(package.lessonsRemaining) remaining)"
    }
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: Spacing.xl) {
                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        Text(classItem.title)
                            .font(.displaySmall)
                            .foregroundStyle(AppTheme.primary)
                        
                        Text(classItem.description)
                            .font(.bodyLarge)
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                    
                    CardView {
                        VStack(alignment: .leading, spacing: Spacing.md) {
                            HStack(spacing: Spacing.xxs) {
                                Image(systemName: "calendar")
                                Text(classItem.startTime.formatted(date: .long, time: .omitted))
                                    .font(.bodyLarge)
                            }
                            
                            Divider()
                            
                            HStack(spacing: Spacing.xxs) {
                                Image(systemName: "clock")
                                Text("\(classItem.startTime.formatted(date: .omitted, time: .shortened)) - \(classItem.endTime.formatted(date: .omitted, time: .shortened))")
                                    .font(.bodyLarge)
                            }
                            
                            Divider()
                            
                            HStack(spacing: Spacing.xxs) {
                                Image(systemName: "mappin.circle")
                                Text(classItem.location)
                                    .font(.bodyLarge)
                            }
                            
                            Divider()
                            
                            HStack(spacing: Spacing.xxs) {
                                Image(systemName: "person.2")
                                Text("\(classItem.currentParticipants) / \(classItem.maxParticipants) registered")
                                    .font(.bodyLarge)
                            }
                        }
                        .foregroundStyle(AppTheme.textPrimary)
                    }
                    
                    if let errorMessage = errorMessage {
                        CardView {
                            HStack(spacing: Spacing.sm) {
                                Image(systemName: "exclamationmark.triangle.fill")
                                    .foregroundStyle(AppTheme.error)
                                Text(errorMessage)
                                    .font(.bodySmall)
                                    .foregroundStyle(AppTheme.error)
                            }
                        }
                    }
                    
                    if registrationSuccessful {
                        CardView {
                            VStack(spacing: Spacing.md) {
                                Image(systemName: "checkmark.circle.fill")
                                    .font(.system(size: 48))
                                    .foregroundStyle(AppTheme.success)
                                Text("Registration Successful!")
                                    .font(.headingMedium)
                                    .foregroundStyle(AppTheme.success)
                                Text(registrationCount > 1 ? 
                                    "You've registered \(registrationCount) athletes for \(classItem.title). Register another or close to finish." :
                                    "You're all set for \(classItem.title). Register another athlete or close to finish.")
                                    .font(.bodyMedium)
                                    .foregroundStyle(AppTheme.textSecondary)
                                    .multilineTextAlignment(.center)
                                
                                // Register Another Button
                                Button {
                                    registrationSuccessful = false
                                    errorMessage = nil
                                    selectedClassPass = nil
                                } label: {
                                    HStack(spacing: Spacing.sm) {
                                        Image(systemName: "person.badge.plus")
                                        Text("Register Another Athlete")
                                    }
                                }
                                .buttonStyle(PrimaryButtonStyle())
                                .padding(.top, Spacing.sm)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, Spacing.md)
                        }
                    } else if !classItem.isFull {
                        if !availableClassPasses.isEmpty {
                            // Always show class pass selector
                            VStack(alignment: .leading, spacing: Spacing.md) {
                                Text("Select Class Pass to Use")
                                    .font(.headingMedium)
                                    .foregroundStyle(AppTheme.textPrimary)

                                CardView(padding: Spacing.md) {
                                    Menu {
                                        ForEach(availableClassPasses) { package in
                                            Button {
                                                selectedClassPass = package
                                            } label: {
                                                VStack(alignment: .leading, spacing: 2) {
                                                    Text(package.packageName ?? package.packageType.capitalized)
                                                        .font(.bodyMedium)
                                                    Text("\(package.lessonsRemaining) left")
                                                        .font(.caption)
                                                        .foregroundStyle(AppTheme.textSecondary)
                                                }
                                            }
                                        }
                                    } label: {
                                        HStack(spacing: Spacing.md) {
                                            ZStack {
                                                RoundedRectangle(cornerRadius: CornerRadius.xs, style: .continuous)
                                                    .fill(AppTheme.secondary.opacity(0.08))
                                                    .frame(width: 48, height: 48)
                                                Image(systemName: "ticket")
                                                    .font(.system(size: 20, weight: .semibold))
                                                    .foregroundStyle(AppTheme.secondary)
                                            }
                                            
                                            VStack(alignment: .leading, spacing: Spacing.xxs) {
                                                Text(selectedClassPass != nil ? (selectedClassPass!.packageName ?? selectedClassPass!.packageType.capitalized) : "Choose a class pass")
                                                    .font(.headingSmall)
                                                    .foregroundStyle(AppTheme.textPrimary)
                                                Text(selectedClassPass != nil ? "\(selectedClassPass!.lessonsRemaining) left" : "Select which pass to use")
                                                    .font(.bodySmall)
                                                    .foregroundStyle(AppTheme.textSecondary)
                                            }
                                            Spacer()
                                            Image(systemName: "chevron.up.chevron.down")
                                                .font(.system(size: 14, weight: .semibold))
                                                .foregroundStyle(AppTheme.textTertiary)
                                        }
                                    }
                                }
                            }
                            
                            Button {
                                Task { await registerWithClassPass() }
                            } label: {
                                HStack(spacing: Spacing.sm) {
                                    if isRegistering {
                                        ProgressView().tint(.white)
                                    }
                                    Text(isRegistering ? "Registering..." : "Use Class Pass & Register")
                                }
                            }
                            .buttonStyle(PrimaryButtonStyle())
                            .disabled(isRegistering || selectedClassPass == nil)
                        } else {
                            CardView {
                                VStack(alignment: .leading, spacing: Spacing.sm) {
                                    HStack(spacing: Spacing.sm) {
                                        Image(systemName: "exclamationmark.circle.fill")
                                            .foregroundStyle(AppTheme.warning)
                                        Text("Class Pass Required")
                                            .font(.bodyMedium.bold())
                                            .foregroundStyle(AppTheme.warning)
                                    }
                                    Text("You need a class pass to register. Purchase one from the Profile tab to get started.")
                                        .font(.bodySmall)
                                        .foregroundStyle(AppTheme.textSecondary)
                                }
                            }
                        }
                    } else {
                        CardView {
                            HStack(spacing: Spacing.sm) {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundStyle(AppTheme.error)
                                Text("This class is full")
                                    .font(.bodyMedium)
                                    .foregroundStyle(AppTheme.error)
                            }
                        }
                    }
                }
                .padding(Spacing.lg)
            }
            .background(Color.platformGroupedBackground.ignoresSafeArea())
            .navigationTitle("Class Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
        }
        .navigationViewStyle(.stack)
        .task {
            // Load packages and pricing structure to check for class passes
            if packagesService.packages.isEmpty {
                await packagesService.loadMyPackages()
            }
            if let orgId = auth.currentOrgId {
                await pricingService.loadPricingStructure(for: orgId)
            }
        }
    }
    
    private func registerWithClassPass() async {
        guard let classId = classItem.id else { return }
        // Use selected pass if available, otherwise use first available pass
        let passToUse = selectedClassPass ?? availableClassPasses.first
        guard let classPass = passToUse, let passId = classPass.id else {
            errorMessage = "No valid class pass found"
            return
        }
        
        isRegistering = true
        errorMessage = nil
        
        do {
            try await classesService.registerForClassWithPass(
                classId: classId,
                classPassPackageId: passId
            )
            
            // Track class registration event
            AnalyticsService.shared.logClassRegistered(
                classId: classId,
                className: classItem.title
            )
            
            // Success! Reload packages and show success state
            await packagesService.loadMyPackages()
            if let orgId = auth.currentOrgId {
                await classesService.loadMyRegisteredClasses(orgId: orgId)
            }
            
            registrationSuccessful = true
            registrationCount += 1
            errorMessage = nil
            
            // Don't dismiss - allow registering another athlete
            onRegistered()
        } catch {
            errorMessage = "Registration failed: \(error.localizedDescription)"
        }
        
        isRegistering = false
    }
}

// MARK: - Booking Instructions Sheet

private struct BookingInstructionsSheet: View {
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: Spacing.xl) {
                    // Header
                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        Text("How to Book a Lesson")
                            .font(.headingLarge)
                            .foregroundStyle(AppTheme.textPrimary)
                        
                        Text("Follow these simple steps to schedule your session")
                            .font(.bodyLarge)
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                    .padding(.horizontal, Spacing.lg)
                    
                    // Steps
                    VStack(spacing: Spacing.lg) {
                        // Step 1
                        InstructionStepCard(
                            stepNumber: 1,
                            icon: "person.circle.fill",
                            title: "Select Your Trainer",
                            description: "Choose from our professional trainers. Tap the trainer card to see all available options.",
                            color: AppTheme.primary
                        )
                        
                        // Step 2
                        InstructionStepCard(
                            stepNumber: 2,
                            icon: "calendar",
                            title: "Choose a Date",
                            description: "Browse the calendar and select a day that works for you. Available dates are highlighted.",
                            color: AppTheme.secondary
                        )
                        
                        // Step 3
                        InstructionStepCard(
                            stepNumber: 3,
                            icon: "clock.fill",
                            title: "Pick Your Time",
                            description: "Select from available time slots. Each slot shows the duration and start time.",
                            color: AppTheme.primary
                        )
                        
                        // Step 4
                        InstructionStepCard(
                            stepNumber: 4,
                            icon: "checkmark.circle.fill",
                            title: "Confirm Booking",
                            description: "Review your selection and tap 'Book Lesson'. Your session will be confirmed instantly.",
                            color: AppTheme.success
                        )
                    }
                    .padding(.horizontal, Spacing.lg)
                    
                    // Info note
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

// MARK: - Instruction Step Card

private struct InstructionStepCard: View {
    let stepNumber: Int
    let icon: String
    let title: String
    let description: String
    let color: Color
    
    var body: some View {
        CardView(padding: Spacing.md) {
            HStack(alignment: .top, spacing: Spacing.md) {
                // Step number with icon
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

// MARK: - iOS 17 onChange compatibility

private extension View {
    @ViewBuilder
    func onChangeCompat<V: Equatable>(
        of value: V,
        perform action: @escaping (_ oldValue: V, _ newValue: V) -> Void
    ) -> some View {
        if #available(iOS 17.0, macOS 14.0, watchOS 10.0, tvOS 17.0, visionOS 1.0, *) {
            self.onChange(of: value) { oldValue, newValue in
                action(oldValue, newValue)
            }
        } else {
            // Fallback to the deprecated single-parameter variant without warnings here.
            self.onChange(of: value) { newValue in
                action(newValue, newValue)
            }
        }
    }
}

