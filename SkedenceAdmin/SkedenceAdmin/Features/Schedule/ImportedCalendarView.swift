//
//  ImportedCalendarView.swift
//  SkedenceAdmin
//
//  Shows imported Google Calendar events for the selected week.
//  Only events from admin-visible sources are displayed.
//

import SwiftUI
import FirebaseFirestore

// MARK: - Private Data Models

private struct ICSource {
    let id: String
    let googleCalendarId: String
    let displayName: String
    let color: Color
}

private struct ICEvent: Identifiable {
    let id: String
    let title: String
    let startTime: Date
    let endTime: Date
    let isAllDay: Bool
    let color: Color
    let location: String?
}

// MARK: - Main View

struct ImportedCalendarView: View {
    @EnvironmentObject private var dependencies: AdminAppDependencies
    @Environment(\.dismiss) private var dismiss
    private var auth: AuthManager { dependencies.auth }

    @State private var selectedDate: Date = Date()
    @State private var weekDays: [Date] = []
    @State private var sources: [ICSource] = []
    @State private var events: [ICEvent] = []
    @State private var isLoading = false
    @State private var selectedEvent: ICEvent? = nil

    private let visibleHours: [Int] = Array(6...22)

    private var calendarTitle: String {
        auth.importedCalendarTitle ?? "Imported Calendar"
    }

    private var weekTitle: String {
        guard let first = weekDays.first, let last = weekDays.last else { return "" }
        let cal = Calendar.current
        let sameMonth = cal.component(.month, from: first) == cal.component(.month, from: last)
        let sameYear  = cal.component(.year,  from: first) == cal.component(.year,  from: last)
        let startFmt = DateFormatter()
        let endFmt   = DateFormatter()
        if sameYear {
            if sameMonth {
                startFmt.setLocalizedDateFormatFromTemplate("MMM d")
                endFmt.setLocalizedDateFormatFromTemplate("d, yyyy")
            } else {
                startFmt.setLocalizedDateFormatFromTemplate("MMM d")
                endFmt.setLocalizedDateFormatFromTemplate("MMM d, yyyy")
            }
        } else {
            startFmt.setLocalizedDateFormatFromTemplate("MMM d, yyyy")
            endFmt.setLocalizedDateFormatFromTemplate("MMM d, yyyy")
        }
        return "\(startFmt.string(from: first)) – \(endFmt.string(from: last))"
    }

    var body: some View {
        VStack(spacing: 0) {
            header

            WeekStrip(
                title: weekTitle,
                weekDays: weekDays,
                selectedDate: $selectedDate,
                onPrevWeek: { shiftWeek(by: -1) },
                onNextWeek: { shiftWeek(by: 1) }
            )
            .padding(.top, 2)
            .padding(.bottom, 4)

            // Grid is always mounted so GeometryReader never gets removed from the hierarchy.
            // Empty state and spinner are overlaid on top.
            ZStack {
                calendarGrid

                if !isLoading && events.isEmpty && !weekDays.isEmpty {
                    emptyState
                }

                if isLoading {
                    VStack {
                        ProgressView()
                            .padding(10)
                            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 10))
                        Spacer()
                    }
                    .padding(.top, 24)
                }
            }
        }
        .navigationBarHidden(true)
        // Swipe left/right to change week — simultaneousGesture lets vertical scroll still work
        .simultaneousGesture(
            DragGesture(minimumDistance: 40)
                .onEnded { value in
                    let h = value.translation.width
                    let v = value.translation.height
                    // Only act on predominantly horizontal swipes
                    guard abs(h) > abs(v) * 1.5 else { return }
                    if h < -40 { shiftWeek(by: 1) }
                    else if h >  40 { shiftWeek(by: -1) }
                }
        )
        .task {
            buildWeek(anchor: Date())
            await loadData(for: Date())
        }
        .onChange(of: selectedDate) { _, newDate in
            buildWeek(anchor: newDate)
            Task { await loadData(for: newDate) }
        }
        .sheet(item: $selectedEvent) { event in
            ICEventDetailSheet(event: event)
                .presentationDetents([.medium])
        }
    }

    // MARK: - Header

    private var header: some View {
        HStack(spacing: 12) {
            Button { dismiss() } label: {
                Image(systemName: "chevron.left")
                    .font(.title3.weight(.semibold))
                    .foregroundStyle(.primary)
            }
            .buttonStyle(.plain)

            VStack(alignment: .leading, spacing: 2) {
                Text(calendarTitle)
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(.primary)
                    .lineLimit(1)
                Text("Imported Calendar")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            // Jump to today
            Button {
                let now = Date()
                buildWeek(anchor: now)
                selectedDate = now
            } label: {
                Image(systemName: "calendar.circle.fill")
                    .font(.title2)
                    .foregroundStyle(AppTheme.primary)
                    .symbolRenderingMode(.hierarchical)
            }
            .buttonStyle(.plain)

            // Refresh
            Button {
                Task { await loadData(for: selectedDate) }
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

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 14) {
            Spacer()
            Image(systemName: "calendar.badge.exclamationmark")
                .font(.system(size: 44))
                .foregroundStyle(.secondary)
            Text("No events this week")
                .font(.headline)
                .foregroundStyle(.secondary)
            Text("Sync your calendar on the web portal, or check that at least one calendar source is enabled.")
                .font(.caption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
            Spacer()
        }
    }

    // MARK: - Calendar Grid

    private var calendarGrid: some View {
        ICGridContent(
            events: events,
            weekDays: weekDays,
            onEventTap: { selectedEvent = $0 }
        )
    }

    // MARK: - Week Helpers

    private func buildWeek(anchor: Date) {
        let cal = Calendar.current
        let start = cal.date(from: cal.dateComponents([.yearForWeekOfYear, .weekOfYear], from: anchor)) ?? anchor
        weekDays = (0..<7).compactMap { cal.date(byAdding: .day, value: $0, to: start) }
    }

    private func shiftWeek(by delta: Int) {
        if let newDate = Calendar.current.date(byAdding: .day, value: 7 * delta, to: selectedDate) {
            withAnimation(.easeInOut) { selectedDate = newDate }
        }
    }

    // MARK: - Firestore

    private func loadData(for date: Date) async {
        guard let orgId = auth.currentOrgId else { return }
        isLoading = true
        defer { isLoading = false }

        let db = Firestore.firestore()
        // 1. Load & filter visible sources
        do {
            let snap = try await db.collection("organizations").document(orgId)
                .collection("importedCalendarSources")
                .getDocuments()
            sources = snap.documents.compactMap { doc in
                let data = doc.data()
                guard data["visible"] as? Bool ?? true else { return nil }
                let colorHex = data["color"] as? String ?? "#3B82F6"
                return ICSource(
                    id: doc.documentID,
                    googleCalendarId: data["googleCalendarId"] as? String ?? doc.documentID,
                    displayName: data["displayName"] as? String
                        ?? data["googleName"] as? String
                        ?? doc.documentID,
                    color: Color(hex: colorHex) ?? .blue
                )
            }
        } catch {
            print("ImportedCalendarView: failed to load sources – \(error)")
        }

        let visibleIds = Set(sources.map(\.googleCalendarId))
        guard !visibleIds.isEmpty else { events = []; return }

        // 2. Load events for the week
        let cal = Calendar.current
        let weekStart = cal.date(from: cal.dateComponents([.yearForWeekOfYear, .weekOfYear], from: date)) ?? date
        let weekEnd   = cal.date(byAdding: .day, value: 7, to: weekStart) ?? date

        do {
            let snap = try await db.collection("organizations").document(orgId)
                .collection("importedEvents")
                .whereField("startTime", isGreaterThanOrEqualTo: Timestamp(date: weekStart))
                .whereField("startTime", isLessThan: Timestamp(date: weekEnd))
                .getDocuments()

            events = snap.documents.compactMap { doc in
                let data = doc.data()
                guard
                    let startTs = data["startTime"] as? Timestamp,
                    let endTs   = data["endTime"]   as? Timestamp
                else { return nil }

                let srcId = data["sourceCalendarId"] as? String ?? ""
                guard visibleIds.contains(srcId) else { return nil }

                let src         = sources.first { $0.googleCalendarId == srcId }
                let fallbackHex = data["color"] as? String ?? "#3B82F6"
                let color       = src?.color ?? Color(hex: fallbackHex) ?? .blue

                return ICEvent(
                    id: doc.documentID,
                    title: data["title"] as? String ?? "Event",
                    startTime: startTs.dateValue(),
                    endTime:   endTs.dateValue(),
                    isAllDay:  data["isAllDay"] as? Bool ?? false,
                    color:     color,
                    location:  data["location"] as? String
                )
            }
        } catch {
            print("ImportedCalendarView: failed to load events – \(error)")
        }
    }
}

// MARK: - Grid Content

/// Separate view so `GeometryReader` is sized by its parent (the non-zero-height ZStack),
/// not the other way round. This prevents the top half of the screen being consumed.
private struct ICGridContent: View {
    let events: [ICEvent]
    let weekDays: [Date]
    let onEventTap: (ICEvent) -> Void

    private let visibleHours: [Int] = Array(6...22)

    private var allDayEvents: [ICEvent] { events.filter { $0.isAllDay } }
    private var timedEvents:  [ICEvent] { events.filter { !$0.isAllDay } }

    var body: some View {
        GeometryReader { geometry in
            let hPad = ScheduleConstants.horizontalPaddingPerCell
            let totalHPad = hPad * 2 * CGFloat(weekDays.count)
            let availableWidth = geometry.size.width - ScheduleConstants.timeColWidth - totalHPad
            let dayWidth = max(10, availableWidth / CGFloat(weekDays.count))
            let perHourHeight = ScheduleConstants.rowHeight + ScheduleConstants.rowVerticalPadding * 2

            VStack(spacing: 0) {
                // All-day strip — exactly one row tall, never grows
                if !allDayEvents.isEmpty {
                    allDayStrip(dayWidth: dayWidth, hPad: hPad)
                        .frame(height: 26)
                        .padding(.bottom, 4)
                }

                // Scrollable timed grid
                ScrollViewReader { vertProxy in
                    ScrollView(.vertical, showsIndicators: true) {
                        HStack(spacing: 0) {
                            timeColumn
                                .frame(width: ScheduleConstants.timeColWidth)

                            HStack(spacing: ScheduleConstants.columnSpacing) {
                                ForEach(weekDays, id: \.self) { day in
                                    dayColumn(
                                        day: day,
                                        dayWidth: dayWidth,
                                        hPad: hPad,
                                        perHourHeight: perHourHeight
                                    )
                                    .frame(width: dayWidth + hPad * 2)
                                }
                            }
                        }
                        .padding(.bottom, 8)
                    }
                    .onAppear { scrollToCurrentTime(proxy: vertProxy) }
                }
            }
        }
    }

    // MARK: All-day strip

    private func allDayStrip(dayWidth: CGFloat, hPad: CGFloat) -> some View {
        HStack(spacing: 0) {
            Color.clear.frame(width: ScheduleConstants.timeColWidth)
            HStack(spacing: ScheduleConstants.columnSpacing) {
                ForEach(weekDays, id: \.self) { day in
                    let first = allDayEvents.first { Calendar.current.isDate($0.startTime, inSameDayAs: day) }
                    ZStack {
                        if let event = first {
                            Button { onEventTap(event) } label: {
                                Text(event.title)
                                    .font(.caption2.weight(.medium))
                                    .foregroundStyle(.white)
                                    .lineLimit(1)
                                    .padding(.horizontal, 3)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .frame(maxHeight: .infinity)
                                    .background(event.color.opacity(0.9), in: RoundedRectangle(cornerRadius: 4))
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .frame(width: dayWidth + hPad * 2)
                }
            }
        }
    }

    // MARK: Time column

    private var timeColumn: some View {
        VStack(spacing: 0) {
            ForEach(visibleHours, id: \.self) { hour in
                Text(hourLabel(hour))
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .frame(height: ScheduleConstants.rowHeight)
                    .padding(.vertical, ScheduleConstants.rowVerticalPadding)
                    .id("hour-\(hour)")
            }
        }
    }

    // MARK: Day column

    private func dayColumn(day: Date, dayWidth: CGFloat, hPad: CGFloat, perHourHeight: CGFloat) -> some View {
        let isToday  = Calendar.current.isDateInToday(day)
        let dayTimed = timedEvents.filter { Calendar.current.isDate($0.startTime, inSameDayAs: day) }

        return ZStack(alignment: .topLeading) {
            // Background hour grid
            VStack(spacing: 0) {
                ForEach(visibleHours, id: \.self) { _ in
                    Rectangle()
                        .fill(isToday ? Color.blue.opacity(0.04) : Color.clear)
                        .frame(height: ScheduleConstants.rowHeight)
                        .overlay(
                            Rectangle()
                                .fill(Color.gray.opacity(0.12))
                                .frame(height: 0.5),
                            alignment: .bottom
                        )
                        .padding(.vertical, ScheduleConstants.rowVerticalPadding)
                }
            }
            .allowsHitTesting(false)

            // Absolutely-positioned timed events
            ForEach(dayTimed) { event in
                let yOff = eventYOffset(event: event, perHourHeight: perHourHeight)
                let h    = eventHeight(event: event, perHourHeight: perHourHeight)
                Button { onEventTap(event) } label: {
                    VStack(alignment: .leading, spacing: 1) {
                        Text(event.title)
                            .font(.caption2.weight(.semibold))
                            .foregroundStyle(.white)
                            .lineLimit(3)
                            .multilineTextAlignment(.leading)
                        if let loc = event.location, !loc.isEmpty, h > 40 {
                            Text(loc)
                                .font(.caption2)
                                .foregroundStyle(.white.opacity(0.8))
                                .lineLimit(1)
                        }
                    }
                    .padding(.horizontal, 4)
                    .padding(.vertical, 3)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                    .background(event.color, in: RoundedRectangle(cornerRadius: 6))
                }
                .buttonStyle(.plain)
                .frame(width: dayWidth - 2, height: max(18, h))
                .offset(x: 1, y: yOff)
            }
        }
        .padding(.horizontal, hPad)
        .clipped()
    }

    // MARK: Layout helpers

    private func eventYOffset(event: ICEvent, perHourHeight: CGFloat) -> CGFloat {
        let cal    = Calendar.current
        let hour   = cal.component(.hour,   from: event.startTime)
        let minute = cal.component(.minute, from: event.startTime)
        let hourOffset = max(0, hour - 6)
        return CGFloat(hourOffset) * perHourHeight
            + CGFloat(minute) / 60.0 * ScheduleConstants.rowHeight
            + ScheduleConstants.rowVerticalPadding
    }

    private func eventHeight(event: ICEvent, perHourHeight: CGFloat) -> CGFloat {
        let duration = max(900, event.endTime.timeIntervalSince(event.startTime))
        return CGFloat(duration / 3600.0) * perHourHeight
    }

    private func scrollToCurrentTime(proxy: ScrollViewProxy) {
        let hour   = Calendar.current.component(.hour, from: Date())
        let target = max(6, min(22, hour))
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
            withAnimation(.easeInOut(duration: 0.5)) {
                proxy.scrollTo("hour-\(target)", anchor: .center)
            }
        }
    }

    private func hourLabel(_ hour: Int) -> String {
        let comps = DateComponents(calendar: .current, hour: hour)
        let date  = comps.date ?? Date()
        return date.formatted(.dateTime.hour(.defaultDigits(amPM: .abbreviated)))
    }
}

// MARK: - Event Detail Sheet

private struct ICEventDetailSheet: View {
    let event: ICEvent
    @Environment(\.dismiss) private var dismiss

    private let timeFmt: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "h:mm a"
        return f
    }()

    private let dateFmt: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "EEEE, MMMM d"
        return f
    }()

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Color accent bar + title
            HStack(alignment: .top, spacing: 12) {
                RoundedRectangle(cornerRadius: 3)
                    .fill(event.color)
                    .frame(width: 6)
                    .frame(minHeight: 44)

                VStack(alignment: .leading, spacing: 6) {
                    Text(event.title)
                        .font(.title3.weight(.bold))
                        .fixedSize(horizontal: false, vertical: true)

                    if event.isAllDay {
                        Label(dateFmt.string(from: event.startTime) + " · All day",
                              systemImage: "calendar")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    } else {
                        Label(
                            "\(dateFmt.string(from: event.startTime))  \(timeFmt.string(from: event.startTime)) – \(timeFmt.string(from: event.endTime))",
                            systemImage: "clock"
                        )
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    }
                }
            }
            .padding(.horizontal, 24)
            .padding(.top, 28)

            if let location = event.location, !location.isEmpty {
                Divider().padding(.horizontal, 24).padding(.top, 16)
                Label(location, systemImage: "mappin.circle.fill")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 24)
                    .padding(.top, 12)
            }

            Spacer()

            Button {
                dismiss()
            } label: {
                Text("Dismiss")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 14))
            }
            .buttonStyle(.plain)
            .padding(.horizontal, 24)
            .padding(.bottom, 28)
        }
    }
}
