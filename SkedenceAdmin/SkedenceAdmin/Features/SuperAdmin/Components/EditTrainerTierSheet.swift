import SwiftUI

struct EditTrainerTierSheet: View {
    let trainer: AdminTrainer
    @ObservedObject var viewModel: SuperAdminViewModel
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var dependencies: AdminAppDependencies
    private var auth: AuthManager { dependencies.auth }
    private var pricingService: PricingStructureService { dependencies.pricing }
    
    @State private var selectedTierId: String?
    @State private var selectedTierName: String?
    @State private var isLoading = false
    @State private var showError = false
    @State private var errorMessage = ""
    
    // Available tiers loaded from organization
    @State private var availableTiers: [(id: String, name: String)] = []
    
    var body: some View {
        NavigationView {
            Form {
                Section {
                    HStack {
                        VStack(alignment: .leading) {
                            Text("Trainer")
                                .font(.caption)
                                .foregroundStyle(AppTheme.textSecondary)
                            Text(trainer.displayName)
                                .font(.bodyLarge)
                                .foregroundStyle(AppTheme.textPrimary)
                        }
                        Spacer()
                    }
                }
                
                Section {
                    if let currentTierName = trainer.pricingTierName {
                        HStack {
                            Image(systemName: "medal.fill")
                                .foregroundStyle(.orange)
                            Text("Current Tier")
                                .foregroundStyle(AppTheme.textSecondary)
                            Spacer()
                            Text(currentTierName)
                                .foregroundStyle(.orange)
                                .fontWeight(.medium)
                        }
                    } else {
                        HStack {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundStyle(.green)
                            Text("Universal Trainer")
                                .foregroundStyle(AppTheme.textSecondary)
                            Spacer()
                            Text("All Tiers")
                                .foregroundStyle(.green)
                                .fontWeight(.medium)
                        }
                    }
                } header: {
                    Text("Current Assignment")
                }
                
                Section {
                    // No Tier option
                    Button {
                        selectedTierId = nil
                        selectedTierName = nil
                    } label: {
                        HStack {
                            Image(systemName: selectedTierId == nil ? "checkmark.circle.fill" : "circle")
                                .foregroundStyle(selectedTierId == nil ? .green : AppTheme.textTertiary)
                            Text("No Tier (Universal)")
                                .foregroundStyle(AppTheme.textPrimary)
                            Spacer()
                            Text("Works with all passes")
                                .font(.caption)
                                .foregroundStyle(AppTheme.textSecondary)
                        }
                    }
                    .buttonStyle(.plain)
                    
                    // Available tiers
                    ForEach(availableTiers, id: \.id) { tier in
                        Button {
                            selectedTierId = tier.id
                            selectedTierName = tier.name
                        } label: {
                            HStack {
                                Image(systemName: selectedTierId == tier.id ? "checkmark.circle.fill" : "circle")
                                    .foregroundStyle(selectedTierId == tier.id ? .orange : AppTheme.textTertiary)
                                Text(tier.name)
                                    .foregroundStyle(AppTheme.textPrimary)
                                Spacer()
                                Image(systemName: "medal.fill")
                                    .foregroundStyle(.orange)
                                    .font(.caption)
                            }
                        }
                        .buttonStyle(.plain)
                    }
                } header: {
                    Text("Select Pricing Tier")
                } footer: {
                    Text("Universal trainers can accept any lesson pass. Tier-specific trainers only accept lesson passes for their assigned tier. Class passes are always universal and available to all trainers.")
                        .font(.caption)
                }
            }
            .navigationTitle("Assign Pricing Tier")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        Task {
                            await saveTierAssignment()
                        }
                    }
                    .disabled(isLoading || !hasChanges)
                }
            }
            .alert("Error", isPresented: $showError) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(errorMessage)
            }
            .disabled(isLoading)
            .overlay {
                if isLoading {
                    ProgressView()
                        .scaleEffect(1.5)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .background(Color.black.opacity(0.2))
                }
            }
        }
        .onAppear {
            loadAvailableTiers()
            // Set current selection
            selectedTierId = trainer.pricingTierId
            selectedTierName = trainer.pricingTierName
        }
    }
    
    private var hasChanges: Bool {
        selectedTierId != trainer.pricingTierId || selectedTierName != trainer.pricingTierName
    }
    
    private func loadAvailableTiers() {
        guard let orgId = auth.currentOrgId else {
            print("❌ No orgId available")
            return
        }
        
        Task {
            await pricingService.loadPricingStructure(for: orgId)
            
            if let structure = pricingService.pricingStructure {
                // Filter to only show tiers with lesson passes (exclude class-only tiers)
                availableTiers = structure.tiers
                    .filter { tier in
                        // Only include tiers that have at least one non-class pass
                        tier.packages.contains { $0.packageCategory != .classPass }
                    }
                    .map { tier in
                        (id: tier.id, name: tier.tierName)
                    }
                print("✅ Loaded \(availableTiers.count) pricing tiers (lesson passes only)")
            } else {
                print("⚠️ No pricing structure found for org")
            }
        }
    }
    
    private func saveTierAssignment() async {
        guard let orgId = auth.currentOrgId else {
            errorMessage = "Organization ID not found"
            showError = true
            return
        }
        
        isLoading = true
        
        await viewModel.updateTrainerTier(
            trainerId: trainer.id,
            orgId: orgId,
            tierId: selectedTierId,
            tierName: selectedTierName
        )
        
        isLoading = false
        
        if let vmError = viewModel.errorMessage, !vmError.isEmpty {
            errorMessage = vmError
            showError = true
        } else {
            dismiss()
        }
    }
}
