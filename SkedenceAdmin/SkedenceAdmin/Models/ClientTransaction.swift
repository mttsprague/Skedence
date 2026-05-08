//
//  ClientTransaction.swift
//  SkedenceAdmin
//

import Foundation

struct ClientTransaction: Identifiable {
    var id: String
    var description: String?
    var packageName: String?
    var createdAt: Date
    var amount: Int  // cents
    var status: String
    var stripePaymentIntentId: String?
    var paymentIntentId: String?

    var displayTitle: String {
        description ?? packageName ?? "Purchase"
    }

    var formattedAmount: String {
        String(format: "$%.2f", Double(amount) / 100.0)
    }
}
