//
//  ProfileView.swift
//  Skedence
//
//  Created by Matthew Sprague on 10/14/25.
//

import SwiftUI
import FirebaseAuth
import FirebaseFirestore
import FirebaseFunctions
import StripePaymentSheet

struct ProfileView: View {
    @EnvironmentObject var auth: AuthManager
    @ObservedObject var usersService: UsersService
    @ObservedObject var packagesService: PackagesService
    @ObservedObject var bookingsService: BookingsService
    @ObservedObject var scheduleService: ScheduleService
    @Binding var profileTab: String?

    @State private var authMode: AuthMode = .createAccount
    enum AuthMode: String, CaseIterable { case createAccount = "Create Account", signIn = "Sign In" }

    // Use AuthManager's isAuthenticated instead of directly checking Firebase Auth
    // This ensures we're in sync with the app's auth state
    private var isSignedIn: Bool { auth.isAuthenticated }

    var body: some View {
        NavigationStack {
            Group {
                if isSignedIn {
                    SignedInProfileScreen(usersService: usersService,
                                          packagesService: packagesService,
                                          bookingsService: bookingsService,
                                          scheduleService: scheduleService,
                                          profileTab: $profileTab)
                        .toolbar {
                            #if os(iOS)
                            ToolbarItem(placement: .navigationBarTrailing) {
                                Button("Sign Out") { auth.signOut() }
                            }
                            #else
                            ToolbarItem {
                                Button("Sign Out") { auth.signOut() }
                            }
                            #endif
                        }
                } else {
                    VStack(spacing: 24) {
                        Picker("Mode", selection: $authMode) {
                            Text("Create Account").tag(AuthMode.createAccount)
                            Text("Sign In").tag(AuthMode.signIn)
                        }
                        .pickerStyle(.segmented)
                        .padding(.horizontal)

                        if authMode == .signIn {
                            SignInForm()
                        } else {
                            RegisterForm()
                        }

                        if let error = auth.authError {
                            Text(error).foregroundStyle(.red).font(.footnote).padding(.horizontal)
                        }

                        Spacer(minLength: 20)
                    }
                    .navigationTitle(authMode == .signIn ? "Sign In" : "Create Account")
                }
            }
            .task {
                if isSignedIn {
                    await usersService.loadCurrentUserIfAvailable()
                    await packagesService.loadMyPackages(orgId: auth.currentOrgId)
                    if let orgId = auth.currentOrgId {
                        await bookingsService.loadMyBookings(orgId: orgId)
                    }
                }
            }
            .onChange(of: isSignedIn) { oldValue, newValue in
                // When user signs in or registers, reload all profile data
                if newValue == true && oldValue == false {
                    Task {
                        await usersService.loadCurrentUserIfAvailable()
                        await packagesService.loadMyPackages(orgId: auth.currentOrgId)
                        if let orgId = auth.currentOrgId {
                            await bookingsService.loadMyBookings(orgId: orgId)
                        }
                    }
                }
            }
        }
    }
}

// MARK: - Signed-in Profile Screen

private struct SignedInProfileScreen: View {
    @EnvironmentObject var auth: AuthManager
    @ObservedObject var usersService: UsersService
    @ObservedObject var packagesService: PackagesService
    @ObservedObject var bookingsService: BookingsService
    @ObservedObject var scheduleService: ScheduleService
    @StateObject private var trainersService = TrainersService()
    @StateObject private var classesService = ClassesService()
    @StateObject private var customerService = StripeCustomerService()
    @StateObject private var pricingService = PricingStructureService()
    @Binding var profileTab: String?

    @State private var tab: Tab = .passes
    @State private var selectedBooking: Booking?
    @State private var expandedCategories: Set<String> = []
    enum Tab: String { case passes = "PASSES", schedule = "SCHEDULE", wallet = "WALLET" }
    @State private var showPurchaseLessons = false
    @State private var showingDescriptionSheet = false
    @State private var descriptionSheetTitle: String = ""
    @State private var descriptionSheetText: String = ""

    // Location is now dynamic from booking data - no hardcoded venue

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                header
                tabBar
                content
            }
            .padding(.bottom, 24)
        }
        .background(Color.platformGroupedBackground)
        .navigationTitle("Profile")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            AnalyticsService.shared.logScreenView(screenName: "Profile", screenClass: "ProfileView")
        }
        .task {
            guard let orgId = auth.currentOrgId, let _ = auth.currentUserId else { return }
            if trainersService.trainers.isEmpty {
                await trainersService.loadAll(orgId: orgId)
            }
            if bookingsService.myBookings.isEmpty {
                await bookingsService.loadMyBookings(orgId: orgId)
            }
            if classesService.myRegisteredClasses.isEmpty {
                // IMPORTANT: Use currentUserDocId (Firestore doc ID like "mike_parent"), NOT currentUserId (Auth UID)
                // ClassesRepository queries classRegistrations by clientId which is the Firestore document ID
                guard let userDocId = auth.currentUserDocId else { return }
                await classesService.loadMyRegisteredClasses(userId: userDocId, orgId: orgId)
            }
            if customerService.paymentMethods.isEmpty {
                await customerService.loadPaymentMethods(orgId: orgId)
            }
            // Load pricing structure for dynamic pass display
            await pricingService.loadPricingStructure(for: orgId)
        }
        .refreshable {
            guard let orgId = auth.currentOrgId else { return }
            // IMPORTANT: Use currentUserDocId (Firestore doc ID like "mike_parent"), NOT currentUserId (Auth UID)
            // ClassesRepository queries classRegistrations by clientId which is the Firestore document ID
            let userDocId = auth.currentUserDocId
            await usersService.loadCurrentUserIfAvailable()
            await packagesService.loadMyPackages(orgId: auth.currentOrgId)
            await bookingsService.loadMyBookings(orgId: orgId)
            if let userDocId = userDocId {
                await classesService.loadMyRegisteredClasses(userId: userDocId, orgId: orgId)
            }
            await customerService.loadPaymentMethods(orgId: orgId)
            await pricingService.loadPricingStructure(for: orgId)
        }
        .onAppear {
            // Handle initial navigation from binding
            if let tabString = profileTab, let targetTab = Tab(rawValue: tabString) {
                tab = targetTab
                profileTab = nil
            }
        }
        .onChangeCompat(of: profileTab) { _, newTab in
            if let tabString = newTab, let targetTab = Tab(rawValue: tabString) {
                tab = targetTab
                profileTab = nil // Reset after navigating
            }
        }
        .navigationDestination(isPresented: $showPurchaseLessons) {
            PurchaseLessonsView(packagesService: packagesService)
        }
        .sheet(item: $selectedBooking) { booking in
            SessionDetailSheet(booking: booking, trainersService: trainersService)
                .presentationDetents([.large])
                .presentationDragIndicator(.visible)
        }
        .sheet(isPresented: $showingDescriptionSheet) {
            NavigationStack {
                ScrollView {
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        Text(descriptionSheetTitle)
                            .font(.headingMedium)
                            .foregroundStyle(AppTheme.textPrimary)
                        Text(descriptionSheetText)
                            .font(.bodyMedium)
                            .foregroundStyle(AppTheme.textSecondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    .padding(Spacing.lg)
                }
                .navigationTitle("Details")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Done") { showingDescriptionSheet = false }
                    }
                }
            }
        }
        .onChangeCompat(of: showPurchaseLessons) { _, isPresentingPurchase in
            // Reload packages when returning from purchase view
            if !isPresentingPurchase && tab == .passes {
                Task {
                    await packagesService.loadMyPackages(orgId: auth.currentOrgId)
                }
            }
        }
    }

    // Header with gradient background, avatar, name, email
    private var header: some View {
        // Extract name from UsersService first, then fallback to email-based name
        let name: String = {
            if let user = usersService.currentUser, !user.displayName.isEmpty {
                return user.displayName
            }
            // Fallback: extract name from email if user data not loaded yet
            if let email = Auth.auth().currentUser?.email {
                let emailPrefix = email.split(separator: "@").first.map(String.init) ?? "User"
                return emailPrefix.capitalized
            }
            return "User"
        }()
        let email = usersService.currentUser?.emailAddress ?? Auth.auth().currentUser?.email
        let initials = initialsFrom(name: name, emailFallback: email ?? "")

        return VStack(spacing: 0) {
            // Gradient background section with avatar and name
            ZStack(alignment: .bottom) {
                // Subtle gradient background
                LinearGradient(
                    colors: [Brand.primary.opacity(0.15), Brand.primary.opacity(0.05)],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .frame(height: 160)
                
                // Avatar + name
                VStack(spacing: 12) {
                    ZStack {
                        Circle().fill(Color.platformBackground)
                            .frame(width: 98, height: 98)
                            .shadow(color: .black.opacity(0.08), radius: 8, x: 0, y: 4)
                        Circle().fill(Brand.primary.opacity(0.12))
                            .frame(width: 90, height: 90)
                        Text(initials)
                            .font(.system(size: 34, weight: .bold))
                            .foregroundStyle(Brand.primary)
                    }
                    Text(name)
                        .font(.system(size: 28, weight: .bold))
                        .foregroundStyle(.primary)
                }
                .padding(.bottom, 16)
            }
            
            // Email in white background area for better visibility
            if let email {
                Text(email)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .padding(.top, 12)
                    .padding(.bottom, 8)
            }
        }
    }

    // Segmented tab bar (PASSES / SCHEDULE / WALLET)
    private var tabBar: some View {
        HStack(spacing: 16) {
            tabItem(.passes)
            tabItem(.schedule)
            tabItem(.wallet)
        }
        .padding(.horizontal, 20)
        .padding(.top, 6)
    }

    private func tabItem(_ t: Tab) -> some View {
        Button {
            withAnimation(.easeInOut(duration: 0.2)) { tab = t }
        } label: {
            VStack(spacing: 6) {
                Text(t.rawValue)
                    .font(.system(size: 14, weight: tab == t ? .bold : .regular))
                    .foregroundStyle(tab == t ? .primary : .secondary)
                Rectangle()
                    .fill(tab == t ? Brand.primary : .clear)
                    .frame(height: 3)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .cornerRadius(1.5)
                    .opacity(tab == t ? 1 : 0)
            }
        }
        .buttonStyle(.plain)
        .frame(maxWidth: .infinity)
    }

    // Tab content
    @ViewBuilder
    private var content: some View {
        switch tab {
        case .passes:
            passesTab
        case .schedule:
            scheduleTab
        case .wallet:
            walletTab
        }
    }

    // MARK: SCHEDULE tab

    private var scheduleTab: some View {
        VStack(spacing: 16) {
            // Upcoming Events grouped by date
            let upcoming = allUpcomingEvents()
            let groupedEvents = Dictionary(grouping: upcoming) { event in
                Calendar.current.startOfDay(for: event.date)
            }
            let sortedDates = groupedEvents.keys.sorted()
            
            // Show next 5 days or 10 events (whichever comes first)
            let displayDates = Array(sortedDates.prefix(5))
            let displayEvents = upcoming.prefix(10)
            
            if displayEvents.isEmpty {
                card {
                    VStack(spacing: 12) {
                        Image(systemName: "calendar.badge.clock")
                            .font(.system(size: 48))
                            .foregroundStyle(.secondary.opacity(0.5))
                        Text("No Upcoming Events")
                            .font(.title3.bold())
                            .foregroundStyle(.primary)
                        Text("Your schedule is clear")
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 24)
                }
            } else {
                ForEach(displayDates, id: \.self) { date in
                    if let events = groupedEvents[date], !events.isEmpty {
                        card {
                            VStack(alignment: .leading, spacing: 0) {
                                // Date header
                                dateHeader(for: date)
                                    .padding(.horizontal, 16)
                                    .padding(.vertical, 12)
                                
                                // Events for this date
                                ForEach(Array(events.enumerated()), id: \.element.id) { index, event in
                                    eventRow(event)
                                    
                                    if index < events.count - 1 {
                                        Divider()
                                            .padding(.leading, 20)
                                    }
                                }
                            }
                        }
                    }
                }
            }
            
            // View Your Schedule button (styled as a card)
            NavigationLink {
                MyUpcomingLessonsView(bookingsService: bookingsService,
                                      trainersService: trainersService,
                                      classesService: classesService)
            } label: {
                card {
                    HStack(spacing: 12) {
                        Image(systemName: "calendar.badge.clock")
                            .font(.system(size: 20, weight: .semibold))
                            .foregroundStyle(Brand.primary)
                        Text("View Your Full Schedule")
                            .font(.headline)
                            .foregroundStyle(.primary)
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 16)
    }
    
    private func dateHeader(for date: Date) -> some View {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEEE – MMM d"
        let dateString = formatter.string(from: date)
        let isToday = Calendar.current.isDateInToday(date)
        
        return HStack {
            Text(dateString)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(isToday ? .red : .primary)
            Spacer()
        }
    }
    
    private func eventRow(_ event: UpcomingEvent) -> some View {
        Button {
            if case .lesson(let booking, _) = event {
                selectedBooking = booking
            }
        } label: {
            HStack(alignment: .top, spacing: 0) {
                // Color bar on left
                Rectangle()
                    .fill(event.color)
                    .frame(width: 4)
                
                VStack(alignment: .leading, spacing: 2) {
                    HStack(alignment: .top) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(event.title)
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundStyle(.primary)
                            
                            if let location = event.location {
                                HStack(spacing: 4) {
                                    Image(systemName: "mappin.circle.fill")
                                        .font(.system(size: 12))
                                        .foregroundStyle(.secondary)
                                    Text(location)
                                        .font(.system(size: 14))
                                        .foregroundStyle(.secondary)
                                }
                            }
                            
                            HStack(spacing: 4) {
                                Text(event.trainerName(using: trainersService))
                                    .font(.system(size: 14))
                                    .foregroundStyle(.secondary)
                            }
                        }
                        
                        Spacer()
                        
                        // Time on right side
                        VStack(alignment: .trailing, spacing: 2) {
                            Text(event.startTime)
                                .font(.system(size: 14))
                                .foregroundStyle(.primary)
                            Text(event.endTime)
                                .font(.system(size: 14))
                                .foregroundStyle(.secondary)
                        }
                    }
                }
                .padding(.leading, 12)
                .padding(.vertical, 12)
                .padding(.trailing, 16)
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    // MARK: PASSES tab (dynamically generated from pricing structure)

    private var passesTab: some View {
        VStack(spacing: 12) {
            if packagesService.isLoading || pricingService.isLoading {
                ProgressView().padding()
            } else if let error = packagesService.error {
                VStack(spacing: Spacing.md) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.system(size: 48))
                        .foregroundStyle(AppTheme.error)
                    Text("Error Loading Passes")
                        .font(.headingMedium)
                        .foregroundStyle(AppTheme.textPrimary)
                    Text(error.localizedDescription)
                        .font(.bodyMedium)
                        .foregroundStyle(AppTheme.textSecondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                    Button {
                        Task {
                            await packagesService.loadMyPackages(orgId: auth.currentOrgId)
                        }
                    } label: {
                        Label("Try Again", systemImage: "arrow.clockwise")
                            .font(.headingSmall)
                            .foregroundStyle(.white)
                            .padding(.horizontal, Spacing.xl)
                            .padding(.vertical, Spacing.md)
                            .background(AppTheme.primary)
                            .cornerRadius(CornerRadius.md)
                    }
                }
                .padding()
            } else {
                // Legend at the top
                HStack(spacing: Spacing.md) {
                    // Athlete packages legend
                    HStack(spacing: Spacing.xxs) {
                        Circle()
                            .fill(AppTheme.primary)
                            .frame(width: 12, height: 12)
                        Text("Athlete Passes")
                            .font(.labelMedium)
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                    
                    // Class legend
                    HStack(spacing: Spacing.xxs) {
                        Circle()
                            .fill(AppTheme.secondary)
                            .frame(width: 12, height: 12)
                        Text("Class")
                            .font(.labelMedium)
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                    
                    Spacer()
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 4)
                
                // Action buttons: Refresh and Buy (moved above passes)
                HStack(spacing: 12) {
                    // Refresh button
                    Button {
                        Task {
                            await packagesService.loadMyPackages(orgId: auth.currentOrgId)
                        }
                    } label: {
                        Image(systemName: "arrow.clockwise")
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundStyle(.white)
                            .frame(width: 48, height: 48)
                            .background(Brand.primary)
                            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    }
                    
                    // Buy Passes button
                    Button {
                        showPurchaseLessons = true
                    } label: {
                        HStack(spacing: 10) {
                            Image(systemName: "cart.fill")
                                .font(.system(size: 18, weight: .semibold))
                            Text("Purchase Passes")
                                .font(.headline)
                        }
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Brand.primary)
                        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 12)
                
                // Display passes grouped by category
                let categories = buildCategoryGroups()
                if categories.isEmpty {
                    Text("No pass types configured")
                        .foregroundStyle(.secondary)
                        .padding()
                } else {
                    ForEach(categories) { category in
                        categoryCard(category: category)
                    }
                }
            }
        }
        .padding(.horizontal, 16)
    }
    
    // MARK: - Category Data Structures
    
    struct PassCategory: Identifiable {
        let id: String
        let displayName: String
        let isFixed: Bool  // true for 1-4 athlete, false for classes
        var totalRemaining: Int
        var nextExpiration: Date?
        var purchases: [PurchaseDetail]
        var icon: String
        var category: PackageCategory
    }
    
    struct PurchaseDetail: Identifiable {
        let id: String
        let packageName: String
        let totalLessons: Int
        let remainingLessons: Int
        let purchaseDate: Date
        let expirationDate: Date
        let isExpired: Bool
        
        // Tier Pricing
        let tierName: String?
        let pricingTierId: String?
        let pricePerLesson: Int?
        
        var formattedPricePerLesson: String? {
            guard let price = pricePerLesson else { return nil }
            return String(format: "$%.0f", Double(price) / 100.0)
        }
        
        /// Gradient colors for the tier badge, keyed on tier name (case-insensitive).
        var tierGradientColors: [Color] {
            switch tierName?.lowercased() {
            case "elite":
                return [Color(red: 0.80, green: 0.62, blue: 0.10), Color(red: 0.64, green: 0.46, blue: 0.04)]
            case "pro":
                return [Color(red: 0.196, green: 0.345, blue: 0.639), Color(red: 0.102, green: 0.169, blue: 0.427)]
            case "class pass":
                return [Color(red: 0.45, green: 0.18, blue: 0.72), Color(red: 0.32, green: 0.10, blue: 0.56)]
            default:
                return [Color.orange, Color.orange.opacity(0.8)]
            }
        }
    }
    
    // MARK: - Category Building
    
    private func buildCategoryGroups() -> [PassCategory] {
        var categories: [PassCategory] = []
        
        // Fixed categories - always show
        let fixedCategories: [(id: String, name: String, icon: String)] = [
            ("oneAthlete", "One Athlete", "person.fill"),
            ("twoAthlete", "Two Athletes", "person.2.fill"),
            ("threeAthlete", "Three Athletes", "person.3.fill"),
            ("fourAthlete", "Four Athletes", "person.fill.badge.plus")
        ]
        
        for fixed in fixedCategories {
            let purchases = getPurchasesForCategory(fixed.id)
            let activePurchases = purchases.filter { !$0.isExpired }
            let totalRemaining = activePurchases.reduce(0) { $0 + $1.remainingLessons }
            let nextExp = activePurchases.compactMap { $0.expirationDate }.min()
            
            categories.append(PassCategory(
                id: fixed.id,
                displayName: fixed.name,
                isFixed: true,
                totalRemaining: totalRemaining,
                nextExpiration: nextExp,
                purchases: purchases,
                icon: fixed.icon,
                category: .oneAthlete
            ))
        }
        
        // Class passes - always show this category (same as 1-4 athlete folders)
        let allPurchases = packagesService.packages
        let classPurchases = allPurchases.filter { pkg in
            let canBookClass = pkg.canBookClasses
            let isActive = pkg.expirationDate >= Date() && pkg.lessonsRemaining > 0
            return canBookClass && isActive
        }
        
        let classPurchaseDetails = classPurchases.map { pkg in
            PurchaseDetail(
                id: pkg.id ?? UUID().uuidString,
                packageName: pkg.packageName ?? "Unknown Package",
                totalLessons: pkg.totalLessons,
                remainingLessons: max(0, pkg.lessonsRemaining),
                purchaseDate: pkg.purchaseDate,
                expirationDate: pkg.expirationDate,
                isExpired: pkg.expirationDate < Date(),
                tierName: pkg.pricingTierName,
                pricingTierId: pkg.pricingTierId,
                pricePerLesson: pkg.pricePerLesson
            )
        }.sorted { $0.purchaseDate > $1.purchaseDate }
        
        let activeClassPurchases = classPurchaseDetails.filter { !$0.isExpired }
        let classTotalRemaining = activeClassPurchases.reduce(0) { $0 + $1.remainingLessons }
        let classNextExp = activeClassPurchases.compactMap { $0.expirationDate }.min()
        
        categories.append(PassCategory(
            id: "classPass",
            displayName: "Class Passes",
            isFixed: false,
            totalRemaining: classTotalRemaining,
            nextExpiration: classNextExp,
            purchases: classPurchaseDetails,
            icon: "book.closed.fill",
            category: .classPass
        ))
        
        return categories
    }
    
    private func getPurchasesForCategory(_ categoryId: String) -> [PurchaseDetail] {
        packagesService.packages
            .filter { pkg in
                let pkgCategory = mapPackageTypeToCategory(pkg.packageType)
                return pkgCategory == categoryId
            }
            .map { pkg in
                PurchaseDetail(
                    id: pkg.id ?? UUID().uuidString,
                    packageName: pkg.packageName ?? "Unknown Package",
                    totalLessons: pkg.totalLessons,
                    remainingLessons: max(0, pkg.lessonsRemaining),
                    purchaseDate: pkg.purchaseDate,
                    expirationDate: pkg.expirationDate,
                    isExpired: pkg.expirationDate < Date(),
                    tierName: pkg.pricingTierName,
                    pricingTierId: pkg.pricingTierId,
                    pricePerLesson: pkg.pricePerLesson
                )
            }
            .filter { $0.remainingLessons > 0 } // Hide fully used packages (0/0)
            .sorted { $0.purchaseDate > $1.purchaseDate }
    }
    
    private func mapPackageTypeToCategory(_ packageType: String) -> String {
        // Use pattern matching to handle ALL variations of package types
        let lowercased = packageType.lowercased()
        
        // Check for one athlete patterns (1_athlete, one_athlete, private)
        if lowercased.contains("one_athlete") || 
           lowercased.contains("1_athlete") || 
           lowercased == "private" {
            return "oneAthlete"
        } 
        // Check for two athlete patterns
        else if lowercased.contains("two_athlete") || 
                lowercased.contains("2_athlete") {
            return "twoAthlete"
        } 
        // Check for three athlete patterns
        else if lowercased.contains("three_athlete") || 
                lowercased.contains("3_athlete") {
            return "threeAthlete"
        } 
        // Check for four athlete patterns
        else if lowercased.contains("four_athlete") || 
                lowercased.contains("4_athlete") {
            return "fourAthlete"
        } 
        // Check for class patterns - all should map to classPass
        else if lowercased.contains("class") {
            return "classPass"
        }
        else {
            // Unknown type - try to infer from packageCategory if available
            // For now, default to the package type itself
            return packageType
        }
    }
    
    private func getCategoryDisplayName(_ categoryId: String) -> String {
        switch categoryId {
        case "oneAthlete":
            return "One Athlete"
        case "twoAthlete":
            return "Two Athletes"
        case "threeAthlete":
            return "Three Athletes"
        case "fourAthlete":
            return "Four Athletes"
        case "classPass":
            return "Class Passes"
        default:
            // Format unknown categories nicely (replace underscores with spaces, capitalize)
            return categoryId.replacingOccurrences(of: "_", with: " ")
                .split(separator: " ")
                .map { $0.capitalized }
                .joined(separator: " ")
        }
    }
    
    private func toggleCategory(_ categoryId: String) {
        if expandedCategories.contains(categoryId) {
            expandedCategories.remove(categoryId)
        } else {
            expandedCategories.insert(categoryId)
        }
    }
    
    // MARK: - Category Card View
    
    private func categoryCard(category: PassCategory) -> some View {
        let isExpanded = expandedCategories.contains(category.id)
        let gradientColor = category.category == .classPass ? AppTheme.secondary : AppTheme.primary
        let expiringSoon = isExpiringSoon(category.nextExpiration)
        
        return card {
            VStack(alignment: .leading, spacing: 12) {
                // Header (always visible)
                Button(action: {
                    toggleCategory(category.id)
                }) {
                    HStack(spacing: Spacing.md) {
                        // Icon with gradient background
                        ZStack {
                            RoundedRectangle(cornerRadius: CornerRadius.sm, style: .continuous)
                                .fill(
                                    LinearGradient(
                                        colors: [gradientColor, gradientColor.opacity(0.7)],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                                .frame(width: 56, height: 56)
                            
                            Image(systemName: category.icon)
                                .font(.system(size: 24, weight: .semibold))
                                .foregroundStyle(.white)
                        }
                        
                        // Category info
                        VStack(alignment: .leading, spacing: 4) {
                            Text(category.displayName)
                                .font(.headingMedium)
                                .foregroundStyle(AppTheme.textPrimary)
                            
                            if category.totalRemaining > 0 {
                                HStack(spacing: Spacing.xxs) {
                                    Image(systemName: "ticket.fill")
                                        .font(.labelSmall)
                                    Text("\(category.totalRemaining) remaining")
                                        .font(.labelMedium)
                                }
                                .foregroundStyle(AppTheme.success)
                                
                                if let nextExp = category.nextExpiration {
                                    HStack(spacing: Spacing.xxs) {
                                        Image(systemName: expiringSoon ? "exclamationmark.triangle.fill" : "calendar")
                                            .font(.labelSmall)
                                        Text("Next expires \(nextExp, style: .date)")
                                            .font(.labelSmall)
                                    }
                                    .foregroundStyle(expiringSoon ? Color.orange : AppTheme.textSecondary)
                                }
                            } else {
                                Text("No active passes")
                                    .font(.labelMedium)
                                    .foregroundStyle(AppTheme.textTertiary)
                            }
                        }
                        
                        Spacer()
                        
                        // Count badge
                        Text("\(category.totalRemaining)")
                            .font(.system(size: 36, weight: .bold))
                            .foregroundStyle(category.totalRemaining > 0 ? gradientColor : AppTheme.textTertiary)
                        
                        // Expand icon
                        Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                            .foregroundStyle(AppTheme.textSecondary)
                            .font(.system(size: 14))
                    }
                }
                .buttonStyle(.plain)
                
                // Expanded details
                if isExpanded {
                    Divider()
                        .padding(.vertical, 4)
                    
                    if category.purchases.isEmpty {
                        Text("No passes in this category")
                            .font(.bodyMedium)
                            .foregroundStyle(AppTheme.textSecondary)
                            .padding(.vertical, 8)
                    } else {
                        VStack(alignment: .leading, spacing: 12) {
                            ForEach(category.purchases) { purchase in
                                purchaseDetailRow(purchase: purchase)
                            }
                        }
                    }
                }
            }
        }
    }
    
    private func purchaseDetailRow(purchase: PurchaseDetail) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(purchase.packageName)
                    .font(.bodyMedium.weight(.semibold))
                    .foregroundStyle(AppTheme.textPrimary)
                
                if purchase.isExpired {
                    Text("EXPIRED")
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(AppTheme.error)
                        .cornerRadius(4)
                }
            }
            
            // Tier badge
            if let tierName = purchase.tierName {
                HStack(spacing: 6) {
                    Image(systemName: "medal.fill")
                        .font(.caption)
                    Text(tierName)
                        .font(.labelMedium.weight(.semibold))
                }
                .foregroundStyle(.white)
                .padding(.horizontal, 10)
                .padding(.vertical, 5)
                .background(
                    LinearGradient(
                        colors: purchase.tierGradientColors,
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .cornerRadius(6)
            } else {
                // Universal pass (no tier restriction)
                HStack(spacing: 6) {
                    Image(systemName: "checkmark.seal.fill")
                        .font(.caption)
                    Text("Universal Pass")
                        .font(.labelMedium.weight(.semibold))
                    Text("•")
                        .font(.caption2)
                    Text("Works with all trainers")
                        .font(.labelSmall)
                }
                .foregroundStyle(.white)
                .padding(.horizontal, 10)
                .padding(.vertical, 5)
                .background(
                    LinearGradient(
                        colors: [Color.green, Color.green.opacity(0.8)],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .cornerRadius(6)
            }
            
            HStack(spacing: 16) {
                HStack(spacing: 4) {
                    Image(systemName: "ticket.fill")
                        .font(.caption)
                    Text("\(purchase.remainingLessons) of \(purchase.totalLessons) remaining")
                        .font(.labelMedium)
                }
                .foregroundStyle(AppTheme.textSecondary)
                
                HStack(spacing: 4) {
                    Image(systemName: "calendar")
                        .font(.caption)
                    Text("Purchased \(purchase.purchaseDate, style: .date)")
                        .font(.labelSmall)
                }
                .foregroundStyle(AppTheme.textTertiary)
            }
            
            HStack(spacing: 4) {
                Image(systemName: purchase.isExpired ? "exclamationmark.triangle.fill" : "clock")
                    .font(.caption)
                Text("Expires \(purchase.expirationDate, style: .date)")
                    .font(.labelSmall)
            }
            .foregroundStyle(purchase.isExpired ? AppTheme.error : AppTheme.textSecondary)
        }
        .opacity(purchase.isExpired ? 0.6 : 1.0)
        .padding(.vertical, 8)
    }
    
    // Helper to get remaining passes for a specific packageType
    private func remainingPasses(forType packageType: String) -> Int {
        var totalRemaining = 0
        var includedPackages: [String] = []
        
        for pkg in packagesService.packages {
            guard pkg.expirationDate >= Date() else { continue }
            guard pkg.packageType == packageType else { continue }
            
            let remaining = max(0, pkg.lessonsRemaining)
            totalRemaining += remaining
            includedPackages.append("\(pkg.packageName ?? "Unknown")(\(remaining))")
        }
        
        return totalRemaining
    }
    
    // Helper to get earliest expiration date for a package type
    private func earliestExpiration(forType packageType: String) -> Date? {
        let validPackages = packagesService.packages.filter { pkg in
            pkg.packageType == packageType &&
            pkg.expirationDate >= Date() &&
            pkg.lessonsRemaining > 0
        }
        return validPackages.map(\.expirationDate).min()
    }
    
    // Helper to check if expiring soon (within 30 days)
    private func isExpiringSoon(_ date: Date?) -> Bool {
        guard let date = date else { return false }
        let thirtyDaysFromNow = Calendar.current.date(byAdding: .day, value: 30, to: Date()) ?? Date()
        return date <= thirtyDaysFromNow
    }
    
    // Helper to get icon for package type
    private func iconForPackageType(_ packageType: String) -> String {
        switch packageType {
        case "private", "1_athlete":
            return "person.fill"
        case "2_athlete":
            return "person.2.fill"
        case "3_athlete":
            return "person.3.fill"
        case "class_pass", "class":
            return "book.closed.fill"
        default:
            return "ticket.fill"
        }
    }
    
    private func passTypeCard(title: String, description: String, count: Int, icon: String, category: PackageCategory, earliestExpiration: Date?) -> some View {
        let gradientColor = category == .classPass ? AppTheme.secondary : AppTheme.primary
        let expiringSoon = isExpiringSoon(earliestExpiration)
        
        return card {
            HStack(spacing: Spacing.md) {
                // Icon with gradient background (similar to ClassPreviewRow)
                ZStack {
                    RoundedRectangle(cornerRadius: CornerRadius.sm, style: .continuous)
                        .fill(
                            LinearGradient(
                                colors: [gradientColor, gradientColor.opacity(0.7)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 56, height: 56)
                    
                    Image(systemName: icon)
                        .font(.system(size: 24, weight: .semibold))
                        .foregroundStyle(.white)
                }
                
                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    // Package title
                    Text(title)
                        .font(.headingSmall)
                        .foregroundStyle(AppTheme.textPrimary)
                    
                    // Category display name
                    Text(category.displayName)
                        .font(.labelMedium)
                        .foregroundStyle(AppTheme.textSecondary)
                    
                    // Description with more room to display
                    if !description.isEmpty {
                        Text(description)
                            .font(.bodyMedium)
                            .foregroundStyle(AppTheme.textSecondary)
                            .lineLimit(3)
                            .fixedSize(horizontal: false, vertical: true)
                            .onTapGesture {
                                descriptionSheetTitle = title
                                descriptionSheetText = description
                                showingDescriptionSheet = true
                            }
                    }
                    
                    // Allotment/remaining count
                    HStack(spacing: Spacing.xxs) {
                        Image(systemName: "ticket.fill")
                            .font(.labelSmall)
                        Text("\(count) remaining")
                            .font(.labelMedium)
                    }
                    .foregroundStyle(count > 0 ? AppTheme.success : AppTheme.textTertiary)
                    .padding(.top, Spacing.xxs)
                    
                    // Expiration date (if available and count > 0)
                    if let expDate = earliestExpiration, count > 0 {
                        HStack(spacing: Spacing.xxs) {
                            Image(systemName: expiringSoon ? "exclamationmark.triangle.fill" : "calendar")
                                .font(.labelSmall)
                            Text("Expires \(expDate, style: .date)")
                                .font(.labelSmall)
                        }
                        .foregroundStyle(expiringSoon ? Color.orange : AppTheme.textSecondary)
                        .padding(.top, 2)
                    }
                }
                
                Spacer()
                
                // Large count badge
                VStack(spacing: Spacing.xxs) {
                    Text("\(count)")
                        .font(.system(size: 36, weight: .bold))
                        .foregroundStyle(count > 0 ? gradientColor : AppTheme.textTertiary)
                    
                    if count == 0 {
                        Text("None")
                            .font(.caption2)
                            .foregroundStyle(AppTheme.textTertiary)
                    }
                }
            }
        }
    }

    // MARK: WALLET tab

    private var walletTab: some View {
        VStack(spacing: 12) {
            if customerService.isLoading {
                ProgressView().padding()
            } else if customerService.paymentMethods.isEmpty {
                card {
                    VStack(spacing: 12) {
                        Image(systemName: "creditcard")
                            .font(.system(size: 48))
                            .foregroundStyle(.secondary)
                        Text("No Saved Cards")
                            .font(.headline)
                            .foregroundStyle(.primary)
                        Text("Your saved payment methods will appear here. Add a card to your wallet for faster checkout.")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 24)
                }
            } else {
                ForEach(customerService.paymentMethods) { method in
                    PaymentMethodCard(
                        method: method,
                        onRemove: {
                            Task {
                                do {
                                    try await customerService.removePaymentMethod(method.id)
                                    // Refresh the list with the current orgId
                                    if let orgId = auth.currentOrgId {
                                        await customerService.loadPaymentMethods(orgId: orgId)
                                    }
                                } catch {
                                    // Handle error - could show alert
                                    print("Failed to remove card: \(error)")
                                }
                            }
                        }
                    )
                }
            }
            
            // Add Card to Wallet Button
            Button {
                Task {
                    await addCardToWallet()
                }
            } label: {
                HStack(spacing: 12) {
                    Image(systemName: "plus.circle.fill")
                        .font(.system(size: 20))
                        .foregroundStyle(Brand.primary)
                    
                    Text("Add Card to Wallet")
                        .font(.headline)
                        .foregroundStyle(.primary)
                    
                    Spacer()
                    
                    Image(systemName: "chevron.right")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(.secondary)
                }
                .padding(16)
                .background(
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .fill(Color.platformBackground)
                        .shadow(color: .black.opacity(0.06), radius: 10, x: 0, y: 4)
                )
            }
            .padding(.horizontal, 16)
            
            if let error = customerService.errorMessage {
                card {
                    HStack(spacing: 8) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundStyle(.red)
                        Text(error)
                            .font(.subheadline)
                            .foregroundStyle(.red)
                    }
                }
            }
        }
        .padding(.horizontal, 16)
    }

    // MARK: Helpers

    private func card<Content: View>(@ViewBuilder _ content: () -> Content) -> some View {
        content()
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .fill(Color.platformBackground)
                    .shadow(color: .black.opacity(0.06), radius: 10, x: 0, y: 4)
            )
    }

    private func initialsFrom(name: String, emailFallback: String) -> String {
        let parts = name.split(separator: " ").map(String.init)
        let initials: String
        if parts.count >= 2, let f = parts.first?.first, let l = parts.last?.first {
            initials = String([f, l])
        } else if let f = parts.first?.first {
            initials = String(f)
        } else if let first = emailFallback.first {
            initials = String(first)
        } else {
            initials = "?"
        }
        return initials.uppercased()
    }

    private func dateString(_ date: Date?) -> String {
        guard let date else { return "-" }
        let f = DateFormatter(); f.dateStyle = .medium; f.timeStyle = .none
        return f.string(from: date)
    }

    private func timeString(_ date: Date?) -> String {
        guard let date else { return "-" }
        let f = DateFormatter(); f.dateStyle = .none; f.timeStyle = .short
        return f.string(from: date)
    }

    private func trainerName(for trainerId: String) -> String {
        trainersService.trainers.first(where: { $0.id == trainerId })?.name ?? "Trainer"
    }
    
    private func participantCountText(for booking: Booking) -> String {
        var count = 1 // At least one athlete
        if let secondAthlete = booking.secondAthleteName, !secondAthlete.isEmpty {
            count = 2
        }
        
        switch count {
        case 1: return "One Athlete"
        case 2: return "Two Athletes"
        case 3: return "Three Athletes"
        case 4: return "Four Athletes"
        default: return "\(count) Athletes"
        }
    }
    
    private func addCardToWallet() async {
        guard let userId = Auth.auth().currentUser?.uid,
              let orgId = auth.currentOrgId else {
            await MainActor.run {
                customerService.setErrorMessage("Unable to add card: Please sign in again")
            }
            return
        }
        
        do {
            // Create setup intent
            let functions = Functions.functions()
            let callable = functions.httpsCallable("createSetupIntentDirect")
            
            let result = try await callable.call(["orgId": orgId, "userId": userId])
            
            guard let data = result.data as? [String: Any] else {
                return
            }
            
            guard let clientSecret = data["clientSecret"] as? String,
                  let publishableKey = data["publishableKey"] as? String else {
                await MainActor.run {
                    customerService.setErrorMessage("Unable to setup payment: Configuration error")
                }
                return
            }
            
            // Configure Stripe with org's key
            STPAPIClient.shared.publishableKey = publishableKey
            
            // Create and configure payment sheet for card setup
            var configuration = PaymentSheet.Configuration()
            configuration.merchantDisplayName = "PolyFace Volleyball Academy"
            configuration.allowsDelayedPaymentMethods = false
            
            let paymentSheet = PaymentSheet(setupIntentClientSecret: clientSecret, configuration: configuration)
            
            // Present the payment sheet
            guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                  let rootViewController = windowScene.windows.first?.rootViewController else {
                return
            }
            
            paymentSheet.present(from: rootViewController) { result in
                Task { @MainActor in
                    switch result {
                    case .completed:
                        // Card was successfully added - reload payment methods
                        await self.customerService.loadPaymentMethods(orgId: orgId)
                    case .canceled:
                        break
                    case .failed(let error):
                        self.customerService.setErrorMessage("Unable to add card: \(error.localizedDescription)")
                    }
                }
            }
        } catch {
            await MainActor.run {
                customerService.setErrorMessage("Unable to add card: \(error.localizedDescription)")
            }
        }
    }

    private func nextUpcomingBooking() -> Booking? {
        let now = Date()
        return bookingsService.myBookings
            .filter { ($0.startTime ?? now) >= now }
            .sorted { ($0.startTime ?? .distantFuture) < ($1.startTime ?? .distantFuture) }
            .first
    }

    private func previousBookings() -> [Booking] {
        let now = Date()
        return bookingsService.myBookings
            .filter { ($0.endTime ?? now) < now }
            .sorted { ($0.startTime ?? .distantPast) > ($1.startTime ?? .distantPast) }
    }
    
    // MARK: Event helpers
    
    private enum UpcomingEvent: Identifiable {
        case lesson(Booking, packageName: String)
        case classItem(GroupClass)
        
        var id: String {
            switch self {
            case .lesson(let booking, _): return "lesson-\(booking.id ?? "")"
            case .classItem(let classItem): return "class-\(classItem.id ?? "")"
            }
        }
        
        var date: Date {
            switch self {
            case .lesson(let booking, _): return booking.startTime ?? .distantFuture
            case .classItem(let classItem): return classItem.startTime
            }
        }
        
        var color: Color {
            switch self {
            case .lesson: return Brand.primary
            case .classItem: return Brand.secondary
            }
        }
        
        var title: String {
            switch self {
            case .lesson(_, let packageName): return packageName
            case .classItem(let classItem): return classItem.title
            }
        }
        
        var startTime: String {
            let formatter = DateFormatter()
            formatter.timeStyle = .short
            return formatter.string(from: date)
        }
        
        var endTime: String {
            let formatter = DateFormatter()
            formatter.timeStyle = .short
            switch self {
            case .lesson(let booking, _):
                if let end = booking.endTime {
                    return formatter.string(from: end)
                }
                return ""
            case .classItem(let classItem):
                return formatter.string(from: classItem.endTime)
            }
        }
        
        var location: String? {
            switch self {
            case .lesson(let booking, _): return booking.location
            case .classItem(let classItem): return classItem.location
            }
        }
        
        func trainerName(using service: TrainersService) -> String {
            switch self {
            case .lesson(let booking, _):
                if let trainer = service.trainers.first(where: { $0.id == booking.trainerUID }) {
                    return "\(trainer.firstName ?? "") \(trainer.lastName ?? "")"
                }
                return "Unknown Trainer"
            case .classItem(let classItem):
                if let trainer = service.trainers.first(where: { $0.id == classItem.trainerId }) {
                    return "\(trainer.firstName ?? "") \(trainer.lastName ?? "")"
                }
                return classItem.trainerName
            }
        }
    }
    
    private func nextUpcomingEvent() -> UpcomingEvent? {
        allUpcomingEvents().first
    }
    
    private func allUpcomingEvents() -> [UpcomingEvent] {
        let now = Date()
        var events: [UpcomingEvent] = []
        
        // Create package name lookup dictionary
        let packageNames: [String: String] = Dictionary(uniqueKeysWithValues: packagesService.packages.compactMap { pkg -> (String, String)? in
            guard let id = pkg.id, let name = pkg.packageName else { return nil }
            return (id, name)
        })
        
        // Add upcoming lessons
        let upcomingLessons = bookingsService.myBookings
            .filter { !$0.isClassBooking && ($0.startTime ?? now) >= now }
            .map { booking in
                let packageName = booking.lessonPackageId.flatMap { packageNames[$0] } ?? "Private Lesson"
                return UpcomingEvent.lesson(booking, packageName: packageName)
            }
        events.append(contentsOf: upcomingLessons)
        
        // Add all upcoming classes (user must be registered to see them here)
        let upcomingClasses = classesService.myRegisteredClasses
            .filter { $0.startTime >= now }
            .map { UpcomingEvent.classItem($0) }
        events.append(contentsOf: upcomingClasses)
        
        // Sort by date
        return events.sorted { $0.date < $1.date }
    }

    // MARK: Remaining credits + expanded credit list

    private var remainingCredits: Int {
        packagesService.packages.reduce(into: 0) { sum, pkg in
            guard pkg.expirationDate >= Date() else { return }
            sum += max(0, pkg.lessonsRemaining)
        }
    }
    
    private var registeredClassesCount: Int {
        let now = Date()
        // Count upcoming classes the user is registered for
        return classesService.myRegisteredClasses.filter { $0.startTime >= now }.count
    }

    private struct LessonCredit: Identifiable, Hashable {
        let id = UUID()
        let expirationDate: Date
    }

    private var expandedCredits: [LessonCredit] {
        var credits: [LessonCredit] = []
        for pkg in packagesService.packages where pkg.expirationDate >= Date() {
            let remaining = max(0, pkg.lessonsRemaining)
            if remaining > 0 {
                credits.append(contentsOf: Array(repeating: LessonCredit(expirationDate: pkg.expirationDate), count: remaining))
            }
        }
        return credits
    }
}

// MARK: - Existing Auth Forms

private struct SignInForm: View {
    @EnvironmentObject var auth: AuthManager
    @State private var email = ""
    @State private var password = ""
    @State private var showingForgotPassword = false
    @State private var resetMessage: String?

    var body: some View {
        VStack(spacing: 16) {
            TextField("Email", text: $email)
                #if os(iOS)
                .textContentType(.emailAddress)
                .keyboardType(.emailAddress)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                #endif
                .padding()
                .background(RoundedRectangle(cornerRadius: 12).fill(Color.platformSecondaryBackground))

            SecureField("Password", text: $password)
                #if os(iOS)
                .textContentType(.password)
                #endif
                .padding()
                .background(RoundedRectangle(cornerRadius: 12).fill(Color.platformSecondaryBackground))

            Button {
                Task { _ = await auth.signIn(email: email.trimmingCharacters(in: .whitespacesAndNewlines), password: password) }
            } label: {
                Text("Sign In")
                    .font(.headline)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Brand.primary)
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            }
            .disabled(email.isEmpty || password.isEmpty)
            .padding(.top, 8)
            .padding(.horizontal)
            
            Button {
                showingForgotPassword = true
            } label: {
                Text("Forgot Password?")
                    .font(.subheadline)
                    .foregroundStyle(Brand.primary)
            }
            .padding(.top, 4)
            
            if let resetMessage = resetMessage {
                Text(resetMessage)
                    .font(.footnote)
                    .foregroundStyle(resetMessage.contains("sent") ? .green : .red)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
            }
        }
        .padding(.horizontal)
        .alert("Reset Password", isPresented: $showingForgotPassword) {
            Button("Cancel", role: .cancel) { }
            Button("Send Reset Email") {
                sendPasswordReset()
            }
        } message: {
            if email.isEmpty {
                Text("Please enter your email address in the email field first, then tap 'Forgot Password?' again.")
            } else {
                Text("Send a password reset email to \(email)?")
            }
        }
    }
    
    private func sendPasswordReset() {
        guard !email.isEmpty else {
            resetMessage = "Please enter your email address first"
            return
        }
        
        let functions = Functions.functions()
        let sendPasswordReset = functions.httpsCallable("sendPasswordResetEmail")
        
        sendPasswordReset.call(["email": email.trimmingCharacters(in: .whitespacesAndNewlines)]) { result, error in
            if let error = error {
                resetMessage = "Error: \(error.localizedDescription)"
            } else {
                resetMessage = "✅ Password reset email sent! Check your inbox."
                // Clear message after 10 seconds
                DispatchQueue.main.asyncAfter(deadline: .now() + 10) {
                    resetMessage = nil
                }
            }
        }
    }
}

private struct RegisterForm: View {
    @EnvironmentObject var auth: AuthManager
    @EnvironmentObject var deepLinkManager: DeepLinkManager

    @State private var isRegistering = false
    
    // 🏷️ WHITE-LABEL: Organization code removed - org is hard-coded in AuthManager
    
    @State private var email = ""
    @State private var password = ""
    @State private var confirm = ""
    @State private var firstName = ""
    @State private var lastName = ""
    @State private var phoneNumber = ""
    @State private var athleteFirstName = ""
    @State private var athleteLastName = ""
    @State private var athleteBirthday = ""
    
    private var passwordsMatch: Bool {
        password == confirm && !password.isEmpty
    }
    
    private var canSubmit: Bool {
        !email.isEmpty &&
        !password.isEmpty &&
        passwordsMatch &&
        !firstName.isEmpty &&
        !lastName.isEmpty &&
        !phoneNumber.isEmpty &&
        !athleteFirstName.isEmpty &&
        !athleteLastName.isEmpty &&
        !athleteBirthday.isEmpty &&
        isValidBirthday(athleteBirthday) &&
        !isRegistering
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Header
                VStack(spacing: 8) {
                    Image(systemName: "volleyball.fill")
                        .font(.system(size: 48))
                        .foregroundStyle(Brand.primary)
                        .padding(.top, 20)
                    
                    Text("Create Your Account")
                        .font(.system(size: 28, weight: .bold))
                        .foregroundStyle(.primary)
                }
                .padding(.bottom, 8)
                
                // 🏷️ WHITE-LABEL: Organization code section removed - org is hard-coded
                
                // Account Credentials Section
                VStack(alignment: .leading, spacing: 16) {
                    ProfileSectionHeader(icon: "lock.shield.fill", title: "Account Credentials")
                    
                    VStack(spacing: 12) {
                        FormField(
                            icon: "envelope.fill",
                            placeholder: "Email Address",
                            text: $email,
                            keyboardType: .emailAddress,
                            textContentType: .emailAddress,
                            autocapitalization: .never,
                            disableAutocorrection: true
                        )
                        
                        FormField(
                            icon: "lock.fill",
                            placeholder: "Password",
                            text: $password,
                            isSecure: true,
                            textContentType: .newPassword
                        )
                        
                        FormField(
                            icon: "lock.fill",
                            placeholder: "Confirm Password",
                            text: $confirm,
                            isSecure: true,
                            textContentType: .newPassword,
                            validationIcon: password.isEmpty ? nil : (passwordsMatch ? "checkmark.circle.fill" : "xmark.circle.fill"),
                            validationColor: passwordsMatch ? .green : .red
                        )
                    }
                }
                .padding(.horizontal)
                
                // Parent/Guardian Information Section
                VStack(alignment: .leading, spacing: 16) {
                    ProfileSectionHeader(icon: "person.fill", title: "Parent/Guardian Information")
                    
                    HStack(spacing: 12) {
                        FormField(
                            icon: "person.circle.fill",
                            placeholder: "First Name",
                            text: $firstName,
                            textContentType: .givenName
                        )
                        
                        FormField(
                            icon: "person.circle.fill",
                            placeholder: "Last Name",
                            text: $lastName,
                            textContentType: .familyName
                        )
                    }
                    
                    FormField(
                        icon: "phone.fill",
                        placeholder: "Phone Number",
                        text: $phoneNumber,
                        keyboardType: .phonePad,
                        textContentType: .telephoneNumber,
                        disableAutocorrection: true
                    )
                }
                .padding(.horizontal)
                
                // Primary Athlete Section
                VStack(alignment: .leading, spacing: 16) {
                    ProfileSectionHeader(icon: "person.fill", title: "Athlete Information")
                    
                    HStack(spacing: 12) {
                        FormField(
                            icon: "person.circle",
                            placeholder: "First Name",
                            text: $athleteFirstName,
                            textContentType: .givenName
                        )
                        
                        FormField(
                            icon: "person.circle",
                            placeholder: "Last Name",
                            text: $athleteLastName,
                            textContentType: .familyName
                        )
                    }
                    
                    FormField(
                        icon: "calendar",
                        placeholder: "Birthday (MM/DD/YYYY)",
                        text: $athleteBirthday,
                        keyboardType: .numberPad
                    )
                    .onChangeCompat(of: athleteBirthday) { _, newValue in
                        athleteBirthday = formatBirthdayInput(newValue)
                    }
                }
                .padding(.horizontal)
                
                // Submit Button
                Button {
                    guard canSubmit else { return }
                    Task {
                        await registerAccount()
                    }
                } label: {
                    HStack(spacing: 12) {
                        if isRegistering {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        } else {
                            Image(systemName: "arrow.right.circle.fill")
                                .font(.title3)
                        }
                        Text(isRegistering ? "Creating Account..." : "Complete Registration")
                            .font(.headline)
                    }
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(
                        LinearGradient(
                            colors: canSubmit ? [Brand.primary, Brand.primary.opacity(0.8)] : [Color.gray, Color.gray.opacity(0.8)],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .shadow(color: canSubmit ? Brand.primary.opacity(0.3) : Color.clear, radius: 8, y: 4)
                }
                .disabled(!canSubmit)
                .padding(.horizontal)
                .padding(.top, 8)
                
                // Privacy Note
                Text("By registering, you agree to our terms of service")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
                    .padding(.bottom, 32)
            }
        }
        // 🏷️ WHITE-LABEL: Deep link organization code handling removed
    }
    
    // MARK: - Helper Functions
    
    // 🏷️ WHITE-LABEL: validateOrganizationCode removed - org is hard-coded
    
    private func formatBirthdayInput(_ input: String) -> String {
        // Remove any non-digit characters
        let digits = input.filter { $0.isNumber }
        
        // Limit to 8 digits (MMDDYYYY)
        let limited = String(digits.prefix(8))
        
        // Add slashes at appropriate positions
        var formatted = ""
        for (index, char) in limited.enumerated() {
            if index == 2 || index == 4 {
                formatted += "/"
            }
            formatted += String(char)
        }
        
        return formatted
    }
    
    private func isValidBirthday(_ birthday: String) -> Bool {
        // Check format MM/DD/YYYY
        let pattern = #"^\d{2}/\d{2}/\d{4}$"#
        guard birthday.range(of: pattern, options: .regularExpression) != nil else {
            return false
        }
        
        let components = birthday.split(separator: "/")
        guard components.count == 3,
              let month = Int(components[0]),
              let day = Int(components[1]),
              let year = Int(components[2]) else {
            return false
        }
        
        // Validate ranges
        guard month >= 1 && month <= 12,
              day >= 1 && day <= 31,
              year >= 1900 && year <= 2024 else {
            return false
        }
        
        return true
    }
    
    private func registerAccount() async {
        isRegistering = true
        defer { isRegistering = false }
        
        // Create Firebase Auth account with organization ID
        _ = await auth.register(
            email: email.trimmingCharacters(in: .whitespacesAndNewlines),
            password: password,
            firstName: firstName.isEmpty ? nil : firstName,
            lastName: lastName.isEmpty ? nil : lastName,
            athleteFirstName: athleteFirstName.isEmpty ? nil : athleteFirstName,
            athleteLastName: athleteLastName.isEmpty ? nil : athleteLastName,
            athleteBirthday: athleteBirthday.isEmpty ? nil : athleteBirthday,
            athlete2FirstName: nil,
            athlete2LastName: nil,
            athlete2Birthday: nil,
            athlete3FirstName: nil,
            athlete3LastName: nil,
            athlete3Birthday: nil,
            athletePosition: nil,
            athlete2Position: nil,
            athlete3Position: nil,
            notesForCoach: nil,
            phoneNumber: phoneNumber.isEmpty ? nil : phoneNumber,
            orgId: nil  // 🏷️ WHITE-LABEL: Ignored - AuthManager uses hard-coded org
        )
    }
}

// MARK: - Payment Method Card

private struct PaymentMethodCard: View {
    let method: PaymentMethodInfo
    let onRemove: () -> Void
    
    @State private var showingRemoveConfirmation = false
    
    var body: some View {
        HStack(spacing: 16) {
            // Card icon
            ZStack {
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(cardColor.opacity(0.15))
                Image(systemName: cardIcon)
                    .font(.system(size: 24, weight: .semibold))
                    .foregroundStyle(cardColor)
            }
            .frame(width: 56, height: 56)
            
            VStack(alignment: .leading, spacing: 4) {
                Text("\(method.displayBrand) •••• \(method.last4)")
                    .font(.headline)
                    .foregroundStyle(.primary)
                Text("Expires \(method.expirationDisplay)")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            
            Spacer()
            
            Button {
                showingRemoveConfirmation = true
            } label: {
                Image(systemName: "trash")
                    .font(.system(size: 18))
                    .foregroundStyle(.red)
                    .frame(width: 44, height: 44)
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .fill(Color.platformBackground)
                .shadow(color: .black.opacity(0.06), radius: 10, x: 0, y: 4)
        )
        .padding(.horizontal, 16)
        .alert("Remove Card?", isPresented: $showingRemoveConfirmation) {
            Button("Cancel", role: .cancel) { }
            Button("Remove", role: .destructive) {
                onRemove()
            }
        } message: {
            Text("Are you sure you want to remove this payment method?")
        }
    }
    
    private var cardIcon: String {
        switch method.brand.lowercased() {
        case "visa": return "creditcard.fill"
        case "mastercard": return "creditcard.fill"
        case "amex": return "creditcard.fill"
        case "discover": return "creditcard.fill"
        default: return "creditcard"
        }
    }
    
    private var cardColor: Color {
        switch method.brand.lowercased() {
        case "visa": return .blue
        case "mastercard": return .orange
        case "amex": return .green
        case "discover": return .purple
        default: return Brand.primary
        }
    }
}

// MARK: - Registration Form Components

private struct ProfileSectionHeader: View {
    let icon: String
    let title: String
    var subtitle: String? = nil
    
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(Brand.primary)
                .frame(width: 32, height: 32)
                .background(
                    Circle()
                        .fill(Brand.primary.opacity(0.1))
                )
            
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.headline)
                    .foregroundStyle(.primary)
                
                if let subtitle = subtitle {
                    Text(subtitle)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            
            Spacer()
        }
    }
}

private struct FormField: View {
    let icon: String
    let placeholder: String
    @Binding var text: String
    var isSecure: Bool = false
    var keyboardType: UIKeyboardType = .default
    var textContentType: UITextContentType? = nil
    var autocapitalization: TextInputAutocapitalization = .words
    var disableAutocorrection: Bool = false
    var validationIcon: String? = nil
    var validationColor: Color? = nil
    
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.body)
                .foregroundStyle(Brand.primary)
                .frame(width: 20)
            
            if isSecure {
                SecureField(placeholder, text: $text)
                    .textContentType(textContentType)
            } else {
                TextField(placeholder, text: $text)
                    .keyboardType(keyboardType)
                    .textContentType(textContentType)
                    .textInputAutocapitalization(autocapitalization)
                    .autocorrectionDisabled(disableAutocorrection)
            }
            
            if let validationIcon = validationIcon {
                Image(systemName: validationIcon)
                    .foregroundStyle(validationColor ?? .secondary)
                    .font(.body)
            }
        }
        .padding(16)
        .background(Color(UIColor.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}
