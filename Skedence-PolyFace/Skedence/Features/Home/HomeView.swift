//
//  HomeView.swift
//  Skedence
//
//  Created by Matthew Sprague on 10/14/25.
//

import SwiftUI
import MapKit
import FirebaseAuth

struct HomeView: View {
    @EnvironmentObject var auth: AuthManager
    @ObservedObject var usersService: UsersService
    @ObservedObject var scheduleService: ScheduleService
    @ObservedObject var classesService: ClassesService
    @StateObject private var locationsService = LocationsService()
    @StateObject private var adminService = AdminService()
    @StateObject private var billboardService = BillboardService()
    @StateObject private var homePricingService = PricingStructureService()
    @Environment(\.openURL) private var openURL
    
    @Binding var selectedTab: Int
    @Binding var bookViewMode: Int
    @Binding var selectedClassId: String?
    @Binding var profileTab: String?
    
    @State private var hasLoadedInitialData = false

    private var isAuthenticated: Bool {
        Auth.auth().currentUser != nil
    }

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: Spacing.xl) {
                    // Hero Header
                    HeroHeader(displayName: usersService.currentUser?.displayName ?? "Athlete")

                    // Getting Started Instructions
                    GettingStartedSection(
                        selectedTab: $selectedTab,
                        bookViewMode: $bookViewMode,
                        profileTab: $profileTab
                    )

                    // Billboard - Only show if enabled and has message
                    if billboardService.isEnabled && !billboardService.message.isEmpty {
                        BillboardSection(message: billboardService.message)
                    }

                    // Upcoming Classes
                    UpcomingClassesSection(
                        classesService: classesService,
                        pricingService: homePricingService,
                        bookViewMode: $bookViewMode,
                        selectedTab: $selectedTab,
                        selectedClassId: $selectedClassId
                    )

                    // CTA Button
                    Button {
                        bookViewMode = 0 // Set to Lessons mode
                        selectedTab = 1  // Switch to Book tab
                    } label: {
                        Text("View Full Schedule")
                    }
                    .buttonStyle(PrimaryButtonStyle())
                    .padding(.top, Spacing.md)
                    
                    // Location Cards
                    if !locationsService.locations.isEmpty {
                        LocationsSection(
                            locations: locationsService.locations,
                            onLocationTap: openInMaps
                        )
                    } else if adminService.isAdmin {
                        NoLocationPlaceholder()
                    }
                }
                .padding(.horizontal, Spacing.lg)
                .padding(.bottom, Spacing.xxxl)
            }
            .background(Color.platformGroupedBackground.ignoresSafeArea())
            .navigationTitle("")
            #if os(iOS)
            .navigationBarHidden(true)
            #endif
        }
        .navigationViewStyle(.stack)
        .task {
            // Log screen view
            AnalyticsService.shared.logScreenView(screenName: "Home", screenClass: "HomeView")
            
            // Keep user info fresh if signed in; do not load schedule here.
            if isAuthenticated {
                await usersService.loadCurrentUserIfAvailable()
            }
            // Load data once org is available
            if let orgId = auth.currentOrgId {
                await loadHomeData(orgId: orgId)
            }
        }
        .onChange(of: auth.currentOrgId) { newOrgId in
            guard let orgId = newOrgId, !hasLoadedInitialData else { return }
            Task { await loadHomeData(orgId: orgId) }
        }
        .onAppear {
            // Only refresh if we've already loaded initial data (i.e., returning to view)
            guard hasLoadedInitialData else { return }
            
            // Reload data when view reappears
            if let orgId = auth.currentOrgId, isAuthenticated {
                Task {
                    await refreshDataOnAppear(orgId: orgId)
                }
            }
        }
    }
    
    // Refresh data when returning to HomeView
    private func loadHomeData(orgId: String) async {
        locationsService.loadLocations(orgId: orgId)
        await classesService.loadUpcomingClasses(orgId: orgId)
        await homePricingService.loadPricingStructure(for: orgId)
        await adminService.checkAdminStatus()
        await billboardService.loadBillboard(orgId: orgId)
        hasLoadedInitialData = true
    }

    private func refreshDataOnAppear(orgId: String) async {
        // Force refresh auth token to prevent "insufficient permissions" errors
        if let currentUser = Auth.auth().currentUser {
            do {
                _ = try await currentUser.getIDTokenResult(forcingRefresh: true)
                print("HomeView: Refreshed auth token successfully")
            } catch {
                print("HomeView: Failed to refresh token: \(error.localizedDescription)")
                return
            }
        }
        
        // Now safely reload data
        await classesService.loadUpcomingClasses(orgId: orgId)
        locationsService.loadLocations(orgId: orgId)
    }

    private func openInMaps(address: String) {
        let request = MKLocalSearch.Request()
        request.naturalLanguageQuery = address
        let search = MKLocalSearch(request: request)
        Task {
            let response = try? await search.start()
            if let mapItem = response?.mapItems.first {
                mapItem.openInMaps(launchOptions: [
                    MKLaunchOptionsDirectionsModeKey: MKLaunchOptionsDirectionsModeDriving
                ])
            } else {
                let query = address.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
                if let url = URL(string: "http://maps.apple.com/?q=\(query)") {
                    openURL(url)
                }
            }
        }
    }
}

// MARK: - Supporting Views

private struct HeroHeader: View {
    let displayName: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Text("Welcome Back")
                .font(.headingMedium)
                .foregroundStyle(AppTheme.textSecondary)
            
            Text(displayName)
                .font(.displayMedium)
                .foregroundStyle(AppTheme.primary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.top, Spacing.md)
    }
}

private struct LocationsSection: View {
    let locations: [Location]
    let onLocationTap: (String) -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            if locations.count > 1 {
                SectionHeaderView(title: "Locations")
            }
            
            ForEach(locations) { location in
                LocationCard(location: location) {
                    onLocationTap(location.fullAddress)
                }
            }
        }
    }
}

private struct NoLocationPlaceholder: View {
    var body: some View {
        CardView(padding: Spacing.md) {
            HStack(spacing: Spacing.md) {
                ZStack {
                    Circle()
                        .fill(Color.platformSecondaryBackground)
                        .frame(width: 56, height: 56)
                    
                    Image(systemName: "mappin.circle")
                        .font(.system(size: 26))
                        .foregroundStyle(AppTheme.textTertiary)
                }

                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    Text("No Location Set")
                        .font(.headingSmall)
                        .foregroundStyle(AppTheme.textPrimary)
                    
                    Text("Add your location in Admin")
                        .font(.bodyMedium)
                        .foregroundStyle(AppTheme.textSecondary)
                }

                Spacer()
            }
        }
    }
}
