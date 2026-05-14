//
//  DayScheduleView.swift
//  SkedenceAdmin
//
//  Created by Assistant on 10/14/25.
//

import SwiftUI
import FirebaseFirestore

struct DayScheduleView: View {
    @EnvironmentObject private var dependencies: AdminAppDependencies
    private var auth: AuthManager { dependencies.auth }
    @ObservedObject var viewModel: ScheduleViewModel
    
    // Sheet presentation contexts
    @State private var clientCardContext: ClientCardContext?
    @State private var selectedClassId: String?
    @State private var selectedClassName: String?
    @State private var preloadedParticipants: [ClassParticipant]?
    @State private var classParticipantsShown: Bool = false
    @State private var hasScrolledToCurrentTime = false
    @State private var showDeleteUnavailableAlert = false
    @State private var pendingDeleteSlot: TrainerScheduleSlot?

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Header with trainer info
                HStack(spacing: 12) {
                    avatarView
                        .frame(width: 36, height: 36)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(auth.trainerDisplayName ?? "My Day")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(.primary)
                            .lineLimit(1)

                        if auth.isAuthenticated {
                            Text("You")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                    }

                    Spacer()
                }
                .padding(.horizontal)
                .padding(.vertical, 8)
                .padding(.top, 8)

                // Selected date title with navigation
                HStack {
                    Button {
                        shiftDay(by: -1)
                    } label: {
                        Image(systemName: "chevron.left")
                            .font(.body)
                            .foregroundStyle(.primary)
                    }
                    .buttonStyle(.plain)
                    
                    Spacer()
                    
                    Text(viewModel.selectedDate.formatted(.dateTime.weekday(.wide).month(.abbreviated).day().year()))
                        .font(.headline)
                    
                    Spacer()
                    
                    Button {
                        shiftDay(by: 1)
                    } label: {
                        Image(systemName: "chevron.right")
                            .font(.body)
                            .foregroundStyle(.primary)
                    }
                    .buttonStyle(.plain)
                }
                .padding(.horizontal)
                .padding(.bottom, 8)

                // Simple hour-by-hour list for the selected day
                ScrollViewReader { scrollProxy in
                    List {
                        ForEach(viewModel.visibleHours, id: \.self) { hour in
                            let day = viewModel.selectedDate
                            let slotsForDay = viewModel.slotsByDay[DateOnly(day)] ?? []
                            let cellStart = Calendar.current.date(bySettingHour: hour, minute: 0, second: 0, of: day) ?? day
                            let cellEnd = Calendar.current.date(byAdding: .hour, value: 1, to: cellStart) ?? cellStart.addingTimeInterval(3600)
                            let matching = slotsForDay.filter { $0.startTime < cellEnd && $0.endTime > cellStart }
                            
                            // Check if current time is in this hour
                            let now = Date()
                            let isCurrentHour = Calendar.current.isDateInToday(viewModel.selectedDate) && 
                                               Calendar.current.component(.hour, from: now) == hour
                            let currentMinute = Calendar.current.component(.minute, from: now)
                            let minuteProgress = isCurrentHour ? CGFloat(currentMinute) / 60.0 : 0

                            HStack {
                                Text(hourLabel(hour))
                                    .font(.body)
                                    .foregroundStyle(.secondary)

                                Divider()
                                    .padding(.horizontal, 4)

                                if let slot = matching.first {
                                    HStack(spacing: 8) {
                                        VStack(spacing: 2) {
                                            Text(slot.displayTitle)
                                                .font(.caption2.weight(.medium))
                                                .foregroundStyle(.white)
                                                .lineLimit(2)
                                        }
                                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                                        .padding(.vertical, 4)
                                        .padding(.horizontal, 8)
                                        .background(
                                            RoundedRectangle(cornerRadius: 8)
                                                .fill(slot.visualColor(viewingTrainerId: auth.userId))
                                        )
                                    }
                                    .onTapGesture {
                                        handleSlotTap(slot)
                                    }
                                } else {
                                    Text("No events")
                                        .font(.callout)
                                        .foregroundStyle(.tertiary)
                                }

                                Spacer()
                            }
                            .contentShape(Rectangle())
                            .overlay(alignment: .leading) {
                                // Red line at current time
                                if isCurrentHour {
                                    GeometryReader { geo in
                                        HStack(spacing: 0) {
                                            Circle()
                                                .fill(.red)
                                                .frame(width: 10, height: 10)
                                            Rectangle()
                                                .fill(.red)
                                                .frame(height: 2)
                                        }
                                        .offset(y: geo.size.height * minuteProgress)
                                    }
                                    .allowsHitTesting(false)
                                }
                            }
                            .id(hour)
                        }
                    }
                    .listStyle(.plain)
                    .onAppear {
                        scrollToCurrentTime(scrollProxy: scrollProxy)
                    }
                    .onChange(of: hasScrolledToCurrentTime) { _, newValue in
                        if !newValue {
                            scrollToCurrentTime(scrollProxy: scrollProxy)
                        }
                    }
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Text("My Day")
                        .font(.headline)
                }
            }
            .sheet(item: $clientCardContext) { context in
                ClientCardView(client: context.client, selectedBooking: context.booking)
                    .environmentObject(dependencies)
            }
            .sheet(isPresented: $classParticipantsShown) {
                if let classId = selectedClassId, let className = selectedClassName {
                    ClassParticipantsView(
                        classId: classId,
                        classTitle: className,
                        preloadedParticipants: preloadedParticipants
                    )
                    .environmentObject(dependencies)
                }
            }
            .onAppear {
                // Reload schedule data whenever view appears (e.g., after switching tabs)
                Task {
                    if auth.userId != nil && auth.currentOrgId != nil {
                        await viewModel.loadWeek()
                    }
                }
            }
            .refreshable {
                // Pull to refresh
                await viewModel.loadWeek()
            }
            .confirmationDialog(
                "Delete Unavailability",
                isPresented: $showDeleteUnavailableAlert,
                titleVisibility: .visible
            ) {
                Button("Delete", role: .destructive) {
                    if let slot = pendingDeleteSlot {
                        deleteUnavailableSlot(slot)
                    }
                    pendingDeleteSlot = nil
                }
                Button("Cancel", role: .cancel) {
                    pendingDeleteSlot = nil
                }
            } message: {
                Text("This will remove the unavailability block and restore the slot to empty.")
            }
        }
        .navigationViewStyle(.stack)
    }
    
    private func shiftDay(by delta: Int) {
        let cal = Calendar.current
        if let newDate = cal.date(byAdding: .day, value: delta, to: viewModel.selectedDate) {
            withAnimation(.easeInOut) {
                viewModel.selectedDate = newDate
            }
        }
    }
    
    private func scrollToCurrentTime(scrollProxy: ScrollViewProxy) {
        guard !hasScrolledToCurrentTime else { return }
        guard Calendar.current.isDateInToday(viewModel.selectedDate) else { return }
        
        let now = Date()
        let comps = Calendar.current.dateComponents([.hour], from: now)
        guard let currentHour = comps.hour else { return }
        
        // Scroll to the current hour, centered
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            withAnimation(.easeInOut(duration: 0.5)) {
                scrollProxy.scrollTo(currentHour, anchor: .center)
            }
            hasScrolledToCurrentTime = true
        }
    }
    
    private func handleSlotTap(_ slot: TrainerScheduleSlot) {
        // Check if this is a class booking
        if slot.isClass, let classId = slot.classId {
            // Use cached participants if available
            if let cached = viewModel.participantsByClassId[classId] {
                selectedClassId = classId
                selectedClassName = slot.clientName ?? "Group Class"
                preloadedParticipants = cached
                classParticipantsShown = true
                return
            }
            
            // Fetch participants BEFORE showing sheet
            Task {
                do {
                    let participants = try await fetchParticipants(classId: classId)
                    await MainActor.run {
                        viewModel.participantsByClassId[classId] = participants
                        selectedClassId = classId
                        selectedClassName = slot.clientName ?? "Group Class"
                        preloadedParticipants = participants
                        classParticipantsShown = true
                    }
                } catch {
                    await MainActor.run {
                        selectedClassId = classId
                        selectedClassName = slot.clientName ?? "Group Class"
                        preloadedParticipants = []
                        classParticipantsShown = true
                    }
                }
            }
            return
        }
        
        // Handle regular client booking
        if slot.isBooked, let clientId = slot.clientId {
            // Check cache first
            if let cached = viewModel.clientsById[clientId] {
                let booking = ClientBooking(
                    id: slot.id,
                    trainerId: slot.trainerId,
                    trainerName: auth.trainerDisplayName ?? "Trainer",
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    status: "confirmed",
                    bookedAt: slot.bookedAt,
                    isClassBooking: slot.isClassBooking,
                    classId: slot.classId
                )
                self.clientCardContext = ClientCardContext(client: cached, booking: booking)
                return
            }

            // Fetch data BEFORE showing sheet
            Task {
                let fetched = try? await FirestoreService.shared.fetchClient(by: clientId)
                await MainActor.run {
                    let client = fetched ?? Client(
                        id: clientId,
                        firstName: slot.clientName ?? "Booked",
                        lastName: "",
                        emailAddress: "",
                        phoneNumber: "",
                        photoURL: nil
                    )
                    
                    if let fetched = fetched {
                        viewModel.clientsById[clientId] = fetched
                    }
                    
                    let booking = ClientBooking(
                        id: slot.id,
                        trainerId: slot.trainerId,
                        trainerName: auth.trainerDisplayName ?? "Trainer",
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                        status: "confirmed",
                        bookedAt: slot.bookedAt,
                        isClassBooking: slot.isClassBooking,
                        classId: slot.classId
                    )
                    
                    self.clientCardContext = ClientCardContext(client: client, booking: booking)
                }
            }
        }

        if slot.status == .unavailable {
            // Org-wide admin unavailability is read-only for non-creator trainers
            if slot.isOrgWide == true && slot.createdById != auth.userId && !auth.isAdmin {
                return
            }
            pendingDeleteSlot = slot
            showDeleteUnavailableAlert = true
        }
    }

    private func deleteUnavailableSlot(_ slot: TrainerScheduleSlot) {
        Task {
            do {
                try await FirestoreService.shared.deleteTrainerSlot(trainerId: slot.trainerId, startTime: slot.startTime)
                await viewModel.loadWeek()
            } catch {
                // Silently ignore — slot may already be gone
            }
        }
    }

    private func fetchParticipants(classId: String) async throws -> [ClassParticipant] {
        guard !classId.isEmpty else {
            return []
        }
        
        let db = Firestore.firestore()
        let snapshot = try await db.collection("classes")
            .document(classId)
            .collection("participants")
            .order(by: "registeredAt", descending: false)
            .getDocuments()
        
        return snapshot.documents.compactMap { (doc) -> ClassParticipant? in
            let data = doc.data()
            guard let userId = data["userId"] as? String,
                  let firstName = data["firstName"] as? String,
                  let lastName = data["lastName"] as? String,
                  let timestamp = data["registeredAt"] as? Timestamp else {
                return nil
            }
            
            return ClassParticipant(
                id: doc.documentID,
                userId: userId,
                firstName: firstName,
                lastName: lastName,
                athleteName: data["athleteName"] as? String,
                registeredAt: timestamp.dateValue(),
                checkedIn: data["checkedIn"] as? Bool ?? false,
                checkedInAt: (data["checkedInAt"] as? Timestamp)?.dateValue()
            )
        }
    }

    @ViewBuilder
    private var avatarView: some View {
        if let urlString = auth.trainerPhotoURLString, let url = URL(string: urlString) {
            AsyncImage(url: url) { phase in
                switch phase {
                case .empty:
                    Circle().fill(Color.gray.opacity(0.2))
                        .overlay(ProgressView())
                case .success(let image):
                    image
                        .resizable()
                        .scaledToFill()
                        .clipShape(Circle())
                case .failure:
                    Circle().fill(Color.gray.opacity(0.2))
                        .overlay(Image(systemName: "person.crop.circle.fill").font(.system(size: 20)).foregroundStyle(.secondary))
                @unknown default:
                    Circle().fill(Color.gray.opacity(0.2))
                }
            }
        } else {
            Circle()
                .fill(Color.gray.opacity(0.2))
                .overlay(
                    Image(systemName: "person.crop.circle.fill")
                        .font(.system(size: 20))
                        .foregroundStyle(.secondary)
                )
        }
    }

    private func hourLabel(_ hour: Int) -> String {
        let comps = DateComponents(calendar: Calendar.current, hour: hour)
        let date = comps.date ?? Date()
        return date.formatted(.dateTime.hour(.defaultDigits(amPM: .abbreviated)))
    }
}

#Preview {
    DayScheduleView(viewModel: ScheduleViewModel())
        .environmentObject(AuthManager())
}
