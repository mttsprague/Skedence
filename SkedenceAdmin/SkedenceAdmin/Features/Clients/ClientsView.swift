//
//  ClientsView.swift
//  SkedenceAdmin
//
//  Created by Matthew Sprague on 10/12/25.
//

import SwiftUI
#if canImport(FirebaseFirestore)
import FirebaseFirestore
#endif

enum ClientSortOption: String, CaseIterable {
    case nameAZ = "nameAZ"
    case nameZA = "nameZA"
    case birthdayUpcoming = "birthdayUpcoming"
    case amountSpentDesc = "amountSpentDesc"
    case mostRecentBooking = "mostRecentBooking"

    var label: String {
        switch self {
        case .nameAZ:           return "Name A→Z"
        case .nameZA:           return "Name Z→A"
        case .birthdayUpcoming: return "Next Birthday"
        case .amountSpentDesc:  return "Most Spent"
        case .mostRecentBooking: return "Recent Booking"
        }
    }
}

struct ClientsView: View {
    @EnvironmentObject private var dependencies: AdminAppDependencies
    @StateObject private var viewModel = ClientsViewModel()
    @State private var selectedClient: Client?
    @State private var searchText: String = ""
    @State private var sortOption: ClientSortOption = .nameAZ
    @State private var positionFilter: String = "All"
    @State private var showFilterPanel: Bool = false

    // Supplementary sort data
    @State private var clientSpendMap: [String: Int] = [:]        // clientId → total cents
    @State private var clientLastBookingMap: [String: Date] = [:] // clientId → most recent startTime
    @State private var isLoadingSupplementary = false

    // Convenience accessor
    private var auth: AuthManager { dependencies.auth }

    private var uniquePositions: [String] {
        var set = Set<String>()
        viewModel.clients.forEach { c in
            [c.athletePosition, c.athlete2Position, c.athlete3Position]
                .compactMap { $0 }.filter { !$0.isEmpty }.forEach { set.insert($0) }
        }
        return ["All"] + set.sorted()
    }

    private var activeFilterCount: Int {
        (sortOption != .nameAZ ? 1 : 0) + (positionFilter != "All" ? 1 : 0)
    }

    // Returns the number of days until a birthday string's next occurrence.
    // Accepts "YYYY-MM-DD" or "MM/DD/YYYY" formats.
    private func daysUntilNextBirthday(_ raw: String?) -> Int {
        guard let raw = raw, !raw.isEmpty else { return Int.max }
        let today = Calendar.current.startOfDay(for: Date())
        var components: DateComponents?
        for fmt in ["yyyy-MM-dd", "MM/dd/yyyy", "M/d/yyyy"] {
            let f = DateFormatter()
            f.dateFormat = fmt
            f.locale = Locale(identifier: "en_US_POSIX")
            if let d = f.date(from: raw) {
                var c = Calendar.current.dateComponents([.month, .day], from: d)
                c.year = Calendar.current.component(.year, from: today)
                components = c
                break
            }
        }
        guard let c = components,
              let thisYear = Calendar.current.date(from: c) else { return Int.max }
        let target = thisYear < today
            ? Calendar.current.date(byAdding: .year, value: 1, to: thisYear)!
            : thisYear
        return Calendar.current.dateComponents([.day], from: today, to: target).day ?? Int.max
    }

    private func earliestBirthday(for client: Client) -> Int {
        let candidates = [client.athleteBirthday, client.athlete2Birthday, client.athlete3Birthday]
        return candidates.map { daysUntilNextBirthday($0) }.min() ?? Int.max
    }

    private var filteredClients: [Client] {
        var result = viewModel.clients

        // Search
        if !searchText.isEmpty {
            result = result.filter { client in
                client.fullName.localizedCaseInsensitiveContains(searchText) ||
                client.emailAddress.localizedCaseInsensitiveContains(searchText) ||
                client.phoneNumber.localizedCaseInsensitiveContains(searchText) ||
                (client.athleteFullName?.localizedCaseInsensitiveContains(searchText) ?? false) ||
                (client.athlete2FullName?.localizedCaseInsensitiveContains(searchText) ?? false) ||
                (client.referenceCode?.localizedCaseInsensitiveContains(searchText) ?? false)
            }
        }

        // Position filter
        if positionFilter != "All" {
            result = result.filter { c in
                [c.athletePosition, c.athlete2Position, c.athlete3Position]
                    .compactMap { $0 }
                    .contains { $0.caseInsensitiveCompare(positionFilter) == .orderedSame }
            }
        }

        // Sort
        switch sortOption {
        case .nameAZ:
            result.sort { $0.lastName.localizedCompare($1.lastName) == .orderedAscending }
        case .nameZA:
            result.sort { $0.lastName.localizedCompare($1.lastName) == .orderedDescending }
        case .birthdayUpcoming:
            result.sort { earliestBirthday(for: $0) < earliestBirthday(for: $1) }
        case .amountSpentDesc:
            result.sort { (clientSpendMap[$0.id] ?? 0) > (clientSpendMap[$1.id] ?? 0) }
        case .mostRecentBooking:
            result.sort {
                let a = clientLastBookingMap[$0.id] ?? .distantPast
                let b = clientLastBookingMap[$1.id] ?? .distantPast
                return a > b
            }
        }
        return result
    }

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: Spacing.xl) {
                    // Hero Header
                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        Text("Your Clients")
                            .font(.displayMedium)
                            .foregroundStyle(AppTheme.primary)
                        
                        Text("\(viewModel.clients.count) \(viewModel.clients.count == 1 ? "client" : "clients")")
                            .font(.bodyLarge)
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                    .padding(.top, Spacing.md)
                    
                    // Search bar + filter button row
                    HStack(spacing: Spacing.sm) {
                        HStack(spacing: Spacing.sm) {
                            Image(systemName: "magnifyingglass")
                                .foregroundStyle(AppTheme.textSecondary)
                            TextField("Search clients...", text: $searchText)
                                .textFieldStyle(.plain)
                                .autocorrectionDisabled()
                            if !searchText.isEmpty {
                                Button {
                                    searchText = ""
                                } label: {
                                    Image(systemName: "xmark.circle.fill")
                                        .foregroundStyle(AppTheme.textSecondary)
                                }
                            }
                        }
                        .padding(Spacing.md)
                        .background(
                            RoundedRectangle(cornerRadius: 12)
                                .fill(Color(UIColor.systemGray6))
                        )

                        // Sort & Filter button
                        Button {
                            withAnimation(.spring(response: 0.3)) {
                                showFilterPanel.toggle()
                            }
                        } label: {
                            ZStack(alignment: .topTrailing) {
                                Image(systemName: "slider.horizontal.3")
                                    .font(.system(size: 18, weight: .medium))
                                    .foregroundStyle(showFilterPanel || activeFilterCount > 0 ? .white : AppTheme.primary)
                                    .frame(width: 44, height: 44)
                                    .background(
                                        RoundedRectangle(cornerRadius: 12)
                                            .fill(showFilterPanel || activeFilterCount > 0 ? AppTheme.primary : Color(UIColor.systemGray6))
                                    )
                                if activeFilterCount > 0 {
                                    Text("\(activeFilterCount)")
                                        .font(.system(size: 10, weight: .bold))
                                        .foregroundStyle(.white)
                                        .frame(width: 16, height: 16)
                                        .background(Circle().fill(Color.orange))
                                        .offset(x: 4, y: -4)
                                }
                            }
                        }
                        .buttonStyle(.plain)
                    }

                    // Filter panel
                    if showFilterPanel {
                        VStack(alignment: .leading, spacing: Spacing.md) {
                            // Sort
                            VStack(alignment: .leading, spacing: Spacing.sm) {
                                Text("SORT BY")
                                    .font(.caption)
                                    .fontWeight(.semibold)
                                    .foregroundStyle(AppTheme.textSecondary)
                                ZStack(alignment: .trailing) {
                                    ScrollView(.horizontal, showsIndicators: false) {
                                        HStack(spacing: Spacing.sm) {
                                            ForEach(ClientSortOption.allCases, id: \.self) { option in
                                                Button {
                                                    sortOption = option
                                                } label: {
                                                    Text(option.label)
                                                        .font(.subheadline)
                                                        .padding(.horizontal, 14)
                                                        .padding(.vertical, 8)
                                                        .background(
                                                            Capsule().fill(sortOption == option ? AppTheme.primary : Color(UIColor.systemGray5))
                                                        )
                                                        .foregroundStyle(sortOption == option ? .white : AppTheme.textPrimary)
                                                }
                                                .buttonStyle(.plain)
                                            }
                                        }
                                        .padding(.trailing, 24)
                                    }
                                    HStack(spacing: 0) {
                                        LinearGradient(
                                            colors: [Color(UIColor.systemGray6).opacity(0), Color(UIColor.systemGray6)],
                                            startPoint: .leading, endPoint: .trailing
                                        )
                                        .frame(width: 28)
                                        Image(systemName: "chevron.right")
                                            .font(.system(size: 11, weight: .semibold))
                                            .foregroundStyle(AppTheme.textSecondary)
                                            .frame(width: 16)
                                            .background(Color(UIColor.systemGray6))
                                    }
                                    .allowsHitTesting(false)
                                }
                            }

                            // Position filter (only if positions exist)
                            if uniquePositions.count > 1 {
                                VStack(alignment: .leading, spacing: Spacing.sm) {
                                    Text("POSITION")
                                        .font(.caption)
                                        .fontWeight(.semibold)
                                        .foregroundStyle(AppTheme.textSecondary)
                                    ZStack(alignment: .trailing) {
                                        ScrollView(.horizontal, showsIndicators: false) {
                                            HStack(spacing: Spacing.sm) {
                                                ForEach(uniquePositions, id: \.self) { pos in
                                                    Button {
                                                        positionFilter = pos
                                                    } label: {
                                                        Text(pos)
                                                            .font(.subheadline)
                                                            .padding(.horizontal, 14)
                                                            .padding(.vertical, 8)
                                                            .background(
                                                                Capsule().fill(positionFilter == pos ? AppTheme.primary : Color(UIColor.systemGray5))
                                                            )
                                                            .foregroundStyle(positionFilter == pos ? .white : AppTheme.textPrimary)
                                                    }
                                                    .buttonStyle(.plain)
                                                }
                                            }
                                            .padding(.trailing, 24)
                                        }
                                        HStack(spacing: 0) {
                                            LinearGradient(
                                                colors: [Color(UIColor.systemGray6).opacity(0), Color(UIColor.systemGray6)],
                                                startPoint: .leading, endPoint: .trailing
                                            )
                                            .frame(width: 28)
                                            Image(systemName: "chevron.right")
                                                .font(.system(size: 11, weight: .semibold))
                                                .foregroundStyle(AppTheme.textSecondary)
                                                .frame(width: 16)
                                                .background(Color(UIColor.systemGray6))
                                        }
                                        .allowsHitTesting(false)
                                    }
                                }
                            }

                            // Reset
                            if activeFilterCount > 0 {
                                Button {
                                    sortOption = .nameAZ
                                    positionFilter = "All"
                                } label: {
                                    Text("Reset to defaults")
                                        .font(.subheadline)
                                        .foregroundStyle(AppTheme.textSecondary)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(Spacing.md)
                        .background(
                            RoundedRectangle(cornerRadius: 12)
                                .fill(Color(UIColor.systemGray6))
                        )
                        .transition(.opacity.combined(with: .move(edge: .top)))
                    }

                    if let error = viewModel.errorMessage, !error.isEmpty {
                        CardView {
                            HStack(spacing: Spacing.sm) {
                                Image(systemName: "exclamationmark.triangle.fill")
                                    .foregroundStyle(AppTheme.error)
                                Text(error)
                                    .font(.bodySmall)
                                    .foregroundStyle(AppTheme.error)
                            }
                        }
                    }

                    if viewModel.clients.isEmpty, viewModel.errorMessage == nil {
                        EmptyStateView(
                            icon: "person.2.fill",
                            title: "No Clients Yet",
                            message: "Your clients will appear here once they book sessions with you."
                        )
                        .padding(.top, Spacing.xxxl)
                    } else if filteredClients.isEmpty {
                        EmptyStateView(
                            icon: "magnifyingglass",
                            title: "No Results",
                            message: "No clients match '\(searchText)'"
                        )
                        .padding(.top, Spacing.xxxl)
                    } else {
                        if !searchText.isEmpty {
                            Text("\(filteredClients.count) \(filteredClients.count == 1 ? "result" : "results")")
                                .font(.bodySmall)
                                .foregroundStyle(AppTheme.textSecondary)
                        }
                        VStack(spacing: Spacing.sm) {
                            ForEach(filteredClients) { client in
                                ClientRow(client: client)
                                    .onTapGesture {
                                        selectedClient = client
                                    }
                            }
                        }
                    }
                }
                .padding(.horizontal, Spacing.lg)
                .padding(.bottom, Spacing.xxxl)
            }
            .background(Color(UIColor.systemGroupedBackground).ignoresSafeArea())
            .navigationBarHidden(true)
            .task {
                if let trainerId = auth.userId {
                    viewModel.setTrainerId(trainerId)
                }
                viewModel.setOrgId(auth.currentOrgId)
                await viewModel.load()
                await loadSupplementaryData()
            }
            .onChange(of: viewModel.clients) {
                Task { await loadSupplementaryData() }
            }
            .refreshable {
                await viewModel.load()
                await loadSupplementaryData()
            }
            .sheet(item: $selectedClient) { client in
                ClientCardView(client: client, selectedBooking: nil)
                    .environmentObject(dependencies)
            }
        }
        .navigationViewStyle(.stack)
    }

    // MARK: - Supplementary data for sort options

    @MainActor
    private func loadSupplementaryData() async {
        guard !viewModel.clients.isEmpty,
              let orgId = auth.currentOrgId else { return }
        guard !isLoadingSupplementary else { return }
        isLoadingSupplementary = true
        defer { isLoadingSupplementary = false }

        #if canImport(FirebaseFirestore)
        let db = Firestore.firestore()

        // --- Spend map: parallel per-client package reads ---
        // More reliable than collectionGroup since some packages may lack orgId field
        let clientIds = viewModel.clients.map { $0.id }
        var spendMap: [String: Int] = [:]
        await withTaskGroup(of: (String, Int).self) { group in
            for clientId in clientIds {
                group.addTask {
                    let snap = try? await db.collection("organizations")
                        .document(orgId)
                        .collection("users")
                        .document(clientId)
                        .collection("packages")
                        .getDocuments()
                    let total = snap?.documents
                        .compactMap { $0.data()["amountPaid"] as? Int }
                        .reduce(0, +) ?? 0
                    return (clientId, total)
                }
            }
            for await (clientId, total) in group {
                if total > 0 { spendMap[clientId] = total }
            }
        }
        self.clientSpendMap = spendMap

        // --- Last booking map: ordered query (requires composite index on orgId + startTime) ---
        if let snap = try? await db.collection("bookings")
            .whereField("orgId", isEqualTo: orgId)
            .order(by: "startTime", descending: true)
            .limit(to: 1000)
            .getDocuments() {
            var lastBookingMap: [String: Date] = [:]
            for doc in snap.documents {
                let data = doc.data()
                guard let clientId = (data["clientUID"] as? String) ?? (data["clientId"] as? String),
                      let ts = data["startTime"] as? Timestamp else { continue }
                // Already ordered descending — first occurrence per client is the most recent
                if lastBookingMap[clientId] == nil {
                    lastBookingMap[clientId] = ts.dateValue()
                }
            }
            self.clientLastBookingMap = lastBookingMap
        }
        #endif
    }

    private var header: some View {
        HStack {
            Label("Jeff Schmitz", systemImage: "person.circle")
                .font(.subheadline.weight(.semibold))
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(.ultraThinMaterial, in: Capsule())
            Spacer()
        }
        .padding(.top, 8)
    }

    private var title: some View {
        Text("Clients")
            .font(.system(size: 44, weight: .heavy, design: .default))
            .padding(.top, 4)
    }
}

private struct ClientRow: View {
    let client: Client

    var body: some View {
        CardView(padding: Spacing.md) {
            HStack(spacing: Spacing.md) {
                // Avatar
                ZStack {
                    Circle()
                        .fill(
                            LinearGradient(
                                colors: [AppTheme.primary.opacity(0.8), AppTheme.primaryLight.opacity(0.8)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 56, height: 56)
                    
                    Text(client.initials)
                        .font(.headingMedium)
                        .foregroundStyle(.white)
                }

                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    HStack(spacing: 8) {
                        Text(client.fullName)
                            .font(.headingSmall)
                            .foregroundStyle(AppTheme.textPrimary)
                        
                        if let refCode = client.referenceCode {
                            Text(refCode)
                                .font(.system(size: 11, weight: .medium, design: .monospaced))
                                .foregroundStyle(AppTheme.primary)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(
                                    RoundedRectangle(cornerRadius: 4)
                                        .fill(AppTheme.primary.opacity(0.1))
                                )
                        }
                    }
                    
                    HStack(spacing: Spacing.xxs) {
                        Image(systemName: "envelope.fill")
                            .font(.labelSmall)
                        Text(client.emailAddress)
                            .font(.bodySmall)
                    }
                    .foregroundStyle(AppTheme.textSecondary)
                    
                    HStack(spacing: Spacing.xxs) {
                        Image(systemName: "phone.fill")
                            .font(.labelSmall)
                        Text(client.phoneNumber)
                            .font(.bodySmall)
                    }
                    .foregroundStyle(AppTheme.textSecondary)
                    
                    if let athleteName = client.athleteFullName {
                        HStack(spacing: Spacing.xxs) {
                            Image(systemName: "person.fill")
                                .font(.labelSmall)
                            Text(athleteName)
                                .font(.bodySmall)
                            if let position = client.athletePosition {
                                Text("(\(position))")
                                    .font(.bodySmall)
                                    .foregroundStyle(AppTheme.textTertiary)
                            }
                        }
                        .foregroundStyle(AppTheme.textSecondary)
                    }
                    
                    if let athlete2Name = client.athlete2FullName {
                        HStack(spacing: Spacing.xxs) {
                            Image(systemName: "person.fill")
                                .font(.labelSmall)
                            Text(athlete2Name)
                                .font(.bodySmall)
                            if let position = client.athlete2Position {
                                Text("(\(position))")
                                    .font(.bodySmall)
                                    .foregroundStyle(AppTheme.textTertiary)
                            }
                        }
                        .foregroundStyle(AppTheme.textSecondary)
                    }
                    
                    if let notes = client.notesForCoach, !notes.isEmpty {
                        HStack(spacing: Spacing.xxs) {
                            Image(systemName: "note.text")
                                .font(.labelSmall)
                            Text(notes)
                                .font(.bodySmall)
                                .lineLimit(2)
                        }
                        .foregroundStyle(AppTheme.textSecondary)
                    }
                }
                
                Spacer()
                
                Image(systemName: "chevron.right")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(AppTheme.textTertiary)
            }
        }
    }
}
