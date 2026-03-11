//
//  SettingsView.swift
//  SkedenceAdmin
//
//  Created by Assistant on 1/16/26.
//

import SwiftUI

struct SettingsView: View {
    @EnvironmentObject private var dependencies: AdminAppDependencies
    
    // Convenience accessors
    private var auth: AuthManager { dependencies.auth }
    private var settingsService: SettingsService { dependencies.settings }
    
    @State private var minBookingHours: Int = 4
    @State private var minCancellationHours: Int = 24
    @State private var maxBookingsPerLocation: Int = 5
    @State private var isSaving = false
    @State private var showSuccessAlert = false
    
    var body: some View {
        NavigationView {
            Form {
                Section {
                    Text("Control when clients can book and cancel lessons")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                } header: {
                    Text("Booking & Cancellation Rules")
                }
                
                Section {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Booking Limit Per Location")
                            .font(.headline)
                        
                        Text("Maximum number of concurrent booked sessions allowed per location. Open time slots don't count toward this limit.")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        
                        HStack {
                            Stepper("\(maxBookingsPerLocation) sessions", value: $maxBookingsPerLocation, in: 1...20, step: 1)
                                .onChange(of: maxBookingsPerLocation) {
                                    saveSettings()
                                }
                        }
                        
                        Text("When a location reaches this limit, clients cannot book new sessions at that location until existing bookings complete.")
                            .font(.caption2)
                            .foregroundColor(.blue)
                            .italic()
                    }
                    .padding(.vertical, 4)
                } header: {
                    Text("Capacity Management")
                }
                
                Section {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Minimum Booking Notice")
                            .font(.headline)
                        
                        Text("Clients must book at least this many hours before the lesson time.")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        
                        HStack {
                            Stepper("\(minBookingHours) hours", value: $minBookingHours, in: 0...72, step: 1)
                                .onChange(of: minBookingHours) {
                                    saveSettings()
                                }
                        }
                        
                        if minBookingHours > 0 {
                            Text("Example: A 6:00 PM lesson can only be booked before \(exampleBookingCutoff)")
                                .font(.caption2)
                                .foregroundColor(.blue)
                                .italic()
                        }
                    }
                    .padding(.vertical, 4)
                } header: {
                    Text("Booking Window")
                }
                
                Section {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Minimum Cancellation Notice")
                            .font(.headline)
                        
                        Text("Clients must cancel at least this many hours before the lesson time.")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        
                        HStack {
                            Stepper("\(minCancellationHours) hours", value: $minCancellationHours, in: 0...72, step: 1)
                                .onChange(of: minCancellationHours) {
                                    saveSettings()
                                }
                        }
                        
                        if minCancellationHours > 0 {
                            Text("Example: A 6:00 PM lesson must be cancelled before \(exampleCancellationCutoff)")
                                .font(.caption2)
                                .foregroundColor(.blue)
                                .italic()
                        }
                    }
                    .padding(.vertical, 4)
                } header: {
                    Text("Cancellation Window")
                }
                
                if isSaving {
                    Section {
                        HStack {
                            Spacer()
                            ProgressView()
                            Text("Saving...")
                                .foregroundColor(.secondary)
                            Spacer()
                        }
                    }
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.large)
            .task {
                await loadSettings()
            }
            .alert("Settings Saved", isPresented: $showSuccessAlert) {
                Button("OK", role: .cancel) {}
            } message: {
                Text("Your booking and cancellation rules have been updated.")
            }
        }
    }
    
    private var exampleBookingCutoff: String {
        let calendar = Calendar.current
        let lessonTime = calendar.date(bySettingHour: 18, minute: 0, second: 0, of: Date()) ?? Date()
        let cutoff = calendar.date(byAdding: .hour, value: -minBookingHours, to: lessonTime) ?? lessonTime
        
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: cutoff)
    }
    
    private var exampleCancellationCutoff: String {
        let calendar = Calendar.current
        let lessonTime = calendar.date(bySettingHour: 18, minute: 0, second: 0, of: Date()) ?? Date()
        let cutoff = calendar.date(byAdding: .hour, value: -minCancellationHours, to: lessonTime) ?? lessonTime
        
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: cutoff)
    }
    
    private func loadSettings() async {
        guard let orgId = auth.currentOrgId else {
            return
        }
        
        await settingsService.loadSettings(orgId: orgId)
        
        if let settings = settingsService.settings {
            minBookingHours = settings.minBookingHours
            minCancellationHours = settings.minCancellationHours
            // maxBookingsPerLocation is optional in OrgSettings, coalesce to a default for UI
            maxBookingsPerLocation = settings.maxBookingsPerLocation ?? maxBookingsPerLocation
        }
    }
    
    private func saveSettings() {
        guard let orgId = auth.currentOrgId else { return }
        
        isSaving = true
        
        Task {
            let settings = OrgSettings(
                orgId: orgId,
                minBookingHours: minBookingHours,
                minCancellationHours: minCancellationHours,
                maxBookingsPerLocation: maxBookingsPerLocation
            )
            
            do {
                try await settingsService.saveSettings(settings)
                showSuccessAlert = true
            } catch {
            }
            
            isSaving = false
        }
    }
}

#Preview {
    SettingsView()
        .environmentObject(AuthManager())
}

