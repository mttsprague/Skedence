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
    @State private var isCanceling = false
    
    // Stripe Payment Sheet for adding card
    @State private var paymentSheet: PaymentSheet?
    
    let stripePublishableKey = "pk_live_51SnNeOFIh2MhEffNNdhQWpsvlgkzWS6rr5BVcfOpHmtdnUE7iUYZVBXDPzCUzDqTiRuMGR1GVh38qvHtcvW3rBtC00qlnOLFXm"
    
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
            .sheet(isPresented: $showingAddCard) {
                AddCardView(
                    orgId: orgId,
                    onSuccess: {
                        showingAddCard = false
                        Task {
                            await loadPaymentMethod()
                        }
                    }
                )
                .environmentObject(auth)
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
                    Button("Update") {
                        showingAddCard = true
                    }
                    .buttonStyle(.bordered)
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)
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
}

// MARK: - Add Card View

struct AddCardView: View {
    @EnvironmentObject var auth: AuthManager
    @Environment(\.dismiss) var dismiss
    
    let orgId: String
    let onSuccess: () -> Void
    
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var paymentSheet: PaymentSheet?
    @State private var isProcessing = false
    
    let stripePublishableKey = "pk_live_51SnNeOFIh2MhEffNNdhQWpsvlgkzWS6rr5BVcfOpHmtdnUE7iUYZVBXDPzCUzDqTiRuMGR1GVh38qvHtcvW3rBtC00qlnOLFXm"
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                if isLoading {
                    ProgressView("Loading...")
                } else if let error = errorMessage {
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
                                await loadSetupIntent()
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
                        
                        Text("Your card will be saved for future billing. You won't be charged until you subscribe.")
                            .font(.body)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                        
                        Button(action: {
                            presentPaymentSheet()
                        }) {
                            Text("Add Card")
                                .font(.headline)
                                .foregroundStyle(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 16)
                                .background(Color.blue)
                                .cornerRadius(12)
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
            .overlay {
                if isProcessing {
                    ZStack {
                        Color.black.opacity(0.3)
                            .ignoresSafeArea()
                        
                        VStack(spacing: 16) {
                            ProgressView()
                                .scaleEffect(1.5)
                            Text("Saving card...")
                                .font(.headline)
                        }
                        .padding(32)
                        .background(Color(.systemBackground))
                        .cornerRadius(16)
                    }
                }
            }
            .task {
                STPAPIClient.shared.publishableKey = stripePublishableKey
                await loadSetupIntent()
            }
        }
    }
    
    func loadSetupIntent() async {
        isLoading = true
        errorMessage = nil
        
        do {
            let functions = Functions.functions(region: "us-central1")
            let callable = functions.httpsCallable("createSetupIntent")
            
            let result = try await callable.call(["organizationId": orgId])
            
            guard let data = result.data as? [String: Any],
                  let clientSecret = data["clientSecret"] as? String,
                  let customerId = data["customerId"] as? String,
                  let ephemeralKey = data["ephemeralKey"] as? String else {
                throw NSError(domain: "AddCard", code: -1,
                            userInfo: [NSLocalizedDescriptionKey: "Invalid response"])
            }
            
            var configuration = PaymentSheet.Configuration()
            configuration.merchantDisplayName = "Skedence"
            configuration.customer = PaymentSheet.CustomerConfiguration(
                id: customerId,
                ephemeralKeySecret: ephemeralKey
            )
            
            await MainActor.run {
                paymentSheet = PaymentSheet(setupIntentClientSecret: clientSecret, configuration: configuration)
                isLoading = false
            }
            
        } catch {
            await MainActor.run {
                errorMessage = error.localizedDescription
                isLoading = false
            }
        }
    }
    
    func presentPaymentSheet() {
        guard let sheet = paymentSheet else { return }
        
        guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let rootViewController = windowScene.windows.first?.rootViewController else {
            errorMessage = "Cannot present payment sheet"
            return
        }
        
        var topController = rootViewController
        while let presented = topController.presentedViewController {
            topController = presented
        }
        
        isProcessing = true
        
        sheet.present(from: topController) { result in
            Task {
                await handlePaymentResult(result)
            }
        }
    }
    
    func handlePaymentResult(_ result: PaymentSheetResult) async {
        await MainActor.run {
            isProcessing = false
            
            switch result {
            case .completed:
                onSuccess()
            case .canceled:
                errorMessage = "Payment method addition canceled"
            case .failed(let error):
                errorMessage = error.localizedDescription
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

