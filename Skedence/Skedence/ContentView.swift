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
    @StateObject private var adminService = AdminService()
    @StateObject private var subscriptionStatus = SubscriptionStatusService.shared
    
    @State private var selectedTab = 0
    @State private var bookViewMode = 0
    @State private var organizationIsActive = true

    var body: some View {
        Group {
            if auth.isReady {
                if adminService.isLoading {
                    VStack(spacing: Spacing.lg) {
                        ProgressView()
                            .tint(AppTheme.primary)
                        Text("Loading…")
                            .font(.bodyLarge)
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                } else {
                    TabView(selection: $selectedTab) {
                        HomeView(usersService: usersService, 
                                scheduleService: scheduleService,
                                classesService: classesService,
                                selectedTab: $selectedTab,
                                bookViewMode: $bookViewMode)
                            .tabItem {
                                Label("Home", systemImage: "house.fill")
                            }
                            .tag(0)
                            .environmentObject(auth)

                        BookView(trainersService: trainersService,
                                 scheduleService: scheduleService,
                                 packagesService: packagesService,
                                 usersService: usersService,
                                 initialMode: $bookViewMode)
                            .tabItem {
                                Label("Book", systemImage: "calendar.badge.plus")
                            }
                            .tag(1)
                            .environmentObject(auth)

                        ProfileView(usersService: usersService,
                                    packagesService: packagesService,
                                    bookingsService: bookingsService,
                                    scheduleService: scheduleService)
                            .environmentObject(auth)
                            .tabItem {
                                Label("Profile", systemImage: "person.crop.circle")
                            }
                            .tag(2)

                        MorePlaceholderView()
                            .tabItem {
                                Label("More", systemImage: "ellipsis.circle")
                            }
                            .tag(3)
                            .environmentObject(auth)
                        
                        if adminService.isAdmin {
                            AdminPanelView()
                                .tabItem {
                                    Label("Admin", systemImage: "star.fill")
                                }
                                .tag(4)
                                .environmentObject(auth)
                        }
                    }
                    .tint(AppTheme.primary)
                    .environmentObject(auth)
                    .environmentObject(usersService)
                    .environmentObject(scheduleService)
                    .environmentObject(trainersService)
                    .environmentObject(packagesService)
                    .environmentObject(bookingsService)
                    .environmentObject(classesService)
                    .environmentObject(adminService)
                    .environmentObject(subscriptionStatus)
                    .overlay {
                        if !organizationIsActive {
                            ClientBookingBlockedView(
                                businessName: adminService.organizationName ?? "This business",
                                contactEmail: auth.userEmail ?? "",
                                contactPhone: nil
                            )
                        }
                    }
                }
            } else {
                VStack(spacing: Spacing.lg) {
                    ProgressView()
                        .tint(AppTheme.primary)
                    Text("Starting…")
                        .font(.bodyLarge)
                        .foregroundStyle(AppTheme.textSecondary)
                }
            }
        }
        .task {
            await auth.ensureSignedIn() // Temporary anonymous; replace with Email/Password flow
            // Check admin status after authentication
            await adminService.checkAdminStatus()
            // Start monitoring subscription status
            if let orgId = auth.currentOrgId {
                subscriptionStatus.monitorOrgStatus(organizationId: orgId)
                
                // Monitor organization billing status
                Firestore.firestore().collection("organizations").document(orgId)
                    .addSnapshotListener { snapshot, error in
                        guard let data = snapshot?.data(),
                              let billing = data["billing"] as? [String: Any] else {
                            organizationIsActive = true
                            return
                        }
                        organizationIsActive = billing["isActive"] as? Bool ?? true
                    }
            }
        }
    }
}

#Preview {
    AppRootView()
}
