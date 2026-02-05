//
//  AdminAppDependencies.swift
//  SkedenceAdmin
//
//  Created by Assistant on 2/4/26.
//  Dependency Injection Container for App-Wide Services
//

import Foundation
import SwiftUI
import Combine

@MainActor
class AdminAppDependencies: ObservableObject {
    // MARK: - Core Services
    
    let auth = AuthManager()
    let admin = AdminService()
    let activation = ActivationService()
    
    // MARK: - Business Services
    
    let classes = ClassesService()
    let trainers = TrainersService()
    let packages = PackagesService()
    let locations = LocationsService()
    let settings = SettingsService()
    let pricing = PricingStructureService()
    
    // MARK: - Client & Schedule
    
    let clients = ClientsRepository()
    let schedule = ScheduleRepository()
    
    // MARK: - Stripe & Subscription
    
    let stripe = StripeCustomerService()
    let subscription = SubscriptionStatusService.shared
    let enforcement = SubscriptionEnforcementService()
    let storeKit = StoreKitManager()
    
    // MARK: - Analytics & Logging
    
    let analytics = AnalyticsService.shared
    let crashlytics = CrashlyticsService.shared
    let activity = ActivityLogger.shared
    
    // MARK: - App State
    
    @Published var selectedTab = 0
    @Published var onboardingStep: Int?
    
    // MARK: - Initialization
    
    init() {
        // Services are initialized automatically
        // Add any additional setup here if needed
    }
}
