//
//  LocationsTabView.swift
//  SkedenceAdmin
//
//  Created by refactoring from AdminPanelView
//  Phase 1.1: AdminPanelView decomposition
//

import SwiftUI

struct LocationsTabView: View {
    @EnvironmentObject private var dependencies: AdminAppDependencies
    
    private var auth: AuthManager { dependencies.auth }
    @ObservedObject var locationsService: LocationsService
    
    @Binding var locationToEdit: Location?
    @Binding var showingAddLocation: Bool
    @Binding var alertItem: AlertItem?
    
    let organizationBilling: OrganizationBilling?
    
    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.lg) {
            ForEach(Array(locationsService.locations.enumerated()), id: \.element.id) { index, location in
                LocationCard(
                    location: location,
                    onEdit: {
                        locationToEdit = location
                        showingAddLocation = true
                    },
                    onDelete: {
                        Task {
                            do {
                                try await locationsService.deleteLocation(location)
                            } catch {
                                alertItem = AlertItem(title: "Error", message: "Failed to delete location: \(error.localizedDescription)")
                            }
                        }
                    }
                )
                .padding(.horizontal, Spacing.lg)
            }
            
            if canAddMoreLocations {
                Button {
                    locationToEdit = nil
                    showingAddLocation = true
                } label: {
                    HStack {
                        Image(systemName: "plus.circle.fill")
                            .font(.title3)
                        Text("Add Location")
                            .font(.bodyMedium.weight(.semibold))
                    }
                    .foregroundStyle(AppTheme.primary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Spacing.md)
                    .background(AppTheme.primaryLight.opacity(0.1))
                    .cornerRadius(12)
                }
                .padding(.horizontal, Spacing.lg)
            } else {
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    Text("Location Limit Reached")
                        .font(.headingSmall)
                        .foregroundStyle(AppTheme.textPrimary)
                    
                    Text("Upgrade your subscription to add more locations")
                        .font(.bodyMedium)at skedence.com to add more locations")
                        .font(.bodyMedium)
                        .foregroundStyle(AppTheme.textSecondary)
                .padding(Spacing.lg)
                .background(Color(UIColor.systemGray6))
                .cornerRadius(12)
                .padding(.horizontal, Spacing.lg)
            }
        }
        .padding(.top, Spacing.md)
    }
    
    private var canAddMoreLocations: Bool {
        guard let billing = organizationBilling else { return false }
        let plan = PricingPlan.allPlans.first(where: { $0.id == billing.plan }) ?? PricingPlan.starter
        return locationsService.locations.count < plan.locationLimit
    }
}
