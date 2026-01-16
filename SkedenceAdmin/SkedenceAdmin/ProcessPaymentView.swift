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
    
    private var amountInCents: Int? {
        guard let doubleAmount = Double(amount) else { return nil }
        return Int(doubleAmount * 100)
    }
    
    private var isValid: Bool {
        guard let cents = amountInCents else { return false }
        return cents >= 50 && !description.isEmpty
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
                
                Section {
                    Toggle(isOn: $saveCard) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Save card to wallet")
                                .font(.body)
                            Text("Allow future payments without re-entering card details")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                } header: {
                    Text("Payment Method")
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
            .paymentSheet(isPresented: $showingPaymentSheet, paymentSheet: $paymentSheet) { result in
                paymentResult = result
                handlePaymentResult(result)
            }
        }
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

