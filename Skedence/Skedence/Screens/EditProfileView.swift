import SwiftUI
import FirebaseAuth
import FirebaseFirestore

struct EditProfileView: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var usersService: UsersService
    @EnvironmentObject var auth: AuthManager
    
    // Dynamic field labels
    @State private var birthdayLabel = "Birthday"
    @State private var schoolTeamLabel = "School/Club Team"
    @State private var experienceLevelLabel = "Experience Level"
    @State private var positionLabel = "Position (Optional)"
    
    // Parent/Guardian fields
    @State private var firstName: String = ""
    @State private var lastName: String = ""
    @State private var emailAddress: String = ""
    @State private var phoneNumber: String = ""
    
    // Emergency contact
    @State private var emergencyContactName: String = ""
    @State private var emergencyContactNumber: String = ""
    
    // Referral
    @State private var referredBy: String = ""
    
    // Notes
    @State private var notesForCoach: String = ""
    
    // Athletes
    @State private var athletes: [AthleteInfo] = [AthleteInfo()]
    
    @State private var isSaving = false
    @State private var showAlert = false
    @State private var alertMessage = ""
    @State private var isSuccess = false
    
    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Parent/Guardian Information")) {
                    TextField("First Name", text: $firstName)
                        .autocapitalization(.words)
                    TextField("Last Name", text: $lastName)
                        .autocapitalization(.words)
                    TextField("Email", text: $emailAddress)
                        .autocapitalization(.none)
                        .keyboardType(.emailAddress)
                        .disabled(true) // Email can't be changed here
                    TextField("Phone Number", text: $phoneNumber)
                        .keyboardType(.phonePad)
                }
                
                Section(header: Text("Emergency Contact")) {
                    TextField("Emergency Contact Name", text: $emergencyContactName)
                        .autocapitalization(.words)
                    TextField("Emergency Contact Number", text: $emergencyContactNumber)
                        .keyboardType(.phonePad)
                }
                
                // Dynamic athlete sections
                ForEach(athletes.indices, id: \.self) { index in
                    Section(header: HStack {
                        Text(index == 0 ? "Athlete Information" : "Athlete \(index + 1) Information")
                        Spacer()
                        if athletes.count > 1 {
                            Button(action: {
                                removeAthlete(at: index)
                            }) {
                                Image(systemName: "trash")
                                    .foregroundColor(.red)
                            }
                        }
                    }) {
                        TextField("First Name", text: Binding(
                            get: { athletes[index].firstName ?? "" },
                            set: { athletes[index].firstName = $0 }
                        ))
                        .autocapitalization(.words)
                        
                        TextField("Last Name", text: Binding(
                            get: { athletes[index].lastName ?? "" },
                            set: { athletes[index].lastName = $0 }
                        ))
                        .autocapitalization(.words)
                        
                        DatePicker(
                            birthdayLabel,
                            selection: Binding(
                                get: {
                                    if let dateString = athletes[index].birthday,
                                       !dateString.isEmpty,
                                       let date = dateFromString(dateString) {
                                        return date
                                    }
                                    return Date()
                                },
                                set: {
                                    athletes[index].birthday = stringFromDate($0)
                                }
                            ),
                            displayedComponents: .date
                        )
                        .onAppear {
                            if athletes[index].birthday == nil || athletes[index].birthday?.isEmpty == true {
                                athletes[index].birthday = stringFromDate(Date())
                            }
                        }
                        
                        TextField(schoolTeamLabel, text: Binding(
                            get: { athletes[index].schoolClubTeam ?? "" },
                            set: { athletes[index].schoolClubTeam = $0 }
                        ))
                        .autocapitalization(.words)
                        
                        Picker(experienceLevelLabel, selection: Binding(
                            get: { athletes[index].experienceLevel ?? "Beginner" },
                            set: { athletes[index].experienceLevel = $0 }
                        )) {
                            Text("Beginner").tag("Beginner")
                            Text("Intermediate").tag("Intermediate")
                            Text("Advanced").tag("Advanced")
                            Text("Elite").tag("Elite")
                        }
                        .pickerStyle(.menu)
                        
                        TextField(positionLabel, text: Binding(
                            get: { athletes[index].position ?? "" },
                            set: { athletes[index].position = $0 }
                        ))
                        .autocapitalization(.words)
                    }
                }
                
                // Add Athlete Button
                Section {
                    Button(action: addAthlete) {
                        HStack {
                            Image(systemName: "plus.circle.fill")
                            Text("Add Athlete to Profile")
                        }
                        .foregroundColor(Brand.primary)
                    }
                }
                
                Section(header: Text("Additional Information")) {
                    TextField("Referred By", text: $referredBy)
                        .autocapitalization(.words)
                    
                    ZStack(alignment: .topLeading) {
                        if notesForCoach.isEmpty {
                            Text("Notes for coach...")
                                .foregroundColor(.gray.opacity(0.5))
                                .padding(.top, 8)
                                .padding(.leading, 5)
                        }
                        TextEditor(text: $notesForCoach)
                            .frame(minHeight: 100)
                    }
                }
                
                Section {
                    Button(action: saveProfile) {
                        if isSaving {
                            HStack {
                                Spacer()
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle())
                                Spacer()
                            }
                        } else {
                            HStack {
                                Spacer()
                                Text("Save Changes")
                                    .fontWeight(.semibold)
                                Spacer()
                            }
                        }
                    }
                    .disabled(isSaving)
                }
            }
            .navigationTitle("Edit Profile")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
            .alert(isPresented: $showAlert) {
                Alert(
                    title: Text(isSuccess ? "Success" : "Error"),
                    message: Text(alertMessage),
                    dismissButton: .default(Text("OK")) {
                        if isSuccess {
                            dismiss()
                        }
                    }
                )
            }
            .task {
                await loadProfile()
                await loadFieldLabels()
            }
        }
    }
    
    private func addAthlete() {
        athletes.append(AthleteInfo())
    }
    
    private func removeAthlete(at index: Int) {
        guard athletes.count > 1 else { return }
        athletes.remove(at: index)
    }
    
    private func loadFieldLabels() async {
        guard let orgId = auth.currentOrgId else { return }
        do {
            let db = Firestore.firestore()
            let orgDoc = try await db.collection("organizations").document(orgId).getDocument()
            guard let orgData = orgDoc.data() else { return }
            let fields = orgData["intakeFormFieldsPrivate"] as? [[String: Any]] ?? []
            let getLabel: (String, String) -> String = { id, def in
                fields.first(where: { $0["id"] as? String == id })?["label"] as? String ?? def
            }
            let posField = fields.first(where: { ($0["label"] as? String)?.lowercased().contains("position") == true })
            birthdayLabel = getLabel("athleteBirthday", "Birthday")
            schoolTeamLabel = getLabel("schoolTeam", "School/Club Team")
            experienceLevelLabel = getLabel("experienceLevel", "Experience Level")
            positionLabel = (posField?["label"] as? String).map { $0 } ?? "Position (Optional)"
        } catch {
            // Keep default labels
        }
    }
    
    private func loadProfile() async {
        guard let user = Auth.auth().currentUser else { return }
        
        await usersService.loadCurrentUserIfAvailable()
        
        guard let profile = usersService.currentUser else { return }
        
        // Load parent/guardian info
        firstName = profile.firstName ?? ""
        lastName = profile.lastName ?? ""
        emailAddress = profile.emailAddress ?? user.email ?? ""
        phoneNumber = profile.phoneNumber ?? ""
        
        // Load emergency contact
        emergencyContactName = profile.emergencyContactName ?? ""
        emergencyContactNumber = profile.emergencyContactNumber ?? ""
        
        // Load referral
        referredBy = profile.referredBy ?? ""
        
        // Load notes
        notesForCoach = profile.notesForCoach ?? ""
        
        // Load athletes - prioritize new format, fallback to legacy
        if let profileAthletes = profile.athletes, !profileAthletes.isEmpty {
            athletes = profileAthletes
        } else {
            // Migrate from legacy fields
            var legacyAthletes: [AthleteInfo] = []
            
            // Athlete 1
            if profile.athleteFirstName != nil || profile.athleteLastName != nil {
                legacyAthletes.append(AthleteInfo(
                    firstName: profile.athleteFirstName,
                    lastName: profile.athleteLastName,
                    birthday: profile.athleteBirthday,
                    schoolClubTeam: profile.athleteSchoolClubTeam,
                    experienceLevel: profile.athleteExperienceLevel,
                    position: profile.athletePosition
                ))
            }
            
            // Athlete 2
            if profile.athlete2FirstName != nil || profile.athlete2LastName != nil {
                legacyAthletes.append(AthleteInfo(
                    firstName: profile.athlete2FirstName,
                    lastName: profile.athlete2LastName,
                    birthday: profile.athlete2Birthday,
                    schoolClubTeam: profile.athlete2SchoolClubTeam,
                    experienceLevel: profile.athlete2ExperienceLevel,
                    position: profile.athlete2Position
                ))
            }
            
            // Athlete 3
            if profile.athlete3FirstName != nil || profile.athlete3LastName != nil {
                legacyAthletes.append(AthleteInfo(
                    firstName: profile.athlete3FirstName,
                    lastName: profile.athlete3LastName,
                    birthday: profile.athlete3Birthday,
                    schoolClubTeam: profile.athlete3SchoolClubTeam,
                    experienceLevel: profile.athlete3ExperienceLevel,
                    position: profile.athlete3Position
                ))
            }
            
            athletes = legacyAthletes.isEmpty ? [AthleteInfo()] : legacyAthletes
        }
    }
    
    private func saveProfile() {
        guard let user = Auth.auth().currentUser else { return }
        
        isSaving = true
        
        Task {
            do {
                // Filter out empty athletes
                let nonEmptyAthletes = athletes.filter { athlete in
                    !(athlete.firstName?.isEmpty ?? true) || !(athlete.lastName?.isEmpty ?? true)
                }
                
                let profile = UserProfile(
                    id: user.uid,
                    emailAddress: emailAddress.isEmpty ? nil : emailAddress,
                    firstName: firstName.isEmpty ? nil : firstName,
                    lastName: lastName.isEmpty ? nil : lastName,
                    phoneNumber: phoneNumber.isEmpty ? nil : phoneNumber,
                    photoURL: usersService.currentUser?.photoURL,
                    active: usersService.currentUser?.active,
                    createdAt: usersService.currentUser?.createdAt,
                    updatedAt: Date(),
                    emergencyContactName: emergencyContactName.isEmpty ? nil : emergencyContactName,
                    emergencyContactNumber: emergencyContactNumber.isEmpty ? nil : emergencyContactNumber,
                    referredBy: referredBy.isEmpty ? nil : referredBy,
                    notesForCoach: notesForCoach.isEmpty ? nil : notesForCoach,
                    athletes: nonEmptyAthletes.isEmpty ? nil : nonEmptyAthletes
                )
                
                try await usersService.updateCurrentUser(profile)
                
                isSaving = false
                isSuccess = true
                alertMessage = "Profile updated successfully!"
                showAlert = true
            } catch {
                isSaving = false
                isSuccess = false
                alertMessage = "Failed to update profile: \(error.localizedDescription)"
                showAlert = true
            }
        }
    }
    
    // Date formatting helpers
    private func dateFromString(_ string: String) -> Date? {
        let formatter = DateFormatter()
        
        // Try yyyy-MM-dd format first (standard format)
        formatter.dateFormat = "yyyy-MM-dd"
        if let date = formatter.date(from: string) {
            return date
        }
        
        // Try MM/DD/YYYY format (common user input)
        formatter.dateFormat = "MM/dd/yyyy"
        if let date = formatter.date(from: string) {
            return date
        }
        
        // Try M/D/YYYY format (short date)
        formatter.dateFormat = "M/d/yyyy"
        if let date = formatter.date(from: string) {
            return date
        }
        
        return nil
    }
    
    private func stringFromDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }
}

#Preview {
    EditProfileView()
}

// Extension to add placeholder text to TextField
extension View {
    func placeholder<Content: View>(
        when shouldShow: Bool,
        alignment: Alignment = .leading,
        @ViewBuilder placeholder: () -> Content) -> some View {

        ZStack(alignment: alignment) {
            placeholder().opacity(shouldShow ? 1 : 0)
            self
        }
    }
}
