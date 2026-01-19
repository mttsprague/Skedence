// PurchaseLessonsView.swift
import SwiftUI
import StripePaymentSheet
import FirebaseAuth

@MainActor
struct PurchaseLessonsView: View {
    @EnvironmentObject var auth: AuthManager
    @ObservedObject var packagesService: PackagesService
    @StateObject private var stripeService = StripeService()
    @StateObject private var customerService = StripeCustomerService()
    @StateObject private var pricingService = PricingStructureService()

    // Trainers dropdown
    @StateObject private var trainersService = TrainersService()
    @State private var selectedTrainer: Trainer?

    @State private var isPurchasing = false
    @State private var alert: AlertItem?
    @State private var paymentSheet: PaymentSheet?
    @State private var showPaymentMethodSheet = false

    // Default expiration policy
    private let expirationMonths = 12

    // Selected package option (now dynamic)
    @State private var selectedPackageIndex: Int = 0

    // Jeff-first ordering
    private var trainersOrdered: [Trainer] {
        trainersService.trainers.sorted { lhs, rhs in
            let lhsPriority = isJeff(lhs) ? 0 : 1
            let rhsPriority = isJeff(rhs) ? 0 : 1
            if lhsPriority != rhsPriority { return lhsPriority < rhsPriority }
            let ln = lhs.name ?? ""
            let rn = rhs.name ?? ""
            return ln.localizedCaseInsensitiveCompare(rn) == .orderedAscending
        }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Big page header
                Text("Purchase Private Lessons")
                    .font(.system(size: 34, weight: .bold))
                    .foregroundStyle(Brand.primary)
                    .padding(.horizontal)

                // Trainers header
                Text("Trainer")
                    .font(.headline)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal)

                // Trainer dropdown menu
                Menu {
                    ForEach(trainersOrdered, id: \.self) { trainer in
                        Button {
                            selectedTrainer = trainer
                        } label: {
                            HStack(spacing: 10) {
                                TrainerAvatarView(trainer: trainer, size: 24)
                                Text(trainer.name ?? "Unnamed")
                                    .foregroundStyle(.primary)
                            }
                        }
                    }
                } label: {
                    HStack(spacing: 12) {
                        TrainerAvatarView(trainer: selectedTrainer, size: 36)

                        VStack(alignment: .leading) {
                            Text(selectedTrainer?.name ?? "")
                                .font(.title3.weight(.semibold))
                                .foregroundStyle(.primary)
                            Text("Trainer").foregroundStyle(.secondary)
                        }
                        Spacer()
                        Image(systemName: "chevron.down").foregroundStyle(.secondary)
                    }
                    .padding()
                    .background(
                        RoundedRectangle(cornerRadius: 16)
                            .fill(Color.platformBackground)
                            .shadow(color: .black.opacity(0.06), radius: 8, x: 0, y: 4)
                    )
                    .padding(.horizontal)
                }

                // Package section header
                Text("Package")
                    .font(.title2.weight(.semibold))
                    .foregroundStyle(Brand.primary)
                    .padding(.horizontal)

                // Package options (dynamically loaded)
                if pricingService.isLoading {
                    ProgressView()
                        .frame(maxWidth: .infinity)
                        .padding()
                } else {
                    let packages = pricingService.allPackageOptions
                    if packages.isEmpty {
                        Text("No packages available. Admin needs to set up pricing.")
                            .foregroundStyle(.secondary)
                            .frame(maxWidth: .infinity, alignment: .center)
                            .padding()
                    } else {
                        VStack(spacing: 14) {
                            ForEach(packages.indices, id: \.self) { index in
                                packageCard(package: packages[index], isSelected: selectedPackageIndex == index, index: index)
                            }
                        }
                        .padding(.horizontal)
                    }
                }

                // Bottom Purchase button
                Button {
                    Task { await purchaseSelectedOption() }
                } label: {
                    HStack {
                        if isPurchasing { ProgressView().tint(.white) }
                        Spacer(minLength: 0)
                        Text("Purchase")
                            .font(.headline)
                            .foregroundStyle(.white)
                        Spacer(minLength: 0)
                    }
                    .padding(.vertical, 16)
                    .padding(.horizontal, 20)
                    .background(Brand.primary)
                    .clipShape(Capsule())
                }
                .disabled(isPurchasing || selectedTrainer == nil)
                .padding(.horizontal)
                .padding(.top, 8)
                .padding(.bottom, 12)
            }
            .padding(.top, 12)
        }
        .background(Color.platformGroupedBackground)
        .navigationTitle("Purchase Private Lessons")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            // Load trainers and default-select Jeff (or first)
            if trainersService.trainers.isEmpty, let orgId = auth.currentOrgId {
                await trainersService.loadAll(orgId: orgId)
            }
            if selectedTrainer == nil {
                if let jeff = trainersService.trainers.first(where: { isJeff($0) }) {
                    selectedTrainer = jeff
                } else {
                    selectedTrainer = trainersService.trainers.first
                }
            }
            
            // Load pricing structure
            if let orgId = auth.currentOrgId {
                await pricingService.loadPricingStructure(for: orgId)
            }
        }
        .alert(item: $alert) { a in
            Alert(title: Text(a.title), message: Text(a.message), dismissButton: .default(Text("OK")))
        }
        .paymentSheet(isPresented: Binding(
            get: { paymentSheet != nil },
            set: { if !$0 { paymentSheet = nil } }
        ), paymentSheet: $paymentSheet, onCompletion: handlePaymentCompletion)
        .sheet(isPresented: $showPaymentMethodSheet) {
            PaymentMethodSelectionSheet(
                customerService: customerService,
                onSelectExistingCard: { paymentMethodId in
                    showPaymentMethodSheet = false
                    Task {
                        guard let trainerId = selectedTrainer?.id,
                              let orgId = auth.currentOrgId else { return }
                        let packages = pricingService.allPackageOptions
                        guard packages.indices.contains(selectedPackageIndex) else { return }
                        let selectedPackage = packages[selectedPackageIndex]
                        await processPurchaseWithSavedCard(
                            paymentMethodId: paymentMethodId,
                            trainerId: trainerId,
                            orgId: orgId,
                            selectedPackage: selectedPackage
                        )
                    }
                },
                onAddNewCard: {
                    showPaymentMethodSheet = false
                    Task {
                        guard let trainerId = selectedTrainer?.id,
                              let orgId = auth.currentOrgId else { return }
                        let packages = pricingService.allPackageOptions
                        guard packages.indices.contains(selectedPackageIndex) else { return }
                        let selectedPackage = packages[selectedPackageIndex]
                        await processPurchase(trainerId: trainerId, orgId: orgId, selectedPackage: selectedPackage)
                    }
                }
            )
        }
    }

    // MARK: - Package Card (Dynamic)

    private func packageCard(package: PackageOption, isSelected: Bool, index: Int) -> some View {
        Button {
            withAnimation(.easeInOut(duration: 0.15)) { selectedPackageIndex = index }
        } label: {
            HStack(spacing: 12) {
                // Leading icon
                ZStack {
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(Brand.primary.opacity(0.15))
                    Image(systemName: "briefcase.fill")
                        .foregroundStyle(Brand.primary)
                        .font(.system(size: 18, weight: .semibold))
                }
                .frame(width: 48, height: 48)

                // Title
                VStack(alignment: .leading, spacing: 4) {
                    Text(package.title)
                        .foregroundStyle(.primary)
                        .font(.headline)
                    if !package.description.isEmpty {
                        Text(package.description)
                            .foregroundStyle(.secondary)
                            .font(.caption)
                            .lineLimit(2)
                    }
                }

                Spacer()

                // Price
                Text(package.formattedPrice)
                    .font(.headline)
                    .foregroundStyle(.primary)

                // Selection indicator
                ZStack {
                    Circle()
                        .stroke(Brand.primary, lineWidth: 2)
                        .frame(width: 26, height: 26)
                    if isSelected {
                        Circle()
                            .fill(Brand.primary)
                            .frame(width: 22, height: 22)
                            .overlay(Image(systemName: "checkmark")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundStyle(.white))
                    }
                }
            }
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .fill(Color.platformBackground)
                    .overlay(
                        RoundedRectangle(cornerRadius: 18, style: .continuous)
                            .fill(Color.secondary.opacity(0.08))
                    )
                    .shadow(color: .black.opacity(0.06), radius: 10, x: 0, y: 4)
            )
        }
        .buttonStyle(.plain)
    }

    // MARK: - Old Package Enum (Deprecated - kept for backward compatibility)
    
    private enum PackageOption_OLD: CaseIterable, Equatable {
        case single, twoAthlete, threeAthlete, classPass

        var title: String {
            switch self {
            case .single: return "1-Athlete Private Lesson"
            case .twoAthlete: return "2-Athlete Private Lesson"
            case .threeAthlete: return "3-Athlete Private Lesson"
            case .classPass: return "Class Pass"
            }
        }

        var subtitle: String? {
            switch self {
            case .single: return nil
            case .twoAthlete: return "Train with a partner"
            case .threeAthlete: return "Train with two partners"
            case .classPass: return "Register for group classes"
            }
        }

        // Firestore mapping
        var packageType: String {
            switch self {
            case .single: return "private"
            case .twoAthlete: return "2_athlete"
            case .threeAthlete: return "3_athlete"
            case .classPass: return "class_pass"
            }
        }

        var totalLessons: Int {
            switch self {
            case .single: return 1
            case .twoAthlete: return 1
            case .threeAthlete: return 1
            case .classPass: return 1
            }
        }

        // Updated pricing
        var displayPrice: String {
            switch self {
            case .single: return "$80"
            case .twoAthlete: return "$140"
            case .threeAthlete: return "$180"
            case .classPass: return "$45"
            }
        }
        
        // Amount in cents for Stripe
        var amountInCents: Int {
            switch self {
            case .single: return 8000  // $80
            case .twoAthlete: return 14000  // $140
            case .threeAthlete: return 18000  // $180
            case .classPass: return 4500  // $45
            }
        }
    }

    // MARK: - Helpers

    private func isJeff(_ trainer: Trainer) -> Bool {
        (trainer.name ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
            .localizedCaseInsensitiveCompare("Jeff Schmitz") == .orderedSame
    }

    // MARK: - Purchase flow

    private func purchaseSelectedOption() async {
        guard Auth.auth().currentUser?.uid != nil else {
            alert = .init(title: "Error", message: "You must be signed in to purchase.")
            return
        }
        
        guard let trainerId = selectedTrainer?.id else {
            alert = .init(title: "Error", message: "Please select a trainer.")
            return
        }
        
        guard let orgId = auth.currentOrgId else {
            alert = .init(title: "Error", message: "Organization not found.")
            return
        }
        
        // Get selected package
        let packages = pricingService.allPackageOptions
        guard packages.indices.contains(selectedPackageIndex) else {
            alert = .init(title: "Error", message: "Please select a package.")
            return
        }
        let selectedPackage = packages[selectedPackageIndex]

        isPurchasing = true
        
        // Check if user has saved payment methods
        await customerService.loadPaymentMethods()
        
        isPurchasing = false
        
        // If no saved payment methods, show payment method selection sheet
        if customerService.paymentMethods.isEmpty {
            showPaymentMethodSheet = true
            return
        }
        
        // Otherwise, proceed with existing flow
        await processPurchase(trainerId: trainerId, orgId: orgId, selectedPackage: selectedPackage)
    }
    
    private func processPurchase(trainerId: String, orgId: String, selectedPackage: PackageOption) async {
        isPurchasing = true
        defer { isPurchasing = false }

        do {
            // Ensure user has a Stripe customer (enables saving cards)
            _ = try await customerService.getOrCreateCustomer()
            
            // Create payment intent - routes to trainer's Stripe Connect account
            let clientSecret = try await stripeService.createPaymentIntent(
                packageType: selectedPackage.packageType, // Use packageType, not title
                amount: selectedPackage.priceInCents,
                trainerId: trainerId,
                orgId: orgId // Payment goes to trainer's organization
            )
            
            // Configure payment sheet with option to save card
            var configuration = PaymentSheet.Configuration()
            configuration.merchantDisplayName = auth.organizationName ?? "Your Organization"
            configuration.allowsDelayedPaymentMethods = false
            
            // Enable saving payment methods
            configuration.defaultBillingDetails.email = Auth.auth().currentUser?.email
            
            let paymentSheet = PaymentSheet(
                paymentIntentClientSecret: clientSecret,
                configuration: configuration
            )
            
            self.paymentSheet = paymentSheet
        } catch {
            alert = .init(title: "Payment Failed", message: error.localizedDescription)
        }
    }
    
    private func processPurchaseWithSavedCard(paymentMethodId: String, trainerId: String, orgId: String, selectedPackage: PackageOption) async {
        isPurchasing = true
        defer { isPurchasing = false }
        
        do {
            // Create and confirm payment intent with saved card
            let result = try await stripeService.createAndConfirmPaymentWithSavedCard(
                packageType: selectedPackage.packageType,
                amount: selectedPackage.priceInCents,
                trainerId: trainerId,
                orgId: orgId,
                paymentMethodId: paymentMethodId
            )
            
            // Track purchase
            AnalyticsService.shared.logPackagePurchased(
                packageId: result.paymentIntentId,
                price: Double(selectedPackage.priceInCents) / 100.0,
                method: "stripe_saved_card"
            )
            
            // Reload packages
            await packagesService.loadMyPackages()
            
            // Success
            alert = .init(
                title: "Purchase Successful! 🎉",
                message: "Your \(selectedPackage.title) has been added to your account. You can now book sessions!"
            )
        } catch {
            alert = .init(title: "Payment Failed", message: error.localizedDescription)
            CrashlyticsService.shared.logPaymentError(error, amount: Double(selectedPackage.priceInCents) / 100.0, method: "stripe_saved_card")
        }
    }
    
    private func handlePaymentCompletion(_ result: PaymentSheetResult) {
        switch result {
        case .completed:
            Task {
                // Payment succeeded - now confirm and create the package
                guard let paymentIntentId = stripeService.lastPaymentIntentId else {
                    alert = .init(title: "Error", message: "Payment succeeded but package creation failed. Please contact support.")
                    return
                }
                
                // Get selected package
                let packages = pricingService.allPackageOptions
                guard packages.indices.contains(selectedPackageIndex) else {
                    alert = .init(title: "Error", message: "Package information not found.")
                    return
                }
                let selectedPackage = packages[selectedPackageIndex]
                
                do {
                    print("🔄 Calling confirmPayment for paymentIntentId: \(paymentIntentId)")
                    // Call backend to confirm payment and create package
                    // Using direct mode (orgId-based) - set isDirect to true
                    try await stripeService.confirmPayment(paymentIntentId: paymentIntentId, isDirect: true)
                    print("✅ confirmPayment succeeded, package should be allocated")
                    
                    // Track package purchase event
                    AnalyticsService.shared.logPackagePurchased(
                        packageId: paymentIntentId,
                        price: Double(selectedPackage.priceInCents) / 100.0,
                        method: "stripe"
                    )
                    
                    // Reload packages to show the new one
                    print("📦 Reloading packages...")
                    await packagesService.loadMyPackages()
                    print("✅ Packages reloaded, count: \(packagesService.packages.count)")
                } catch {
                    print("❌ confirmPayment failed: \(error.localizedDescription)")
                    alert = .init(title: "Error", message: "Payment succeeded but package creation failed. Please contact support. \(error.localizedDescription)")
                    CrashlyticsService.shared.logPaymentError(error, amount: Double(selectedPackage.priceInCents) / 100.0, method: "stripe")
                    return
                }
                
                // Success message
                let successMessage = "Your \(selectedPackage.title) has been added to your account. You can now book sessions!"
                
                alert = .init(title: "Purchase Successful! 🎉", message: successMessage)
            }
        case .canceled:
            alert = .init(title: "Payment Cancelled", message: "Your payment was cancelled. No charges were made.")
        case .failed(let error):
            alert = .init(title: "Payment Failed", message: "We couldn't process your payment. \(error.localizedDescription)")
        }
    }

    // MARK: - Alert

    private struct AlertItem: Identifiable {
        let id = UUID()
        let title: String
        let message: String
    }
}

// MARK: - Trainer Avatar

private func trainerImageURL(from trainer: Trainer?) -> URL? {
    guard let trainer else { return nil }
    let urlString = trainer.photoURL?.trimmingCharacters(in: .whitespacesAndNewlines)
        ?? trainer.avatarUrl?.trimmingCharacters(in: .whitespacesAndNewlines)
        ?? trainer.imageUrl?.trimmingCharacters(in: .whitespacesAndNewlines)
    guard let s = urlString, !s.isEmpty else { return nil }
    return URL(string: s)
}

private struct TrainerAvatarView: View {
    let trainer: Trainer?
    var size: CGFloat = 36

    var body: some View {
        let cornerRadius = size / 2
        Group {
            if let url = trainerImageURL(from: trainer) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .empty:
                        placeholder
                    case .success(let image):
                        image
                            .resizable()
                            .scaledToFill()
                    case .failure:
                        placeholder
                    @unknown default:
                        placeholder
                    }
                }
            } else {
                placeholder
            }
        }
        .frame(width: size, height: size)
        .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                .stroke(Color.black.opacity(0.05), lineWidth: 0.5)
        )
        .shadow(color: .black.opacity(0.04), radius: 1, x: 0, y: 1)
    }

    private var placeholder: some View {
        ZStack {
            Circle().fill(Brand.primary.opacity(0.12))
            Image(systemName: "person.crop.circle.fill")
                .foregroundStyle(Brand.primary)
        }
    }
}

// MARK: - Payment Method Selection Sheet

private struct PaymentMethodSelectionSheet: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject var customerService: StripeCustomerService
    let onSelectExistingCard: (String) -> Void
    let onAddNewCard: () -> Void
    
    @State private var selectedPaymentMethodId: String?
    @State private var isConfirmed = false
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    // Header
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Choose Payment Method")
                            .font(.title2.weight(.bold))
                            .foregroundStyle(Brand.primary)
                        
                        Text("Select a saved card or add a new one")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.horizontal)
                    
                    // Saved Cards Section
                    if !customerService.paymentMethods.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Saved Cards")
                                .font(.headline)
                                .foregroundStyle(.secondary)
                                .padding(.horizontal)
                            
                            ForEach(customerService.paymentMethods) { method in
                                SavedCardRow(
                                    method: method,
                                    isSelected: selectedPaymentMethodId == method.id
                                ) {
                                    selectedPaymentMethodId = method.id
                                }
                            }
                        }
                        
                        Divider()
                            .padding(.horizontal)
                    }
                    
                    // Add New Card Button
                    Button {
                        onAddNewCard()
                    } label: {
                        HStack(spacing: 12) {
                            ZStack {
                                RoundedRectangle(cornerRadius: 12)
                                    .fill(Brand.primary.opacity(0.15))
                                    .frame(width: 48, height: 48)
                                Image(systemName: "plus.circle.fill")
                                    .foregroundStyle(Brand.primary)
                                    .font(.system(size: 20))
                            }
                            
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Add New Card")
                                    .font(.headline)
                                    .foregroundStyle(.primary)
                                Text("Enter card details")
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                            }
                            
                            Spacer()
                            
                            Image(systemName: "chevron.right")
                                .foregroundStyle(.secondary)
                        }
                        .padding()
                        .background(
                            RoundedRectangle(cornerRadius: 16)
                                .fill(Color.platformBackground)
                                .shadow(color: .black.opacity(0.06), radius: 8, x: 0, y: 4)
                        )
                    }
                    .padding(.horizontal)
                    
                    // Confirmation section (only show if card selected)
                    if selectedPaymentMethodId != nil {
                        VStack(alignment: .leading, spacing: 12) {
                            Toggle(isOn: $isConfirmed) {
                                Text("I confirm this purchase")
                                    .font(.subheadline)
                            }
                            .tint(Brand.primary)
                            .padding(.horizontal)
                            
                            Button {
                                if let paymentMethodId = selectedPaymentMethodId {
                                    onSelectExistingCard(paymentMethodId)
                                }
                            } label: {
                                Text("Complete Purchase")
                                    .font(.headline)
                                    .foregroundStyle(.white)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 16)
                                    .background(Brand.primary)
                                    .clipShape(Capsule())
                            }
                            .disabled(!isConfirmed)
                            .opacity(isConfirmed ? 1.0 : 0.5)
                            .padding(.horizontal)
                        }
                        .padding(.top, 8)
                    }
                }
                .padding(.vertical)
            }
            .background(Color.platformGroupedBackground)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
    }
}

private struct SavedCardRow: View {
    let method: PaymentMethodInfo
    let isSelected: Bool
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 12) {
                ZStack {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color.blue.opacity(0.15))
                        .frame(width: 48, height: 48)
                    Image(systemName: "creditcard.fill")
                        .foregroundStyle(.blue)
                        .font(.system(size: 18))
                }
                
                VStack(alignment: .leading, spacing: 4) {
                    Text("\(method.brand.capitalized) •••• \(method.last4)")
                        .font(.headline)
                        .foregroundStyle(.primary)
                    Text("Expires \(method.expMonth)/\(method.expYear)")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                
                Spacer()
                
                ZStack {
                    Circle()
                        .stroke(Brand.primary, lineWidth: 2)
                        .frame(width: 24, height: 24)
                    if isSelected {
                        Circle()
                            .fill(Brand.primary)
                            .frame(width: 20, height: 20)
                            .overlay(
                                Image(systemName: "checkmark")
                                    .font(.system(size: 12, weight: .bold))
                                    .foregroundStyle(.white)
                            )
                    }
                }
            }
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color.platformBackground)
                    .shadow(color: .black.opacity(0.06), radius: 8, x: 0, y: 4)
            )
        }
        .buttonStyle(.plain)
        .padding(.horizontal)
    }
}
