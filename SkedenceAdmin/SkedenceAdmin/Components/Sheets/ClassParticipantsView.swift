//
//  ClassParticipantsView.swift
//  SkedenceAdmin
//
//  Created by Assistant on 12/31/25.
//

import SwiftUI
import FirebaseFirestore
import FirebaseFunctions
import Combine

struct ClassParticipantsView: View {
    let classId: String
    let classTitle: String
    let preloadedParticipants: [ClassParticipant]?
    
    @StateObject private var participantsLoader: ParticipantsLoader
    @Environment(\.dismiss) private var dismiss
    @State private var selectedParticipant: ClassParticipant?
    @State private var showingManualRegistration = false
    @EnvironmentObject private var dependencies: AdminAppDependencies
    
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
                        
                        Section(header: Text("Participants")) {
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
                    .environmentObject(dependencies)
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
                .environmentObject(dependencies)
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
                client = try await FirestoreClientsService.shared.fetchClient(by: participantUserId)
            } catch {
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
    let athleteName: String?  // The specific athlete's name
    let registeredAt: Date
    
    var fullName: String {
        // Use athlete name if available, otherwise fall back to parent name
        if let athleteName = athleteName, !athleteName.isEmpty {
            return athleteName
        }
        return "\(firstName) \(lastName)"
    }
    
    var initials: String {
        let name = fullName
        let components = name.split(separator: " ")
        if components.count >= 2 {
            let first = String(components[0].prefix(1)).uppercased()
            let last = String(components[1].prefix(1)).uppercased()
            return "\(first)\(last)"
        } else if let first = components.first {
            return String(first.prefix(2)).uppercased()
        }
        return "?"
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
                    athleteName: data["athleteName"] as? String,
                    registeredAt: timestamp.dateValue()
                )
            }
        } catch {
            participants = []
        }
        
        isLoading = false
    }
}

// MARK: - Manual Registration Sheet

struct ManualRegistrationSheet: View {
    let classId: String
    let onRegistered: () -> Void
    
    @EnvironmentObject private var dependencies: AdminAppDependencies
    private var auth: AuthManager { dependencies.auth }
    @Environment(\.dismiss) private var dismiss
    
    @State private var registrationType: RegistrationType = .existingClient
    @State private var selectedClient: Client?
    @State private var selectedPackageId: String?
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
                        selectedPackageId = nil
                    }
                }
            }
        }
    }
    
    private var existingClientSection: some View {
        Group {
            Section(header: Text("Select Client")) {
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
            
            if selectedClient != nil {
                Section(header: Text("Select Class Pass")) {
                    // Filter to valid packages
                    let validPackages = clientPackages.filter { isValidClassPass($0) }
                    
                    if validPackages.isEmpty {
                        Text("No available class passes")
                            .foregroundStyle(AppTheme.textSecondary)
                    } else {
                        Picker("Class Pass", selection: $selectedPackageId) {
                            Text("Select a class pass...").tag(nil as String?)
                            ForEach(validPackages) { pkg in
                                HStack {
                                    Text(pkg.packageDisplayName)
                                    Spacer()
                                    Text("\(pkg.lessonsRemaining) remaining")
                                        .font(.caption)
                                        .foregroundStyle(AppTheme.textSecondary)
                                }
                                .tag(pkg.id as String?)
                            }
                        }
                    }
                }
            }
        }
    }
    
    private var manualEntrySection: some View {
        Section(header: Text("Client Information")) {
            TextField("First Name", text: $manualFirstName)
            TextField("Last Name", text: $manualLastName)
            TextField("Email (optional)", text: $manualEmail)
                .textInputAutocapitalization(.never)
                .keyboardType(.emailAddress)
        }
    }
    
    private var canRegister: Bool {
        if registrationType == .existingClient {
            return selectedClient != nil && selectedPackageId != nil
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
                
                if let client = try? await FirestoreClientsService.shared.fetchClient(by: userId) {
                    loadedClients.append(client)
                }
            }
            
            clients = loadedClients.sorted { $0.lastName < $1.lastName }
        } catch {
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
                
                // Required fields
                guard
                    let packageType = data["packageType"] as? String,
                    let totalLessons = data["totalLessons"] as? Int,
                    let lessonsUsed = data["lessonsUsed"] as? Int
                else {
                    return nil
                }
                
                // Support both purchaseDate and purchasedAt
                let purchaseDate = (data["purchaseDate"] as? Timestamp)?.dateValue()
                    ?? (data["purchasedAt"] as? Timestamp)?.dateValue()
                    ?? Date()
                
                let expirationDate = (data["expirationDate"] as? Timestamp)?.dateValue()
                let packageCategory = data["packageCategory"] as? String
                // Support both name and packageName
                let packageName = (data["name"] as? String) ?? (data["packageName"] as? String)
                let trainerId = data["trainerId"] as? String
                let transactionId = data["transactionId"] as? String
                
                return LessonPackage(
                    id: doc.documentID,
                    packageType: packageType,
                    packageCategory: packageCategory,
                    packageName: packageName,
                    trainerId: trainerId,
                    totalLessons: totalLessons,
                    lessonsUsed: lessonsUsed,
                    purchaseDate: purchaseDate,
                    expirationDate: expirationDate,
                    transactionId: transactionId
                )
            }
        } catch {
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
                guard let client = selectedClient, let packageId = selectedPackageId else { return }
                
                data = [
                    "classId": classId,
                    "userId": client.id,
                    "classPassPackageId": packageId
                ]
                
                _ = try await functions.httpsCallable("manualRegisterForClass").call(data)
            } else {
                // Manual entry - no package required
                let emailValue: Any = manualEmail.isEmpty ? NSNull() : manualEmail
                data = [
                    "classId": classId,
                    "firstName": manualFirstName,
                    "lastName": manualLastName,
                    "email": emailValue
                ]
                
                _ = try await functions.httpsCallable("manualRegisterForClass").call(data)
            }
            
            onRegistered()
            dismiss()
        } catch {
            errorMessage = "Failed to register client: \(error.localizedDescription)"
        }
    }
}
