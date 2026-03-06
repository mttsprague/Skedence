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
    @State private var showRegistrationConfirmation = false
    @State private var pendingRegistrationSuccess = false
    @State private var pendingNewAthleteWaiver = false
    
    // Waiver status tracking
    @State private var primaryAthleteHasWaiver = false
    @State private var secondAthleteHasWaiver = false
    @State private var isCheckingWaivers = false
    @State private var waiverCheckComplete = false
    
    // UI state for collapsible sections
    @State private var primaryAthleteInfoExpanded = true
    @State private var newAthleteInfoExpanded = true
    
    private var availableClassPasses: [LessonPackage] {
        let now = Date()
        
        // Get eligible package IDs from the class
        let eligibleIds = Set(classItem.eligiblePackageIds)
        
        // Filter packages based on class eligibility
        let filtered = packagesService.packages.filter { pkg -> Bool in
            let canBook = pkg.canBookClasses
            let hasRemaining = pkg.lessonsRemaining > 0
            let notExpired = pkg.expirationDate >= now
            
            // Check if package is in eligible list (if list is empty, allow all class passes for backward compatibility)
            let isEligible = eligibleIds.isEmpty || eligibleIds.contains(pkg.packageType)
            
            return canBook && hasRemaining && notExpired && isEligible
        }
        
        // Group by package type, keeping the one with earliest expiration
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
            pkg.expirationDate >= now
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
    
    // Check if an athlete has signed a waiver (uses DocumentsService like BookView)
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
            }
        }
        
        return false
    }
    
    // Check waiver status for primary athlete
    private func checkPrimaryAthleteWaiver() async {
        guard let userId = auth.currentUserDocId,
              let athleteName = selectedAthleteName,
              settingsService.settings?.requireWaiver == true else {
            primaryAthleteHasWaiver = true
            return
        }
        isCheckingWaivers = true
        primaryAthleteHasWaiver = (try? await checkAthleteHasWaiver(userId: userId, athleteName: athleteName)) ?? false
        isCheckingWaivers = false
    }
    
    // Check waiver status for second athlete
    private func checkSecondAthleteWaiver() async {
        guard let userId = auth.currentUserDocId,
              let athleteName = secondAthleteName,
              settingsService.settings?.requireWaiver == true else {
            secondAthleteHasWaiver = true
            return
        }
        isCheckingWaivers = true
        secondAthleteHasWaiver = (try? await checkAthleteHasWaiver(userId: userId, athleteName: athleteName)) ?? false
        isCheckingWaivers = false
    }
    
    // Handle waiver agreement (matches BookView flow - saves to documents subcollection with PDF)
    private func handleWaiverAgreement() async {
        guard let userId = auth.currentUserDocId,
              let profile = usersService.currentUser else {
            showWaiverAgreement = false
            pendingRegistrationSuccess = false
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
            
            // Determine which athlete needs the waiver
            let athleteForWaiver: String
            if pendingNewAthleteWaiver {
                // Get name from new athlete form data
                if let fullName = newAthleteIntakeData.fieldValues["athleteFullName"] as? String, !fullName.isEmpty {
                    athleteForWaiver = fullName.trimmingCharacters(in: .whitespacesAndNewlines)
                } else {
                    let f = (newAthleteIntakeData.fieldValues["athleteFirstName"] as? String ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
                    let l = (newAthleteIntakeData.fieldValues["athleteLastName"] as? String ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
                    athleteForWaiver = [f, l].filter { !$0.isEmpty }.joined(separator: " ")
                }
            } else {
                athleteForWaiver = selectedAthleteName ?? ""
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
            
            // Save waiver document with PDF using DocumentsService (same as BookView)
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
            
            // Recheck waiver status to update UI
            if !pendingNewAthleteWaiver {
                await checkPrimaryAthleteWaiver()
            } else {
                await checkSecondAthleteWaiver()
            }
            
            // Check if we just signed for primary athlete and need to check second athlete
            if !pendingNewAthleteWaiver && isOnlyParticipant == false && secondAthleteName != nil {
                // Just signed primary athlete waiver, now check second athlete
                do {
                    let secondAthleteName: String
                    if isNewAthlete {
                        if let fullName = newAthleteIntakeData.fieldValues["athleteFullName"] as? String, !fullName.isEmpty {
                            secondAthleteName = fullName.trimmingCharacters(in: .whitespacesAndNewlines)
                        } else {
                            let f = (newAthleteIntakeData.fieldValues["athleteFirstName"] as? String ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
                            let l = (newAthleteIntakeData.fieldValues["athleteLastName"] as? String ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
                            secondAthleteName = [f, l].filter { !$0.isEmpty }.joined(separator: " ")
                        }
                    } else {
                        secondAthleteName = self.secondAthleteName!
                    }
                    
                    let secondAthleteHasWaiver = try await checkAthleteHasWaiver(userId: userId, athleteName: secondAthleteName)
                    if !secondAthleteHasWaiver && settingsService.settings?.requireWaiver == true {
                        // Second athlete needs waiver, show it
                        pendingNewAthleteWaiver = true
                        showWaiverAgreement = true
                        return
                    }
                } catch {
                    // Silently fail - continue with registration if waiver check fails
                }
            }
            
            // All waivers signed, complete registration
            if pendingRegistrationSuccess {
                isRegistering = true
                await performRegistration()
                pendingRegistrationSuccess = false
            }
        } catch {
            showWaiverAgreement = false
            pendingRegistrationSuccess = false
            errorMessage = "Failed to save waiver agreement. Please try again."
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
        let athleteCount = (isOnlyParticipant == false && secondAthleteName != nil) ? 2 : 1
        let passesNeeded = athleteCount
        let availablePasses = selectedClassPass?.lessonsRemaining ?? 0
        let hasEnoughPasses = availablePasses >= passesNeeded
        
        return VStack(spacing: Spacing.sm) {
            if selectedClassPass != nil && !hasEnoughPasses {
                Text("⚠️ Not enough passes. Need \(passesNeeded), have \(availablePasses)")
                    .font(.bodySmall)
                    .foregroundStyle(AppTheme.error)
            }
            
            Button {
                Task { await registerWithClassPass() }
            } label: {
                HStack(spacing: Spacing.sm) {
                    if isRegistering { ProgressView().tint(.white) }
                    let buttonText = isRegistering ? "Registering..." : 
                                    (athleteCount == 2 ? "Use 2 Passes & Register" : "Use Class Pass & Register")
                    Text(buttonText)
                }
            }
            .buttonStyle(PrimaryButtonStyle())
            .disabled(isRegistering || selectedClassPass == nil || 
                     (!allAthletes.isEmpty && selectedAthleteName == nil) || 
                     !isAthleteInfoComplete || !hasEnoughPasses)
            .opacity((selectedClassPass != nil && (allAthletes.isEmpty || selectedAthleteName != nil) && 
                     isAthleteInfoComplete && hasEnoughPasses) ? 1.0 : 0.5)
        }
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
                    primaryAthleteFormUI
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
                            // Reset and check waiver status
                            primaryAthleteHasWaiver = false
                            Task {
                                await checkPrimaryAthleteWaiver()
                                waiverCheckComplete = true
                            }
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
            
            // Waiver Status Indicator (below card, matching BookView)
            if let athleteName = selectedAthleteName {
                HStack(spacing: Spacing.xs) {
                    if isCheckingWaivers {
                        ProgressView()
                            .scaleEffect(0.7)
                        Text("Checking waiver status...")
                            .font(.caption)
                            .foregroundStyle(AppTheme.textSecondary)
                    } else if settingsService.settings?.requireWaiver == true {
                        if primaryAthleteHasWaiver {
                            // Has signed waiver
                            Image(systemName: "checkmark.circle.fill")
                                .font(.system(size: 14))
                                .foregroundStyle(.green)
                            Text("\(athleteName) has a signed waiver")
                                .font(.caption)
                                .foregroundStyle(.green)
                        } else {
                            // Needs waiver
                            Image(systemName: "exclamationmark.circle.fill")
                                .font(.system(size: 14))
                                .foregroundStyle(.blue)
                            Text("\(athleteName) will need a signed waiver")
                                .font(.caption)
                                .foregroundStyle(.blue)
                        }
                    }
                    Spacer()
                }
                .padding(.horizontal, Spacing.lg)
                .padding(.top, Spacing.xxs)
            }
        }
    }
    
    private var participantCountUI: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Is this athlete the only one attending?")
                .font(.headingMedium)
                .foregroundStyle(AppTheme.textPrimary)
            
            HStack(spacing: Spacing.sm) {
                participantButton(isYes: true)
                participantButton(isYes: false)
            }
        }
    }
    
    private var primaryAthleteFormUI: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            HStack {
                Text("\(selectedAthleteName ?? "Athlete") Information")
                    .font(.headingMedium)
                    .foregroundStyle(AppTheme.textPrimary)
                Spacer()
                Button {
                    withAnimation {
                        primaryAthleteInfoExpanded.toggle()
                    }
                } label: {
                    Image(systemName: primaryAthleteInfoExpanded ? "chevron.up" : "chevron.down")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(AppTheme.primary)
                }
                .buttonStyle(.plain)
            }
            
            if primaryAthleteInfoExpanded {
                CardView(padding: Spacing.md) {
                    DynamicIntakeFormView(formData: intakeFormData, fields: intakeFormService.fields)
                }
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
                Text(isYes ? "Yes" : "No, multiple")
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
                            // Reset and check waiver status
                            secondAthleteHasWaiver = false
                            Task {
                                await checkSecondAthleteWaiver()
                            }
                        } label: {
                            Text(athlete)
                                .font(.bodyMedium)
                        }
                    }
                    Button {
                        secondAthleteName = "New Athlete"
                        isNewAthlete = true
                        secondAthleteHasWaiver = false
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
            
            // Second Athlete Waiver Status Indicator (below card, matching BookView)
            if let athleteName = secondAthleteName, !isNewAthlete {
                HStack(spacing: Spacing.xs) {
                    if isCheckingWaivers {
                        ProgressView()
                            .scaleEffect(0.7)
                        Text("Checking waiver status...")
                            .font(.caption)
                            .foregroundStyle(AppTheme.textSecondary)
                    } else if settingsService.settings?.requireWaiver == true {
                        if secondAthleteHasWaiver {
                            // Has signed waiver
                            Image(systemName: "checkmark.circle.fill")
                                .font(.system(size: 14))
                                .foregroundStyle(.green)
                            Text("\(athleteName) has a signed waiver")
                                .font(.caption)
                                .foregroundStyle(.green)
                        } else {
                            // Needs waiver
                            Image(systemName: "exclamationmark.circle.fill")
                                .font(.system(size: 14))
                                .foregroundStyle(.blue)
                            Text("\(athleteName) will need a signed waiver")
                                .font(.caption)
                                .foregroundStyle(.blue)
                        }
                    }
                    Spacer()
                }
                .padding(.horizontal, Spacing.lg)
                .padding(.top, Spacing.xxs)
            } else if isNewAthlete {
                // New athlete indicator
                HStack(spacing: Spacing.xs) {
                    Image(systemName: "exclamationmark.circle.fill")
                        .font(.system(size: 14))
                        .foregroundStyle(.blue)
                    Text("New athlete will need a signed waiver")
                        .font(.caption)
                        .foregroundStyle(.blue)
                    Spacer()
                }
                .padding(.horizontal, Spacing.lg)
                .padding(.top, Spacing.xxs)
            }
        }
    }
    
    private var newAthleteFormUI: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            HStack {
                Text("New Athlete Information")
                    .font(.headingMedium)
                    .foregroundStyle(AppTheme.textPrimary)
                Spacer()
                Button {
                    withAnimation {
                        newAthleteInfoExpanded.toggle()
                    }
                } label: {
                    Image(systemName: newAthleteInfoExpanded ? "chevron.up" : "chevron.down")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(AppTheme.primary)
                }
                .buttonStyle(.plain)
            }
            
            if newAthleteInfoExpanded {
                CardView(padding: Spacing.md) {
                    DynamicIntakeFormView(formData: newAthleteIntakeData, fields: intakeFormService.fields)
                }
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
            
            // Show pass cost info if multiple athletes selected
            if isOnlyParticipant == false && secondAthleteName != nil {
                CardView(padding: Spacing.md) {
                    HStack(spacing: Spacing.sm) {
                        Image(systemName: "info.circle.fill")
                            .foregroundStyle(AppTheme.primary)
                            .font(.system(size: 20))
                        VStack(alignment: .leading, spacing: Spacing.xxs) {
                            Text("2 Athletes = 2 Passes")
                                .font(.bodyMedium.bold())
                                .foregroundStyle(AppTheme.textPrimary)
                            Text("Each athlete requires one class pass")
                                .font(.bodySmall)
                                .foregroundStyle(AppTheme.textSecondary)
                        }
                        Spacer()
                    }
                }
            }
            
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
                await intakeFormService.loadFields(orgId: orgId, type: "class")
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
        .sheet(isPresented: $showRegistrationConfirmation) {
            let athleteName = selectedAthleteName ?? "your athlete"
            let dateText = classItem.startTime.formatted(.dateTime.month(.abbreviated).day().year())
            let timeText = classItem.startTime.formatted(date: .omitted, time: .shortened)
            
            ConfirmationAlertView(
                title: "Confirm Registration",
                message: "Are you sure you want to register \(athleteName) for \(classItem.title) on \(dateText) at \(timeText)?",
                confirmButtonText: "Confirm Registration",
                onConfirm: {
                    showRegistrationConfirmation = false
                    Task {
                        await confirmAndRegisterForClass()
                    }
                },
                onCancel: {
                    showRegistrationConfirmation = false
                    isRegistering = false
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
            // Check waivers FIRST - if any athlete needs waiver, show sheet and return
            if let userId = auth.currentUserDocId {
                // Check primary athlete
                if let athleteName = selectedAthleteName {
                    let athleteHasWaiver = try await checkAthleteHasWaiver(userId: userId, athleteName: athleteName)
                    if !athleteHasWaiver && settingsService.settings?.requireWaiver == true {
                        // Show waiver for primary athlete
                        pendingRegistrationSuccess = true
                        pendingNewAthleteWaiver = false
                        showWaiverAgreement = true
                        isRegistering = false
                        return
                    }
                }
                
                // Check second athlete if exists (existing athlete)
                if !isNewAthlete && secondAthleteName != nil && secondAthleteName != "New Athlete" {
                    let athleteHasWaiver = try await checkAthleteHasWaiver(userId: userId, athleteName: secondAthleteName!)
                    if !athleteHasWaiver && settingsService.settings?.requireWaiver == true {
                        // Show waiver for second athlete
                        pendingRegistrationSuccess = true
                        pendingNewAthleteWaiver = true
                        showWaiverAgreement = true
                        isRegistering = false
                        return
                    }
                }
                
                // Check second athlete if exists (new athlete)
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
                    if !athleteHasWaiver && settingsService.settings?.requireWaiver == true {
                        // Show waiver for second athlete
                        pendingRegistrationSuccess = true
                        pendingNewAthleteWaiver = true
                        showWaiverAgreement = true
                        isRegistering = false
                        return
                    }
                }
            }
            
            // All waivers are signed (or not required), show confirmation dialog
            showRegistrationConfirmation = true
        } catch {
            errorMessage = "Registration failed: \(error.localizedDescription)"
            isRegistering = false
        }
    }
    
    private func confirmAndRegisterForClass() async {
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
        
        isRegistering = true
        
        do {
            guard let userId = auth.currentUserId else {
                throw NSError(domain: "ClassRegistrationSheet", code: -1, userInfo: [NSLocalizedDescriptionKey: "User not authenticated"])
            }
            
            let athleteForRegistration = selectedAthleteName
            let secondAthleteForRegistration = isOnlyParticipant == false ? secondAthleteName : nil
            
            try await classesService.registerForClassWithPass(
                userId: userId,
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
            guard let userId = auth.currentUserId else {
                throw NSError(domain: "ClassRegistrationSheet", code: -1, userInfo: [NSLocalizedDescriptionKey: "User not authenticated"])
            }
            
            // Save new athlete to profile if needed
            if isNewAthlete && isOnlyParticipant == false && secondAthleteName != nil {
                if let fullName = newAthleteIntakeData.fieldValues["athleteFullName"] as? String, !fullName.isEmpty {
                    let names = fullName.split(separator: " ")
                    let firstName = String(names.first ?? "")
                    let lastName = names.count > 1 ? String(names.dropFirst().joined(separator: " ")) : ""
                    try await saveNewAthleteToProfile(firstName: firstName, lastName: lastName, formData: newAthleteIntakeData)
                } else {
                    let firstName = (newAthleteIntakeData.fieldValues["athleteFirstName"] as? String ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
                    let lastName = (newAthleteIntakeData.fieldValues["athleteLastName"] as? String ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
                    if !firstName.isEmpty && !lastName.isEmpty {
                        try await saveNewAthleteToProfile(firstName: firstName, lastName: lastName, formData: newAthleteIntakeData)
                    }
                }
            }
            
            let athleteForRegistration = selectedAthleteName
            let secondAthleteForRegistration = isOnlyParticipant == false ? secondAthleteName : nil
            
            try await classesService.registerForClassWithPass(
                userId: userId,
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
    
    // Save new athlete to user profile (copied from BookView)
    private func saveNewAthleteToProfile(firstName: String, lastName: String, formData: IntakeFormData) async throws {
        guard let authUserId = Auth.auth().currentUser?.uid else { return }
        guard let profile = usersService.currentUser else { return }
        
        let db = Firestore.firestore()
        
        // Query to find user document ID by authUserId field
        let userQuery = try await db.collection("users")
            .whereField("authUserId", isEqualTo: authUserId)
            .limit(to: 1)
            .getDocuments()
        
        guard let userDoc = userQuery.documents.first else {
            throw NSError(domain: "ClassRegistrationSheet", code: 404, userInfo: [NSLocalizedDescriptionKey: "User profile not found"])
        }
        
        let userRef = db.collection("users").document(userDoc.documentID)
        
        // Extract values from dynamic form data
        let birthday = formData.fieldValues["athleteBirthday"] as? String ?? ""
        let schoolTeam = formData.fieldValues["schoolTeam"] as? String ?? ""
        let experienceLevel = formData.fieldValues["experienceLevel"] as? String ?? ""
        let position = formData.fieldValues["position"] as? String ?? ""
        
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
        
        // Use setData with merge to create field if it doesn't exist
        try await userRef.setData([
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
        ], merge: true)
        
        print("✅ Saved new athlete: \(firstName) \(lastName) to profile from class registration")
        
        // Reload user profile to reflect changes
        await usersService.loadCurrentUserIfAvailable()
    }
}
