//
//  ClientCardView.swift
//  SkedenceAdmin
//
//  Created by GitHub Copilot
//

import SwiftUI
import Combine

#if canImport(FirebaseAuth)
import FirebaseAuth
#endif

#if canImport(FirebaseFirestore)
import FirebaseFirestore
#endif

struct AggregatedPackage: Identifiable {
    let id = UUID()
    let packageType: String
    let totalRemaining: Int
    let totalLessons: Int
    let totalUsed: Int
    let hasExpired: Bool
    
    var packageDisplayName: String {
        switch packageType {
        case "single": return "Single Lesson"
        case "private": return "Private Lesson"
        case "two_athlete", "2_athlete": return "2 Athletes"
        case "three_athlete", "3_athlete": return "3 Athletes"
        case "class_pass": return "Class Pass"
        default: return packageType.replacingOccurrences(of: "_", with: " ").capitalized
        }
    }
    
    var statusText: String {
        if totalRemaining == 0 {
            return "All used"
        } else if hasExpired {
            return "\(totalRemaining) remaining (some expired)"
        } else {
            return "\(totalRemaining) of \(totalLessons) remaining"
        }
    }
}

enum ClientCardTab: String, CaseIterable, Identifiable {
    case profile = "Profile"
    case account = "Account"
    case schedule = "Schedule"
    case documents = "Documents"
    
    var id: String { rawValue }
    
    var icon: String {
        switch self {
        case .profile: return "person.fill"
        case .account: return "creditcard.fill"
        case .schedule: return "calendar"
        case .documents: return "doc.fill"
        }
    }
}

struct BubbleTab: View {
    let title: String
    let icon: String
    let isSelected: Bool
    
    var body: some View {
        VStack(spacing: Spacing.xxs) {
            Image(systemName: icon)
                .font(.system(size: 18))
                .foregroundStyle(isSelected ? .white : AppTheme.textSecondary)
            
            Text(title)
                .font(.labelSmall)
                .fontWeight(isSelected ? .semibold : .regular)
                .foregroundStyle(isSelected ? .white : AppTheme.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Spacing.sm)
        .background(
            isSelected ? AppTheme.primary : Color.clear
        )
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(isSelected ? Color.clear : AppTheme.border, lineWidth: 1)
        )
    }
}

struct ClientCardView: View {
    let client: Client
    let selectedBooking: ClientBooking? // If opened from a booked lesson
    
    @StateObject private var viewModel = ClientCardViewModel()
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var dependencies: AdminAppDependencies
    private var auth: AuthManager { dependencies.auth }
    @State private var selectedTab: ClientCardTab = .profile
    @State private var bookingToCancel: String?
    @State private var showCancelConfirmation = false
    @State private var isCancelling = false
    @State private var cancelError: String?
    @State private var bookingToReschedule: ClientBooking? = nil
    
    private var availableTabs: [ClientCardTab] {
        if viewModel.isAdmin {
            return ClientCardTab.allCases
        } else {
            // Trainers can't see account tab
            return ClientCardTab.allCases.filter { $0 != .account }
        }
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                ScrollView {
                    VStack(spacing: Spacing.lg) {
                        // Client Header with Avatar and Contact
                        ClientInfoSection(client: client)
                        
                        // Bubble Tab Selector
                        bubbleTabs
                            .padding(.horizontal, Spacing.lg)
                        
                        // Tab Content
                        tabContent
                    }
                    .padding(.bottom, Spacing.xxxl)
                }
                .background(Color(UIColor.systemGroupedBackground))
            }
            .background(Color(UIColor.systemGroupedBackground).ignoresSafeArea())
            .navigationTitle(client.firstName)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
        .navigationViewStyle(.stack)
        .task {
            await viewModel.loadClientData(
                clientId: client.id,
                selectedBooking: selectedBooking,
                orgId: auth.currentOrgId,
                userEmail: auth.userEmail
            )
        }
        .alert("Cancel Lesson", isPresented: $showCancelConfirmation, presenting: bookingToCancel) { bookingId in
            Button("Cancel Lesson", role: .destructive) {
                Task {
                    await cancelLesson(bookingId: bookingId)
                }
            }
            Button("Keep Lesson", role: .cancel) {}
        } message: { _ in
            Text("This will restore the client's lesson credit and reopen the time slot.")
        }
        .alert("Error", isPresented: .constant(cancelError != nil), presenting: cancelError) { _ in
            Button("OK") {
                cancelError = nil
            }
        } message: { error in
            Text(error)
        }
        .sheet(item: $bookingToReschedule) { booking in
            if let orgId = auth.currentOrgId {
                RescheduleBookingSheet(
                    booking: booking,
                    orgId: orgId,
                    onSuccess: {
                        Task {
                            await viewModel.loadClientData(
                                clientId: client.id,
                                selectedBooking: nil,
                                orgId: auth.currentOrgId,
                                userEmail: auth.userEmail
                            )
                        }
                    }
                )
            }
        }
        .overlay {
            if isCancelling {
                ZStack {
                    Color.black.opacity(0.3)
                        .ignoresSafeArea()
                    
                    ProgressView("Cancelling...")
                        .padding()
                        .background(Color(UIColor.systemBackground))
                        .cornerRadius(10)
                }
            }
        }
    }
    
    // MARK: - Bubble Tabs
    private var bubbleTabs: some View {
        HStack(spacing: Spacing.xs) {
            ForEach(availableTabs) { tab in
                BubbleTab(
                    title: tab.rawValue,
                    icon: tab.icon,
                    isSelected: selectedTab == tab
                )
                .onTapGesture {
                    withAnimation(.spring(response: 0.3)) {
                        selectedTab = tab
                    }
                }
            }
        }
    }
    
    @ViewBuilder
    private var tabContent: some View {
        switch selectedTab {
        case .profile:
            profileContent
        case .account:
            if viewModel.isAdmin {
                accountContent
            } else {
                // Trainers shouldn't see account tab - show profile instead
                profileContent
            }
        case .schedule:
            scheduleContent
        case .documents:
            documentsContent
        }
    }
    
    private var profileContent: some View {
        VStack(spacing: Spacing.md) {
            NextLessonSection(
                lesson: viewModel.displayedLesson,
                isSelectedBooking: selectedBooking != nil
            )
            
            // Profile details from Firestore
            if let profile = viewModel.userProfile {
                ClientProfileDetailsSection(profile: profile)
            } else if viewModel.isLoadingProfile {
                CardView {
                    HStack {
                        Spacer()
                        ProgressView()
                            .tint(AppTheme.primary)
                        Spacer()
                    }
                    .padding()
                }
            }
            
            // Athletes with enhanced details
            if let profile = viewModel.userProfile {
                EnhancedAthletesSection(profile: profile, fieldLabels: viewModel.fieldLabels)
            } else {
                AthletesSection(client: client)
            }
            
            NotesSection(notes: client.notesForCoach)
        }
        .padding(.horizontal, Spacing.lg)
    }
    
    private var accountContent: some View {
        VStack(spacing: Spacing.md) {
            if viewModel.isAdmin {
                WalletSection(
                    paymentMethods: viewModel.paymentMethods,
                    isLoading: viewModel.isLoadingPaymentMethod
                )
            }
            PackagesSection(
                packages: viewModel.aggregatedPackages,
                isLoading: viewModel.isLoadingPackages
            )
        }
        .padding(.horizontal, Spacing.lg)
    }
    
    private var scheduleContent: some View {
        ScheduleSection(
            upcomingLessons: viewModel.upcomingLessons,
            pastLessons: viewModel.pastLessons,
            upcomingClasses: viewModel.upcomingClasses,
            pastClasses: viewModel.pastClasses,
            isLoading: viewModel.isLoadingBookings,
            isAdmin: auth.isAdmin,
            onCancelBooking: { bookingId in
                bookingToCancel = bookingId
                showCancelConfirmation = true
            },
            onRescheduleBooking: { booking in
                bookingToReschedule = booking
            }
        )
        .padding(.horizontal, Spacing.lg)
    }
    
    private var documentsContent: some View {
        DocumentsSection(
            documents: viewModel.documents,
            isLoading: viewModel.isLoadingDocuments
        )
        .padding(.horizontal, Spacing.lg)
    }
    
    // MARK: - Cancel Lesson Action
    
    private func cancelLesson(bookingId: String) async {
        guard let orgId = auth.currentOrgId else {
            cancelError = "Organization ID not found"
            return
        }
        
        isCancelling = true
        cancelError = nil
        
        do {
            try await FunctionsService.shared.adminCancelLesson(
                bookingId: bookingId,
                orgId: orgId,
                clientId: client.id
            )
            
            // Activity logging handled by cancelLesson cloud function
            
            // Reload the client data after successful cancellation
            await viewModel.loadClientData(
                clientId: client.id,
                selectedBooking: nil,
                orgId: orgId
            )
            
        } catch {
            if let functionsError = error as? FunctionsServiceError {
                switch functionsError {
                case .server(_, let message):
                    cancelError = message
                default:
                    cancelError = "Failed to cancel lesson: \(error.localizedDescription)"
                }
            } else {
                cancelError = "Failed to cancel lesson: \(error.localizedDescription)"
            }
        }
        
        isCancelling = false
        bookingToCancel = nil
    }
}

// MARK: - View Model
@MainActor
class ClientCardViewModel: ObservableObject {
    @Published var packages: [LessonPackage] = []
    @Published var aggregatedPackages: [AggregatedPackage] = []
    @Published var upcomingBookings: [ClientBooking] = []
    @Published var pastBookings: [ClientBooking] = []
    @Published var documents: [ClientDocument] = []
    @Published var displayedLesson: ClientBooking?
    @Published var paymentMethodInfo: String? = nil
    @Published var paymentMethods: [PaymentMethodInfo] = []
    @Published var isAdmin = false
    @Published var userProfile: UserProfile?
    
    @Published var fieldLabels = IntakeFieldLabels()
    @Published var isLoadingPackages = false
    @Published var isLoadingBookings = false
    @Published var isLoadingDocuments = false
    @Published var isLoadingPaymentMethod = false
    @Published var isLoadingProfile = false
    
    // Computed properties to separate lessons from classes
    var upcomingLessons: [ClientBooking] {
        upcomingBookings.filter { $0.isClassBooking != true }
    }
    
    var upcomingClasses: [ClientBooking] {
        upcomingBookings.filter { $0.isClassBooking == true }
    }
    
    var pastLessons: [ClientBooking] {
        pastBookings.filter { $0.isClassBooking != true }
    }
    
    var pastClasses: [ClientBooking] {
        pastBookings.filter { $0.isClassBooking == true }
    }
    
    func loadClientData(clientId: String, selectedBooking: ClientBooking?, orgId: String?, userEmail: String? = nil) async {
        // Check admin status
        #if canImport(FirebaseFirestore)
        await checkAdminStatus(userEmail: userEmail, orgId: orgId)
        #endif
        
        // Load data in parallel (packages, documents, profile always; bookings only if orgId available)
        async let packagesTask: () = loadPackages(clientId: clientId)
        async let documentsTask: () = loadDocuments(clientId: clientId)
        async let profileTask: () = loadUserProfile(clientId: clientId, orgId: orgId)
        async let bookingsTask: () = {
            if let orgId = orgId {
                await loadBookings(clientId: clientId, orgId: orgId)
            } else {
                await MainActor.run {
                    self.upcomingBookings = []
                    self.pastBookings = []
                }
            }
        }()
        
        await packagesTask
        await bookingsTask
        await documentsTask
        await profileTask
        
        // Load payment methods if admin
        if isAdmin, let orgId = orgId {
            await loadPaymentMethods(clientId: clientId, orgId: orgId)
        }
        
        // Set displayed lesson - match with fetched booking to get packageType
        if let selectedBooking = selectedBooking {
            // Try to find the matching booking by startTime and trainerId (slot ID != booking ID)
            if let matchingBooking = upcomingBookings.first(where: { 
                $0.startTime == selectedBooking.startTime && $0.trainerId == selectedBooking.trainerId 
            }) {
                displayedLesson = matchingBooking
            } else if let matchingBooking = pastBookings.first(where: { 
                $0.startTime == selectedBooking.startTime && $0.trainerId == selectedBooking.trainerId 
            }) {
                displayedLesson = matchingBooking
            } else {
                // Fallback to selected booking if no match found
                displayedLesson = selectedBooking
            }
        } else {
            displayedLesson = upcomingBookings.first
        }
    }
    
    private func loadPackages(clientId: String) async {
        isLoadingPackages = true
        defer { isLoadingPackages = false }
        
        do {
            packages = try await FirestoreService.shared.fetchClientPackages(clientId: clientId)
            aggregatePackages()
        } catch {
        }
    }
    
    private func aggregatePackages() {
        // Group packages by type
        let grouped = Dictionary(grouping: packages) { $0.packageType }
        
        // Create aggregated packages
        aggregatedPackages = grouped.map { (packageType, packagesOfType) in
            let totalRemaining = packagesOfType.reduce(0) { $0 + $1.lessonsRemaining }
            let hasExpired = packagesOfType.contains { $0.isExpired && $0.lessonsRemaining > 0 }
            let totalLessons = packagesOfType.reduce(0) { $0 + $1.totalLessons }
            let totalUsed = packagesOfType.reduce(0) { $0 + $1.lessonsUsed }
            
            return AggregatedPackage(
                packageType: packageType,
                totalRemaining: totalRemaining,
                totalLessons: totalLessons,
                totalUsed: totalUsed,
                hasExpired: hasExpired
            )
        }
        .sorted { $0.packageDisplayName < $1.packageDisplayName }
    }
    
    private func loadBookings(clientId: String, orgId: String) async {
        isLoadingBookings = true
        defer { isLoadingBookings = false }
        
        do {
            async let upcomingTask = FirestoreService.shared.fetchClientBookings(clientId: clientId, upcoming: true, orgId: orgId)
            async let pastTask = FirestoreService.shared.fetchClientBookings(clientId: clientId, upcoming: false, orgId: orgId)
            
            upcomingBookings = try await upcomingTask
            pastBookings = try await pastTask
        } catch {
        }
    }
    
    private func loadDocuments(clientId: String) async {
        isLoadingDocuments = true
        defer { isLoadingDocuments = false }
        
        do {
            documents = try await FirestoreService.shared.fetchClientDocuments(clientId: clientId)
        } catch {
        }
    }
    
    private func checkAdminStatus(userEmail: String?, orgId: String?) async {
        #if canImport(FirebaseAuth) && canImport(FirebaseFirestore)
        guard let authUserId = Auth.auth().currentUser?.uid else {
            print("❌ ClientCardView: No auth user")
            isAdmin = false
            return
        }
        
        guard let email = userEmail ?? Auth.auth().currentUser?.email else {
            print("❌ ClientCardView: No email available for admin check")
            isAdmin = false
            return
        }
        
        do {
            let db = Firestore.firestore()
            
            // FIRST: Check orgMembers role (primary method - matches AuthManager)
            if let orgId = orgId {
                let orgMemberQuery = try await db.collection("orgMembers")
                    .whereField("authUserId", isEqualTo: authUserId)
                    .whereField("orgId", isEqualTo: orgId)
                    .whereField("isActive", isEqualTo: true)
                    .limit(to: 1)
                    .getDocuments()
                
                if let memberDoc = orgMemberQuery.documents.first {
                    let role = memberDoc.data()["role"] as? String
                    
                    // Admin role has full access. Owner role kept for backward compatibility.
                    isAdmin = (role == "admin" || role == "owner")
                    return
                }
            }
            
            // FALLBACK: Check trainer document's admin field
            var query = db.collection("trainers").whereField("email", isEqualTo: email)
            
            if let orgId = orgId {
                query = query.whereField("orgId", isEqualTo: orgId)
            }
            
            let snapshot = try await query.limit(to: 1).getDocuments()
            
            if let trainerDoc = snapshot.documents.first {
                let data = trainerDoc.data()
                
                // Check both 'admin' and 'isAdmin' fields for compatibility
                let adminValue = data["admin"] as? Bool ?? data["isAdmin"] as? Bool ?? false
                isAdmin = adminValue
            } else {
                print("⚠️ ClientCardView: No trainer document found for email: \(email)")
                isAdmin = false
            }
        } catch {
            print("❌ ClientCardView: Error checking admin status: \(error)")
            isAdmin = false
        }
        #else
        isAdmin = false
        #endif
    }
    
    private func loadPaymentMethods(clientId: String, orgId: String) async {
        isLoadingPaymentMethod = true
        defer { isLoadingPaymentMethod = false }
        
        // Instantiate the service (no shared singleton)
        let service = StripeCustomerService()
        await service.loadPaymentMethodsForUser(userId: clientId, orgId: orgId)
        // Copy results into our view model
        self.paymentMethods = service.paymentMethods
        self.paymentMethodInfo = self.paymentMethods.first?.last4
    }
    
    private func loadUserProfile(clientId: String, orgId: String? = nil) async {
        isLoadingProfile = true
        defer { isLoadingProfile = false }
        
        #if canImport(FirebaseFirestore)
        do {
            if let orgId = orgId {
                let orgDoc = try await Firestore.firestore().collection("organizations").document(orgId).getDocument()
                if let orgData = orgDoc.data() {
                    let fields = orgData["intakeFormFieldsPrivate"] as? [[String: Any]] ?? []
                    let getLabel: (String, String) -> String = { id, def in
                        fields.first(where: { $0["id"] as? String == id })?["label"] as? String ?? def
                    }
                    let posField = fields.first(where: { ($0["label"] as? String)?.lowercased().contains("position") == true })
                    self.fieldLabels = IntakeFieldLabels(
                        birthday: getLabel("athleteBirthday", "Birthday"),
                        schoolClubTeam: getLabel("schoolTeam", "School / Club Team"),
                        experienceLevel: getLabel("experienceLevel", "Level"),
                        position: posField?["label"] as? String ?? "Position"
                    )
                }
            }
            
            let doc = try await Firestore.firestore().collection("users").document(clientId).getDocument()
            guard let data = doc.data() else { return }
            
            // Decode athletes array
            var athletes: [AthleteInfo] = []
            if let athletesData = data["athletes"] as? [[String: Any]] {
                athletes = athletesData.compactMap { try? AthleteInfo(from: $0) }
            }
            
            userProfile = UserProfile(
                id: clientId,
                referenceCode: data["referenceCode"] as? String,
                emailAddress: data["emailAddress"] as? String ?? data["email"] as? String ?? "",
                firstName: data["firstName"] as? String ?? "",
                lastName: data["lastName"] as? String ?? "",
                phoneNumber: data["phoneNumber"] as? String ?? "",
                photoURL: data["photoURL"] as? String,
                active: data["active"] as? Bool,
                createdAt: (data["createdAt"] as? Timestamp)?.dateValue(),
                updatedAt: (data["updatedAt"] as? Timestamp)?.dateValue(),
                emergencyContactName: data["emergencyContactName"] as? String ?? "",
                emergencyContactNumber: data["emergencyContactNumber"] as? String ?? "",
                referredBy: data["referredBy"] as? String,
                notesForCoach: data["notesForCoach"] as? String,
                athletes: athletes,
                athleteFirstName: data["athleteFirstName"] as? String,
                athleteLastName: data["athleteLastName"] as? String,
                athleteBirthday: data["athleteBirthday"] as? String,
                athleteSchoolClubTeam: data["athleteSchoolClubTeam"] as? String,
                athleteExperienceLevel: data["athleteExperienceLevel"] as? String,
                athletePosition: data["athletePosition"] as? String,
                athlete2FirstName: data["athlete2FirstName"] as? String,
                athlete2LastName: data["athlete2LastName"] as? String,
                athlete2Birthday: data["athlete2Birthday"] as? String,
                athlete2SchoolClubTeam: data["athlete2SchoolClubTeam"] as? String,
                athlete2ExperienceLevel: data["athlete2ExperienceLevel"] as? String,
                athlete2Position: data["athlete2Position"] as? String,
                athlete3FirstName: data["athlete3FirstName"] as? String,
                athlete3LastName: data["athlete3LastName"] as? String,
                athlete3Birthday: data["athlete3Birthday"] as? String,
                athlete3SchoolClubTeam: data["athlete3SchoolClubTeam"] as? String,
                athlete3ExperienceLevel: data["athlete3ExperienceLevel"] as? String,
                athlete3Position: data["athlete3Position"] as? String
            )
        } catch {
        }
        #endif
    }
}
