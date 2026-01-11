//
//  TrainerAvatarUploadView.swift
//  SkedenceAdmin
//
//  View for uploading trainer avatar images
//

import SwiftUI
import PhotosUI
import FirebaseStorage
import FirebaseFirestore
import Combine

struct TrainerAvatarUploadView: View {
    @EnvironmentObject var auth: AuthManager
    @StateObject private var viewModel = TrainerAvatarViewModel()
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: Spacing.lg) {
                    // Header
                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        Text("Upload Trainer Avatar")
                            .font(.headingLarge)
                            .foregroundStyle(AppTheme.textPrimary)
                        
                        Text("Select a trainer and upload their profile photo")
                            .font(.bodyMedium)
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                    .padding(.horizontal, Spacing.lg)
                    
                    // Trainer Selection
                    CardView {
                        VStack(alignment: .leading, spacing: Spacing.md) {
                            Text("Select Trainer")
                                .font(.headingSmall)
                                .foregroundStyle(AppTheme.textPrimary)
                            
                            if viewModel.isLoadingTrainers {
                                ProgressView()
                                    .frame(maxWidth: .infinity)
                            } else if viewModel.trainers.isEmpty {
                                Text("No trainers found")
                                    .font(.bodyMedium)
                                    .foregroundStyle(AppTheme.textSecondary)
                            } else {
                                Picker("Trainer", selection: $viewModel.selectedTrainerId) {
                                    Text("Select a trainer...")
                                        .tag(nil as String?)
                                    
                                    ForEach(viewModel.trainers) { trainer in
                                        Text(trainer.displayName)
                                            .tag(trainer.id as String?)
                                    }
                                }
                                .pickerStyle(.menu)
                                .frame(maxWidth: .infinity, alignment: .leading)
                            }
                        }
                    }
                    .padding(.horizontal, Spacing.lg)
                    
                    // Current Avatar Preview
                    if let trainer = viewModel.selectedTrainer {
                        CardView {
                            VStack(alignment: .leading, spacing: Spacing.md) {
                                Text("Current Avatar")
                                    .font(.headingSmall)
                                    .foregroundStyle(AppTheme.textPrimary)
                                
                                HStack {
                                    Spacer()
                                    
                                    let photoURLString = trainer.photoURL ?? trainer.avatarUrl ?? trainer.imageUrl
                                    
                                    if let photoURLString,
                                       let url = URL(string: photoURLString) {
                                        AsyncImage(url: url) { phase in
                                            switch phase {
                                            case .success(let image):
                                                image
                                                    .resizable()
                                                    .scaledToFill()
                                                    .frame(width: 120, height: 120)
                                                    .clipShape(Circle())
                                            case .failure(_):
                                                DefaultAvatarView(name: trainer.displayName, size: 120)
                                            case .empty:
                                                ProgressView()
                                                    .frame(width: 120, height: 120)
                                            @unknown default:
                                                DefaultAvatarView(name: trainer.displayName, size: 120)
                                            }
                                        }
                                    } else {
                                        DefaultAvatarView(name: trainer.displayName, size: 120)
                                    }
                                    
                                    Spacer()
                                }
                            }
                        }
                        .padding(.horizontal, Spacing.lg)
                    }
                    
                    // Image Upload Section
                    if viewModel.selectedTrainerId != nil {
                        CardView {
                            VStack(alignment: .leading, spacing: Spacing.md) {
                                Text("Upload New Avatar")
                                    .font(.headingSmall)
                                    .foregroundStyle(AppTheme.textPrimary)
                                
                                // Photo Picker
                                PhotosPicker(selection: $viewModel.selectedPhoto,
                                           matching: .images) {
                                    HStack {
                                        Image(systemName: "photo.on.rectangle.angled")
                                            .font(.title2)
                                            .foregroundStyle(AppTheme.primary)
                                        
                                        VStack(alignment: .leading, spacing: 4) {
                                            Text("Choose Photo")
                                                .font(.headingSmall)
                                                .foregroundStyle(AppTheme.textPrimary)
                                            
                                            Text("Select an image from your library")
                                                .font(.bodySmall)
                                                .foregroundStyle(AppTheme.textSecondary)
                                        }
                                        
                                        Spacer()
                                        
                                        Image(systemName: "chevron.right")
                                            .foregroundStyle(AppTheme.textSecondary)
                                    }
                                    .padding()
                                    .background(Color(.systemGray6))
                                    .cornerRadius(CornerRadius.md)
                                }
                                
                                // Preview selected image
                                if let image = viewModel.selectedImage {
                                    HStack {
                                        Spacer()
                                        
                                        Image(uiImage: image)
                                            .resizable()
                                            .scaledToFill()
                                            .frame(width: 120, height: 120)
                                            .clipShape(Circle())
                                        
                                        Spacer()
                                    }
                                    .padding(.top, Spacing.sm)
                                }
                                
                                // Upload Button
                                if viewModel.selectedImage != nil {
                                    Button {
                                        Task {
                                            await viewModel.uploadAvatar(orgId: auth.currentOrgId ?? "")
                                        }
                                    } label: {
                                        if viewModel.isUploading {
                                            HStack {
                                                ProgressView()
                                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                                Text("Uploading...")
                                            }
                                        } else {
                                            Text("Upload Avatar")
                                        }
                                    }
                                    .buttonStyle(PrimaryButtonStyle())
                                    .disabled(viewModel.isUploading)
                                }
                            }
                        }
                        .padding(.horizontal, Spacing.lg)
                    }
                    
                    // Error Message
                    if let error = viewModel.errorMessage {
                        CardView {
                            HStack(spacing: Spacing.sm) {
                                Image(systemName: "exclamationmark.triangle.fill")
                                    .foregroundColor(.red)
                                
                                Text(error)
                                    .font(.bodyMedium)
                                    .foregroundStyle(.red)
                            }
                        }
                        .padding(.horizontal, Spacing.lg)
                    }
                    
                    // Success Message
                    if viewModel.showSuccess {
                        CardView {
                            HStack(spacing: Spacing.sm) {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundColor(AppTheme.success)
                                
                                Text("Avatar uploaded successfully!")
                                    .font(.bodyMedium)
                                    .foregroundStyle(AppTheme.success)
                            }
                        }
                        .padding(.horizontal, Spacing.lg)
                    }
                }
                .padding(.vertical, Spacing.lg)
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Close") {
                        dismiss()
                    }
                }
            }
        }
        .task {
            await viewModel.loadTrainers(orgId: auth.currentOrgId ?? "")
        }
    }
}

// MARK: - Default Avatar View

struct DefaultAvatarView: View {
    let name: String
    let size: CGFloat
    
    private var initials: String {
        let components = name.components(separatedBy: " ")
        let firstInitial = components.first?.first.map(String.init) ?? ""
        let lastInitial = components.count > 1 ? components.last?.first.map(String.init) ?? "" : ""
        return (firstInitial + lastInitial).uppercased()
    }
    
    var body: some View {
        ZStack {
            Circle()
                .fill(
                    LinearGradient(
                        colors: [AppTheme.primary, AppTheme.primaryLight],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: size, height: size)
            
            Text(initials)
                .font(.system(size: size * 0.4, weight: .semibold))
                .foregroundStyle(.white)
        }
    }
}

// MARK: - View Model

@MainActor
class TrainerAvatarViewModel: ObservableObject {
    @Published var trainers: [Trainer] = []
    @Published var selectedTrainerId: String?
    @Published var selectedPhoto: PhotosPickerItem?
    @Published var selectedImage: UIImage?
    @Published var isLoadingTrainers = false
    @Published var isUploading = false
    @Published var errorMessage: String?
    @Published var showSuccess = false
    
    private let db = Firestore.firestore()
    private let storage = Storage.storage()
    
    var selectedTrainer: Trainer? {
        trainers.first { $0.id == selectedTrainerId }
    }
    
    init() {
        // Watch for photo selection changes
        Task {
            for await newValue in $selectedPhoto.values {
                if let newValue {
                    await loadImage(from: newValue)
                }
            }
        }
    }
    
    func loadTrainers(orgId: String) async {
        guard !orgId.isEmpty else { return }
        
        isLoadingTrainers = true
        errorMessage = nil
        
        do {
            let snapshot = try await db.collection("organizations")
                .document(orgId)
                .collection("trainers")
                .order(by: "name")
                .getDocuments()
            
            trainers = snapshot.documents.compactMap { doc in
                var trainer = try? doc.data(as: Trainer.self)
                trainer?.id = doc.documentID
                return trainer
            }
            
            isLoadingTrainers = false
        } catch {
            print("❌ Error loading trainers: \(error)")
            errorMessage = "Failed to load trainers: \(error.localizedDescription)"
            isLoadingTrainers = false
        }
    }
    
    private func loadImage(from item: PhotosPickerItem) async {
        do {
            if let data = try await item.loadTransferable(type: Data.self),
               let uiImage = UIImage(data: data) {
                selectedImage = uiImage
                errorMessage = nil
            }
        } catch {
            print("❌ Error loading image: \(error)")
            errorMessage = "Failed to load image: \(error.localizedDescription)"
        }
    }
    
    func uploadAvatar(orgId: String) async {
        guard let trainerId = selectedTrainerId,
              let image = selectedImage else {
            errorMessage = "Please select a trainer and image"
            return
        }
        
        guard !orgId.isEmpty else {
            errorMessage = "Organization ID is missing"
            return
        }
        
        isUploading = true
        errorMessage = nil
        showSuccess = false
        
        do {
            // Compress image
            guard let imageData = image.jpegData(compressionQuality: 0.7) else {
                errorMessage = "Failed to process image"
                isUploading = false
                return
            }
            
            // Create storage reference
            let fileName = "\(trainerId)_\(UUID().uuidString).jpg"
            let storageRef = storage.reference()
                .child("organizations")
                .child(orgId)
                .child("trainers")
                .child("avatars")
                .child(fileName)
            
            // Upload image
            let metadata = StorageMetadata()
            metadata.contentType = "image/jpeg"
            
            _ = try await storageRef.putDataAsync(imageData, metadata: metadata)
            
            // Get download URL
            let downloadURL = try await storageRef.downloadURL()
            
            // Update trainer document with photo URL
            try await db.collection("organizations")
                .document(orgId)
                .collection("trainers")
                .document(trainerId)
                .updateData([
                    "photoURL": downloadURL.absoluteString,
                    "avatarUrl": downloadURL.absoluteString,
                    "updatedAt": FieldValue.serverTimestamp()
                ])
            
            // Update local trainer object
            if let index = trainers.firstIndex(where: { $0.id == trainerId }) {
                trainers[index].photoURL = downloadURL.absoluteString
                trainers[index].avatarUrl = downloadURL.absoluteString
            }
            
            showSuccess = true
            isUploading = false
            
            // Clear selection after successful upload
            DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                self.selectedPhoto = nil
                self.selectedImage = nil
                self.showSuccess = false
            }
            
            print("✅ Avatar uploaded successfully for trainer: \(trainerId)")
            
        } catch {
            print("❌ Error uploading avatar: \(error)")
            errorMessage = "Failed to upload avatar: \(error.localizedDescription)"
            isUploading = false
        }
    }
}
