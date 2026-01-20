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

    // Consider FirebaseAuth session as "signed in" for UI
    private var isSignedIn: Bool { Auth.auth().currentUser != nil }

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
                    await packagesService.loadMyPackages()
                    if let orgId = auth.currentOrgId {
                        await bookingsService.loadMyBookings(orgId: orgId)
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

    @State private var tab: Tab = .schedule
    enum Tab: String { case schedule = "SCHEDULE", passes = "PASSES", wallet = "WALLET" }
    @State private var showPurchaseLessons = false

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
            guard let orgId = auth.currentOrgId else { return }
            if trainersService.trainers.isEmpty {
                await trainersService.loadAll(orgId: orgId)
            }
            if classesService.myRegisteredClasses.isEmpty {
                await classesService.loadMyRegisteredClasses(orgId: orgId)
            }
            if customerService.paymentMethods.isEmpty {
                await customerService.loadPaymentMethods(orgId: orgId)
            }
            // Load pricing structure for dynamic pass display
            await pricingService.loadPricingStructure(for: orgId)
        }
        .refreshable {
            guard let orgId = auth.currentOrgId else { return }
            await usersService.loadCurrentUserIfAvailable()
            await packagesService.loadMyPackages()
            await bookingsService.loadMyBookings(orgId: orgId)
            await classesService.loadMyRegisteredClasses(orgId: orgId)
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
        .onChangeCompat(of: profileTab) { newTab in
            if let tabString = newTab, let targetTab = Tab(rawValue: tabString) {
                tab = targetTab
                profileTab = nil // Reset after navigating
            }
        }
        .navigationDestination(isPresented: $showPurchaseLessons) {
            PurchaseLessonsView(packagesService: packagesService)
        }
        .onChangeCompat(of: showPurchaseLessons) { isPresentingPurchase in
            // Reload packages when returning from purchase view
            if !isPresentingPurchase && tab == .passes {
                Task {
                    await packagesService.loadMyPackages()
                }
            }
        }
    }

    // Header with curved background, avatar, name, email
    private var header: some View {
        let name = (usersService.currentUser?.displayName.isEmpty == false
                    ? usersService.currentUser!.displayName
                    : (Auth.auth().currentUser?.displayName ?? "Client"))
        let email = usersService.currentUser?.emailAddress ?? Auth.auth().currentUser?.email
        let initials = initialsFrom(name: name, emailFallback: email ?? "")

        return ZStack(alignment: .bottom) {
            // Curved background: place a very large circle well above the top
            GeometryReader { proxy in
                let circleSize = proxy.size.width * 2.2
                // Position the circle's center above the visible area so only the bottom arc shows
                Circle()
                    .fill(Brand.primary)
                    .frame(width: circleSize, height: circleSize)
                    // Center horizontally, push center far above the top so the arc dips down
                    .position(x: proxy.size.width / 2, y: -circleSize * 0.32)
            }
            .frame(height: 180) // visible header height

            // Avatar + name + email
            VStack(spacing: 8) {
                ZStack {
                    Circle().fill(Color.platformBackground)
                        .frame(width: 98, height: 98)
                        .shadow(color: .black.opacity(0.08), radius: 8, x: 0, y: 4)
                    Circle().fill(Color.gray.opacity(0.18))
                        .frame(width: 90, height: 90)
                    Text(initials)
                        .font(.system(size: 34, weight: .bold))
                        .foregroundStyle(.primary)
                }
                Text(name)
                    .font(.system(size: 28, weight: .bold))
                    .foregroundStyle(.primary)
                if let email {
                    Text(email)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }
            .padding(.bottom, 12)
        }
        .padding(.bottom, 8)
    }

    // Segmented tab bar (SCHEDULE / PASSES / WALLET)
    private var tabBar: some View {
        HStack(spacing: 24) {
            tabItem(.schedule)
            tabItem(.passes)
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
        case .schedule:
            scheduleTab
        case .passes:
            passesTab
        case .wallet:
            walletTab
        }
    }

    // MARK: SCHEDULE tab

    private var scheduleTab: some View {
        VStack(spacing: 16) {
            // Next Event card (lesson or class)
            card {
                HStack(alignment: .center, spacing: 12) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Next Event")
                            .font(.title3.bold())
                            .foregroundStyle(Brand.primary)
                        if let nextEvent = nextUpcomingEvent() {
                            switch nextEvent {
                            case .lesson(let booking):
                                if let start = booking.startTime, let end = booking.endTime {
                                    HStack(spacing: 6) {
                                        Image(systemName: "person.fill").foregroundStyle(.secondary)
                                        Text("Lesson")
                                            .font(.subheadline.weight(.semibold))
                                            .foregroundStyle(.secondary)
                                    }
                                    Text("\(dateString(start)) • \(timeString(start))–\(timeString(end))")
                                        .foregroundStyle(.secondary)
                                    HStack(spacing: 6) {
                                        Image(systemName: "person.fill").foregroundStyle(.secondary)
                                        Text(trainerName(for: booking.trainerUID))
                                            .foregroundStyle(.secondary)
                                    }
                                    if let location = booking.location {
                                        HStack(spacing: 6) {
                                            Image(systemName: "mappin.and.ellipse").foregroundStyle(.secondary)
                                            Text(location)
                                                .foregroundStyle(.secondary)
                                        }
                                    }
                                }
                            case .classItem(let classItem):
                                HStack(spacing: 6) {
                                    Image(systemName: "calendar.badge.clock").foregroundStyle(Brand.secondary)
                                    Text("Class")
                                        .font(.subheadline.weight(.semibold))
                                        .foregroundStyle(Brand.secondary)
                                }
                                Text("\(dateString(classItem.startTime)) • \(timeString(classItem.startTime))–\(timeString(classItem.endTime))")
                                    .foregroundStyle(.secondary)
                                HStack(spacing: 6) {
                                    Image(systemName: "person.fill").foregroundStyle(.secondary)
                                    Text(trainerName(for: classItem.trainerId))
                                        .foregroundStyle(.secondary)
                                }
                                HStack(spacing: 6) {
                                    Image(systemName: "mappin.and.ellipse").foregroundStyle(.secondary)
                                    Text(classItem.location)
                                        .foregroundStyle(.secondary)
                                }
                            }
                        } else {
                            Text("Your next events will appear here.")
                                .foregroundStyle(.secondary)
                        }
                    }
                    Spacer()
                }
            }

            // Athlete Info card
            if let user = usersService.currentUser,
               let athleteFirst = user.athleteFirstName,
               let athleteLast = user.athleteLastName,
               !athleteFirst.isEmpty, !athleteLast.isEmpty {
                card {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Athletes")
                            .font(.title3.bold())
                            .foregroundStyle(Brand.primary)
                        
                        // Athlete 1
                        VStack(alignment: .leading, spacing: 6) {
                            HStack(spacing: 6) {
                                Image(systemName: "person.fill").foregroundStyle(.secondary)
                                Text("\(athleteFirst) \(athleteLast)")
                                    .font(.headline)
                            }
                            if let position = user.athletePosition, !position.isEmpty {
                                HStack(spacing: 6) {
                                    Image(systemName: "calendar").foregroundStyle(.secondary)
                                    Text(position)
                                        .foregroundStyle(.secondary)
                                }
                            }
                            if let birthday = user.athleteBirthday, !birthday.isEmpty {
                                HStack(spacing: 6) {
                                    Image(systemName: "calendar").foregroundStyle(.secondary)
                                    Text(birthday)
                                        .foregroundStyle(.secondary)
                                }
                            }
                        }
                        
                        // Athlete 2
                        if let athlete2First = user.athlete2FirstName,
                           let athlete2Last = user.athlete2LastName,
                           !athlete2First.isEmpty, !athlete2Last.isEmpty {
                            Divider()
                            VStack(alignment: .leading, spacing: 6) {
                                HStack(spacing: 6) {
                                    Image(systemName: "person.fill").foregroundStyle(.secondary)
                                    Text("\(athlete2First) \(athlete2Last)")
                                        .font(.headline)
                                }
                                if let position = user.athlete2Position, !position.isEmpty {
                                    HStack(spacing: 6) {
                                        Image(systemName: "tag").foregroundStyle(.secondary)
                                        Text(position)
                                            .foregroundStyle(.secondary)
                                    }
                                }
                                if let birthday = user.athlete2Birthday, !birthday.isEmpty {
                                    HStack(spacing: 6) {
                                        Image(systemName: "calendar").foregroundStyle(.secondary)
                                        Text(birthday)
                                            .foregroundStyle(.secondary)
                                    }
                                }
                            }
                        }
                        
                        // Athlete 3
                        if let athlete3First = user.athlete3FirstName,
                           let athlete3Last = user.athlete3LastName,
                           !athlete3First.isEmpty, !athlete3Last.isEmpty {
                            Divider()
                            VStack(alignment: .leading, spacing: 6) {
                                HStack(spacing: 6) {
                                    Image(systemName: "person.fill").foregroundStyle(.secondary)
                                    Text("\(athlete3First) \(athlete3Last)")
                                        .font(.headline)
                                }
                                if let position = user.athlete3Position, !position.isEmpty {
                                    HStack(spacing: 6) {
                                        Image(systemName: "tag").foregroundStyle(.secondary)
                                        Text(position)
                                            .foregroundStyle(.secondary)
                                    }
                                }
                                if let birthday = user.athlete3Birthday, !birthday.isEmpty {
                                    HStack(spacing: 6) {
                                        Image(systemName: "calendar").foregroundStyle(.secondary)
                                        Text(birthday)
                                            .foregroundStyle(.secondary)
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // View Your Schedule button
            NavigationLink {
                MyUpcomingLessonsView(bookingsService: bookingsService,
                                      trainersService: trainersService)
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "calendar.badge.clock")
                        .font(.system(size: 18, weight: .semibold))
                    Text("View Your Schedule")
                        .font(.headline)
                }
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .padding(.horizontal, 16)
                .background(Brand.primary)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            }

            // All upcoming events
            card {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Upcoming")
                        .font(.title3.bold())
                        .foregroundStyle(Brand.primary)
                    let upcoming = allUpcomingEvents()
                    if upcoming.isEmpty {
                        Text("No upcoming lessons or classes.")
                            .foregroundStyle(.secondary)
                    } else {
                        ForEach(upcoming.indices, id: \.self) { idx in
                            let event = upcoming[idx]
                            VStack(alignment: .leading, spacing: 4) {
                                switch event {
                                case .lesson(let booking):
                                    HStack(spacing: 6) {
                                        Image(systemName: "person.fill").foregroundStyle(.secondary)
                                        Text("Lesson • \(booking.status.capitalized)")
                                            .font(.headline)
                                    }
                                    if let s = booking.startTime, let e = booking.endTime {
                                        Text("\(dateString(s)) • \(timeString(s))–\(timeString(e))")
                                            .foregroundStyle(.secondary)
                                    }
                                    HStack(spacing: 6) {
                                        Image(systemName: "person.fill").foregroundStyle(.secondary)
                                        Text(trainerName(for: booking.trainerUID))
                                            .foregroundStyle(.secondary)
                                    }
                                    if let location = booking.location {
                                        HStack(spacing: 6) {
                                            Image(systemName: "mappin.and.ellipse").foregroundStyle(.secondary)
                                            Text(location)
                                                .foregroundStyle(.secondary)
                                        }
                                    }
                                case .classItem(let classItem):
                                    HStack(spacing: 6) {
                                        Image(systemName: "calendar.badge.clock").foregroundStyle(Brand.secondary)
                                        Text("Class • \(classItem.title)")
                                            .font(.headline)
                                    }
                                    Text("\(dateString(classItem.startTime)) • \(timeString(classItem.startTime))–\(timeString(classItem.endTime))")
                                        .foregroundStyle(.secondary)
                                    HStack(spacing: 6) {
                                        Image(systemName: "person.fill").foregroundStyle(.secondary)
                                        Text(trainerName(for: classItem.trainerId))
                                            .foregroundStyle(.secondary)
                                    }
                                    HStack(spacing: 6) {
                                        Image(systemName: "mappin.and.ellipse").foregroundStyle(.secondary)
                                        Text(classItem.location)
                                            .foregroundStyle(.secondary)
                                    }
                                }
                            }
                            .padding(.vertical, 6)
                            if idx < upcoming.count - 1 {
                                Divider().opacity(0.2)
                            }
                        }
                    }
                }
            }
        }
        .padding(.horizontal, 16)
    }

    // MARK: PASSES tab (dynamically generated from pricing structure)

    private var passesTab: some View {
        VStack(spacing: 12) {
            if packagesService.isLoading || pricingService.isLoading {
                ProgressView().padding()
            } else {
                // Dynamically display all package types from pricing structure
                let packageTypes = pricingService.allPackageOptions
                if packageTypes.isEmpty {
                    Text("No pass types configured")
                        .foregroundStyle(.secondary)
                        .padding()
                } else {
                    ForEach(packageTypes) { packageOption in
                        let count = remainingPasses(forType: packageOption.packageType)
                        passTypeCard(
                            title: packageOption.title,
                            description: packageOption.description,
                            count: count,
                            icon: iconForPackageType(packageOption.packageType)
                        )
                    }
                }

                // Bottom buttons: Refresh and Buy
                HStack(spacing: 12) {
                    // Refresh button
                    Button {
                        Task {
                            await packagesService.loadMyPackages()
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
                .padding(.top, 8)
            }
        }
        .padding(.horizontal, 16)
    }
    
    // Helper to get remaining passes for a specific packageType
    private func remainingPasses(forType packageType: String) -> Int {
        packagesService.packages.reduce(into: 0) { sum, pkg in
            guard pkg.expirationDate >= Date() else { return }
            guard pkg.packageType == packageType else { return }
            sum += max(0, pkg.lessonsRemaining)
        }
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
            return "calendar.badge.clock"
        default:
            return "ticket.fill"
        }
    }
    
    private func passTypeCard(title: String, description: String, count: Int, icon: String) -> some View {
        return card {
            HStack(spacing: 16) {
                ZStack {
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(Brand.primary.opacity(0.15))
                    Image(systemName: icon)
                        .font(.system(size: 22, weight: .semibold))
                        .foregroundStyle(Brand.primary)
                }
                .frame(width: 56, height: 56)
                
                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.headline)
                        .foregroundStyle(.primary)
                    if !description.isEmpty {
                        Text(description)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .lineLimit(2)
                    }
                }
                
                Spacer()
                
                Text("\(count)")
                    .font(.system(size: 32, weight: .bold))
                    .foregroundStyle(Brand.primary)
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
    
    private func addCardToWallet() async {
        guard let userId = Auth.auth().currentUser?.uid,
              let orgId = auth.currentOrgId else {
            print("❌ Missing userId or orgId")
            return
        }
        
        print("🔄 Creating setup intent for userId: \(userId), orgId: \(orgId)")
        
        do {
            // Create setup intent
            let functions = Functions.functions()
            let callable = functions.httpsCallable("createSetupIntentDirect")
            
            print("🔧 Calling createSetupIntentDirect...")
            let result = try await callable.call(["orgId": orgId, "userId": userId])
            print("✅ Function call succeeded")
            
            guard let data = result.data as? [String: Any] else {
                print("❌ Invalid response data type")
                return
            }
            
            print("📋 Response data: \(data)")
            
            guard let clientSecret = data["clientSecret"] as? String,
                  let publishableKey = data["publishableKey"] as? String else {
                print("❌ Missing clientSecret or publishableKey in response")
                return
            }
            
            print("✅ Got clientSecret and publishableKey")
            
            // Configure Stripe with org's key
            STPAPIClient.shared.publishableKey = publishableKey
            
            // Create and configure payment sheet for card setup
            var configuration = PaymentSheet.Configuration()
            configuration.merchantDisplayName = "Skedence"
            configuration.allowsDelayedPaymentMethods = false
            
            let paymentSheet = PaymentSheet(setupIntentClientSecret: clientSecret, configuration: configuration)
            
            // Present the payment sheet
            guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                  let rootViewController = windowScene.windows.first?.rootViewController else {
                print("❌ Could not find root view controller")
                return
            }
            
            print("📱 Presenting payment sheet...")
            paymentSheet.present(from: rootViewController) { result in
                Task { @MainActor in
                    switch result {
                    case .completed:
                        print("✅ Card added successfully")
                        // Card was successfully added - reload payment methods
                        await self.customerService.loadPaymentMethods(orgId: orgId)
                    case .canceled:
                        print("⚠️ Setup canceled by user")
                    case .failed(let error):
                        print("❌ Setup failed: \(error.localizedDescription)")
                    }
                }
            }
        } catch {
            print("❌ Error creating setup intent: \(error)")
            if let nsError = error as NSError? {
                print("   Error domain: \(nsError.domain)")
                print("   Error code: \(nsError.code)")
                print("   Error userInfo: \(nsError.userInfo)")
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
    
    private func nextUpcomingEvent() -> UpcomingEvent? {
        allUpcomingEvents().first
    }
    
    private func allUpcomingEvents() -> [UpcomingEvent] {
        let now = Date()
        var events: [UpcomingEvent] = []
        
        // Add upcoming lessons
        let upcomingLessons = bookingsService.myBookings
            .filter { ($0.startTime ?? now) >= now }
            .map { UpcomingEvent.lesson($0) }
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
        
        sendPasswordReset(["email": email.trimmingCharacters(in: .whitespacesAndNewlines)]) { result, error in
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
    
    @State private var organizationCode = ""
    @State private var validatedOrgId: String?
    @State private var validatedOrgName: String?
    @State private var isValidatingCode = false
    
    @State private var email = ""
    @State private var password = ""
    @State private var confirm = ""
    @State private var firstName = ""
    @State private var lastName = ""
    @State private var athleteFirstName = ""
    @State private var athleteLastName = ""
    @State private var athleteBirthday = ""
    @State private var athlete2FirstName = ""
    @State private var athlete2LastName = ""
    @State private var athlete2Birthday = ""
    @State private var athlete3FirstName = ""
    @State private var athlete3LastName = ""
    @State private var athlete3Birthday = ""
    @State private var athletePosition = ""
    @State private var athlete2Position = ""
    @State private var athlete3Position = ""
    @State private var notesForCoach = ""
    @State private var phoneNumber = ""
    
    private var passwordsMatch: Bool {
        password == confirm && !password.isEmpty
    }
    
    private var canSubmit: Bool {
        !email.isEmpty &&
        !password.isEmpty &&
        passwordsMatch &&
        !firstName.isEmpty &&
        !lastName.isEmpty &&
        !athleteFirstName.isEmpty &&
        !athleteLastName.isEmpty &&
        !athleteBirthday.isEmpty &&
        isValidBirthday(athleteBirthday) &&
        !athletePosition.isEmpty &&
        !phoneNumber.isEmpty &&
        validatedOrgId != nil &&
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
                
                // Organization Code Section
                VStack(alignment: .leading, spacing: 16) {
                    SectionHeader(icon: "building.2.fill", title: "Organization Code")
                    
                    VStack(spacing: 12) {
                        HStack(spacing: 12) {
                            FormField(
                                icon: "ticket.fill",
                                placeholder: "Enter 6-digit code",
                                text: $organizationCode,
                                autocapitalization: .characters,
                                disableAutocorrection: true
                            )
                            .onChangeCompat(of: organizationCode) { newValue in
                                // Auto-validate when 6 characters entered
                                if newValue.count == 6 {
                                    Task {
                                        await validateOrganizationCode(newValue)
                                    }
                                } else {
                                    validatedOrgId = nil
                                    validatedOrgName = nil
                                }
                            }
                            
                            if isValidatingCode {
                                ProgressView()
                                    .frame(width: 44, height: 44)
                            } else if validatedOrgId != nil {
                                Image(systemName: "checkmark.circle.fill")
                                    .font(.title2)
                                    .foregroundStyle(.green)
                                    .frame(width: 44, height: 44)
                            }
                        }
                        
                        if let orgName = validatedOrgName {
                            HStack {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundStyle(.green)
                                Text("Connected to \(orgName)")
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                                Spacer()
                            }
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(Color.green.opacity(0.1))
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                        } else if !organizationCode.isEmpty && organizationCode.count == 6 && !isValidatingCode {
                            HStack {
                                Image(systemName: "exclamationmark.triangle.fill")
                                    .foregroundStyle(.orange)
                                Text("Invalid organization code")
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                                Spacer()
                            }
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(Color.orange.opacity(0.1))
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                        }
                    }
                    
                    Text("Ask your coach or administrator for your organization code")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .padding(.horizontal, 4)
                }
                .padding(.horizontal)
                
                // Account Credentials Section
                VStack(alignment: .leading, spacing: 16) {
                    SectionHeader(icon: "lock.shield.fill", title: "Account Credentials")
                    
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
                    SectionHeader(icon: "person.fill", title: "Parent/Guardian Information")
                    
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
                    SectionHeader(icon: "person.fill", title: "Primary Athlete")
                    
                    HStack(spacing: 12) {
                        FormField(
                            icon: "calendar.badge.clock",
                            placeholder: "First Name",
                            text: $athleteFirstName,
                            textContentType: .givenName
                        )
                        
                        FormField(
                            icon: "calendar.badge.clock",
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
                    .onChangeCompat(of: athleteBirthday) { newValue in
                        athleteBirthday = formatBirthdayInput(newValue)
                    }
                    
                    FormField(
                        icon: "star.fill",
                        placeholder: "Position (e.g., Setter, Outside Hitter)",
                        text: $athletePosition
                    )
                }
                .padding(.horizontal)
                
                // Additional Athletes Section
                VStack(alignment: .leading, spacing: 16) {
                    SectionHeader(
                        icon: "person.2.fill",
                        title: "Additional Athletes",
                        subtitle: "Optional"
                    )
                    
                    // Athlete 2
                    VStack(spacing: 12) {
                        HStack(spacing: 12) {
                            FormField(
                                icon: "tag",
                                placeholder: "Athlete 2 First Name",
                                text: $athlete2FirstName,
                                textContentType: .givenName
                            )
                            
                            FormField(
                                icon: "tag",
                                placeholder: "Last Name",
                                text: $athlete2LastName,
                                textContentType: .familyName
                            )
                        }
                        
                        if !athlete2FirstName.isEmpty || !athlete2LastName.isEmpty {
                            FormField(
                                icon: "calendar",
                                placeholder: "Birthday (MM/DD/YYYY)",
                                text: $athlete2Birthday,
                                keyboardType: .numberPad
                            )
                            .onChangeCompat(of: athlete2Birthday) { newValue in
                                athlete2Birthday = formatBirthdayInput(newValue)
                            }
                            
                            FormField(
                                icon: "star",
                                placeholder: "Position",
                                text: $athlete2Position
                            )
                        }
                    }
                    
                    // Athlete 3
                    VStack(spacing: 12) {
                        HStack(spacing: 12) {
                            FormField(
                                icon: "tag",
                                placeholder: "Athlete 3 First Name",
                                text: $athlete3FirstName,
                                textContentType: .givenName
                            )
                            
                            FormField(
                                icon: "tag",
                                placeholder: "Last Name",
                                text: $athlete3LastName,
                                textContentType: .familyName
                            )
                        }
                        
                        if !athlete3FirstName.isEmpty || !athlete3LastName.isEmpty {
                            FormField(
                                icon: "calendar",
                                placeholder: "Birthday (MM/DD/YYYY)",
                                text: $athlete3Birthday,
                                keyboardType: .numberPad
                            )
                            .onChangeCompat(of: athlete3Birthday) { newValue in
                                athlete3Birthday = formatBirthdayInput(newValue)
                            }
                            
                            FormField(
                                icon: "star",
                                placeholder: "Position",
                                text: $athlete3Position
                            )
                        }
                    }
                }
                .padding(.horizontal)
                
                // Notes Section
                VStack(alignment: .leading, spacing: 16) {
                    SectionHeader(
                        icon: "note.text",
                        title: "Notes for Coach",
                        subtitle: "Optional"
                    )
                    
                    TextEditor(text: $notesForCoach)
                        .frame(height: 100)
                        .padding(12)
                        .background(Color(UIColor.systemGray6))
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                        .overlay(
                            Group {
                                if notesForCoach.isEmpty {
                                    Text("Share any goals, experience level, or special considerations...")
                                        .foregroundStyle(.secondary)
                                        .padding(.horizontal, 16)
                                        .padding(.vertical, 20)
                                        .allowsHitTesting(false)
                                }
                            },
                            alignment: .topLeading
                        )
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
        .onAppear {
            // Pre-fill organization code from deep link
            if let deepLinkCode = deepLinkManager.organizationCode {
                organizationCode = deepLinkCode
                Task {
                    await validateOrganizationCode(deepLinkCode)
                }
                // Clear the deep link after using it
                deepLinkManager.organizationCode = nil
                deepLinkManager.shouldNavigateToRegister = false
            }
        }
    }
    
    // MARK: - Helper Functions
    
    private func validateOrganizationCode(_ code: String) async {
        guard code.count == 6 else { return }
        
        isValidatingCode = true
        defer { isValidatingCode = false }
        
        do {
            let db = Firestore.firestore()
            let snapshot = try await db.collection("organizations")
                .whereField("inviteCode", isEqualTo: code.uppercased())
                .limit(to: 1)
                .getDocuments()
            
            if let doc = snapshot.documents.first {
                validatedOrgId = doc.documentID
                validatedOrgName = doc.data()["name"] as? String ?? "Unknown Organization"
                print("✅ Valid organization code: \(code) -> \(validatedOrgName ?? "")")
            } else {
                validatedOrgId = nil
                validatedOrgName = nil
                print("❌ Invalid organization code: \(code)")
            }
        } catch {
            print("❌ Error validating organization code: \(error.localizedDescription)")
            validatedOrgId = nil
            validatedOrgName = nil
        }
    }
    
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
        let success = await auth.register(
            email: email.trimmingCharacters(in: .whitespacesAndNewlines),
            password: password,
            firstName: firstName.isEmpty ? nil : firstName,
            lastName: lastName.isEmpty ? nil : lastName,
            athleteFirstName: athleteFirstName.isEmpty ? nil : athleteFirstName,
            athleteLastName: athleteLastName.isEmpty ? nil : athleteLastName,
            athleteBirthday: athleteBirthday.isEmpty ? nil : athleteBirthday,
            athlete2FirstName: athlete2FirstName.isEmpty ? nil : athlete2FirstName,
            athlete2LastName: athlete2LastName.isEmpty ? nil : athlete2LastName,
            athlete2Birthday: athlete2Birthday.isEmpty ? nil : athlete2Birthday,
            athlete3FirstName: athlete3FirstName.isEmpty ? nil : athlete3FirstName,
            athlete3LastName: athlete3LastName.isEmpty ? nil : athlete3LastName,
            athlete3Birthday: athlete3Birthday.isEmpty ? nil : athlete3Birthday,
            athletePosition: athletePosition.isEmpty ? nil : athletePosition,
            athlete2Position: athlete2Position.isEmpty ? nil : athlete2Position,
            athlete3Position: athlete3Position.isEmpty ? nil : athlete3Position,
            notesForCoach: notesForCoach.isEmpty ? nil : notesForCoach,
            phoneNumber: phoneNumber.isEmpty ? nil : phoneNumber,
            orgId: validatedOrgId
        )
        
        if success {
            print("✅ Registration completed successfully")
        } else {
            print("❌ Registration failed")
        }
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

private struct SectionHeader: View {
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

// MARK: - Compatibility helper to silence iOS 17 onChange deprecation while supporting earlier OS versions

private extension View {
    @ViewBuilder
    func onChangeCompat<V: Equatable>(of value: V, perform action: @escaping (V) -> Void) -> some View {
        if #available(iOS 17.0, macOS 14.0, tvOS 17.0, watchOS 10.0, visionOS 1.0, *) {
            self.onChange(of: value) { _, newValue in
                action(newValue)
            }
        } else {
            // Call into a helper that is marked deprecated on newer OSes so the deprecated API isn't seen by the iOS 17 compiler as unavailable.
            onChangeCompatPre17(of: value, perform: action)
        }
    }

    // This helper is compiled for older OSes and marked deprecated on iOS 17/macOS 14/etc.,
    // which prevents unavailability errors when building with newer SDKs.
    @available(iOS, introduced: 13.0, deprecated: 17.0)
    @available(macOS, introduced: 11.0, deprecated: 14.0)
    @available(tvOS, introduced: 13.0, deprecated: 17.0)
    @available(watchOS, introduced: 6.0, deprecated: 10.0)
    // visionOS launched with the new two-parameter API; never use the old one there.
    @available(visionOS, unavailable)
    @ViewBuilder
    private func onChangeCompatPre17<V: Equatable>(of value: V, perform action: @escaping (V) -> Void) -> some View {
        self.onChange(of: value, perform: action)
    }
}
