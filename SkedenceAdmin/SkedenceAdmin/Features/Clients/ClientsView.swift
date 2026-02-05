//
//  ClientsView.swift
//  SkedenceAdmin
//
//  Created by Matthew Sprague on 10/12/25.
//

import SwiftUI

struct ClientsView: View {
    @EnvironmentObject private var dependencies: AdminAppDependencies
    @StateObject private var viewModel = ClientsViewModel()
    @State private var selectedClient: Client?
    @State private var searchText: String = ""
    
    // Convenience accessor
    private var auth: AuthManager { dependencies.auth }
    
    private var filteredClients: [Client] {
        if searchText.isEmpty {
            return viewModel.clients
        }
        return viewModel.clients.filter { client in
            client.fullName.localizedCaseInsensitiveContains(searchText) ||
            client.emailAddress.localizedCaseInsensitiveContains(searchText) ||
            client.phoneNumber.localizedCaseInsensitiveContains(searchText) ||
            (client.athleteFullName?.localizedCaseInsensitiveContains(searchText) ?? false) ||
            (client.athlete2FullName?.localizedCaseInsensitiveContains(searchText) ?? false) ||
            (client.referenceCode?.localizedCaseInsensitiveContains(searchText) ?? false)
        }
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
                    
                    // Search bar
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
            }
            .refreshable { await viewModel.load() }
            .sheet(item: $selectedClient) { client in
                ClientCardView(client: client, selectedBooking: nil)
                    .environmentObject(dependencies)
            }
        }
        .navigationViewStyle(.stack)
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
