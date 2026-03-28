//
//  RescheduleBookingSheet.swift
//  SkedenceAdmin
//

import SwiftUI

#if canImport(FirebaseFirestore)
import FirebaseFirestore
#endif

struct RescheduleBookingSheet: View {
    let booking: ClientBooking
    let orgId: String
    let onSuccess: () -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var trainers: [Trainer] = []
    @State private var selectedTrainerId: String
    @State private var newDate: Date
    @State private var newStartTime: Date
    @State private var newEndTime: Date
    @State private var isLoadingTrainers = false
    @State private var isRescheduling = false
    @State private var showConfirmation = false
    @State private var errorMessage: String? = nil

    init(booking: ClientBooking, orgId: String, onSuccess: @escaping () -> Void) {
        self.booking = booking
        self.orgId = orgId
        self.onSuccess = onSuccess
        _selectedTrainerId = State(initialValue: booking.trainerId)

        // Default to same time, 7 days from now
        let nextWeek = Calendar.current.date(byAdding: .day, value: 7, to: booking.startTime) ?? booking.startTime
        _newDate = State(initialValue: nextWeek)
        _newStartTime = State(initialValue: nextWeek)
        let duration = booking.endTime.timeIntervalSince(booking.startTime)
        _newEndTime = State(initialValue: nextWeek.addingTimeInterval(duration))
    }

    // Combine the chosen date with the chosen hour/minute
    private var combinedStartDate: Date {
        let cal = Calendar.current
        var comps = cal.dateComponents([.year, .month, .day], from: newDate)
        comps.hour   = cal.component(.hour,   from: newStartTime)
        comps.minute = cal.component(.minute, from: newStartTime)
        comps.second = 0
        return cal.date(from: comps) ?? newDate
    }

    private var combinedEndDate: Date {
        let cal = Calendar.current
        var comps = cal.dateComponents([.year, .month, .day], from: newDate)
        comps.hour   = cal.component(.hour,   from: newEndTime)
        comps.minute = cal.component(.minute, from: newEndTime)
        comps.second = 0
        return cal.date(from: comps) ?? newDate
    }

    private var confirmationDateString: String {
        let fmt = DateFormatter()
        fmt.dateFormat = "EEEE, MMM d 'at' h:mm a"
        return fmt.string(from: combinedStartDate)
    }

    var body: some View {
        NavigationView {
            ZStack {
                Form {
                    currentBookingSection
                    newBookingSection
                }
                .navigationTitle("Reschedule")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Cancel") { dismiss() }
                    }
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Confirm") { showConfirmation = true }
                            .disabled(isRescheduling)
                    }
                }
                .task { await loadTrainers() }
                .confirmationDialog(
                    "Reschedule this lesson?",
                    isPresented: $showConfirmation,
                    titleVisibility: .visible
                ) {
                    Button("Reschedule", role: .destructive) {
                        Task { await reschedule() }
                    }
                    Button("Cancel", role: .cancel) {}
                } message: {
                    Text("Move to \(confirmationDateString). No lesson credits will be changed.")
                }
                .alert("Error", isPresented: .constant(errorMessage != nil), presenting: errorMessage) { _ in
                    Button("OK") { errorMessage = nil }
                } message: { msg in
                    Text(msg)
                }

                if isRescheduling {
                    Color.black.opacity(0.3).ignoresSafeArea()
                    ProgressView("Rescheduling...")
                        .padding()
                        .background(Color(UIColor.systemBackground))
                        .cornerRadius(10)
                }
            }
        }
        .navigationViewStyle(.stack)
    }

    // MARK: - Sections

    private var currentBookingSection: some View {
        Section("Current Booking") {
            LabeledContent("Date", value: booking.formattedDateShort)
            LabeledContent("Time", value: booking.formattedStartTime + " – " + booking.formattedEndTime)
            LabeledContent("Trainer", value: booking.trainerName)
            if let loc = booking.location, !loc.isEmpty {
                LabeledContent("Location", value: loc)
            }
        }
    }

    private var newBookingSection: some View {
        Section("New Booking") {
            if isLoadingTrainers {
                HStack { Spacer(); ProgressView(); Spacer() }
            } else {
                Picker("Trainer", selection: $selectedTrainerId) {
                    ForEach(trainers) { trainer in
                        Text(trainer.displayName).tag(trainer.id ?? "")
                    }
                }
            }
            DatePicker("Date", selection: $newDate, displayedComponents: .date)
            DatePicker("Start Time", selection: $newStartTime, displayedComponents: .hourAndMinute)
            DatePicker("End Time",   selection: $newEndTime,   displayedComponents: .hourAndMinute)
        }
    }

    // MARK: - Data Loading

    private func loadTrainers() async {
        isLoadingTrainers = true
        defer { isLoadingTrainers = false }

        #if canImport(FirebaseFirestore)
        let db = Firestore.firestore()
        do {
            let snapshot = try await db.collection("trainers")
                .whereField("orgId", isEqualTo: orgId)
                .whereField("active", isEqualTo: true)
                .getDocuments()

            trainers = snapshot.documents.compactMap { doc -> Trainer? in
                var trainer = try? doc.data(as: Trainer.self)
                trainer?.id = doc.documentID
                return trainer
            }
        } catch {
            errorMessage = "Failed to load trainers: \(error.localizedDescription)"
        }
        #endif
    }

    // MARK: - Reschedule

    private func reschedule() async {
        isRescheduling = true
        defer { isRescheduling = false }

        do {
            try await FunctionsService.shared.adminRescheduleLesson(
                bookingId: booking.id,
                orgId: orgId,
                newTrainerId: selectedTrainerId,
                newStartTime: combinedStartDate,
                newEndTime: combinedEndDate
            )
            onSuccess()
            dismiss()
        } catch let error as FunctionsServiceError {
            switch error {
            case .server(_, let message): errorMessage = message
            default: errorMessage = "Reschedule failed. Please try again."
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
