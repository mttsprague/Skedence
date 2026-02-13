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
    @Environment(\.dismiss) private var dismiss

    @State private var isPurchasing = false
    @State private var alert: AlertItem?
    @State private var paymentSheet: PaymentSheet?
    @State private var showPaymentMethodSheet = false
    @State private var useCardOnFile = false
    @State private var selectedPaymentMethodId: String?
    @State private var pendingPurchaseOrgId: String?
    @State private var pendingPurchasePackage: PackageOption? // Stored data for purchase
    @State private var confirmationPackage: PackageOption? // Sheet presents when this is non-nil

    // Default expiration policy
    private let expirationMonths = 12

    // Selected package option (now dynamic)
    @State private var selectedPackageIndex: Int = 0
    
    // Group packages by category for better organization
    private func groupedPackages() -> [(category: PackageCategory, packages: [PackageOption])] {
        let packages = pricingService.allPackageOptions
        
        // Group by category
        let grouped = Dictionary(grouping: packages) { $0.packageCategory }
        
        // Sort categories: 1 athlete, 2 athlete, 3 athlete, 4 athlete, then class
        let categoryOrder: [PackageCategory] = [.oneAthlete, .twoAthlete, .threeAthlete, .fourAthlete, .classPass]
        
        return categoryOrder.compactMap { category in
            guard let categoryPackages = grouped[category], !categoryPackages.isEmpty else { return nil }
            // Sort packages within category by lessonCount
            let sorted = categoryPackages.sorted { $0.lessonCount < $1.lessonCount }
            return (category, sorted)
        }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Big page header
                Text("Purchase Passes")
                    .font(.system(size: 34, weight: .bold))
                    .foregroundStyle(Brand.primary)
                    .padding(.horizontal)

                // Package section header
                Text("Package")
                    .font(.title2.weight(.semibold))
                    .foregroundStyle(Brand.primary)
                    .padding(.horizontal)
                
                // Legend
                HStack(spacing: Spacing.md) {
                    // Pass legend
                    HStack(spacing: Spacing.xxs) {
                        Circle()
                            .fill(AppTheme.primary)
                            .frame(width: 12, height: 12)
                        Text("Pass")
                            .font(.labelMedium)
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                    
                    // Class legend
                    HStack(spacing: Spacing.xxs) {
                        Circle()
                            .fill(AppTheme.secondary)
                            .frame(width: 12, height: 12)
                        Text("Class")
                            .font(.labelMedium)
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                    
                    Spacer()
                }
                .padding(.horizontal)
                .padding(.top, 4)

                // Package options (dynamically loaded and grouped by category)
                if pricingService.isLoading {
                    ProgressView()
                        .frame(maxWidth: .infinity)
                        .padding()
                } else {
                    let groupedPackageList = groupedPackages()
                    if groupedPackageList.isEmpty {
                        Text("No packages available. Admin needs to set up pricing.")
                            .foregroundStyle(.secondary)
                            .frame(maxWidth: .infinity, alignment: .center)
                            .padding()
                    } else {
                        VStack(spacing: 20) {
                            ForEach(groupedPackageList.indices, id: \.self) { groupIndex in
                                let group = groupedPackageList[groupIndex]
                                packageGroupCard(category: group.category, packages: group.packages)
                            }
                        }
                        .padding(.horizontal)
                    }
                }

                // Saved Cards Section (if available)
                if !customerService.paymentMethods.isEmpty {
                    VStack(alignment: .leading, spacing: 12) {
                        Toggle(isOn: $useCardOnFile) {
                            Text("Use card on file")
                                .font(.headline)
                                .foregroundStyle(.primary)
                        }
                        .tint(Brand.primary)
                        .padding(.horizontal)
                        
                        if useCardOnFile {
                            VStack(spacing: 8) {
                                ForEach(customerService.paymentMethods) { method in
                                    SavedCardRow(
                                        method: method,
                                        isSelected: selectedPaymentMethodId == method.id
                                    ) {
                                        selectedPaymentMethodId = method.id
                                    }
                                }
                            }
                            .padding(.horizontal)
                        }
                    }
                    .padding(.vertical, 8)
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
                .disabled(isPurchasing)
                .padding(.horizontal)
                .padding(.top, 8)
                .padding(.bottom, 12)
            }
            .padding(.top, 12)
        }
        .background(Color.platformGroupedBackground)
        .navigationTitle("Purchase Passes")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            // Load pricing structure
            if let orgId = auth.currentOrgId {
                await pricingService.loadPricingStructure(for: orgId)
                // Load saved payment methods
                await customerService.loadPaymentMethods(orgId: orgId)
                // Auto-select first payment method if available
                if let firstMethod = customerService.paymentMethods.first {
                    selectedPaymentMethodId = firstMethod.id
                }
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
                        guard let orgId = auth.currentOrgId else { return }
                        let packages = pricingService.allPackageOptions
                        guard packages.indices.contains(selectedPackageIndex) else { return }
                        let selectedPackage = packages[selectedPackageIndex]
                        await processPurchaseWithSavedCard(
                            paymentMethodId: paymentMethodId,
                            orgId: orgId,
                            selectedPackage: selectedPackage
                        )
                    }
                },
                onAddNewCard: {
                    showPaymentMethodSheet = false
                    Task {
                        guard let orgId = auth.currentOrgId else { return }
                        let packages = pricingService.allPackageOptions
                        guard packages.indices.contains(selectedPackageIndex) else { return }
                        let selectedPackage = packages[selectedPackageIndex]
                        await processPurchase(orgId: orgId, selectedPackage: selectedPackage)
                    }
                }
            )
        }
        .sheet(item: $confirmationPackage) { package in
            let priceText = String(format: "$%.2f", Double(package.priceInCents) / 100.0)
            
            ConfirmationAlertView(
                title: "Confirm Purchase",
                message: "Are you sure you want to purchase \(package.title) for \(priceText)?",
                confirmButtonText: "Confirm Purchase",
                onConfirm: {
                    print("🛒 Confirm button tapped")
                    confirmationPackage = nil
                    Task {
                        await confirmPurchase()
                    }
                },
                onCancel: {
                    print("🛒 Cancel button tapped")
                    confirmationPackage = nil
                }
            )
            .onAppear {
                print("✅ Sheet presenting with package: \(package.title)")
            }
        }
    }

    // MARK: - Package Group Card (Groups packages by category)
    
    private func packageGroupCard(category: PackageCategory, packages: [PackageOption]) -> some View {
        let gradientColor = category == .classPass ? AppTheme.secondary : AppTheme.primary
        let icon = category == .classPass ? "person.3.fill" : "figure.run"
        
        return VStack(alignment: .leading, spacing: Spacing.sm) {
            // Category Header
            HStack(spacing: Spacing.sm) {
                ZStack {
                    RoundedRectangle(cornerRadius: CornerRadius.xs, style: .continuous)
                        .fill(
                            LinearGradient(
                                colors: [gradientColor, gradientColor.opacity(0.7)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 40, height: 40)
                    
                    Image(systemName: icon)
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundStyle(.white)
                }
                
                Text(category.displayName)
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundStyle(AppTheme.textPrimary)
                
                Spacer()
            }
            .padding(.horizontal, Spacing.md)
            .padding(.top, Spacing.xs)
            
            // Package Options
            VStack(spacing: Spacing.xs) {
                ForEach(packages) { package in
                    let allPackages = pricingService.allPackageOptions
                    let globalIndex = allPackages.firstIndex(where: { $0.id == package.id }) ?? 0
                    let isSelected = selectedPackageIndex == globalIndex
                    
                    packageOptionRow(package: package, isSelected: isSelected, gradientColor: gradientColor) {
                        withAnimation(.easeInOut(duration: 0.15)) {
                            selectedPackageIndex = globalIndex
                        }
                    }
                }
            }
            .padding(.horizontal, Spacing.md)
            .padding(.bottom, Spacing.sm)
        }
        .background(
            RoundedRectangle(cornerRadius: CornerRadius.md, style: .continuous)
                .fill(Color.platformBackground)
                .shadow(color: .black.opacity(0.06), radius: 12, x: 0, y: 4)
        )
    }
    
    // MARK: - Package Option Row (Individual package within a group)
    
    private func packageOptionRow(package: PackageOption, isSelected: Bool, gradientColor: Color, onTap: @escaping () -> Void) -> some View {
        Button(action: onTap) {
            HStack(spacing: Spacing.md) {
                // Lesson count badge
                ZStack {
                    Circle()
                        .fill(gradientColor.opacity(0.1))
                        .frame(width: 44, height: 44)
                    
                    VStack(spacing: 0) {
                        Text("\(package.lessonCount)")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundStyle(gradientColor)
                        Text(package.lessonCount == 1 ? "pass" : "passes")
                            .font(.system(size: 8, weight: .medium))
                            .foregroundStyle(gradientColor.opacity(0.7))
                    }
                }
                
                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    if !package.title.isEmpty && package.title != package.packageCategory.displayName {
                        Text(package.title)
                            .font(.bodyMedium)
                            .fontWeight(.semibold)
                            .foregroundStyle(AppTheme.textPrimary)
                    }
                    
                    if !package.description.isEmpty {
                        Text(package.description)
                            .font(.labelMedium)
                            .foregroundStyle(AppTheme.textSecondary)
                            .lineLimit(2)
                    }
                    
                    // Price and per-pass price
                    HStack(spacing: Spacing.xs) {
                        Text(package.formattedPrice)
                            .font(.labelLarge)
                            .fontWeight(.bold)
                            .foregroundStyle(AppTheme.success)
                        
                        if package.lessonCount > 1 {
                            let perPassPrice = Double(package.priceInCents) / Double(package.lessonCount) / 100.0
                            Text("(\(String(format: "$%.2f", perPassPrice)) per pass)")
                                .font(.labelSmall)
                                .foregroundStyle(AppTheme.textSecondary)
                        }
                    }
                }
                
                Spacer()
                
                // Selection indicator
                ZStack {
                    Circle()
                        .stroke(isSelected ? gradientColor : Color.secondary.opacity(0.3), lineWidth: 2)
                        .frame(width: 24, height: 24)
                    if isSelected {
                        Circle()
                            .fill(gradientColor)
                            .frame(width: 18, height: 18)
                            .overlay(
                                Image(systemName: "checkmark")
                                    .font(.system(size: 10, weight: .bold))
                                    .foregroundStyle(.white)
                            )
                    }
                }
            }
            .padding(.vertical, Spacing.sm)
            .padding(.horizontal, Spacing.sm)
            .background(
                RoundedRectangle(cornerRadius: CornerRadius.sm, style: .continuous)
                    .fill(isSelected ? gradientColor.opacity(0.05) : Color.clear)
            )
            .overlay(
                RoundedRectangle(cornerRadius: CornerRadius.sm, style: .continuous)
                    .stroke(isSelected ? gradientColor.opacity(0.3) : Color.clear, lineWidth: 1)
            )
        }
        .buttonStyle(PlainButtonStyle())
    }

    // MARK: - Package Card (Dynamic - Legacy, kept for backward compatibility)

    private func packageCard(package: PackageOption, isSelected: Bool, index: Int) -> some View {
        let gradientColor = package.packageCategory == .classPass ? AppTheme.secondary : AppTheme.primary
        
        return Button {
            withAnimation(.easeInOut(duration: 0.15)) { selectedPackageIndex = index }
        } label: {
            HStack(spacing: Spacing.md) {
                // Icon with gradient background (matching passes page)
                ZStack {
                    RoundedRectangle(cornerRadius: CornerRadius.sm, style: .continuous)
                        .fill(
                            LinearGradient(
                                colors: [gradientColor, gradientColor.opacity(0.7)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 56, height: 56)
                    
                    Image(systemName: iconForPackageType(package.packageType))
                        .font(.system(size: 24, weight: .semibold))
                        .foregroundStyle(.white)
                }

                // Title and description with more room
                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    Text(package.title)
                        .font(.headingSmall)
                        .foregroundStyle(AppTheme.textPrimary)
                    
                    // Category display name
                    Text(package.packageCategory.displayName)
                        .font(.labelMedium)
                        .foregroundStyle(AppTheme.textSecondary)
                    
                    if !package.description.isEmpty {
                        Text(package.description)
                            .font(.bodyMedium)
                            .foregroundStyle(AppTheme.textSecondary)
                            .lineLimit(3)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    
                    // Price with icon
                    HStack(spacing: Spacing.xxs) {
                        Image(systemName: "dollarsign.circle.fill")
                            .font(.labelSmall)
                        Text(package.formattedPrice)
                            .font(.labelMedium)
                            .fontWeight(.semibold)
                    }
                    .foregroundStyle(AppTheme.success)
                    .padding(.top, Spacing.xxs)
                }

                Spacer()

                // Selection indicator
                ZStack {
                    Circle()
                        .stroke(isSelected ? gradientColor : Color.secondary.opacity(0.3), lineWidth: 2)
                        .frame(width: 28, height: 28)
                    if isSelected {
                        Circle()
                            .fill(gradientColor)
                            .frame(width: 22, height: 22)
                            .overlay(Image(systemName: "checkmark")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundStyle(.white))
                    }
                }
            }
            .padding(Spacing.md)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: CornerRadius.md, style: .continuous)
                    .fill(Color.platformBackground)
                    .shadow(color: .black.opacity(0.06), radius: 10, x: 0, y: 4)
            )
            .overlay(
                RoundedRectangle(cornerRadius: CornerRadius.md, style: .continuous)
                    .stroke(isSelected ? gradientColor : Color.clear, lineWidth: 2)
            )
        }
        .buttonStyle(.plain)
    }
    
    // Helper to get icon for package type
    private func iconForPackageType(_ packageType: String) -> String {
        switch packageType {
        case "private", "1_athlete":
            return "person.fill"
        case "2_athlete":
            return "person.2.fill"
        case "3_athlete":
            return "person.3.fill"
        case "class_pass", "class":
            return "calendar.badge.clock"
        default:
            return "ticket.fill"
        }
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

    // MARK: - Purchase flow

    @MainActor
    private func purchaseSelectedOption() async {
        print("🛒 purchaseSelectedOption called")
        guard Auth.auth().currentUser?.uid != nil else {
            alert = .init(title: "Error", message: "You must be signed in to purchase.")
            return
        }
        
        guard let orgId = auth.currentOrgId else {
            alert = .init(title: "Error", message: "Organization not found.")
            return
        }
        
        // Get selected package
        let packages = pricingService.allPackageOptions
        print("🛒 Available packages count: \(packages.count), selectedIndex: \(selectedPackageIndex)")
        guard packages.indices.contains(selectedPackageIndex) else {
            alert = .init(title: "Error", message: "Please select a package.")
            return
        }
        let selectedPackage = packages[selectedPackageIndex]
        print("🛒 Selected package: \(selectedPackage.title)")

        // Store orgId and show confirmation by setting package
        pendingPurchaseOrgId = orgId
        pendingPurchasePackage = selectedPackage
        confirmationPackage = selectedPackage
        
        print("✅ confirmationPackage set to: \(confirmationPackage?.title ?? "nil")")
        print("✅ pendingPurchasePackage set to: \(pendingPurchasePackage?.title ?? "nil")")
        print("🛒 useCardOnFile: \(useCardOnFile), selectedPaymentMethodId: \(selectedPaymentMethodId ?? "none")")
    }
    
    private func confirmPurchase() async {
        print("💳 confirmPurchase started")
        guard let orgId = pendingPurchaseOrgId,
              let selectedPackage = pendingPurchasePackage else {
            print("❌ Missing orgId or package")
            print("   orgId: \(pendingPurchaseOrgId ?? "nil")")
            print("   package: \(pendingPurchasePackage?.title ?? "nil")")
            return
        }
        
        print("💳 Processing purchase for: \(selectedPackage.title)")
        print("💳 useCardOnFile: \(useCardOnFile), paymentMethodId: \(selectedPaymentMethodId ?? "none")")

        // If user wants to use card on file and has selected one
        if useCardOnFile {
            guard let paymentMethodId = selectedPaymentMethodId else {
                print("❌ No payment method selected")
                alert = .init(title: "Error", message: "Please select a card to use.")
                return
            }
            
            print("💳 Calling processPurchaseWithSavedCard...")
            isPurchasing = true
            await processPurchaseWithSavedCard(
                paymentMethodId: paymentMethodId,
                orgId: orgId,
                selectedPackage: selectedPackage
            )
            isPurchasing = false
            print("💳 processPurchaseWithSavedCard completed")
            return
        }
        
        // Otherwise, proceed with regular payment sheet flow
        await processPurchase(orgId: orgId, selectedPackage: selectedPackage)
    }
    
    private func processPurchase(orgId: String, selectedPackage: PackageOption) async {
        isPurchasing = true
        defer { isPurchasing = false }

        do {
            // Ensure user has a Stripe customer (enables saving cards)
            _ = try await customerService.getOrCreateCustomer()
            
            // Create payment intent - routes to organization's Stripe account
            // Use a placeholder trainerId since passes aren't tied to specific trainers
            let clientSecret = try await stripeService.createPaymentIntent(
                packageType: selectedPackage.packageType, // Use packageType, not title
                amount: selectedPackage.priceInCents,
                trainerId: "general", // Placeholder - passes can be used with any trainer
                orgId: orgId // Payment goes to organization
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
    
    private func processPurchaseWithSavedCard(paymentMethodId: String, orgId: String, selectedPackage: PackageOption) async {
        print("💳 processPurchaseWithSavedCard started")
        isPurchasing = true
        defer { isPurchasing = false }
        
        do {
            print("💳 Creating payment intent...")
            // Create and confirm payment intent with saved card
            // Use placeholder trainerId since passes aren't tied to specific trainers
            let result = try await stripeService.createAndConfirmPaymentWithSavedCard(
                packageType: selectedPackage.packageType,
                amount: selectedPackage.priceInCents,
                trainerId: "general", // Placeholder - passes can be used with any trainer
                orgId: orgId,
                paymentMethodId: paymentMethodId
            )
            
            print("✅ Payment successful! Intent ID: \(result.paymentIntentId)")
            
            // Track purchase
            AnalyticsService.shared.logPackagePurchased(
                packageId: result.paymentIntentId,
                price: Double(selectedPackage.priceInCents) / 100.0,
                method: "stripe_saved_card"
            )
            
            // Activity logging handled by cloud functions
            
            print("💳 Reloading packages...")
            // Reload packages
            await packagesService.loadMyPackages()
            
            print("✅ Purchase complete! Showing success alert")
            // Success - show alert and dismiss
            alert = .init(
                title: "Purchase Successful! 🎉",
                message: "Your \(selectedPackage.title) has been added to your account. You can now book sessions!"
            )
            
            // Navigate back to passes page after short delay
            try? await Task.sleep(nanoseconds: 500_000_000) // 0.5 seconds
            dismiss()
        } catch {
            print("❌ Payment failed: \(error.localizedDescription)")
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
                    
                    // Activity logging handled by cloud functions
                    
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
                let successMessage = "Your \(selectedPackage.title) has been added to your account. You can now book!"
                
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
