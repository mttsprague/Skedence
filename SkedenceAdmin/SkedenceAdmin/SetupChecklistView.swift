import SwiftUI
import FirebaseAuth

struct SetupChecklistView: View {
    @StateObject private var viewModel = SetupChecklistViewModel()
    @State private var showTemplateSelector = false
    @State private var showShareSheet = false
    @State private var showStripeKeysSetup = false
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Header
                VStack(spacing: 12) {
                    if viewModel.progress.isComplete {
                        Text("🎉")
                            .font(.system(size: 72))
                        
                        Text("You're All Set!")
                            .font(.largeTitle)
                            .fontWeight(.bold)
                        
                        Text("Your booking system is ready to use")
                            .font(.body)
                            .foregroundColor(.secondary)
                    } else {
                        Text("⚡️")
                            .font(.system(size: 72))
                        
                        Text("Get Started")
                            .font(.largeTitle)
                            .fontWeight(.bold)
                        
                        Text("Complete setup in about 10 minutes")
                            .font(.body)
                            .foregroundColor(.secondary)
                    }
                }
                .padding(.top)
                
                // Progress Bar
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("Setup Progress")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                        
                        Spacer()
                        
                        Text("\(Int(viewModel.progress.completionPercentage * 100))%")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundColor(.blue)
                    }
                    
                    GeometryReader { geometry in
                        ZStack(alignment: .leading) {
                            RoundedRectangle(cornerRadius: 8)
                                .fill(Color(.systemGray5))
                            
                            RoundedRectangle(cornerRadius: 8)
                                .fill(Color.blue)
                                .frame(width: geometry.size.width * viewModel.progress.completionPercentage)
                        }
                    }
                    .frame(height: 12)
                }
                .padding(.horizontal)
                
                // Checklist Items
                VStack(spacing: 12) {
                    ChecklistItem(
                        title: "Choose Your Sport Template",
                        description: "Get pre-configured packages and settings",
                        isComplete: viewModel.progress.selectedTemplate != nil,
                        action: { showTemplateSelector = true }
                    )
                    
                    ChecklistItem(
                        title: "Connect Stripe",
                        description: "Required to accept payments",
                        isComplete: viewModel.progress.hasConnectedStripe,
                        action: { viewModel.navigateToStripeSetup() }
                    )
                    
                    ChecklistItem(
                        title: "Create Packages",
                        description: "Add your services and pricing",
                        isComplete: viewModel.progress.hasCreatedPackages,
                        action: { viewModel.navigateToPackages() }
                    )
                    
                    ChecklistItem(
                        title: "Add Trainer Profile",
                        description: "Set up your coaching profile",
                        isComplete: viewModel.progress.hasAddedTrainer,
                        action: { viewModel.navigateToProfile() }
                    )
                    
                    ChecklistItem(
                        title: "Set Your Availability",
                        description: "Define when clients can book",
                        isComplete: viewModel.progress.hasSetAvailability,
                        action: { viewModel.navigateToAvailability() }
                    )
                    
                    ChecklistItem(
                        title: "Share Your Booking Link",
                        description: "Invite your first client",
                        isComplete: viewModel.progress.hasInvitedClient,
                        action: { showShareSheet = true }
                    )
                }
                .padding(.horizontal)
                
                // Booking Link Section
                if viewModel.progress.completionPercentage >= 0.6 {
                    VStack(alignment: .leading, spacing: 12) {
                        Label("Your Booking Link", systemImage: "link.circle.fill")
                            .font(.headline)
                        
                        HStack {
                            Text(viewModel.bookingLink)
                                .font(.caption)
                                .foregroundColor(.secondary)
                                .lineLimit(1)
                            
                            Spacer()
                            
                            Button(action: { showShareSheet = true }) {
                                Label("Share", systemImage: "square.and.arrow.up")
                                    .font(.subheadline)
                                    .fontWeight(.semibold)
                            }
                        }
                        .padding()
                        .background(Color(.systemGray6))
                        .cornerRadius(8)
                    }
                    .padding()
                    .background(Color.blue.opacity(0.1))
                    .cornerRadius(12)
                    .padding(.horizontal)
                }
                
                if viewModel.progress.isComplete {
                    Button(action: { viewModel.dismissChecklist() }) {
                        Text("Start Using Skedence")
                            .font(.headline)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.blue)
                            .cornerRadius(12)
                    }
                    .padding(.horizontal)
                }
            }
            .padding(.vertical)
        }
        .sheet(isPresented: $showTemplateSelector) {
            OnboardingTemplateView { template in
                viewModel.applyTemplate(template)
            }
        }
        .sheet(isPresented: $showStripeKeysSetup) {
            StripeKeysSetupView()
        }
        .sheet(isPresented: $showShareSheet) {
            if let url = URL(string: viewModel.bookingLink) {
                ShareSheet(items: [url])
            }
        }
        .onAppear {
            viewModel.loadProgress()
        }
        .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("ShowStripeKeysSetup"))) { _ in
            showStripeKeysSetup = true
        }
        .navigationTitle("Get Started")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct ChecklistItem: View {
    let title: String
    let description: String
    let isComplete: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 16) {
                Image(systemName: isComplete ? "checkmark.circle.fill" : "circle")
                    .font(.title2)
                    .foregroundColor(isComplete ? .green : .gray)
                
                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.headline)
                        .foregroundColor(.primary)
                    
                    Text(description)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                if !isComplete {
                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundColor(.gray)
                }
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
        }
        .buttonStyle(PlainButtonStyle())
        .disabled(isComplete)
    }
}

struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]
    
    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }
    
    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}

#Preview {
    SetupChecklistView()
}
