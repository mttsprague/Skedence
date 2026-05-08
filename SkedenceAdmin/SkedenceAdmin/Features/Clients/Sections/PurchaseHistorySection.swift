//
//  PurchaseHistorySection.swift
//  SkedenceAdmin
//

import SwiftUI

struct PurchaseHistorySection: View {
    let transactions: [ClientTransaction]
    let isLoading: Bool

    private static let dateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateStyle = .medium
        f.timeStyle = .short
        return f
    }()

    var body: some View {
        CardView {
            VStack(alignment: .leading, spacing: Spacing.md) {
                HStack {
                    Text("Purchase History")
                        .font(.headingSmall)
                        .foregroundStyle(AppTheme.textPrimary)

                    Spacer()

                    if isLoading {
                        ProgressView()
                            .scaleEffect(0.8)
                    }
                }

                if transactions.isEmpty && !isLoading {
                    VStack(spacing: Spacing.sm) {
                        Image(systemName: "receipt")
                            .font(.system(size: 32))
                            .foregroundStyle(AppTheme.textTertiary)
                        Text("No purchase history")
                            .font(.bodyMedium)
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Spacing.lg)
                } else {
                    VStack(spacing: Spacing.sm) {
                        ForEach(transactions) { transaction in
                            transactionRow(transaction)
                            if transaction.id != transactions.last?.id {
                                Divider()
                            }
                        }
                    }
                }
            }
            .padding(Spacing.md)
        }
    }

    @ViewBuilder
    private func transactionRow(_ transaction: ClientTransaction) -> some View {
        HStack(alignment: .top, spacing: Spacing.sm) {
            VStack(alignment: .leading, spacing: 2) {
                Text(transaction.displayTitle)
                    .font(.bodyMedium)
                    .foregroundStyle(AppTheme.textPrimary)

                Text(Self.dateFormatter.string(from: transaction.createdAt))
                    .font(.caption)
                    .foregroundStyle(AppTheme.textSecondary)

                if let stripeId = transaction.stripePaymentIntentId ?? transaction.paymentIntentId {
                    Text("ID: \(stripeId)")
                        .font(.caption2)
                        .foregroundStyle(AppTheme.textTertiary)
                        .lineLimit(1)
                        .truncationMode(.middle)
                }
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 4) {
                Text(transaction.formattedAmount)
                    .font(.headingSmall)
                    .foregroundStyle(AppTheme.primary)

                statusBadge(for: transaction.status)
            }
        }
        .padding(.vertical, 2)
    }

    @ViewBuilder
    private func statusBadge(for status: String) -> some View {
        let (label, bg, fg): (String, Color, Color) = {
            switch status.lowercased() {
            case "succeeded": return ("Paid", Color.green.opacity(0.15), Color.green)
            case "pending":   return ("Pending", Color.yellow.opacity(0.2), Color.orange)
            default:          return (status.capitalized, Color.red.opacity(0.15), Color.red)
            }
        }()

        Text(label)
            .font(.caption)
            .fontWeight(.medium)
            .foregroundStyle(fg)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(bg, in: Capsule())
    }
}
