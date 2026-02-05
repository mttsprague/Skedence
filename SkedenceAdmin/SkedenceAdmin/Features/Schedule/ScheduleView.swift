//
//  ScheduleView.swift
//  SkedenceAdmin
//
//  Created by Matthew Sprague on 10/12/25.
//

import SwiftUI
import FirebaseFirestore

struct ScheduleView: View {
    @EnvironmentObject private var dependencies: AdminAppDependencies
    @StateObject private var viewModel = ScheduleViewModel()
    
    // Convenience accessors
    private var auth: AuthManager { dependencies.auth }
    private var subscriptionStatus: SubscriptionStatusService { dependencies.subscription }

    // Sheet presentation contexts
    @State private var editorContext: ScheduleEditorContext?
    @State private var classSheetContext: ClassSheetContext?
    @State private var clientCardContext: ClientCardContext?
    @State private var sessionDetailContext: SessionDetailContext?
    @State private var showSubscriptionSheet = false

    // Options menu
    @State private var showOptions = false

    // Navigation to other schedule modes
    @State private var navigateToMyDay = false
    @State private var navigateToAllTrainersDay = false
    @State private var selectedTrainerForNav: String?
    
    // Track if we've done initial scroll to current time
    @State private var hasScrolledToCurrentTime = false

    var body: some View {
        NavigationStack {
            mainContent
                .navigationBarHidden(true)
                .onAppear {
                    AnalyticsService.shared.logScreenView(screenName: "Schedule", screenClass: "ScheduleView")
                }
        }
    }

    private func shiftWeek(by delta: Int) {
        let cal = Calendar.current
        if let newDate = cal.date(byAdding: .day, value: 7 * delta, to: viewModel.selectedDate) {
            withAnimation(.easeInOut) {
                viewModel.selectedDate = newDate
            }
        }
    }
    
    private func jumpToCurrentWeek() {
        withAnimation(.easeInOut) {
            viewModel.selectedDate = Date()
            hasScrolledToCurrentTime = false
        }
    }
    
    private func scrollToCurrentDay(scrollProxy: ScrollViewProxy) {
        // Find the exact Date instance from weekDays that matches selectedDate (same calendar day)
        let cal = Calendar.current
        let target = viewModel.weekDays.first(where: { cal.isDate($0, inSameDayAs: viewModel.selectedDate) }) ?? viewModel.selectedDate
        scrollProxy.scrollTo(target, anchor: .center)
    }
    
    private func scrollToCurrentTime(verticalScrollProxy: ScrollViewProxy) {
        guard !hasScrolledToCurrentTime else { return }
        
        let now = Date()
        let comps = Calendar.current.dateComponents([.hour], from: now)
        guard let currentHour = comps.hour else { return }
        
        // Scroll to the current hour, centered
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            withAnimation(.easeInOut(duration: 0.5)) {
                verticalScrollProxy.scrollTo("hour-\(currentHour)", anchor: .center)
            }
            hasScrolledToCurrentTime = true
        }
    }

    private func refreshSchedule() async {
        await viewModel.loadWeek()
    }
    
    private var mainContent: some View {
        VStack(spacing: 0) {
            // Show paywall banner if subscription expired/past_due
            if subscriptionStatus.isReadOnly {
                PaywallBanner(
                    message: subscriptionStatus.statusMessage ?? "Subscription expired",
                    ctaTitle: "Update Billing",
                    isDismissible: false
                ) {
                    showSubscriptionSheet = true
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
            }
            
            header
            
            WeekStrip(
                title: viewModel.weekTitle,
                weekDays: viewModel.weekDays,
                selectedDate: $viewModel.selectedDate,
                onPrevWeek: { shiftWeek(by: -1) },
                onNextWeek: { shiftWeek(by: 1) }
            )
            .padding(.top, 2)
            .padding(.bottom, 4)

            GeometryReader { geometry in
                let horizontalPaddingPerCell = ScheduleConstants.horizontalPaddingPerCell
                let totalHorizontalPadding = horizontalPaddingPerCell * 2 * 7
                let availableWidth = geometry.size.width - ScheduleConstants.timeColWidth - totalHorizontalPadding
                let calculatedDayWidth = max(10, availableWidth / 7)
                
                scheduleGrid(calculatedDayWidth: calculatedDayWidth)
            }
        }
        .modifier(ViewLifecycleModifiers(auth: auth, viewModel: viewModel))
        .modifier(SheetModifiers(
            editorContext: $editorContext,
            showOptions: $showOptions,
            navigateToMyDay: $navigateToMyDay,
            navigateToAllTrainersDay: $navigateToAllTrainersDay,
            selectedTrainerForNav: $selectedTrainerForNav,
            clientCardContext: $clientCardContext,
            showSubscriptionSheet: $showSubscriptionSheet,
            classSheetContext: $classSheetContext,
            sessionDetailContext: $sessionDetailContext,
            auth: auth,
            viewModel: viewModel,
            dependencies: dependencies
        ))
    }

    private var header: some View {
        HStack(spacing: 12) {
            // Trainer/Options selector button
            Button {
                showOptions = true
            } label: {
                HStack(spacing: 12) {
                    avatarView
                        .frame(width: 36, height: 36)

                    VStack(alignment: .leading, spacing: 2) {
                        if auth.isAdmin {
                            Text(viewModel.allTrainers.first(where: { $0.id == (viewModel.editingTrainerId ?? auth.userId) })?.displayName ?? "Select Trainer")
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(.primary)
                                .lineLimit(1)

                            HStack(spacing: 4) {
                                Text("Admin")
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                                Image(systemName: "chevron.down")
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                        } else {
                            Text(auth.trainerDisplayName ?? "My Schedule")
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(.primary)
                                .lineLimit(1)

                            Text("You")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            
            Spacer()
            
            // Add availability button
            Button {
                // Create availability at current time or next hour
                let now = Date()
                let cal = Calendar.current
                let currentHour = cal.component(.hour, from: now)
                if subscriptionStatus.canPerformAction(.createAvailability) {
                    editorContext = ScheduleEditorContext(day: now, hour: currentHour)
                }
            } label: {
                Image(systemName: "plus.circle.fill")
                    .font(.title2)
                    .foregroundStyle(AppTheme.primary)
                    .symbolRenderingMode(.hierarchical)
            }
            .buttonStyle(.plain)
            
            // Jump to current week button
            Button {
                jumpToCurrentWeek()
            } label: {
                Image(systemName: "calendar.circle.fill")
                    .font(.title2)
                    .foregroundStyle(AppTheme.primary)
                    .symbolRenderingMode(.hierarchical)
            }
            .buttonStyle(.plain)
            
            // Refresh button
            Button {
                Task {
                    await refreshSchedule()
                }
            } label: {
                Image(systemName: "arrow.clockwise.circle.fill")
                    .font(.title2)
                    .foregroundStyle(AppTheme.primary)
                    .symbolRenderingMode(.hierarchical)
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
        .padding(.top, 8)
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

    // Helpers

    private func hourLabel(_ hour: Int) -> String {
        let comps = DateComponents(calendar: Calendar.current, hour: hour)
        let date = comps.date ?? Date()
        return date.formatted(.dateTime.hour(.defaultDigits(amPM: .abbreviated)))
    }

    private func dateBySetting(hour: Int, on day: Date) -> Date {
        Calendar.current.date(bySettingHour: hour, minute: 0, second: 0, of: day) ?? day
    }

    private func currentTimeYOffset(for date: Date, firstHour: Int?, rowHeight: CGFloat, rowVerticalPadding: CGFloat) -> CGFloat? {
        guard let firstHour, let lastHour = viewModel.visibleHours.last else { return nil }
        let comps = Calendar.current.dateComponents([.hour, .minute], from: date)
        guard let hour = comps.hour, let minute = comps.minute else { return nil }
        if hour < firstHour || hour > lastHour + 1 { return nil }

        let perHourHeight = rowHeight + (rowVerticalPadding * 2)
        let initialTopPadding: CGFloat = rowVerticalPadding
        let wholeHours = CGFloat(max(0, hour - firstHour))
        let fraction = CGFloat(min(max(minute, 0), 59)) / 60.0
        return initialTopPadding + (wholeHours + fraction) * perHourHeight
    }

    private func handleSlotTap(_ slot: TrainerScheduleSlot, defaultDay: Date, defaultHour: Int) {
        // Check if this is a class booking
        if slot.isClass, let classId = slot.classId {
            // Use cached participants if available
            if let cached = viewModel.participantsByClassId[classId] {
                // Present sheet with context item
                self.classSheetContext = ClassSheetContext(
                    classId: classId,
                    className: slot.clientName ?? "Group Class",
                    participants: cached
                )
                return
            }
            
            // Fallback: Pre-load participants if not in cache (shouldn't happen normally)
            Task {
                do {
                    let participants = try await fetchParticipants(classId: classId)
                    await MainActor.run {
                        viewModel.participantsByClassId[classId] = participants
                        self.classSheetContext = ClassSheetContext(
                            classId: classId,
                            className: slot.clientName ?? "Group Class",
                            participants: participants
                        )
                    }
                } catch {
                    await MainActor.run {
                        // Show sheet anyway with empty participants list
                        self.classSheetContext = ClassSheetContext(
                            classId: classId,
                            className: slot.clientName ?? "Group Class",
                            participants: []
                        )
                    }
                }
            }
            return
        }
        
        // Handle regular client booking
        if slot.isBooked, let clientId = slot.clientId {
            // Fetch the actual booking document to get complete information
            Task {
                // First, try to get the booking from the bookings collection
                let db = Firestore.firestore()
                var booking: ClientBooking?
                
                do {
                    // Query bookings collection for this specific slot
                    let bookingsSnapshot = try await db.collection("bookings")
                        .whereField("clientUID", isEqualTo: clientId)
                        .whereField("trainerId", isEqualTo: slot.trainerId)
                        .whereField("startTime", isEqualTo: Timestamp(date: slot.startTime))
                        .limit(to: 1)
                        .getDocuments()
                    
                    if let bookingDoc = bookingsSnapshot.documents.first {
                        let data = bookingDoc.data()
                        booking = ClientBooking(
                            id: bookingDoc.documentID,
                            trainerId: slot.trainerId,
                            trainerName: auth.trainerDisplayName ?? "Trainer",
                            startTime: slot.startTime,
                            endTime: slot.endTime,
                            status: data["status"] as? String ?? "confirmed",
                            bookedAt: (data["bookedAt"] as? Timestamp)?.dateValue() ?? slot.bookedAt,
                            isClassBooking: slot.isClassBooking,
                            classId: slot.classId,
                            athleteName: data["athleteName"] as? String,
                            secondAthleteName: data["secondAthleteName"] as? String,
                            lessonNotes: data["lessonNotes"] as? String
                        )
                    }
                } catch {
                }
                
                // Fallback to basic booking info if not found
                if booking == nil {
                    booking = ClientBooking(
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
                }
                
                // Fetch client info
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
                    
                    // Show session detail view instead of client card
                    self.sessionDetailContext = SessionDetailContext(client: client, booking: booking!)
                }
            }
        } else {
            // Drive the sheet with an Identifiable item so init sees the correct values
            editorContext = ScheduleEditorContext(day: defaultDay, hour: defaultHour)
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
                  let registeredAtTimestamp = data["registeredAt"] as? Timestamp else {
                return nil
            }
            
            return ClassParticipant(
                id: doc.documentID,
                userId: userId,
                firstName: firstName,
                lastName: lastName,
                athleteName: data["athleteName"] as? String,
                registeredAt: registeredAtTimestamp.dateValue()
            )
        }
    }

    // MARK: - Extracted schedule grid pieces

    @ViewBuilder
    private func scheduleGrid(calculatedDayWidth: CGFloat) -> some View {
        ScrollArea(calculatedDayWidth: calculatedDayWidth)
            .background(Color(UIColor.systemGray6))
    }

    @ViewBuilder
    private func ScrollArea(calculatedDayWidth: CGFloat) -> some View {
        ScrollViewReader { verticalScrollProxy in
            ScrollView(.vertical, showsIndicators: true) {
                ZStack(alignment: .topLeading) {
                    HStack(spacing: 0) {
                        timeColumn
                            .frame(width: ScheduleConstants.timeColWidth)
                            .background(Color(UIColor.systemGray6))

                        dayColumns(calculatedDayWidth: calculatedDayWidth)
                            .padding(.bottom, 8)
                    }
                    
                    // Red line indicator for current time - positioned within scrollable content
                    TimelineOverlay()
                        .padding(.leading, ScheduleConstants.timeColWidth)
                }
            }
            .onAppear {
                scrollToCurrentTime(verticalScrollProxy: verticalScrollProxy)
            }
            .onChange(of: hasScrolledToCurrentTime) { _, newValue in
                if !newValue {
                    scrollToCurrentTime(verticalScrollProxy: verticalScrollProxy)
                }
            }
        }
    }

    private var timeColumn: some View {
        VStack(spacing: 0) {
            ForEach(viewModel.visibleHours, id: \.self) { hour in
                Text(hourLabel(hour))
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .frame(height: ScheduleConstants.rowHeight)
                    .background(Color(UIColor.systemGray6))
                    .padding(.vertical, ScheduleConstants.rowVerticalPadding)
                    .id("hour-\(hour)")
            }
        }
    }

    private func dayColumns(calculatedDayWidth: CGFloat) -> some View {
        HStack(spacing: ScheduleConstants.columnSpacing) {
            ForEach(viewModel.weekDays, id: \.self) { day in
                let isToday = Calendar.current.isDateInToday(day)
                VStack(spacing: 0) {
                    ForEach(viewModel.visibleHours, id: \.self) { hour in
                        HourDayCell(
                            day: day,
                            hour: hour,
                            slotsForDay: viewModel.slotsByDay[DateOnly(day)] ?? [],
                            dayColumnWidth: calculatedDayWidth,
                            rowHeight: ScheduleConstants.rowHeight,
                            horizontalPadding: 2,
                            isToday: isToday,
                            viewingTrainerId: viewModel.editingTrainerId ?? auth.userId,
                            onEmptyTap: {
                                // Check subscription status before allowing slot creation
                                if subscriptionStatus.canPerformAction(.createAvailability) {
                                    editorContext = ScheduleEditorContext(day: day, hour: hour)
                                }
                            },
                            onSlotTap: { slot in
                                handleSlotTap(slot, defaultDay: day, defaultHour: hour)
                            },
                            onSetStatus: { status in
                                Task { await viewModel.setSlotStatus(on: day, hour: hour, status: status) }
                            },
                            onClear: {
                                Task { await viewModel.clearSlot(on: day, hour: hour) }
                            }
                        )
                        .padding(.vertical, ScheduleConstants.rowVerticalPadding)
                    }
                }
                .background(isToday ? Color.blue.opacity(0.08) : Color.clear)
            }
        }
    }

    private func TimelineOverlay() -> some View {
        TimelineView(.everyMinute) { context in
            if let y = currentTimeYOffset(for: context.date,
                                          firstHour: viewModel.visibleHours.first,
                                          rowHeight: ScheduleConstants.rowHeight,
                                          rowVerticalPadding: ScheduleConstants.rowVerticalPadding) {
                Rectangle()
                    .fill(Color.red)
                    .frame(height: 2)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .offset(x: 0, y: y)
                    .accessibilityHidden(true)
            }
        }
    }
}

// MARK: - Shared helper (file scope)

private func findTrainerDocument(forUserId userId: String, orgId: String) async throws -> Trainer? {
#if canImport(FirebaseFirestore)
    let db = Firestore.firestore()
    
    
    // First try: check if trainer document ID equals the userId
    let directDoc = try? await db.collection("trainers").document(userId).getDocument()
    if let directDoc = directDoc, directDoc.exists {
    }
    
    if let directDoc = directDoc, directDoc.exists,
       let data = directDoc.data(),
       let trainerOrgId = data["orgId"] as? String,
       trainerOrgId == orgId {
        return Trainer(
            id: directDoc.documentID,
            firstName: data["firstName"] as? String,
            lastName: data["lastName"] as? String,
            email: data["email"] as? String,
            orgId: trainerOrgId
        )
    }
    
    // Second try: query trainers where email matches the user's email or another UID field
    // This handles cases where trainer doc ID doesn't match auth UID
    let userDoc = try? await db.collection("users").document(userId).getDocument()
    if userDoc?.data() != nil {
    }
    
    if let userEmail = userDoc?.data()?["email"] as? String ?? userDoc?.data()?["emailAddress"] as? String {
        let querySnapshot = try? await db.collection("trainers")
            .whereField("orgId", isEqualTo: orgId)
            .whereField("email", isEqualTo: userEmail)
            .limit(to: 1)
            .getDocuments()
        
        
        if let doc = querySnapshot?.documents.first {
            let data = doc.data()
            return Trainer(
                id: doc.documentID,
                firstName: data["firstName"] as? String,
                lastName: data["lastName"] as? String,
                email: data["email"] as? String,
                orgId: data["orgId"] as? String
            )
        }
    }
    
#endif
    return nil
}

// MARK: - View Modifiers to reduce body complexity

private struct ViewLifecycleModifiers: ViewModifier {
    let auth: AuthManager
    let viewModel: ScheduleViewModel
    
    func body(content: Content) -> some View {
        content
            .task {
                // Use trainerId from AuthManager (already resolved)
                // Fall back to userId if trainerId not available (for owners/admins)
                if let trainerId = auth.trainerId ?? auth.userId, !trainerId.isEmpty {
                    viewModel.setTrainerId(trainerId)
                }
                if let orgId = auth.currentOrgId {
                    viewModel.setOrgId(orgId)
                }
                
                // Only load if we have valid IDs
                if auth.userId != nil && auth.currentOrgId != nil {
                    await viewModel.loadWeek()
                }
                
                if auth.isAdmin {
                    await viewModel.loadAllTrainers()
                }
            }
            .onChange(of: auth.trainerId) { _, newValue in
                if let trainerId = newValue {
                    viewModel.setTrainerId(trainerId)
                }
            }
            .onChange(of: auth.userId) { _, newValue in
                // Fallback to userId if no trainerId
                if auth.trainerId == nil, let userId = newValue, !userId.isEmpty {
                    viewModel.setTrainerId(userId)
                }
            }
            .onChange(of: auth.currentOrgId) { _, newOrgId in
                viewModel.setOrgId(newOrgId)
                // Reload trainers when orgId becomes available and user is admin
                if auth.isAdmin {
                    Task {
                        await viewModel.loadAllTrainers()
                    }
                }
            }
            .onChange(of: auth.isTrainer) { _, _ in
                Task {
                    await auth.refreshTrainerProfileIfNeeded()
                    await viewModel.loadWeek()
                }
            }
            .onChange(of: auth.isAdmin) { _, isAdmin in
                if isAdmin {
                    Task {
                        await viewModel.loadAllTrainers()
                    }
                }
            }
            .onChange(of: viewModel.selectedDate) { oldValue, newValue in
                Task { await viewModel.loadWeek() }
            }
            .alert(
                "Subscription Required",
                isPresented: Binding(
                    get: { viewModel.showSlotLimitAlert },
                    set: { viewModel.showSlotLimitAlert = $0 }
                )
            ) {
                Button("Upgrade Now") {
                    // Navigate to pricing/subscription
                }
                Button("OK", role: .cancel) {}
            } message: {
                Text(viewModel.slotLimitMessage)
            }
    }
}

private struct SheetModifiers: ViewModifier {
    @Binding var editorContext: ScheduleEditorContext?
    @Binding var showOptions: Bool
    @Binding var navigateToMyDay: Bool
    @Binding var navigateToAllTrainersDay: Bool
    @Binding var selectedTrainerForNav: String?
    @Binding var clientCardContext: ClientCardContext?
    @Binding var showSubscriptionSheet: Bool
    @Binding var classSheetContext: ClassSheetContext?
    @Binding var sessionDetailContext: SessionDetailContext?
    
    let auth: AuthManager
    let viewModel: ScheduleViewModel
    let dependencies: AdminAppDependencies
    
    func body(content: Content) -> some View {
        content
            .sheet(item: $editorContext, onDismiss: {
                editorContext = nil
            }) { ctx in
                AvailabilityEditorSheet(
                    defaultDay: ctx.day,
                    defaultHour: ctx.hour,
                    isAdmin: auth.isAdmin,
                    editingTrainerId: viewModel.editingTrainerId,
                    orgId: auth.currentOrgId,
                    onSaveSingle: { day, start, end, status, applyToAllTrainers, location in
                        Task {
                            if applyToAllTrainers {
                                await viewModel.setCustomSlotForAllTrainers(on: day, startTime: start, endTime: end, status: status, location: location)
                            } else {
                                await viewModel.setCustomSlot(on: day, startTime: start, endTime: end, status: status, billingPlan: auth.billingPlan, location: location)
                            }
                            editorContext = nil
                        }
                    },
                    onSaveOngoing: { startDate, endDate, dailyStartHour, dailyEndHour, durationMinutes, daysOfWeek, status, applyToAllTrainers, location in
                        Task {
                            if applyToAllTrainers {
                                await viewModel.openAvailabilityForAllTrainers(
                                    start: startDate,
                                    end: endDate,
                                    dailyStartHour: dailyStartHour,
                                    dailyEndHour: dailyEndHour,
                                    slotDurationMinutes: durationMinutes,
                                    selectedDaysOfWeek: daysOfWeek,
                                    status: status,
                                    location: location
                                )
                            } else {
                                await viewModel.openAvailability(
                                    start: startDate,
                                    end: endDate,
                                    dailyStartHour: dailyStartHour,
                                    dailyEndHour: dailyEndHour,
                                    slotDurationMinutes: durationMinutes,
                                    selectedDaysOfWeek: daysOfWeek,
                                    status: status,
                                    location: location
                                )
                            }
                            editorContext = nil
                        }
                    },
                    onBookingCompleted: {
                        await viewModel.loadWeek()
                    }
                )
                .presentationDetents([.medium, .large])
            }
            .sheet(isPresented: $showOptions) {
                ScheduleOptionsView(
                    onMyWeek: {
                        viewModel.setMode(.myWeek)
                    },
                    onMyDay: {
                        viewModel.setMode(.myDay)
                        navigateToMyDay = true
                    },
                    onAllTrainersDay: {
                        viewModel.setMode(.allTrainersDay)
                        navigateToAllTrainersDay = true
                    },
                    onSelectTrainer: { id in
                        viewModel.setMode(.trainerDay(id))
                        selectedTrainerForNav = id
                    }
                )
                .environmentObject(dependencies)
                .presentationDetents([.medium, .large])
            }
            .navigationDestination(isPresented: $navigateToMyDay) {
                DayScheduleView(viewModel: viewModel)
                    .environmentObject(dependencies)
            }
            .navigationDestination(isPresented: $navigateToAllTrainersDay) {
                AllTrainersDayView(scheduleViewModel: viewModel)
                    .environmentObject(dependencies)
            }
            .navigationDestination(item: $selectedTrainerForNav) { trainerId in
                TrainerWeekView(trainerId: trainerId, viewModel: viewModel)
                    .environmentObject(dependencies)
            }
            .sheet(item: $clientCardContext) { context in
                ClientCardView(client: context.client, selectedBooking: context.booking)
                    .environmentObject(dependencies)
            }
            .sheet(item: $sessionDetailContext) { context in
                SessionDetailView(client: context.client, booking: context.booking)
                    .environmentObject(dependencies)
            }
            .sheet(isPresented: $showSubscriptionSheet) {
                if let orgId = auth.currentOrgId {
                    ManageSubscriptionView(orgId: orgId)
                        .environmentObject(dependencies)
                }
            }
            .sheet(item: $classSheetContext) { context in
                ClassParticipantsView(
                    classId: context.classId,
                    classTitle: context.className,
                    preloadedParticipants: context.participants
                )
                .environmentObject(dependencies)
            }
    }
}
