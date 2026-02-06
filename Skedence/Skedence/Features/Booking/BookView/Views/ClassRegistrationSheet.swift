//
//  ClassRegistrationSheet.swift
//  Skedence
//
//  Extracted from BookView.swift - Class registration flow
//

import SwiftUI
import FirebaseAuth
import FirebaseFirestore

struct ClassRegistrationSheet: View {
    @EnvironmentObject var auth: AuthManager
    @Environment(\.dismiss) private var dismiss
    let classItem: GroupClass
    @ObservedObject var classesService: ClassesService
    @ObservedObject var usersService: UsersService
    @ObservedObject var packagesService: PackagesService
    let onRegistered: () -> Void
    
    @StateObject private var pricingService = PricingStructureService()
    @StateObject private var settingsService = SettingsService()
    @StateObject private var intakeFormService = IntakeFormService()
    @StateObject private var intakeFormData = IntakeFormData()
    @StateObject private var newAthleteIntakeData = IntakeFormData()
    @State private var isRegistering = false
    @State private var registrationSuccessful = false
    @State private var errorMessage: String?
    @State private var selectedClassPass: LessonPackage?
    @State private var registrationCount = 0
    
    // Athlete selection state
    @State private var selectedAthleteName: String?
    @State private var isOnlyParticipant: Bool?
    @State private var secondAthleteName: String?
    @State private var isNewAthlete = false
    @State private var showWaiverAgreement = false
    @State private var pendingRegistrationSuccess = false
    @State private var pendingNewAthleteWaiver = false
    
    private var availableClassPasses: [LessonPackage] {
        let now = Date()
        let validPackageTypes = getCurrentPackageTypes(category: "class")
        let filtered = packagesService.packages.filter { pkg -> Bool in
            let canBook = pkg.canBookClasses
            let hasRemaining = pkg.lessonsRemaining > 0
            let notExpired = pkg.expirationDate >= now
            let hasClassCategory = pkg.packageCategory == "classPass" || pkg.packageCategory == "class" // backward compatibility
            let isCurrentPackage = validPackageTypes.isEmpty || validPackageTypes.contains(pkg.packageType)
            return canBook && hasRemaining && notExpired && hasClassCategory && isCurrentPackage
        }
        var packagesByType: [String: LessonPackage] = [:]
        for pkg in filtered.sorted(by: { $0.expirationDate < $1.expirationDate }) {
            if packagesByType[pkg.packageType] == nil {
                packagesByType[pkg.packageType] = pkg
            }
        }
        let grouped = Array(packagesByType.values).sorted { $0.expirationDate < $1.expirationDate }
        return grouped
    }
    
    private func totalRemaining(for packageType: String) -> Int {
        let now = Date()
        return packagesService.packages.filter { pkg in
            pkg.packageType == packageType &&
            pkg.canBookClasses &&
            pkg.lessonsRemaining > 0 &&
            pkg.expirationDate >= now &&
            (pkg.packageCategory == "classPass" || pkg.packageCategory == "class")
        }.reduce(0) { $0 + $1.lessonsRemaining }
    }
    
    private func getCurrentPackageTypes(category: String) -> Set<String> {
        guard let pricing = pricingService.pricingStructure else { return [] }
        var packageTypes = Set<String>()
        for tier in pricing.tiers {
            for package in tier.packages where category == "class" && package.packageCategory.rawValue == "classPass" {
                packageTypes.insert(package.id)
                packageTypes.insert(package.packageType)
            }
        }
        return packageTypes
    }
    
    private var availableClassPass: LessonPackage? { availableClassPasses.first }
    
    // Get all athletes from user profile (both new and legacy format)
    private var allAthletes: [String] {
        var athletes: [String] = []
        guard let profile = usersService.currentUser else { return athletes }
        
        // New format: athletes array
        if let athletesArray = profile.athletes {
            for athlete in athletesArray {
                let name = athlete.displayName
                if !name.isEmpty {
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
            if !fullName.isEmpty {
                athletes.append(fullName)
            }
        }
        
        return athletes
    }
    
    // Get remaining athletes excluding the first selected one
    private var remainingAthletes: [String] {
        guard let firstAthlete = selectedAthleteName else { return allAthletes }
        return allAthletes.filter { $0 != firstAthlete }
    }
    
    // Validate that all required athlete information is filled
    private var isAthleteInfoComplete: Bool {
        guard isOnlyParticipant != nil else { return false }
        
        // Check primary athlete info using dynamic form validation
        let primaryInfoComplete = intakeFormData.areAllRequiredFieldsComplete(intakeFormService.fields)
        guard primaryInfoComplete else { return false }
        
        // If multiple participants, check second athlete
        if isOnlyParticipant == false {
            guard secondAthleteName != nil else { return false }
            
            // If new athlete, validate all new athlete fields
            if isNewAthlete {
                let newAthleteComplete = newAthleteIntakeData.areAllRequiredFieldsComplete(intakeFormService.fields)
                return newAthleteComplete
            }
        }
        
        return true
    }
    
    // Load athlete profile data from Firebase
    private func loadAthleteProfileData() {
        guard let profile = usersService.currentUser,
              let athleteName = selectedAthleteName else { return }
        
        // Pre-populate intake form data from profile
        intakeFormData.populateFromUserProfile(profile)
        
        // Find athlete in new format
        if let athletesArray = profile.athletes {
            if let athlete = athletesArray.first(where: { $0.displayName == athleteName }) {
                intakeFormData.populateFromAthlete(athlete)
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
            intakeFormData.populateFromAthlete(athlete)
        }
    }
    
    // Check if an athlete has signed a waiver
    private func checkAthleteHasWaiver(userId: String, athleteName: String) async throws -> Bool {
        let db = Firestore.firestore()
        let waiverRef = db.collection("users").document(userId).collection("waivers").document(athleteName)
        let waiverDoc = try await waiverRef.getDocument()
        return waiverDoc.exists
    }
    
    // Handle waiver agreement
    private func handleWaiverAgreement() async {
        guard let userId = Auth.auth().currentUser?.uid else { return }
        
        let db = Firestore.firestore()
        let now = Timestamp(date: Date())
        
        // Determine which athlete needs the waiver
        var athleteName: String
        if pendingNewAthleteWaiver {
            // Get name from new athlete form data
            if let fullName = newAthleteIntakeData.fieldValues["athleteFullName"] as? String, !fullName.isEmpty {
                athleteName = fullName.trimmingCharacters(in: .whitespacesAndNewlines)
            } else {
                let f = (newAthleteIntakeData.fieldValues["athleteFirstName"] as? String ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
                let l = (newAthleteIntakeData.fieldValues["athleteLastName"] as? String ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
                athleteName = [f, l].filter { !$0.isEmpty }.joined(separator: " ")
            }
        } else {
            athleteName = selectedAthleteName ?? ""
        }
        
        let waiverRef = db.collection("users").document(userId).collection("waivers").document(athleteName)
        try? await waiverRef.setData([
            "athleteName": athleteName,
            "signedAt": now,
            "waiverText": settingsService.settings?.waiverText ?? ""
        ])
        
        // Continue with registration
        showWaiverAgreement = false
        if pendingRegistrationSuccess {
            await performRegistration()
        }
    }
    
    private func formatPackageName(_ package: LessonPackage) -> String {
        let baseName: String
        if let name = package.packageName, !name.isEmpty {
            baseName = name
        } else {
            switch package.packageType {
            case "private": baseName = "Private Lesson Pass"
            case "2_athlete": baseName = "2-Athlete Pass"
            case "3_athlete": baseName = "3-Athlete Pass"
            case "class_pass": baseName = "Class Pass"
            default: baseName = "\(package.totalLessons)-Lesson Pass"
            }
        }
        return "\(baseName) (\(package.lessonsRemaining) remaining)"
    }
    
    private func displayPackageTitle(_ package: LessonPackage) -> String {
        if let name = package.packageName, !name.isEmpty { return name }
        if let pricing = pricingService.pricingStructure {
            for tier in pricing.tiers {
                if let match = tier.packages.first(where: { $0.packageType == package.packageType }) {
                    return match.title
                }
            }
        }
        return package.packageType.replacingOccurrences(of: "_", with: " ").capitalized
    }
    
    private var registrationButton: some View {
        Button {
            Task { await registerWithClassPass() }
        } label: {
            HStack(spacing: Spacing.sm) {
                if isRegistering { ProgressView().tint(.white) }
                Text(isRegistering ? "Registering..." : "Use Class Pass & Register")
            }
        }
        .buttonStyle(PrimaryButtonStyle())
        .disabled(isRegistering || selectedClassPass == nil || (!allAthletes.isEmpty && selectedAthleteName == nil) || !isAthleteInfoComplete)
        .opacity((selectedClassPass != nil && (allAthletes.isEmpty || selectedAthleteName != nil) && isAthleteInfoComplete) ? 1.0 : 0.5)
    }
    
    private var classDetailsCard: some View {
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
                Image(systemName: "person.fill")
                Text(classItem.trainerName)
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
    
    private var athleteSelectionSection: some View {
        Group {
            if !registrationSuccessful && !classItem.isFull && !availableClassPasses.isEmpty {
                if !allAthletes.isEmpty {
                    athleteSelectionUI
                }
                if selectedAthleteName != nil {
                    participantCountUI
                }
                if isOnlyParticipant == false {
                    secondAthleteUI
                }
                if isNewAthlete {
                    newAthleteFormUI
                }
            }
        }
    }
    
    private var athleteSelectionUI: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Who is attending?")
                .font(.headingMedium)
                .foregroundStyle(AppTheme.textPrimary)
            
            CardView(padding: Spacing.md) {
                Menu {
                    ForEach(allAthletes, id: \.self) { athlete in
                        Button {
                            selectedAthleteName = athlete
                            loadAthleteProfileData()
                        } label: {
                            Text(athlete)
                                .font(.bodyMedium)
                        }
                    }
                } label: {
                    HStack(spacing: Spacing.md) {
                        ZStack {
                            RoundedRectangle(cornerRadius: CornerRadius.xs)
                                .fill(AppTheme.primary.opacity(0.08))
                                .frame(width: 48, height: 48)
                            Image(systemName: "person.fill")
                                .font(.system(size: 20, weight: .semibold))
                                .foregroundStyle(AppTheme.primary)
                        }
                        VStack(alignment: .leading, spacing: Spacing.xxs) {
                            Text(selectedAthleteName ?? "Select Athlete")
                                .font(.headingSmall)
                                .foregroundStyle(AppTheme.textPrimary)
                            Text("Who will be attending this class?")
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
    }
    
    private var participantCountUI: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Is she the only one attending?")
                .font(.headingMedium)
                .foregroundStyle(AppTheme.textPrimary)
            
            HStack(spacing: Spacing.sm) {
                participantButton(isYes: true)
                participantButton(isYes: false)
            }
        }
    }
    
    private func participantButton(isYes: Bool) -> some View {
        Button {
            isOnlyParticipant = isYes
            if isYes {
                secondAthleteName = nil
                isNewAthlete = false
            }
        } label: {
            HStack {
                Text(isYes ? "Yes, just her" : "No, multiple")
                    .font(.headingSmall)
                Spacer()
                if isOnlyParticipant == isYes {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(AppTheme.success)
                }
            }
            .padding(Spacing.md)
            .background(
                RoundedRectangle(cornerRadius: CornerRadius.md)
                    .stroke(isOnlyParticipant == isYes ? AppTheme.success : AppTheme.border, lineWidth: 2)
                    .background(
                        RoundedRectangle(cornerRadius: CornerRadius.md)
                            .fill(isOnlyParticipant == isYes ? AppTheme.success.opacity(0.1) : Color.platformSecondaryBackground)
                    )
            )
        }
        .buttonStyle(.plain)
    }
    
    private var secondAthleteUI: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Select second participant")
                .font(.headingMedium)
                .foregroundStyle(AppTheme.textPrimary)
            
            CardView(padding: Spacing.md) {
                Menu {
                    ForEach(remainingAthletes, id: \.self) { athlete in
                        Button {
                            secondAthleteName = athlete
                            isNewAthlete = false
                        } label: {
                            Text(athlete)
                                .font(.bodyMedium)
                        }
                    }
                    Button {
                        secondAthleteName = "New Athlete"
                        isNewAthlete = true
                        newAthleteIntakeData.fieldValues.removeAll()
                    } label: {
                        HStack {
                            Image(systemName: "plus.circle.fill")
                            Text("New Athlete")
                        }
                        .font(.bodyMedium)
                    }
                } label: {
                    HStack(spacing: Spacing.md) {
                        ZStack {
                            RoundedRectangle(cornerRadius: CornerRadius.xs)
                                .fill(AppTheme.primary.opacity(0.08))
                                .frame(width: 48, height: 48)
                            Image(systemName: "person.2.fill")
                                .font(.system(size: 20, weight: .semibold))
                                .foregroundStyle(AppTheme.primary)
                        }
                        VStack(alignment: .leading, spacing: Spacing.xxs) {
                            if let secondName = secondAthleteName {
                                Text(secondName)
                                    .font(.headingSmall)
                                    .foregroundStyle(AppTheme.textPrimary)
                                Text("Second participant")
                                    .font(.bodySmall)
                                    .foregroundStyle(AppTheme.textSecondary)
                            } else {
                                Text("Select Athlete")
                                    .font(.headingSmall)
                                    .foregroundStyle(AppTheme.textPrimary)
                                Text("Choose second participant")
                                    .font(.bodySmall)
                                    .foregroundStyle(AppTheme.textSecondary)
                            }
                        }
                        Spacer()
                        Image(systemName: "chevron.up.chevron.down")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(AppTheme.textTertiary)
                    }
                }
            }
        }
    }
    
    private var newAthleteFormUI: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("New Athlete Information")
                .font(.headingMedium)
                .foregroundStyle(AppTheme.textPrimary)
            
            CardView(padding: Spacing.md) {
                DynamicIntakeFormView(formData: newAthleteIntakeData, fields: intakeFormService.fields)
            }
        }
    }
    
    private var registrationStatusSection: some View {
        Group {
            if registrationSuccessful {
                successCard
            } else if !classItem.isFull {
                if !availableClassPasses.isEmpty {
                    classPassSection
                } else {
                    noClassPassCard
                }
            } else {
                classFullCard
            }
        }
    }
    
    private var successCard: some View {
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
    }
    
    private var classPassSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Select Class Pass to Use")
                .font(.headingMedium)
                .foregroundStyle(AppTheme.textPrimary)
            classPassPicker
            registrationButton
        }
    }
    
    private var classPassPicker: some View {
        CardView(padding: Spacing.md) {
            Menu {
                ForEach(availableClassPasses) { package in
                    Button {
                        selectedClassPass = package
                    } label: {
                        Text("\(displayPackageTitle(package)) (\(totalRemaining(for: package.packageType)) left)")
                            .font(.bodyMedium)
                    }
                }
            } label: {
                HStack(spacing: Spacing.md) {
                    ZStack {
                        RoundedRectangle(cornerRadius: CornerRadius.xs)
                            .fill(AppTheme.secondary.opacity(0.08))
                            .frame(width: 48, height: 48)
                        Image(systemName: "ticket")
                            .font(.system(size: 20, weight: .semibold))
                            .foregroundStyle(AppTheme.secondary)
                    }
                    VStack(alignment: .leading, spacing: Spacing.xxs) {
                        Text(selectedClassPass != nil ? displayPackageTitle(selectedClassPass!) : "Choose a class pass")
                            .font(.headingSmall)
                            .foregroundStyle(AppTheme.textPrimary)
                        Text(selectedClassPass != nil ? "\(totalRemaining(for: selectedClassPass!.packageType)) left" : "Select which pass to use")
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
    
    private var noClassPassCard: some View {
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
    
    private var classFullCard: some View {
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
                        classDetailsCard
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
                    
                    athleteSelectionSection
                    registrationStatusSection
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
            if packagesService.packages.isEmpty {
                await packagesService.loadMyPackages()
            }
            if let orgId = auth.currentOrgId {
                await pricingService.loadPricingStructure(for: orgId)
                await settingsService.loadSettings(orgId: orgId)
                await intakeFormService.loadFields(orgId: orgId)
            }
        }
        .sheet(isPresented: $showWaiverAgreement) {
            WaiverAgreementCheckboxView(
                waiverText: settingsService.settings?.waiverText ?? "",
                userProfile: usersService.currentUser,
                athleteName: nil,  // Classes don't have specific athlete names
                onAgree: {
                    Task { await handleWaiverAgreement() }
                },
                onCancel: {
                    showWaiverAgreement = false
                    pendingRegistrationSuccess = false
                }
            )
        }
    }
    
    private func registerWithClassPass() async {
        guard classItem.id != nil else { return }
        let passToUse = selectedClassPass ?? availableClassPasses.first
        guard let classPass = passToUse, classPass.id != nil else {
            errorMessage = "No valid class pass found"
            return
        }
        isRegistering = true
        errorMessage = nil
        guard auth.currentOrgId != nil else {
            errorMessage = "Organization not found"
            isRegistering = false
            return
        }
        
        do {
            // Check waivers FIRST, before creating the registration
            if let userId = Auth.auth().currentUser?.uid {
                let waiverCheck = try await settingsService.checkWaiverRequirement(
                    userId: userId,
                    settings: settingsService.settings
                )
                
                // Check if selected athlete needs waiver
                if let athleteName = selectedAthleteName {
                    let athleteHasWaiver = try await checkAthleteHasWaiver(userId: userId, athleteName: athleteName)
                    if !athleteHasWaiver {
                        pendingRegistrationSuccess = false
                        pendingNewAthleteWaiver = false
                        showWaiverAgreement = true
                        isRegistering = false
                        return
                    }
                }
                
                // Check if second athlete needs waiver (for existing athletes)
                if !isNewAthlete && secondAthleteName != nil && secondAthleteName != "New Athlete" {
                    let athleteHasWaiver = try await checkAthleteHasWaiver(userId: userId, athleteName: secondAthleteName!)
                    if !athleteHasWaiver {
                        pendingRegistrationSuccess = false
                        pendingNewAthleteWaiver = false
                        selectedAthleteName = secondAthleteName
                        showWaiverAgreement = true
                        isRegistering = false
                        return
                    }
                }
                
                // Check if second athlete needs waiver (for new athletes)
                if isNewAthlete && secondAthleteName != nil {
                    let athleteName: String
                    if let fullName = newAthleteIntakeData.fieldValues["athleteFullName"] as? String, !fullName.isEmpty {
                        athleteName = fullName.trimmingCharacters(in: .whitespacesAndNewlines)
                    } else {
                        let f = (newAthleteIntakeData.fieldValues["athleteFirstName"] as? String ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
                        let l = (newAthleteIntakeData.fieldValues["athleteLastName"] as? String ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
                        athleteName = [f, l].filter { !$0.isEmpty }.joined(separator: " ")
                    }
                    let athleteHasWaiver = try await checkAthleteHasWaiver(userId: userId, athleteName: athleteName)
                    if !athleteHasWaiver {
                        pendingRegistrationSuccess = false
                        pendingNewAthleteWaiver = true
                        showWaiverAgreement = true
                        isRegistering = false
                        return
                    }
                }
                
                // Legacy waiver check
                if waiverCheck.required && !waiverCheck.signed {
                    pendingRegistrationSuccess = false
                    showWaiverAgreement = true
                    isRegistering = false
                    return
                }
            }
            
            // All waivers are signed, proceed with registration
            await performRegistration()
        } catch {
            errorMessage = "Registration failed: \(error.localizedDescription)"
            isRegistering = false
        }
    }
    
    private func performRegistration() async {
        guard let classId = classItem.id else { return }
        let passToUse = selectedClassPass ?? availableClassPasses.first
        guard let classPass = passToUse, let passId = classPass.id else {
            errorMessage = "No valid class pass found"
            isRegistering = false
            return
        }
        guard let orgId = auth.currentOrgId else {
            errorMessage = "Organization not found"
            isRegistering = false
            return
        }
        
        do {
            let athleteForRegistration = selectedAthleteName
            let secondAthleteForRegistration = isOnlyParticipant == false ? secondAthleteName : nil
            
            try await classesService.registerForClassWithPass(
                classId: classId,
                classPassPackageId: passId,
                athleteName: athleteForRegistration,
                secondAthleteName: secondAthleteForRegistration,
                orgId: orgId
            )
            AnalyticsService.shared.logClassRegistered(classId: classId, className: classItem.title)
            await packagesService.loadMyPackages()
            registrationSuccessful = true
            // Count athletes (1 or 2+)
            let athleteCount = secondAthleteForRegistration != nil ? 2 : 1
            registrationCount += athleteCount
            errorMessage = nil
            onRegistered()
            
            // Reset form for next registration
            selectedAthleteName = nil
            isOnlyParticipant = nil
            secondAthleteName = nil
            isNewAthlete = false
        } catch {
            errorMessage = "Registration failed: \(error.localizedDescription)"
        }
        isRegistering = false
    }
}
