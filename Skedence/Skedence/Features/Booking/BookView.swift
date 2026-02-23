//
//  BookView.swift
//  Skedence
//
//  Created by Matthew Sprague on 10/14/25.
//

import SwiftUI
import StripePaymentSheet
import FirebaseAuth
import FirebaseFirestore

// Safe array subscript extension
extension Array {
    subscript(safe index: Index) -> Element? {
        return indices.contains(index) ? self[index] : nil
    }
}

struct BookView: View {
    @EnvironmentObject var auth: AuthManager
    @EnvironmentObject var intakeFormService: IntakeFormService
    // Removed subscription status - clients don't need to check this
    @ObservedObject var trainersService: TrainersService
    @ObservedObject var scheduleService: ScheduleService
    @ObservedObject var packagesService: PackagesService
    @ObservedObject var usersService: UsersService
    @StateObject private var bookingManager = BookingManager()
    @StateObject private var classesService = ClassesService()
    @StateObject private var settingsService = SettingsService()
    @StateObject private var pricingService = PricingStructureService()
    @StateObject private var intakeFormData = IntakeFormData()
    @StateObject private var newAthleteIntakeData = IntakeFormData()
    @State private var athleteIntakeForms: [Int: IntakeFormData] = [:] // One form per athlete index
    @State private var formUpdateTrigger = false // Toggles to trigger validation re-check
    
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
    @State private var selectedAthletes: [String?] = [] // Dynamic array based on package category
    @State private var lessonNotes = ""
    
    // NOTE: Athlete profile fields are now managed dynamically via intakeFormData and newAthleteIntakeData
    // These IntakeFormData objects automatically handle form state based on configured intake fields
    
    @State private var showSubscriptionSheet = false
    @State private var showBookingInstructions = false
    @State private var showWaiverAgreement = false
    @State private var showBookingConfirmation = false
    @State private var pendingBookingSuccess = false
    @State private var currentWaiverAthleteIndex: Int? = nil  // Track which athlete is signing waiver
    
    // Add New Athlete state
    @State private var showAddAthleteSheet = false
    @State private var addAthleteForIndex: Int? = nil
    @State private var newAthleteFirstName = ""
    @State private var newAthleteLastName = ""
    
    // Waiver status tracking for each athlete dropdown
    @State private var athleteWaiverStatus: [Int: Bool] = [:] // index -> hasWaiver
    @State private var isNewAthlete: [Int: Bool] = [:] // index -> isNew
    @State private var athleteInfoExpanded: [Int: Bool] = [:] // index -> isExpanded
    
    // Trainer filter state
    @State private var showTrainerFilter = false
    @State private var filterStartDate = Date()
    @State private var filterEndDate = Date().addingTimeInterval(2 * 24 * 60 * 60) // 2 days later
    @State private var filterStartTime = Calendar.current.date(bySettingHour: 16, minute: 0, second: 0, of: Date()) ?? Date()
    @State private var filterEndTime = Calendar.current.date(bySettingHour: 19, minute: 0, second: 0, of: Date()) ?? Date()
    @State private var filteredTrainers: [Trainer] = []
    @State private var isSearchingTrainers = false
    @State private var hasSearched = false

    enum Mode: String, CaseIterable { case lessons = "Privates", classes = "Classes" }
    
    // Get available lesson packages (excluding class passes)
    private var availableLessonPackages: [LessonPackage] {
        let now = Date()
        let validPackageTypes = getCurrentPackageTypes(category: "pass")
        let filtered = packagesService.packages.filter { pkg -> Bool in
            let canBook = pkg.canBookLessons
            let hasRemaining = pkg.lessonsRemaining > 0
            let notExpired = pkg.expirationDate >= now
            let isCurrentPackage = validPackageTypes.isEmpty || validPackageTypes.contains(pkg.packageType)
            return canBook && hasRemaining && notExpired && isCurrentPackage
        }
        let sorted = filtered.sorted { $0.expirationDate < $1.expirationDate }
        return sorted
    }
    
    // Get available classes (excluding past classes)
    private var availableClasses: [GroupClass] {
        let now = Date()
        return classesService.classes.filter { classItem in
            classItem.startTime >= now
        }
    }
    
    // Get all athletes from user profile (both new and legacy format)
    private var allAthletes: [String] {
        var athletes: [String] = []
        
        guard let profile = usersService.currentUser else { return athletes }
        
        // New format: athletes array
        if let athletesArray = profile.athletes {
            for athlete in athletesArray {
                let name = athlete.displayName
                if !name.isEmpty && !athletes.contains(name) {
                    athletes.append(name)
                }
            }
        }
        
        // Legacy format: individual fields
        let legacyAthletes = [
            (profile.athleteFirstName, profile.athleteLastName),
            (profile.athlete2FirstName, profile.athlete2LastName),
            (profile.athlete3FirstName, profile.athlete3LastName)
        ]
        
        for (firstName, lastName) in legacyAthletes {
            let f = (firstName ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
            let l = (lastName ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
            let fullName = [f, l].filter { !$0.isEmpty }.joined(separator: " ")
            if !fullName.isEmpty && !athletes.contains(fullName) {
                athletes.append(fullName)
            }
        }
        
        return athletes
    }
    
    // Get available athletes for a specific dropdown index (excludes already-selected athletes)
    private func availableAthletesFor(index: Int) -> [String] {
        return allAthletes.filter { athlete in
            !selectedAthletes.enumerated().contains { idx, selected in
                idx != index && selected == athlete
            }
        }
    }
    
    // Load athlete profile data from Firebase
    private func loadAthleteProfileData(athleteName: String, index: Int) {
        guard let profile = usersService.currentUser else {
            return
        }
        
        guard let athleteForm = athleteIntakeForms[index] else {
            return
        }
        
        // Pre-populate intake form data from profile
        athleteForm.populateFromUserProfile(profile)
        
        // Find athlete in new format
        if let athletesArray = profile.athletes {
            if let athlete = athletesArray.first(where: { $0.displayName == athleteName }) {
                athleteForm.populateFromAthlete(athlete)
                return
            }
        }
        
        // Check legacy format - create AthleteInfo from legacy fields
        let nameParts = athleteName.split(separator: " ")
        let firstName = String(nameParts.first ?? "")
        
        var legacyAthlete: AthleteInfo?
        if profile.athleteFirstName == firstName {
            legacyAthlete = AthleteInfo(
                firstName: profile.athleteFirstName,
                lastName: profile.athleteLastName,
                birthday: profile.athleteBirthday,
                schoolClubTeam: profile.athleteSchoolClubTeam,
                experienceLevel: profile.athleteExperienceLevel,
                position: profile.athletePosition
            )
        } else if profile.athlete2FirstName == firstName {
            legacyAthlete = AthleteInfo(
                firstName: profile.athlete2FirstName,
                lastName: profile.athlete2LastName,
                birthday: profile.athlete2Birthday,
                schoolClubTeam: profile.athlete2SchoolClubTeam,
                experienceLevel: profile.athlete2ExperienceLevel,
                position: profile.athlete2Position
            )
        } else if profile.athlete3FirstName == firstName {
            legacyAthlete = AthleteInfo(
                firstName: profile.athlete3FirstName,
                lastName: profile.athlete3LastName,
                birthday: profile.athlete3Birthday,
                schoolClubTeam: profile.athlete3SchoolClubTeam,
                experienceLevel: profile.athlete3ExperienceLevel,
                position: profile.athlete3Position
            )
        }
        
        if let athlete = legacyAthlete {
            athleteForm.populateFromAthlete(athlete)
        }
    }
    
    // Helper to get PackageCategory enum from package
    private func getPackageCategory(_ package: LessonPackage) -> PackageCategory? {
        guard let categoryString = package.packageCategory else { return nil }
        return PackageCategory(rawValue: categoryString)
    }
    
    // Validate that all required athlete information is filled
    private var isAthleteInfoComplete: Bool {
        // Use formUpdateTrigger to force re-evaluation when forms change
        let _ = formUpdateTrigger
        
        guard let pkg = selectedPackage,
              let category = getPackageCategory(pkg),
              category.isPrivateLesson else {
            return true  // Classes don't need athlete info
        }
        
        let requiredCount = category.athleteCount
        
        // Check that array is sized correctly (allow slightly more for safety)
        guard selectedAthletes.count >= requiredCount else {
            return false
        }
        
        // Check that all required athlete slots are filled
        for index in 0..<requiredCount {
            if selectedAthletes[safe: index] == nil {
                return false
            }
        }
        
        // Check ALL athletes' info using dynamic form validation
        for index in 0..<requiredCount {
            guard let athleteForm = athleteIntakeForms[index] else {
                return false
            }
            
            // Check only required fields are complete
            let incompleteRequired = intakeFormService.fields.filter { field in
                field.required && !athleteForm.isFieldComplete(field)
            }
            
            if !incompleteRequired.isEmpty {
                return false
            }
        }
        
        return true
    }
    
    // Helper to get or create intake form for specific athlete index
    private func getOrCreateIntakeForm(for index: Int) -> IntakeFormData {
        if let existingForm = athleteIntakeForms[index] {
            return existingForm
        }
        let newForm = IntakeFormData()
        athleteIntakeForms[index] = newForm
        return newForm
    }
    
    private var availableClassPasses: [LessonPackage] {
        let now = Date()
        let validPackageTypes = getCurrentPackageTypes(category: "class")
        let filtered = packagesService.packages.filter { pkg -> Bool in
            let canBook = pkg.canBookClasses
            let hasRemaining = pkg.lessonsRemaining > 0
            let notExpired = pkg.expirationDate >= now
            let isCurrentPackage = validPackageTypes.isEmpty || validPackageTypes.contains(pkg.packageType)
            return canBook && hasRemaining && notExpired && isCurrentPackage
        }
        let sorted = filtered.sorted { $0.expirationDate < $1.expirationDate }
        return sorted
    }
    
    private func getCurrentPackageTypes(category: String) -> Set<String> {
        guard let pricing = pricingService.pricingStructure else { return [] }
        var packageTypes = Set<String>()
        for tier in pricing.tiers {
            for package in tier.packages {
                let categoryValue = package.packageCategory.rawValue
                // Check for private lesson categories
                if category == "pass" && (categoryValue == "oneAthlete" || categoryValue == "twoAthlete" || 
                                         categoryValue == "threeAthlete" || categoryValue == "fourAthlete" ||
                                         categoryValue == "pass") {
                    packageTypes.insert(package.id)
                    packageTypes.insert(package.packageType)
                // Check for class category
                } else if category == "class" && (categoryValue == "classPass" || categoryValue == "class") {
                    packageTypes.insert(package.id)
                    packageTypes.insert(package.packageType)
                }
            }
        }
        return packageTypes
    }

    var body: some View {
        mainContent
            .navigationViewStyle(.stack)
            .task { await loadInitialData() }
            .onAppear {
                setupInitialMode()
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
                .navigationBarTitleDisplayMode(.large)
                .alert(item: $bookingAlert) { alert in
                    Alert(
                        title: Text(alert.title),
                        message: Text(alert.message),
                        dismissButton: .default(Text("OK")) { alert.action?() }
                    )
                }
                .sheet(item: $selectedClass) { classItem in
                    classRegistrationSheet(for: classItem)
                }
                .sheet(isPresented: $showSubscriptionSheet) { SubscriptionRequiredView() }
                .sheet(isPresented: $showBookingInstructions) { BookingInstructionsSheet() }
                .sheet(isPresented: $showWaiverAgreement) {
                    let athleteName = currentWaiverAthleteIndex != nil && currentWaiverAthleteIndex! < selectedAthletes.count 
                        ? selectedAthletes[currentWaiverAthleteIndex!] 
                        : nil
                    let displayName = athleteName ?? "Athlete"
                    
                    WaiverAgreementCheckboxView(
                        waiverText: settingsService.settings?.waiverText ?? "",
                        userProfile: usersService.currentUser,
                        athleteName: displayName,
                        onAgree: {
                            Task { await handleWaiverAgreement() }
                        },
                        onCancel: {
                            showWaiverAgreement = false
                            pendingBookingSuccess = false
                            currentWaiverAthleteIndex = nil
                        }
                    )
                }
                .sheet(isPresented: $showAddAthleteSheet) {
                    addNewAthleteSheet
                }
                .confirmationDialog("Confirm Booking", isPresented: $showBookingConfirmation, titleVisibility: .visible) {
                    Button("Confirm Booking") {
                        Task {
                            await confirmAndBookLesson()
                        }
                    }
                    Button("Cancel", role: .cancel) {}
                } message: {
                    if let slot = selectedSlot, let trainer = selectedTrainer {
                        let athleteName = selectedAthletes.compactMap { $0 }.first ?? "your athlete"
                        let dateText = slot.startTime.formatted(.dateTime.month(.abbreviated).day().year())
                        let timeText = slot.startTime.formatted(date: .omitted, time: .shortened)
                        Text("Are you sure you want to book \(athleteName) with \(trainer.name ?? "your trainer") on \(dateText) at \(timeText)?")
                    }
                }
        }
    }
    
    private var contentView: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.xl) {
                modePicker
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
            Text("Privates").tag(Mode.lessons)
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
    
    
    // MARK: - Add New Athlete Sheet
    
    private var addNewAthleteSheet: some View {
        NavigationView {
            Form {
                Section(header: Text("Athlete Name")) {
                    TextField("First Name *", text: $newAthleteFirstName)
                        .autocapitalization(.words)
                    TextField("Last Name *", text: $newAthleteLastName)
                        .autocapitalization(.words)
                }
                
                // Show dynamic intake form fields for athlete information
                DynamicIntakeFormSection(
                    formData: newAthleteIntakeData,
                    fields: intakeFormService.fields,
                    sectionType: .athlete,
                    sectionTitle: "Athlete Information"
                )
            }
            .navigationTitle("Add New Athlete")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        showAddAthleteSheet = false
                    }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") {
                        saveNewAthlete()
                    }
                    .disabled(newAthleteFirstName.isEmpty || newAthleteLastName.isEmpty)
                }
            }
        }
    }
    
    private func saveNewAthlete() {
        guard !newAthleteFirstName.isEmpty, !newAthleteLastName.isEmpty else { return }
        guard let index = addAthleteForIndex else { return }
        
        let athleteName = "\(newAthleteFirstName.trimmingCharacters(in: .whitespacesAndNewlines)) \(newAthleteLastName.trimmingCharacters(in: .whitespacesAndNewlines))"
        
        // Create new athlete and add to user profile
        Task {
            await saveNewAthleteToProfile(firstName: newAthleteFirstName, lastName: newAthleteLastName)
            
            // Select the new athlete in the dropdown
            selectedAthletes[index] = athleteName
            
            // Mark as new athlete (will need waiver)
            isNewAthlete[index] = true
            athleteWaiverStatus[index] = false
            
            // Copy data from newAthleteIntakeData to this athlete's form
            if let athleteForm = athleteIntakeForms[index] {
                for (key, value) in newAthleteIntakeData.fieldValues {
                    athleteForm.setValue(value, forField: key)
                }
            }
            
            // Close sheet
            showAddAthleteSheet = false
        }
    }
    
    private func saveNewAthleteToProfile(firstName: String, lastName: String) async {
        guard let userId = Auth.auth().currentUser?.uid else { return }
        guard let profile = usersService.currentUser else { return }
        
        let db = Firestore.firestore()
        let userRef = db.collection("users").document(userId)
        
        // Extract values from dynamic form data
        let birthday = newAthleteIntakeData.fieldValues["athleteBirthday"] as? String ?? ""
        let schoolTeam = newAthleteIntakeData.fieldValues["schoolTeam"] as? String ?? ""
        let experienceLevel = newAthleteIntakeData.fieldValues["experienceLevel"] as? String ?? ""
        let position = newAthleteIntakeData.fieldValues["position"] as? String ?? ""
        
        // Create new athlete
        let newAthlete = AthleteInfo(
            firstName: firstName,
            lastName: lastName,
            birthday: birthday.isEmpty ? nil : birthday,
            schoolClubTeam: schoolTeam.isEmpty ? nil : schoolTeam,
            experienceLevel: experienceLevel.isEmpty ? nil : experienceLevel,
            position: position.isEmpty ? nil : position
        )
        
        // Add to existing athletes array
        var athletes = profile.athletes ?? []
        athletes.append(newAthlete)
        
        do {
            try await userRef.updateData([
                "athletes": athletes.map { athlete in
                    [
                        "firstName": athlete.firstName ?? "",
                        "lastName": athlete.lastName ?? "",
                        "birthday": athlete.birthday ?? "",
                        "schoolClubTeam": athlete.schoolClubTeam ?? "",
                        "experienceLevel": athlete.experienceLevel ?? "",
                        "position": athlete.position ?? ""
                    ] as [String: Any]
                }
            ])
            
            // Reload user profile to reflect changes
            await usersService.loadCurrentUserIfAvailable()
        } catch {
            // Error saving athlete info
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
        await settingsService.loadSettings(orgId: orgId)
        await pricingService.loadPricingStructure(for: orgId)
        await intakeFormService.loadFields(orgId: orgId, type: "private")
        if trainersService.trainers.isEmpty {
            await trainersService.loadAll(orgId: orgId)
        }
        if selectedTrainer == nil {
            if let jeff = trainersService.trainers.first(where: { isJeff($0) }) {
                selectedTrainer = jeff
            } else {
                selectedTrainer = trainersService.trainers.first
            }
            await loadMonthIfPossible()
            await loadDayIfPossible()
        }
        await packagesService.loadMyPackages()
        
        // Load classes if in classes mode
        if mode == .classes {
            await classesService.loadOpenClasses(orgId: orgId)
        }
    }
    
    private func setupInitialMode() {
        mode = initialMode == 1 ? .classes : .lessons
    }
    
    private func updateSelectedPackage() {
        if availableLessonPackages.count == 1 {
            selectedPackage = availableLessonPackages.first
        } else if let selected = selectedPackage, !availableLessonPackages.contains(where: { $0.id == selected.id }) {
            selectedPackage = nil
        }
    }
    
    // MARK: - Lessons Content
    
    private var lessonsContent: some View {
        ScrollView {
            VStack(spacing: Spacing.md) {
                trainerAvailabilityFilter
                trainerSelectionSection
                calendarSection
                packageSelectionSection
                athleteSelectionSection
                athleteProfileSection
                lessonNotesSection
                bookingButton
                noPassesWarning
            }
            .padding(.vertical, Spacing.lg)
        }
    }
    
    // MARK: - Lessons Content Sections
    
    private var trainerAvailabilityFilter: some View {
            // Trainer Availability Filter
            VStack(alignment: .leading, spacing: Spacing.md) {
                HStack {
                    Text("Filter availability:")
                        .font(.headingMedium)
                        .foregroundStyle(AppTheme.textPrimary)
                    Spacer()
                    Button {
                        withAnimation {
                            showTrainerFilter.toggle()
                        }
                    } label: {
                        Image(systemName: showTrainerFilter ? "chevron.up" : "chevron.down")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(AppTheme.primary)
                    }
                    .buttonStyle(.plain)
                }
                .padding(.horizontal, Spacing.lg)
                
                if showTrainerFilter {
                    CardView(padding: Spacing.md) {
                        VStack(spacing: Spacing.md) {
                            // Date Range
                            VStack(alignment: .leading, spacing: Spacing.xs) {
                                Text("Date Range")
                                    .font(.bodySmall)
                                    .foregroundStyle(AppTheme.textSecondary)
                                HStack(spacing: Spacing.sm) {
                                    DatePicker("From", selection: $filterStartDate, displayedComponents: .date)
                                        .datePickerStyle(.compact)
                                        .labelsHidden()
                                        .environment(\.locale, Locale(identifier: "en_US"))
                                        .frame(maxWidth: .infinity)
                                    Text("to")
                                        .font(.bodySmall)
                                        .foregroundStyle(AppTheme.textSecondary)
                                    DatePicker("To", selection: $filterEndDate, displayedComponents: .date)
                                        .datePickerStyle(.compact)
                                        .labelsHidden()
                                        .environment(\.locale, Locale(identifier: "en_US"))
                                        .frame(maxWidth: .infinity)
                                }
                            }
                            
                            // Time Range
                            VStack(alignment: .leading, spacing: Spacing.xs) {
                                Text("Time Range")
                                    .font(.bodySmall)
                                    .foregroundStyle(AppTheme.textSecondary)
                                HStack(spacing: Spacing.sm) {
                                    DatePicker("From", selection: $filterStartTime, displayedComponents: .hourAndMinute)
                                        .datePickerStyle(.compact)
                                        .labelsHidden()
                                        .frame(maxWidth: .infinity)
                                    Text("to")
                                        .font(.bodySmall)
                                        .foregroundStyle(AppTheme.textSecondary)
                                    DatePicker("To", selection: $filterEndTime, displayedComponents: .hourAndMinute)
                                        .datePickerStyle(.compact)
                                        .labelsHidden()
                                        .frame(maxWidth: .infinity)
                                }
                            }
                            
                            // Search Button
                            Button {
                                Task {
                                    await searchTrainersWithAvailability()
                                }
                            } label: {
                                HStack {
                                    if isSearchingTrainers {
                                        ProgressView()
                                            .tint(.white)
                                            .scaleEffect(0.8)
                                    } else {
                                        Image(systemName: "magnifyingglass")
                                            .font(.system(size: 16, weight: .semibold))
                                    }
                                    Text(isSearchingTrainers ? "Searching..." : "Find Trainers")
                                        .font(.headingSmall)
                                }
                                .foregroundStyle(.white)
                                .frame(maxWidth: .infinity)
                                .frame(height: 48)
                                .background(
                                    RoundedRectangle(cornerRadius: CornerRadius.md)
                                        .fill(AppTheme.primary)
                                )
                            }
                            .buttonStyle(.plain)
                            .disabled(isSearchingTrainers)
                        }
                    }
                    .padding(.horizontal, Spacing.lg)
                    
                    // Filtered Results
                    if hasSearched {
                        if filteredTrainers.isEmpty {
                            CardView(padding: Spacing.md) {
                                VStack(spacing: Spacing.sm) {
                                    Image(systemName: "calendar.badge.exclamationmark")
                                        .font(.system(size: 40))
                                        .foregroundStyle(AppTheme.textTertiary)
                                    Text("No Trainers Available")
                                        .font(.headingSmall)
                                        .foregroundStyle(AppTheme.textPrimary)
                                    Text("No trainers have availability during your selected time frame:")
                                        .font(.bodyMedium)
                                        .foregroundStyle(AppTheme.textSecondary)
                                        .multilineTextAlignment(.center)
                                    
                                    VStack(spacing: Spacing.xxs) {
                                        Text("\(filterStartDate.formatted(date: .abbreviated, time: .omitted)) - \(filterEndDate.formatted(date: .abbreviated, time: .omitted))")
                                            .font(.bodyMedium)
                                            .fontWeight(.semibold)
                                            .foregroundStyle(AppTheme.textPrimary)
                                        Text("\(filterStartTime.formatted(date: .omitted, time: .shortened)) - \(filterEndTime.formatted(date: .omitted, time: .shortened))")
                                            .font(.bodyMedium)
                                            .fontWeight(.semibold)
                                            .foregroundStyle(AppTheme.textPrimary)
                                    }
                                    .padding(.vertical, Spacing.xs)
                                    
                                    Text("Try expanding your date or time range")
                                        .font(.bodySmall)
                                        .foregroundStyle(AppTheme.textSecondary)
                                        .multilineTextAlignment(.center)
                                }
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, Spacing.lg)
                            }
                            .padding(.horizontal, Spacing.lg)
                        } else {
                            CardView(padding: Spacing.md) {
                                VStack(alignment: .leading, spacing: Spacing.sm) {
                                    Text("\(filteredTrainers.count) Trainer\(filteredTrainers.count == 1 ? "" : "s") Available")
                                        .font(.headingSmall)
                                        .foregroundStyle(AppTheme.textPrimary)
                                    
                                    ForEach(filteredTrainers, id: \.id) { trainer in
                                        Button {
                                            selectedTrainer = trainer
                                            hasSearched = false
                                            showTrainerFilter = false
                                            selectedSlot = nil
                                            Task {
                                                await loadMonthIfPossible()
                                                await loadDayIfPossible()
                                            }
                                        } label: {
                                            HStack(spacing: Spacing.md) {
                                                TrainerAvatarView(trainer: trainer, size: 40)
                                                VStack(alignment: .leading, spacing: Spacing.xxs) {
                                                    Text(trainer.name ?? "Unnamed")
                                                        .font(.bodyMedium)
                                                        .foregroundStyle(AppTheme.textPrimary)
                                                    Text("Professional Trainer")
                                                        .font(.bodySmall)
                                                        .foregroundStyle(AppTheme.textSecondary)
                                                }
                                                Spacer()
                                                Image(systemName: "chevron.right")
                                                    .font(.system(size: 14, weight: .semibold))
                                                    .foregroundStyle(AppTheme.textTertiary)
                                            }
                                            .padding(Spacing.sm)
                                            .background(
                                                RoundedRectangle(cornerRadius: CornerRadius.sm)
                                                    .fill(Color.platformSecondaryBackground)
                                            )
                                        }
                                        .buttonStyle(.plain)
                                    }
                                }
                            }
                            .padding(.horizontal, Spacing.lg)
                        }
                    }
                }
            }
    }
    
    private var trainerSelectionSection: some View {
        TrainerSelectionCard(
            selectedTrainer: selectedTrainer,
            trainers: trainersService.trainers,
            onSelect: { trainer in
                selectedTrainer = trainer
                selectedSlot = nil
                Task {
                    await loadMonthIfPossible()
                    await loadDayIfPossible()
                }
            },
            onInfoTapped: {
                showBookingInstructions = true
            }
        )
    }
    
    private var calendarSection: some View {
        Group {
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
                .padding(Spacing.md)
                .background(
                    RoundedRectangle(cornerRadius: CornerRadius.lg)
                        .fill(Color.platformBackground)
                        .shadow(color: AppTheme.primary.opacity(0.1), radius: 8, x: 0, y: 2)
                )
                .overlay(
                    RoundedRectangle(cornerRadius: CornerRadius.lg)
                        .stroke(AppTheme.primary.opacity(0.2), lineWidth: 1)
                )
                .padding(.horizontal, Spacing.lg)
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
                            ProgressView().tint(AppTheme.primary)
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
                                        RoundedRectangle(cornerRadius: CornerRadius.xs)
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
                                    RoundedRectangle(cornerRadius: CornerRadius.md)
                                        .fill(Color.platformBackground)
                                        .overlay(
                                            RoundedRectangle(cornerRadius: CornerRadius.md)
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
        }
    }
    
    private var packageSelectionSection: some View {
        Group {
            if !availableLessonPackages.isEmpty {
                PackageSelectionCard(
                    packages: availableLessonPackages,
                    selectedPackage: selectedPackage,
                    pricingStructure: pricingService.pricingStructure,
                    onSelect: { package in
                        selectedPackage = package
                        // Initialize selectedAthletes array immediately with correct count
                        if let category = getPackageCategory(package), category.isPrivateLesson {
                            selectedAthletes = Array(repeating: nil, count: category.athleteCount)
                        } else {
                            selectedAthletes = []
                        }
                    }
                )
            }
        }
    }
    
    private var athleteSelectionSection: some View {
        Group {
            // Dynamic Athlete Selection (shown after package selection)
            if let pkg = selectedPackage,
               let category = getPackageCategory(pkg),
               category.isPrivateLesson,
               !allAthletes.isEmpty {
                let athleteCount = category.athleteCount
                
                VStack(alignment: .leading, spacing: Spacing.md) {
                    Text(athleteCount == 1 ? "Who is this lesson for?" : "Select \(athleteCount) Athletes")
                        .font(.headingMedium)
                        .foregroundStyle(AppTheme.textPrimary)
                        .padding(.horizontal, Spacing.lg)
                    
                    ForEach(0..<min(athleteCount, selectedAthletes.count), id: \.self) { index in
                        athleteSelectionCard(for: index, athleteCount: athleteCount)
                    }
                }
                .task(id: athleteCount) {
                    ensureSelectedAthletesCount(athleteCount)
                }
                .onChangeCompat(of: selectedPackage?.id) { _, _ in
                    ensureSelectedAthletesCount(athleteCount)
                }
            }
        }
    }
    
    private func athleteSelectionCard(for index: Int, athleteCount: Int) -> some View {
        AthleteSelectionCard(
            index: index,
            athleteCount: athleteCount,
            selectedAthlete: selectedAthletes[safe: index] ?? nil,
            availableAthletes: availableAthletesFor(index: index),
            hasWaiver: athleteWaiverStatus[index],
            isNew: isNewAthlete[index],
            onSelect: { athleteName in
                guard index < selectedAthletes.count else { return }
                selectedAthletes[index] = athleteName
                isNewAthlete[index] = false
                
                // Ensure intake form exists for this athlete
                if athleteIntakeForms[index] == nil {
                    let newForm = IntakeFormData()
                    newForm.onUpdate = {
                        formUpdateTrigger.toggle()
                    }
                    athleteIntakeForms[index] = newForm
                }
                
                loadAthleteProfileData(athleteName: athleteName, index: index)
                Task {
                    await checkWaiverStatusForAthlete(athleteName: athleteName, index: index)
                }
            },
            onAddNew: {
                addAthleteForIndex = index
                newAthleteFirstName = ""
                newAthleteLastName = ""
                newAthleteIntakeData.fieldValues.removeAll()
                showAddAthleteSheet = true
            }
        )
    }
    
    private var athleteProfileSection: some View {
        Group {
            // Athlete Profile Information (shown for each selected athlete)
            ForEach(Array(selectedAthletes.enumerated()), id: \.offset) { index, athleteName in
                if let name = athleteName {
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        HStack {
                            Text("\(name) Information")
                                .font(.headingMedium)
                                .foregroundStyle(AppTheme.textPrimary)
                            Spacer()
                            Button {
                                withAnimation {
                                    athleteInfoExpanded[index] = !(athleteInfoExpanded[index] ?? true)
                                }
                            } label: {
                                Image(systemName: (athleteInfoExpanded[index] ?? true) ? "chevron.up" : "chevron.down")
                                    .font(.system(size: 16, weight: .semibold))
                                    .foregroundStyle(AppTheme.primary)
                            }
                            .buttonStyle(.plain)
                        }
                        .padding(.horizontal, Spacing.lg)
                        
                        if athleteInfoExpanded[index] ?? true,
                           let athleteForm = athleteIntakeForms[index] {
                            CardView(padding: Spacing.md) {
                                // Use dynamic intake form fields for this athlete
                                DynamicIntakeFormView(
                                    formData: athleteForm,
                                    fields: intakeFormService.fields
                                )
                            }
                            .padding(.horizontal, Spacing.lg)
                        }
                    }
                }
            }
        }
    }
    
    private var lessonNotesSection: some View {
        Group {
            // Lesson Notes (shown after athlete selection)
            if isAthleteInfoComplete {
                VStack(alignment: .leading, spacing: Spacing.md) {
                    Text("Notes for Trainer")
                        .font(.headingMedium)
                        .foregroundStyle(AppTheme.textPrimary)
                        .padding(.horizontal, Spacing.lg)
                    
                    CardView(padding: Spacing.md) {
                        TextEditor(text: $lessonNotes)
                            .font(.bodyMedium)
                            .frame(minHeight: 100)
                            .scrollContentBackground(.hidden)
                            .background(Color.platformSecondaryBackground)
                            .cornerRadius(CornerRadius.sm)
                            .overlay(
                                Group {
                                    if lessonNotes.isEmpty {
                                        Text("Add any notes for the trainer about this lesson...")
                                            .font(.bodyMedium)
                                            .foregroundStyle(AppTheme.textTertiary)
                                            .padding(.horizontal, Spacing.sm)
                                            .padding(.vertical, Spacing.sm + 4)
                                            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                                            .allowsHitTesting(false)
                                    }
                                }
                            )
                    }
                    .padding(.horizontal, Spacing.lg)
                }
            }
        }
    }
    
    private var bookingButton: some View {
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
                        ProgressView().tint(.white)
                    } else if !packagesService.hasAvailableLessons {
                        Image(systemName: "cart.badge.plus")
                    }
                    Text(bookButtonText)
                }
            }
            .buttonStyle(PrimaryButtonStyle())
            .disabled(bookingInFlight || selectedTrainer == nil || selectedSlot == nil || (availableLessonPackages.count > 0 && selectedPackage == nil) || !isAthleteInfoComplete)
            .opacity((selectedTrainer != nil && selectedSlot != nil && (availableLessonPackages.isEmpty || selectedPackage != nil) && isAthleteInfoComplete) ? 1.0 : 0.5)
            .padding(.horizontal, Spacing.lg)
            .padding(.top, Spacing.md)
    }
    
    private var noPassesWarning: some View {
        Group {
            // Show warning when no passes available in lessons mode
            if mode == .lessons && !packagesService.hasAvailableLessons {
                Text("Purchase passes in your Profile to book a private")
                    .font(.bodySmall)
                    .foregroundStyle(.red)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, Spacing.lg)
                    .padding(.top, Spacing.xs)
            }
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
                HStack { Spacer(); ProgressView().tint(AppTheme.primary); Spacer() }
                    .padding(Spacing.xl)
            } else if availableClasses.isEmpty {
                EmptyStateView(
                    icon: "calendar",
                    title: "No Classes Available",
                    message: "Check back soon for upcoming group classes!"
                )
                .padding(.horizontal, Spacing.lg)
                .padding(.top, Spacing.xl)
            } else {
                VStack(spacing: Spacing.sm) {
                    ForEach(availableClasses) { classItem in
                        ClassCard(
                            classItem: classItem,
                            onTap: { selectedClass = classItem },
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
    
    private var isBookEnabled: Bool {
        guard mode == .lessons,
              selectedTrainer?.id != nil,
              selectedSlot?.id != nil else { return false }
        return packagesService.hasAvailableLessons
    }
    
    private func canBookSlot(_ slot: AvailabilitySlot) -> Bool {
        let minHours = settingsService.settings?.minBookingHours ?? 4
        let now = Date()
        let minimumBookingTime = now.addingTimeInterval(Double(minHours) * 60 * 60)
        return slot.startTime >= minimumBookingTime
    }
    
    private var bookButtonText: String {
        if mode == .classes { return "Confirm Booking" }
        if !packagesService.hasAvailableLessons { return "Purchase Passes to Continue" }
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
    
    private func searchTrainersWithAvailability() async {
        guard let orgId = auth.currentOrgId else { return }
        
        // Validate date range
        guard filterStartDate <= filterEndDate else {
            filteredTrainers = []
            hasSearched = true
            return
        }
        
        isSearchingTrainers = true
        defer {
            isSearchingTrainers = false
            hasSearched = true
        }
        
        var trainersWithAvailability: [Trainer] = []
        let calendar = Calendar.current
        
        // Get time components from filter times
        let startHour = calendar.component(.hour, from: filterStartTime)
        let startMinute = calendar.component(.minute, from: filterStartTime)
        let endHour = calendar.component(.hour, from: filterEndTime)
        let endMinute = calendar.component(.minute, from: filterEndTime)
        
        // Convert to minutes for easier comparison
        let filterStartMinutes = startHour * 60 + startMinute
        let filterEndMinutes = endHour * 60 + endMinute
        
        // Validate time range
        guard filterStartMinutes < filterEndMinutes else {
            filteredTrainers = []
            return
        }
        
        // Calculate number of days to check (limit to reasonable range)
        let daysDifference = calendar.dateComponents([.day], from: filterStartDate, to: filterEndDate).day ?? 0
        let maxDaysToCheck = min(daysDifference + 1, 14) // Limit to 2 weeks max
        
        // Iterate through each trainer
        for trainer in trainersService.trainers {
            guard let trainerId = trainer.id else { continue }
            
            var hasAvailability = false
            
            // Check each date in the range (up to max)
            for dayOffset in 0..<maxDaysToCheck {
                guard let checkDate = calendar.date(byAdding: .day, value: dayOffset, to: filterStartDate) else { continue }
                
                // Skip if date is beyond end date
                if checkDate > filterEndDate { break }
                
                // Load the trainer's schedule for this date
                await scheduleService.loadOpenSlots(for: trainerId, on: checkDate, orgId: orgId)
                
                // Check if any slots match the time range
                for slot in scheduleService.daySlots {
                    let slotHour = calendar.component(.hour, from: slot.startTime)
                    let slotMinute = calendar.component(.minute, from: slot.startTime)
                    let slotStartMinutes = slotHour * 60 + slotMinute
                    
                    // Check if slot falls within the time range and is bookable
                    if slotStartMinutes >= filterStartMinutes && 
                       slotStartMinutes < filterEndMinutes && 
                       canBookSlot(slot) {
                        hasAvailability = true
                        break
                    }
                }
                
                // Early exit if we found availability for this trainer
                if hasAvailability {
                    break
                }
            }
            
            if hasAvailability {
                trainersWithAvailability.append(trainer)
            }
        }
        
        // Sort results: prioritize trainers with more availability
        filteredTrainers = trainersWithAvailability.sorted { lhs, rhs in
            let lhsPriority = isJeff(lhs) ? 0 : 1
            let rhsPriority = isJeff(rhs) ? 0 : 1
            if lhsPriority != rhsPriority { return lhsPriority < rhsPriority }
            let ln = lhs.name ?? ""
            let rn = rhs.name ?? ""
            return ln.localizedCaseInsensitiveCompare(rn) == .orderedAscending
        }
    }

    private func performBooking() async {
        guard let slot = selectedSlot else { return }
        if !canBookSlot(slot) {
            bookingAlert = .init(
                title: "Booking Not Available",
                message: "Lessons cannot be booked within \(settingsService.settings?.minBookingHours ?? 4) hours of the start time. Please contact your trainer for assistance."
            )
            return
        }
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
            // Check waivers FIRST, before creating the booking - sequential for all athletes
            if let userId = Auth.auth().currentUser?.uid {
                // Check each selected athlete for waivers sequentially
                for (index, athleteName) in selectedAthletes.enumerated() {
                    guard let name = athleteName else { continue }
                    
                    let athleteHasWaiver = try await checkAthleteHasWaiver(userId: userId, athleteName: name)
                    if !athleteHasWaiver {
                        // This athlete needs to sign - show waiver for them
                        pendingBookingSuccess = false
                        currentWaiverAthleteIndex = index
                        showWaiverAgreement = true
                        return
                    }
                }
                
                // Legacy waiver check (for users without athletes)
                if selectedAthletes.isEmpty {
                    let waiverCheck = try await settingsService.checkWaiverRequirement(
                        userId: userId,
                        settings: settingsService.settings
                    )
                    if waiverCheck.required && !waiverCheck.signed {
                        pendingBookingSuccess = false
                        currentWaiverAthleteIndex = nil
                        showWaiverAgreement = true
                        return
                    }
                }
            }
            
            // All waivers are signed, now show confirmation dialog
            showBookingConfirmation = true
        } catch {
            let cleanMessage: String
            var navigateToPasses = false
            
            if error.localizedDescription.contains("credits") || error.localizedDescription.contains("package") {
                cleanMessage = "We couldn't complete your booking. That package has no passes remaining."
                navigateToPasses = true
            } else if error.localizedDescription.contains("concurrent") || error.localizedDescription.contains("capacity") {
                cleanMessage = "This time slot is temporarily unavailable. Please try a different time or refresh the schedule."
            } else {
                cleanMessage = "We couldn't complete your booking. \(error.localizedDescription)"
            }
            
            bookingAlert = .init(
                title: "Booking Failed",
                message: cleanMessage,
                action: navigateToPasses ? {
                    profileTab = "PASSES"
                    selectedTab = 2
                } : nil
            )
        }
    }
    
    private func confirmAndBookLesson() async {
        guard let trainerId = selectedTrainer?.id,
              let slotId = selectedSlot?.id else {
            return
        }
        
        bookingInFlight = true
        defer { bookingInFlight = false }
        
        do {
            // Save all athlete information to profile
            for (index, athleteName) in selectedAthletes.enumerated() {
                if let name = athleteName, let athleteForm = athleteIntakeForms[index] {
                    try await saveAthleteInfoToProfile(athleteName: name, formData: athleteForm)
                }
            }
            
            let packageId = selectedPackage?.id ?? ""
            // Get all athlete names from selectedAthletes array
            let athleteNames = selectedAthletes.compactMap { $0 }
            let athleteForBooking = athleteNames.first ?? nil
            let secondAthleteForBooking = athleteNames.count > 1 ? athleteNames[1] : nil
            let notesForBooking = lessonNotes.isEmpty ? nil : lessonNotes
            
            _ = try await bookingManager.bookLesson(
                trainerId: trainerId,
                slotId: slotId,
                lessonPackageId: packageId,
                athleteName: athleteForBooking,
                secondAthleteName: secondAthleteForBooking,
                athleteNames: athleteNames,
                lessonNotes: notesForBooking
            )
            
            AnalyticsService.shared.logBookingCreated(
                bookingId: "\(trainerId)_\(slotId)",
                trainerId: trainerId,
                clientId: Auth.auth().currentUser?.uid ?? ""
            )
            
            await finishBookingSuccess()
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
                    selectedTab = 2
                } : nil
            )
        }
    }
    
    // Save new athlete to user profile
    private func saveNewAthleteToProfile() async throws {
        guard let authUserId = Auth.auth().currentUser?.uid else { return }
        guard let profile = usersService.currentUser else { return }
        
        let db = Firestore.firestore()
        
        // Query to find user document ID by authUserId field
        let userQuery = try await db.collection("users")
            .whereField("authUserId", isEqualTo: authUserId)
            .limit(to: 1)
            .getDocuments()
        
        guard let userDoc = userQuery.documents.first else {
            throw NSError(domain: "BookView", code: 404, userInfo: [NSLocalizedDescriptionKey: "User profile not found"])
        }
        
        let userRef = db.collection("users").document(userDoc.documentID)
        
        // Determine next athlete number
        let athletes = profile.athletes ?? []
        let legacyCount = [
            profile.athleteFirstName != nil,
            profile.athlete2FirstName != nil,
            profile.athlete3FirstName != nil
        ].filter { $0 }.count
        
        let totalAthletes = max(athletes.count, legacyCount)
        
        // Extract athlete info from dynamic form data
        // Handle both fullName and separate firstName/lastName fields
        var firstName = ""
        var lastName = ""
        
        if let fullName = newAthleteIntakeData.fieldValues["athleteFullName"] as? String, !fullName.isEmpty {
            // Split full name into first and last
            let parts = fullName.split(separator: " ", maxSplits: 1)
            firstName = String(parts.first ?? "")
            lastName = parts.count > 1 ? String(parts.last ?? "") : ""
        } else {
            // Use separate fields if available
            firstName = newAthleteIntakeData.fieldValues["athleteFirstName"] as? String ?? ""
            lastName = newAthleteIntakeData.fieldValues["athleteLastName"] as? String ?? ""
        }
        
        let birthday = newAthleteIntakeData.fieldValues["athleteBirthday"] as? String ?? ""
        let schoolTeam = newAthleteIntakeData.fieldValues["schoolTeam"] as? String ?? ""
        let experienceLevel = newAthleteIntakeData.fieldValues["experienceLevel"] as? String ?? ""
        let position = newAthleteIntakeData.fieldValues["position"] as? String ?? ""
        
        // Create new athlete info
        let newAthlete: [String: Any] = [
            "firstName": firstName,
            "lastName": lastName,
            "birthday": birthday,
            "schoolClubTeam": schoolTeam,
            "experienceLevel": experienceLevel,
            "position": position
        ]
        
        // Add to athletes array if using new format
        if !athletes.isEmpty || totalAthletes == 0 {
            try await userRef.updateData([
                "athletes": FieldValue.arrayUnion([newAthlete])
            ])
        } else {
            // Use legacy format
            let athleteNum = totalAthletes + 1
            let prefix = athleteNum == 1 ? "athlete" : "athlete\(athleteNum)"
            try await userRef.updateData([
                "\(prefix)FirstName": firstName,
                "\(prefix)LastName": lastName,
                "\(prefix)Birthday": birthday
            ])
        }
        
        // Update parent/emergency contact if provided
        let emergencyName = newAthleteIntakeData.fieldValues["emergencyContactName"] as? String ?? ""
        let emergencyPhone = newAthleteIntakeData.fieldValues["emergencyContactNumber"] as? String ?? ""
        
        var updates: [String: Any] = [:]
        if !emergencyName.isEmpty {
            updates["emergencyContactName"] = emergencyName
        }
        if !emergencyPhone.isEmpty {
            updates["emergencyContactNumber"] = emergencyPhone
        }
        if !updates.isEmpty {
            try await userRef.updateData(updates)
        }
        
        // Reload user profile
        Task {
            await usersService.loadCurrentUserIfAvailable()
        }
    }
    
    // Save athlete info provided during booking to user profile
    private func saveAthleteInfoToProfile(athleteName: String, formData: IntakeFormData) async throws {
        guard let authUserId = Auth.auth().currentUser?.uid else { return }
        guard let profile = usersService.currentUser else { return }
        
        let db = Firestore.firestore()
        
        // Query to find user document ID by authUserId field
        let userQuery = try await db.collection("users")
            .whereField("authUserId", isEqualTo: authUserId)
            .limit(to: 1)
            .getDocuments()
        
        guard let userDoc = userQuery.documents.first else {
            throw NSError(domain: "BookView", code: 404, userInfo: [NSLocalizedDescriptionKey: "User profile not found"])
        }
        
        let userRef = db.collection("users").document(userDoc.documentID)
        
        // Extract values from the athlete's form data
        let birthday = formData.fieldValues["athleteBirthday"] as? String ?? ""
        let schoolTeam = formData.fieldValues["schoolTeam"] as? String ?? ""
        let experienceLevel = formData.fieldValues["experienceLevel"] as? String ?? ""
        let position = formData.fieldValues["position"] as? String ?? ""
        let emergencyName = formData.fieldValues["emergencyContactName"] as? String ?? ""
        let emergencyPhone = formData.fieldValues["emergencyContactNumber"] as? String ?? ""
        
        // Find the athlete in the profile
        let athletes = profile.athletes ?? []
        if let athleteIndex = athletes.firstIndex(where: { athlete in
            athlete.displayName == athleteName
        }) {
            // Update existing athlete in new format
            var updatedAthletes = athletes
            var athleteToUpdate = updatedAthletes[athleteIndex]
            
            // Update fields if they were provided
            if !birthday.isEmpty {
                athleteToUpdate.birthday = birthday
            }
            if !schoolTeam.isEmpty {
                athleteToUpdate.schoolClubTeam = schoolTeam
            }
            if !experienceLevel.isEmpty {
                athleteToUpdate.experienceLevel = experienceLevel
            }
            if !position.isEmpty {
                athleteToUpdate.position = position
            }
            
            updatedAthletes[athleteIndex] = athleteToUpdate
            
            try await userRef.updateData([
                "athletes": updatedAthletes.map { athlete in
                    [
                        "firstName": athlete.firstName ?? "",
                        "lastName": athlete.lastName ?? "",
                        "birthday": athlete.birthday ?? "",
                        "schoolClubTeam": athlete.schoolClubTeam ?? "",
                        "experienceLevel": athlete.experienceLevel ?? "",
                        "position": athlete.position ?? ""
                    ] as [String: Any]
                }
            ])
        } else {
            // Check legacy athlete fields
            var updates: [String: Any] = [:]
            
            let legacyAthleteNames = [
                (profile.athleteFirstName, profile.athleteLastName, "athlete"),
                (profile.athlete2FirstName, profile.athlete2LastName, "athlete2"),
                (profile.athlete3FirstName, profile.athlete3LastName, "athlete3")
            ]
            
            for (firstName, lastName, prefix) in legacyAthleteNames {
                let f = (firstName ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
                let l = (lastName ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
                let fullName = [f, l].filter { !$0.isEmpty }.joined(separator: " ")
                if fullName == athleteName {
                    if !birthday.isEmpty {
                        updates["\(prefix)Birthday"] = birthday
                    }
                    if !schoolTeam.isEmpty {
                        updates["\(prefix)SchoolClubTeam"] = schoolTeam
                    }
                    if !experienceLevel.isEmpty {
                        updates["\(prefix)ExperienceLevel"] = experienceLevel
                    }
                    if !position.isEmpty {
                        updates["\(prefix)Position"] = position
                    }
                    break
                }
            }
            
            if !updates.isEmpty {
                try await userRef.updateData(updates)
            }
        }
        
        // Update emergency contact info if provided
        var contactUpdates: [String: Any] = [:]
        if !emergencyName.isEmpty {
            contactUpdates["emergencyContactName"] = emergencyName
        }
        if !emergencyPhone.isEmpty {
            contactUpdates["emergencyContactNumber"] = emergencyPhone
        }
        
        if !contactUpdates.isEmpty {
            try await userRef.updateData(contactUpdates)
        }
        
        // Reload user profile
        Task {
            await usersService.loadCurrentUserIfAvailable()
        }
    }
    
    // Check if athlete has a waiver on file
    private func checkAthleteHasWaiver(userId: String, athleteName: String) async throws -> Bool {
        let documents = try await DocumentsService.shared.fetchDocuments(userId: userId)
        
        // Normalize the athlete name for comparison
        let normalizedAthleteName = athleteName.lowercased().trimmingCharacters(in: .whitespaces)
        
        // Check if any waiver document exists for this athlete
        for doc in documents {
            if doc.type == "waiver" {
                // Check for exact athlete name match
                if let docAthleteName = doc.athleteName?.lowercased().trimmingCharacters(in: .whitespaces) {
                    // Require exact match
                    if docAthleteName == normalizedAthleteName {
                        return true
                    }
                }
                
                // Fallback: Check signedBy field for exact match (legacy waivers without athleteName)
                if doc.athleteName == nil, let signedByName = doc.signedBy?.lowercased().trimmingCharacters(in: .whitespaces) {
                    if signedByName == normalizedAthleteName {
                        return true
                    }
                }
            }
        }
        
        return false
    }
    
    private func checkWaiverStatusForAthlete(athleteName: String, index: Int) async {
        guard let userId = Auth.auth().currentUser?.uid else { return }
        
        do {
            let hasWaiver = try await checkAthleteHasWaiver(userId: userId, athleteName: athleteName)
            await MainActor.run {
                athleteWaiverStatus[index] = hasWaiver
            }
        } catch {
            print("Error checking waiver status: \(error)")
            // Default to needs waiver on error
            await MainActor.run {
                athleteWaiverStatus[index] = false
            }
        }
    }
    
    private func finishBookingSuccess() async {
        let trainerName = selectedTrainer?.name ?? "your trainer"
        bookingAlert = .init(
            title: "Booking Confirmed! 🎉",
            message: "You have successfully booked with \(trainerName). See you soon!"
        )
        await packagesService.loadMyPackages()
        await loadDayIfPossible()
        await loadMonthIfPossible()
        
        // Clear all booking form fields
        selectedSlot = nil
        selectedPackage = nil
        selectedAthletes = []
        lessonNotes = ""
        currentWaiverAthleteIndex = nil
        
        // Clear dynamic form data for all athletes
        intakeFormData.fieldValues.removeAll()
        newAthleteIntakeData.fieldValues.removeAll()
        athleteIntakeForms.removeAll()
        athleteWaiverStatus.removeAll()
        isNewAthlete.removeAll()
        
        // Dismiss keyboard
        UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
    }
    
    private func handleWaiverAgreement() async {
        guard let userId = Auth.auth().currentUser?.uid,
              let profile = usersService.currentUser else {
            showWaiverAgreement = false
            pendingBookingSuccess = false
            currentWaiverAthleteIndex = nil
            return
        }
        do {
            // Create waiver signature from user profile
            let signature = WaiverSignature(
                firstName: profile.firstName ?? "",
                lastName: profile.lastName ?? "",
                email: profile.emailAddress ?? "",
                phoneNumber: profile.phoneNumber ?? "",
                isMinor: true, // Assume minor since most clients are minors
                signedAt: Date()
            )
            
            // Get athlete name for this waiver
            let athleteForWaiver: String? = if let index = currentWaiverAthleteIndex,
                                              index < selectedAthletes.count,
                                              let name = selectedAthletes[index] {
                name
            } else {
                nil
            }
            
            // Generate PDF with custom waiver text from settings
            guard let pdfData = WaiverPDFGenerator.generateWaiverPDF(
                signature: signature,
                organizationName: auth.organizationName ?? "Your Organization",
                customWaiverText: settingsService.settings?.waiverText,
                athleteName: athleteForWaiver
            ) else {
                throw NSError(domain: "WaiverError", code: -1, userInfo: [NSLocalizedDescriptionKey: "Failed to generate PDF"])
            }
            
            // Save waiver document with PDF
            _ = try await DocumentsService.shared.saveWaiverDocument(
                userId: userId,
                pdfData: pdfData,
                signature: signature,
                athleteName: athleteForWaiver
            )
            
            if let orgId = auth.currentOrgId {
                AnalyticsService.shared.logWaiverSigned(userId: userId, orgId: orgId)
            }
            
            // Dismiss waiver sheet
            showWaiverAgreement = false
            
            // Check if there are more athletes who need waivers
            if let currentIndex = currentWaiverAthleteIndex {
                // Look for next athlete who needs a waiver
                var foundNextAthlete = false
                for index in (currentIndex + 1)..<selectedAthletes.count {
                    if let athleteName = selectedAthletes[index] {
                        let hasWaiver = try await checkAthleteHasWaiver(userId: userId, athleteName: athleteName)
                        if !hasWaiver {
                            // Show waiver for next athlete
                            currentWaiverAthleteIndex = index
                            showWaiverAgreement = true
                            foundNextAthlete = true
                            return
                        }
                    }
                }
                
                if !foundNextAthlete {
                    // All athletes have waivers now, proceed with booking
                    currentWaiverAthleteIndex = nil
                    await performActualBooking()
                }
            } else {
                // Legacy waiver (no athletes) - proceed with booking
                await performActualBooking()
            }
            
            // Reset flags
            pendingBookingSuccess = false
        } catch {
            showWaiverAgreement = false
            pendingBookingSuccess = false
            currentWaiverAthleteIndex = nil
            bookingAlert = .init(
                title: "Waiver Error",
                message: "Failed to save waiver agreement. Please try again."
            )
        }
    }
    
    // Actually create the booking (called after waiver is signed)
    private func performActualBooking() async {
        guard let trainerId = selectedTrainer?.id,
              let slotId = selectedSlot?.id else {
            return
        }
        
        do {
            // Save athlete information to profile for first athlete if provided
            if let firstAthlete = selectedAthletes.first,
               let athleteName = firstAthlete,
               let form = athleteIntakeForms[0] {
                try await saveAthleteInfoToProfile(athleteName: athleteName, formData: form)
            }
            
            let packageId = selectedPackage?.id ?? ""
            let athleteForBooking = selectedAthletes.first ?? nil
            let secondAthleteForBooking = selectedAthletes.count > 1 ? selectedAthletes[1] : nil
            let notesForBooking = lessonNotes.isEmpty ? nil : lessonNotes
            
            _ = try await bookingManager.bookLesson(
                trainerId: trainerId,
                slotId: slotId,
                lessonPackageId: packageId,
                athleteName: athleteForBooking,
                secondAthleteName: secondAthleteForBooking,
                lessonNotes: notesForBooking
            )
            
            AnalyticsService.shared.logBookingCreated(
                bookingId: "\(trainerId)_\(slotId)",
                trainerId: trainerId,
                clientId: Auth.auth().currentUser?.uid ?? ""
            )
            
            await finishBookingSuccess()
        } catch {
            let cleanMessage: String
            var navigateToPasses = false
            
            if error.localizedDescription.contains("credits") || error.localizedDescription.contains("package") {
                cleanMessage = "We couldn't complete your booking. That package has no passes remaining."
                navigateToPasses = true
            } else if error.localizedDescription.contains("concurrent") || error.localizedDescription.contains("capacity") {
                cleanMessage = "This time slot is temporarily unavailable. Please try a different time or refresh the schedule."
            } else {
                cleanMessage = "We couldn't complete your booking. \(error.localizedDescription)"
            }
            
            bookingAlert = .init(
                title: "Booking Failed",
                message: cleanMessage,
                action: navigateToPasses ? {
                    profileTab = "PASSES"
                    selectedTab = 2
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
    
    // Ensures selectedAthletes has the correct length for the current package's athlete count
    private func ensureSelectedAthletesCount(_ count: Int) {
        if selectedAthletes.count != count {
            selectedAthletes = Array(repeating: nil, count: count)
        }
    }
}

private extension Date {
    func startOfMonth() -> Date {
        Calendar.current.date(from: Calendar.current.dateComponents([.year, .month], from: self))!
    }
}
