//
//  ProcessPaymentView.swift
//  SkedenceAdmin
//
//  Created by Assistant on 1/16/26.
//

import SwiftUI
import StripePaymentSheet

struct ProcessPaymentView: View {
    @EnvironmentObject var auth: AuthManager
    @Environment(\.dismiss) private var dismiss
    
    let client: SimpleUser
    
    @State private var amount: String = ""
    @State private var description: String = ""
    @State private var saveCard: Bool = false
    @State private var isProcessing = false
    @State private var errorMessage: String?
    @State private var showingPaymentSheet = false
    @State private var paymentSheet: PaymentSheet?
    @State private var paymentResult: PaymentSheetResult?
    
    // Card selection
    @StateObject private var customerService = StripeCustomerService()
    @State private var selectedPaymentMethodId: String?
    @State private var useNewCard: Bool = false
    
    // New card input
    @State private var cardNumber: String = ""
    @State private var expiryDate: String = ""
    @State private var cvv: String = ""
    @State private var cardholderName: String = ""
    
    private var amountInCents: Int? {
        guard let doubleAmount = Double(amount) else { return nil }
        return Int(doubleAmount * 100)
    }
    
    private var isAmountValid: Bool {
        guard let cents = amountInCents else { return false }
        return cents >= 50 && !description.isEmpty
    }
    
    private var isCardInfoComplete: Bool {
        if useNewCard {
            let hasBasicInfo = !cardNumber.isEmpty && !expiryDate.isEmpty && !cvv.isEmpty
            // If saving card, require cardholder name
            if saveCard {
                return hasBasicInfo && !cardholderName.isEmpty
            }
            return hasBasicInfo
        }
        return true
    }
    
    private var hasSelectedPaymentMethod: Bool {
        if useNewCard {
            return isCardInfoComplete
        } else {
            return selectedPaymentMethodId != nil
        }
    }
    
    private var isValid: Bool {
        return isAmountValid && hasSelectedPaymentMethod
    }
    
    var body: some View {
        NavigationView {
            Form {
                Section {
                    Text("Processing payment for:")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text("\(client.firstName) \(client.lastName)")
                        .font(.headline)
                    if !client.athleteName.isEmpty {
                        Text("Athlete: \(client.athleteName)")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                } header: {
                    Text("Client")
                }
                
                Section {
                    HStack {
                        Text("$")
                            .font(.headline)
                        TextField("0.00", text: $amount)
                            .keyboardType(.decimalPad)
                            .font(.headline)
                    }
                    
                    if let cents = amountInCents {
                        if cents < 50 {
                            Text("Minimum amount is $0.50")
                                .font(.caption)
                                .foregroundColor(.red)
                        } else {
                            Text("Total: $\(String(format: "%.2f", Double(cents) / 100))")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                } header: {
                    Text("Amount")
                }
                
                Section {
                    TextField("Payment description", text: $description)
                        .autocapitalization(.sentences)
                    
                    Text("e.g., \"Lesson package payment\" or \"Equipment rental\"")
                        .font(.caption)
                        .foregroundColor(.secondary)
                } header: {
                    Text("Description")
                }
                
                // MARK: - Card Information Section
                Section {
                    if customerService.isLoading {
                        HStack {
                            Spacer()
                            ProgressView()
                            Spacer()
                        }
                    } else if customerService.paymentMethods.isEmpty && !useNewCard {
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Image(systemName: "info.circle.fill")
                                    .foregroundColor(.orange)
                                Text("No cards on file")
                                    .font(.subheadline)
                                    .foregroundColor(.orange)
                            }
                            
                            Button {
                                useNewCard = true
                            } label: {
                                HStack {
                                    Image(systemName: "plus.circle.fill")
                                    Text("Add New Card")
                                }
                                .font(.subheadline)
                            }
                        }
                        .padding(.vertical, 4)
                    } else {
                        // Saved cards section
                        if !useNewCard && !customerService.paymentMethods.isEmpty {
                            ForEach(customerService.paymentMethods) { method in
                                Button {
                                    selectedPaymentMethodId = method.id
                                } label: {
                                    HStack {
                                        Image(systemName: selectedPaymentMethodId == method.id ? "checkmark.circle.fill" : "circle")
                                            .foregroundColor(selectedPaymentMethodId == method.id ? .blue : .gray)
                                        
                                        VStack(alignment: .leading, spacing: 4) {
                                            Text("\(method.displayBrand) •••• \(method.last4)")
                                                .font(.body)
                                                .foregroundColor(.primary)
                                            Text("Expires \(method.expirationDisplay)")
                                                .font(.caption)
                                                .foregroundColor(.secondary)
                                        }
                                        
                                        Spacer()
                                    }
                                }
                                .buttonStyle(.plain)
                            }
                            
                            Button {
                                useNewCard = true
                                selectedPaymentMethodId = nil
                            } label: {
                                HStack {
                                    Image(systemName: "plus.circle.fill")
                                    Text("Use Different Card")
                                }
                                .font(.subheadline)
                                .foregroundColor(.blue)
                            }
                        }
                        
                        // New card input
                        if useNewCard {
                            VStack(alignment: .leading, spacing: 12) {
                                if !customerService.paymentMethods.isEmpty {
                                    Button {
                                        useNewCard = false
                                        clearNewCardFields()
                                    } label: {
                                        HStack {
                                            Image(systemName: "arrow.left.circle.fill")
                                            Text("Use Saved Card")
                                        }
                                        .font(.subheadline)
                                        .foregroundColor(.blue)
                                    }
                                    .padding(.bottom, 4)
                                }
                                
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Card Number")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                    TextField("1234 5678 9012 3456", text: $cardNumber)
                                        .keyboardType(.numberPad)
                                        .textContentType(.creditCardNumber)
                                }
                                
                                HStack(spacing: 12) {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text("Expiry")
                                            .font(.caption)
                                            .foregroundColor(.secondary)
                                        TextField("MM/YY", text: $expiryDate)
                                            .keyboardType(.numberPad)
                                    }
                                    
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text("CVV")
                                            .font(.caption)
                                            .foregroundColor(.secondary)
                                        TextField("123", text: $cvv)
                                            .keyboardType(.numberPad)
                                            .textContentType(.creditCardSecurityCode)
                                    }
                                }
                                
                                if saveCard {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text("Cardholder Name")
                                            .font(.caption)
                                            .foregroundColor(.secondary)
                                        TextField("Name on card", text: $cardholderName)
                                            .textContentType(.name)
                                            .autocapitalization(.words)
                                    }
                                }
                                
                                if !isCardInfoComplete && (saveCard || !cardNumber.isEmpty) {
                                    Text(saveCard ? "Complete all fields to save card" : "Complete card information")
                                        .font(.caption)
                                        .foregroundColor(.orange)
                                }
                            }
                            .padding(.vertical, 4)
                        }
                    }
                } header: {
                    Text("Card Information")
                }
                
                Section {
                    Toggle(isOn: $saveCard) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Save card to wallet")
                                .font(.body)
                            Text(saveCard ? "Card will be saved for future payments" : "Card will not be saved")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    .disabled(!useNewCard)
                } header: {
                    Text("Save Payment Method")
                }
                
                if let error = errorMessage {
                    Section {
                        Text(error)
                            .font(.caption)
                            .foregroundColor(.red)
                    }
                }
                
                Section {
                    Button {
                        processPayment()
                    } label: {
                        HStack {
                            Spacer()
                            if isProcessing {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle())
                                    .padding(.trailing, 8)
                            }
                            Text(isProcessing ? "Processing..." : "Continue to Payment")
                                .font(.headline)
                                .fontWeight(isValid ? .bold : .regular)
                            Spacer()
                        }
                    }
                    .disabled(!isValid || isProcessing)
                }
            }
            .navigationTitle("Process Payment")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
            .task {
                await customerService.loadPaymentMethodsForUser(userId: client.id)
            }
            .paymentSheet(isPresented: $showingPaymentSheet, paymentSheet: $paymentSheet) { result in
                paymentResult = result
                handlePaymentResult(result)
            }
        }
    }
    
    private func clearNewCardFields() {
        cardNumber = ""
        expiryDate = ""
        cvv = ""
        cardholderName = ""
    }
    
    private func processPayment() {
        guard let cents = amountInCents, cents >= 50 else { return }
        guard !description.isEmpty else { return }
        guard let orgId = auth.currentOrgId else { return }
        
        // Capture values from @EnvironmentObject on the main actor before hopping threads
        let merchantName = auth.organizationName ?? "Organization"
        
        isProcessing = true
        errorMessage = nil
        
        Task {
            do {
                let result = try await FunctionsService.shared.adminProcessPayment(
                    orgId: orgId,
                    userId: client.id,
                    amount: cents,
                    description: description,
                    saveCard: saveCard
                )
                
                // If using StripePaymentSheet directly, ensure the publishable key is set
                // StripeAPI.defaultPublishableKey = result.publishableKey
                
                // Configure payment sheet
                var configuration = PaymentSheet.Configuration()
                configuration.merchantDisplayName = merchantName
                configuration.allowsDelayedPaymentMethods = false
                
                paymentSheet = PaymentSheet(
                    paymentIntentClientSecret: result.clientSecret,
                    configuration: configuration
                )
                
                await MainActor.run {
                    showingPaymentSheet = true
                    isProcessing = false
                }
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    isProcessing = false
                }
            }
        }
    }
    
    private func handlePaymentResult(_ result: PaymentSheetResult) {
        switch result {
        case .completed:
            dismiss()
        case .failed(let error):
            errorMessage = "Payment failed: \(error.localizedDescription)"
        case .canceled:
            errorMessage = "Payment was canceled"
        }
        isProcessing = false
    }
}

// MARK: - PaymentSheet Presenter

private struct PaymentSheetPresenter: UIViewControllerRepresentable {
    @Binding var isPresented: Bool
    @Binding var paymentSheet: PaymentSheet?
    let onCompletion: (PaymentSheetResult) -> Void
    
    func makeUIViewController(context: Context) -> UIViewController {
        UIViewController()
    }
    
    func updateUIViewController(_ uiViewController: UIViewController, context: Context) {
        guard isPresented, let sheet = paymentSheet, context.coordinator.isPresenting == false else { return }
        context.coordinator.isPresenting = true
        
        sheet.present(from: uiViewController) { result in
            context.coordinator.isPresenting = false
            DispatchQueue.main.async {
                self.isPresented = false
                self.paymentSheet = nil
                onCompletion(result)
            }
        }
    }
    
    func makeCoordinator() -> Coordinator {
        Coordinator()
    }
    
    class Coordinator {
        var isPresenting = false
    }
}

extension View {
    func paymentSheet(
        isPresented: Binding<Bool>,
        paymentSheet: Binding<PaymentSheet?>,
        onCompletion: @escaping (PaymentSheetResult) -> Void
    ) -> some View {
        background(
            PaymentSheetPresenter(
                isPresented: isPresented,
                paymentSheet: paymentSheet,
                onCompletion: onCompletion
            )
        )
    }
}

