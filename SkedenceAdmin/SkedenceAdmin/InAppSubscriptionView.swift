//
//  InAppSubscriptionView.swift
//  SkedenceAdmin
//
//  Complete in-app subscription flow:
//  1. Add payment method (save card)
//  2. Choose plan
//  3. Confirm and subscribe
//

import SwiftUI
import FirebaseFunctions
import Stripe
import StripePaymentSheet

struct InAppSubscriptionView: View {
    @EnvironmentObject var auth: AuthManager
    @Environment(\.dismiss) var dismiss
    
    let orgId: String
    
    @State private var isLoading = true
    @State private var currentPlan = "free"
    @State private var status = "active"
    @State private var errorMessage: String?
    @State private var nextBillingDate: Date?
    @State private var cancelAtPeriodEnd = false
    @State private var hasPaymentMethod = false
    @State private var paymentMethodLast4: String?
    @State private var showingAddCard = false
    @State private var showingConfirmation = false
    @State private var selectedPlan: String?
    @State private var isProcessing = false
    @State private var showingSuccess = false
    @State private var successMessage = ""
    @State private var showingCancelConfirmation = false
    @State private var showingRemoveCardConfirmation = false
    @State private var isCanceling = false
    
    // Stripe Payment Sheet for adding card
    @State private var paymentSheet: PaymentSheet?
    
    let stripePublishableKey = "pk_live_51SnNeOFIh2MhEffNF7SS0liDja5jF9tha3SnJVAO42OcVDkBVIiTralDrcZplXU7JO4E3lijrDIA31RwIrh2oq2r00HBWB8fTD"
    private var effectivePublishableKey: String {
        if let key = auth.stripePublishableKey, !key.isEmpty {
            return key
        }
        return stripePublishableKey
    }
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    if isLoading {
                        ProgressView()
                            .padding(.vertical, 40)
                    } else {
                        // Current Plan
                        currentPlanSection
                        
                        // Payment Method Section
                        paymentMethodSection
                        
                        // Plans Section (only if has payment method)
                        if hasPaymentMethod {
                            plansSection
                        } else {
                            Text("Add a payment method to subscribe")
                                .font(.callout)
                                .foregroundStyle(.secondary)
                                .frame(maxWidth: .infinity, alignment: .center)
                                .padding()
                        }
                        
                        // Error Message
                        if let error = errorMessage {
                            Text(error)
                                .font(.callout)
                                .foregroundStyle(.red)
                                .padding()
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .background(Color.red.opacity(0.1))
                                .cornerRadius(12)
                        }
                    }
                }
                .padding()
            }
            .navigationTitle("Subscription")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .alert("Confirm Subscription", isPresented: $showingConfirmation) {
                Button("Cancel", role: .cancel) {
                    selectedPlan = nil
                }
                Button("Subscribe") {
                    if let plan = selectedPlan {
                        Task {
                            await subscribeToPlan(plan: plan)
                        }
                    }
                }
            } message: {
                if let plan = selectedPlan, let last4 = paymentMethodLast4 {
                    Text("Subscribe to \(plan.capitalized) plan using card ending in \(last4)?")
                }
            }
            .alert("Success!", isPresented: $showingSuccess) {
                Button("Done") {
                    dismiss()
                }
            } message: {
                Text(successMessage)
            }
            .alert("Cancel Subscription?", isPresented: $showingCancelConfirmation) {
                Button("Keep Subscription", role: .cancel) {}
                Button("Cancel", role: .destructive) {
                    Task {
                        await cancelSubscription()
                    }
                }
            } message: {
                Text("Your subscription will remain active until the end of your billing period. You'll still have access to \(currentPlan.capitalized) features until then.")
            }
            .alert("Remove Payment Method?", isPresented: $showingRemoveCardConfirmation) {
                Button("Keep Card", role: .cancel) {}
                Button("Remove", role: .destructive) {
                    Task {
                        await removePaymentMethod()
                    }
                }
            } message: {
                Text("This will remove your saved card. You'll need to add a new payment method to subscribe or make changes to your subscription.")
            }
            .overlay {
                if isProcessing {
                    ZStack {
                        Color.black.opacity(0.3)
                            .ignoresSafeArea()
                        
                        VStack(spacing: 16) {
                            ProgressView()
                                .scaleEffect(1.5)
                            Text("Processing subscription...")
                                .font(.headline)
                        }
                        .padding(32)
                        .background(Color(.systemBackground))
                        .cornerRadius(16)
                    }
                }
            }
            .task {
                await loadCurrentPlan()
                await loadPaymentMethod()
            }
            .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("PaymentMethodAdded"))) { _ in
                Task {
                    try? await Task.sleep(nanoseconds: 2_000_000_000) // Wait 2s for webhook
                    await loadPaymentMethod()
                }
            }
        }
    }
    
    // MARK: - Sections
    
    private var currentPlanSection: some View {
        VStack(spacing: 12) {
            VStack(spacing: 8) {
                Text("Current Plan")
                    .font(.headline)
                    .foregroundStyle(.secondary)
                
                Text(currentPlan.capitalized)
                    .font(.title)
                    .bold()
                
                if status == "trialing" {
                    Text("Free Trial")
                        .font(.caption)
                        .foregroundStyle(.green)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 4)
                        .background(Color.green.opacity(0.1))
                        .cornerRadius(12)
                }
                
                // Show billing date or cancellation message
                if cancelAtPeriodEnd, let endDate = nextBillingDate {
                    Text("Access to \(currentPlan.capitalized) until \(endDate.formatted(date: .abbreviated, time: .omitted))")
                        .font(.caption)
                        .foregroundStyle(.orange)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Color.orange.opacity(0.1))
                        .cornerRadius(8)
                } else if let nextDate = nextBillingDate, currentPlan != "free" {
                    Text("Next billing: \(nextDate.formatted(date: .abbreviated, time: .omitted))")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            
            // Cancel or Restore button (only show if not on free plan)
            if currentPlan != "free" && status != "canceled" {
                if cancelAtPeriodEnd {
                    Button {
                        Task {
                            await restoreSubscription()
                        }
                    } label: {
                        Text("Restore Subscription")
                            .font(.callout)
                            .foregroundStyle(.green)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 10)
                            .background(Color.green.opacity(0.1))
                            .cornerRadius(8)
                    }
                } else {
                    Button {
                        showingCancelConfirmation = true
                    } label: {
                        Text("Cancel Subscription")
                            .font(.callout)
                            .foregroundStyle(.red)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 10)
                            .background(Color.red.opacity(0.1))
                            .cornerRadius(8)
                    }
                }
            }
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(16)
    }
    
    private var paymentMethodSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Payment Method")
                .font(.headline)
            
            if hasPaymentMethod, let last4 = paymentMethodLast4 {
                HStack {
                    Image(systemName: "creditcard.fill")
                        .foregroundStyle(.blue)
                    Text("•••• \(last4)")
                        .font(.body)
                    Spacer()
                    Button("Remove") {
                        showingRemoveCardConfirmation = true
                    }
                    .buttonStyle(.bordered)
                    .foregroundStyle(.red)
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)
            } else if showingAddCard {
                // Inline card entry
                CardEntryView(orgId: orgId) {
                    showingAddCard = false
                    Task {
                        await loadPaymentMethod()
                    }
                } onCancel: {
                    showingAddCard = false
                }
            } else {
                VStack(spacing: 12) {
                    HStack {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundStyle(.orange)
                        Text("No payment method on file")
                            .font(.body)
                        Spacer()
                    }
                    
                    Button(action: {
                        showingAddCard = true
                    }) {
                        Label("Add Payment Method", systemImage: "plus.circle.fill")
                            .font(.headline)
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(Color.blue)
                            .cornerRadius(12)
                    }
                }
                .padding()
                .background(Color.orange.opacity(0.1))
                .cornerRadius(12)
            }
        }
    }
    
    private var plansSection: some View {
        VStack(spacing: 16) {
            Text("Choose Your Plan")
                .font(.headline)
                .frame(maxWidth: .infinity, alignment: .leading)
            
            PlanCard(
                name: "Starter",
                price: "$29",
                features: [
                    "Up to 200 bookings/month",
                    "Advanced scheduling",
                    "Client packages",
                    "Payment processing"
                ],
                isCurrentPlan: currentPlan == "starter",
                onSelect: {
                    selectedPlan = "starter"
                    showingConfirmation = true
                }
            )
            
            PlanCard(
                name: "Studio",
                price: "$99",
                features: [
                    "Up to 5 trainers",
                    "Unlimited clients",
                    "Multi-trainer scheduling",
                    "Admin dashboard"
                ],
                isCurrentPlan: currentPlan == "studio",
                onSelect: {
                    selectedPlan = "studio"
                    showingConfirmation = true
                }
            )
            
            PlanCard(
                name: "Academy",
                price: "$249",
                features: [
                    "Up to 15 trainers",
                    "Multiple locations",
                    "Advanced analytics",
                    "Revenue tracking"
                ],
                isCurrentPlan: currentPlan == "academy",
                onSelect: {
                    selectedPlan = "academy"
                    showingConfirmation = true
                }
            )
            
            PlanCard(
                name: "Enterprise",
                price: "$499",
                features: [
                    "Unlimited trainers",
                    "White-label branding",
                    "API access",
                    "Dedicated support"
                ],
                isCurrentPlan: currentPlan == "enterprise",
                onSelect: {
                    selectedPlan = "enterprise"
                    showingConfirmation = true
                }
            )
        }
    }
    
    // MARK: - Functions
    
    func loadCurrentPlan() async {
        isLoading = true
        
        do {
            let functions = Functions.functions(region: "us-central1")
            let callable = functions.httpsCallable("getBillingStatus")
            
            let result = try await callable.call(["orgId": orgId])
            
            if let data = result.data as? [String: Any] {
                await MainActor.run {
                    currentPlan = data["currentPlan"] as? String ?? "free"
                    status = data["status"] as? String ?? "active"
                    cancelAtPeriodEnd = data["cancelAtPeriodEnd"] as? Bool ?? false
                    
                    // Parse next billing date
                    if let periodEnd = data["currentPeriodEnd"] as? [String: Any],
                       let seconds = periodEnd["_seconds"] as? Double {
                        nextBillingDate = Date(timeIntervalSince1970: seconds)
                    }
                    
                    isLoading = false
                }
            }
        } catch {
            await MainActor.run {
                errorMessage = "Failed to load subscription: \(error.localizedDescription)"
                isLoading = false
            }
        }
    }
    
    func loadPaymentMethod() async {
        do {
            let functions = Functions.functions(region: "us-central1")
            let callable = functions.httpsCallable("getPaymentMethod")
            
            let result = try await callable.call(["organizationId": orgId])
            
            if let data = result.data as? [String: Any] {
                await MainActor.run {
                    hasPaymentMethod = data["hasPaymentMethod"] as? Bool ?? false
                    paymentMethodLast4 = data["last4"] as? String
                }
            }
        } catch {
            print("❌ Failed to load payment method: \(error)")
            await MainActor.run {
                hasPaymentMethod = false
            }
        }
    }
    
    func subscribeToPlan(plan: String) async {
        isProcessing = true
        errorMessage = nil
        
        let priceIds: [String: String] = [
            "starter": "price_1SpKItFIh2MhEffNfsBy4HyT",
            "studio": "price_1SpKMkFIh2MhEffNgGdbgMr5",
            "academy": "price_1SpKNrFIh2MhEffNqZf64sPA",
            "enterprise": "price_1SpKOrFIh2MhEffNjU5v5X4P"
        ]
        
        guard let priceId = priceIds[plan] else {
            await MainActor.run {
                errorMessage = "Invalid plan"
                isProcessing = false
            }
            return
        }
        
        do {
            let functions = Functions.functions(region: "us-central1")
            let callable = functions.httpsCallable("upgradeSubscription")
            
            let result = try await callable.call([
                "organizationId": orgId,
                "priceId": priceId
            ])
            
            print("✅ Subscription updated: \(result.data)")
            
            // Reload billing status
            await loadCurrentPlan()
            
            // Reload AuthManager billing to update Business tab
            if let orgId = auth.currentOrgId {
                await auth.loadOrgBranding(orgId: orgId)
            }
            
            await MainActor.run {
                isProcessing = false
                selectedPlan = nil
                successMessage = "Successfully subscribed to \(plan.capitalized) plan! Your subscription is now active."
                showingSuccess = true
            }
            
        } catch {
            print("❌ Failed to subscribe: \(error)")
            await MainActor.run {
                errorMessage = error.localizedDescription
                isProcessing = false
            }
        }
    }
    
    func cancelSubscription() async {
        isCanceling = true
        errorMessage = nil
        
        do {
            let functions = Functions.functions(region: "us-central1")
            let callable = functions.httpsCallable("cancelSubscription")
            
            let result = try await callable.call(["orgId": orgId])
            
            print("✅ Subscription canceled: \(result.data)")
            
            // Reload billing status
            await loadCurrentPlan()
            
            // Reload AuthManager billing
            if let orgId = auth.currentOrgId {
                await auth.loadOrgBranding(orgId: orgId)
            }
            
            await MainActor.run {
                isCanceling = false
                successMessage = "Your subscription has been canceled. You'll retain access until the end of your billing period."
                showingSuccess = true
            }
            
        } catch {
            print("❌ Failed to cancel subscription: \(error)")
            await MainActor.run {
                errorMessage = error.localizedDescription
                isCanceling = false
            }
        }
    }
    
    func restoreSubscription() async {
        isCanceling = true
        errorMessage = nil
        
        do {
            let functions = Functions.functions(region: "us-central1")
            let callable = functions.httpsCallable("restoreSubscription")
            
            let result = try await callable.call(["orgId": orgId])
            
            print("✅ Subscription restored: \(result.data)")
            
            // Reload billing status
            await loadCurrentPlan()
            
            // Reload AuthManager billing
            if let orgId = auth.currentOrgId {
                await auth.loadOrgBranding(orgId: orgId)
            }
            
            await MainActor.run {
                isCanceling = false
                successMessage = "Your subscription has been restored and will continue after the current period!"
                showingSuccess = true
            }
            
        } catch {
            print("❌ Failed to restore subscription: \(error)")
            await MainActor.run {
                errorMessage = error.localizedDescription
                isCanceling = false
            }
        }
    }
    
    func removePaymentMethod() async {
        isCanceling = true
        errorMessage = nil
        
        do {
            let functions = Functions.functions(region: "us-central1")
            let callable = functions.httpsCallable("removePaymentMethod")
            
            let result = try await callable.call(["organizationId": orgId])
            
            print("✅ Payment method removed: \(result.data)")
            
            // Reload payment method status
            await loadPaymentMethod()
            
            await MainActor.run {
                isCanceling = false
                successMessage = "Payment method removed successfully."
                showingSuccess = true
            }
            
        } catch {
            print("❌ Failed to remove payment method: \(error)")
            await MainActor.run {
                errorMessage = error.localizedDescription
                isCanceling = false
            }
        }
    }
}

// MARK: - Card Entry View

struct CardEntryView: View {
    @EnvironmentObject var auth: AuthManager
    let orgId: String
    let onSuccess: () -> Void
    let onCancel: () -> Void
    
    @State private var cardNumber = ""
    @State private var expiryDate = ""
    @State private var cvc = ""
    @State private var isProcessing = false
    @State private var errorMessage: String?
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Enter Card Details")
                .font(.headline)
            
            // Card Number
            VStack(alignment: .leading, spacing: 4) {
                Text("Card Number")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                TextField("1234 5678 9012 3456", text: $cardNumber)
                    .keyboardType(.numberPad)
                    .textFieldStyle(.roundedBorder)
                    .onChange(of: cardNumber) { oldValue, newValue in
                        cardNumber = formatCardNumber(newValue)
                    }
            }
            
            HStack(spacing: 12) {
                // Expiry Date
                VStack(alignment: .leading, spacing: 4) {
                    Text("Expiry")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    TextField("MM/YY", text: $expiryDate)
                        .keyboardType(.numberPad)
                        .textFieldStyle(.roundedBorder)
                        .onChange(of: expiryDate) { oldValue, newValue in
                            expiryDate = formatExpiry(newValue)
                        }
                }
                
                // CVC
                VStack(alignment: .leading, spacing: 4) {
                    Text("CVC")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    TextField("123", text: $cvc)
                        .keyboardType(.numberPad)
                        .textFieldStyle(.roundedBorder)
                        .onChange(of: cvc) { oldValue, newValue in
                            if newValue.count > 4 {
                                cvc = String(newValue.prefix(4))
                            }
                        }
                }
            }
            
            if let error = errorMessage {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(.red)
            }
            
            HStack(spacing: 12) {
                Button("Cancel") {
                    onCancel()
                }
                .buttonStyle(.bordered)
                
                Spacer()
                
                Button(action: {
                    Task {
                        await saveCard()
                    }
                }) {
                    if isProcessing {
                        ProgressView()
                            .progressViewStyle(.circular)
                    } else {
                        Text("Save Card")
                    }
                }
                .buttonStyle(.borderedProminent)
                .disabled(isProcessing || !isValid)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
    
    var isValid: Bool {
        let cleanCard = cardNumber.replacingOccurrences(of: " ", with: "")
        return cleanCard.count >= 15 && 
               expiryDate.count == 5 && 
               cvc.count >= 3
    }
    
    func formatCardNumber(_ input: String) -> String {
        let digits = input.filter { $0.isNumber }
        let trimmed = String(digits.prefix(16))
        var formatted = ""
        for (index, char) in trimmed.enumerated() {
            if index > 0 && index % 4 == 0 {
                formatted += " "
            }
            formatted.append(char)
        }
        return formatted
    }
    
    func formatExpiry(_ input: String) -> String {
        let digits = input.filter { $0.isNumber }
        let trimmed = String(digits.prefix(4))
        if trimmed.count >= 3 {
            return trimmed.prefix(2) + "/" + trimmed.dropFirst(2)
        }
        return trimmed
    }
    
    func saveCard() async {
        isProcessing = true
        errorMessage = nil
        
        do {
            // Parse card details
            let cleanCard = cardNumber.replacingOccurrences(of: " ", with: "")
            let expiryParts = expiryDate.split(separator: "/")
            guard expiryParts.count == 2,
                  let month = Int(expiryParts[0]),
                  let year = Int(expiryParts[1]) else {
                throw NSError(domain: "CardEntry", code: -1,
                            userInfo: [NSLocalizedDescriptionKey: "Invalid expiry date"])
            }
            
            // Configure Stripe API key from organization settings or fallback
            let publishableKey: String
            if let orgKey = auth.stripePublishableKey, !orgKey.isEmpty {
                publishableKey = orgKey
                print("🔑 Using organization Stripe key: \(orgKey.prefix(20))...")
            } else {
                publishableKey = "pk_live_51SnNeOFIh2MhEffNF7SS0liDja5jF9tha3SnJVAO42OcVDkBVIiTralDrcZplXU7JO4E3lijrDIA31RwIrh2oq2r00HBWB8fTD"
                print("⚠️ Using fallback Stripe key (organization key not found): \(publishableKey.prefix(20))...")
            }
            
            guard !publishableKey.isEmpty else {
                throw NSError(domain: "CardEntry", code: -1,
                            userInfo: [NSLocalizedDescriptionKey: "Stripe API key not configured. Please contact support."])
            }
            
            STPAPIClient.shared.publishableKey = publishableKey
            
            // Create Stripe card params
            let cardParams = STPCardParams()
            cardParams.number = cleanCard
            cardParams.expMonth = UInt(month)
            cardParams.expYear = UInt(2000 + year)
            cardParams.cvc = cvc
            
            // Tokenize with Stripe SDK (PCI compliant)
            let token = try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<STPToken, Error>) in
                STPAPIClient.shared.createToken(withCard: cardParams) { token, error in
                    if let error = error {
                        print("❌ Stripe tokenization error: \(error)")
                        continuation.resume(throwing: error)
                    } else if let token = token {
                        continuation.resume(returning: token)
                    } else {
                        continuation.resume(throwing: NSError(domain: "Stripe", code: -1,
                            userInfo: [NSLocalizedDescriptionKey: "Failed to create token"]))
                    }
                }
            }
            
            print("✅ Created Stripe token: \(token.tokenId)")
            
            // Send token to Cloud Function
            let functions = Functions.functions(region: "us-central1")
            let callable = functions.httpsCallable("savePaymentMethod")
            
            let result = try await callable.call([
                "organizationId": orgId,
                "token": token.tokenId
            ])
            
            print("✅ Card saved: \(result.data)")
            
            await MainActor.run {
                isProcessing = false
                onSuccess()
            }
            
        } catch {
            print("❌ Failed to save card: \(error)")
            await MainActor.run {
                errorMessage = error.localizedDescription
                isProcessing = false
            }
        }
    }
}

// MARK: - Add Card View

struct AddCardView: View {
    @EnvironmentObject var auth: AuthManager
    @Environment(\.dismiss) var dismiss
    @Environment(\.openURL) private var openURL
    
    let orgId: String
    let onSuccess: () -> Void
    
    @State private var isLoading = false
    @State private var errorMessage: String?
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                if let error = errorMessage {
                    VStack(spacing: 16) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .font(.system(size: 48))
                            .foregroundStyle(.red)
                        Text("Error")
                            .font(.title2)
                            .bold()
                        Text(error)
                            .font(.body)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                        Button("Try Again") {
                            Task {
                                await openStripeCheckout()
                            }
                        }
                        .buttonStyle(.bordered)
                    }
                    .padding()
                } else {
                    VStack(spacing: 16) {
                        Image(systemName: "creditcard.fill")
                            .font(.system(size: 64))
                            .foregroundStyle(.blue)
                        
                        Text("Add Payment Method")
                            .font(.title2)
                            .bold()
                        
                        Text("You'll be taken to Stripe's secure checkout to add your card. Your card will be saved for future billing.")
                            .font(.body)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                        
                        if isLoading {
                            ProgressView()
                                .padding()
                        } else {
                            Button(action: {
                                Task {
                                    await openStripeCheckout()
                                }
                            }) {
                                Text("Continue to Stripe")
                                    .font(.headline)
                                    .foregroundStyle(.white)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 16)
                                    .background(Color.blue)
                                    .cornerRadius(12)
                            }
                        }
                    }
                    .padding()
                }
            }
            .navigationTitle("Payment Method")
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
    
    func openStripeCheckout() async {
        isLoading = true
        errorMessage = nil
        
        do {
            let functions = Functions.functions(region: "us-central1")
            let callable = functions.httpsCallable("createSetupIntent")
            
            let result = try await callable.call(["organizationId": orgId])
            
            guard let data = result.data as? [String: Any],
                  let checkoutUrl = data["checkoutUrl"] as? String,
                  let url = URL(string: checkoutUrl) else {
                throw NSError(domain: "AddCard", code: -1,
                            userInfo: [NSLocalizedDescriptionKey: "Invalid response"])
            }
            
            await MainActor.run {
                isLoading = false
                openURL(url)
                // Close the sheet after opening Stripe
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                    dismiss()
                }
            }
            
        } catch {
            await MainActor.run {
                errorMessage = error.localizedDescription
                isLoading = false
            }
        }
    }
}

// MARK: - Plan Card

struct PlanCard: View {
    let name: String
    let price: String
    let features: [String]
    let isCurrentPlan: Bool
    let onSelect: () -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(name)
                        .font(.title2)
                        .bold()
                    
                    HStack(alignment: .firstTextBaseline, spacing: 2) {
                        Text(price)
                            .font(.title)
                            .bold()
                        Text("/month")
                            .font(.callout)
                            .foregroundStyle(.secondary)
                    }
                }
                
                Spacer()
                
                if isCurrentPlan {
                    Text("Current")
                        .font(.caption)
                        .bold()
                        .foregroundStyle(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Color.green)
                        .cornerRadius(8)
                }
            }
            
            Divider()
            
            VStack(alignment: .leading, spacing: 8) {
                ForEach(features, id: \.self) { feature in
                    HStack(spacing: 8) {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(.green)
                            .font(.callout)
                        Text(feature)
                            .font(.callout)
                    }
                }
            }
            
            if !isCurrentPlan {
                Button(action: onSelect) {
                    Text("Select \(name)")
                        .font(.headline)
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(Color.blue)
                        .cornerRadius(12)
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(isCurrentPlan ? Color.green : Color.clear, lineWidth: 2)
        )
    }
}
