//
//  ClassParticipantsView.swift
//  SkedenceAdmin
//
//  Created by Assistant on 12/31/25.
//

import SwiftUI
import FirebaseFirestore
import Combine

struct ClassParticipantsView: View {
    let classId: String
    let classTitle: String
    let preloadedParticipants: [ClassParticipant]?
    
    @StateObject private var participantsLoader: ParticipantsLoader
    @Environment(\.dismiss) private var dismiss
    @State private var selectedParticipant: ClassParticipant?
    @State private var showingManualRegistration = false
    
    init(classId: String, classTitle: String, preloadedParticipants: [ClassParticipant]? = nil) {
        self.classId = classId
        self.classTitle = classTitle
        self.preloadedParticipants = preloadedParticipants
        _participantsLoader = StateObject(wrappedValue: ParticipantsLoader(classId: classId, preloadedParticipants: preloadedParticipants))
    }
    
    var body: some View {
        NavigationView {
            Group {
                if participantsLoader.isLoading {
                    ProgressView("Loading participants...")
                        .tint(AppTheme.primary)
                } else if participantsLoader.participants.isEmpty {
                    EmptyStateView(
                        icon: "person.3",
                        title: "No Registrations Yet",
                        message: "No one has signed up for this class yet."
                    )
                } else {
                    List {
                        Section {
                            Text("\(participantsLoader.participants.count) registered")
                                .font(.labelMedium)
                                .foregroundStyle(AppTheme.textSecondary)
                        }
                        
                        Section("Participants") {
                            ForEach(participantsLoader.participants) { participant in
                                ParticipantRow(participant: participant)
                                    .contentShape(Rectangle())
                                    .onTapGesture {
                                        selectedParticipant = participant
                                    }
                            }
                        }
                    }
                }
            }
            .navigationTitle(classTitle)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
                
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        showingManualRegistration = true
                    } label: {
                        Label("Add Client", systemImage: "person.badge.plus")
                    }
                }
            }
            .sheet(item: $selectedParticipant) { participant in
                ParticipantClientCardSheet(participantUserId: participant.userId)
            }
            .sheet(isPresented: $showingManualRegistration) {
                ManualRegistrationSheet(
                    classId: classId,
                    onRegistered: {
                        Task {
                            await participantsLoader.loadParticipants()
                        }
                    }
                )
            }
        }
        .navigationViewStyle(.stack)
    }
}

// Helper view to fetch client and show card
private struct ParticipantClientCardSheet: View {
    let participantUserId: String
    @State private var client: Client?
    @State private var isLoading = true
    
    var body: some View {
        Group {
            if isLoading {
                ProgressView("Loading...")
                    .tint(AppTheme.primary)
            } else if let client = client {
                ClientCardView(client: client, selectedBooking: nil)
            } else {
                Text("Unable to load client information")
                    .foregroundStyle(AppTheme.textSecondary)
            }
        }
        .task {
            do {
                client = try await FirestoreService.shared.fetchClient(by: participantUserId)
            } catch {
                print("Error fetching client: \(error)")
            }
            isLoading = false
        }
    }
}

struct ParticipantRow: View {
    let participant: ClassParticipant
    
    var body: some View {
        HStack(spacing: Spacing.md) {
            // Avatar
            ZStack {
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [AppTheme.primary, AppTheme.primaryLight],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 44, height: 44)
                
                Text(participant.initials)
                    .font(.bodyMedium)
                    .fontWeight(.semibold)
                    .foregroundStyle(.white)
            }
            
            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text(participant.fullName)
                    .font(.bodyMedium)
                    .foregroundStyle(AppTheme.textPrimary)
                
                Text("Registered \(participant.registeredAt.formatted(.relative(presentation: .named)))")
                    .font(.labelSmall)
                    .foregroundStyle(AppTheme.textSecondary)
            }
            
            Spacer()
        }
        .padding(.vertical, Spacing.xs)
    }
}

// MARK: - Models

struct ClassParticipant: Identifiable, Codable {
    let id: String
    let userId: String
    let firstName: String
    let lastName: String
    let registeredAt: Date
    
    var fullName: String {
        "\(firstName) \(lastName)"
    }
    
    var initials: String {
        let first = firstName.prefix(1).uppercased()
        let last = lastName.prefix(1).uppercased()
        return "\(first)\(last)"
    }
}

// MARK: - Data Loader

@MainActor
class ParticipantsLoader: ObservableObject {
    @Published var participants: [ClassParticipant] = []
    @Published var isLoading = false
    
    private let db = Firestore.firestore()
    private let classId: String
    
    init(classId: String, preloadedParticipants: [ClassParticipant]? = nil) {
        self.classId = classId
        
        if let preloaded = preloadedParticipants {
            // Use preloaded data immediately
            self.participants = preloaded
            self.isLoading = false
        } else {
            // Load data
            Task {
                await loadParticipants()
            }
        }
    }
    
    func loadParticipants() async {
        guard !classId.isEmpty else {
            print("⚠️ loadParticipants called with empty classId")
            isLoading = false
            return
        }
        
        isLoading = true
        
        do {
            let snapshot = try await db.collection("classes")
                .document(classId)
                .collection("participants")
                .order(by: "registeredAt", descending: false)
                .getDocuments()
            
            participants = snapshot.documents.compactMap { doc in
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
                    registeredAt: timestamp.dateValue()
                )
            }
        } catch {
            print("Error loading participants: \(error)")
            participants = []
        }
        
        isLoading = false
    }
}

// MARK: - Manual Registration Sheet

struct ManualRegistrationSheet: View {
    let classId: String
    let onRegistered: () -> Void
    
    @EnvironmentObject private var auth: AuthManager
    @Environment(\.dismiss) private var dismiss
    
    @State private var registrationType: RegistrationType = .existingClient
    @State private var selectedClient: Client?
    @State private var selectedPackage: LessonPackage?
    @State private var manualFirstName = ""
    @State private var manualLastName = ""
    @State private var manualEmail = ""
    @State private var isLoadingClients = false
    @State private var clients: [Client] = []
    @State private var clientPackages: [LessonPackage] = []
    @State private var isRegistering = false
    @State private var errorMessage: String?
    
    enum RegistrationType: String, CaseIterable {
        case existingClient = "Existing Client"
        case manualEntry = "Manual Entry"
    }
    
    var body: some View {
        NavigationView {
            Form {
                Section {
                    Picker("Registration Type", selection: $registrationType) {
                        ForEach(RegistrationType.allCases, id: \.self) { type in
                            Text(type.rawValue).tag(type)
                        }
                    }
                    .pickerStyle(.segmented)
                }
                
                if registrationType == .existingClient {
                    existingClientSection
                } else {
                    manualEntrySection
                }
                
                if let errorMessage = errorMessage {
                    Section {
                        Text(errorMessage)
                            .foregroundStyle(.red)
                            .font(.caption)
                    }
                }
            }
            .navigationTitle("Add Client to Class")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        Task { await registerClient() }
                    }
                    .disabled(!canRegister || isRegistering)
                }
            }
            .task {
                await loadClients()
            }
            .onChange(of: selectedClient) { _, newClient in
                Task {
                    if let client = newClient {
                        await loadPackages(for: client)
                    } else {
                        clientPackages = []
                        selectedPackage = nil
                    }
                }
            }
        }
    }
    
    private var existingClientSection: some View {
        Group {
            Section("Select Client") {
                if isLoadingClients {
                    HStack {
                        Spacer()
                        ProgressView()
                        Spacer()
                    }
                } else if clients.isEmpty {
                    Text("No clients found")
                        .foregroundStyle(AppTheme.textSecondary)
                } else {
                    Picker("Client", selection: $selectedClient) {
                        Text("Select a client...").tag(nil as Client?)
                        ForEach(clients) { client in
                            Text("\(client.firstName) \(client.lastName)").tag(client as Client?)
                        }
                    }
                }
            }
            
            if let selectedClient = selectedClient {
                Section("Select Class Pass") {
                    if clientPackages.isEmpty {
                        Text("No available class passes")
                            .foregroundStyle(AppTheme.textSecondary)
                    } else {
                        Picker("Class Pass", selection: $selectedPackage) {
                            Text("Select a class pass...").tag(nil as LessonPackage?)
                            ForEach(clientPackages.filter { isValidClassPass($0) }) { pkg in
                                HStack {
                                    Text(pkg.name)
                                    Spacer()
                                    Text("\(pkg.totalLessons - pkg.lessonsUsed) remaining")
                                        .font(.caption)
                                        .foregroundStyle(AppTheme.textSecondary)
                                }
                                .tag(pkg as LessonPackage?)
                            }
                        }
                    }
                }
            }
        }
    }
    
    private var manualEntrySection: some View {
        Section("Client Information") {
            TextField("First Name", text: $manualFirstName)
            TextField("Last Name", text: $manualLastName)
            TextField("Email (optional)", text: $manualEmail)
                .textInputAutocapitalization(.never)
                .keyboardType(.emailAddress)
        }
    }
    
    private var canRegister: Bool {
        if registrationType == .existingClient {
            return selectedClient != nil && selectedPackage != nil
        } else {
            return !manualFirstName.isEmpty && !manualLastName.isEmpty
        }
    }
    
    private func isValidClassPass(_ package: LessonPackage) -> Bool {
        // Check if it's a class pass and has remaining uses
        let isClass = package.packageCategory == "class" || package.packageType == "class" || package.packageType == "class_pass"
        let hasRemaining = package.lessonsUsed < package.totalLessons
        let notExpired = package.expirationDate == nil || package.expirationDate! > Date()
        return isClass && hasRemaining && notExpired
    }
    
    private func loadClients() async {
        guard let orgId = auth.currentOrgId else { return }
        
        isLoadingClients = true
        defer { isLoadingClients = false }
        
        do {
            let db = Firestore.firestore()
            let snapshot = try await db.collection("orgMembers")
                .whereField("orgId", isEqualTo: orgId)
                .whereField("role", isEqualTo: "client")
                .getDocuments()
            
            var loadedClients: [Client] = []
            for doc in snapshot.documents {
                let data = doc.data()
                guard let userId = data["userId"] as? String else { continue }
                
                if let client = try? await FirestoreService.shared.fetchClient(by: userId) {
                    loadedClients.append(client)
                }
            }
            
            clients = loadedClients.sorted { $0.lastName < $1.lastName }
        } catch {
            print("Error loading clients: \(error)")
            errorMessage = "Failed to load clients: \(error.localizedDescription)"
        }
    }
    
    private func loadPackages(for client: Client) async {
        guard let orgId = auth.currentOrgId else { return }
        
        do {
            let db = Firestore.firestore()
            
            // Try new path first
            var snapshot = try await db.collection("organizations")
                .document(orgId)
                .collection("users")
                .document(client.id)
                .collection("packages")
                .getDocuments()
            
            // Fallback to old path if no packages found
            if snapshot.documents.isEmpty {
                snapshot = try await db.collection("users")
                    .document(client.id)
                    .collection("lessonPackages")
                    .getDocuments()
            }
            
            clientPackages = snapshot.documents.compactMap { doc in
                let data = doc.data()
                guard let name = data["name"] as? String,
                      let totalLessons = data["totalLessons"] as? Int,
                      let lessonsUsed = data["lessonsUsed"] as? Int,
                      let purchasedAt = (data["purchasedAt"] as? Timestamp)?.dateValue() else {
                    return nil
                }
                
                let expirationDate = (data["expirationDate"] as? Timestamp)?.dateValue()
                let packageCategory = data["packageCategory"] as? String
                let packageType = data["packageType"] as? String ?? ""
                
                return LessonPackage(
                    id: doc.documentID,
                    name: name,
                    totalLessons: totalLessons,
                    lessonsUsed: lessonsUsed,
                    purchasedAt: purchasedAt,
                    expirationDate: expirationDate,
                    packageCategory: packageCategory,
                    packageType: packageType
                )
            }
        } catch {
            print("Error loading packages: \(error)")
            errorMessage = "Failed to load packages: \(error.localizedDescription)"
        }
    }
    
    private func registerClient() async {
        isRegistering = true
        errorMessage = nil
        defer { isRegistering = false }
        
        do {
            let functions = Functions.functions(region: "us-central1")
            let data: [String: Any]
            
            if registrationType == .existingClient {
                guard let client = selectedClient, let package = selectedPackage else { return }
                
                data = [
                    "classId": classId,
                    "userId": client.id,
                    "classPassPackageId": package.id ?? ""
                ]
                
                let result = try await functions.httpsCallable("manualRegisterForClass").call(data)
                print("Manual registration result: \(result.data)")
            } else {
                // Manual entry - no package required
                data = [
                    "classId": classId,
                    "firstName": manualFirstName,
                    "lastName": manualLastName,
                    "email": manualEmail.isEmpty ? nil : manualEmail
                ]
                
                let result = try await functions.httpsCallable("manualRegisterForClass").call(data)
                print("Manual registration result: \(result.data)")
            }
            
            onRegistered()
            dismiss()
        } catch {
            print("Error registering client: \(error)")
            errorMessage = "Failed to register client: \(error.localizedDescription)"
        }
    }
}
