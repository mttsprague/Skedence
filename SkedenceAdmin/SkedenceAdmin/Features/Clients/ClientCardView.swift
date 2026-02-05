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
                orgId: auth.currentOrgId
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
            AthletesSection(client: client)
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
            upcomingBookings: viewModel.upcomingBookings,
            pastBookings: viewModel.pastBookings,
            isLoading: viewModel.isLoadingBookings,
            isAdmin: auth.isAdmin,
            onCancelBooking: { bookingId in
                bookingToCancel = bookingId
                showCancelConfirmation = true
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
            // Fetch booking details before cancelling
            let bookingDoc = try await Firestore.firestore().collection("bookings").document(bookingId).getDocument()
            let bookingData = bookingDoc.data()
            
            try await FunctionsService.shared.adminCancelLesson(
                bookingId: bookingId,
                orgId: orgId,
                clientId: client.id
            )
            
            // Log activity
            if let user = Auth.auth().currentUser,
               let bookingData = bookingData,
               let startTime = (bookingData["startTime"] as? Timestamp)?.dateValue(),
               let trainerId = bookingData["trainerId"] as? String {
                
                Task {
                    // Fetch trainer name
                    let trainerDoc = try? await Firestore.firestore().collection("trainers").document(trainerId).getDocument()
                    let trainerName = (trainerDoc?.data()?["firstName"] as? String) ?? "Trainer"
                    let actorName = (user.displayName as String?) ?? "Admin"
                    
                    try? await ActivityLogger.shared.log(
                        type: .lessonCanceled,
                        actorId: user.uid,
                        actorName: actorName,
                        actorRole: .admin,
                        targetId: bookingId,
                        targetName: "Lesson with \(trainerName)",
                        targetType: "booking",
                        description: "\(actorName) canceled lesson for \(client.firstName) with \(trainerName) scheduled for \(ActivityLogger.formatDateTime(startTime))",
                        metadata: [
                            "bookingId": bookingId,
                            "clientId": client.id,
                            "trainerId": trainerId,
                            "startTime": startTime.ISO8601Format(),
                            "canceledBy": "admin"
                        ],
                        orgId: orgId
                    )
                }
            }
            
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
    
    @Published var isLoadingPackages = false
    @Published var isLoadingBookings = false
    @Published var isLoadingDocuments = false
    @Published var isLoadingPaymentMethod = false
    
    func loadClientData(clientId: String, selectedBooking: ClientBooking?, orgId: String?) async {
        // Check admin status
        #if canImport(FirebaseFirestore)
        await checkAdminStatus()
        #endif
        
        // Load data in parallel (packages, documents always; bookings only if orgId available)
        async let packagesTask: () = loadPackages(clientId: clientId)
        async let documentsTask: () = loadDocuments(clientId: clientId)
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
    
    private func checkAdminStatus() async {
        #if canImport(FirebaseAuth) && canImport(FirebaseFirestore)
        guard let userId = Auth.auth().currentUser?.uid else {
            isAdmin = false
            return
        }
        
        do {
            let trainerDoc = try await Firestore.firestore().collection("trainers").document(userId).getDocument()
            isAdmin = trainerDoc.data()?["isAdmin"] as? Bool ?? false
        } catch {
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
}
