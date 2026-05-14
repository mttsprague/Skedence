// ScheduleOptionsView.swift
import SwiftUI

struct ScheduleOptionsView: View {
    @EnvironmentObject private var dependencies: AdminAppDependencies
    private var auth: AuthManager { dependencies.auth }
    @Environment(\.dismiss) private var dismiss

    let onMyWeek: () -> Void
    let onMyDay: () -> Void
    let onAllTrainersDay: () -> Void
    let onSelectTrainer: (String) -> Void
    var onImportedCalendar: (() -> Void)? = nil

    @State private var trainers: [Trainer] = []
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    Text("Schedule Options")
                        .font(.system(size: 36, weight: .heavy))

                    // Current user row
                    if auth.isAuthenticated {
                        HStack(spacing: 12) {
                            // Look up current user's photo from the loaded trainers list;
                            // falls back to auth.trainerPhotoURLString for trainer-role users.
                            avatar(urlString: trainers.first(where: { $0.id == auth.trainerId })?.anyPhotoURLString
                                            ?? auth.trainerPhotoURLString)
                                .frame(width: 44, height: 44)

                            VStack(alignment: .leading, spacing: 2) {
                                Text(auth.trainerDisplayName ?? (auth.userEmail ?? "You"))
                                    .font(.headline)
                                Text("You")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                        }
                    }

                    // My schedule
                    Group {
                        Text("My Schedule")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(.secondary)

                        VStack(spacing: 0) {
                            Button {
                                onMyWeek()
                                dismiss()
                            } label: {
                                row(icon: "calendar", title: "My Week")
                            }
                            Divider().padding(.leading, 44)
                            Button {
                                onMyDay()
                                dismiss()
                            } label: {
                                row(icon: "rectangle.split.3x1", title: "My Day")
                            }
                        }
                        .padding()
                        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 22))
                    }

                    // Other views
                    Group {
                        Text("Other Views")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(.secondary)

                        VStack(spacing: 0) {
                            Button {
                                onAllTrainersDay()
                                dismiss()
                            } label: {
                                row(icon: "person.3", title: "All Trainers (Day)")
                            }

                            if let onImportedCalendar {
                                Divider().padding(.leading, 44)
                                Button {
                                    onImportedCalendar()
                                    dismiss()
                                } label: {
                                    row(
                                        icon: "calendar.badge.checkmark",
                                        title: auth.importedCalendarTitle ?? "Imported Calendar"
                                    )
                                }
                            }
                        }
                        .padding()
                        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 22))
                    }

                    // Trainers list
                    Group {
                        Text("Trainers")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(.secondary)

                        VStack(spacing: 0) {
                            if isLoading {
                                HStack {
                                    ProgressView()
                                    Text("Loading trainers…")
                                    Spacer()
                                }
                                .padding()
                            } else if let errorMessage, !errorMessage.isEmpty {
                                Text(errorMessage)
                                    .foregroundStyle(.red)
                                    .font(.footnote)
                                    .padding()
                            } else {
                                ForEach(trainers) { trainer in
                                    Button {
                                        if let id = trainer.id {
                                            onSelectTrainer(id)
                                            dismiss()
                                        }
                                    } label: {
                                        trainerRow(trainer)
                                    }
                                    .buttonStyle(.plain)

                                    if trainer.id != trainers.last?.id {
                                        Divider().padding(.leading, 64)
                                    }
                                }

                                if trainers.isEmpty {
                                    Text("No trainers found.")
                                        .font(.footnote)
                                        .foregroundStyle(.secondary)
                                        .padding()
                                }
                            }
                        }
                        .padding()
                        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 22))
                    }
                }
                .padding()
            }
            .task { await loadTrainers() }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
        .navigationViewStyle(.stack)
        }
    }

    private func loadTrainers() async {
        // Ensure we have an orgId to query trainers for
        guard let orgId = auth.currentOrgId, !orgId.isEmpty else {
            self.trainers = []
            self.errorMessage = "No organization found for your account."
            return
        }

        isLoading = true
        defer { isLoading = false }
        do {
            let list = try await FirestoreTrainersService.shared.fetchAllTrainers(orgId: orgId)
            // Filter to only show active trainers and sort alphabetically
            let activeTrainers = list.filter { $0.active }
            self.trainers = activeTrainers.sorted { $0.displayName.localizedCaseInsensitiveCompare($1.displayName) == .orderedAscending }
            self.errorMessage = nil
        } catch {
            self.trainers = []
            self.errorMessage = error.localizedDescription
        }
    }

    private func avatar(urlString: String?) -> some View {
        Group {
            if let urlString, let url = URL(string: urlString), !urlString.isEmpty {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .empty:
                        Circle().fill(Color.gray.opacity(0.2)).overlay(ProgressView())
                    case .success(let image):
                        image.resizable().scaledToFill().clipShape(Circle())
                    case .failure:
                        Circle().fill(Color.gray.opacity(0.2))
                            .overlay(Image(systemName: "person.crop.circle.fill").font(.system(size: 24)).foregroundStyle(.secondary))
                    @unknown default:
                        Circle().fill(Color.gray.opacity(0.2))
                    }
                }
            } else {
                Circle()
                    .fill(Color.gray.opacity(0.2))
                    .overlay(Image(systemName: "person.crop.circle.fill").font(.system(size: 24)).foregroundStyle(.secondary))
            }
        }
    }

    private func trainerRow(_ trainer: Trainer) -> some View {
        HStack(spacing: 12) {
            avatar(urlString: trainer.photoURL ?? trainer.avatarUrl ?? trainer.imageUrl)
                .frame(width: 44, height: 44)

            Text(trainer.displayName)
                .font(.headline)
                .foregroundStyle(.primary)

            Spacer()
        }
        .padding(.vertical, 8)
        .contentShape(Rectangle())
    }

    private func row(icon: String, title: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.title2)
                .frame(width: 28)
            Text(title)
                .font(.headline)
            Spacer()
        }
        .foregroundStyle(.primary)
        .padding(.vertical, 4)
    }
}
