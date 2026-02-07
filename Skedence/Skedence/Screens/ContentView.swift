//
//  ContentView.swift
//  Skedence
//
//  Created by Matthew Sprague on 10/12/25.
//

import SwiftUI
import FirebaseFirestore

// App Root With Tabs
struct AppRootView: View {
    @StateObject private var auth = AuthManager()
    @StateObject private var usersService = UsersService()
    @StateObject private var scheduleService = ScheduleService()
    @StateObject private var trainersService = TrainersService()
    @StateObject private var packagesService = PackagesService()
    @StateObject private var bookingsService = BookingsService()
    @StateObject private var classesService = ClassesService()
    @StateObject private var intakeFormService = IntakeFormService()
    // Removed subscription status - clients don't see subscription warnings
    
    @State private var selectedTab = 0
    @State private var bookViewMode = 0
    @State private var profileTab: String? = nil
    @State private var organizationIsActive = true
    @State private var hasSetInitialTab = false

    var body: some View {
        Group {
            if auth.isReady {
                TabView(selection: $selectedTab) {
                    HomeView(usersService: usersService,
                             scheduleService: scheduleService,
                             classesService: classesService,
                             selectedTab: $selectedTab,
                             bookViewMode: $bookViewMode,
                             profileTab: $profileTab)
                        .tabItem {
                            Label("Home", systemImage: "house.fill")
                        }
                        .tag(0)
                        .environmentObject(auth)

                    BookView(trainersService: trainersService,
                             scheduleService: scheduleService,
                             packagesService: packagesService,
                             usersService: usersService,
                             initialMode: $bookViewMode,
                             selectedTab: $selectedTab,
                             profileTab: $profileTab)
                        .tabItem {
                            Label("Book", systemImage: "calendar.badge.plus")
                        }
                        .tag(1)
                        .environmentObject(auth)

                    ProfileView(usersService: usersService,
                                packagesService: packagesService,
                                bookingsService: bookingsService,
                                scheduleService: scheduleService,
                                profileTab: $profileTab)
                        .environmentObject(auth)
                        .tabItem {
                            Label("Profile", systemImage: "person.crop.circle")
                        }
                        .tag(2)

                    MorePlaceholderView(selectedTab: $selectedTab)
                        .tabItem {
                            Label("More", systemImage: "ellipsis.circle")
                        }
                        .tag(3)
                        .environmentObject(auth)
                }
                .tint(AppTheme.primary as Color)
                .environmentObject(auth)
                .environmentObject(usersService)
                .environmentObject(scheduleService)
                .environmentObject(trainersService)
                .environmentObject(packagesService)
                .environmentObject(bookingsService)
                .environmentObject(classesService)
                .environmentObject(intakeFormService)
                // Removed subscription status from environment
                .overlay {
                    if !organizationIsActive {
                        ClientBookingBlockedView(
                            organizationName: "This business",
                            trainerName: "Trainer",
                            trainerEmail: nil,
                            trainerPhone: nil,
                            onDismiss: { organizationIsActive = true }
                        )
                    }
                }
            } else {
                VStack(spacing: Spacing.lg) {
                    ProgressView()
                        .tint(AppTheme.primary as Color)
                    Text("Starting…")
                        .font(.bodyLarge)
                        .foregroundStyle(AppTheme.textSecondary as Color)
                }
            }
        }
        .task { @MainActor in
            await auth.ensureSignedIn() // Temporary anonymous; replace with Email/Password flow
            
            // Load intake form fields once org is available
            if let orgId = auth.currentOrgId {
                await intakeFormService.loadFields(orgId: orgId, type: "private")
                await intakeFormService.loadFields(orgId: orgId, type: "class")
            }
            
            // Set initial tab based on authentication status
            if !hasSetInitialTab {
                hasSetInitialTab = true
                if auth.isAuthenticated {
                    selectedTab = 0 // Home tab
                } else {
                    selectedTab = 2 // Profile tab for sign in/register
                }
            }
            // Clients don't monitor subscription - backend enforces limits
            // Monitor organization billing status for hard blocks only
            if let orgId = auth.currentOrgId {
                
                // Monitor organization billing status
                Firestore.firestore().collection("organizations").document(orgId)
                    .addSnapshotListener { snapshot, _ in
                        let isActive: Bool = {
                            guard let data = snapshot?.data(),
                                  let billing = data["billing"] as? [String: Any] else {
                                return true
                            }
                            return billing["isActive"] as? Bool ?? true
                        }()
                        
                        // Ensure state update happens on the main actor.
                        Task { @MainActor in
                            organizationIsActive = isActive
                        }
                    }
            }
        }
    }
}

#Preview {
    AppRootView()
}
