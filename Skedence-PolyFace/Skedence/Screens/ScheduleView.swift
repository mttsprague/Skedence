//
//  ScheduleView.swift
//  Skedence
//
//  Phase 6.2: Refactored to use LoadableView pattern
//

import SwiftUI

struct ScheduleView: View {
    @EnvironmentObject var auth: AuthManager
    @ObservedObject var scheduleService: ScheduleService

    var body: some View {
        // Phase 6.2: Create loading state from service properties
        let loadingState: LoadingState<[AvailabilitySlot]> = {
            if scheduleService.isLoading && scheduleService.upcoming.isEmpty {
                return .loading
            } else if let error = scheduleService.error {
                return .failure(error)
            } else if scheduleService.upcoming.isEmpty {
                return .idle
            } else {
                return .success(scheduleService.upcoming)
            }
        }()
        
        LoadableView(
            state: loadingState,
            emptyMessage: "No upcoming availability found"
        ) { slots in
            List {
                ForEach(slots) { slot in
                    SessionRow(slot: slot)
                        .listRowSeparator(.hidden)
                        .listRowBackground(Color.clear)
                }
            }
            .listStyle(.plain)
        }
        .navigationTitle("Schedule")
        .task {
            if scheduleService.upcoming.isEmpty, let orgId = auth.currentOrgId {
                await scheduleService.loadUpcoming(orgId: orgId)
            }
        }
        .refreshable {
            if let orgId = auth.currentOrgId {
                await scheduleService.loadUpcoming(orgId: orgId)
            }
        }
    }
}

private struct SessionRow: View {
    let slot: AvailabilitySlot

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 10)
                    .fill(Brand.primary.opacity(0.12))
                Image(systemName: "calendar")
                    .foregroundStyle(Brand.primary)
            }
            .frame(width: 36, height: 36)

            VStack(alignment: .leading, spacing: 4) {
                Text(slot.displayTitle)
                    .font(.headline)
                    .foregroundStyle(.primary)

                Text("\(slot.startTime.formatted(.dateTime.weekday(.abbreviated).month(.abbreviated).day())) • \(slot.startTime.formatted(date: .omitted, time: .shortened))–\(slot.endTime.formatted(date: .omitted, time: .shortened))")
                    .foregroundStyle(.secondary)

                if let status = slot.status?.capitalized {
                    Text(status)
                        .font(.caption)
                        .foregroundStyle(status.lowercased() == "open" ? .green : .secondary)
                }
            }

            Spacer()

            Image(systemName: "chevron.right")
                .foregroundStyle(.secondary)
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.platformBackground)
                .shadow(color: .black.opacity(0.06), radius: 10, x: 0, y: 4)
        )
    }
}
