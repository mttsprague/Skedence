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
    @EnvironmentObject private var auth: AuthManager
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
                        // Client Header with Avatar
                        clientHeader
                            .padding(.top, Spacing.lg)
                        
                        // Contact Information (always visible)
                        contactSection
                        
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
    
    // MARK: - Client Header
    private var clientHeader: some View {
        VStack(spacing: Spacing.md) {
            ZStack {
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [AppTheme.primary.opacity(0.8), AppTheme.primaryLight.opacity(0.8)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 100, height: 100)
                
                Text(client.initials)
                    .font(.displaySmall)
                    .foregroundStyle(.white)
            }
            
            Text(client.fullName)
                .font(.headingLarge)
                .foregroundStyle(AppTheme.textPrimary)
        }
    }
    
    // MARK: - Contact Section
    private var contactSection: some View {
        CardView {
            HStack(spacing: Spacing.md) {
                // Email
                Link(destination: URL(string: "mailto:\(client.emailAddress)")!) {
                    Image(systemName: "envelope.fill")
                        .font(.system(size: 18))
                        .foregroundStyle(AppTheme.primary)
                }
                
                // Phone
                Link(destination: URL(string: "tel:\(client.phoneNumber)")!) {
                    Image(systemName: "phone.fill")
                        .font(.system(size: 18))
                        .foregroundStyle(AppTheme.primary)
                }
                
                // Text Message
                Link(destination: URL(string: "sms:\(client.phoneNumber)")!) {
                    Image(systemName: "message.fill")
                        .font(.system(size: 18))
                        .foregroundStyle(AppTheme.primary)
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 2) {
                    Text(client.emailAddress)
                        .font(.labelSmall)
                        .foregroundStyle(AppTheme.textSecondary)
                    Text(client.phoneNumber)
                        .font(.labelSmall)
                        .foregroundStyle(AppTheme.textSecondary)
                }
            }
            .padding(Spacing.md)
        }
        .padding(.horizontal, Spacing.lg)
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
            lessonSection
            athleteSection
            notesSection
        }
        .padding(.horizontal, Spacing.lg)
    }
    
    private var accountContent: some View {
        VStack(spacing: Spacing.md) {
            if viewModel.isAdmin {
                walletSection
            }
            accountSection
        }
        .padding(.horizontal, Spacing.lg)
    }
    
    private var scheduleContent: some View {
        scheduleSection
            .padding(.horizontal, Spacing.lg)
    }
    
    private var documentsContent: some View {
        documentsSection
            .padding(.horizontal, Spacing.lg)
    }
    
    // MARK: - Lesson Section
    private var lessonSection: some View {
        Group {
            if let nextBooking = viewModel.displayedLesson {
                CardView {
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        HStack {
                            Text(selectedBooking != nil ? "Selected Lesson" : "Next Lesson")
                                .font(.headingSmall)
                                .foregroundStyle(AppTheme.textPrimary)
                            
                            Spacer()
                            
                            if nextBooking.isClassBooking == true {
                                Label("Class", systemImage: "person.3.fill")
                                    .font(.labelSmall)
                                    .foregroundStyle(AppTheme.primary)
                                    .padding(.horizontal, Spacing.sm)
                                    .padding(.vertical, Spacing.xxs)
                                    .background(AppTheme.primary.opacity(0.1))
                                    .cornerRadius(8)
                            }
                        }
                        
                        VStack(alignment: .leading, spacing: Spacing.sm) {
                            HStack(spacing: Spacing.xs) {
                                Image(systemName: "calendar")
                                    .font(.system(size: 14))
                                    .foregroundStyle(AppTheme.textSecondary)
                                Text(nextBooking.formattedDate)
                                    .font(.bodyMedium)
                                    .foregroundStyle(AppTheme.textPrimary)
                            }
                            
                            HStack(spacing: Spacing.xs) {
                                Image(systemName: "person.fill")
                                    .font(.system(size: 14))
                                    .foregroundStyle(AppTheme.textSecondary)
                                Text(nextBooking.trainerName)
                                    .font(.bodyMedium)
                                    .foregroundStyle(AppTheme.textPrimary)
                            }
                            
                            HStack(spacing: Spacing.xs) {
                                Image(systemName: "clock")
                                    .font(.system(size: 14))
                                    .foregroundStyle(AppTheme.textSecondary)
                                Text(nextBooking.duration)
                                    .font(.bodyMedium)
                                    .foregroundStyle(AppTheme.textPrimary)
                            }
                            
                            if let location = nextBooking.location {
                                HStack(spacing: Spacing.xs) {
                                    Image(systemName: "mappin.circle.fill")
                                        .font(.system(size: 14))
                                        .foregroundStyle(AppTheme.textSecondary)
                                    Text(location)
                                        .font(.bodyMedium)
                                        .foregroundStyle(AppTheme.textPrimary)
                                }
                            }
                            
                            if nextBooking.isClassBooking != true {
                                HStack(spacing: Spacing.xs) {
                                    Image(systemName: "ticket.fill")
                                        .font(.system(size: 14))
                                        .foregroundStyle(AppTheme.textSecondary)
                                    Text(nextBooking.packageTypeName)
                                        .font(.bodyMedium)
                                        .foregroundStyle(AppTheme.textPrimary)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    // MARK: - Athlete Section
    private var athleteSection: some View {
        Group {
            if client.athleteFullName != nil {
                CardView {
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        Text("Athletes")
                            .font(.headingSmall)
                            .foregroundStyle(AppTheme.textPrimary)
                        
                        VStack(spacing: Spacing.sm) {
                            if let athleteName = client.athleteFullName {
                                VStack(alignment: .leading, spacing: 4) {
                                    HStack(spacing: Spacing.xs) {
                                        Image(systemName: "person.fill")
                                            .font(.system(size: 14))
                                            .foregroundStyle(AppTheme.textSecondary)
                                        Text(athleteName)
                                            .font(.bodyMedium)
                                            .foregroundStyle(AppTheme.textPrimary)
                                        if let position = client.athletePosition {
                                            Text("•")
                                                .foregroundStyle(AppTheme.textTertiary)
                                            Text(position)
                                                .font(.bodyMedium)
                                                .foregroundStyle(AppTheme.textSecondary)
                                        }
                                    }
                                    if let birthday = client.athleteBirthday {
                                        HStack(spacing: Spacing.xs) {
                                            Image(systemName: "calendar")
                                                .font(.system(size: 12))
                                                .foregroundStyle(AppTheme.textTertiary)
                                            Text(birthday)
                                                .font(.bodySmall)
                                                .foregroundStyle(AppTheme.textSecondary)
                                        }
                                        .padding(.leading, 20)
                                    }
                                }
                            }
                            
                            if let athlete2Name = client.athlete2FullName {
                                Divider()
                                VStack(alignment: .leading, spacing: 4) {
                                    HStack(spacing: Spacing.xs) {
                                        Image(systemName: "person.fill")
                                            .font(.system(size: 14))
                                            .foregroundStyle(AppTheme.textSecondary)
                                        Text(athlete2Name)
                                            .font(.bodyMedium)
                                            .foregroundStyle(AppTheme.textPrimary)
                                        if let position = client.athlete2Position {
                                            Text("•")
                                                .foregroundStyle(AppTheme.textTertiary)
                                            Text(position)
                                                .font(.bodyMedium)
                                                .foregroundStyle(AppTheme.textSecondary)
                                        }
                                    }
                                    if let birthday = client.athlete2Birthday {
                                        HStack(spacing: Spacing.xs) {
                                            Image(systemName: "calendar")
                                                .font(.system(size: 12))
                                                .foregroundStyle(AppTheme.textTertiary)
                                            Text(birthday)
                                                .font(.bodySmall)
                                                .foregroundStyle(AppTheme.textSecondary)
                                        }
                                        .padding(.leading, 20)
                                    }
                                }
                            }
                            
                            if let athlete3Name = client.athlete3FullName {
                                Divider()
                                VStack(alignment: .leading, spacing: 4) {
                                    HStack(spacing: Spacing.xs) {
                                        Image(systemName: "person.fill")
                                            .font(.system(size: 14))
                                            .foregroundStyle(AppTheme.textSecondary)
                                        Text(athlete3Name)
                                            .font(.bodyMedium)
                                            .foregroundStyle(AppTheme.textPrimary)
                                        if let position = client.athlete3Position {
                                            Text("•")
                                                .foregroundStyle(AppTheme.textTertiary)
                                            Text(position)
                                                .font(.bodyMedium)
                                                .foregroundStyle(AppTheme.textSecondary)
                                        }
                                    }
                                    if let birthday = client.athlete3Birthday {
                                        HStack(spacing: Spacing.xs) {
                                            Image(systemName: "calendar")
                                                .font(.system(size: 12))
                                                .foregroundStyle(AppTheme.textTertiary)
                                            Text(birthday)
                                                .font(.bodySmall)
                                                .foregroundStyle(AppTheme.textSecondary)
                                        }
                                        .padding(.leading, 20)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    // MARK: - Notes Section
    private var notesSection: some View {
        Group {
            if let notes = client.notesForCoach, !notes.isEmpty {
                CardView {
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        Text("Notes")
                            .font(.headingSmall)
                            .foregroundStyle(AppTheme.textPrimary)
                        
                        Text(notes)
                            .font(.bodyMedium)
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                }
            }
        }
    }
    
    // MARK: - Wallet Section
    private var walletSection: some View {
        CardView {
            VStack(alignment: .leading, spacing: Spacing.md) {
                HStack {
                    Text("Saved Cards")
                        .font(.headingSmall)
                        .foregroundStyle(AppTheme.textPrimary)
                    
                    Spacer()
                    
                    if viewModel.isLoadingPaymentMethod {
                        ProgressView()
                            .scaleEffect(0.8)
                    }
                }
                
                if viewModel.paymentMethods.isEmpty && !viewModel.isLoadingPaymentMethod {
                    HStack(spacing: Spacing.md) {
                        Image(systemName: "creditcard")
                            .font(.system(size: 24))
                            .foregroundStyle(AppTheme.textTertiary)
                        
                        Text("No cards saved")
                            .font(.bodyMedium)
                            .foregroundStyle(AppTheme.textSecondary)
                        
                        Spacer()
                    }
                    .padding(.vertical, Spacing.xs)
                } else {
                    VStack(spacing: Spacing.sm) {
                        ForEach(viewModel.paymentMethods) { card in
                            savedCardRow(card)
                            if card.id != viewModel.paymentMethods.last?.id {
                                Divider()
                            }
                        }
                    }
                }
            }
        }
    }
    
    private func savedCardRow(_ card: PaymentMethodInfo) -> some View {
        HStack(spacing: Spacing.md) {
            Image(systemName: "creditcard.fill")
                .font(.system(size: 24))
                .foregroundStyle(AppTheme.primary)
            
            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text("\(card.brand.capitalized)")
                    .font(.labelMedium)
                    .foregroundStyle(AppTheme.textSecondary)
                Text("•••• \(card.last4)")
                    .font(.bodyMedium)
                    .fontWeight(.semibold)
                    .foregroundStyle(AppTheme.textPrimary)
            }
            
            Spacer()
            
            Text("\(card.expMonth)/\(card.expYear)")
                .font(.bodySmall)
                .foregroundStyle(AppTheme.textSecondary)
        }
        .padding(.vertical, Spacing.xs)
    }
    
    // MARK: - Account Section
    private var accountSection: some View {
        CardView {
            VStack(alignment: .leading, spacing: Spacing.md) {
                HStack {
                    Text("Passes")
                        .font(.headingSmall)
                        .foregroundStyle(AppTheme.textPrimary)
                    
                    Spacer()
                    
                    if viewModel.isLoadingPackages {
                        ProgressView()
                            .scaleEffect(0.8)
                    }
                }
                
                if viewModel.aggregatedPackages.isEmpty && !viewModel.isLoadingPackages {
                    VStack(spacing: Spacing.sm) {
                        Image(systemName: "ticket")
                            .font(.system(size: 32))
                            .foregroundStyle(AppTheme.textTertiary)
                        Text("No passes")
                            .font(.bodyMedium)
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Spacing.lg)
                } else {
                    VStack(spacing: Spacing.sm) {
                        ForEach(viewModel.aggregatedPackages) { aggregated in
                            aggregatedPackageRow(aggregated)
                            if aggregated.id != viewModel.aggregatedPackages.last?.id {
                                Divider()
                            }
                        }
                    }
                }
            }
        }
    }
    
    private func aggregatedPackageRow(_ aggregated: AggregatedPackage) -> some View {
        HStack(spacing: Spacing.md) {
            // Icon
            ZStack {
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .fill(AppTheme.primary.opacity(0.15))
                Image(systemName: iconForPackageType(aggregated.packageType))
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(AppTheme.primary)
            }
            .frame(width: 48, height: 48)
            
            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text(aggregated.packageDisplayName)
                    .font(.bodyMedium)
                    .fontWeight(.semibold)
                    .foregroundStyle(AppTheme.textPrimary)
                
                if aggregated.hasExpired {
                    Text("Some expired")
                        .font(.labelSmall)
                        .foregroundStyle(Color.orange)
                } else if aggregated.totalRemaining == 0 {
                    Text("All used")
                        .font(.labelSmall)
                        .foregroundStyle(AppTheme.textSecondary)
                } else {
                    Text("\(aggregated.totalRemaining) of \(aggregated.totalLessons) remaining")
                        .font(.labelSmall)
                        .foregroundStyle(AppTheme.textSecondary)
                }
            }
            
            Spacer()
            
            if aggregated.totalRemaining > 0 {
                Text("\(aggregated.totalRemaining)")
                    .font(.system(size: 28, weight: .bold))
                    .foregroundStyle(aggregated.hasExpired ? Color.orange : AppTheme.primary)
            }
        }
        .padding(.vertical, Spacing.xs)
    }
    
    private func iconForPackageType(_ packageType: String) -> String {
        switch packageType {
        case "private", "1_athlete", "single":
            return "person.fill"
        case "2_athlete", "two_athlete":
            return "person.2.fill"
        case "3_athlete", "three_athlete":
            return "person.3.fill"
        case "class_pass", "class":
            return "calendar.badge.clock"
        default:
            return "ticket.fill"
        }
    }
    
    // MARK: - Schedule Section
    private var scheduleSection: some View {
        VStack(spacing: Spacing.md) {
            // Upcoming Visits
            CardView {
                VStack(alignment: .leading, spacing: Spacing.md) {
                    HStack {
                        Text("Upcoming Visits")
                            .font(.headingSmall)
                            .foregroundStyle(AppTheme.textPrimary)
                        
                        Spacer()
                        
                        if viewModel.isLoadingBookings {
                            ProgressView()
                                .scaleEffect(0.8)
                        }
                    }
                    
                    if viewModel.upcomingBookings.isEmpty && !viewModel.isLoadingBookings {
                        VStack(spacing: Spacing.sm) {
                            Image(systemName: "calendar.badge.clock")
                                .font(.system(size: 32))
                                .foregroundStyle(AppTheme.textTertiary)
                            Text("No upcoming visits")
                                .font(.bodyMedium)
                                .foregroundStyle(AppTheme.textSecondary)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, Spacing.md)
                    } else {
                        VStack(spacing: Spacing.xs) {
                            ForEach(viewModel.upcomingBookings) { booking in
                                upcomingBookingRow(booking)
                            }
                        }
                    }
                }
            }
            
            // Visit History
            CardView {
                VStack(alignment: .leading, spacing: Spacing.md) {
                    Text("Visit History")
                        .font(.headingSmall)
                        .foregroundStyle(AppTheme.textPrimary)
                    
                    if viewModel.pastBookings.isEmpty && !viewModel.isLoadingBookings {
                        VStack(spacing: Spacing.sm) {
                            Image(systemName: "clock.arrow.circlepath")
                                .font(.system(size: 32))
                                .foregroundStyle(AppTheme.textTertiary)
                            Text("No past visits")
                                .font(.bodyMedium)
                                .foregroundStyle(AppTheme.textSecondary)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, Spacing.md)
                    } else {
                        VStack(spacing: Spacing.xs) {
                            ForEach(viewModel.pastBookings.prefix(10)) { booking in
                                bookingRow(booking)
                            }
                        }
                    }
                }
            }
        }
    }
    
    private func bookingRow(_ booking: ClientBooking) -> some View {
        HStack(spacing: Spacing.sm) {
            Image(systemName: booking.isClassBooking == true ? "person.3.fill" : "calendar")
                .font(.system(size: 16))
                .foregroundStyle(AppTheme.primary)
                .frame(width: 24)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(booking.trainerName)
                    .font(.bodyMedium)
                    .fontWeight(.medium)
                    .foregroundStyle(AppTheme.textPrimary)
                
                Text(booking.formattedDate)
                    .font(.labelSmall)
                    .foregroundStyle(AppTheme.textSecondary)
            }
            
            Spacer()
            
            Text(booking.duration)
                .font(.labelMedium)
                .foregroundStyle(AppTheme.textTertiary)
        }
        .padding(.vertical, Spacing.xxs)
    }
    
    private func upcomingBookingRow(_ booking: ClientBooking) -> some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            HStack(spacing: Spacing.sm) {
                Image(systemName: booking.isClassBooking == true ? "person.3.fill" : "calendar")
                    .font(.system(size: 16))
                    .foregroundStyle(AppTheme.primary)
                    .frame(width: 24)
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(booking.trainerName)
                        .font(.bodyMedium)
                        .fontWeight(.medium)
                        .foregroundStyle(AppTheme.textPrimary)
                    
                    Text(booking.formattedDate)
                        .font(.labelSmall)
                        .foregroundStyle(AppTheme.textSecondary)
                }
                
                Spacer()
                
                Text(booking.duration)
                    .font(.labelMedium)
                    .foregroundStyle(AppTheme.textTertiary)
            }
            
            // Cancel button for admins/owners
            if auth.isAdmin {
                Button(action: {
                    bookingToCancel = booking.id
                    showCancelConfirmation = true
                }) {
                    HStack(spacing: Spacing.xs) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.labelSmall)
                        Text("Cancel Lesson")
                            .font(.labelMedium)
                            .fontWeight(.medium)
                    }
                    .foregroundStyle(.red)
                    .padding(.vertical, Spacing.xs)
                    .padding(.horizontal, Spacing.sm)
                    .background(Color.red.opacity(0.1))
                    .cornerRadius(8)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.vertical, Spacing.xxs)
    }
    
    // MARK: - Cancel Lesson
    
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
            
            // Reload the client data after successful cancellation
            await viewModel.loadClientData(
                clientId: client.id,
                selectedBooking: nil,
                orgId: orgId
            )
            
        } catch {
            print("❌ Error cancelling lesson: \(error)")
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
    
    // MARK: - Documents Section
    private var documentsSection: some View {
        CardView {
            VStack(alignment: .leading, spacing: Spacing.md) {
                HStack {
                    Text("Documents")
                        .font(.headingSmall)
                        .foregroundStyle(AppTheme.textPrimary)
                    
                    Spacer()
                    
                    if viewModel.isLoadingDocuments {
                        ProgressView()
                            .scaleEffect(0.8)
                    }
                }
                
                if viewModel.documents.isEmpty && !viewModel.isLoadingDocuments {
                    VStack(spacing: Spacing.sm) {
                        Image(systemName: "doc.text")
                            .font(.system(size: 32))
                            .foregroundStyle(AppTheme.textTertiary)
                        Text("No documents on file")
                            .font(.bodyMedium)
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Spacing.lg)
                } else {
                    VStack(spacing: Spacing.sm) {
                        ForEach(viewModel.documents) { document in
                            documentRow(document)
                            if document.id != viewModel.documents.last?.id {
                                Divider()
                            }
                        }
                    }
                }
            }
        }
    }
    
    private func documentRow(_ document: ClientDocument) -> some View {
        HStack(spacing: Spacing.md) {
            Image(systemName: document.icon)
                .font(.system(size: 20))
                .foregroundStyle(AppTheme.primary)
                .frame(width: 32)
            
            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text(document.displayName)
                    .font(.bodyMedium)
                    .fontWeight(.medium)
                    .foregroundStyle(AppTheme.textPrimary)
                
                Text(document.uploadedAt.formatted(.relative(presentation: .named)))
                    .font(.labelSmall)
                    .foregroundStyle(AppTheme.textSecondary)
            }
            
            Spacer()
            
            if document.url != nil {
                Image(systemName: "chevron.right")
                    .font(.system(size: 14))
                    .foregroundStyle(AppTheme.textTertiary)
            }
        }
        .padding(.vertical, Spacing.xs)
        .contentShape(Rectangle())
        .onTapGesture {
            if let urlString = document.url, let url = URL(string: urlString) {
                UIApplication.shared.open(url)
            }
        }
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
            print("Error loading packages: \(error)")
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
            print("Error loading bookings: \(error)")
        }
    }
    
    private func loadDocuments(clientId: String) async {
        isLoadingDocuments = true
        defer { isLoadingDocuments = false }
        
        do {
            documents = try await FirestoreService.shared.fetchClientDocuments(clientId: clientId)
        } catch {
            print("Error loading documents: \(error)")
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
            print("Error checking admin status: \(error)")
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
